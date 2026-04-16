import { randomUUID } from "node:crypto";

import { auctionModule } from "@arena/game-auction";
import { pactModule } from "@arena/game-pact";
import { settlementModule } from "@arena/game-settlement";
import { splitModule } from "@arena/game-split";
import { vaultModule } from "@arena/game-vault";
import type { GameModule } from "@arena/game-sdk";
import type {
  ClientMessage,
  GameKey,
  MatchResult,
  PrivateSeatMetadata,
  PublicRoomState,
  PublicSeatView,
  ReplayEnvelope,
  ReplayEvent,
  RoomId,
  RoomPhase,
  SeatAssignment,
  SeatBackingType,
  SeatId,
} from "@arena/contracts";

export interface CreateSeatInput {
  displayName: string;
  avatarId: string;
  backingType: SeatBackingType;
  playerId?: string;
  llmModelId?: string;
  promptVersionId?: string;
  timingProfileId?: string;
}

export interface CreateRoomInput<TPublicState = Record<string, unknown>> {
  game: GameKey;
  seats: CreateSeatInput[];
  publicState?: TPublicState;
  phase?: RoomPhase;
  round?: number;
}

export interface RoomRecord<TPublicState = unknown, TGameState = unknown> {
  roomId: RoomId;
  matchId: string;
  game: GameKey;
  phase: RoomPhase;
  round: number;
  publicState: TPublicState;
  gameState?: TGameState;
  seats: SeatAssignment[];
  createdAt: string;
  updatedAt: string;
  replay: ReplayEvent[];
  result?: MatchResult;
}

type RuntimeGameModule = GameModule<unknown, unknown, unknown>;

const gameModules: Record<GameKey, RuntimeGameModule> = {
  auction: auctionModule,
  pact: pactModule,
  settlement: settlementModule,
  split: splitModule,
  vault: vaultModule,
};

export class InMemoryRoomRuntime {
  private readonly rooms = new Map<RoomId, RoomRecord>();

  constructor(private readonly now: () => string = () => new Date().toISOString()) {}

  createRoom<TPublicState = unknown>(
    input: CreateRoomInput<TPublicState>,
  ): RoomRecord<TPublicState> {
    const nowIso = this.now();
    const roomId = randomUUID();
    const matchId = randomUUID();
    const seats = input.seats.map((seat, index) =>
      this.createSeatAssignment(seat, index),
    );
    const initialized = this.initializeGameState(
      input.game,
      matchId,
      seats,
      input.publicState,
    );

    const room: RoomRecord<TPublicState> = {
      roomId,
      matchId,
      game: input.game,
      phase: input.phase ?? "lobby",
      round: input.round ?? deriveRoomCounter(initialized.publicState),
      publicState: initialized.publicState,
      gameState: initialized.gameState,
      seats,
      createdAt: nowIso,
      updatedAt: nowIso,
      replay: [],
    };

    this.rooms.set(roomId, room as RoomRecord);
    this.appendEvent(roomId, "room.created", {
      game: input.game,
      seatCount: seats.length,
    });

    return room;
  }

  listRooms(): PublicRoomState[] {
    return [...this.rooms.values()].map((room) => this.toPublicRoomState(room));
  }

  getRoom(roomId: RoomId): RoomRecord | undefined {
    return this.rooms.get(roomId);
  }

  getPublicRoomState(roomId: RoomId): PublicRoomState | undefined {
    const room = this.rooms.get(roomId);
    return room ? this.toPublicRoomState(room) : undefined;
  }

  setSeatConnected(roomId: RoomId, seatId: SeatId, isConnected: boolean): PublicRoomState {
    const room = this.requireRoom(roomId);
    const seat = this.requireSeat(room, seatId);
    seat.publicSeat.isConnected = isConnected;
    room.updatedAt = this.now();

    this.appendEvent(roomId, "room.connection", {
      seatId,
      isConnected,
    });

    return this.toPublicRoomState(room);
  }

  setSeatReady(roomId: RoomId, seatId: SeatId, isReady: boolean): PublicRoomState {
    const room = this.requireRoom(roomId);
    const seat = this.requireSeat(room, seatId);
    seat.publicSeat.isReady = isReady;
    seat.publicSeat.isConnected = true;
    room.updatedAt = this.now();

    this.appendEvent(roomId, "room.ready", {
      seatId,
      isReady,
    });

    return this.toPublicRoomState(room);
  }

  handleClientMessage(roomId: RoomId, message: ClientMessage): PublicRoomState {
    const room = this.requireRoom(roomId);
    room.updatedAt = this.now();

    switch (message.type) {
      case "room.ready":
        if (!message.seatId) {
          throw new Error("room.ready requires a seatId");
        }

        return this.setSeatReady(roomId, message.seatId, Boolean(message.payload));
      case "room.leave":
        if (!message.seatId) {
          throw new Error("room.leave requires a seatId");
        }

        return this.setSeatConnected(roomId, message.seatId, false);
      case "room.heartbeat":
        if (message.seatId) {
          this.setSeatConnected(roomId, message.seatId, true);
        }
        break;
      case "room.join":
      case "room.rematch":
        this.appendEvent(
          roomId,
          message.type,
          {
            payload: message.payload ?? null,
          },
          message.seatId,
        );
        break;
      case "room.action":
        if (gameModules[room.game]) {
          return this.applyGameAction(roomId, message.seatId, message.payload);
        }

        this.appendEvent(
          roomId,
          "room.action",
          {
            payload: message.payload ?? null,
          },
          message.seatId,
        );
        break;
      default:
        throw new Error(`Unsupported message type: ${message.type}`);
    }

    return this.toPublicRoomState(room);
  }

  setRoomPhase(roomId: RoomId, phase: RoomPhase, round?: number): PublicRoomState {
    const room = this.requireRoom(roomId);
    room.phase = phase;
    room.round = round ?? room.round;
    room.updatedAt = this.now();

    this.appendEvent(roomId, "room.phase", {
      phase,
      round: room.round,
    });

    return this.toPublicRoomState(room);
  }

  updatePublicState<TPublicState>(
    roomId: RoomId,
    updater: (current: TPublicState) => TPublicState,
  ): PublicRoomState<TPublicState> {
    const room = this.requireRoom(roomId) as RoomRecord<TPublicState>;
    room.publicState = updater(room.publicState);
    room.updatedAt = this.now();

    this.appendEvent(roomId, "room.state", {
      phase: room.phase,
      round: room.round,
    });

    return this.toPublicRoomState(room);
  }

  completeMatch(roomId: RoomId, result: MatchResult): RoomRecord {
    const room = this.requireRoom(roomId);
    room.phase = "results";
    room.result = result;
    room.updatedAt = this.now();

    this.appendEvent(roomId, "match.result", {
      winningSeatIds: result.winningSeatIds,
      completedAt: result.completedAt,
    });

    return room;
  }

  buildReplay(roomId: RoomId): ReplayEnvelope {
    const room = this.requireRoom(roomId);
    return {
      matchId: room.matchId,
      game: room.game,
      version: 1,
      seed: room.matchId,
      createdAt: room.createdAt,
      events: room.replay,
    };
  }

  private initializeGameState<TPublicState>(
    game: GameKey,
    seed: string,
    seats: SeatAssignment[],
    publicState: TPublicState | undefined,
  ): {
    publicState: TPublicState;
    gameState?: unknown;
  } {
    const module = gameModules[game];
    if (module) {
      if (seats.length < module.minSeats || seats.length > module.maxSeats) {
        throw new Error(
          `${game} requires ${module.minSeats}-${module.maxSeats} seats, received ${seats.length}.`,
        );
      }

      const gameState = module.createInitialState(seed, seats);
      const projected = module.projectPublicState(gameState);
      return {
        publicState: projected as TPublicState,
        gameState,
      };
    }

    return {
      publicState: (publicState ?? {}) as TPublicState,
    };
  }

  private applyGameAction(
    roomId: RoomId,
    seatId: SeatId | undefined,
    payload: unknown,
  ): PublicRoomState {
    if (!seatId) {
      throw new Error("room.action requires a seatId.");
    }

    const room = this.requireRoom(roomId);
    const module = gameModules[room.game];
    if (!module) {
      throw new Error(`No game module registered for ${room.game}.`);
    }

    if (!room.gameState) {
      throw new Error(`${room.game} room is missing private game state.`);
    }

    const nowIso = this.now();
    if (room.phase === "lobby" || room.phase === "ready") {
      room.phase = "active";
    }

    module.validateAction(
      {
        seed: room.matchId,
        nowIso,
        state: room.gameState,
        seats: room.seats,
      },
      {
        seatId,
        action: payload,
        submittedAt: nowIso,
      },
    );

    const result = module.reduce(
      {
        seed: room.matchId,
        nowIso,
        state: room.gameState,
        seats: room.seats,
      },
      {
        seatId,
        action: payload,
        submittedAt: nowIso,
      },
    );

    room.gameState = result.nextState;
    room.publicState = module.projectPublicState(result.nextState);
    room.round = deriveRoomCounter(room.publicState);
    room.updatedAt = nowIso;
    this.appendReplayEvents(room, result.events);

    if (result.isTerminal) {
      room.phase = "results";
      room.result = module.finalizeMatch(
        result.nextState,
        this.toPublicRoomState(room),
      );
    }

    return this.toPublicRoomState(room);
  }

  private appendEvent(
    roomId: RoomId,
    type: string,
    publicPayload: Record<string, unknown>,
    actorSeatId?: SeatId,
    privatePayload?: unknown,
  ): void {
    const room = this.requireRoom(roomId);
    const event: ReplayEvent = {
      sequence: room.replay.length + 1,
      type,
      occurredAt: this.now(),
      actorSeatId,
      publicPayload,
      privatePayload,
    };

    room.replay.push(event);
  }

  private appendReplayEvents(room: RoomRecord, events: ReplayEvent[]): void {
    for (const event of events) {
      room.replay.push({
        ...event,
        sequence: room.replay.length + 1,
      });
    }
  }

  private createSeatAssignment(seat: CreateSeatInput, index: number): SeatAssignment {
    const seatId = `seat_${index + 1}`;
    const publicSeat: PublicSeatView = {
      seatId,
      displayName: seat.displayName,
      avatarId: seat.avatarId,
      isConnected: seat.backingType !== "human",
      isReady: seat.backingType !== "human",
    };

    const privateSeat: PrivateSeatMetadata = {
      seatId,
      playerId: seat.playerId,
      backingType: seat.backingType,
      llmModelId: seat.llmModelId,
      promptVersionId: seat.promptVersionId,
      timingProfileId: seat.timingProfileId,
    };

    return { publicSeat, privateSeat };
  }

  private toPublicRoomState<TPublicState>(room: RoomRecord<TPublicState, unknown>): PublicRoomState<TPublicState> {
    return {
      roomId: room.roomId,
      matchId: room.matchId,
      game: room.game,
      phase: room.phase,
      round: room.round,
      seats: room.seats.map((seat) => ({ ...seat.publicSeat })),
      publicState: room.publicState,
      lastEventAt: room.updatedAt,
    };
  }

  private requireRoom(roomId: RoomId): RoomRecord {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Unknown room: ${roomId}`);
    }

    return room;
  }

  private requireSeat(room: RoomRecord, seatId: SeatId): SeatAssignment {
    const seat = room.seats.find((candidate) => candidate.publicSeat.seatId === seatId);
    if (!seat) {
      throw new Error(`Unknown seat: ${seatId}`);
    }

    return seat;
  }
}

function deriveRoomCounter(publicState: unknown): number {
  if (!publicState || typeof publicState !== "object") {
    return 0;
  }

  const value = publicState as Record<string, unknown>;
  if (typeof value.turnIndex === "number") {
    return value.turnIndex;
  }

  if (typeof value.currentRound === "number") {
    return value.currentRound;
  }

  if (typeof value.roundIndex === "number") {
    return value.roundIndex + 1;
  }

  return 0;
}

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
  PlayerIdentityKind,
  PlayerSession,
  PublicMatchSyncState,
  PublicRoomJoinState,
  PublicRoomState,
  PublicMatchResultSummary,
  PublicReplaySummary,
  PublicSeatView,
  ReplayEnvelope,
  ReplayEvent,
  RoomId,
  RoomPhase,
  RoomSessionEnvelope,
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

export interface CreateSessionInput {
  sessionId?: string;
  displayName?: string;
  kind?: PlayerIdentityKind;
}

export type MatchSyncState = PublicMatchSyncState;

export interface RoomRecord<TPublicState = unknown, TGameState = unknown> {
  roomId: RoomId;
  matchId: string;
  game: GameKey;
  phase: RoomPhase;
  round: number;
  publicState: TPublicState;
  gameState?: TGameState;
  seats: SeatAssignment[];
  sessions: PlayerSession[];
  createdAt: string;
  updatedAt: string;
  replay: ReplayEvent[];
  result?: MatchResult;
  paymentsEscrowId?: string;
  matchSync: MatchSyncState;
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
      sessions: [],
      createdAt: nowIso,
      updatedAt: nowIso,
      replay: [],
      matchSync: {
        status: "pending",
        attempts: 0,
      },
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

  hydrateRooms(rooms: RoomRecord[]): void {
    this.rooms.clear();
    for (const room of rooms) {
      this.rooms.set(room.roomId, normalizeRoomRecord(room));
    }
  }

  getRoom(roomId: RoomId): RoomRecord | undefined {
    const room = this.rooms.get(roomId);
    if (!room) {
      return undefined;
    }

    const normalized = normalizeRoomRecord(room);
    this.rooms.set(roomId, normalized);
    return normalized;
  }

  getPublicRoomState(roomId: RoomId): PublicRoomState | undefined {
    const room = this.getRoom(roomId);
    return room ? this.toPublicRoomState(room) : undefined;
  }

  createOrRefreshSession<TPublicState = unknown>(
    roomId: RoomId,
    input: CreateSessionInput,
  ): RoomSessionEnvelope<TPublicState> {
    const room = this.requireRoom(roomId) as RoomRecord<TPublicState>;
    const nowIso = this.now();
    const existingSession = input.sessionId
      ? room.sessions.find((candidate) => candidate.sessionId === input.sessionId)
      : undefined;

    if (existingSession) {
      existingSession.lastSeenAt = nowIso;
      existingSession.status = "active";
      if (input.displayName?.trim()) {
        existingSession.displayName = input.displayName.trim();
      }

      if (existingSession.seatId) {
        const seat = this.requireSeat(room, existingSession.seatId);
        seat.publicSeat.isConnected = true;
      }

      room.updatedAt = nowIso;
      return {
        room: this.toPublicRoomState(room),
        session: { ...existingSession },
      };
    }

    if (!isJoinablePhase(room.phase)) {
      throw new Error("New sessions can only join rooms that are still in lobby or ready state.");
    }

    const displayName = input.displayName?.trim() || `Guest ${room.sessions.length + 1}`;
    const sessionId = randomUUID();
    const session: PlayerSession = {
      sessionId,
      playerId: createAnonymousPlayerId(displayName, sessionId),
      kind: input.kind ?? "anonymous",
      displayName,
      roomId,
      connectedAt: nowIso,
      lastSeenAt: nowIso,
      status: "active",
    };

    room.sessions.push(session);
    room.updatedAt = nowIso;
    this.appendEvent(roomId, "room.join", {
      sessionId,
      displayName,
    });

    return {
      room: this.toPublicRoomState(room),
      session: { ...session },
    };
  }

  claimSeat<TPublicState = unknown>(
    roomId: RoomId,
    sessionId: string,
    seatId: SeatId,
  ): RoomSessionEnvelope<TPublicState> {
    const room = this.requireRoom(roomId) as RoomRecord<TPublicState>;
    if (!isJoinablePhase(room.phase)) {
      throw new Error("Seats can only be claimed before the room becomes active.");
    }

    const nowIso = this.now();
    const session = this.requireSession(room, sessionId);
    const seat = this.requireSeat(room, seatId);
    if (seat.privateSeat.backingType !== "human") {
      throw new Error("Only human seats can be claimed by a browser session.");
    }

    if (seat.privateSeat.sessionId && seat.privateSeat.sessionId !== sessionId) {
      throw new Error("That seat is already claimed.");
    }

    if (session.seatId && session.seatId !== seatId) {
      throw new Error("This session already controls a different seat.");
    }

    seat.privateSeat.sessionId = sessionId;
    seat.privateSeat.playerId = session.playerId;
    seat.publicSeat.isConnected = true;
    seat.publicSeat.isReady = false;
    session.roomId = roomId;
    session.seatId = seatId;
    session.lastSeenAt = nowIso;
    room.updatedAt = nowIso;
    this.updateLobbyPhase(room);

    this.appendEvent(roomId, "room.claim", {
      seatId,
      sessionId,
    });

    return {
      room: this.toPublicRoomState(room),
      session: { ...session },
    };
  }

  setSeatConnected(
    roomId: RoomId,
    seatId: SeatId,
    isConnected: boolean,
    sessionId?: string,
  ): PublicRoomState {
    const room = this.requireRoom(roomId);
    const seat = this.requireSeat(room, seatId);
    this.assertSeatControl(room, seat, sessionId, {
      allowUnclaimedHumanSeat: false,
    });
    seat.publicSeat.isConnected = isConnected;
    room.updatedAt = this.now();

    this.appendEvent(roomId, "room.connection", {
      seatId,
      isConnected,
    });

    return this.toPublicRoomState(room);
  }

  setSeatReady(
    roomId: RoomId,
    seatId: SeatId,
    isReady: boolean,
    sessionId?: string,
  ): PublicRoomState {
    const room = this.requireRoom(roomId);
    const seat = this.requireSeat(room, seatId);
    this.assertSeatControl(room, seat, sessionId, {
      allowUnclaimedHumanSeat: false,
    });
    seat.publicSeat.isReady = isReady;
    seat.publicSeat.isConnected = true;
    room.updatedAt = this.now();
    this.updateLobbyPhase(room);

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

        return this.setSeatReady(
          roomId,
          message.seatId,
          Boolean(message.payload),
          message.sessionId,
        );
      case "room.leave":
        if (!message.seatId) {
          throw new Error("room.leave requires a seatId");
        }

        return this.setSeatConnected(roomId, message.seatId, false, message.sessionId);
      case "room.heartbeat":
        if (message.seatId) {
          this.setSeatConnected(roomId, message.seatId, true, message.sessionId);
        } else if (message.sessionId) {
          this.touchSession(room, message.sessionId);
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
          return this.applyGameAction(roomId, message.seatId, message.payload, message.sessionId);
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

  updateMatchSync(
    roomId: RoomId,
    updater: (current: MatchSyncState) => MatchSyncState,
  ): MatchSyncState {
    const room = this.requireRoom(roomId);
    room.matchSync = updater(room.matchSync);
    room.updatedAt = this.now();
    return room.matchSync;
  }

  setPaymentsEscrowId(roomId: RoomId, escrowId: string): void {
    const room = this.requireRoom(roomId);
    room.paymentsEscrowId = escrowId;
    room.updatedAt = this.now();
  }

  private touchSession(room: RoomRecord, sessionId: string): PlayerSession {
    const session = this.requireSession(room, sessionId);
    session.lastSeenAt = this.now();
    session.status = "active";
    room.updatedAt = session.lastSeenAt;
    return session;
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
    sessionId?: string,
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
    const actingSeat = this.requireSeat(room, seatId);
    this.assertSeatControl(room, actingSeat, sessionId, {
      allowUnclaimedHumanSeat: false,
    });
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
      playerId: seat.playerId ?? deriveSeatPlayerId(seat, index),
      backingType: seat.backingType,
      llmModelId: seat.llmModelId,
      promptVersionId: seat.promptVersionId,
      timingProfileId: seat.timingProfileId,
    };

    return { publicSeat, privateSeat };
  }

  private updateLobbyPhase(room: RoomRecord): void {
    if (room.phase === "active" || room.phase === "results" || room.phase === "closed") {
      return;
    }

    const humanSeats = room.seats.filter((seat) => seat.privateSeat.backingType === "human");
    if (humanSeats.length === 0) {
      room.phase = "ready";
      return;
    }

    const allClaimed = humanSeats.every((seat) => Boolean(seat.privateSeat.sessionId));
    const allReady = humanSeats.every((seat) => seat.publicSeat.isReady);
    room.phase = allClaimed && allReady ? "ready" : "lobby";
  }

  private toPublicRoomState<TPublicState>(room: RoomRecord<TPublicState, unknown>): PublicRoomState<TPublicState> {
    const syncedPublicState = syncProjectedPublicState(room);
    const projectedSeats = extractProjectedSeatViews(syncedPublicState);
    const scoreBySeatId = room.result?.seatScores ?? {};
    const publicResult: PublicMatchResultSummary | undefined = room.result
      ? {
          completedAt: room.result.completedAt,
          winningSeatIds: room.result.winningSeatIds,
          seatScores: room.result.seatScores,
        }
      : undefined;
    const replaySummary: PublicReplaySummary = {
      available: room.replay.length > 0,
      eventCount: room.replay.length || undefined,
      lastSequence: room.replay.at(-1)?.sequence,
      lastOccurredAt: room.replay.at(-1)?.occurredAt,
    };
    const joinState: PublicRoomJoinState = {
      canJoin: isJoinablePhase(room.phase),
      openSeatIds: isJoinablePhase(room.phase)
        ? room.seats
            .filter((seat) => seat.privateSeat.backingType === "human" && !seat.privateSeat.sessionId)
            .map((seat) => seat.publicSeat.seatId)
        : [],
      claimedSeatIds: room.seats
        .filter((seat) => seat.privateSeat.backingType === "human" && Boolean(seat.privateSeat.sessionId))
        .map((seat) => seat.publicSeat.seatId),
    };

    return {
      roomId: room.roomId,
      matchId: room.matchId,
      game: room.game,
      phase: room.phase,
      round: room.round,
      seats: room.seats.map((seat) => {
        const projectedSeat = projectedSeats.get(seat.publicSeat.seatId);
        const resultScore = scoreBySeatId[seat.publicSeat.seatId];

        return {
          ...seat.publicSeat,
          displayName: projectedSeat?.displayName ?? seat.publicSeat.displayName,
          avatarId: projectedSeat?.avatarId ?? seat.publicSeat.avatarId,
          isConnected: projectedSeat?.isConnected ?? seat.publicSeat.isConnected,
          isReady: projectedSeat?.isReady ?? seat.publicSeat.isReady,
          score:
            typeof resultScore === "number"
              ? resultScore
              : typeof projectedSeat?.score === "number"
                ? projectedSeat.score
                : seat.publicSeat.score,
        };
      }),
      publicState: syncedPublicState,
      lastEventAt: room.updatedAt,
      publicResult,
      replaySummary,
      matchSync: { ...room.matchSync },
      joinState,
    };
  }

  private requireRoom(roomId: RoomId): RoomRecord {
    const room = this.getRoom(roomId);
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

  private requireSession(room: RoomRecord, sessionId: string): PlayerSession {
    const session = room.sessions.find((candidate) => candidate.sessionId === sessionId);
    if (!session || session.status !== "active") {
      throw new Error("Session is missing or expired for this room.");
    }

    return session;
  }

  private assertSeatControl(
    room: RoomRecord,
    seat: SeatAssignment,
    sessionId: string | undefined,
    options: { allowUnclaimedHumanSeat: boolean },
  ): void {
    if (seat.privateSeat.backingType !== "human") {
      return;
    }

    const claimedSessionId = seat.privateSeat.sessionId;
    if (!claimedSessionId) {
      if (!options.allowUnclaimedHumanSeat) {
        throw new Error("Human seats must be claimed before they can be controlled.");
      }
      return;
    }

    if (!sessionId || sessionId !== claimedSessionId) {
      throw new Error("This session does not control the requested seat.");
    }

    const session = this.touchSession(room, sessionId);
    session.seatId = seat.publicSeat.seatId;
    seat.publicSeat.isConnected = true;
  }
}

export function cloneRoomRecord<TPublicState = unknown, TGameState = unknown>(
  room: RoomRecord<TPublicState, TGameState>,
): RoomRecord<TPublicState, TGameState> {
  return normalizeRoomRecord(room) as RoomRecord<TPublicState, TGameState>;
}

function normalizeRoomRecord<TPublicState = unknown, TGameState = unknown>(
  room: RoomRecord<TPublicState, TGameState>,
): RoomRecord<TPublicState, TGameState> {
  const clone = JSON.parse(JSON.stringify(room)) as RoomRecord<TPublicState, TGameState>;
  clone.sessions = clone.sessions ?? [];
  return clone;
}

function deriveSeatPlayerId(seat: CreateSeatInput, index: number): string {
  const base =
    seat.playerId ??
    seat.llmModelId ??
    seat.displayName ??
    `${seat.backingType}-${index + 1}`;

  return `${seat.backingType}:${slugify(base)}:${index + 1}`;
}

function createAnonymousPlayerId(displayName: string, sessionId: string): string {
  return `anonymous:${slugify(displayName)}:${sessionId.slice(0, 8)}`;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "seat";
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

function isJoinablePhase(phase: RoomPhase): boolean {
  return phase === "lobby" || phase === "ready";
}

function syncProjectedPublicState<TPublicState>(
  room: RoomRecord<TPublicState, unknown>,
): TPublicState {
  if (!room.publicState || typeof room.publicState !== "object") {
    return room.publicState;
  }

  const publicState = room.publicState as Record<string, unknown>;
  const projectedSeats = publicState.seats;
  if (!Array.isArray(projectedSeats)) {
    return room.publicState;
  }

  const seatLookup = new Map(
    room.seats.map((seat) => [seat.publicSeat.seatId, seat.publicSeat] as const),
  );

  return {
    ...publicState,
    seats: projectedSeats.map((entry) => {
      if (!entry || typeof entry !== "object") {
        return entry;
      }

      const seatView = entry as Record<string, unknown>;
      const seatId = typeof seatView.seatId === "string" ? seatView.seatId : undefined;
      const sourceSeat = seatId ? seatLookup.get(seatId) : undefined;
      if (!sourceSeat) {
        return entry;
      }

      return {
        ...seatView,
        displayName: sourceSeat.displayName,
        avatarId: sourceSeat.avatarId,
        isConnected: sourceSeat.isConnected,
        isReady: sourceSeat.isReady,
      };
    }),
  } as TPublicState;
}

function extractProjectedSeatViews(
  publicState: unknown,
): Map<SeatId, Partial<PublicSeatView>> {
  if (!publicState || typeof publicState !== "object") {
    return new Map();
  }

  const projectedSeats = (publicState as Record<string, unknown>).seats;
  if (!Array.isArray(projectedSeats)) {
    return new Map();
  }

  return new Map(
    projectedSeats.flatMap((entry) => {
      if (!entry || typeof entry !== "object") {
        return [];
      }

      const seatView = entry as Partial<PublicSeatView> & { seatId?: string };
      return typeof seatView.seatId === "string" ? [[seatView.seatId, seatView] as const] : [];
    }),
  );
}

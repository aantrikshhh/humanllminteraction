import type {
  BehavioralOutput,
  MatchResult,
  PublicRoomState,
  ReplayEvent,
  SeatAssignment,
  SeatId,
} from "@arena/contracts";

import {
  type AuctionAction,
  type AuctionActionBid,
  type AuctionActionEnvelope,
  type AuctionConfig,
  type AuctionPrivateState,
  type AuctionPublicState,
  type AuctionSeatPublicView,
  type AuctionSeatState,
  createAuctionConfig,
} from "./types";

export function createAuctionSeats(seats: SeatAssignment[]): AuctionSeatState[] {
  return seats.map(({ publicSeat }) => ({
    seatId: publicSeat.seatId,
    displayName: publicSeat.displayName,
    avatarId: publicSeat.avatarId,
    committedBid: 0,
    hasPassed: false,
  }));
}

export function createAuctionState(
  seed: string,
  seats: SeatAssignment[],
): AuctionPrivateState {
  if (seats.length < 3 || seats.length > 5) {
    throw new Error(`Auction requires 3-5 seats, received ${seats.length}.`);
  }

  const seatOrder = seats.map((seat) => seat.publicSeat.seatId);
  const config = createAuctionConfig(seats.length);

  return {
    seed,
    config,
    phase: "bidding",
    seats: createAuctionSeats(seats),
    seatOrder,
    turnIndex: 0,
    currentTurnSeatId: seatOrder[0],
    currentBid: 0,
    currentPot: 0,
    actionCount: 0,
    passes: 0,
  };
}

export function findSeat(state: AuctionPrivateState, seatId: SeatId): AuctionSeatState {
  const seat = state.seats.find((candidate) => candidate.seatId === seatId);
  if (!seat) {
    throw new Error(`Unknown auction seat: ${seatId}`);
  }
  return seat;
}

export function getLiveSeatIds(state: AuctionPrivateState): SeatId[] {
  return state.seats.filter((seat) => !seat.hasPassed).map((seat) => seat.seatId);
}

export function getNextSeatId(
  state: AuctionPrivateState,
  afterSeatId: SeatId,
): SeatId | undefined {
  const startIndex = state.seatOrder.indexOf(afterSeatId);
  if (startIndex < 0) {
    return undefined;
  }

  for (let offset = 1; offset <= state.seatOrder.length; offset += 1) {
    const nextSeatId = state.seatOrder[(startIndex + offset) % state.seatOrder.length];
    const seat = findSeat(state, nextSeatId);
    if (!seat.hasPassed) {
      return nextSeatId;
    }
  }

  return undefined;
}

export function getLeaderSeatId(state: AuctionPrivateState): SeatId | undefined {
  return state.currentLeaderSeatId;
}

export function validateAuctionAction(
  state: AuctionPrivateState,
  envelope: AuctionActionEnvelope,
): void {
  if (state.phase === "settled") {
    throw new Error("Auction already settled.");
  }

  if (envelope.seatId !== state.currentTurnSeatId) {
    throw new Error(`It is not seat ${envelope.seatId}'s turn.`);
  }

  const actor = findSeat(state, envelope.seatId);
  if (actor.hasPassed) {
    throw new Error(`Seat ${envelope.seatId} has already passed.`);
  }

  const action = envelope.action;
  if (action.type === "auction.pass") {
    return;
  }

  if (!Number.isInteger(action.amount)) {
    throw new Error("Auction bids must be integer values.");
  }

  if (action.amount < state.currentBid + state.config.minIncrement) {
    throw new Error(
      `Auction bids must raise the current bid by at least ${state.config.minIncrement}.`,
    );
  }

  if (action.amount > state.config.maxBid) {
    throw new Error(`Auction bids cannot exceed ${state.config.maxBid}.`);
  }
}

export function projectAuctionPublicState(
  state: AuctionPrivateState,
  viewerSeatId?: SeatId,
): AuctionPublicState {
  return {
    itemName: state.config.itemName,
    itemValue: state.config.itemValue,
    currentBid: state.currentBid,
    currentPot: state.currentPot,
    currentLeaderSeatId: state.currentLeaderSeatId,
    currentTurnSeatId: state.phase === "bidding" ? state.currentTurnSeatId : undefined,
    turnIndex: state.turnIndex,
    turnsRemaining: Math.max(0, state.config.maxTurns - state.actionCount),
    maxTurns: state.config.maxTurns,
    phase: state.phase,
    winnerSeatId: state.winnerSeatId,
    settleReason: state.settledBy,
    viewerCanAct: Boolean(
      viewerSeatId &&
        state.phase === "bidding" &&
        state.currentTurnSeatId === viewerSeatId,
    ),
    seats: state.seats.map((seat) => ({
      seatId: seat.seatId,
      displayName: seat.displayName,
      avatarId: seat.avatarId,
      isConnected: true,
      isReady: true,
      score: seat.committedBid,
      committedBid: seat.committedBid,
      hasPassed: seat.hasPassed,
      isLeader: state.currentLeaderSeatId === seat.seatId,
    })),
  };
}

export function countActiveSeats(state: AuctionPrivateState): number {
  return state.seats.filter((seat) => !seat.hasPassed).length;
}

function compareSeatOrder(state: AuctionPrivateState, left: SeatId, right: SeatId): number {
  return state.seatOrder.indexOf(left) - state.seatOrder.indexOf(right);
}

export function resolveAuctionWinner(state: AuctionPrivateState): SeatId {
  const ranked = [...state.seats].sort((left, right) => {
    if (right.committedBid !== left.committedBid) {
      return right.committedBid - left.committedBid;
    }
    return compareSeatOrder(state, left.seatId, right.seatId);
  });
  return ranked[0]?.seatId ?? state.seatOrder[0];
}

export function settleAuction(
  state: AuctionPrivateState,
  nowIso: string,
  reason: AuctionPrivateState["settledBy"],
): AuctionPrivateState {
  const winnerSeatId =
    reason === "one_active"
      ? state.seats.find((seat) => !seat.hasPassed)?.seatId ?? resolveAuctionWinner(state)
      : resolveAuctionWinner(state);
  return {
    ...state,
    phase: "settled",
    currentTurnSeatId: winnerSeatId,
    winnerSeatId,
    settledAt: nowIso,
    settledBy: reason,
  };
}

export function summarizeAuctionBehavior(state: AuctionPrivateState): BehavioralOutput[] {
  return [
    { metricKey: "auction.item_value", value: state.config.itemValue, unit: "credits" },
    { metricKey: "auction.final_pot", value: state.currentPot, unit: "credits" },
    { metricKey: "auction.final_bid", value: state.currentBid, unit: "credits" },
    { metricKey: "auction.passes", value: state.passes, unit: "count" },
    { metricKey: "auction.turns", value: state.actionCount, unit: "turns" },
    {
      metricKey: "auction.turn_limit_reached",
      value: state.settledBy === "turn_limit",
      unit: "boolean",
    },
  ];
}

export function computeAuctionScores(state: AuctionPrivateState): Record<SeatId, number> {
  const winnerSeatId = state.winnerSeatId ?? resolveAuctionWinner(state);
  const scores: Record<SeatId, number> = {};

  for (const seat of state.seats) {
    scores[seat.seatId] =
      seat.seatId === winnerSeatId
        ? state.config.itemValue - seat.committedBid
        : seat.committedBid === 0 ? 0 : -seat.committedBid;
  }

  return scores;
}

export function buildAuctionMatchResult(
  state: AuctionPrivateState,
  roomState: PublicRoomState<AuctionPublicState>,
): MatchResult {
  const winnerSeatId = state.winnerSeatId ?? resolveAuctionWinner(state);
  return {
    matchId: roomState.matchId,
    game: "auction",
    roomId: roomState.roomId,
    completedAt: state.settledAt ?? new Date().toISOString(),
    winningSeatIds: [winnerSeatId],
    seatScores: computeAuctionScores(state),
    behavioralOutput: summarizeAuctionBehavior(state),
  };
}

export function createAuctionEvent(
  sequence: number,
  type: string,
  occurredAt: string,
  actorSeatId: SeatId | undefined,
  publicPayload: unknown,
  privatePayload?: unknown,
): ReplayEvent {
  return {
    sequence,
    type,
    occurredAt,
    actorSeatId,
    publicPayload,
    privatePayload,
  };
}

export function applyAuctionAction(
  state: AuctionPrivateState,
  envelope: AuctionActionEnvelope,
  nowIso: string,
): {
  nextState: AuctionPrivateState;
  events: ReplayEvent[];
  isTerminal: boolean;
} {
  validateAuctionAction(state, envelope);

  const actor = findSeat(state, envelope.seatId);
  const updatedSeats = state.seats.map((seat) => {
    if (seat.seatId !== actor.seatId) {
      return seat;
    }

    if (envelope.action.type === "auction.pass") {
      return {
        ...seat,
        hasPassed: true,
      };
    }

    return {
      ...seat,
      committedBid: envelope.action.amount,
    };
  });

  const activeSeats = updatedSeats.filter((seat) => !seat.hasPassed);
  const currentBid =
    envelope.action.type === "auction.bid"
      ? Math.max(state.currentBid, envelope.action.amount)
      : state.currentBid;
  const currentLeaderSeatId =
    envelope.action.type === "auction.bid"
      ? envelope.seatId
      : state.currentLeaderSeatId;
  const currentPot = updatedSeats.reduce((total, seat) => total + seat.committedBid, 0);
  const passes = state.passes + (envelope.action.type === "auction.pass" ? 1 : 0);
  const actionCount = state.actionCount + 1;

  const nextSeatId = activeSeats.length > 1 ? getNextSeatId({ ...state, seats: updatedSeats }, envelope.seatId) : undefined;
  const hitTurnLimit = actionCount >= state.config.maxTurns;
  const oneSeatStanding = activeSeats.length <= 1;
  const settleReason = oneSeatStanding
    ? "one_active"
    : hitTurnLimit
      ? "turn_limit"
      : undefined;
  const nextStateBase: AuctionPrivateState = {
    ...state,
    seats: updatedSeats,
    currentBid,
    currentLeaderSeatId,
    currentPot,
    passes,
    actionCount,
    turnIndex: actionCount,
    currentTurnSeatId: nextSeatId ?? envelope.seatId,
  };
  const shouldSettle = Boolean(settleReason);
  const nextState = shouldSettle
    ? settleAuction(nextStateBase, nowIso, settleReason)
    : nextStateBase;

  const events = [
    createAuctionEvent(
      actionCount,
      envelope.action.type,
      nowIso,
      envelope.seatId,
      {
        actorSeatId: envelope.seatId,
        action: envelope.action,
        currentBid: nextState.currentBid,
        currentPot: nextState.currentPot,
      },
      {
        seats: nextState.seats.map((seat) => ({
          seatId: seat.seatId,
          committedBid: seat.committedBid,
          hasPassed: seat.hasPassed,
        })),
      },
    ),
  ];

  if (shouldSettle) {
    events.push(
      createAuctionEvent(
        actionCount + 1,
        "match.settled",
        nowIso,
        undefined,
        {
          winnerSeatId: nextState.winnerSeatId,
          settledBy: nextState.settledBy,
          currentBid: nextState.currentBid,
          currentPot: nextState.currentPot,
        },
      ),
    );
  }

  return {
    nextState,
    events,
    isTerminal: shouldSettle,
  };
}

export function finalizeAuctionMatch(
  state: AuctionPrivateState,
  publicState: PublicRoomState<AuctionPublicState>,
): MatchResult {
  const settledState = state.phase === "settled"
    ? state
    : settleAuction(
        {
          ...state,
          settledBy: state.actionCount >= state.config.maxTurns ? "turn_limit" : "all_passed",
        },
        publicState.lastEventAt,
        state.actionCount >= state.config.maxTurns ? "turn_limit" : "all_passed",
      );

  return buildAuctionMatchResult(settledState, publicState);
}

export function isAuctionAction(value: unknown): value is AuctionAction {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }

  const action = value as { type?: string; amount?: unknown };

  if (action.type === "auction.pass") {
    return true;
  }

  return action.type === "auction.bid" && typeof action.amount === "number";
}

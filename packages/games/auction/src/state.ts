import type {
  BehavioralOutput,
  MatchResult,
  PublicRoomState,
  ReplayEvent,
  SeatAssignment,
  SeatId,
} from "@arena/contracts";

import type {
  AuctionAction,
  AuctionActionEnvelope,
  AuctionMatchSettleReason,
  AuctionPrivateState,
  AuctionPublicState,
  AuctionRoundRecord,
  AuctionRoundSettleReason,
  AuctionSeatState,
} from "./types";
import { createAuctionConfig } from "./types";

function computeNetScore(seat: Pick<AuctionSeatState, "totalSpent" | "totalValueWon">): number {
  return seat.totalValueWon - seat.totalSpent;
}

function getRoundOpeningSeatId(seatOrder: SeatId[], roundIndex: number): SeatId {
  return seatOrder[roundIndex % seatOrder.length] ?? seatOrder[0]!;
}

export function createAuctionSeats(
  seats: SeatAssignment[],
  startingBankroll: number,
): AuctionSeatState[] {
  return seats.map(({ publicSeat }) => ({
    seatId: publicSeat.seatId,
    displayName: publicSeat.displayName,
    avatarId: publicSeat.avatarId,
    bankroll: startingBankroll,
    totalSpent: 0,
    totalValueWon: 0,
    roundsWon: 0,
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
  const currentRoundOpeningSeatId = getRoundOpeningSeatId(seatOrder, 0);

  return {
    seed,
    config,
    phase: "bidding",
    seats: createAuctionSeats(seats, config.startingBankroll),
    seatOrder,
    roundIndex: 0,
    roundHistory: [],
    currentRoundPrizeValue: config.prizeValues[0] ?? config.itemValue,
    currentRoundOpeningSeatId,
    turnIndex: 0,
    actionCount: 0,
    eventCount: 0,
    roundActionCount: 0,
    currentTurnSeatId: currentRoundOpeningSeatId,
    currentBid: 0,
    currentPot: 0,
    passes: 0,
    currentRoundPasses: 0,
  };
}

export function findSeat(state: AuctionPrivateState, seatId: SeatId): AuctionSeatState {
  const seat = state.seats.find((candidate) => candidate.seatId === seatId);
  if (!seat) {
    throw new Error(`Unknown auction seat: ${seatId}`);
  }
  return seat;
}

function sortSeatIdsByOrder(state: AuctionPrivateState, seatIds: readonly SeatId[]): SeatId[] {
  return [...seatIds].sort(
    (left, right) => state.seatOrder.indexOf(left) - state.seatOrder.indexOf(right),
  );
}

function getActiveSeatIds(state: AuctionPrivateState): SeatId[] {
  return state.seats.filter((seat) => !seat.hasPassed).map((seat) => seat.seatId);
}

function getNextSeatId(state: AuctionPrivateState, afterSeatId: SeatId): SeatId | undefined {
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

function resolveRoundWinner(state: AuctionPrivateState): SeatId {
  const activeSeatIds = getActiveSeatIds(state);
  if (activeSeatIds.length === 1) {
    return activeSeatIds[0]!;
  }

  const ranked = [...state.seats].sort((left, right) => {
    if (right.committedBid !== left.committedBid) {
      return right.committedBid - left.committedBid;
    }

    return state.seatOrder.indexOf(left.seatId) - state.seatOrder.indexOf(right.seatId);
  });

  return ranked[0]?.seatId ?? state.seatOrder[0]!;
}

function resolveMatchWinner(state: AuctionPrivateState): SeatId {
  const ranked = [...state.seats].sort((left, right) => {
    const scoreDelta = computeNetScore(right) - computeNetScore(left);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    if (right.bankroll !== left.bankroll) {
      return right.bankroll - left.bankroll;
    }

    if (right.totalValueWon !== left.totalValueWon) {
      return right.totalValueWon - left.totalValueWon;
    }

    return state.seatOrder.indexOf(left.seatId) - state.seatOrder.indexOf(right.seatId);
  });

  return ranked[0]?.seatId ?? state.seatOrder[0]!;
}

export function validateAuctionAction(
  state: AuctionPrivateState,
  envelope: AuctionActionEnvelope,
): void {
  if (state.phase === "settled") {
    throw new Error("Auction already settled.");
  }

  if (!state.currentTurnSeatId || envelope.seatId !== state.currentTurnSeatId) {
    throw new Error(`It is not seat ${envelope.seatId}'s turn.`);
  }

  const actor = findSeat(state, envelope.seatId);
  if (actor.hasPassed) {
    throw new Error(`Seat ${envelope.seatId} has already passed this round.`);
  }

  if (envelope.action.type === "auction.pass") {
    return;
  }

  if (!Number.isInteger(envelope.action.amount)) {
    throw new Error("Auction bids must be integer values.");
  }

  if (envelope.action.amount < state.currentBid + state.config.minIncrement) {
    throw new Error(
      `Auction bids must raise the current bid by at least ${state.config.minIncrement}.`,
    );
  }

  if (envelope.action.amount > state.config.maxBid) {
    throw new Error(`Auction bids cannot exceed ${state.config.maxBid}.`);
  }

  if (envelope.action.amount > actor.bankroll) {
    throw new Error(
      `Seat ${envelope.seatId} cannot bid above its remaining bankroll of ${actor.bankroll}.`,
    );
  }
}

export function projectAuctionPublicState(
  state: AuctionPrivateState,
  viewerSeatId?: SeatId,
): AuctionPublicState {
  return {
    itemName: state.config.itemName,
    itemValue: state.currentRoundPrizeValue,
    prizeValues: state.config.prizeValues,
    startingBankroll: state.config.startingBankroll,
    currentRound: state.roundIndex + 1,
    totalRounds: state.config.prizeValues.length,
    roundsRemaining: Math.max(
      0,
      state.config.prizeValues.length - Math.min(state.roundHistory.length, state.config.prizeValues.length),
    ),
    currentRoundPrizeValue: state.currentRoundPrizeValue,
    currentRoundOpeningSeatId: state.currentRoundOpeningSeatId,
    currentBid: state.currentBid,
    currentPot: state.currentPot,
    currentLeaderSeatId: state.currentLeaderSeatId,
    currentTurnSeatId: state.phase === "bidding" ? state.currentTurnSeatId : undefined,
    turnIndex: state.turnIndex,
    turnsRemaining: Math.max(0, state.config.maxTurns - state.actionCount),
    roundTurnsRemaining: Math.max(0, state.config.turnsPerRound - state.roundActionCount),
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
      score: computeNetScore(seat),
      bankroll: seat.bankroll,
      totalSpent: seat.totalSpent,
      totalValueWon: seat.totalValueWon,
      netScore: computeNetScore(seat),
      committedBid: seat.committedBid,
      hasPassed: seat.hasPassed,
      isLeader: state.currentLeaderSeatId === seat.seatId,
      roundsWon: seat.roundsWon,
    })),
    history: state.roundHistory.map((entry) => ({
      roundNumber: entry.roundNumber,
      prizeValue: entry.prizeValue,
      openingSeatId: entry.openingSeatId,
      winnerSeatId: entry.winnerSeatId,
      winningBid: entry.winningBid,
      pot: entry.pot,
      settledBy: entry.settledBy,
      actionCount: entry.actionCount,
    })),
  };
}

function createAuctionEvent(
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

function buildRoundRecord(
  state: AuctionPrivateState,
  winnerSeatId: SeatId,
  settledBy: AuctionRoundSettleReason,
): AuctionRoundRecord {
  const spentBySeat = Object.fromEntries(
    state.seats.map((seat) => [seat.seatId, seat.committedBid]),
  ) as Record<SeatId, number>;
  const scoreDeltaBySeat = Object.fromEntries(
    state.seats.map((seat) => [
      seat.seatId,
      (seat.seatId === winnerSeatId ? state.currentRoundPrizeValue : 0) - seat.committedBid,
    ]),
  ) as Record<SeatId, number>;

  return {
    roundNumber: state.roundIndex + 1,
    prizeValue: state.currentRoundPrizeValue,
    openingSeatId: state.currentRoundOpeningSeatId,
    winnerSeatId,
    winningBid: findSeat(state, winnerSeatId).committedBid,
    pot: state.currentPot,
    settledBy,
    actionCount: state.roundActionCount,
    spentBySeat,
    scoreDeltaBySeat,
  };
}

function applyRoundOutcome(
  state: AuctionPrivateState,
  winnerSeatId: SeatId,
): AuctionSeatState[] {
  return state.seats.map((seat) => {
    const spent = seat.committedBid;
    const prizeGain = seat.seatId === winnerSeatId ? state.currentRoundPrizeValue : 0;

    return {
      ...seat,
      bankroll: seat.bankroll - spent,
      totalSpent: seat.totalSpent + spent,
      totalValueWon: seat.totalValueWon + prizeGain,
      roundsWon: seat.roundsWon + (seat.seatId === winnerSeatId ? 1 : 0),
      committedBid: 0,
      hasPassed: false,
    };
  });
}

function startNextRound(
  state: AuctionPrivateState,
  seats: AuctionSeatState[],
): AuctionPrivateState {
  const nextRoundIndex = state.roundIndex + 1;
  const currentRoundOpeningSeatId = getRoundOpeningSeatId(state.seatOrder, nextRoundIndex);

  return {
    ...state,
    seats,
    roundIndex: nextRoundIndex,
    currentRoundPrizeValue:
      state.config.prizeValues[nextRoundIndex] ?? state.config.itemValue,
    currentRoundOpeningSeatId,
    currentTurnSeatId: currentRoundOpeningSeatId,
    currentBid: 0,
    currentLeaderSeatId: undefined,
    currentPot: 0,
    roundActionCount: 0,
    currentRoundPasses: 0,
  };
}

function settleMatch(
  state: AuctionPrivateState,
  seats: AuctionSeatState[],
  nowIso: string,
  reason: AuctionMatchSettleReason,
): AuctionPrivateState {
  const winnerSeatId = resolveMatchWinner({
    ...state,
    seats,
  });

  return {
    ...state,
    phase: "settled",
    seats,
    currentTurnSeatId: undefined,
    currentBid: 0,
    currentLeaderSeatId: undefined,
    currentPot: 0,
    winnerSeatId,
    settledAt: nowIso,
    settledBy: reason,
  };
}

function settleCurrentRound(
  state: AuctionPrivateState,
  nowIso: string,
  settledBy: AuctionRoundSettleReason,
  matchReason: AuctionMatchSettleReason,
): {
  nextState: AuctionPrivateState;
  roundRecord: AuctionRoundRecord;
  isMatchComplete: boolean;
} {
  const winnerSeatId = resolveRoundWinner(state);
  const roundRecord = buildRoundRecord(state, winnerSeatId, settledBy);
  const settledSeats = applyRoundOutcome(state, winnerSeatId);
  const nextHistory = [...state.roundHistory, roundRecord];
  const roundSettledState: AuctionPrivateState = {
    ...state,
    seats: settledSeats,
    roundHistory: nextHistory,
  };

  if (nextHistory.length >= state.config.prizeValues.length) {
    return {
      nextState: settleMatch(roundSettledState, settledSeats, nowIso, matchReason),
      roundRecord,
      isMatchComplete: true,
    };
  }

  return {
    nextState: startNextRound(roundSettledState, settledSeats),
    roundRecord,
    isMatchComplete: false,
  };
}

function summarizeAuctionBehavior(state: AuctionPrivateState): BehavioralOutput[] {
  const totalValueAwarded = state.roundHistory.reduce(
    (sum, round) => sum + round.prizeValue,
    0,
  );
  const totalPot = state.seats.reduce((sum, seat) => sum + seat.totalSpent, 0);

  return [
    {
      metricKey: "auction.rounds_played",
      value: state.roundHistory.length,
      unit: "count",
    },
    {
      metricKey: "auction.total_value_awarded",
      value: totalValueAwarded,
      unit: "credits",
    },
    {
      metricKey: "auction.total_spend",
      value: totalPot,
      unit: "credits",
    },
    {
      metricKey: "auction.passes",
      value: state.passes,
      unit: "count",
    },
    {
      metricKey: "auction.turns",
      value: state.actionCount,
      unit: "turns",
    },
  ];
}

function computeAuctionScores(state: AuctionPrivateState): Record<SeatId, number> {
  return Object.fromEntries(
    state.seats.map((seat) => [seat.seatId, computeNetScore(seat)]),
  ) as Record<SeatId, number>;
}

function buildAuctionMatchResult(
  state: AuctionPrivateState,
  roomState: PublicRoomState<AuctionPublicState>,
): MatchResult {
  const winnerSeatId = state.winnerSeatId ?? resolveMatchWinner(state);

  return {
    matchId: roomState.matchId,
    game: "auction",
    roomId: roomState.roomId,
    completedAt: state.settledAt ?? roomState.lastEventAt,
    winningSeatIds: [winnerSeatId],
    seatScores: computeAuctionScores(state),
    behavioralOutput: summarizeAuctionBehavior(state),
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

  const updatedSeats = state.seats.map((seat) => {
    if (seat.seatId !== envelope.seatId) {
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

  const currentBid =
    envelope.action.type === "auction.bid"
      ? Math.max(state.currentBid, envelope.action.amount)
      : state.currentBid;
  const currentLeaderSeatId =
    envelope.action.type === "auction.bid"
      ? envelope.seatId
      : state.currentLeaderSeatId;
  const currentPot = updatedSeats.reduce((sum, seat) => sum + seat.committedBid, 0);
  const actionCount = state.actionCount + 1;
  const roundActionCount = state.roundActionCount + 1;
  const passes = state.passes + (envelope.action.type === "auction.pass" ? 1 : 0);
  const currentRoundPasses =
    state.currentRoundPasses + (envelope.action.type === "auction.pass" ? 1 : 0);
  const workingState: AuctionPrivateState = {
    ...state,
    seats: updatedSeats,
    currentBid,
    currentLeaderSeatId,
    currentPot,
    turnIndex: actionCount,
    actionCount,
    roundActionCount,
    passes,
    currentRoundPasses,
  };

  const activeSeatIds = getActiveSeatIds(workingState);
  const roundSettledBy: AuctionRoundSettleReason | undefined =
    activeSeatIds.length <= 1
      ? "one_active"
      : roundActionCount >= state.config.turnsPerRound
        ? "turn_limit"
        : undefined;
  const nextSeatId =
    !roundSettledBy && workingState.currentTurnSeatId
      ? getNextSeatId(workingState, envelope.seatId)
      : undefined;
  const baseState = roundSettledBy
    ? workingState
    : {
        ...workingState,
        currentTurnSeatId: nextSeatId ?? envelope.seatId,
      };

  const events: ReplayEvent[] = [
    createAuctionEvent(
      state.eventCount + 1,
      envelope.action.type,
      nowIso,
      envelope.seatId,
      {
        roundNumber: state.roundIndex + 1,
        actorSeatId: envelope.seatId,
        action: envelope.action,
        currentBid: baseState.currentBid,
        currentPot: baseState.currentPot,
        currentLeaderSeatId: baseState.currentLeaderSeatId,
      },
      {
        seats: baseState.seats.map((seat) => ({
          seatId: seat.seatId,
          bankroll: seat.bankroll,
          committedBid: seat.committedBid,
          hasPassed: seat.hasPassed,
        })),
      },
    ),
  ];

  if (!roundSettledBy) {
    const nextState = {
      ...baseState,
      eventCount: state.eventCount + events.length,
    };

    return {
      nextState,
      events,
      isTerminal: false,
    };
  }

  const roundSettlement = settleCurrentRound(
    baseState,
    nowIso,
    roundSettledBy,
    "all_rounds_complete",
  );

  events.push(
    createAuctionEvent(
      state.eventCount + events.length + 1,
      "auction.round_settled",
      nowIso,
      undefined,
      {
        roundNumber: roundSettlement.roundRecord.roundNumber,
        prizeValue: roundSettlement.roundRecord.prizeValue,
        winnerSeatId: roundSettlement.roundRecord.winnerSeatId,
        winningBid: roundSettlement.roundRecord.winningBid,
        pot: roundSettlement.roundRecord.pot,
        settledBy: roundSettlement.roundRecord.settledBy,
      },
      {
        spentBySeat: roundSettlement.roundRecord.spentBySeat,
        scoreDeltaBySeat: roundSettlement.roundRecord.scoreDeltaBySeat,
      },
    ),
  );

  if (roundSettlement.isMatchComplete) {
    events.push(
      createAuctionEvent(
        state.eventCount + events.length + 1,
        "match.settled",
        nowIso,
        undefined,
        {
          winnerSeatId: roundSettlement.nextState.winnerSeatId,
          settledBy: roundSettlement.nextState.settledBy,
          roundsPlayed: roundSettlement.nextState.roundHistory.length,
        },
      ),
    );
  } else {
    events.push(
      createAuctionEvent(
        state.eventCount + events.length + 1,
        "auction.round_started",
        nowIso,
        undefined,
        {
          roundNumber: roundSettlement.nextState.roundIndex + 1,
          prizeValue: roundSettlement.nextState.currentRoundPrizeValue,
          openingSeatId: roundSettlement.nextState.currentRoundOpeningSeatId,
        },
      ),
    );
  }

  const nextState = {
    ...roundSettlement.nextState,
    eventCount: state.eventCount + events.length,
  };

  return {
    nextState,
    events,
    isTerminal: roundSettlement.isMatchComplete,
  };
}

function forceFinalizeAuction(
  state: AuctionPrivateState,
  nowIso: string,
): AuctionPrivateState {
  if (state.phase === "settled") {
    return state;
  }

  const roundState =
    state.currentBid > 0 || state.currentRoundPasses > 0
      ? settleCurrentRound(state, nowIso, "turn_limit", "forced_finalize").nextState
      : state;

  if (roundState.phase === "settled") {
    return roundState;
  }

  return settleMatch(roundState, roundState.seats, nowIso, "forced_finalize");
}

export function finalizeAuctionMatch(
  state: AuctionPrivateState,
  publicState: PublicRoomState<AuctionPublicState>,
): MatchResult {
  const settledState = forceFinalizeAuction(state, publicState.lastEventAt);
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

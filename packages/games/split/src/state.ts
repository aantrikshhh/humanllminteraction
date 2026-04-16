import type {
  BehavioralOutput,
  MatchResult,
  PublicRoomState,
  ReplayEvent,
  SeatAssignment,
  SeatId,
} from "@arena/contracts";

import {
  type SplitAction,
  type SplitActionEnvelope,
  type SplitFairnessBand,
  type SplitPendingOffer,
  type SplitPrivateState,
  type SplitPublicState,
  type SplitRoundRecord,
  type SplitSeatPublicView,
  type SplitSeatState,
  SPLIT_FAIR_OFFER_SHARE,
  SPLIT_LOW_OFFER_SHARE,
  SPLIT_TENSE_OFFER_SHARE,
  createSplitConfig,
} from "./types";

export function createSplitSeats(seats: SeatAssignment[]): SplitSeatState[] {
  return seats.map(({ publicSeat }) => ({
    seatId: publicSeat.seatId,
    displayName: publicSeat.displayName,
    avatarId: publicSeat.avatarId,
    cumulativeScore: 0,
    proposalsMade: 0,
    acceptedCount: 0,
    rejectedCount: 0,
  }));
}

export function getRoundRoles(
  seatOrder: SeatId[],
  roundIndex: number,
): { proposerSeatId: SeatId; responderSeatId: SeatId } {
  if (seatOrder.length !== 2) {
    throw new Error(`Split requires exactly 2 seats, received ${seatOrder.length}.`);
  }

  const proposerSeatId = seatOrder[roundIndex % 2];
  const responderSeatId = seatOrder[(roundIndex + 1) % 2];

  return { proposerSeatId, responderSeatId };
}

export function createSplitState(
  seed: string,
  seats: SeatAssignment[],
): SplitPrivateState {
  if (seats.length !== 2) {
    throw new Error(`Split requires exactly 2 seats, received ${seats.length}.`);
  }

  const seatOrder = seats.map((seat) => seat.publicSeat.seatId);
  const { proposerSeatId, responderSeatId } = getRoundRoles(seatOrder, 0);

  return {
    seed,
    config: createSplitConfig(),
    phase: "offer",
    seats: createSplitSeats(seats),
    seatOrder,
    roundIndex: 0,
    proposerSeatId,
    responderSeatId,
    history: [],
    actionCount: 0,
  };
}

export function findSplitSeat(
  state: SplitPrivateState,
  seatId: SeatId,
): SplitSeatState {
  const seat = state.seats.find((candidate) => candidate.seatId === seatId);
  if (!seat) {
    throw new Error(`Unknown split seat: ${seatId}`);
  }
  return seat;
}

export function validateSplitAction(
  state: SplitPrivateState,
  envelope: SplitActionEnvelope,
): void {
  if (state.phase === "settled") {
    throw new Error("Split match already settled.");
  }

  if (state.phase === "offer") {
    if (envelope.seatId !== state.proposerSeatId) {
      throw new Error(`Only proposer seat ${state.proposerSeatId} can make the offer.`);
    }

    if (envelope.action.type !== "split.offer") {
      throw new Error("Split requires an offer before any response.");
    }

    if (!Number.isInteger(envelope.action.amount)) {
      throw new Error("Split offers must be integer credit values.");
    }

    if (
      envelope.action.amount < 0 ||
      envelope.action.amount > state.config.potTotal
    ) {
      throw new Error(
        `Split offers must be between 0 and ${state.config.potTotal}.`,
      );
    }

    return;
  }

  if (envelope.seatId !== state.responderSeatId) {
    throw new Error(
      `Only responder seat ${state.responderSeatId} can answer the current offer.`,
    );
  }

  if (envelope.action.type === "split.offer") {
    throw new Error("Split responder must accept or reject the pending offer.");
  }

  if (!state.pendingOffer) {
    throw new Error("Split response phase requires a pending offer.");
  }
}

export function projectSplitPublicState(
  state: SplitPrivateState,
  viewerSeatId?: SeatId,
): SplitPublicState {
  const leaderScore = Math.max(...state.seats.map((seat) => seat.cumulativeScore));
  const averageOfferShare =
    state.history.length === 0
      ? state.pendingOffer?.offerShare ?? 0
      : state.history.reduce((total, round) => total + round.offerShare, 0) /
        state.history.length;
  const agreementRate =
    state.history.length === 0
      ? 0
      : state.history.filter((round) => round.decision === "accepted").length /
        state.history.length;
  const fairnessPulse = state.pendingOffer
    ? state.pendingOffer.fairnessBand
    : state.history.at(-1)?.fairnessBand ?? "fair";
  const viewerRole =
    viewerSeatId === state.proposerSeatId
      ? "proposer"
      : viewerSeatId === state.responderSeatId
        ? "responder"
        : undefined;
  const viewerCanAct = Boolean(
    viewerSeatId &&
      ((state.phase === "offer" && viewerSeatId === state.proposerSeatId) ||
        (state.phase === "response" && viewerSeatId === state.responderSeatId)),
  );

  const narrative =
    state.phase === "offer"
      ? `Round ${state.roundIndex + 1}: ${state.proposerSeatId} proposes a split.`
      : state.phase === "response" && state.pendingOffer
        ? `Round ${state.pendingOffer.roundNumber}: ${state.responderSeatId} must decide whether ${state.pendingOffer.amountToResponder}/${state.config.potTotal} is fair enough.`
        : "The split is settled.";

  return {
    phase: state.phase,
    potTotal: state.config.potTotal,
    currentRound: Math.min(state.roundIndex + 1, state.config.maxRounds),
    maxRounds: state.config.maxRounds,
    roundsRemaining:
      state.phase === "settled"
        ? 0
        : Math.max(0, state.config.maxRounds - state.roundIndex),
    proposerSeatId: state.phase === "settled" ? undefined : state.proposerSeatId,
    responderSeatId: state.phase === "settled" ? undefined : state.responderSeatId,
    pendingOffer: state.pendingOffer
      ? {
          amountToResponder: state.pendingOffer.amountToResponder,
          amountToProposer: state.pendingOffer.amountToProposer,
          offerShare: state.pendingOffer.offerShare,
          fairnessBand: state.pendingOffer.fairnessBand,
        }
      : undefined,
    viewerRole,
    viewerCanAct,
    tensionIndex: state.pendingOffer
      ? Math.round((0.5 - state.pendingOffer.offerShare) * 100)
      : 0,
    agreementRate: Number(agreementRate.toFixed(2)),
    averageOfferShare: Number(averageOfferShare.toFixed(2)),
    lowOfferShareThreshold: SPLIT_LOW_OFFER_SHARE,
    fairnessPulse,
    narrative,
    seats: state.seats.map((seat) => ({
      seatId: seat.seatId,
      displayName: seat.displayName,
      avatarId: seat.avatarId,
      isConnected: true,
      isReady: true,
      score: seat.cumulativeScore,
      cumulativeScore: seat.cumulativeScore,
      proposalsMade: seat.proposalsMade,
      acceptedCount: seat.acceptedCount,
      rejectedCount: seat.rejectedCount,
      role: seat.seatId === state.proposerSeatId ? "proposer" : "responder",
      scoreDeltaFromLeader: seat.cumulativeScore - leaderScore,
    })),
    history: state.history.map((entry) => ({
      roundNumber: entry.roundNumber,
      proposerSeatId: entry.proposerSeatId,
      responderSeatId: entry.responderSeatId,
      amountToResponder: entry.amountToResponder,
      offerShare: entry.offerShare,
      fairnessBand: entry.fairnessBand,
      decision: entry.decision,
      proposerDelta: entry.proposerDelta,
      responderDelta: entry.responderDelta,
    })),
  };
}

export function classifySplitOfferShare(offerShare: number): SplitFairnessBand {
  if (offerShare <= SPLIT_LOW_OFFER_SHARE) {
    return "predatory";
  }

  if (offerShare < SPLIT_TENSE_OFFER_SHARE) {
    return "tense";
  }

  if (offerShare <= SPLIT_FAIR_OFFER_SHARE) {
    return "fair";
  }

  return "generous";
}

export function resolveSplitWinners(state: SplitPrivateState): SeatId[] {
  const highScore = Math.max(...state.seats.map((seat) => seat.cumulativeScore));
  return state.seats
    .filter((seat) => seat.cumulativeScore === highScore)
    .map((seat) => seat.seatId);
}

export function computeSplitScores(state: SplitPrivateState): Record<SeatId, number> {
  return Object.fromEntries(
    state.seats.map((seat) => [seat.seatId, seat.cumulativeScore]),
  );
}

export function summarizeSplitBehavior(
  state: SplitPrivateState,
): BehavioralOutput[] {
  const acceptedRounds = state.history.filter((round) => round.decision === "accepted");
  const rejectedRounds = state.history.filter((round) => round.decision === "rejected");
  const averageOfferShare =
    state.history.length === 0
      ? 0
      : state.history.reduce((total, round) => total + round.offerShare, 0) /
        state.history.length;
  const lowOfferRejections = rejectedRounds.filter(
    (round) => round.offerShare <= SPLIT_LOW_OFFER_SHARE,
  ).length;

  return [
    { metricKey: "split.rounds_completed", value: state.history.length, unit: "count" },
    { metricKey: "split.accepted_rounds", value: acceptedRounds.length, unit: "count" },
    { metricKey: "split.rejected_rounds", value: rejectedRounds.length, unit: "count" },
    {
      metricKey: "split.average_offer_share",
      value: Number(averageOfferShare.toFixed(2)),
      unit: "share",
    },
    {
      metricKey: "split.low_offer_rejections",
      value: lowOfferRejections,
      unit: "count",
    },
  ];
}

export function finalizeSplitMatch(
  state: SplitPrivateState,
  roomState: PublicRoomState<SplitPublicState>,
): MatchResult {
  return {
    matchId: roomState.matchId,
    game: "split",
    roomId: roomState.roomId,
    completedAt: state.completedAt ?? roomState.lastEventAt,
    winningSeatIds: resolveSplitWinners(state),
    seatScores: computeSplitScores(state),
    behavioralOutput: summarizeSplitBehavior(state),
  };
}

export function createSplitEvent(
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

function advanceToNextRound(
  state: SplitPrivateState,
  nextRoundIndex: number,
): SplitPrivateState {
  if (nextRoundIndex >= state.config.maxRounds) {
    return {
      ...state,
      phase: "settled",
      pendingOffer: undefined,
    };
  }

  const { proposerSeatId, responderSeatId } = getRoundRoles(
    state.seatOrder,
    nextRoundIndex,
  );

  return {
    ...state,
    phase: "offer",
    roundIndex: nextRoundIndex,
    proposerSeatId,
    responderSeatId,
    pendingOffer: undefined,
  };
}

function buildResolvedRound(
  pendingOffer: SplitPendingOffer,
  decision: "accepted" | "rejected",
  nowIso: string,
): SplitRoundRecord {
  const responderDelta = decision === "accepted" ? pendingOffer.amountToResponder : 0;
  const proposerDelta = decision === "accepted" ? pendingOffer.amountToProposer : 0;

  return {
    roundNumber: pendingOffer.roundNumber,
    proposerSeatId: pendingOffer.proposerSeatId,
    responderSeatId: pendingOffer.responderSeatId,
    amountToResponder: pendingOffer.amountToResponder,
    amountToProposer: pendingOffer.amountToProposer,
    offerShare: pendingOffer.offerShare,
    fairnessBand: pendingOffer.fairnessBand,
    decision,
    proposerDelta,
    responderDelta,
    resolvedAt: nowIso,
  };
}

export function applySplitAction(
  state: SplitPrivateState,
  envelope: SplitActionEnvelope,
  nowIso: string,
): {
  nextState: SplitPrivateState;
  events: ReplayEvent[];
  behavioralOutput?: BehavioralOutput[];
  isTerminal: boolean;
} {
  validateSplitAction(state, envelope);

  const nextSequence = state.actionCount + 1;

  if (envelope.action.type === "split.offer") {
    const amountToResponder = envelope.action.amount;
    const pendingOffer: SplitPendingOffer = {
      roundNumber: state.roundIndex + 1,
      proposerSeatId: state.proposerSeatId,
      responderSeatId: state.responderSeatId,
      amountToResponder,
      amountToProposer: state.config.potTotal - amountToResponder,
      offerShare: amountToResponder / state.config.potTotal,
      fairnessBand: classifySplitOfferShare(
        amountToResponder / state.config.potTotal,
      ),
      submittedAt: envelope.submittedAt,
    };

    const nextState: SplitPrivateState = {
      ...state,
      phase: "response",
      pendingOffer,
      actionCount: nextSequence,
      seats: state.seats.map((seat) =>
        seat.seatId === envelope.seatId
          ? { ...seat, proposalsMade: seat.proposalsMade + 1 }
          : seat,
      ),
    };

    return {
      nextState,
      events: [
        createSplitEvent(
          nextSequence,
          envelope.action.type,
          nowIso,
          envelope.seatId,
          {
            roundNumber: pendingOffer.roundNumber,
            amountToResponder: pendingOffer.amountToResponder,
            amountToProposer: pendingOffer.amountToProposer,
            offerShare: pendingOffer.offerShare,
          },
          {
            proposerSeatId: pendingOffer.proposerSeatId,
            responderSeatId: pendingOffer.responderSeatId,
          },
        ),
      ],
      isTerminal: false,
    };
  }

  const pendingOffer = state.pendingOffer;
  if (!pendingOffer) {
    throw new Error("Split response requires a pending offer.");
  }

  const decision =
    envelope.action.type === "split.accept" ? "accepted" : "rejected";
  const resolvedRound = buildResolvedRound(pendingOffer, decision, nowIso);
  const completedRoundIndex = state.roundIndex + 1;

  const scoredSeats = state.seats.map((seat) => {
    if (seat.seatId === resolvedRound.proposerSeatId) {
      return {
        ...seat,
        cumulativeScore: seat.cumulativeScore + resolvedRound.proposerDelta,
        [decision === "accepted" ? "acceptedCount" : "rejectedCount"]:
          seat[decision === "accepted" ? "acceptedCount" : "rejectedCount"] + 1,
      };
    }

    if (seat.seatId === resolvedRound.responderSeatId) {
      return {
        ...seat,
        cumulativeScore: seat.cumulativeScore + resolvedRound.responderDelta,
        [decision === "accepted" ? "acceptedCount" : "rejectedCount"]:
          seat[decision === "accepted" ? "acceptedCount" : "rejectedCount"] + 1,
      };
    }

    return seat;
  });

  const resolvedStateBase: SplitPrivateState = {
    ...state,
    seats: scoredSeats,
    history: [...state.history, resolvedRound],
    actionCount: nextSequence,
    completedAt:
      completedRoundIndex >= state.config.maxRounds ? nowIso : state.completedAt,
  };
  const nextState = advanceToNextRound(resolvedStateBase, completedRoundIndex);
  const isTerminal = nextState.phase === "settled";

  const events = [
    createSplitEvent(
      nextSequence,
      envelope.action.type,
      nowIso,
      envelope.seatId,
      {
        roundNumber: resolvedRound.roundNumber,
        decision: resolvedRound.decision,
        proposerDelta: resolvedRound.proposerDelta,
        responderDelta: resolvedRound.responderDelta,
      },
      {
        proposerSeatId: resolvedRound.proposerSeatId,
        responderSeatId: resolvedRound.responderSeatId,
      },
    ),
  ];

  if (isTerminal) {
    events.push(
      createSplitEvent(
        nextSequence + 1,
        "match.settled",
        nowIso,
        undefined,
        {
          winningSeatIds: resolveSplitWinners(nextState),
          seatScores: computeSplitScores(nextState),
        },
      ),
    );
  }

  return {
    nextState,
    events,
    behavioralOutput: [
      {
        metricKey: "split.offer_share",
        value: Number(resolvedRound.offerShare.toFixed(2)),
        unit: "share",
      },
      {
        metricKey: "split.offer_accepted",
        value: resolvedRound.decision === "accepted",
        unit: "boolean",
      },
    ],
    isTerminal,
  };
}

export function isSplitAction(value: unknown): value is SplitAction {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }

  const action = value as { type?: string; amount?: unknown };

  if (action.type === "split.accept" || action.type === "split.reject") {
    return true;
  }

  return action.type === "split.offer" && typeof action.amount === "number";
}

import type {
  BehavioralOutput,
  MatchResult,
  PublicRoomState,
  ReplayEvent,
  SeatAssignment,
  SeatId,
} from "@arena/contracts";

import {
  type SettlementAction,
  type SettlementActionEnvelope,
  type SettlementCommitAction,
  type SettlementPledgeAction,
  type SettlementPrivateState,
  type SettlementPublicState,
  type SettlementRoundConfig,
  type SettlementRoundHistoryView,
  type SettlementRoundPublicView,
  type SettlementRoundState,
  type SettlementSeatPublicView,
  type SettlementSeatState,
  SETTLEMENT_STARTING_SUPPLIES,
  SETTLEMENT_STANCES,
  createSettlementRounds,
} from "./types";

export function createSettlementSeats(seats: SeatAssignment[]): SettlementSeatState[] {
  return seats.map(({ publicSeat }) => ({
    seatId: publicSeat.seatId,
    displayName: publicSeat.displayName,
    avatarId: publicSeat.avatarId,
    suppliesRemaining: SETTLEMENT_STARTING_SUPPLIES,
    prestige: 0,
    honesty: 0,
    pledgedTotal: 0,
    supportGiven: 0,
    brokenPledges: 0,
  }));
}

export function createSettlementRoundState(
  config: SettlementRoundConfig,
  index: number,
): SettlementRoundState {
  return {
    index,
    config,
    phase: index === 0 ? "pledge" : "pending",
    pledges: {},
    commitments: {},
  };
}

export function createSettlementState(
  seed: string,
  seats: SeatAssignment[],
): SettlementPrivateState {
  if (seats.length < 3 || seats.length > 5) {
    throw new Error(`Settlement requires 3-5 seats, received ${seats.length}.`);
  }

  const seatOrder = seats.map((seat) => seat.publicSeat.seatId);

  return {
    seed,
    phase: "pledge",
    seatOrder,
    currentTurnSeatId: seatOrder[0],
    roundIndex: 0,
    rounds: createSettlementRounds(seats.length).map((config, index) =>
      createSettlementRoundState(config, index),
    ),
    seats: createSettlementSeats(seats),
    actionCount: 0,
    stability: 3,
  };
}

export function findSettlementSeat(
  state: SettlementPrivateState,
  seatId: SeatId,
): SettlementSeatState {
  const seat = state.seats.find((candidate) => candidate.seatId === seatId);
  if (!seat) {
    throw new Error(`Unknown settlement seat: ${seatId}`);
  }
  return seat;
}

export function getCurrentRound(state: SettlementPrivateState): SettlementRoundState {
  const round = state.rounds[state.roundIndex];
  if (!round) {
    throw new Error(`Unknown settlement round index: ${state.roundIndex}`);
  }
  return round;
}

export function getNextSeatId(
  state: SettlementPrivateState,
  afterSeatId: SeatId,
): SeatId {
  const currentIndex = state.seatOrder.indexOf(afterSeatId);
  if (currentIndex < 0) {
    throw new Error(`Unknown settlement turn seat: ${afterSeatId}`);
  }

  return state.seatOrder[(currentIndex + 1) % state.seatOrder.length];
}

export function getSeatPledge(round: SettlementRoundState, seatId: SeatId): number {
  return round.pledges[seatId]?.pledge ?? 0;
}

export function getSeatContribution(round: SettlementRoundState, seatId: SeatId): number {
  return round.commitments[seatId] ?? 0;
}

export function isRoundComplete(
  round: SettlementRoundState,
  seatOrder: SeatId[],
  key: "pledges" | "commitments",
): boolean {
  return seatOrder.every((seatId) => {
    const value = round[key][seatId];
    return typeof value !== "undefined";
  });
}

export function replaceRound(
  state: SettlementPrivateState,
  updatedRound: SettlementRoundState,
): SettlementRoundState[] {
  return state.rounds.map((round) =>
    round.index === updatedRound.index ? updatedRound : round,
  );
}

export function validateSettlementAction(
  state: SettlementPrivateState,
  envelope: SettlementActionEnvelope,
): void {
  if (state.phase === "settled") {
    throw new Error("Settlement already settled.");
  }

  if (envelope.seatId !== state.currentTurnSeatId) {
    throw new Error(`It is not seat ${envelope.seatId}'s turn.`);
  }

  const round = getCurrentRound(state);
  const actor = findSettlementSeat(state, envelope.seatId);
  const action = envelope.action;

  if (state.phase === "pledge") {
    if (action.type !== "settlement.pledge") {
      throw new Error("Settlement expects a pledge action in the pledge phase.");
    }

    if (!Number.isInteger(action.pledge)) {
      throw new Error("Settlement pledges must be whole numbers.");
    }

    if (action.pledge < 0 || action.pledge > actor.suppliesRemaining) {
      throw new Error("Settlement pledge must fit within remaining supplies.");
    }

    if (action.pledge > round.config.maxContributionPerSeat) {
      throw new Error(
        `Settlement pledge cannot exceed ${round.config.maxContributionPerSeat}.`,
      );
    }

    if (!SETTLEMENT_STANCES.includes(action.stance)) {
      throw new Error(`Unknown settlement stance: ${String(action.stance)}`);
    }

    return;
  }

  if (action.type !== "settlement.commit") {
    throw new Error("Settlement expects a commit action in the commit phase.");
  }

  if (!Number.isInteger(action.contribution)) {
    throw new Error("Settlement contributions must be whole numbers.");
  }

  if (action.contribution < 0 || action.contribution > actor.suppliesRemaining) {
    throw new Error("Settlement contribution must fit within remaining supplies.");
  }

  if (action.contribution > round.config.maxContributionPerSeat) {
    throw new Error(
      `Settlement contribution cannot exceed ${round.config.maxContributionPerSeat}.`,
    );
  }
}

function createSettlementEvent(
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

function resolveRoundSeatDelta(
  contribution: number,
  pledge: number,
  success: boolean,
): {
  prestigeDelta: number;
  honestyDelta: number;
  brokenPledge: boolean;
} {
  const honoredPledge = contribution >= pledge;
  let prestigeDelta = (success ? 1 : -2) + contribution * (success ? 2 : 1);

  if (honoredPledge) {
    prestigeDelta += 1;
  } else {
    prestigeDelta -= 2;
  }

  if (success && contribution === 0) {
    prestigeDelta -= 1;
  }

  return {
    prestigeDelta,
    honestyDelta: honoredPledge ? 1 : -1,
    brokenPledge: !honoredPledge,
  };
}

export function resolveSettlementRound(
  state: SettlementPrivateState,
  round: SettlementRoundState,
  nowIso: string,
): SettlementPrivateState {
  const totalContribution = state.seatOrder.reduce(
    (total, seatId) => total + getSeatContribution(round, seatId),
    0,
  );
  const success = totalContribution >= round.config.threshold;
  const resolvedRound: SettlementRoundState = {
    ...round,
    phase: "resolved",
    totalContribution,
    success,
    gap: Math.max(0, round.config.threshold - totalContribution),
    resolvedAt: nowIso,
  };

  const nextSeats = state.seats.map((seat) => {
    const pledge = getSeatPledge(resolvedRound, seat.seatId);
    const contribution = getSeatContribution(resolvedRound, seat.seatId);
    const delta = resolveRoundSeatDelta(contribution, pledge, success);

    return {
      ...seat,
      prestige: seat.prestige + delta.prestigeDelta,
      honesty: seat.honesty + delta.honestyDelta,
      brokenPledges: delta.brokenPledge ? seat.brokenPledges + 1 : seat.brokenPledges,
    };
  });

  const rounds = replaceRound(state, resolvedRound);
  const nextRoundIndex = state.roundIndex + 1;
  const matchComplete = nextRoundIndex >= rounds.length;

  if (matchComplete) {
    return {
      ...state,
      phase: "settled",
      rounds,
      seats: nextSeats,
      stability: state.stability + (success ? 1 : -1),
      finishedAt: nowIso,
    };
  }

  const stagedRounds: SettlementRoundState[] = rounds.map((candidate) =>
    candidate.index === nextRoundIndex
      ? {
          ...candidate,
          phase: "pledge",
        }
      : candidate,
  );

  return {
    ...state,
    phase: "pledge",
    roundIndex: nextRoundIndex,
    rounds: stagedRounds,
    seats: nextSeats,
    currentTurnSeatId: state.seatOrder[0],
    stability: state.stability + (success ? 1 : -1),
  };
}

function projectRoundHistory(rounds: SettlementRoundState[]): SettlementRoundHistoryView[] {
  return rounds
    .filter((round) => round.phase === "resolved")
    .map((round) => ({
      index: round.index,
      title: round.config.title,
      totalContribution: round.totalContribution ?? 0,
      threshold: round.config.threshold,
      success: Boolean(round.success),
      scarcity: round.config.scarcity,
    }));
}

function projectCurrentRound(
  state: SettlementPrivateState,
  viewerSeatId?: SeatId,
): SettlementRoundPublicView {
  const round = getCurrentRound(state);
  const publicPhase: SettlementRoundPublicView["phase"] =
    state.phase === "settled"
      ? "resolved"
      : round.phase === "pending"
        ? "pledge"
        : round.phase;

  return {
    index: round.index,
    title: round.config.title,
    summary: round.config.summary,
    scarcity: round.config.scarcity,
    threshold: round.config.threshold,
    phase: publicPhase,
    pledges: state.seatOrder.map((seatId) => {
      const seat = findSettlementSeat(state, seatId);
      const pledge = round.pledges[seatId];

      return {
        seatId,
        displayName: seat.displayName,
        pledge: pledge?.pledge,
        stance: pledge?.stance,
      };
    }),
    lockedSeatIds: state.seatOrder.filter(
      (seatId) => typeof round.commitments[seatId] !== "undefined",
    ),
    revealedContributions:
      round.phase === "resolved"
        ? state.seatOrder.reduce<Partial<Record<SeatId, number>>>((accumulator, seatId) => {
            accumulator[seatId] = getSeatContribution(round, seatId);
            return accumulator;
          }, {})
        : {},
    totalContribution: round.phase === "resolved" ? round.totalContribution : undefined,
    viewerPendingContribution:
      viewerSeatId && round.phase === "commit"
        ? round.commitments[viewerSeatId]
        : undefined,
    outcome:
      round.phase === "resolved"
        ? {
            success: Boolean(round.success),
            totalContribution: round.totalContribution ?? 0,
            threshold: round.config.threshold,
            gap: round.gap ?? 0,
            resolvedAt: round.resolvedAt,
          }
        : undefined,
  };
}

function projectSeatPublicView(
  state: SettlementPrivateState,
  viewerSeatId: SeatId | undefined,
  seat: SettlementSeatState,
): SettlementSeatPublicView {
  const round = getCurrentRound(state);
  const currentContribution =
    round.phase === "commit" ? round.commitments[seat.seatId] ?? 0 : 0;
  const currentPledge = round.pledges[seat.seatId];
  const visibleSuppliesRemaining =
    state.phase === "commit" ? seat.suppliesRemaining + currentContribution : seat.suppliesRemaining;

  return {
    seatId: seat.seatId,
    displayName: seat.displayName,
    avatarId: seat.avatarId,
    isConnected: true,
    isReady: true,
    score: seat.prestige,
    visibleSuppliesRemaining,
    prestige: seat.prestige,
    honesty: seat.honesty,
    pledgedThisRound: currentPledge?.pledge,
    stanceThisRound: currentPledge?.stance,
    hasCommittedThisRound: typeof round.commitments[seat.seatId] !== "undefined",
    revealedContribution:
      round.phase === "resolved" ? round.commitments[seat.seatId] : undefined,
    viewerPendingContribution:
      viewerSeatId === seat.seatId && round.phase === "commit"
        ? round.commitments[seat.seatId]
        : undefined,
  };
}

export function projectSettlementPublicState(
  state: SettlementPrivateState,
  viewerSeatId?: SeatId,
): SettlementPublicState {
  const seatScores = computeSettlementScores(state);
  const winnerSeatIds =
    state.phase === "settled" ? resolveSettlementWinners(state) : undefined;

  return {
    phase: state.phase,
    totalRounds: state.rounds.length,
    roundIndex: state.roundIndex,
    currentTurnSeatId: state.phase === "settled" ? undefined : state.currentTurnSeatId,
    actionCount: state.actionCount,
    stability: state.stability,
    viewerCanAct: Boolean(
      viewerSeatId &&
        state.phase !== "settled" &&
        state.currentTurnSeatId === viewerSeatId,
    ),
    currentRound: projectCurrentRound(state, viewerSeatId),
    history: projectRoundHistory(state.rounds),
    seats: state.seats.map((seat) => ({
      ...projectSeatPublicView(state, viewerSeatId, seat),
      score: state.phase === "settled" ? seatScores[seat.seatId] : seat.prestige,
    })),
    winnerSeatIds,
  };
}

export function applySettlementAction(
  state: SettlementPrivateState,
  envelope: SettlementActionEnvelope,
  nowIso: string,
): {
  nextState: SettlementPrivateState;
  events: ReplayEvent[];
  isTerminal: boolean;
} {
  validateSettlementAction(state, envelope);

  const round = getCurrentRound(state);
  const actionCount = state.actionCount + 1;

  if (state.phase === "pledge") {
    const action = envelope.action as SettlementPledgeAction;
    const updatedRound: SettlementRoundState = {
      ...round,
      phase: isRoundComplete(
        {
          ...round,
          pledges: {
            ...round.pledges,
            [envelope.seatId]: {
              seatId: envelope.seatId,
              pledge: action.pledge,
              stance: action.stance,
            },
          },
        },
        state.seatOrder,
        "pledges",
      )
        ? "commit"
        : "pledge",
      pledges: {
        ...round.pledges,
        [envelope.seatId]: {
          seatId: envelope.seatId,
          pledge: action.pledge,
          stance: action.stance,
        },
      },
    };

    const updatedSeats = state.seats.map((seat) =>
      seat.seatId === envelope.seatId
        ? {
            ...seat,
            pledgedTotal: seat.pledgedTotal + action.pledge,
          }
        : seat,
    );

    const allPledged = isRoundComplete(updatedRound, state.seatOrder, "pledges");
    const nextState: SettlementPrivateState = {
      ...state,
      phase: allPledged ? "commit" : "pledge",
      rounds: replaceRound(state, updatedRound),
      seats: updatedSeats,
      actionCount,
      currentTurnSeatId: allPledged
        ? state.seatOrder[0]
        : getNextSeatId(state, envelope.seatId),
    };

    return {
      nextState,
      events: [
        createSettlementEvent(
          actionCount,
          action.type,
          nowIso,
          envelope.seatId,
          {
            actorSeatId: envelope.seatId,
            roundIndex: state.roundIndex,
            pledge: action.pledge,
            stance: action.stance,
          },
        ),
      ],
      isTerminal: false,
    };
  }

  const action = envelope.action as SettlementCommitAction;
  const updatedRound: SettlementRoundState = {
    ...round,
    commitments: {
      ...round.commitments,
      [envelope.seatId]: action.contribution,
    },
  };
  const updatedSeats: SettlementSeatState[] = state.seats.map((seat) =>
    seat.seatId === envelope.seatId
      ? {
          ...seat,
          suppliesRemaining: seat.suppliesRemaining - action.contribution,
          supportGiven: seat.supportGiven + action.contribution,
        }
      : seat,
  );
  const intermediateState: SettlementPrivateState = {
    ...state,
    rounds: replaceRound(state, updatedRound),
    seats: updatedSeats,
    actionCount,
    currentTurnSeatId: getNextSeatId(state, envelope.seatId),
  };
  const allCommitted = isRoundComplete(updatedRound, state.seatOrder, "commitments");
  const nextState: SettlementPrivateState = allCommitted
    ? resolveSettlementRound(
        {
          ...intermediateState,
          currentTurnSeatId: envelope.seatId,
        },
        {
          ...updatedRound,
          phase: "resolved",
        },
        nowIso,
      )
    : {
        ...intermediateState,
        phase: "commit",
      };
  const events = [
    createSettlementEvent(
      actionCount,
      action.type,
      nowIso,
      envelope.seatId,
      {
        actorSeatId: envelope.seatId,
        roundIndex: state.roundIndex,
        commitmentLocked: true,
      },
      {
        contribution: action.contribution,
      },
    ),
  ];

  if (allCommitted) {
    const resolvedRound = nextState.rounds[state.roundIndex];
    events.push(
      createSettlementEvent(
        actionCount + 1,
        "settlement.round_resolved",
        nowIso,
        undefined,
        {
          roundIndex: state.roundIndex,
          title: resolvedRound?.config.title,
          success: resolvedRound?.success,
          threshold: resolvedRound?.config.threshold,
          totalContribution: resolvedRound?.totalContribution,
          contributions: state.seatOrder.reduce<Record<SeatId, number>>((accumulator, seatId) => {
            accumulator[seatId] = resolvedRound?.commitments[seatId] ?? 0;
            return accumulator;
          }, {}),
        },
      ),
    );
  }

  return {
    nextState,
    events,
    isTerminal: nextState.phase === "settled",
  };
}

export function computeSettlementScores(
  state: SettlementPrivateState,
): Record<SeatId, number> {
  const scores: Record<SeatId, number> = {};

  for (const seat of state.seats) {
    scores[seat.seatId] = seat.prestige + seat.suppliesRemaining;
  }

  return scores;
}

export function resolveSettlementWinners(state: SettlementPrivateState): SeatId[] {
  const scores = computeSettlementScores(state);
  const topScore = Math.max(...Object.values(scores));

  return state.seatOrder.filter((seatId) => scores[seatId] === topScore);
}

export function summarizeSettlementBehavior(
  state: SettlementPrivateState,
): BehavioralOutput[] {
  const resolvedRounds = state.rounds.filter((round) => round.phase === "resolved");
  const totalPledges = state.seats.reduce((total, seat) => total + seat.pledgedTotal, 0);
  const totalSupport = state.seats.reduce((total, seat) => total + seat.supportGiven, 0);

  return [
    {
      metricKey: "settlement.rounds_completed",
      value: resolvedRounds.length,
      unit: "count",
    },
    {
      metricKey: "settlement.successful_rounds",
      value: resolvedRounds.filter((round) => round.success).length,
      unit: "count",
    },
    {
      metricKey: "settlement.final_stability",
      value: state.stability,
      unit: "points",
    },
    {
      metricKey: "settlement.total_support",
      value: totalSupport,
      unit: "supplies",
    },
    {
      metricKey: "settlement.broken_pledges",
      value: state.seats.reduce((total, seat) => total + seat.brokenPledges, 0),
      unit: "count",
    },
    {
      metricKey: "settlement.total_pledged",
      value: totalPledges,
      unit: "supplies",
    },
    {
      metricKey: "settlement.support_minus_pledge",
      value: totalSupport - totalPledges,
      unit: "net",
    },
  ];
}

export function buildSettlementMatchResult(
  state: SettlementPrivateState,
  roomState: PublicRoomState<SettlementPublicState>,
): MatchResult {
  return {
    matchId: roomState.matchId,
    game: "settlement",
    roomId: roomState.roomId,
    completedAt: state.finishedAt ?? roomState.lastEventAt,
    winningSeatIds: resolveSettlementWinners(state),
    seatScores: computeSettlementScores(state),
    behavioralOutput: summarizeSettlementBehavior(state),
  };
}

export function isSettlementAction(value: unknown): value is SettlementAction {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }

  const action = value as {
    type?: string;
    pledge?: unknown;
    stance?: unknown;
    contribution?: unknown;
  };

  if (action.type === "settlement.pledge") {
    return typeof action.pledge === "number" && typeof action.stance === "string";
  }

  return action.type === "settlement.commit" && typeof action.contribution === "number";
}

export function coerceSettlementToTerminal(
  state: SettlementPrivateState,
  nowIso: string,
): SettlementPrivateState {
  let currentState = state;
  let currentTime = nowIso;

  while (currentState.phase !== "settled") {
    const action =
      currentState.phase === "pledge"
        ? {
            type: "settlement.pledge" as const,
            pledge: 0,
            stance: "appease" as const,
          }
        : {
            type: "settlement.commit" as const,
            contribution: 0,
          };

    currentState = applySettlementAction(
      currentState,
      {
        seatId: currentState.currentTurnSeatId,
        submittedAt: currentTime,
        action,
      },
      currentTime,
    ).nextState;

    currentTime = new Date(Date.parse(currentTime) + 1_000).toISOString();
  }

  return currentState;
}

export function finalizeSettlementMatch(
  state: SettlementPrivateState,
  publicState: PublicRoomState<SettlementPublicState>,
): MatchResult {
  const settledState =
    state.phase === "settled"
      ? state
      : coerceSettlementToTerminal(state, publicState.lastEventAt);

  return buildSettlementMatchResult(settledState, publicState);
}

import type {
  BehavioralOutput,
  MatchResult,
  PublicRoomState,
  ReplayEvent,
  SeatAssignment,
  SeatId,
} from "@arena/contracts";

import {
  type VaultAction,
  type VaultActionEnvelope,
  type VaultPrivateState,
  type VaultPublicRoundSummary,
  type VaultPublicState,
  type VaultResolvedRound,
  type VaultRoundState,
  type VaultSeatPublicView,
  type VaultSeatState,
  createBlankRound,
  createVaultConfig,
  createVaultSeats,
} from "./types";

function createSeatRecord<TValue>(
  seatOrder: SeatId[],
  createValue: (seatId: SeatId) => TValue,
): Record<SeatId, TValue> {
  return Object.fromEntries(
    seatOrder.map((seatId) => [seatId, createValue(seatId)]),
  ) as Record<SeatId, TValue>;
}

function countFilled<TValue>(record: Partial<Record<SeatId, TValue>>): number {
  return Object.keys(record).length;
}

function sortSeatIdsBySeatOrder(seatOrder: SeatId[], seatIds: SeatId[]): SeatId[] {
  return [...seatIds].sort(
    (left, right) => seatOrder.indexOf(left) - seatOrder.indexOf(right),
  );
}

function toRoundSummary(round: VaultResolvedRound): VaultPublicRoundSummary {
  return {
    roundNumber: round.roundNumber,
    vaultTotal: round.vaultTotal,
    multipliedTotal: round.multipliedTotal,
    perSeatReturn: round.perSeatReturn,
    lowestContribution: round.lowestContribution,
    lowestSeatIds: [...round.lowestSeatIds],
    voteTally: { ...round.voteTally },
    correctAccuserSeatIds: [...round.correctAccuserSeatIds],
    penalizedSeatIds: [...round.penalizedSeatIds],
    scoreDeltas: { ...round.scoreDeltas },
  };
}

export function createVaultState(
  seed: string,
  seats: SeatAssignment[],
): VaultPrivateState {
  if (seats.length < 4 || seats.length > 6) {
    throw new Error(`Vault requires 4-6 seats, received ${seats.length}.`);
  }

  const seatOrder = seats.map((seat) => seat.publicSeat.seatId);

  return {
    seed,
    config: createVaultConfig(seats.length),
    phase: "contribution_window",
    seatOrder,
    seats: createVaultSeats(seats),
    roundNumber: 1,
    actionCount: 0,
    currentRound: createBlankRound(1),
    completedRounds: [],
  };
}

export function findVaultSeat(
  state: VaultPrivateState,
  seatId: SeatId,
): VaultSeatState {
  const seat = state.seats.find((candidate) => candidate.seatId === seatId);
  if (!seat) {
    throw new Error(`Unknown vault seat: ${seatId}`);
  }
  return seat;
}

export function hasContributionFromSeat(
  round: VaultRoundState,
  seatId: SeatId,
): boolean {
  return typeof round.contributions[seatId] === "number";
}

export function hasAccusationFromSeat(
  round: VaultRoundState,
  seatId: SeatId,
): boolean {
  return typeof round.accusations[seatId] === "string";
}

export function projectVaultPublicState(
  state: VaultPrivateState,
  viewerSeatId?: SeatId,
): VaultPublicState {
  const viewer =
    viewerSeatId && state.seatOrder.includes(viewerSeatId)
      ? {
          seatId: viewerSeatId,
          canAct:
            state.phase !== "match_complete" &&
            (state.phase === "contribution_window"
              ? !hasContributionFromSeat(state.currentRound, viewerSeatId)
              : !hasAccusationFromSeat(state.currentRound, viewerSeatId)),
          ownContribution: state.currentRound.contributions[viewerSeatId],
          ownAccusationTargetSeatId: state.currentRound.accusations[viewerSeatId],
          hasSubmittedContribution: hasContributionFromSeat(state.currentRound, viewerSeatId),
          hasSubmittedAccusation: hasAccusationFromSeat(state.currentRound, viewerSeatId),
        }
      : null;

  const recentRounds = state.completedRounds.slice(-3).map(toRoundSummary);

  return {
    phase: state.phase,
    roundNumber: state.roundNumber,
    totalRounds: state.config.rounds,
    endowmentPerRound: state.config.endowmentPerRound,
    multiplier: state.config.multiplier,
    contributionRange: {
      min: 0,
      max: state.config.endowmentPerRound,
    },
    contributionStatus: {
      submitted: countFilled(state.currentRound.contributions),
      total: state.seatOrder.length,
    },
    accusationStatus: {
      submitted: countFilled(state.currentRound.accusations),
      total: state.seatOrder.length,
    },
    vaultTotal: state.currentRound.vaultTotal,
    multipliedTotal: state.currentRound.multipliedTotal,
    perSeatReturn: state.currentRound.perSeatReturn,
    lastResolvedRound: state.completedRounds.at(-1)
      ? toRoundSummary(state.completedRounds.at(-1) as VaultResolvedRound)
      : undefined,
    recentRounds,
    viewer,
    seats: state.seats.map<VaultSeatPublicView>((seat) => ({
      seatId: seat.seatId,
      displayName: seat.displayName,
      avatarId: seat.avatarId,
      isConnected: true,
      isReady: true,
      score: seat.totalScore,
      totalScore: seat.totalScore,
      roundsPlayed: seat.contributionHistory.length,
      correctDetections: seat.correctDetections,
      timesFlagged: seat.timesFlagged,
    })),
  };
}

export function validateVaultAction(
  state: VaultPrivateState,
  envelope: VaultActionEnvelope,
): void {
  findVaultSeat(state, envelope.seatId);

  if (state.phase === "match_complete") {
    throw new Error("Vault match is already complete.");
  }

  const action = envelope.action;

  if (state.phase === "contribution_window") {
    if (action.type !== "vault.contribute") {
      throw new Error("Vault is waiting for contributions.");
    }

    if (!Number.isInteger(action.amount)) {
      throw new Error("Vault contributions must be integer values.");
    }

    if (action.amount < 0 || action.amount > state.config.endowmentPerRound) {
      throw new Error(
        `Vault contributions must be between 0 and ${state.config.endowmentPerRound}.`,
      );
    }

    if (hasContributionFromSeat(state.currentRound, envelope.seatId)) {
      throw new Error(`Seat ${envelope.seatId} already submitted a contribution this round.`);
    }

    return;
  }

  if (action.type !== "vault.accuse") {
    throw new Error("Vault is waiting for accusations.");
  }

  if (action.targetSeatId === envelope.seatId) {
    throw new Error("Vault accusations must target another seat.");
  }

  findVaultSeat(state, action.targetSeatId);

  if (hasAccusationFromSeat(state.currentRound, envelope.seatId)) {
    throw new Error(`Seat ${envelope.seatId} already submitted an accusation this round.`);
  }
}

function createVaultEvent(
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

function resolveVoteTally(
  seatOrder: SeatId[],
  accusations: Record<SeatId, SeatId>,
): Partial<Record<SeatId, number>> {
  const tally = createSeatRecord(seatOrder, () => 0);

  for (const targetSeatId of Object.values(accusations)) {
    tally[targetSeatId] += 1;
  }

  return Object.fromEntries(
    seatOrder
      .filter((seatId) => tally[seatId] > 0)
      .map((seatId) => [seatId, tally[seatId]]),
  );
}

function resolveRound(
  state: VaultPrivateState,
  nowIso: string,
): VaultResolvedRound {
  const contributions = createSeatRecord(
    state.seatOrder,
    (seatId) => state.currentRound.contributions[seatId] ?? 0,
  );
  const accusations = createSeatRecord(
    state.seatOrder,
    (seatId) => state.currentRound.accusations[seatId] ?? state.seatOrder[0],
  );
  const contributionValues = Object.values(contributions);
  const lowestContribution = Math.min(...contributionValues);
  const lowestSeatIds = sortSeatIdsBySeatOrder(
    state.seatOrder,
    state.seatOrder.filter((seatId) => contributions[seatId] === lowestContribution),
  );
  const voteTally = resolveVoteTally(state.seatOrder, accusations);
  const correctAccuserSeatIds = sortSeatIdsBySeatOrder(
    state.seatOrder,
    state.seatOrder.filter((seatId) => lowestSeatIds.includes(accusations[seatId])),
  );
  const penalizedSeatIds = sortSeatIdsBySeatOrder(
    state.seatOrder,
    lowestSeatIds.filter((seatId) => (voteTally[seatId] ?? 0) > 0),
  );
  const vaultTotal = contributionValues.reduce((sum, value) => sum + value, 0);
  const multipliedTotal = vaultTotal * state.config.multiplier;
  const perSeatReturn = multipliedTotal / state.seatOrder.length;
  const scoreDeltas = createSeatRecord(state.seatOrder, (seatId) => {
    const kept = state.config.endowmentPerRound - contributions[seatId];
    const correctBonus = correctAccuserSeatIds.includes(seatId)
      ? state.config.correctAccusationBonus
      : 0;
    const detectedPenalty = penalizedSeatIds.includes(seatId)
      ? state.config.detectedFreeRiderPenalty
      : 0;
    return kept + perSeatReturn + correctBonus - detectedPenalty;
  });

  return {
    roundNumber: state.roundNumber,
    vaultTotal,
    multipliedTotal,
    perSeatReturn,
    lowestContribution,
    lowestSeatIds,
    voteTally,
    correctAccuserSeatIds,
    penalizedSeatIds,
    scoreDeltas,
    accusations,
    contributions,
    resolvedAt: nowIso,
  };
}

function applyResolvedRound(
  state: VaultPrivateState,
  round: VaultResolvedRound,
  nowIso: string,
): VaultPrivateState {
  const updatedSeats = state.seats.map((seat) => ({
    ...seat,
    totalScore: seat.totalScore + round.scoreDeltas[seat.seatId],
    contributionHistory: [...seat.contributionHistory, round.contributions[seat.seatId]],
    accusationHistory: [...seat.accusationHistory, round.accusations[seat.seatId]],
    correctDetections:
      seat.correctDetections + (round.correctAccuserSeatIds.includes(seat.seatId) ? 1 : 0),
    timesFlagged:
      seat.timesFlagged + (round.penalizedSeatIds.includes(seat.seatId) ? 1 : 0),
  }));
  const completedRounds = [...state.completedRounds, round];
  const hasCompletedMatch = completedRounds.length >= state.config.rounds;

  return {
    ...state,
    seats: updatedSeats,
    completedRounds,
    roundNumber: hasCompletedMatch ? state.roundNumber : state.roundNumber + 1,
    phase: hasCompletedMatch ? "match_complete" : "contribution_window",
    currentRound: hasCompletedMatch
      ? {
          roundNumber: state.roundNumber,
          contributions: { ...round.contributions },
          accusations: { ...round.accusations },
          vaultTotal: round.vaultTotal,
          multipliedTotal: round.multipliedTotal,
          perSeatReturn: round.perSeatReturn,
        }
      : createBlankRound(state.roundNumber + 1),
    settledAt: hasCompletedMatch ? nowIso : state.settledAt,
  };
}

function summarizeVaultBehavior(state: VaultPrivateState): BehavioralOutput[] {
  const resolvedRounds = state.completedRounds;
  const roundCount = resolvedRounds.length;
  const allContributions = resolvedRounds.flatMap((round) =>
    Object.values(round.contributions),
  );
  const totalAccusations = resolvedRounds.reduce(
    (sum, round) => sum + Object.keys(round.accusations).length,
    0,
  );
  const totalCorrectDetections = resolvedRounds.reduce(
    (sum, round) => sum + round.correctAccuserSeatIds.length,
    0,
  );
  const totalPenalties = resolvedRounds.reduce(
    (sum, round) => sum + round.penalizedSeatIds.length,
    0,
  );
  const totalPool = resolvedRounds.reduce((sum, round) => sum + round.vaultTotal, 0);

  return [
    { metricKey: "vault.rounds_completed", value: roundCount, unit: "rounds" },
    {
      metricKey: "vault.average_contribution",
      value: allContributions.length === 0
        ? 0
        : Number(
            (
              allContributions.reduce((sum, value) => sum + value, 0) /
              allContributions.length
            ).toFixed(2),
          ),
      unit: "credits",
    },
    {
      metricKey: "vault.average_pool_total",
      value: roundCount === 0 ? 0 : Number((totalPool / roundCount).toFixed(2)),
      unit: "credits",
    },
    {
      metricKey: "vault.correct_detections",
      value: totalCorrectDetections,
      unit: "count",
    },
    {
      metricKey: "vault.detection_accuracy",
      value:
        totalAccusations === 0
          ? 0
          : Number((totalCorrectDetections / totalAccusations).toFixed(3)),
      unit: "ratio",
    },
    {
      metricKey: "vault.penalties_applied",
      value: totalPenalties,
      unit: "count",
    },
  ];
}

function computeVaultScores(state: VaultPrivateState): Record<SeatId, number> {
  return Object.fromEntries(
    state.seats.map((seat) => [seat.seatId, seat.totalScore]),
  ) as Record<SeatId, number>;
}

export function applyVaultAction(
  state: VaultPrivateState,
  envelope: VaultActionEnvelope,
  nowIso: string,
): {
  nextState: VaultPrivateState;
  events: ReplayEvent[];
  behavioralOutput?: BehavioralOutput[];
  isTerminal: boolean;
} {
  validateVaultAction(state, envelope);

  const nextActionCount = state.actionCount + 1;

  if (state.phase === "contribution_window") {
    if (envelope.action.type !== "vault.contribute") {
      throw new Error("Vault is waiting for contribution actions.");
    }

    const contributionAction = envelope.action;
    const nextRound: VaultRoundState = {
      ...state.currentRound,
      contributions: {
        ...state.currentRound.contributions,
        [envelope.seatId]: contributionAction.amount,
      },
    };

    const allSubmitted = countFilled(nextRound.contributions) === state.seatOrder.length;
    const vaultTotal = allSubmitted
      ? Object.values(nextRound.contributions).reduce(
          (sum: number, value) => sum + (value ?? 0),
          0,
        )
      : undefined;
    const multipliedTotal =
      typeof vaultTotal === "number" ? vaultTotal * state.config.multiplier : undefined;
    const perSeatReturn =
      typeof multipliedTotal === "number" ? multipliedTotal / state.seatOrder.length : undefined;
    const nextState: VaultPrivateState = {
      ...state,
      phase: allSubmitted ? "accusation_window" : "contribution_window",
      actionCount: nextActionCount,
      currentRound: {
        ...nextRound,
        vaultTotal,
        multipliedTotal,
        perSeatReturn,
      },
    };
    const events = [
      createVaultEvent(
        nextActionCount,
        "vault.contribution_submitted",
        nowIso,
        envelope.seatId,
        {
          roundNumber: state.roundNumber,
          actorSeatId: envelope.seatId,
          submittedContributionCount: countFilled(nextRound.contributions),
        },
        {
          contributionAmount: contributionAction.amount,
          contributions: { ...nextRound.contributions },
        },
      ),
    ];

    if (allSubmitted) {
      events.push(
        createVaultEvent(
          nextActionCount + 1,
          "vault.pool_revealed",
          nowIso,
          undefined,
          {
            roundNumber: state.roundNumber,
            vaultTotal,
            multipliedTotal,
            perSeatReturn,
          },
          {
            contributions: { ...nextRound.contributions },
          },
        ),
      );
    }

    return {
      nextState,
      events,
      isTerminal: false,
    };
  }

  if (envelope.action.type !== "vault.accuse") {
    throw new Error("Vault is waiting for accusation actions.");
  }

  const accusationAction = envelope.action;
  const nextRound: VaultRoundState = {
    ...state.currentRound,
    accusations: {
      ...state.currentRound.accusations,
      [envelope.seatId]: accusationAction.targetSeatId,
    },
  };
  const allSubmitted = countFilled(nextRound.accusations) === state.seatOrder.length;
  let nextState: VaultPrivateState = {
    ...state,
    actionCount: nextActionCount,
    currentRound: nextRound,
  };
  let resolvedRound: VaultResolvedRound | undefined;

  if (allSubmitted) {
    resolvedRound = resolveRound(
      {
        ...state,
        currentRound: nextRound,
      },
      nowIso,
    );
    nextState = applyResolvedRound(
      {
        ...state,
        actionCount: nextActionCount,
        currentRound: nextRound,
      },
      resolvedRound,
      nowIso,
    );
  }

  const events = [
    createVaultEvent(
      nextActionCount,
      "vault.accusation_submitted",
      nowIso,
      envelope.seatId,
      {
        roundNumber: state.roundNumber,
        actorSeatId: envelope.seatId,
        submittedAccusationCount: countFilled(nextRound.accusations),
      },
      {
        targetSeatId: accusationAction.targetSeatId,
        accusations: { ...nextRound.accusations },
      },
    ),
  ];

  if (resolvedRound) {
    events.push(
      createVaultEvent(
        nextActionCount + 1,
        "vault.round_resolved",
        nowIso,
        undefined,
        {
          roundNumber: resolvedRound.roundNumber,
          vaultTotal: resolvedRound.vaultTotal,
          multipliedTotal: resolvedRound.multipliedTotal,
          perSeatReturn: resolvedRound.perSeatReturn,
          lowestContribution: resolvedRound.lowestContribution,
          lowestSeatIds: resolvedRound.lowestSeatIds,
          voteTally: resolvedRound.voteTally,
          correctAccuserSeatIds: resolvedRound.correctAccuserSeatIds,
          penalizedSeatIds: resolvedRound.penalizedSeatIds,
          scoreDeltas: resolvedRound.scoreDeltas,
        },
        {
          contributions: resolvedRound.contributions,
          accusations: resolvedRound.accusations,
        },
      ),
    );

    if (nextState.phase === "match_complete") {
      events.push(
        createVaultEvent(
          nextActionCount + 2,
          "match.completed",
          nowIso,
          undefined,
          {
            roundsCompleted: nextState.completedRounds.length,
            seatScores: computeVaultScores(nextState),
          },
        ),
      );
    }
  }

  return {
    nextState,
    events,
    behavioralOutput:
      nextState.phase === "match_complete" ? summarizeVaultBehavior(nextState) : undefined,
    isTerminal: nextState.phase === "match_complete",
  };
}

export function finalizeVaultMatch(
  state: VaultPrivateState,
  roomState: PublicRoomState<VaultPublicState>,
): MatchResult {
  const seatScores = computeVaultScores(state);
  const topScore = Math.max(...Object.values(seatScores));
  const winningSeatIds = sortSeatIdsBySeatOrder(
    state.seatOrder,
    Object.keys(seatScores).filter((seatId) => seatScores[seatId] === topScore),
  );

  return {
    matchId: roomState.matchId,
    game: "vault",
    roomId: roomState.roomId,
    completedAt: state.settledAt ?? roomState.lastEventAt,
    winningSeatIds,
    seatScores,
    behavioralOutput: summarizeVaultBehavior(state),
  };
}

export function isVaultAction(value: unknown): value is VaultAction {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }

  const action = value as {
    type?: string;
    amount?: unknown;
    targetSeatId?: unknown;
  };

  if (action.type === "vault.contribute") {
    return typeof action.amount === "number";
  }

  return action.type === "vault.accuse" && typeof action.targetSeatId === "string";
}

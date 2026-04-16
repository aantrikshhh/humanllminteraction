import type {
  BehavioralOutput,
  MatchResult,
  PublicRoomState,
  ReplayEvent,
  SeatAssignment,
  SeatId,
} from "@arena/contracts";

import type {
  PactActionEnvelope,
  PactChoice,
  PactOutcomeCode,
  PactPrivateState,
  PactPublicState,
  PactResolvedRound,
  PactStrategySummary,
} from "./types";

import { PACT_TOTAL_ROUNDS } from "./types";

export const PACT_PAYOFF_MATRIX: Record<
  PactOutcomeCode,
  {
    seatA: number;
    seatB: number;
    label: string;
  }
> = {
  CC: { seatA: 300, seatB: 300, label: "Mutual cooperation" },
  CB: { seatA: 0, seatB: 500, label: "Seat B exploits Seat A" },
  BC: { seatA: 500, seatB: 0, label: "Seat A exploits Seat B" },
  BB: { seatA: 100, seatB: 100, label: "Mutual betrayal" },
};

function assertTwoSeats(seats: SeatAssignment[]): asserts seats is [SeatAssignment, SeatAssignment] {
  if (seats.length !== 2) {
    throw new Error(`Pact requires exactly 2 seats, received ${seats.length}.`);
  }
}

function assertSeatBelongsToMatch(state: PactPrivateState, seatId: SeatId): void {
  if (!state.seatOrder.includes(seatId)) {
    throw new Error(`Seat ${seatId} is not part of this Pact match.`);
  }
}

function resolveOutcomeCode(seatAChoice: PactChoice, seatBChoice: PactChoice): PactOutcomeCode {
  if (seatAChoice === "cooperate" && seatBChoice === "cooperate") {
    return "CC";
  }

  if (seatAChoice === "cooperate" && seatBChoice === "betray") {
    return "CB";
  }

  if (seatAChoice === "betray" && seatBChoice === "cooperate") {
    return "BC";
  }

  return "BB";
}

function roundMetricValue(choice: PactChoice): number {
  return choice === "cooperate" ? 1 : 0;
}

function buildStrategySummary(state: PactPrivateState): PactStrategySummary[] {
  const tailRounds = Math.min(3, state.history.length);

  return state.seatOrder.map((seatId, seatIndex) => {
    const opponentSeatId = state.seatOrder[1 - seatIndex];
    const choices = state.history.map((round) => round.choices[seatId]);
    const opponentChoices = state.history.map((round) => round.choices[opponentSeatId]);
    const cooperationCount = choices.filter((choice) => choice === "cooperate").length;
    const cooperationRate = state.history.length === 0 ? 0 : cooperationCount / state.history.length;

    let forgivenessOpportunities = 0;
    let forgivenessCount = 0;
    let retaliationCount = 0;

    for (let index = 1; index < state.history.length; index += 1) {
      if (opponentChoices[index - 1] === "betray") {
        forgivenessOpportunities += 1;
        if (choices[index] === "cooperate") {
          forgivenessCount += 1;
        }
        if (choices[index] === "betray") {
          retaliationCount += 1;
        }
      }
    }

    const forgivenessRate =
      forgivenessOpportunities === 0 ? null : forgivenessCount / forgivenessOpportunities;
    const retaliationRate =
      forgivenessOpportunities === 0 ? null : retaliationCount / forgivenessOpportunities;

    const endgameChoices = tailRounds === 0 ? [] : choices.slice(-tailRounds);
    const endgameBetrayalRate =
      endgameChoices.length === 0
        ? 0
        : endgameChoices.filter((choice) => choice === "betray").length / endgameChoices.length;

    const label = classifyStrategy(choices, opponentChoices, cooperationRate, endgameBetrayalRate);

    return {
      seatId,
      label,
      cooperationRate,
      forgivenessRate,
      retaliationRate,
      endgameBetrayalRate,
    };
  });
}

function classifyStrategy(
  choices: PactChoice[],
  opponentChoices: PactChoice[],
  cooperationRate: number,
  endgameBetrayalRate: number,
): PactStrategySummary["label"] {
  if (choices.length > 0 && choices.every((choice) => choice === "cooperate")) {
    return "always_cooperate";
  }

  if (choices.length > 0 && choices.every((choice) => choice === "betray")) {
    return "always_betray";
  }

  const isTitForTat =
    choices.length > 0 &&
    choices[0] === "cooperate" &&
    choices.slice(1).every((choice, index) => choice === opponentChoices[index]);

  if (isTitForTat) {
    return "tit_for_tat";
  }

  const firstOpponentBetrayal = opponentChoices.indexOf("betray");
  const isGrimTrigger =
    firstOpponentBetrayal >= 0 &&
    choices.slice(0, firstOpponentBetrayal + 1).every((choice) => choice === "cooperate") &&
    choices.slice(firstOpponentBetrayal + 1).every((choice) => choice === "betray");

  if (isGrimTrigger) {
    return "grim_trigger";
  }

  if (choices.length > 1 && choices[0] === "cooperate" && choices.slice(1).every((choice) => choice === "betray")) {
    return "opportunist";
  }

  if (cooperationRate >= 0.6 && endgameBetrayalRate < 0.67) {
    return "cooperative";
  }

  return "mixed";
}

function buildBehavioralOutput(state: PactPrivateState): BehavioralOutput[] {
  const summaries = buildStrategySummary(state);
  const output: BehavioralOutput[] = [];

  for (const summary of summaries) {
    output.push(
      {
        metricKey: `pact.cooperation_rate.${summary.seatId}`,
        value: Number(summary.cooperationRate.toFixed(3)),
      },
      {
        metricKey: `pact.strategy_label.${summary.seatId}`,
        value: summary.label,
      },
      {
        metricKey: `pact.endgame_betrayal_rate.${summary.seatId}`,
        value: Number(summary.endgameBetrayalRate.toFixed(3)),
      },
    );

    if (summary.forgivenessRate !== null) {
      output.push({
        metricKey: `pact.forgiveness_rate.${summary.seatId}`,
        value: Number(summary.forgivenessRate.toFixed(3)),
      });
    }

    if (summary.retaliationRate !== null) {
      output.push({
        metricKey: `pact.retaliation_rate.${summary.seatId}`,
        value: Number(summary.retaliationRate.toFixed(3)),
      });
    }
  }

  const mutualCooperationRate =
    state.history.length === 0
      ? 0
      : state.history.filter((round) => round.outcomeCode === "CC").length / state.history.length;

  output.push({
    metricKey: "pact.mutual_cooperation_rate",
    value: Number(mutualCooperationRate.toFixed(3)),
  });

  return output;
}

export function createPactState(seed: string, seats: SeatAssignment[]): PactPrivateState {
  void seed;
  assertTwoSeats(seats);

  const seatDirectory = seats.map((seat) => ({
    seatId: seat.publicSeat.seatId,
    displayName: seat.publicSeat.displayName,
    avatarId: seat.publicSeat.avatarId,
    isConnected: seat.publicSeat.isConnected,
    isReady: seat.publicSeat.isReady,
  }));

  return {
    phase: "choice_window",
    totalRounds: PACT_TOTAL_ROUNDS,
    seatOrder: [seats[0].publicSeat.seatId, seats[1].publicSeat.seatId],
    seatDirectory,
    scoreBySeatId: Object.fromEntries(seatDirectory.map((seat) => [seat.seatId, 0])),
    pendingChoices: {},
    history: [],
    nextSequence: 1,
  };
}

export function projectPactPublicState(state: PactPrivateState): PactPublicState {
  const seats = state.seatDirectory.map((seat) => ({
    ...seat,
    score: state.scoreBySeatId[seat.seatId] ?? 0,
  }));

  const isComplete = state.phase === "match_complete";
  const nextRound = Math.min(state.history.length + 1, state.totalRounds);

  return {
    phase: state.phase,
    totalRounds: state.totalRounds,
    currentRound: isComplete ? state.totalRounds : nextRound,
    commitmentCount: Object.keys(state.pendingChoices).length,
    seats,
    history: state.history,
    payoffLegend: [
      { outcome: "CC", label: PACT_PAYOFF_MATRIX.CC.label, seatA: 300, seatB: 300 },
      { outcome: "CB", label: PACT_PAYOFF_MATRIX.CB.label, seatA: 0, seatB: 500 },
      { outcome: "BC", label: PACT_PAYOFF_MATRIX.BC.label, seatA: 500, seatB: 0 },
      { outcome: "BB", label: PACT_PAYOFF_MATRIX.BB.label, seatA: 100, seatB: 100 },
    ],
    strategySummary: isComplete ? buildStrategySummary(state) : undefined,
    status: isComplete
      ? "Match complete"
      : `Round ${nextRound} of ${state.totalRounds}. Choices stay hidden until both seats commit.`,
  };
}

export function validatePactAction(state: PactPrivateState, action: PactActionEnvelope): void {
  assertSeatBelongsToMatch(state, action.seatId);

  if (state.phase === "match_complete") {
    throw new Error("Pact match is already complete.");
  }

  if (action.action.type !== "pact.choose") {
    throw new Error(`Unsupported Pact action: ${action.action.type}`);
  }

  if (state.history.length >= state.totalRounds) {
    throw new Error("All Pact rounds have already been resolved.");
  }

  if (state.pendingChoices[action.seatId] !== undefined) {
    throw new Error(`Seat ${action.seatId} already committed a choice for this round.`);
  }
}

export function applyPactAction(
  state: PactPrivateState,
  action: PactActionEnvelope,
  nowIso: string,
): {
  nextState: PactPrivateState;
  events: ReplayEvent[];
  behavioralOutput?: BehavioralOutput[];
  isTerminal?: boolean;
} {
  validatePactAction(state, action);

  const pendingChoices = {
    ...state.pendingChoices,
    [action.seatId]: action.action.choice,
  };

  const commitEvent: ReplayEvent = {
    sequence: state.nextSequence,
    type: "pact.choice.committed",
    occurredAt: nowIso,
    actorSeatId: action.seatId,
    publicPayload: {
      round: state.history.length + 1,
      commitmentCount: Object.keys(pendingChoices).length,
    },
  };

  if (Object.keys(pendingChoices).length < 2) {
    return {
      nextState: {
        ...state,
        pendingChoices,
        nextSequence: state.nextSequence + 1,
      },
      events: [commitEvent],
    };
  }

  const [seatAId, seatBId] = state.seatOrder;
  const seatAChoice = pendingChoices[seatAId];
  const seatBChoice = pendingChoices[seatBId];

  if (!seatAChoice || !seatBChoice) {
    throw new Error("Cannot resolve Pact round without both seat choices.");
  }

  const outcomeCode = resolveOutcomeCode(seatAChoice, seatBChoice);
  const payoff = PACT_PAYOFF_MATRIX[outcomeCode];
  const scoreBySeatId = {
    ...state.scoreBySeatId,
    [seatAId]: state.scoreBySeatId[seatAId] + payoff.seatA,
    [seatBId]: state.scoreBySeatId[seatBId] + payoff.seatB,
  };

  const resolvedRound: PactResolvedRound = {
    round: state.history.length + 1,
    outcomeCode,
    choices: {
      [seatAId]: seatAChoice,
      [seatBId]: seatBChoice,
    },
    payoffs: {
      [seatAId]: payoff.seatA,
      [seatBId]: payoff.seatB,
    },
    cumulativeScores: {
      [seatAId]: scoreBySeatId[seatAId],
      [seatBId]: scoreBySeatId[seatBId],
    },
  };

  const history = [...state.history, resolvedRound];
  const isTerminal = history.length >= state.totalRounds;

  const nextState: PactPrivateState = {
    ...state,
    phase: isTerminal ? "match_complete" : "choice_window",
    scoreBySeatId,
    pendingChoices: {},
    history,
    nextSequence: state.nextSequence + 2,
  };

  const resolutionEvent: ReplayEvent = {
    sequence: state.nextSequence + 1,
    type: "pact.round.resolved",
    occurredAt: nowIso,
    publicPayload: resolvedRound,
  };

  return {
    nextState,
    events: [commitEvent, resolutionEvent],
    behavioralOutput: [
      {
        metricKey: `pact.round.${resolvedRound.round}.mutual_cooperation`,
        value: outcomeCode === "CC",
      },
      {
        metricKey: `pact.round.${resolvedRound.round}.choice.${seatAId}`,
        value: roundMetricValue(seatAChoice),
      },
      {
        metricKey: `pact.round.${resolvedRound.round}.choice.${seatBId}`,
        value: roundMetricValue(seatBChoice),
      },
    ],
    isTerminal,
  };
}

export function finalizePactMatch(
  state: PactPrivateState,
  publicRoomState: PublicRoomState<PactPublicState>,
): MatchResult {
  const highestScore = Math.max(...state.seatOrder.map((seatId) => state.scoreBySeatId[seatId]));
  const winningSeatIds = state.seatOrder.filter((seatId) => state.scoreBySeatId[seatId] === highestScore);

  return {
    matchId: publicRoomState.matchId,
    game: "pact",
    roomId: publicRoomState.roomId,
    completedAt: publicRoomState.lastEventAt,
    winningSeatIds,
    seatScores: { ...state.scoreBySeatId },
    behavioralOutput: buildBehavioralOutput(state),
  };
}

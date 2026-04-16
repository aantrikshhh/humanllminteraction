import type {
  SettlementAction,
  SettlementActionEnvelope,
  SettlementBrief,
  SettlementGameModule,
  SettlementPrivateState,
  SettlementPublicRoomState,
  SettlementPublicState,
  SettlementStance,
} from "./types";

import {
  SETTLEMENT_MAX_CONTRIBUTION,
  SETTLEMENT_STARTING_SUPPLIES,
  SETTLEMENT_STANCES,
  SETTLEMENT_TOTAL_ROUNDS,
  createSettlementRounds,
} from "./types";

import {
  applySettlementAction,
  coerceSettlementToTerminal,
  computeSettlementScores,
  createSettlementState,
  finalizeSettlementMatch,
  isSettlementAction,
  projectSettlementPublicState,
  resolveSettlementRound,
  resolveSettlementWinners,
  summarizeSettlementBehavior,
  validateSettlementAction,
} from "./state";

export const settlementBrief: SettlementBrief = {
  id: "settlement",
  title: "The Settlement",
  summary:
    "A threshold public-goods crisis where players make public pledges, hide real commitments, and win through disciplined coalition play.",
  playerCountLabel: "3-5 seats",
  visualDirection: "top-down pixel village command board",
  priority: "p1",
};

export const settlementModule: SettlementGameModule = {
  key: "settlement",
  minSeats: 3,
  maxSeats: 5,
  timers: {
    readyMs: 20_000,
    actionMs: 18_000,
    revealMs: 5_000,
    resultsMs: 10_000,
  },
  createInitialState: createSettlementState,
  projectPublicState: projectSettlementPublicState,
  validateAction: (ctx, action) => validateSettlementAction(ctx.state, action),
  reduce: (ctx, action) => {
    const result = applySettlementAction(ctx.state, action, ctx.nowIso);
    return {
      ...result,
      publicState: projectSettlementPublicState(result.nextState, action.seatId),
    };
  },
  finalizeMatch: finalizeSettlementMatch,
};

export {
  SETTLEMENT_MAX_CONTRIBUTION,
  SETTLEMENT_STARTING_SUPPLIES,
  SETTLEMENT_STANCES,
  SETTLEMENT_TOTAL_ROUNDS,
  applySettlementAction,
  coerceSettlementToTerminal,
  computeSettlementScores,
  createSettlementRounds,
  createSettlementState,
  finalizeSettlementMatch,
  isSettlementAction,
  projectSettlementPublicState,
  resolveSettlementRound,
  resolveSettlementWinners,
  summarizeSettlementBehavior,
  validateSettlementAction,
};

export type {
  SettlementAction,
  SettlementActionEnvelope,
  SettlementBrief,
  SettlementGameModule,
  SettlementPrivateState,
  SettlementPublicRoomState,
  SettlementPublicState,
  SettlementStance,
};

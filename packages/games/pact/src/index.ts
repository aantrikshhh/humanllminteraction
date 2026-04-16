import type {
  PactAction,
  PactActionEnvelope,
  PactBrief,
  PactGameModule,
  PactMatchResult,
  PactPrivateState,
  PactPublicRoomState,
  PactPublicState,
  PactResolvedRound,
  PactSeatScoreView,
  PactStrategySummary,
} from "./types";

import { PACT_TOTAL_ROUNDS } from "./types";

import {
  applyPactAction,
  createPactState,
  finalizePactMatch,
  projectPactPublicState,
  validatePactAction,
} from "./state";

export const pactBrief: PactBrief = {
  id: "pact",
  title: "The Pact",
  summary:
    "A deterministic iterated cooperation duel where both seats commit in secret and the history stays visible for the full match.",
  playerCountLabel: "2 seats",
  visualDirection: "pixel diplomacy console",
  priority: "p1",
};

export const pactModule: PactGameModule = {
  key: "pact",
  minSeats: 2,
  maxSeats: 2,
  timers: {
    readyMs: 15_000,
    actionMs: 18_000,
    revealMs: 3_000,
    resultsMs: 8_000,
  },
  createInitialState: createPactState,
  projectPublicState: projectPactPublicState,
  validateAction: (ctx, action) => validatePactAction(ctx.state, action),
  reduce: (ctx, action) => {
    const result = applyPactAction(ctx.state, action, ctx.nowIso);
    return {
      ...result,
      publicState: projectPactPublicState(result.nextState),
    };
  },
  finalizeMatch: finalizePactMatch,
};

export {
  PACT_TOTAL_ROUNDS,
  applyPactAction,
  createPactState,
  finalizePactMatch,
  projectPactPublicState,
  validatePactAction,
};

export type {
  PactAction,
  PactActionEnvelope,
  PactBrief,
  PactGameModule,
  PactMatchResult,
  PactPrivateState,
  PactPublicRoomState,
  PactPublicState,
  PactResolvedRound,
  PactSeatScoreView,
  PactStrategySummary,
};

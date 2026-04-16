import type {
  SplitAction,
  SplitActionEnvelope,
  SplitBrief,
  SplitGameModule,
  SplitPrivateState,
  SplitPublicRoomState,
  SplitPublicState,
} from "./types";

import {
  SPLIT_FAIR_OFFER_SHARE,
  SPLIT_LOW_OFFER_SHARE,
  SPLIT_MAX_ROUNDS,
  SPLIT_POT_TOTAL,
  SPLIT_TENSE_OFFER_SHARE,
  createSplitConfig,
} from "./types";

import {
  applySplitAction,
  classifySplitOfferShare,
  createSplitState,
  finalizeSplitMatch,
  isSplitAction,
  projectSplitPublicState,
  validateSplitAction,
} from "./state";

export const splitBrief: SplitBrief = {
  id: "split",
  title: "The Split",
  summary:
    "A repeated hidden-seat ultimatum game where fairness, punishment, and adaptation surface over alternating rounds.",
  playerCountLabel: "2 seats",
  visualDirection: "pixel negotiation chamber",
  priority: "p0",
};

export const splitModule: SplitGameModule = {
  key: "split",
  minSeats: 2,
  maxSeats: 2,
  timers: {
    readyMs: 15_000,
    actionMs: 18_000,
    revealMs: 4_000,
    resultsMs: 8_000,
  },
  createInitialState: createSplitState,
  projectPublicState: projectSplitPublicState,
  validateAction: (ctx, action) => validateSplitAction(ctx.state, action),
  reduce: (ctx, action) => {
    const result = applySplitAction(ctx.state, action, ctx.nowIso);
    return {
      ...result,
      publicState: projectSplitPublicState(result.nextState, action.seatId),
    };
  },
  finalizeMatch: finalizeSplitMatch,
};

export {
  SPLIT_FAIR_OFFER_SHARE,
  SPLIT_LOW_OFFER_SHARE,
  SPLIT_MAX_ROUNDS,
  SPLIT_POT_TOTAL,
  SPLIT_TENSE_OFFER_SHARE,
  applySplitAction,
  classifySplitOfferShare,
  createSplitConfig,
  createSplitState,
  finalizeSplitMatch,
  isSplitAction,
  projectSplitPublicState,
  validateSplitAction,
};

export type {
  SplitAction,
  SplitActionEnvelope,
  SplitBrief,
  SplitGameModule,
  SplitPrivateState,
  SplitPublicRoomState,
  SplitPublicState,
};

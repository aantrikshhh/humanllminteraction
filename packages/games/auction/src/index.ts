import type { SeatId } from "@arena/contracts";

import type {
  AuctionAction,
  AuctionActionEnvelope,
  AuctionBrief,
  AuctionGameModule,
  AuctionPrivateState,
  AuctionPublicRoomState,
  AuctionSeatPublicView,
  AuctionPublicState,
} from "./types";

import {
  AUCTION_ITEM_NAME,
  AUCTION_ITEM_VALUE,
  AUCTION_MAX_BID,
  AUCTION_MIN_INCREMENT,
  AUCTION_PRIZE_VALUES,
  AUCTION_STARTING_BANKROLL,
  AUCTION_TOTAL_ROUNDS,
  createAuctionConfig,
} from "./types";

import {
  applyAuctionAction,
  createAuctionState,
  finalizeAuctionMatch,
  projectAuctionPublicState,
  validateAuctionAction,
} from "./state";

export const auctionBrief: AuctionBrief = {
  id: "auction",
  title: "The Auction",
  summary:
    "A multi-round bankroll auction where every visible bid burns credits and prize value carries across a full match.",
  playerCountLabel: "3-5 seats",
  visualDirection: "pixel arena exchange floor",
  priority: "p0",
};

export const auctionModule: AuctionGameModule = {
  key: "auction",
  minSeats: 3,
  maxSeats: 5,
  timers: {
    readyMs: 15_000,
    actionMs: 20_000,
    revealMs: 4_000,
    resultsMs: 8_000,
  },
  createInitialState: createAuctionState,
  projectPublicState: projectAuctionPublicState,
  validateAction: (ctx, action) => validateAuctionAction(ctx.state, action),
  reduce: (ctx, action) => {
    const result = applyAuctionAction(ctx.state, action, ctx.nowIso);
    return {
      ...result,
      publicState: projectAuctionPublicState(result.nextState, action.seatId),
    };
  },
  finalizeMatch: finalizeAuctionMatch,
};

export {
  AUCTION_ITEM_NAME,
  AUCTION_ITEM_VALUE,
  AUCTION_MAX_BID,
  AUCTION_MIN_INCREMENT,
  AUCTION_PRIZE_VALUES,
  AUCTION_STARTING_BANKROLL,
  AUCTION_TOTAL_ROUNDS,
  applyAuctionAction,
  createAuctionConfig,
  createAuctionState,
  finalizeAuctionMatch,
  projectAuctionPublicState,
  validateAuctionAction,
};

export type {
  AuctionAction,
  AuctionActionEnvelope,
  AuctionBrief,
  AuctionGameModule,
  AuctionPrivateState,
  AuctionPublicRoomState,
  AuctionSeatPublicView,
  AuctionPublicState,
};

import type {
  BehavioralOutput,
  MatchResult,
  PublicRoomState,
  PublicSeatView,
  ReplayEvent,
  SeatAssignment,
  SeatId
} from "@arena/contracts";
import type {
  GameActionEnvelope,
  GameBrief,
  GameModule,
  GameReducerContext,
  GameReducerResult
} from "@arena/game-sdk";

export interface AuctionActionBid {
  type: "auction.bid";
  amount: number;
}

export interface AuctionActionPass {
  type: "auction.pass";
}

export type AuctionAction = AuctionActionBid | AuctionActionPass;

export interface AuctionConfig {
  itemName: string;
  itemValue: number;
  minIncrement: number;
  maxBid: number;
  maxTurns: number;
}

export interface AuctionSeatState {
  seatId: SeatId;
  displayName: string;
  avatarId: string;
  committedBid: number;
  hasPassed: boolean;
}

export interface AuctionPrivateState {
  seed: string;
  config: AuctionConfig;
  phase: "bidding" | "settled";
  seats: AuctionSeatState[];
  seatOrder: SeatId[];
  turnIndex: number;
  currentTurnSeatId: SeatId;
  currentBid: number;
  currentLeaderSeatId?: SeatId;
  currentPot: number;
  actionCount: number;
  passes: number;
  winnerSeatId?: SeatId;
  settledAt?: string;
  settledBy?: "all_passed" | "one_active" | "turn_limit";
}

export interface AuctionSeatPublicView extends PublicSeatView {
  committedBid: number;
  hasPassed: boolean;
  isLeader: boolean;
}

export interface AuctionPublicState {
  itemName: string;
  itemValue: number;
  currentBid: number;
  currentPot: number;
  currentLeaderSeatId?: SeatId;
  currentTurnSeatId?: SeatId;
  turnIndex: number;
  turnsRemaining: number;
  maxTurns: number;
  phase: "bidding" | "settled";
  winnerSeatId?: SeatId;
  settleReason?: string;
  viewerCanAct: boolean;
  seats: AuctionSeatPublicView[];
}

export type AuctionBrief = GameBrief;
export type AuctionGameModule = GameModule<
  AuctionPrivateState,
  AuctionPublicState,
  AuctionAction
>;
export type AuctionReducerContext = GameReducerContext<AuctionPrivateState>;
export type AuctionReducerResult = GameReducerResult<
  AuctionPrivateState,
  AuctionPublicState
>;
export type AuctionActionEnvelope = GameActionEnvelope<AuctionAction>;
export type AuctionMatchResult = MatchResult;
export type AuctionPublicRoomState = PublicRoomState<AuctionPublicState>;
export type AuctionBehavioralOutput = BehavioralOutput;

export const AUCTION_ITEM_NAME = "Signal Relay";
export const AUCTION_ITEM_VALUE = 30;
export const AUCTION_MIN_INCREMENT = 1;
export const AUCTION_MAX_BID = 20;

export function createAuctionConfig(seatCount: number): AuctionConfig {
  const maxTurns = Math.max(9, seatCount * 4);

  return {
    itemName: AUCTION_ITEM_NAME,
    itemValue: AUCTION_ITEM_VALUE,
    minIncrement: AUCTION_MIN_INCREMENT,
    maxBid: AUCTION_MAX_BID,
    maxTurns,
  };
}

import type {
  BehavioralOutput,
  MatchResult,
  PublicRoomState,
  PublicSeatView,
  ReplayEvent,
  SeatAssignment,
  SeatId,
} from "@arena/contracts";
import type {
  GameActionEnvelope,
  GameBrief,
  GameModule,
  GameReducerContext,
  GameReducerResult,
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
  prizeValues: readonly number[];
  startingBankroll: number;
  minIncrement: number;
  maxBid: number;
  turnsPerRound: number;
  maxTurns: number;
}

export interface AuctionSeatState {
  seatId: SeatId;
  displayName: string;
  avatarId: string;
  bankroll: number;
  totalSpent: number;
  totalValueWon: number;
  roundsWon: number;
  committedBid: number;
  hasPassed: boolean;
}

export type AuctionRoundSettleReason = "one_active" | "turn_limit";
export type AuctionMatchSettleReason = "all_rounds_complete" | "forced_finalize";

export interface AuctionRoundRecord {
  roundNumber: number;
  prizeValue: number;
  openingSeatId: SeatId;
  winnerSeatId: SeatId;
  winningBid: number;
  pot: number;
  settledBy: AuctionRoundSettleReason;
  actionCount: number;
  spentBySeat: Record<SeatId, number>;
  scoreDeltaBySeat: Record<SeatId, number>;
}

export interface AuctionPrivateState {
  seed: string;
  config: AuctionConfig;
  phase: "bidding" | "settled";
  seats: AuctionSeatState[];
  seatOrder: SeatId[];
  roundIndex: number;
  roundHistory: AuctionRoundRecord[];
  currentRoundPrizeValue: number;
  currentRoundOpeningSeatId: SeatId;
  turnIndex: number;
  actionCount: number;
  eventCount: number;
  roundActionCount: number;
  currentTurnSeatId?: SeatId;
  currentBid: number;
  currentLeaderSeatId?: SeatId;
  currentPot: number;
  passes: number;
  currentRoundPasses: number;
  winnerSeatId?: SeatId;
  settledAt?: string;
  settledBy?: AuctionMatchSettleReason;
}

export interface AuctionSeatPublicView extends PublicSeatView {
  bankroll: number;
  totalSpent: number;
  totalValueWon: number;
  netScore: number;
  committedBid: number;
  hasPassed: boolean;
  isLeader: boolean;
  roundsWon: number;
}

export interface AuctionPublicHistoryEntry {
  roundNumber: number;
  prizeValue: number;
  openingSeatId: SeatId;
  winnerSeatId: SeatId;
  winningBid: number;
  pot: number;
  settledBy: AuctionRoundSettleReason;
  actionCount: number;
}

export interface AuctionPublicState {
  itemName: string;
  itemValue: number;
  prizeValues: readonly number[];
  startingBankroll: number;
  currentRound: number;
  totalRounds: number;
  roundsRemaining: number;
  currentRoundPrizeValue: number;
  currentRoundOpeningSeatId: SeatId;
  currentBid: number;
  currentPot: number;
  currentLeaderSeatId?: SeatId;
  currentTurnSeatId?: SeatId;
  turnIndex: number;
  turnsRemaining: number;
  roundTurnsRemaining: number;
  maxTurns: number;
  phase: "bidding" | "settled";
  winnerSeatId?: SeatId;
  settleReason?: AuctionMatchSettleReason;
  viewerCanAct: boolean;
  seats: AuctionSeatPublicView[];
  history: AuctionPublicHistoryEntry[];
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

export const AUCTION_ITEM_NAME = "Signal Relay Cache";
export const AUCTION_PRIZE_VALUES = [12, 9, 7] as const;
export const AUCTION_ITEM_VALUE = AUCTION_PRIZE_VALUES[0];
export const AUCTION_STARTING_BANKROLL = 20;
export const AUCTION_TOTAL_ROUNDS = AUCTION_PRIZE_VALUES.length;
export const AUCTION_MIN_INCREMENT = 1;
export const AUCTION_MAX_BID = 6;

export function createAuctionConfig(seatCount: number): AuctionConfig {
  const turnsPerRound = seatCount + 1;

  return {
    itemName: AUCTION_ITEM_NAME,
    itemValue: AUCTION_ITEM_VALUE,
    prizeValues: AUCTION_PRIZE_VALUES,
    startingBankroll: AUCTION_STARTING_BANKROLL,
    minIncrement: AUCTION_MIN_INCREMENT,
    maxBid: AUCTION_MAX_BID,
    turnsPerRound,
    maxTurns: turnsPerRound * AUCTION_TOTAL_ROUNDS,
  };
}

export type AuctionSeatAssignment = SeatAssignment;

import type {
  BehavioralOutput,
  MatchResult,
  PublicRoomState,
  PublicSeatView,
  SeatId,
} from "@arena/contracts";
import type {
  GameActionEnvelope,
  GameBrief,
  GameModule,
  GameReducerContext,
  GameReducerResult,
} from "@arena/game-sdk";

export interface SplitOfferAction {
  type: "split.offer";
  amount: number;
}

export interface SplitAcceptAction {
  type: "split.accept";
}

export interface SplitRejectAction {
  type: "split.reject";
}

export type SplitAction = SplitOfferAction | SplitAcceptAction | SplitRejectAction;

export interface SplitConfig {
  potTotal: number;
  maxRounds: number;
}

export interface SplitSeatState {
  seatId: SeatId;
  displayName: string;
  avatarId: string;
  cumulativeScore: number;
  proposalsMade: number;
  acceptedCount: number;
  rejectedCount: number;
}

export interface SplitPendingOffer {
  roundNumber: number;
  proposerSeatId: SeatId;
  responderSeatId: SeatId;
  amountToResponder: number;
  amountToProposer: number;
  offerShare: number;
  submittedAt: string;
}

export interface SplitRoundRecord {
  roundNumber: number;
  proposerSeatId: SeatId;
  responderSeatId: SeatId;
  amountToResponder: number;
  amountToProposer: number;
  offerShare: number;
  decision: "accepted" | "rejected";
  proposerDelta: number;
  responderDelta: number;
  resolvedAt: string;
}

export interface SplitPrivateState {
  seed: string;
  config: SplitConfig;
  phase: "offer" | "response" | "settled";
  seats: SplitSeatState[];
  seatOrder: SeatId[];
  roundIndex: number;
  proposerSeatId: SeatId;
  responderSeatId: SeatId;
  pendingOffer?: SplitPendingOffer;
  history: SplitRoundRecord[];
  actionCount: number;
  completedAt?: string;
}

export interface SplitSeatPublicView extends PublicSeatView {
  cumulativeScore: number;
  proposalsMade: number;
  acceptedCount: number;
  rejectedCount: number;
  role: "proposer" | "responder";
  scoreDeltaFromLeader: number;
}

export interface SplitPublicHistoryEntry {
  roundNumber: number;
  proposerSeatId: SeatId;
  responderSeatId: SeatId;
  amountToResponder: number;
  offerShare: number;
  decision: "accepted" | "rejected";
  proposerDelta: number;
  responderDelta: number;
}

export interface SplitPublicState {
  phase: "offer" | "response" | "settled";
  potTotal: number;
  currentRound: number;
  maxRounds: number;
  roundsRemaining: number;
  proposerSeatId?: SeatId;
  responderSeatId?: SeatId;
  pendingOffer?: {
    amountToResponder: number;
    amountToProposer: number;
    offerShare: number;
  };
  viewerRole?: "proposer" | "responder";
  viewerCanAct: boolean;
  tensionIndex: number;
  narrative: string;
  seats: SplitSeatPublicView[];
  history: SplitPublicHistoryEntry[];
}

export type SplitBrief = GameBrief;
export type SplitGameModule = GameModule<
  SplitPrivateState,
  SplitPublicState,
  SplitAction
>;
export type SplitReducerContext = GameReducerContext<SplitPrivateState>;
export type SplitReducerResult = GameReducerResult<
  SplitPrivateState,
  SplitPublicState
>;
export type SplitActionEnvelope = GameActionEnvelope<SplitAction>;
export type SplitMatchResult = MatchResult;
export type SplitPublicRoomState = PublicRoomState<SplitPublicState>;
export type SplitBehavioralOutput = BehavioralOutput;

export const SPLIT_POT_TOTAL = 100;
export const SPLIT_MAX_ROUNDS = 4;
export const SPLIT_LOW_OFFER_SHARE = 0.3;

export function createSplitConfig(): SplitConfig {
  return {
    potTotal: SPLIT_POT_TOTAL,
    maxRounds: SPLIT_MAX_ROUNDS,
  };
}

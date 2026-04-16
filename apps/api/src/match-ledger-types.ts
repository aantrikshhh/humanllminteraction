import type {
  GameKey,
  MatchCompletionEnvelope,
  MatchId,
  PlayerId,
  PublicMatchResultSummary,
  PublicMatchSyncState,
  RoomId,
  SeatId,
} from "@arena/contracts";
import type {
  LeaderboardApplyResult,
  ResolvedLeaderboardMatch,
} from "@arena/leaderboard";
import type {
  EscrowRecord,
  MatchSettlementInput,
  PayoutLedgerRecord,
  PayoutLifecycleStatus,
} from "@arena/payments";

export type MatchLedgerStatus =
  | "completion_recorded"
  | "leaderboard_recorded"
  | "payments_recorded"
  | "fully_recorded";

export interface MatchLedgerParticipant {
  seatId: SeatId;
  playerId?: PlayerId;
  displayName: string;
  score: number;
  isWinner: boolean;
}

export interface MatchLedgerSeatImpact {
  seatId: SeatId;
  playerId?: PlayerId;
  displayName: string;
  score: number;
  isWinner: boolean;
  leaderboard?: {
    delta: number;
    previousRating: number;
    newRating: number;
    expectedScore: number;
    actualScore: number;
    wonMatch: boolean;
    matchesPlayed: number;
    wins: number;
  };
  payout?: {
    payoutId: string;
    amountUsd: number;
    currency: "USD" | "USDC";
    status: "pending" | "ready" | "paid" | "failed";
    lifecycleStatus: PayoutLifecycleStatus;
  };
}

export interface MatchLedgerLeaderboardImpact {
  appliedAt: string;
  applied: LeaderboardApplyResult;
}

export interface MatchLedgerPaymentsImpact {
  settledAt: string;
  escrowId: string;
  totalPayoutUsd: number;
  escrow?: EscrowRecord;
  payouts: PayoutLedgerRecord[];
}

export interface MatchLedgerRecord {
  matchId: MatchId;
  roomId: RoomId;
  game: GameKey;
  completedAt: string;
  status: MatchLedgerStatus;
  publicResult: PublicMatchResultSummary;
  completion: MatchCompletionEnvelope;
  matchSync?: PublicMatchSyncState;
  participants: MatchLedgerParticipant[];
  seatImpacts: MatchLedgerSeatImpact[];
  leaderboard?: MatchLedgerLeaderboardImpact;
  payments?: MatchLedgerPaymentsImpact;
  updatedAt: string;
}

export interface MatchLedgerWriteCompletionRequest {
  completion: MatchCompletionEnvelope;
  matchSync?: PublicMatchSyncState;
}

export interface MatchLedgerWriteLeaderboardRequest {
  match: ResolvedLeaderboardMatch;
  applied: LeaderboardApplyResult;
}

export interface MatchLedgerWritePaymentsRequest {
  input: MatchSettlementInput;
  payouts: PayoutLedgerRecord[];
  escrow?: EscrowRecord;
}

export interface MatchLedgerRecordResponse {
  ok: true;
  data: MatchLedgerRecord;
}

export interface MatchLedgerNotFoundResponse {
  ok: false;
  error: "match_not_found" | "room_not_found";
}

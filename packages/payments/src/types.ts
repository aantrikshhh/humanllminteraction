import type { GameKey, MatchId, MatchResult, PlayerId, PayoutRecord, SeatId } from "@arena/contracts";

export type WalletConnectionStatus = "disconnected" | "connecting" | "connected";

export type EscrowStatus =
  | "draft"
  | "funding_required"
  | "funding_authorized"
  | "funded_simulated"
  | "locked"
  | "settlement_pending"
  | "settled"
  | "failed";

export type PayoutLifecycleStatus =
  | "pending_settlement"
  | "available_to_claim"
  | "claim_requested"
  | "claimed_simulated"
  | "failed";

export interface PaymentLifecycleEvent<TStatus extends string> {
  status: TStatus;
  occurredAt: string;
  note?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface WalletSummary {
  playerId: PlayerId;
  walletAddress: string;
  availableUsd: number;
  pendingUsd: number;
  totalEarnedUsd: number;
  connectionStatus: WalletConnectionStatus;
  network: "stub-local";
  isSimulated: true;
  lastUpdatedAt: string;
}

export interface WalletStubRecord extends WalletSummary {
  createdAt: string;
}

export interface EscrowRecord {
  escrowId: string;
  sponsorId: string;
  gameId: GameKey;
  matchId?: MatchId;
  status: EscrowStatus;
  fundedAmountUsd: number;
  reservedAmountUsd: number;
  releasedAmountUsd: number;
  currency: "USD" | "USDC";
  isSimulated: true;
  createdAt: string;
  updatedAt: string;
  timeline: PaymentLifecycleEvent<EscrowStatus>[];
}

export interface PayoutLedgerRecord extends PayoutRecord {
  escrowId: string;
  seatId: SeatId;
  lifecycleStatus: PayoutLifecycleStatus;
  isSimulated: true;
  updatedAt: string;
  timeline: PaymentLifecycleEvent<PayoutLifecycleStatus>[];
  simulatedTransactionId?: string;
}

export interface PlayerPaymentsSnapshot {
  wallet: WalletSummary;
  escrowSummaries: EscrowRecord[];
  payouts: PayoutLedgerRecord[];
}

export interface CreateWalletInput {
  playerId: PlayerId;
  walletAddress?: string;
  initialAvailableUsd?: number;
}

export interface CreateEscrowInput {
  escrowId?: string;
  sponsorId: string;
  gameId: GameKey;
  matchId?: MatchId;
  fundedAmountUsd: number;
  currency?: "USD" | "USDC";
}

export interface MatchSettlementInput {
  escrowId: string;
  result: MatchResult;
  seatToPlayerId: Record<SeatId, PlayerId>;
  strategy?: "winners_equally" | "positive_score";
}

export interface PaymentsEngine {
  connectWallet(input: CreateWalletInput): WalletSummary;
  getWalletSummary(playerId: PlayerId): WalletSummary;
  createEscrow(input: CreateEscrowInput): EscrowRecord;
  authorizeEscrow(escrowId: string, note?: string): EscrowRecord;
  fundEscrow(escrowId: string, note?: string): EscrowRecord;
  lockEscrow(escrowId: string, note?: string): EscrowRecord;
  createPayouts(input: MatchSettlementInput): PayoutLedgerRecord[];
  requestPayoutClaim(payoutId: string, note?: string): PayoutLedgerRecord;
  getPlayerSnapshot(playerId: PlayerId): PlayerPaymentsSnapshot;
  getEscrow(escrowId: string): EscrowRecord;
  getPayout(payoutId: string): PayoutLedgerRecord;
}

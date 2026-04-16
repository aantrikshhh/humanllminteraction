import type { MatchResult, PayoutRecord, SeatId } from "@arena/contracts";

import type {
  EscrowStatus,
  PaymentLifecycleEvent,
  PayoutLifecycleStatus,
  WalletSummary,
} from "./types";

function sanitizeSegment(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function createStubWalletAddress(playerId: string): string {
  const normalized = sanitizeSegment(playerId) || "player";
  return `stub-${normalized.slice(0, 18).padEnd(18, "0")}`;
}

export function createStableId(prefix: string, parts: Array<string | number>): string {
  const body = parts.map((part) => sanitizeSegment(String(part)) || "x").join("-");
  return `${prefix}_${body}`;
}

export function pushLifecycleEvent<TStatus extends string>(
  timeline: PaymentLifecycleEvent<TStatus>[],
  status: TStatus,
  occurredAt: string,
  note?: string,
  metadata?: Record<string, string | number | boolean | null>,
): PaymentLifecycleEvent<TStatus>[] {
  return [...timeline, { status, occurredAt, note, metadata }];
}

export function assertNever(message: string): never {
  throw new Error(message);
}

export function mapPayoutLifecycleStatus(status: PayoutLifecycleStatus): PayoutRecord["status"] {
  switch (status) {
    case "pending_settlement":
      return "pending";
    case "available_to_claim":
    case "claim_requested":
      return "ready";
    case "claimed_simulated":
      return "paid";
    case "failed":
      return "failed";
    default:
      return assertNever(`Unsupported payout lifecycle status: ${status satisfies never}`);
  }
}

export function roundUsd(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computePendingUsd(payouts: PayoutRecord[]): number {
  return roundUsd(
    payouts.reduce((sum, payout) => sum + (payout.status === "paid" ? 0 : payout.amountUsd), 0),
  );
}

export function computeAvailableUsd(wallet: WalletSummary): number {
  return roundUsd(wallet.totalEarnedUsd - wallet.pendingUsd);
}

export function pickSettlementSeats(
  result: MatchResult,
  strategy: "winners_equally" | "positive_score",
): SeatId[] {
  if (strategy === "winners_equally") {
    return result.winningSeatIds.length > 0
      ? result.winningSeatIds
      : Object.entries(result.seatScores)
          .filter(([, score]) => score > 0)
          .map(([seatId]) => seatId);
  }

  return Object.entries(result.seatScores)
    .filter(([, score]) => score > 0)
    .map(([seatId]) => seatId);
}

export function computeSeatAllocation(
  result: MatchResult,
  totalPoolUsd: number,
  strategy: "winners_equally" | "positive_score",
): Array<{ seatId: SeatId; amountUsd: number }> {
  const eligibleSeats = pickSettlementSeats(result, strategy);

  if (eligibleSeats.length === 0 || totalPoolUsd <= 0) {
    return [];
  }

  if (strategy === "winners_equally") {
    const evenShare = roundUsd(totalPoolUsd / eligibleSeats.length);
    const allocations = eligibleSeats.map((seatId) => ({ seatId, amountUsd: evenShare }));
    const allocatedTotal = roundUsd(allocations.reduce((sum, item) => sum + item.amountUsd, 0));
    const delta = roundUsd(totalPoolUsd - allocatedTotal);

    if (delta !== 0) {
      allocations[allocations.length - 1] = {
        seatId: allocations[allocations.length - 1].seatId,
        amountUsd: roundUsd(allocations[allocations.length - 1].amountUsd + delta),
      };
    }

    return allocations;
  }

  const totalPositiveScore = eligibleSeats.reduce(
    (sum, seatId) => sum + Math.max(0, result.seatScores[seatId] ?? 0),
    0,
  );

  if (totalPositiveScore <= 0) {
    return [];
  }

  const allocations = eligibleSeats.map((seatId) => {
    const seatScore = Math.max(0, result.seatScores[seatId] ?? 0);
    const share = roundUsd((totalPoolUsd * seatScore) / totalPositiveScore);
    return {
      seatId,
      amountUsd: share,
    };
  });
  const allocatedTotal = roundUsd(allocations.reduce((sum, item) => sum + item.amountUsd, 0));
  const delta = roundUsd(totalPoolUsd - allocatedTotal);

  if (delta !== 0) {
    allocations[allocations.length - 1] = {
      seatId: allocations[allocations.length - 1].seatId,
      amountUsd: roundUsd(allocations[allocations.length - 1].amountUsd + delta),
    };
  }

  return allocations;
}

export function appendEscrowTimeline(
  status: EscrowStatus,
  occurredAt: string,
  note?: string,
): PaymentLifecycleEvent<EscrowStatus> {
  return {
    status,
    occurredAt,
    note,
  };
}

export function appendPayoutTimeline(
  status: PayoutLifecycleStatus,
  occurredAt: string,
  note?: string,
): PaymentLifecycleEvent<PayoutLifecycleStatus> {
  return {
    status,
    occurredAt,
    note,
  };
}

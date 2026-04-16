import type { PlayerId } from "@arena/contracts";

import type {
  CreateEscrowInput,
  CreateWalletInput,
  EscrowRecord,
  MatchSettlementInput,
  PaymentsEngine,
  PlayerPaymentsSnapshot,
  PayoutLedgerRecord,
  WalletStubRecord,
  WalletSummary,
} from "./types";
import {
  appendEscrowTimeline,
  appendPayoutTimeline,
  computeSeatAllocation,
  createStableId,
  createStubWalletAddress,
  mapPayoutLifecycleStatus,
  pushLifecycleEvent,
  roundUsd,
} from "./utils";

export interface PaymentsStubClock {
  nowIso(): string;
}

export interface InMemoryPaymentsEngineOptions {
  clock?: PaymentsStubClock;
}

const defaultClock: PaymentsStubClock = {
  nowIso: () => new Date().toISOString(),
};

export class InMemoryPaymentsEngine implements PaymentsEngine {
  private readonly wallets = new Map<PlayerId, WalletStubRecord>();

  private readonly escrows = new Map<string, EscrowRecord>();

  private readonly payouts = new Map<string, PayoutLedgerRecord>();

  private readonly clock: PaymentsStubClock;

  constructor(options: InMemoryPaymentsEngineOptions = {}) {
    this.clock = options.clock ?? defaultClock;
  }

  connectWallet(input: CreateWalletInput): WalletSummary {
    const nowIso = this.clock.nowIso();
    const existing = this.wallets.get(input.playerId);

    const record: WalletStubRecord = existing
      ? {
          ...existing,
          walletAddress: input.walletAddress?.trim() || existing.walletAddress,
          connectionStatus: "connected",
          availableUsd:
            typeof input.initialAvailableUsd === "number"
              ? roundUsd(input.initialAvailableUsd)
              : existing.availableUsd,
          totalEarnedUsd:
            typeof input.initialAvailableUsd === "number"
              ? roundUsd(input.initialAvailableUsd + existing.pendingUsd)
              : existing.totalEarnedUsd,
          lastUpdatedAt: nowIso,
        }
      : {
          playerId: input.playerId,
          walletAddress: input.walletAddress?.trim() || createStubWalletAddress(input.playerId),
          availableUsd: roundUsd(input.initialAvailableUsd ?? 0),
          pendingUsd: 0,
          totalEarnedUsd: roundUsd(input.initialAvailableUsd ?? 0),
          connectionStatus: "connected",
          network: "stub-local",
          isSimulated: true,
          createdAt: nowIso,
          lastUpdatedAt: nowIso,
        };

    this.wallets.set(input.playerId, record);
    return this.getWalletSummary(input.playerId);
  }

  getWalletSummary(playerId: PlayerId): WalletSummary {
    return this.ensureWallet(playerId);
  }

  createEscrow(input: CreateEscrowInput): EscrowRecord {
    const nowIso = this.clock.nowIso();
    const escrowId =
      input.escrowId?.trim() ||
      createStableId("escrow", [input.matchId ?? "unassigned", input.sponsorId, input.gameId]);

    const existing = this.escrows.get(escrowId);

    if (existing) {
      return existing;
    }

    const record: EscrowRecord = {
      escrowId,
      sponsorId: input.sponsorId,
      gameId: input.gameId,
      matchId: input.matchId,
      status: "funding_required",
      fundedAmountUsd: roundUsd(input.fundedAmountUsd),
      reservedAmountUsd: 0,
      releasedAmountUsd: 0,
      currency: input.currency ?? "USDC",
      isSimulated: true,
      createdAt: nowIso,
      updatedAt: nowIso,
      timeline: [
        appendEscrowTimeline("draft", nowIso, "escrow placeholder created"),
        appendEscrowTimeline("funding_required", nowIso, "awaiting simulated sponsor funding"),
      ],
    };

    this.escrows.set(escrowId, record);
    return record;
  }

  authorizeEscrow(escrowId: string, note?: string): EscrowRecord {
    return this.transitionEscrow(escrowId, "funding_authorized", note);
  }

  fundEscrow(escrowId: string, note?: string): EscrowRecord {
    return this.transitionEscrow(escrowId, "funded_simulated", note);
  }

  lockEscrow(escrowId: string, note?: string): EscrowRecord {
    const escrow = this.transitionEscrow(escrowId, "locked", note);
    if (escrow.reservedAmountUsd === escrow.fundedAmountUsd) {
      return escrow;
    }

    const updated: EscrowRecord = {
      ...escrow,
      reservedAmountUsd: escrow.fundedAmountUsd,
      updatedAt: this.clock.nowIso(),
      timeline: pushLifecycleEvent(
        escrow.timeline,
        "locked",
        this.clock.nowIso(),
        note ?? "funds reserved for match settlement",
        {
          reservedAmountUsd: escrow.fundedAmountUsd,
        },
      ),
    };

    this.escrows.set(escrowId, updated);
    return updated;
  }

  createPayouts(input: MatchSettlementInput): PayoutLedgerRecord[] {
    const existingPayouts = Array.from(this.payouts.values()).filter(
      (record) => record.matchId === input.result.matchId && record.escrowId === input.escrowId,
    );
    if (existingPayouts.length > 0) {
      return existingPayouts.sort((left, right) => left.payoutId.localeCompare(right.payoutId));
    }

    const nowIso = this.clock.nowIso();
    const escrow = this.requireEscrow(input.escrowId);
    const settlementStrategy = input.strategy ?? "winners_equally";
    const settlementEscrow = escrow.status === "locked"
      ? this.transitionEscrow(escrow.escrowId, "settlement_pending", "settlement started")
      : escrow.status === "settlement_pending" || escrow.status === "settled"
        ? escrow
        : this.transitionEscrow(
            this.lockEscrow(escrow.escrowId, "auto-lock before settlement").escrowId,
            "settlement_pending",
            "settlement started",
          );

    const allocations = computeSeatAllocation(
      input.result,
      settlementEscrow.fundedAmountUsd,
      settlementStrategy,
    );

    const payoutRecords = allocations.map(({ seatId, amountUsd }, index) => {
      const playerId = input.seatToPlayerId[seatId];

      if (!playerId) {
        throw new Error(`Missing player mapping for seat ${seatId}`);
      }

      const payoutId = createStableId("payout", [input.result.matchId, seatId, index + 1]);
      const timeline = [appendPayoutTimeline("pending_settlement", nowIso, "result accepted")];
      const availableTimeline = appendPayoutTimeline(
        "available_to_claim",
        nowIso,
        "simulated payout can now be claimed",
      );
      const payout: PayoutLedgerRecord = {
        payoutId,
        playerId,
        seatId,
        escrowId: settlementEscrow.escrowId,
        matchId: input.result.matchId,
        amountUsd,
        currency: settlementEscrow.currency,
        status: mapPayoutLifecycleStatus("available_to_claim"),
        lifecycleStatus: "available_to_claim",
        createdAt: nowIso,
        updatedAt: nowIso,
        isSimulated: true,
        timeline: [...timeline, availableTimeline],
      };

      this.payouts.set(payoutId, payout);
      this.applyPendingToWallet(playerId, amountUsd, nowIso);

      return payout;
    });

    const settledEscrow: EscrowRecord = {
      ...this.requireEscrow(settlementEscrow.escrowId),
      status: "settled",
      releasedAmountUsd: roundUsd(payoutRecords.reduce((sum, payout) => sum + payout.amountUsd, 0)),
      updatedAt: nowIso,
      timeline: pushLifecycleEvent(
        this.requireEscrow(settlementEscrow.escrowId).timeline,
        "settled",
        nowIso,
        "simulated settlement completed",
        {
          payoutCount: payoutRecords.length,
        },
      ),
    };

    this.escrows.set(settlementEscrow.escrowId, settledEscrow);
    return payoutRecords;
  }

  requestPayoutClaim(payoutId: string, note?: string): PayoutLedgerRecord {
    const nowIso = this.clock.nowIso();
    const payout = this.requirePayout(payoutId);
    const claimRequested: PayoutLedgerRecord = {
      ...payout,
      lifecycleStatus: "claim_requested",
      status: mapPayoutLifecycleStatus("claim_requested"),
      updatedAt: nowIso,
      timeline: pushLifecycleEvent(
        payout.timeline,
        "claim_requested",
        nowIso,
        note ?? "claim requested by player",
      ),
    };
    const claimed: PayoutLedgerRecord = {
      ...claimRequested,
      lifecycleStatus: "claimed_simulated",
      status: mapPayoutLifecycleStatus("claimed_simulated"),
      updatedAt: nowIso,
      simulatedTransactionId: createStableId("tx", [claimRequested.payoutId, nowIso]),
      timeline: pushLifecycleEvent(
        claimRequested.timeline,
        "claimed_simulated",
        nowIso,
        "stub payout marked as claimed",
      ),
    };

    this.payouts.set(payoutId, claimed);
    this.applyClaimToWallet(claimed.playerId, claimed.amountUsd, nowIso);

    return claimed;
  }

  getPlayerSnapshot(playerId: PlayerId): PlayerPaymentsSnapshot {
    const wallet = this.getWalletSummary(playerId);
    const payouts = Array.from(this.payouts.values()).filter((record) => record.playerId === playerId);
    const playerEscrowIds = new Set(payouts.map((record) => record.escrowId));
    const escrowSummaries = Array.from(this.escrows.values()).filter((record) =>
      playerEscrowIds.has(record.escrowId),
    );

    return {
      wallet,
      payouts,
      escrowSummaries,
    };
  }

  getEscrow(escrowId: string): EscrowRecord {
    return this.requireEscrow(escrowId);
  }

  getPayout(payoutId: string): PayoutLedgerRecord {
    return this.requirePayout(payoutId);
  }

  private ensureWallet(playerId: PlayerId): WalletStubRecord {
    const existing = this.wallets.get(playerId);

    if (existing) {
      return existing;
    }

    const nowIso = this.clock.nowIso();
    const record: WalletStubRecord = {
      playerId,
      walletAddress: createStubWalletAddress(playerId),
      availableUsd: 0,
      pendingUsd: 0,
      totalEarnedUsd: 0,
      connectionStatus: "connected",
      network: "stub-local",
      isSimulated: true,
      createdAt: nowIso,
      lastUpdatedAt: nowIso,
    };

    this.wallets.set(playerId, record);
    return record;
  }

  private requireEscrow(escrowId: string): EscrowRecord {
    const escrow = this.escrows.get(escrowId);

    if (!escrow) {
      throw new Error(`Unknown escrow ${escrowId}`);
    }

    return escrow;
  }

  private requirePayout(payoutId: string): PayoutLedgerRecord {
    const payout = this.payouts.get(payoutId);

    if (!payout) {
      throw new Error(`Unknown payout ${payoutId}`);
    }

    return payout;
  }

  private transitionEscrow(
    escrowId: string,
    status: EscrowRecord["status"],
    note?: string,
  ): EscrowRecord {
    const nowIso = this.clock.nowIso();
    const escrow = this.requireEscrow(escrowId);
    const updated: EscrowRecord = {
      ...escrow,
      status,
      updatedAt: nowIso,
      timeline: pushLifecycleEvent(
        escrow.timeline,
        status,
        nowIso,
        note ?? `escrow transitioned to ${status}`,
      ),
    };

    this.escrows.set(escrowId, updated);
    return updated;
  }

  private applyPendingToWallet(playerId: PlayerId, amountUsd: number, nowIso: string): void {
    const wallet = this.ensureWallet(playerId);
    const updated: WalletStubRecord = {
      ...wallet,
      pendingUsd: roundUsd(wallet.pendingUsd + amountUsd),
      totalEarnedUsd: roundUsd(wallet.totalEarnedUsd + amountUsd),
      lastUpdatedAt: nowIso,
    };

    this.wallets.set(playerId, updated);
  }

  private applyClaimToWallet(playerId: PlayerId, amountUsd: number, nowIso: string): void {
    const wallet = this.ensureWallet(playerId);
    const updated: WalletStubRecord = {
      ...wallet,
      pendingUsd: roundUsd(Math.max(0, wallet.pendingUsd - amountUsd)),
      availableUsd: roundUsd(wallet.availableUsd + amountUsd),
      lastUpdatedAt: nowIso,
    };

    this.wallets.set(playerId, updated);
  }
}

export function createInMemoryPaymentsEngine(
  options: InMemoryPaymentsEngineOptions = {},
): InMemoryPaymentsEngine {
  return new InMemoryPaymentsEngine(options);
}

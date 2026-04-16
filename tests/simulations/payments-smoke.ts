import assert from "node:assert/strict";

import { createInMemoryPaymentsEngine } from "@arena/payments";
import type { MatchResult } from "@arena/contracts";

const timestamps = [
  "2026-04-16T09:00:00.000Z",
  "2026-04-16T09:00:01.000Z",
  "2026-04-16T09:00:02.000Z",
  "2026-04-16T09:00:03.000Z",
  "2026-04-16T09:00:04.000Z",
  "2026-04-16T09:00:05.000Z",
  "2026-04-16T09:00:06.000Z",
  "2026-04-16T09:00:07.000Z",
  "2026-04-16T09:00:08.000Z",
];

let timestampIndex = 0;

const engine = createInMemoryPaymentsEngine({
  clock: {
    nowIso: () => timestamps[Math.min(timestampIndex++, timestamps.length - 1)],
  },
});

engine.connectWallet({
  playerId: "player-alpha",
  initialAvailableUsd: 5,
});
engine.connectWallet({
  playerId: "player-beta",
  initialAvailableUsd: 0,
});

const escrow = engine.createEscrow({
  escrowId: "escrow_demo_auction",
  sponsorId: "demo-sponsor",
  gameId: "auction",
  matchId: "match-auction-demo",
  fundedAmountUsd: 30,
});

assert.equal(escrow.status, "funding_required");

engine.authorizeEscrow(escrow.escrowId);
engine.fundEscrow(escrow.escrowId);
const locked = engine.lockEscrow(escrow.escrowId);

assert.equal(locked.status, "locked");
assert.equal(locked.reservedAmountUsd, 30);

const result: MatchResult = {
  matchId: "match-auction-demo",
  game: "auction",
  roomId: "room-demo",
  completedAt: "2026-04-16T09:15:00.000Z",
  winningSeatIds: ["seat-a"],
  seatScores: {
    "seat-a": 15,
    "seat-b": 5,
  },
  behavioralOutput: [],
};

const payouts = engine.createPayouts({
  escrowId: escrow.escrowId,
  result,
  seatToPlayerId: {
    "seat-a": "player-alpha",
    "seat-b": "player-beta",
  },
});

assert.equal(payouts.length, 1);
assert.equal(payouts[0].playerId, "player-alpha");
assert.equal(payouts[0].amountUsd, 30);
assert.equal(payouts[0].lifecycleStatus, "available_to_claim");

const claimed = engine.requestPayoutClaim(payouts[0].payoutId);

assert.equal(claimed.lifecycleStatus, "claimed_simulated");
assert.equal(claimed.status, "paid");
assert.ok(claimed.simulatedTransactionId);

const winnerSnapshot = engine.getPlayerSnapshot("player-alpha");
assert.equal(winnerSnapshot.wallet.availableUsd, 35);
assert.equal(winnerSnapshot.wallet.pendingUsd, 0);
assert.equal(winnerSnapshot.payouts[0].lifecycleStatus, "claimed_simulated");

console.log("payments smoke test passed");

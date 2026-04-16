import assert from "node:assert/strict";
import test from "node:test";

process.env.API_BASE_URL = "http://127.0.0.1:9";
process.env.ROOMS_BASE_URL = "http://127.0.0.1:9";

test("fallback service data stays coherent across rooms, results, payments, and profile", async () => {
  const serviceData = await import("../../apps/web/lib/service-data.ts");
  const profileData = await import("../../apps/web/app/(app)/profile/data.ts");
  const resultsData = await import("../../apps/web/app/(app)/results/data.ts");

  const [roomsSnapshot, leaderboardSnapshot, paymentsSnapshot, profileSnapshot, resultsSnapshot] =
    await Promise.all([
      serviceData.getRoomsSnapshot(),
      serviceData.getLeaderboardSnapshot("global", 8),
      serviceData.getPaymentsSnapshot("demo-player"),
      profileData.getProfileSnapshot("demo-player"),
      resultsData.getResultsSnapshot("demo-vault-results"),
    ]);

  assert.equal(roomsSnapshot.source, "fallback");
  assert.ok(roomsSnapshot.data.some((room) => room.roomId === "demo-auction-room"));

  const completedGames = new Set(
    roomsSnapshot.data.filter((room) => room.phase === "results").map((room) => room.game),
  );
  assert.deepEqual(
    completedGames,
    new Set(["auction", "split", "pact", "vault", "settlement"]),
  );

  assert.equal(leaderboardSnapshot.source, "fallback");
  assert.ok(leaderboardSnapshot.data.entries.some((entry) => entry.playerId === "demo-player"));
  assert.ok(leaderboardSnapshot.data.entries.length >= 6);

  assert.equal(paymentsSnapshot.source, "fallback");
  assert.equal(paymentsSnapshot.data.wallet.playerId, "demo-player");
  assert.ok(paymentsSnapshot.data.escrowSummaries.length >= 4);
  assert.ok(paymentsSnapshot.data.payouts.length >= 4);

  const historyGames = new Set(profileSnapshot.history.map((item) => item.game));
  assert.equal(profileSnapshot.playerId, "demo-player");
  assert.deepEqual(
    historyGames,
    new Set(["auction", "split", "pact", "vault", "settlement"]),
  );

  assert.equal(resultsSnapshot.source, "fallback");
  assert.equal(resultsSnapshot.state, "completed");
  assert.equal(resultsSnapshot.room?.game, "vault");
  assert.equal(resultsSnapshot.matchLedger?.payments?.escrowId, "escrow-demo-vault");
  assert.equal(resultsSnapshot.replay?.events.at(-1)?.type, "match.result");
});

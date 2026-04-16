import assert from "node:assert/strict";

import type { SeatAssignment } from "@arena/contracts";
import type { SplitActionEnvelope, SplitPublicState } from "@arena/game-split";
import { splitModule } from "@arena/game-split";

function makeSeat(id: string, name: string): SeatAssignment {
  return {
    publicSeat: {
      seatId: id,
      displayName: name,
      avatarId: `${id}-avatar`,
      isConnected: true,
      isReady: true,
    },
    privateSeat: {
      seatId: id,
      backingType: "scripted",
    },
  };
}

function runScenario(actions: SplitActionEnvelope[]) {
  const seats = [makeSeat("alpha", "Seat Alpha"), makeSeat("beta", "Seat Beta")];
  let state = splitModule.createInitialState("split-seed", seats);
  let publicState = splitModule.projectPublicState(state, "alpha");
  let nowIso = "2026-01-01T00:00:00.000Z";

  for (const action of actions) {
    const result = splitModule.reduce(
      { seed: "split-seed", nowIso, state, seats },
      action,
    );
    state = result.nextState;
    publicState = result.publicState;
    nowIso = new Date(Date.parse(nowIso) + 1_000).toISOString();
  }

  const matchResult = splitModule.finalizeMatch(state, {
    roomId: "room-split-smoke",
    matchId: "match-split-smoke",
    game: "split",
    phase: state.phase,
    round: state.roundIndex,
    seats: publicState.seats.map((seat) => ({
      seatId: seat.seatId,
      displayName: seat.displayName,
      avatarId: seat.avatarId,
      isConnected: seat.isConnected,
      isReady: seat.isReady,
      score: seat.score,
    })),
    publicState,
    lastEventAt: nowIso,
  });

  return { state, publicState, matchResult };
}

function metricValue(publicState: SplitPublicState, key: keyof SplitPublicState) {
  return publicState[key];
}

const alphaEdge = runScenario([
  { seatId: "alpha", submittedAt: "2026-01-01T00:00:00.000Z", action: { type: "split.offer", amount: 40 } },
  { seatId: "beta", submittedAt: "2026-01-01T00:00:01.000Z", action: { type: "split.accept" } },
  { seatId: "beta", submittedAt: "2026-01-01T00:00:02.000Z", action: { type: "split.offer", amount: 20 } },
  { seatId: "alpha", submittedAt: "2026-01-01T00:00:03.000Z", action: { type: "split.reject" } },
  { seatId: "alpha", submittedAt: "2026-01-01T00:00:04.000Z", action: { type: "split.offer", amount: 50 } },
  { seatId: "beta", submittedAt: "2026-01-01T00:00:05.000Z", action: { type: "split.accept" } },
  { seatId: "beta", submittedAt: "2026-01-01T00:00:06.000Z", action: { type: "split.offer", amount: 70 } },
  { seatId: "alpha", submittedAt: "2026-01-01T00:00:07.000Z", action: { type: "split.accept" } },
]);

assert.deepEqual(alphaEdge.matchResult.winningSeatIds, ["alpha"]);
assert.equal(alphaEdge.matchResult.seatScores.alpha, 180);
assert.equal(alphaEdge.matchResult.seatScores.beta, 120);
assert.equal(
  alphaEdge.matchResult.behavioralOutput.find((metric) => metric.metricKey === "split.accepted_rounds")?.value,
  3,
);
assert.equal(
  alphaEdge.matchResult.behavioralOutput.find((metric) => metric.metricKey === "split.rejected_rounds")?.value,
  1,
);
assert.equal(metricValue(alphaEdge.publicState, "agreementRate"), 0.75);
assert.equal(metricValue(alphaEdge.publicState, "averageOfferShare"), 0.45);
assert.equal(alphaEdge.publicState.history[1]?.fairnessBand, "predatory");
assert.equal(alphaEdge.publicState.history[3]?.fairnessBand, "generous");
assert.equal(alphaEdge.publicState.fairnessPulse, "generous");

const deadlock = runScenario([
  { seatId: "alpha", submittedAt: "2026-01-01T00:10:00.000Z", action: { type: "split.offer", amount: 10 } },
  { seatId: "beta", submittedAt: "2026-01-01T00:10:01.000Z", action: { type: "split.reject" } },
  { seatId: "beta", submittedAt: "2026-01-01T00:10:02.000Z", action: { type: "split.offer", amount: 15 } },
  { seatId: "alpha", submittedAt: "2026-01-01T00:10:03.000Z", action: { type: "split.reject" } },
  { seatId: "alpha", submittedAt: "2026-01-01T00:10:04.000Z", action: { type: "split.offer", amount: 25 } },
  { seatId: "beta", submittedAt: "2026-01-01T00:10:05.000Z", action: { type: "split.reject" } },
  { seatId: "beta", submittedAt: "2026-01-01T00:10:06.000Z", action: { type: "split.offer", amount: 30 } },
  { seatId: "alpha", submittedAt: "2026-01-01T00:10:07.000Z", action: { type: "split.reject" } },
]);

assert.deepEqual(deadlock.matchResult.winningSeatIds, ["alpha", "beta"]);
assert.equal(deadlock.matchResult.seatScores.alpha, 0);
assert.equal(deadlock.matchResult.seatScores.beta, 0);
assert.equal(deadlock.publicState.phase, "settled");
assert.equal(deadlock.publicState.agreementRate, 0);
assert.equal(deadlock.publicState.averageOfferShare, 0.2);
assert.equal(deadlock.publicState.lowOfferShareThreshold, 0.3);
assert.ok(deadlock.publicState.history.every((round) => round.decision === "rejected"));
assert.ok(deadlock.publicState.history.every((round) => round.fairnessBand === "predatory"));
assert.equal(
  deadlock.matchResult.behavioralOutput.find((metric) => metric.metricKey === "split.low_offer_rejections")?.value,
  4,
);

console.log("split smoke test passed");

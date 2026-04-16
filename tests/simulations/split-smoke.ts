import assert from "node:assert/strict";

import type { SeatAssignment } from "@arena/contracts";
import type { SplitActionEnvelope } from "@arena/game-split";
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
  let publicState = splitModule.projectPublicState(state);
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

  return splitModule.finalizeMatch(state, {
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
}

const matchResult = runScenario([
  { seatId: "alpha", submittedAt: "2026-01-01T00:00:00.000Z", action: { type: "split.offer", amount: 40 } },
  { seatId: "beta", submittedAt: "2026-01-01T00:00:01.000Z", action: { type: "split.accept" } },
  { seatId: "beta", submittedAt: "2026-01-01T00:00:02.000Z", action: { type: "split.offer", amount: 20 } },
  { seatId: "alpha", submittedAt: "2026-01-01T00:00:03.000Z", action: { type: "split.reject" } },
  { seatId: "alpha", submittedAt: "2026-01-01T00:00:04.000Z", action: { type: "split.offer", amount: 50 } },
  { seatId: "beta", submittedAt: "2026-01-01T00:00:05.000Z", action: { type: "split.accept" } },
  { seatId: "beta", submittedAt: "2026-01-01T00:00:06.000Z", action: { type: "split.offer", amount: 70 } },
  { seatId: "alpha", submittedAt: "2026-01-01T00:00:07.000Z", action: { type: "split.accept" } },
]);

assert.deepEqual(matchResult.winningSeatIds, ["alpha"]);
assert.equal(matchResult.seatScores.alpha, 180);
assert.equal(matchResult.seatScores.beta, 120);
assert.equal(
  matchResult.behavioralOutput.find((metric) => metric.metricKey === "split.accepted_rounds")?.value,
  3,
);
assert.equal(
  matchResult.behavioralOutput.find((metric) => metric.metricKey === "split.rejected_rounds")?.value,
  1,
);

console.log("split smoke test passed");

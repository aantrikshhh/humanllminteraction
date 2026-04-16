import assert from "node:assert/strict";

import type { SeatAssignment } from "@arena/contracts";
import { pactModule } from "@arena/game-pact";

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

const seats = [makeSeat("a", "Seat A"), makeSeat("b", "Seat B")];
let state = pactModule.createInitialState("pact-smoke-seed", seats);
let now = new Date("2026-01-01T00:00:00.000Z").getTime();

const rounds: Array<[aChoice: "cooperate" | "betray", bChoice: "cooperate" | "betray"]> = [
  ["cooperate", "cooperate"],
  ["cooperate", "betray"],
  ...Array.from({ length: 13 }, () => ["betray", "betray"] as const),
];

for (const [aChoice, bChoice] of rounds) {
  state = pactModule.reduce(
    {
      seed: "pact-smoke-seed",
      nowIso: new Date(now).toISOString(),
      state,
      seats,
    },
    {
      seatId: "a",
      submittedAt: new Date(now).toISOString(),
      action: { type: "pact.choose", choice: aChoice },
    },
  ).nextState;

  now += 1_000;

  state = pactModule.reduce(
    {
      seed: "pact-smoke-seed",
      nowIso: new Date(now).toISOString(),
      state,
      seats,
    },
    {
      seatId: "b",
      submittedAt: new Date(now).toISOString(),
      action: { type: "pact.choose", choice: bChoice },
    },
  ).nextState;

  now += 1_000;
}

const publicState = pactModule.projectPublicState(state);
assert.equal(publicState.phase, "match_complete");
assert.equal(publicState.history.length, 15);
assert.equal(publicState.seats.find((seat) => seat.seatId === "a")?.score, 1600);
assert.equal(publicState.seats.find((seat) => seat.seatId === "b")?.score, 2100);

const result = pactModule.finalizeMatch(state, {
  roomId: "room-pact-smoke",
  matchId: "match-pact-smoke",
  game: "pact",
  phase: "results",
  round: 15,
  seats: publicState.seats,
  publicState,
  lastEventAt: new Date(now).toISOString(),
});

assert.deepEqual(result.winningSeatIds, ["b"]);
assert.equal(result.seatScores.a, 1600);
assert.equal(result.seatScores.b, 2100);

const strategyA = result.behavioralOutput.find((metric) => metric.metricKey === "pact.strategy_label.a");
const retaliationA = result.behavioralOutput.find(
  (metric) => metric.metricKey === "pact.retaliation_rate.a",
);
const cooperationB = result.behavioralOutput.find(
  (metric) => metric.metricKey === "pact.cooperation_rate.b",
);

assert.equal(strategyA?.value, "tit_for_tat");
assert.equal(retaliationA?.value, 1);
assert.equal(cooperationB?.value, 0.067);

console.log("pact smoke test passed");

import assert from "node:assert/strict";

import type { SeatAssignment, SeatBackingType } from "@arena/contracts";
import {
  settlementModule,
  type SettlementActionEnvelope,
} from "@arena/game-settlement";

function makeSeat(
  seatId: string,
  displayName: string,
  backingType: SeatBackingType,
): SeatAssignment {
  return {
    publicSeat: {
      seatId,
      displayName,
      avatarId: `${seatId}-avatar`,
      isConnected: true,
      isReady: true,
    },
    privateSeat: {
      seatId,
      backingType,
    },
  };
}

const seats = [
  makeSeat("a", "North Dock", "human"),
  makeSeat("b", "Stone Row", "llm"),
  makeSeat("c", "Old Orchard", "scripted"),
];

const actions: SettlementActionEnvelope[] = [
  { seatId: "a", submittedAt: "2026-01-01T00:00:00.000Z", action: { type: "settlement.pledge", pledge: 2, stance: "fortify" } },
  { seatId: "b", submittedAt: "2026-01-01T00:00:01.000Z", action: { type: "settlement.pledge", pledge: 2, stance: "trade" } },
  { seatId: "c", submittedAt: "2026-01-01T00:00:02.000Z", action: { type: "settlement.pledge", pledge: 2, stance: "appease" } },
  { seatId: "a", submittedAt: "2026-01-01T00:00:03.000Z", action: { type: "settlement.commit", contribution: 2 } },
  { seatId: "b", submittedAt: "2026-01-01T00:00:04.000Z", action: { type: "settlement.commit", contribution: 2 } },
  { seatId: "c", submittedAt: "2026-01-01T00:00:05.000Z", action: { type: "settlement.commit", contribution: 2 } },
  { seatId: "a", submittedAt: "2026-01-01T00:00:06.000Z", action: { type: "settlement.pledge", pledge: 1, stance: "trade" } },
  { seatId: "b", submittedAt: "2026-01-01T00:00:07.000Z", action: { type: "settlement.pledge", pledge: 3, stance: "fortify" } },
  { seatId: "c", submittedAt: "2026-01-01T00:00:08.000Z", action: { type: "settlement.pledge", pledge: 1, stance: "appease" } },
  { seatId: "a", submittedAt: "2026-01-01T00:00:09.000Z", action: { type: "settlement.commit", contribution: 1 } },
];

let state = settlementModule.createInitialState("settlement-smoke-seed", seats);
let nowIso = "2026-01-01T00:00:00.000Z";

for (const action of actions) {
  const result = settlementModule.reduce(
    {
      seed: "settlement-smoke-seed",
      nowIso,
      state,
      seats,
    },
    action,
  );
  state = result.nextState;
  nowIso = new Date(Date.parse(nowIso) + 1_000).toISOString();
}

const hiddenPublicState = settlementModule.projectPublicState(state, "b");

assert.equal(hiddenPublicState.phase, "commit");
assert.deepEqual(hiddenPublicState.currentRound.lockedSeatIds, ["a"]);
assert.deepEqual(hiddenPublicState.currentRound.revealedContributions, {});
assert.equal(hiddenPublicState.seats.find((seat) => seat.seatId === "a")?.revealedContribution, undefined);
assert.equal(hiddenPublicState.currentRound.viewerPendingContribution, undefined);

const finishingActions: SettlementActionEnvelope[] = [
  { seatId: "b", submittedAt: nowIso, action: { type: "settlement.commit", contribution: 2 } },
  { seatId: "c", submittedAt: "2026-01-01T00:00:11.000Z", action: { type: "settlement.commit", contribution: 0 } },
  { seatId: "a", submittedAt: "2026-01-01T00:00:12.000Z", action: { type: "settlement.pledge", pledge: 2, stance: "fortify" } },
  { seatId: "b", submittedAt: "2026-01-01T00:00:13.000Z", action: { type: "settlement.pledge", pledge: 1, stance: "trade" } },
  { seatId: "c", submittedAt: "2026-01-01T00:00:14.000Z", action: { type: "settlement.pledge", pledge: 2, stance: "appease" } },
  { seatId: "a", submittedAt: "2026-01-01T00:00:15.000Z", action: { type: "settlement.commit", contribution: 2 } },
  { seatId: "b", submittedAt: "2026-01-01T00:00:16.000Z", action: { type: "settlement.commit", contribution: 1 } },
  { seatId: "c", submittedAt: "2026-01-01T00:00:17.000Z", action: { type: "settlement.commit", contribution: 2 } },
];

for (const action of finishingActions) {
  const result = settlementModule.reduce(
    {
      seed: "settlement-smoke-seed",
      nowIso,
      state,
      seats,
    },
    action,
  );
  state = result.nextState;
  nowIso = new Date(Date.parse(nowIso) + 1_000).toISOString();
}

const finalPublicState = settlementModule.projectPublicState(state, "a");

assert.equal(finalPublicState.phase, "settled");
assert.deepEqual(finalPublicState.winnerSeatIds, ["a"]);

const result = settlementModule.finalizeMatch(state, {
  roomId: "room-settlement-smoke",
  matchId: "match-settlement-smoke",
  game: "settlement",
  phase: state.phase,
  round: state.roundIndex,
  seats: finalPublicState.seats.map((seat) => ({
    seatId: seat.seatId,
    displayName: seat.displayName,
    avatarId: seat.avatarId,
    isConnected: seat.isConnected,
    isReady: seat.isReady,
    score: seat.score,
  })),
  publicState: finalPublicState,
  lastEventAt: nowIso,
});

assert.deepEqual(result.winningSeatIds, ["a"]);
assert.equal(result.seatScores.a, 13);
assert.equal(result.seatScores.b, 9);
assert.equal(result.seatScores.c, 10);
assert.equal(
  result.behavioralOutput.find((metric) => metric.metricKey === "settlement.broken_pledges")?.value,
  2,
);

console.log("settlement smoke test passed");

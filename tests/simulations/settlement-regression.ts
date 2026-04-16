import assert from "node:assert/strict";

import type { SeatAssignment, SeatBackingType } from "@arena/contracts";
import {
  coerceSettlementToTerminal,
  settlementModule,
  validateSettlementAction,
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

function applySequence(actions: SettlementActionEnvelope[]) {
  let state = settlementModule.createInitialState("settlement-regression-seed", seats);
  let nowIso = "2026-01-01T00:00:00.000Z";

  for (const action of actions) {
    const result = settlementModule.reduce(
      {
        seed: "settlement-regression-seed",
        nowIso,
        state,
        seats,
      },
      action,
    );
    state = result.nextState;
    nowIso = new Date(Date.parse(nowIso) + 1_000).toISOString();
  }

  return { state, nowIso };
}

const partialRound = applySequence([
  { seatId: "a", submittedAt: "2026-01-01T00:00:00.000Z", action: { type: "settlement.pledge", pledge: 2, stance: "fortify" } },
  { seatId: "b", submittedAt: "2026-01-01T00:00:01.000Z", action: { type: "settlement.pledge", pledge: 1, stance: "trade" } },
  { seatId: "c", submittedAt: "2026-01-01T00:00:02.000Z", action: { type: "settlement.pledge", pledge: 2, stance: "appease" } },
  { seatId: "a", submittedAt: "2026-01-01T00:00:03.000Z", action: { type: "settlement.commit", contribution: 2 } },
]);

const viewerAState = settlementModule.projectPublicState(partialRound.state, "a");
const viewerBState = settlementModule.projectPublicState(partialRound.state, "b");

assert.equal(viewerAState.phase, "commit");
assert.deepEqual(viewerAState.currentRound.lockedSeatIds, ["a"]);
assert.equal(viewerAState.currentRound.viewerPendingContribution, 2);
assert.equal(viewerBState.currentRound.viewerPendingContribution, undefined);
assert.deepEqual(viewerBState.currentRound.revealedContributions, {});

assert.throws(
  () =>
    validateSettlementAction(partialRound.state, {
      seatId: "a",
      submittedAt: partialRound.nowIso,
      action: { type: "settlement.commit", contribution: 4 },
    }),
  /not seat a's turn|cannot exceed 3/i,
);

assert.throws(
  () =>
    validateSettlementAction(partialRound.state, {
      seatId: "b",
      submittedAt: partialRound.nowIso,
      action: { type: "settlement.pledge", pledge: 1, stance: "trade" },
    }),
  /expects a commit action/i,
);

const coerced = coerceSettlementToTerminal(partialRound.state, partialRound.nowIso);
const projectedFinal = settlementModule.projectPublicState(coerced, "a");
const finalized = settlementModule.finalizeMatch(coerced, {
  roomId: "room-settlement-regression",
  matchId: "match-settlement-regression",
  game: "settlement",
  phase: projectedFinal.phase,
  round: projectedFinal.roundIndex,
  seats: projectedFinal.seats,
  publicState: projectedFinal,
  lastEventAt: partialRound.nowIso,
});

assert.equal(coerced.phase, "settled");
assert.equal(projectedFinal.history.length, 3);
assert.equal(finalized.winningSeatIds.length >= 1, true);
assert.equal(
  finalized.behavioralOutput.find((metric) => metric.metricKey === "settlement.rounds_completed")?.value,
  3,
);
assert.ok(
  finalized.behavioralOutput.some(
    (metric) => metric.metricKey === "settlement.support_minus_pledge",
  ),
);

console.log("settlement regression test passed");

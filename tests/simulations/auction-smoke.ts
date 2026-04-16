import assert from "node:assert/strict";

import { auctionModule } from "@arena/game-auction";
import type { SeatAssignment } from "@arena/contracts";
import type { AuctionActionEnvelope } from "@arena/game-auction";

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

function runScenario(
  seatIds: string[],
  actions: AuctionActionEnvelope[],
): ReturnType<typeof auctionModule.finalizeMatch> {
  const seats = seatIds.map((id, index) => makeSeat(id, `Seat ${index + 1}`));
  let state = auctionModule.createInitialState("auction-smoke-seed", seats);
  let lastPublicState = auctionModule.projectPublicState(state);
  let lastEventAt = new Date("2026-01-01T00:00:00.000Z").toISOString();

  for (const action of actions) {
    const result = auctionModule.reduce(
      { seed: "auction-smoke-seed", nowIso: lastEventAt, state, seats },
      action,
    );
    state = result.nextState;
    lastPublicState = result.publicState;
    lastEventAt = new Date(Date.parse(lastEventAt) + 1_000).toISOString();
  }

  return auctionModule.finalizeMatch(state, {
    roomId: "room-smoke",
    matchId: "match-smoke",
    game: "auction",
    phase: state.phase,
    round: state.turnIndex,
    seats: lastPublicState.seats.map((seat) => ({
      seatId: seat.seatId,
      displayName: seat.displayName,
      avatarId: seat.avatarId,
      isConnected: seat.isConnected,
      isReady: seat.isReady,
      score: seat.score,
    })),
    publicState: lastPublicState,
    lastEventAt,
  });
}

const biddingResult = runScenario(
  ["a", "b", "c"],
  [
    { seatId: "a", submittedAt: "2026-01-01T00:00:00.000Z", action: { type: "auction.bid", amount: 3 } },
    { seatId: "b", submittedAt: "2026-01-01T00:00:01.000Z", action: { type: "auction.pass" } },
    { seatId: "c", submittedAt: "2026-01-01T00:00:02.000Z", action: { type: "auction.bid", amount: 5 } },
    { seatId: "a", submittedAt: "2026-01-01T00:00:03.000Z", action: { type: "auction.pass" } },
    { seatId: "b", submittedAt: "2026-01-01T00:00:04.000Z", action: { type: "auction.bid", amount: 4 } },
    { seatId: "c", submittedAt: "2026-01-01T00:00:05.000Z", action: { type: "auction.pass" } },
    { seatId: "a", submittedAt: "2026-01-01T00:00:06.000Z", action: { type: "auction.bid", amount: 5 } },
    { seatId: "b", submittedAt: "2026-01-01T00:00:07.000Z", action: { type: "auction.pass" } },
    { seatId: "c", submittedAt: "2026-01-01T00:00:08.000Z", action: { type: "auction.bid", amount: 2 } },
    { seatId: "a", submittedAt: "2026-01-01T00:00:09.000Z", action: { type: "auction.pass" } },
    { seatId: "b", submittedAt: "2026-01-01T00:00:10.000Z", action: { type: "auction.pass" } },
  ],
);

assert.deepEqual(biddingResult.winningSeatIds, ["c"]);
assert.equal(biddingResult.seatScores.a, 1);
assert.equal(biddingResult.seatScores.b, -4);
assert.equal(biddingResult.seatScores.c, 12);

const passResult = runScenario(
  ["x", "y", "z"],
  [
    { seatId: "x", submittedAt: "2026-01-01T01:00:00.000Z", action: { type: "auction.pass" } },
    { seatId: "y", submittedAt: "2026-01-01T01:00:01.000Z", action: { type: "auction.pass" } },
    { seatId: "y", submittedAt: "2026-01-01T01:00:02.000Z", action: { type: "auction.pass" } },
    { seatId: "z", submittedAt: "2026-01-01T01:00:03.000Z", action: { type: "auction.pass" } },
    { seatId: "z", submittedAt: "2026-01-01T01:00:04.000Z", action: { type: "auction.pass" } },
    { seatId: "x", submittedAt: "2026-01-01T01:00:05.000Z", action: { type: "auction.pass" } },
  ],
);

assert.deepEqual(passResult.winningSeatIds, ["z"]);
assert.equal(passResult.seatScores.x, 9);
assert.equal(passResult.seatScores.y, 7);
assert.equal(passResult.seatScores.z, 12);

console.log("auction smoke test passed");

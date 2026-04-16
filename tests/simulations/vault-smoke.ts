import assert from "node:assert/strict";

import type { PublicRoomState, SeatAssignment } from "@arena/contracts";
import {
  type VaultActionEnvelope,
  type VaultPublicState,
  vaultModule,
} from "@arena/game-vault";

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

function makeRoomState(
  state: ReturnType<typeof vaultModule.createInitialState>,
  publicState: VaultPublicState,
  lastEventAt: string,
): PublicRoomState<VaultPublicState> {
  return {
    roomId: "room-vault-smoke",
    matchId: "match-vault-smoke",
    game: "vault",
    phase: state.phase === "match_complete" ? "results" : "active",
    round: state.roundNumber,
    seats: publicState.seats.map((seat) => ({
      seatId: seat.seatId,
      displayName: seat.displayName,
      avatarId: seat.avatarId,
      isConnected: seat.isConnected,
      isReady: seat.isReady,
      score: seat.totalScore,
    })),
    publicState,
    lastEventAt,
  };
}

function playRound(
  state: ReturnType<typeof vaultModule.createInitialState>,
  seats: SeatAssignment[],
  contributions: Record<string, number>,
  accusations: Record<string, string>,
  lastEventAt: string,
): {
  state: ReturnType<typeof vaultModule.createInitialState>;
  publicState: VaultPublicState;
  lastEventAt: string;
} {
  let nextState = state;
  let nextPublicState = vaultModule.projectPublicState(nextState, seats[0]?.publicSeat.seatId);
  let timestamp = lastEventAt;

  for (const seat of seats) {
    const envelope: VaultActionEnvelope = {
      seatId: seat.publicSeat.seatId,
      submittedAt: timestamp,
      action: {
        type: "vault.contribute",
        amount: contributions[seat.publicSeat.seatId] ?? 0,
      },
    };
    const result = vaultModule.reduce(
      { seed: "vault-smoke", nowIso: timestamp, state: nextState, seats },
      envelope,
    );
    nextState = result.nextState;
    nextPublicState = result.publicState;
    timestamp = new Date(Date.parse(timestamp) + 1_000).toISOString();
  }

  nextPublicState = vaultModule.projectPublicState(nextState, seats[0]?.publicSeat.seatId);

  assert.equal(nextState.phase, "accusation_window");
  assert.equal(nextPublicState.viewer?.ownContribution, contributions[seats[0].publicSeat.seatId]);
  assert.equal(nextPublicState.vaultTotal, 1_000);
  assert.equal(nextPublicState.perSeatReturn, 500);

  for (const seat of seats) {
    const envelope: VaultActionEnvelope = {
      seatId: seat.publicSeat.seatId,
      submittedAt: timestamp,
      action: {
        type: "vault.accuse",
        targetSeatId: accusations[seat.publicSeat.seatId] ?? seats[0].publicSeat.seatId,
      },
    };
    const result = vaultModule.reduce(
      { seed: "vault-smoke", nowIso: timestamp, state: nextState, seats },
      envelope,
    );
    nextState = result.nextState;
    nextPublicState = result.publicState;
    timestamp = new Date(Date.parse(timestamp) + 1_000).toISOString();
  }

  return {
    state: nextState,
    publicState: nextPublicState,
    lastEventAt: timestamp,
  };
}

const seats = [
  makeSeat("a", "Seat 1"),
  makeSeat("b", "Seat 2"),
  makeSeat("c", "Seat 3"),
  makeSeat("d", "Seat 4"),
];

let state = vaultModule.createInitialState("vault-smoke", seats);
let publicState = vaultModule.projectPublicState(state, "a");
let lastEventAt = new Date("2026-01-01T00:00:00.000Z").toISOString();

const rounds = [
  {
    contributions: { a: 100, b: 300, c: 400, d: 200 },
    accusations: { a: "d", b: "a", c: "a", d: "a" },
  },
  {
    contributions: { a: 500, b: 0, c: 0, d: 500 },
    accusations: { a: "b", b: "a", c: "b", d: "c" },
  },
  {
    contributions: { a: 500, b: 500, c: 0, d: 0 },
    accusations: { a: "c", b: "c", c: "d", d: "c" },
  },
  {
    contributions: { a: 500, b: 500, c: 0, d: 0 },
    accusations: { a: "c", b: "c", c: "d", d: "c" },
  },
  {
    contributions: { a: 500, b: 500, c: 0, d: 0 },
    accusations: { a: "c", b: "c", c: "d", d: "c" },
  },
  {
    contributions: { a: 500, b: 500, c: 0, d: 0 },
    accusations: { a: "c", b: "c", c: "d", d: "c" },
  },
  {
    contributions: { a: 500, b: 500, c: 0, d: 0 },
    accusations: { a: "c", b: "c", c: "d", d: "c" },
  },
  {
    contributions: { a: 500, b: 500, c: 0, d: 0 },
    accusations: { a: "c", b: "c", c: "d", d: "c" },
  },
];

for (const round of rounds) {
  const outcome = playRound(state, seats, round.contributions, round.accusations, lastEventAt);
  state = outcome.state;
  publicState = outcome.publicState;
  lastEventAt = outcome.lastEventAt;
}

assert.equal(state.phase, "match_complete");
assert.equal(publicState.phase, "match_complete");
assert.equal(publicState.lastResolvedRound?.lowestContribution, 0);
assert.deepEqual(publicState.lastResolvedRound?.lowestSeatIds, ["c", "d"]);
assert.deepEqual(publicState.lastResolvedRound?.correctAccuserSeatIds, ["a", "b", "c", "d"]);

const result = vaultModule.finalizeMatch(state, makeRoomState(state, publicState, lastEventAt));

assert.deepEqual(result.winningSeatIds, ["c"]);
assert.equal(result.seatScores.a, 4900);
assert.equal(result.seatScores.b, 5200);
assert.equal(result.seatScores.c, 7000);
assert.equal(result.seatScores.d, 6900);
assert.equal(
  result.behavioralOutput.find((metric) => metric.metricKey === "vault.rounds_completed")?.value,
  8,
);

console.log("vault smoke test passed");

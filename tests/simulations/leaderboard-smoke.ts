import assert from "node:assert/strict";
import test from "node:test";

import type { MatchResult, SeatAssignment } from "@arena/contracts";
import {
  createLeaderboardEngine,
  resolveLeaderboardMatch,
} from "@arena/leaderboard";

function createSeatAssignment(
  seatId: string,
  playerId: string,
  displayName: string,
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
      playerId,
      backingType: "human",
    },
  };
}

test("leaderboard engine updates multiplayer ratings and rankings from a resolved match", () => {
  const engine = createLeaderboardEngine();
  const assignments = [
    createSeatAssignment("seat-a", "player-a", "Alpha"),
    createSeatAssignment("seat-b", "player-b", "Bravo"),
    createSeatAssignment("seat-c", "player-c", "Charlie"),
  ];

  const result: MatchResult = {
    matchId: "match-001",
    roomId: "room-001",
    game: "auction",
    completedAt: "2026-04-16T12:00:00.000Z",
    winningSeatIds: ["seat-a"],
    seatScores: {
      "seat-a": 12,
      "seat-b": 4,
      "seat-c": -3,
    },
    behavioralOutput: [],
  };

  const resolved = resolveLeaderboardMatch(result, assignments);
  const applied = engine.applyMatch(resolved);

  assert.equal(applied.gameSnapshot.game, "auction");
  assert.equal(applied.gameSnapshot.entries.length, 3);
  assert.equal(applied.globalSnapshot.entries.length, 3);

  const [first, second, third] = applied.gameSnapshot.entries;
  assert.equal(first.playerId, "player-a");
  assert.ok(first.rating > 1500);
  assert.ok(second.rating <= first.rating);
  assert.ok(third.rating < 1500);

  const playerView = engine.getPlayerView("player-a");
  assert.equal(playerView.global?.playerId, "player-a");
  assert.equal(playerView.byGame.auction?.wins, 1);

  const globalUpdate = applied.updates.find(
    (update) => update.playerId === "player-a" && update.game === "global",
  );
  assert.ok(globalUpdate);
  assert.equal(globalUpdate?.wonMatch, true);
  assert.ok((globalUpdate?.delta ?? 0) > 0);
});

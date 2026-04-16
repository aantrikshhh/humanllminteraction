import assert from "node:assert/strict";
import test from "node:test";

import type { MatchResult } from "@arena/contracts";

import { InMemoryRoomRuntime } from "./runtime.js";

test("creates a room with blinded seats and returns a public room state", () => {
  const runtime = new InMemoryRoomRuntime(() => "2026-04-16T12:00:00.000Z");
  const room = runtime.createRoom({
    game: "split",
    seats: [
      {
        displayName: "Seat One",
        avatarId: "fox",
        backingType: "human",
        playerId: "player_1",
      },
      {
        displayName: "Seat Two",
        avatarId: "owl",
        backingType: "llm",
        llmModelId: "fake-model",
        promptVersionId: "v1",
      },
    ],
  });

  const publicRoom = runtime.getPublicRoomState(room.roomId);

  assert.ok(publicRoom);
  assert.equal(publicRoom.game, "split");
  assert.equal(publicRoom.seats.length, 2);
  assert.equal(
    (publicRoom.publicState as import("@arena/game-split").SplitPublicState).currentRound,
    1,
  );
  assert.deepEqual(
    publicRoom.seats.map((seat) => seat.displayName),
    ["Seat One", "Seat Two"],
  );
  assert.equal(room.seats[1]?.privateSeat.backingType, "llm");
});

test("processes ready and action messages and appends replay events", () => {
  let tick = 0;
  const runtime = new InMemoryRoomRuntime(() => {
    tick += 1;
    return `2026-04-16T12:00:0${tick}.000Z`;
  });

  const room = runtime.createRoom({
    game: "split",
    seats: [
      {
        displayName: "A",
        avatarId: "a",
        backingType: "human",
      },
      {
        displayName: "B",
        avatarId: "b",
        backingType: "human",
      },
    ],
  });

  const seatId = room.seats[0]?.publicSeat.seatId;
  assert.ok(seatId);

  const afterReady = runtime.handleClientMessage(room.roomId, {
    type: "room.ready",
    seatId,
    payload: true,
  });

  assert.equal(afterReady.seats[0]?.isReady, true);

  const afterOffer = runtime.handleClientMessage(room.roomId, {
    type: "room.action",
    seatId,
    payload: { type: "split.offer", amount: 40 },
  }) as import("@arena/contracts").PublicRoomState<import("@arena/game-split").SplitPublicState>;

  assert.equal(afterOffer.phase, "active");
  assert.equal(afterOffer.publicState.pendingOffer?.amountToResponder, 40);
  assert.equal(afterOffer.publicState.currentRound, 1);

  const replay = runtime.buildReplay(room.roomId);
  assert.equal(replay.events.length, 3);
  assert.equal(replay.events[1]?.type, "room.ready");
  assert.equal(replay.events[2]?.type, "split.offer");
});

test("stores match result and exposes replay envelope", () => {
  const runtime = new InMemoryRoomRuntime(() => "2026-04-16T12:00:00.000Z");
  const room = runtime.createRoom({
    game: "auction",
    publicState: {
      currentBid: 250,
    },
    seats: [
      {
        displayName: "Winner",
        avatarId: "lion",
        backingType: "human",
      },
      {
        displayName: "Runner Up",
        avatarId: "hare",
        backingType: "llm",
      },
      {
        displayName: "Third",
        avatarId: "bear",
        backingType: "human",
      },
    ],
  });

  const result: MatchResult = {
    matchId: room.matchId,
    roomId: room.roomId,
    game: "auction",
    completedAt: "2026-04-16T12:01:00.000Z",
    winningSeatIds: [room.seats[0]!.publicSeat.seatId],
    seatScores: {
      [room.seats[0]!.publicSeat.seatId]: 650,
      [room.seats[1]!.publicSeat.seatId]: -300,
      [room.seats[2]!.publicSeat.seatId]: -150,
    },
    behavioralOutput: [
      {
        metricKey: "peak_bid",
        value: 350,
      },
    ],
  };

  runtime.completeMatch(room.roomId, result);

  const publicRoom = runtime.getPublicRoomState(room.roomId);
  const replay = runtime.buildReplay(room.roomId);

  assert.equal(publicRoom?.phase, "results");
  assert.equal(replay.events.at(-1)?.type, "match.result");
});

test("integrates auction room actions through the runtime message handler", () => {
  const runtime = new InMemoryRoomRuntime(() => "2026-04-16T12:00:00.000Z");
  const room = runtime.createRoom({
    game: "auction",
    seats: [
      {
        displayName: "Alpha",
        avatarId: "alpha",
        backingType: "human",
      },
      {
        displayName: "Beta",
        avatarId: "beta",
        backingType: "human",
      },
      {
        displayName: "Gamma",
        avatarId: "gamma",
        backingType: "llm",
      },
    ],
  });

  const afterBid = runtime.handleClientMessage(room.roomId, {
    type: "room.action",
    seatId: "seat_1",
    payload: {
      type: "auction.bid",
      amount: 3,
    },
  }) as import("@arena/contracts").PublicRoomState<import("@arena/game-auction").AuctionPublicState>;

  assert.equal(afterBid.phase, "active");
  assert.equal(afterBid.publicState.currentBid, 3);
  assert.equal(afterBid.publicState.currentLeaderSeatId, "seat_1");
  assert.equal(afterBid.publicState.currentTurnSeatId, "seat_2");
});

test("integrates pact room actions without leaking live chooser identity", () => {
  const runtime = new InMemoryRoomRuntime(() => "2026-04-16T12:00:00.000Z");
  const room = runtime.createRoom({
    game: "pact",
    seats: [
      {
        displayName: "Alpha",
        avatarId: "alpha",
        backingType: "human",
      },
      {
        displayName: "Beta",
        avatarId: "beta",
        backingType: "llm",
      },
    ],
  });

  const afterFirstChoice = runtime.handleClientMessage(room.roomId, {
    type: "room.action",
    seatId: "seat_1",
    payload: {
      type: "pact.choose",
      choice: "cooperate",
    },
  }) as import("@arena/contracts").PublicRoomState<import("@arena/game-pact").PactPublicState>;

  assert.equal(afterFirstChoice.phase, "active");
  assert.equal(afterFirstChoice.publicState.commitmentCount, 1);
  assert.equal(afterFirstChoice.publicState.history.length, 0);

  const afterSecondChoice = runtime.handleClientMessage(room.roomId, {
    type: "room.action",
    seatId: "seat_2",
    payload: {
      type: "pact.choose",
      choice: "betray",
    },
  }) as import("@arena/contracts").PublicRoomState<import("@arena/game-pact").PactPublicState>;

  assert.equal(afterSecondChoice.publicState.commitmentCount, 0);
  assert.equal(afterSecondChoice.publicState.history.length, 1);
  assert.equal(afterSecondChoice.publicState.history[0]?.choices["seat_1"], "cooperate");
  assert.equal(afterSecondChoice.publicState.history[0]?.choices["seat_2"], "betray");
});

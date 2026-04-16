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
  assert.deepEqual(publicRoom.joinState?.openSeatIds, ["seat_1"]);
  assert.deepEqual(publicRoom.joinState?.claimedSeatIds, []);
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
  const sessionId = claimSeat(runtime, room.roomId, seatId);

  const afterReady = runtime.handleClientMessage(room.roomId, {
    type: "room.ready",
    seatId,
    sessionId,
    payload: true,
  });

  assert.equal(afterReady.seats[0]?.isReady, true);

  const afterOffer = runtime.handleClientMessage(room.roomId, {
    type: "room.action",
    seatId,
    sessionId,
    payload: { type: "split.offer", amount: 40 },
  }) as import("@arena/contracts").PublicRoomState<import("@arena/game-split").SplitPublicState>;

  assert.equal(afterOffer.phase, "active");
  assert.equal(afterOffer.publicState.pendingOffer?.amountToResponder, 40);
  assert.equal(afterOffer.publicState.currentRound, 1);

  const replay = runtime.buildReplay(room.roomId);
  assert.equal(replay.events.length, 5);
  assert.equal(replay.events[1]?.type, "room.join");
  assert.equal(replay.events[2]?.type, "room.claim");
  assert.equal(replay.events[3]?.type, "room.ready");
  assert.equal(replay.events[4]?.type, "split.offer");
});

test("requires a claimed session to control a human seat", () => {
  const runtime = new InMemoryRoomRuntime(() => "2026-04-16T12:00:00.000Z");
  const room = runtime.createRoom({
    game: "auction",
    seats: [
      {
        displayName: "Seat One",
        avatarId: "fox",
        backingType: "human",
      },
      {
        displayName: "Seat Two",
        avatarId: "owl",
        backingType: "llm",
        llmModelId: "auction-fake",
      },
      {
        displayName: "Seat Three",
        avatarId: "hare",
        backingType: "llm",
        llmModelId: "auction-fake-2",
      },
    ],
  });

  assert.throws(() =>
    runtime.handleClientMessage(room.roomId, {
      type: "room.action",
      seatId: "seat_1",
      payload: { type: "auction.bid", amount: 3 },
    }),
  );

  const sessionId = claimSeat(runtime, room.roomId, "seat_1", "Claimant");
  const repeatedClaim = runtime.claimSeat(room.roomId, sessionId, "seat_1");
  assert.equal(repeatedClaim.session.seatId, "seat_1");

  const otherSession = runtime.createOrRefreshSession(room.roomId, {
    displayName: "Other",
  });
  assert.throws(() => runtime.claimSeat(room.roomId, otherSession.session.sessionId, "seat_1"));

  const afterBid = runtime.handleClientMessage(room.roomId, {
    type: "room.action",
    seatId: "seat_1",
    sessionId,
    payload: { type: "auction.bid", amount: 3 },
  }) as import("@arena/contracts").PublicRoomState<import("@arena/game-auction").AuctionPublicState>;

  assert.equal(afterBid.phase, "active");
  assert.deepEqual(afterBid.joinState?.claimedSeatIds, ["seat_1"]);
  assert.deepEqual(afterBid.joinState?.openSeatIds, []);
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
  assert.equal(publicRoom?.publicResult?.completedAt, result.completedAt);
  assert.equal(publicRoom?.replaySummary?.available, true);
  assert.equal(publicRoom?.matchSync?.status, "pending");
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

  const sessionId = claimSeat(runtime, room.roomId, "seat_1");

  const afterBid = runtime.handleClientMessage(room.roomId, {
    type: "room.action",
    seatId: "seat_1",
    sessionId,
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

  const humanSessionId = claimSeat(runtime, room.roomId, "seat_1");

  const afterFirstChoice = runtime.handleClientMessage(room.roomId, {
    type: "room.action",
    seatId: "seat_1",
    sessionId: humanSessionId,
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

test("creates and refreshes browser sessions for joinable rooms", () => {
  let tick = 0;
  const runtime = new InMemoryRoomRuntime(() => {
    tick += 1;
    return `2026-04-16T12:00:0${tick}.000Z`;
  });
  const room = runtime.createRoom({
    game: "split",
    seats: [
      {
        displayName: "Seat One",
        avatarId: "fox",
        backingType: "human",
      },
      {
        displayName: "Seat Two",
        avatarId: "owl",
        backingType: "llm",
      },
    ],
  });

  const created = runtime.createOrRefreshSession(room.roomId, {
    displayName: "Arena Guest",
  });
  const refreshed = runtime.createOrRefreshSession(room.roomId, {
    sessionId: created.session.sessionId,
    displayName: "Renamed Guest",
  });

  assert.equal(created.room.phase, "lobby");
  assert.equal(created.room.joinState?.canJoin, true);
  assert.deepEqual(created.room.joinState?.openSeatIds, ["seat_1"]);
  assert.deepEqual(created.room.joinState?.claimedSeatIds, []);
  assert.equal(refreshed.session.sessionId, created.session.sessionId);
  assert.equal(refreshed.session.displayName, "Renamed Guest");
  assert.notEqual(refreshed.session.lastSeenAt, created.session.lastSeenAt);
  assert.equal(runtime.getRoom(room.roomId)?.sessions.length, 1);
});

test("allows each session to claim exactly one human seat", () => {
  const runtime = new InMemoryRoomRuntime(() => "2026-04-16T12:00:00.000Z");
  const room = runtime.createRoom({
    game: "auction",
    seats: [
      {
        displayName: "Seat One",
        avatarId: "fox",
        backingType: "human",
      },
      {
        displayName: "Seat Two",
        avatarId: "owl",
        backingType: "human",
      },
      {
        displayName: "Seat Three",
        avatarId: "lynx",
        backingType: "llm",
      },
    ],
  });

  const sessionOne = runtime.createOrRefreshSession(room.roomId, {
    displayName: "Guest One",
  }).session;
  const sessionTwo = runtime.createOrRefreshSession(room.roomId, {
    displayName: "Guest Two",
  }).session;

  const firstClaim = runtime.claimSeat(room.roomId, sessionOne.sessionId, "seat_1");

  assert.equal(firstClaim.session.seatId, "seat_1");
  assert.deepEqual(firstClaim.room.joinState, {
    canJoin: true,
    openSeatIds: ["seat_2"],
    claimedSeatIds: ["seat_1"],
  });
  assert.throws(
    () => runtime.claimSeat(room.roomId, sessionOne.sessionId, "seat_2"),
    /already controls a different seat/i,
  );
  assert.throws(
    () => runtime.claimSeat(room.roomId, sessionTwo.sessionId, "seat_1"),
    /already claimed/i,
  );
});

test("requires the controlling session for ready action and leave on claimed human seats", () => {
  const runtime = new InMemoryRoomRuntime(() => "2026-04-16T12:00:00.000Z");
  const room = runtime.createRoom({
    game: "split",
    seats: [
      {
        displayName: "Seat One",
        avatarId: "fox",
        backingType: "human",
      },
      {
        displayName: "Seat Two",
        avatarId: "owl",
        backingType: "llm",
      },
    ],
  });

  const controller = runtime.createOrRefreshSession(room.roomId, {
    displayName: "Controller",
  }).session;
  const intruder = runtime.createOrRefreshSession(room.roomId, {
    displayName: "Intruder",
  }).session;

  runtime.claimSeat(room.roomId, controller.sessionId, "seat_1");

  assert.throws(
    () =>
      runtime.handleClientMessage(room.roomId, {
        type: "room.ready",
        seatId: "seat_1",
        payload: true,
      }),
    /does not control the requested seat/i,
  );
  assert.throws(
    () =>
      runtime.handleClientMessage(room.roomId, {
        type: "room.ready",
        seatId: "seat_1",
        sessionId: intruder.sessionId,
        payload: true,
      }),
    /does not control the requested seat/i,
  );
  assert.throws(
    () =>
      runtime.handleClientMessage(room.roomId, {
        type: "room.action",
        seatId: "seat_1",
        payload: { type: "split.offer", amount: 25 },
      }),
    /does not control the requested seat/i,
  );
  assert.throws(
    () =>
      runtime.handleClientMessage(room.roomId, {
        type: "room.leave",
        seatId: "seat_1",
      }),
    /does not control the requested seat/i,
  );

  const readyRoom = runtime.handleClientMessage(room.roomId, {
    type: "room.ready",
    seatId: "seat_1",
    sessionId: controller.sessionId,
    payload: true,
  });
  const activeRoom = runtime.handleClientMessage(room.roomId, {
    type: "room.action",
    seatId: "seat_1",
    sessionId: controller.sessionId,
    payload: { type: "split.offer", amount: 25 },
  }) as import("@arena/contracts").PublicRoomState<import("@arena/game-split").SplitPublicState>;
  const disconnectedRoom = runtime.handleClientMessage(room.roomId, {
    type: "room.leave",
    seatId: "seat_1",
    sessionId: controller.sessionId,
  });

  assert.equal(readyRoom.seats[0]?.isReady, true);
  assert.equal(activeRoom.publicState.pendingOffer?.amountToResponder, 25);
  assert.equal(disconnectedRoom.seats[0]?.isConnected, false);
});

test("lets llm and scripted seats act without browser session ids", () => {
  const runtime = new InMemoryRoomRuntime(() => "2026-04-16T12:00:00.000Z");
  const room = runtime.createRoom({
    game: "auction",
    seats: [
      {
        displayName: "Scripted",
        avatarId: "fox",
        backingType: "scripted",
      },
      {
        displayName: "Model",
        avatarId: "owl",
        backingType: "llm",
      },
      {
        displayName: "Scripted",
        avatarId: "lynx",
        backingType: "scripted",
      },
    ],
  });

  const afterReady = runtime.handleClientMessage(room.roomId, {
    type: "room.ready",
    seatId: "seat_1",
    payload: true,
  });
  const afterBid = runtime.handleClientMessage(room.roomId, {
    type: "room.action",
    seatId: "seat_1",
    payload: {
      type: "auction.bid",
      amount: 3,
    },
  }) as import("@arena/contracts").PublicRoomState<import("@arena/game-auction").AuctionPublicState>;
  const afterPass = runtime.handleClientMessage(room.roomId, {
    type: "room.action",
    seatId: "seat_2",
    payload: {
      type: "auction.pass",
    },
  }) as import("@arena/contracts").PublicRoomState<import("@arena/game-auction").AuctionPublicState>;
  const afterLeave = runtime.handleClientMessage(room.roomId, {
    type: "room.leave",
    seatId: "seat_1",
  });

  assert.equal(afterReady.seats[0]?.isReady, true);
  assert.equal(afterBid.publicState.currentBid, 3);
  assert.equal(afterBid.publicState.currentLeaderSeatId, "seat_1");
  assert.equal(afterPass.publicState.currentTurnSeatId, "seat_3");
  assert.equal(afterLeave.seats[0]?.isConnected, false);
});

test("exposes public join state with open and claimed seats additively", () => {
  const runtime = new InMemoryRoomRuntime(() => "2026-04-16T12:00:00.000Z");
  const room = runtime.createRoom({
    game: "auction",
    seats: [
      {
        displayName: "Seat One",
        avatarId: "fox",
        backingType: "human",
      },
      {
        displayName: "Seat Two",
        avatarId: "owl",
        backingType: "human",
      },
      {
        displayName: "Seat Three",
        avatarId: "lynx",
        backingType: "llm",
      },
    ],
  });

  const session = runtime.createOrRefreshSession(room.roomId, {
    displayName: "Guest",
  }).session;
  runtime.claimSeat(room.roomId, session.sessionId, "seat_1");

  const joinableRoom = runtime.getPublicRoomState(room.roomId);
  runtime.handleClientMessage(room.roomId, {
    type: "room.action",
    seatId: "seat_1",
    sessionId: session.sessionId,
    payload: {
      type: "auction.bid",
      amount: 2,
    },
  });
  const activeRoom = runtime.getPublicRoomState(room.roomId);

  assert.deepEqual(joinableRoom?.joinState, {
    canJoin: true,
    openSeatIds: ["seat_2"],
    claimedSeatIds: ["seat_1"],
  });
  assert.deepEqual(activeRoom?.joinState, {
    canJoin: false,
    openSeatIds: [],
    claimedSeatIds: ["seat_1"],
  });
});

function claimSeat(
  runtime: InMemoryRoomRuntime,
  roomId: string,
  seatId: string,
  displayName = "Guest",
): string {
  const joined = runtime.createOrRefreshSession(roomId, { displayName });
  const claimed = runtime.claimSeat(roomId, joined.session.sessionId, seatId);
  return claimed.session.sessionId;
}

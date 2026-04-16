import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { tmpdir } from "node:os";

import type { MatchResult, ReplayEnvelope } from "@arena/contracts";

import {
  FileBackedRoomPersistence,
  restoreRuntimeFromPersistence,
} from "./persistence.js";
import { InMemoryRoomRuntime } from "./runtime.js";

test("file-backed persistence restores active rooms and replay logs", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "arena-rooms-"));

  try {
    const persistence = new FileBackedRoomPersistence({ rootDir });
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
          llmModelId: "split-fake",
        },
      ],
    });

    const joined = runtime.createOrRefreshSession(room.roomId, {
      displayName: "Seat One",
    });
    runtime.claimSeat(room.roomId, joined.session.sessionId, "seat_1");

    runtime.handleClientMessage(room.roomId, {
      type: "room.action",
      seatId: "seat_1",
      sessionId: joined.session.sessionId,
      payload: { type: "split.offer", amount: 40 },
    });

    await persistence.saveRoom(runtime.getRoom(room.roomId)!);

    const restoredRuntime = new InMemoryRoomRuntime(() => "2026-04-16T13:00:00.000Z");
    const restoredCount = await restoreRuntimeFromPersistence(restoredRuntime, persistence);
    const restoredRoom = restoredRuntime.getPublicRoomState(room.roomId);

    assert.equal(restoredCount, 1);
    assert.equal(restoredRoom?.phase, "active");
    assert.equal(restoredRoom?.replaySummary?.available, true);
    assert.equal(restoredRoom?.replaySummary?.eventCount, 4);
    assert.equal(restoredRuntime.buildReplay(room.roomId).events.length, 4);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("file-backed persistence materializes replay and result files for completed rooms", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "arena-rooms-"));

  try {
    const persistence = new FileBackedRoomPersistence({ rootDir });
    const runtime = new InMemoryRoomRuntime(() => "2026-04-16T12:00:00.000Z");
    const room = runtime.createRoom({
      game: "auction",
      seats: [
        {
          displayName: "Winner",
          avatarId: "lion",
          backingType: "human",
          playerId: "player-1",
        },
        {
          displayName: "Runner Up",
          avatarId: "hare",
          backingType: "llm",
          llmModelId: "auction-fake",
        },
        {
          displayName: "Third",
          avatarId: "bear",
          backingType: "human",
          playerId: "player-3",
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
    await persistence.saveRoom(runtime.getRoom(room.roomId)!);

    const replayPayload = JSON.parse(
      await readFile(join(rootDir, "replays", `${room.roomId}.json`), "utf8"),
    ) as ReplayEnvelope;
    const resultPayload = JSON.parse(
      await readFile(join(rootDir, "results", `${room.roomId}.json`), "utf8"),
    ) as MatchResult;

    assert.equal(replayPayload.events.at(-1)?.type, "match.result");
    assert.deepEqual(resultPayload, result);

    const restoredRuntime = new InMemoryRoomRuntime(() => "2026-04-16T13:00:00.000Z");
    await restoreRuntimeFromPersistence(restoredRuntime, persistence);
    const restoredRoom = restoredRuntime.getPublicRoomState(room.roomId);

    assert.equal(restoredRoom?.phase, "results");
    assert.equal(restoredRoom?.publicResult?.completedAt, result.completedAt);
    assert.deepEqual(restoredRoom?.publicResult?.winningSeatIds, result.winningSeatIds);
    assert.equal(restoredRoom?.matchSync?.status, "pending");
    assert.equal(restoredRoom?.replaySummary?.lastSequence, replayPayload.events.at(-1)?.sequence);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("file-backed persistence preserves additive browser sessions and claimed join state", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "arena-rooms-"));

  try {
    const persistence = new FileBackedRoomPersistence({ rootDir });
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
      displayName: "Arena Guest",
    }).session;
    runtime.claimSeat(room.roomId, session.sessionId, "seat_1");
    runtime.handleClientMessage(room.roomId, {
      type: "room.ready",
      seatId: "seat_1",
      sessionId: session.sessionId,
      payload: true,
    });

    await persistence.saveRoom(runtime.getRoom(room.roomId)!);

    const restoredRuntime = new InMemoryRoomRuntime(() => "2026-04-16T13:00:00.000Z");
    await restoreRuntimeFromPersistence(restoredRuntime, persistence);
    const restoredRoom = restoredRuntime.getRoom(room.roomId);
    const restoredPublicRoom = restoredRuntime.getPublicRoomState(room.roomId);

    assert.equal(restoredRoom?.sessions.length, 1);
    assert.equal(restoredRoom?.sessions[0]?.displayName, "Arena Guest");
    assert.equal(restoredRoom?.sessions[0]?.seatId, "seat_1");
    assert.equal(restoredRoom?.seats[0]?.privateSeat.sessionId, session.sessionId);
    assert.equal(restoredPublicRoom?.seats[0]?.isReady, true);
    assert.deepEqual(restoredPublicRoom?.joinState, {
      canJoin: true,
      openSeatIds: ["seat_2"],
      claimedSeatIds: ["seat_1"],
    });
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("restoreRuntimeFromPersistence tolerates legacy room snapshots without sessions", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "arena-rooms-"));

  try {
    const persistence = new FileBackedRoomPersistence({ rootDir });
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

    await persistence.saveRoom(room);

    const roomPath = join(rootDir, "rooms", `${room.roomId}.json`);
    const persisted = JSON.parse(await readFile(roomPath, "utf8")) as Record<string, unknown>;
    delete persisted.sessions;
    await writeFile(roomPath, `${JSON.stringify(persisted, null, 2)}\n`, "utf8");

    const restoredRuntime = new InMemoryRoomRuntime(() => "2026-04-16T13:00:00.000Z");
    const restoredCount = await restoreRuntimeFromPersistence(restoredRuntime, persistence);
    const restoredRoom = restoredRuntime.getRoom(room.roomId);

    assert.equal(restoredCount, 1);
    assert.deepEqual(restoredRoom?.sessions, []);
    assert.deepEqual(restoredRuntime.getPublicRoomState(room.roomId)?.joinState, {
      canJoin: true,
      openSeatIds: ["seat_1"],
      claimedSeatIds: [],
    });
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

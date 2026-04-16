import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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

    runtime.handleClientMessage(room.roomId, {
      type: "room.action",
      seatId: "seat_1",
      payload: { type: "split.offer", amount: 40 },
    });

    await persistence.saveRoom(room);

    const restoredRuntime = new InMemoryRoomRuntime(() => "2026-04-16T13:00:00.000Z");
    const restoredCount = await restoreRuntimeFromPersistence(restoredRuntime, persistence);
    const restoredRoom = restoredRuntime.getPublicRoomState(room.roomId);

    assert.equal(restoredCount, 1);
    assert.equal(restoredRoom?.phase, "active");
    assert.equal(restoredRoom?.replaySummary?.available, true);
    assert.equal(restoredRoom?.replaySummary?.eventCount, 2);
    assert.equal(restoredRuntime.buildReplay(room.roomId).events.length, 2);
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
    await persistence.saveRoom(room);

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

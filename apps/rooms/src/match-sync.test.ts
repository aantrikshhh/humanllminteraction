import assert from "node:assert/strict";
import test from "node:test";

import { createMatchSyncService } from "./match-sync.js";
import { InMemoryRoomRuntime } from "./runtime.js";

test("syncCompletedRoomIfNeeded forwards a completed room into leaderboard and payments exactly once", async () => {
  const runtime = new InMemoryRoomRuntime(() => "2026-04-16T12:00:00.000Z");
  const room = runtime.createRoom({
    game: "auction",
    seats: [
      {
        displayName: "Operator",
        avatarId: "mask-amber",
        backingType: "human",
        playerId: "demo-player",
      },
      {
        displayName: "Seat 2",
        avatarId: "mask-cyan",
        backingType: "llm",
        llmModelId: "auction-demo-2",
      },
      {
        displayName: "Seat 3",
        avatarId: "mask-rose",
        backingType: "llm",
        llmModelId: "auction-demo-3",
      },
    ],
  });

  const joined = runtime.createOrRefreshSession(room.roomId, {
    displayName: "Operator",
  });
  runtime.claimSeat(room.roomId, joined.session.sessionId, "seat_1");

  runtime.handleClientMessage(room.roomId, {
    type: "room.action",
    seatId: "seat_1",
    sessionId: joined.session.sessionId,
    payload: {
      type: "auction.bid",
      amount: 3,
    },
  });
  runtime.handleClientMessage(room.roomId, {
    type: "room.action",
    seatId: "seat_2",
    payload: {
      type: "auction.pass",
    },
  });
  runtime.handleClientMessage(room.roomId, {
    type: "room.action",
    seatId: "seat_3",
    payload: {
      type: "auction.pass",
    },
  });

  const calls: Array<{ url: string; body: unknown }> = [];
  const escrowResponses = new Map<string, { escrowId: string }>();

  const syncService = createMatchSyncService({
    apiBaseUrl: "http://api.test",
    now: () => "2026-04-16T12:05:00.000Z",
    fetchImpl: (async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, body });

      if (url.endsWith("/leaderboard/matches/apply")) {
        return new Response(
          JSON.stringify({
            ok: true,
            data: {
              matchId: room.matchId,
            },
          }),
          { status: 200 },
        );
      }

      if (url.endsWith("/matches/completions")) {
        return new Response(JSON.stringify({ ok: true }), { status: 201 });
      }

      if (url.endsWith("/payments/escrows")) {
        const escrowId = `escrow-${room.matchId}`;
        escrowResponses.set(escrowId, { escrowId });
        return new Response(JSON.stringify({ escrowId }), { status: 201 });
      }

      if (
        url.includes("/payments/escrows/") ||
        url.endsWith("/payments/settlements")
      ) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      throw new Error(`unexpected request ${url}`);
    }) as typeof fetch,
  });

  await syncService.syncCompletedRoomIfNeeded(runtime, room.roomId);
  await syncService.syncCompletedRoomIfNeeded(runtime, room.roomId);

  const syncedRoom = runtime.getRoom(room.roomId);
  assert.equal(syncedRoom?.matchSync.status, "synced");
  assert.equal(syncedRoom?.matchSync.attempts, 1);
  assert.equal(
    calls.filter((call) => call.url.endsWith("/matches/completions")).length,
    2,
  );
  assert.equal(
    calls.filter((call) => call.url.endsWith("/leaderboard/matches/apply")).length,
    1,
  );
  assert.equal(
    calls.filter((call) => call.url.endsWith("/payments/settlements")).length,
    1,
  );

  const leaderboardPayload = calls.find((call) => call.url.endsWith("/leaderboard/matches/apply"))
    ?.body as { match: { participants: Array<{ playerId: string }> } };
  assert.ok(leaderboardPayload.match.participants.length >= 2);

  const completionCalls = calls
    .filter((call) => call.url.endsWith("/matches/completions"))
    .map((call) => call.body) as Array<{
    completion: {
      replay: { available: boolean; eventCount?: number };
      seatToPlayerId: Record<string, string>;
    };
    matchSync: { status: string };
  }>;
  assert.equal(completionCalls[0]?.matchSync.status, "syncing");
  assert.equal(completionCalls[1]?.matchSync.status, "synced");
  assert.equal(completionCalls[1]?.completion.replay.available, true);
  assert.match(completionCalls[1]?.completion.seatToPlayerId.seat_1 ?? "", /^anonymous:operator:/);

  const settlementPayload = calls.find((call) => call.url.endsWith("/payments/settlements"))
    ?.body as { seatToPlayerId: Record<string, string> };
  assert.match(settlementPayload.seatToPlayerId.seat_1 ?? "", /^anonymous:operator:/);
  assert.match(settlementPayload.seatToPlayerId.seat_2, /^llm:/);
});

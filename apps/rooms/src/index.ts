import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import type { ClientMessage, GameKey, SeatBackingType } from "@arena/contracts";

import { isAutomationCandidate, processAutomatedTurns } from "./automation.js";
import { createMatchSyncService } from "./match-sync.js";
import {
  createRoomPersistenceFromEnv,
  restoreRuntimeFromPersistence,
} from "./persistence.js";
import { InMemoryRoomRuntime } from "./runtime.js";

const port = Number(process.env.PORT ?? 4011);
const runtime = new InMemoryRoomRuntime();
const matchSync = createMatchSyncService();
const persistence = createRoomPersistenceFromEnv();

const readJsonBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

const writeJson = (response: ServerResponse, status: number, payload: unknown) => {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
};

const writeError = (
  response: ServerResponse,
  status: number,
  error: string,
  message: string,
) => {
  writeJson(response, status, { error, message, service: "@arena/rooms" });
};

const server = createServer(async (request, response) => {
  if (!request.url) {
    writeError(response, 400, "missing_url", "Request URL is required.");
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
  const roomMatch = url.pathname.match(/^\/rooms\/([^/]+)$/);
  const replayMatch = url.pathname.match(/^\/rooms\/([^/]+)\/replay$/);
  const joinMatch = url.pathname.match(/^\/rooms\/([^/]+)\/join$/);
  const claimMatch = url.pathname.match(/^\/rooms\/([^/]+)\/claim$/);
  const readyMatch = url.pathname.match(/^\/rooms\/([^/]+)\/ready$/);
  const phaseMatch = url.pathname.match(/^\/rooms\/([^/]+)\/phase$/);
  const messageMatch = url.pathname.match(/^\/rooms\/([^/]+)\/messages$/);

  if (request.method === "GET" && url.pathname === "/health") {
    writeJson(response, 200, {
      service: "@arena/rooms",
      status: "ok",
      rooms: runtime.listRooms().length,
      persistenceEnabled: persistence.enabled,
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/rooms") {
    await syncCompletedRooms();
    writeJson(response, 200, runtime.listRooms());
    return;
  }

  if (request.method === "GET" && roomMatch) {
    const roomId = roomMatch[1] ?? "";
    await matchSync.syncCompletedRoomIfNeeded(runtime, roomId);
    await persistRoomIfPresent(roomId);
    const room = runtime.getPublicRoomState(roomId);
    if (!room) {
      writeError(response, 404, "room_not_found", "Room does not exist.");
      return;
    }

    writeJson(response, 200, room);
    return;
  }

  if (request.method === "GET" && replayMatch) {
    try {
      writeJson(response, 200, runtime.buildReplay(replayMatch[1] ?? ""));
    } catch (error) {
      writeError(
        response,
        404,
        "room_not_found",
        error instanceof Error ? error.message : "Room replay could not be loaded.",
      );
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/rooms/bootstrap") {
    const body = (await readJsonBody(request)) as {
      game?: GameKey;
      publicState?: Record<string, unknown>;
      seats?: Array<{
        displayName: string;
        avatarId: string;
        backingType: SeatBackingType;
      }>;
    };

    if (!body.game || !body.seats?.length) {
      writeError(response, 400, "invalid_payload", "Expected game and at least one seat.");
      return;
    }

    const room = runtime.createRoom({
      game: body.game,
      publicState: body.publicState ?? {},
      seats: body.seats,
    });
    await persistRoomIfPresent(room.roomId);

    await settleRoom(room.roomId);

    writeJson(response, 201, runtime.getPublicRoomState(room.roomId));
    return;
  }

  if (request.method === "POST" && joinMatch) {
    const body = (await readJsonBody(request)) as {
      sessionId?: string;
      displayName?: string;
    };

    try {
      const roomId = joinMatch[1] ?? "";
      const envelope = runtime.createOrRefreshSession(roomId, body);
      await persistRoomIfPresent(roomId);
      writeJson(response, 200, envelope);
    } catch (error) {
      writeError(
        response,
        400,
        "room_join_failed",
        error instanceof Error ? error.message : "Could not join room.",
      );
    }
    return;
  }

  if (request.method === "POST" && claimMatch) {
    const body = (await readJsonBody(request)) as {
      sessionId?: string;
      seatId?: string;
    };

    if (!body.sessionId || !body.seatId) {
      writeError(response, 400, "invalid_payload", "Expected sessionId and seatId.");
      return;
    }

    try {
      const roomId = claimMatch[1] ?? "";
      const envelope = runtime.claimSeat(roomId, body.sessionId, body.seatId);
      await persistRoomIfPresent(roomId);
      writeJson(response, 200, envelope);
    } catch (error) {
      writeError(
        response,
        400,
        "seat_claim_failed",
        error instanceof Error ? error.message : "Could not claim seat.",
      );
    }
    return;
  }

  if (request.method === "POST" && readyMatch) {
    const body = (await readJsonBody(request)) as {
      sessionId?: string;
      seatId?: string;
      isReady?: boolean;
    };

    if (!body.seatId) {
      writeError(response, 400, "invalid_payload", "Expected seatId.");
      return;
    }

    try {
      const roomId = readyMatch[1] ?? "";
      runtime.setSeatReady(roomId, body.seatId, Boolean(body.isReady), body.sessionId);
      const room = await settleRoom(roomId);
      writeJson(response, 200, room);
    } catch (error) {
      writeError(
        response,
        404,
        "room_update_failed",
        error instanceof Error ? error.message : "Could not update readiness.",
      );
    }
    return;
  }

  if (request.method === "POST" && phaseMatch) {
    const body = (await readJsonBody(request)) as {
      phase?: "lobby" | "ready" | "active" | "results" | "closed";
      round?: number;
    };

    if (!body.phase) {
      writeError(response, 400, "invalid_payload", "Expected phase.");
      return;
    }

    try {
      const roomId = phaseMatch[1] ?? "";
      runtime.setRoomPhase(roomId, body.phase, body.round);
      const room = await settleRoom(roomId);
      writeJson(response, 200, room);
    } catch (error) {
      writeError(
        response,
        404,
        "room_update_failed",
        error instanceof Error ? error.message : "Could not update phase.",
      );
    }
    return;
  }

  if (request.method === "POST" && messageMatch) {
    const body = (await readJsonBody(request)) as ClientMessage;
    if (!body.type) {
      writeError(response, 400, "invalid_payload", "Expected client message type.");
      return;
    }

    try {
      const roomId = messageMatch[1] ?? "";
      runtime.handleClientMessage(roomId, body);
      const room = await settleRoom(roomId);
      writeJson(response, 200, room);
    } catch (error) {
      writeError(
        response,
        400,
        "message_rejected",
        error instanceof Error ? error.message : "Could not process room message.",
      );
    }
    return;
  }

  writeError(response, 404, "not_found", "Route not found.");
});

void startServer().catch((error) => {
  console.error("@arena/rooms failed to start", error);
  process.exitCode = 1;
});

async function syncCompletedRooms(): Promise<void> {
  const jobs = runtime
    .listRooms()
    .filter((room) => room.phase === "results")
    .map(async (room) => {
      await matchSync.syncCompletedRoomIfNeeded(runtime, room.roomId);
      await persistRoomIfPresent(room.roomId);
    });

  await Promise.all(jobs);
}

async function settleRoom(roomId: string) {
  await persistRoomIfPresent(roomId);

  if (isAutomationCandidate(runtime.getRoom(roomId))) {
    await processAutomatedTurns(runtime, roomId);
    await persistRoomIfPresent(roomId);
  }

  await matchSync.syncCompletedRoomIfNeeded(runtime, roomId);
  await persistRoomIfPresent(roomId);

  const room = runtime.getPublicRoomState(roomId);
  if (!room) {
    throw new Error(`Unknown room: ${roomId}`);
  }

  return room;
}

async function persistRoomIfPresent(roomId: string): Promise<void> {
  const room = runtime.getRoom(roomId);
  if (!room) {
    return;
  }

  await persistence.saveRoom(room);
}

async function startServer(): Promise<void> {
  const restoredRoomCount = await restoreRuntimeFromPersistence(runtime, persistence);

  server.listen(port, () => {
    console.log(
      `@arena/rooms listening on http://localhost:${port} (restored ${restoredRoomCount} rooms)`,
    );
  });
}

import type { IncomingMessage, ServerResponse } from "node:http";

import {
  applyResolvedLeaderboardMatch,
  getLeaderboardSnapshot,
  getPlayerLeaderboardView,
} from "./leaderboard-store";
import type {
  ApplyLeaderboardMatchRequest,
  ApplyLeaderboardMatchResponse,
  LeaderboardSnapshotResponse,
  PlayerLeaderboardResponse,
} from "./leaderboard-types";

export async function routeLeaderboardRequest(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<boolean> {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (request.method === "GET" && url.pathname === "/leaderboard") {
    const game = url.searchParams.get("game") ?? "global";
    const limit = parseInteger(url.searchParams.get("limit"));
    const payload: LeaderboardSnapshotResponse = {
      ok: true,
      data: getLeaderboardSnapshot(game as "global", limit),
    };
    writeJson(response, 200, payload);
    return true;
  }

  if (request.method === "GET" && url.pathname.startsWith("/leaderboard/players/")) {
    const playerId = url.pathname.replace("/leaderboard/players/", "").trim();
    const payload: PlayerLeaderboardResponse = {
      ok: true,
      data: getPlayerLeaderboardView(playerId),
    };
    writeJson(response, 200, payload);
    return true;
  }

  if (request.method === "POST" && url.pathname === "/leaderboard/matches/apply") {
    const body = await readJsonBody<ApplyLeaderboardMatchRequest>(request);
    const payload: ApplyLeaderboardMatchResponse = {
      ok: true,
      data: applyResolvedLeaderboardMatch(body.match),
    };
    writeJson(response, 200, payload);
    return true;
  }

  return false;
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody<TBody>(request: IncomingMessage): Promise<TBody> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw.length > 0 ? (JSON.parse(raw) as TBody) : ({} as TBody);
}

function parseInteger(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

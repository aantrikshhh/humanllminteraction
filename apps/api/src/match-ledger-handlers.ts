import type { IncomingMessage, ServerResponse } from "node:http";

import {
  getMatchLedgerRecordByMatchId,
  getMatchLedgerRecordByRoomId,
  recordMatchCompletion,
  recordMatchLeaderboardApplication,
  recordMatchSettlement,
} from "./match-ledger-store";
import type {
  MatchLedgerNotFoundResponse,
  MatchLedgerRecordResponse,
  MatchLedgerWriteCompletionRequest,
  MatchLedgerWriteLeaderboardRequest,
  MatchLedgerWritePaymentsRequest,
} from "./match-ledger-types";

export async function routeMatchLedgerRequest(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<boolean> {
  const url = new URL(request.url ?? "/", "http://localhost");
  const method = request.method?.toUpperCase() ?? "GET";

  if (method === "GET" && url.pathname === "/matches/health") {
    writeJson(response, 200, {
      service: "@arena/api/matches",
      status: "ok",
    });
    return true;
  }

  const roomMatch = url.pathname.match(/^\/matches\/rooms\/([^/]+)$/u);
  if (method === "GET" && roomMatch) {
    const roomId = decodeURIComponent(roomMatch[1] ?? "");
    const record = getMatchLedgerRecordByRoomId(roomId);
    if (!record) {
      writeJson(response, 404, {
        ok: false,
        error: "room_not_found",
      } satisfies MatchLedgerNotFoundResponse);
      return true;
    }

    writeJson(response, 200, {
      ok: true,
      data: record,
    } satisfies MatchLedgerRecordResponse);
    return true;
  }

  const matchMatch = url.pathname.match(/^\/matches\/([^/]+)$/u);
  if (method === "GET" && matchMatch) {
    const matchId = decodeURIComponent(matchMatch[1] ?? "");
    const record = getMatchLedgerRecordByMatchId(matchId);
    if (!record) {
      writeJson(response, 404, {
        ok: false,
        error: "match_not_found",
      } satisfies MatchLedgerNotFoundResponse);
      return true;
    }

    writeJson(response, 200, {
      ok: true,
      data: record,
    } satisfies MatchLedgerRecordResponse);
    return true;
  }

  if (method === "POST" && url.pathname === "/matches/completions") {
    const body = await readJson<MatchLedgerWriteCompletionRequest>(request);
    writeJson(response, 201, {
      ok: true,
      data: recordMatchCompletion(body.completion, body.matchSync),
    } satisfies MatchLedgerRecordResponse);
    return true;
  }

  if (method === "POST" && url.pathname === "/matches/leaderboard") {
    const body = await readJson<MatchLedgerWriteLeaderboardRequest>(request);
    writeJson(response, 201, {
      ok: true,
      data: recordMatchLeaderboardApplication(body.match, body.applied),
    } satisfies MatchLedgerRecordResponse);
    return true;
  }

  if (method === "POST" && url.pathname === "/matches/payments") {
    const body = await readJson<MatchLedgerWritePaymentsRequest>(request);
    writeJson(response, 201, {
      ok: true,
      data: recordMatchSettlement(body.input, body.payouts, body.escrow),
    } satisfies MatchLedgerRecordResponse);
    return true;
  }

  return false;
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {} as T;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

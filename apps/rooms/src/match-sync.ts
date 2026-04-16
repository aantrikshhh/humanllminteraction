import { resolveLeaderboardMatch } from "@arena/leaderboard";
import type { GameKey, SeatAssignment, SeatId } from "@arena/contracts";

import type { InMemoryRoomRuntime, RoomRecord } from "./runtime.js";

export interface MatchSyncServiceOptions {
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
  now?: () => string;
}

interface JsonRequestInit {
  method?: "GET" | "POST";
  payload?: unknown;
}

const defaultApiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:4010";

export function createMatchSyncService(options: MatchSyncServiceOptions = {}) {
  const apiBaseUrl = options.apiBaseUrl ?? defaultApiBaseUrl;
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date().toISOString());

  async function syncCompletedRoomIfNeeded(
    runtime: InMemoryRoomRuntime,
    roomId: string,
  ): Promise<void> {
    const room = runtime.getRoom(roomId);
    if (!room?.result) {
      return;
    }

    if (room.matchSync.status === "syncing" || room.matchSync.status === "synced") {
      return;
    }

    runtime.updateMatchSync(roomId, (current) => ({
      ...current,
      status: "syncing",
      attempts: current.attempts + 1,
      lastAttemptAt: now(),
      lastError: undefined,
    }));

    try {
      const resolvedMatch = resolveLeaderboardMatch(room.result, room.seats);
      await postJson(fetchImpl, `${apiBaseUrl}/leaderboard/matches/apply`, {
        match: resolvedMatch,
      });

      const escrowId = room.paymentsEscrowId ?? (await ensureEscrow(fetchImpl, apiBaseUrl, room));
      if (!room.paymentsEscrowId) {
        runtime.setPaymentsEscrowId(roomId, escrowId);
      }

      await postJson(fetchImpl, `${apiBaseUrl}/payments/settlements`, {
        escrowId,
        result: room.result,
        seatToPlayerId: toSeatToPlayerId(room.seats),
        strategy: "winners_equally",
      });

      runtime.updateMatchSync(roomId, (current) => ({
        ...current,
        status: "synced",
        syncedAt: now(),
        lastError: undefined,
      }));
    } catch (error) {
      runtime.updateMatchSync(roomId, (current) => ({
        ...current,
        status: "failed",
        lastError: error instanceof Error ? error.message : "match sync failed",
      }));
    }
  }

  return {
    syncCompletedRoomIfNeeded,
  };
}

async function ensureEscrow(
  fetchImpl: typeof fetch,
  apiBaseUrl: string,
  room: RoomRecord,
): Promise<string> {
  const escrow = await postJson<{ escrowId: string }>(fetchImpl, `${apiBaseUrl}/payments/escrows`, {
    sponsorId: "arena-demo-sponsor",
    gameId: room.game,
    matchId: room.matchId,
    fundedAmountUsd: getMatchPrizeUsd(room.game),
    currency: "USDC",
  });

  await postJson(fetchImpl, `${apiBaseUrl}/payments/escrows/${escrow.escrowId}/authorize`, {
    note: "auto-authorized by room sync",
  });
  await postJson(fetchImpl, `${apiBaseUrl}/payments/escrows/${escrow.escrowId}/fund`, {
    note: "auto-funded by room sync",
  });
  await postJson(fetchImpl, `${apiBaseUrl}/payments/escrows/${escrow.escrowId}/lock`, {
    note: "auto-locked by room sync",
  });

  return escrow.escrowId;
}

async function postJson<TResponse>(
  fetchImpl: typeof fetch,
  url: string,
  payload?: unknown,
): Promise<TResponse> {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body: typeof payload === "undefined" ? undefined : JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`request to ${url} failed with status ${response.status}`);
  }

  return (await response.json()) as TResponse;
}

function toSeatToPlayerId(assignments: SeatAssignment[]): Record<SeatId, string> {
  return assignments.reduce<Record<SeatId, string>>((accumulator, assignment) => {
    const playerId = assignment.privateSeat.playerId;
    if (!playerId) {
      throw new Error(`Seat ${assignment.publicSeat.seatId} is missing playerId`);
    }

    accumulator[assignment.publicSeat.seatId] = playerId;
    return accumulator;
  }, {});
}

function getMatchPrizeUsd(game: GameKey): number {
  switch (game) {
    case "auction":
      return 48;
    case "settlement":
      return 40;
    case "vault":
      return 32;
    case "pact":
      return 24;
    case "split":
      return 20;
    default:
      return 20;
  }
}

import type { GameKey, PublicRoomState, ReplayEnvelope, ReplayEvent } from "@arena/contracts";

const roomsBaseUrl = process.env.ROOMS_BASE_URL ?? "http://127.0.0.1:4011";

export interface ResultsSnapshot {
  room: PublicRoomState | null;
  replay: ReplayEnvelope | null;
  source: "live" | "fallback";
  baseUrl: string;
  state: "completed" | "incomplete" | "missing";
  isPreview: boolean;
}

const fallbackReplayEvents: ReplayEvent[] = [
  {
    sequence: 1,
    type: "room.created",
    occurredAt: "2026-04-16T09:20:00.000Z",
    publicPayload: {
      game: "auction",
      seatCount: 4,
    },
  },
  {
    sequence: 2,
    type: "room.phase",
    occurredAt: "2026-04-16T09:22:00.000Z",
    publicPayload: {
      phase: "active",
      round: 1,
    },
  },
  {
    sequence: 3,
    type: "auction.bid",
    occurredAt: "2026-04-16T09:23:00.000Z",
    actorSeatId: "seat_1",
    publicPayload: {
      amount: 6,
      pot: 24,
    },
  },
  {
    sequence: 4,
    type: "auction.pass",
    occurredAt: "2026-04-16T09:24:00.000Z",
    actorSeatId: "seat_2",
    publicPayload: {},
  },
  {
    sequence: 5,
    type: "auction.pass",
    occurredAt: "2026-04-16T09:24:30.000Z",
    actorSeatId: "seat_3",
    publicPayload: {},
  },
  {
    sequence: 6,
    type: "auction.pass",
    occurredAt: "2026-04-16T09:25:00.000Z",
    actorSeatId: "seat_4",
    publicPayload: {},
  },
  {
    sequence: 7,
    type: "match.result",
    occurredAt: "2026-04-16T09:25:05.000Z",
    publicPayload: {
      winningSeatIds: ["seat_1"],
      completedAt: "2026-04-16T09:25:05.000Z",
    },
  },
];

const fallbackRoomById: Record<string, PublicRoomState> = {
  "demo-auction-results": {
    roomId: "demo-auction-results",
    matchId: "match-demo-auction-results",
    game: "auction",
    phase: "results",
    round: 4,
    lastEventAt: "2026-04-16T09:25:05.000Z",
    seats: [
      {
        seatId: "seat_1",
        displayName: "Seat 1",
        avatarId: "mask-amber",
        isConnected: true,
        isReady: true,
        score: 24,
      },
      {
        seatId: "seat_4",
        displayName: "Seat 4",
        avatarId: "mask-verdant",
        isConnected: true,
        isReady: true,
        score: 12,
      },
      {
        seatId: "seat_2",
        displayName: "Seat 2",
        avatarId: "mask-cyan",
        isConnected: true,
        isReady: true,
        score: 4,
      },
      {
        seatId: "seat_3",
        displayName: "Seat 3",
        avatarId: "mask-rose",
        isConnected: true,
        isReady: true,
        score: -3,
      },
    ],
    publicState: {
      pot: 24,
      currentBid: 6,
      winnerSeatId: "seat_1",
      summary: "Seat 1 closed the final bid cycle and captured the largest share of the room.",
    },
  },
};

const fallbackReplayById: Record<string, ReplayEnvelope> = {
  "demo-auction-results": {
    matchId: "match-demo-auction-results",
    game: "auction",
    version: 1,
    seed: "match-demo-auction-results",
    createdAt: "2026-04-16T09:20:00.000Z",
    events: fallbackReplayEvents,
  },
};

export async function getResultsSnapshot(
  roomId: string,
  requestOrigin?: string,
): Promise<ResultsSnapshot> {
  const baseUrl = requestOrigin ?? roomsBaseUrl;
  const roomPath = requestOrigin
    ? `${baseUrl}/api/rooms/${encodeURIComponent(roomId)}`
    : `${baseUrl}/rooms/${encodeURIComponent(roomId)}`;
  const replayPath = requestOrigin
    ? `${baseUrl}/api/rooms/${encodeURIComponent(roomId)}/replay`
    : `${baseUrl}/rooms/${encodeURIComponent(roomId)}/replay`;
  const [room, replay] = await Promise.all([
    readJson<PublicRoomState>(roomPath),
    readJson<ReplayEnvelope>(replayPath),
  ]);

  if (room?.phase === "results") {
    return {
      room,
      replay,
      source: "live",
      baseUrl,
      state: "completed",
      isPreview: false,
    };
  }

  if (room) {
    return {
      room,
      replay,
      source: "live",
      baseUrl,
      state: "incomplete",
      isPreview: false,
    };
  }

  const fallbackRoom = fallbackRoomById[roomId] ?? fallbackRoomById["demo-auction-results"] ?? null;
  const fallbackReplay =
    fallbackReplayById[roomId] ?? fallbackReplayById["demo-auction-results"] ?? null;

  return {
    room: fallbackRoom,
    replay: fallbackReplay,
    source: "fallback",
    baseUrl,
    state: fallbackRoom ? "completed" : "missing",
    isPreview: true,
  };
}

export function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatScore(score: number | undefined): string {
  if (typeof score !== "number") {
    return "0";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    signDisplay: "exceptZero",
  }).format(score);
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function labelGame(game: GameKey): string {
  return game.charAt(0).toUpperCase() + game.slice(1);
}

export function getProjectedPrizeUsd(game: GameKey): number {
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

async function readJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

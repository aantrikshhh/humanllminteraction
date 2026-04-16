import type { GameKey, PublicRoomState, PublicSeatView } from "@arena/contracts";
import type { LeaderboardSnapshot, RankedGame } from "@arena/leaderboard";
import type { PlayerPaymentsSnapshot } from "@arena/payments";

type ApiEnvelope<T> = {
  ok: true;
  data: T;
};

export interface ServiceSnapshot<T> {
  data: T;
  source: "live" | "fallback";
  baseUrl: string;
}

const roomsBaseUrl = process.env.ROOMS_BASE_URL ?? "http://127.0.0.1:4011";
const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:4010";

const demoSeats: PublicSeatView[] = [
  {
    seatId: "seat-1",
    displayName: "Seat 1",
    avatarId: "mask-amber",
    isConnected: true,
    isReady: true,
    score: 9,
  },
  {
    seatId: "seat-2",
    displayName: "Seat 2",
    avatarId: "mask-cyan",
    isConnected: true,
    isReady: true,
    score: 4,
  },
  {
    seatId: "seat-3",
    displayName: "Seat 3",
    avatarId: "mask-rose",
    isConnected: true,
    isReady: false,
    score: 2,
  },
  {
    seatId: "seat-4",
    displayName: "Seat 4",
    avatarId: "mask-verdant",
    isConnected: true,
    isReady: true,
    score: 6,
  },
];

const fallbackRooms: PublicRoomState[] = [
  {
    roomId: "demo-auction-room",
    matchId: "match-demo-auction",
    game: "auction",
    phase: "active",
    round: 3,
    seats: demoSeats,
    publicState: {
      pot: 24,
      currentBid: 6,
      currentTurnSeatId: "seat-3",
    },
    lastEventAt: "2026-04-16T09:30:00.000Z",
  },
  {
    roomId: "demo-split-room",
    matchId: "match-demo-split",
    game: "split",
    phase: "ready",
    round: 1,
    seats: demoSeats.map((seat, index) => ({
      ...seat,
      score: index === 0 ? 3 : 0,
    })),
    publicState: {
      pot: 12,
      proposalSeatId: "seat-1",
    },
    lastEventAt: "2026-04-16T09:26:00.000Z",
  },
];

const fallbackLeaderboard: LeaderboardSnapshot = {
  game: "global",
  generatedAt: "2026-04-16T09:32:00.000Z",
  entries: [
    {
      game: "global",
      playerId: "player-iris",
      displayName: "Iris",
      rating: 1548,
      rank: 1,
      wins: 11,
      matchesPlayed: 16,
      generatedAt: "2026-04-16T09:32:00.000Z",
      lastMatchId: "match-demo-auction",
      lastCompletedAt: "2026-04-16T09:31:00.000Z",
    },
    {
      game: "global",
      playerId: "player-kestrel",
      displayName: "Kestrel",
      rating: 1521,
      rank: 2,
      wins: 9,
      matchesPlayed: 15,
      generatedAt: "2026-04-16T09:32:00.000Z",
      lastMatchId: "match-demo-auction",
      lastCompletedAt: "2026-04-16T09:31:00.000Z",
    },
    {
      game: "global",
      playerId: "player-sable",
      displayName: "Sable",
      rating: 1498,
      rank: 3,
      wins: 8,
      matchesPlayed: 14,
      generatedAt: "2026-04-16T09:32:00.000Z",
      lastMatchId: "match-demo-split",
      lastCompletedAt: "2026-04-16T09:28:00.000Z",
    },
    {
      game: "global",
      playerId: "player-orbit",
      displayName: "Orbit",
      rating: 1484,
      rank: 4,
      wins: 7,
      matchesPlayed: 13,
      generatedAt: "2026-04-16T09:32:00.000Z",
      lastMatchId: "match-demo-auction",
      lastCompletedAt: "2026-04-16T09:31:00.000Z",
    },
  ],
};

const fallbackPayments: PlayerPaymentsSnapshot = {
  wallet: {
    playerId: "demo-player",
    walletAddress: "0x7d64c9d2b0c8f6a2e2d6c7f1b8a5d4e2c1a9b7c5",
    availableUsd: 42,
    pendingUsd: 18,
    totalEarnedUsd: 60,
    connectionStatus: "connected",
    network: "stub-local",
    isSimulated: true,
    lastUpdatedAt: "2026-04-16T09:34:00.000Z",
  },
  escrowSummaries: [
    {
      escrowId: "escrow-demo-auction",
      sponsorId: "arena-demo-sponsor",
      gameId: "auction",
      matchId: "match-demo-auction",
      status: "settled",
      fundedAmountUsd: 50,
      reservedAmountUsd: 50,
      releasedAmountUsd: 50,
      currency: "USDC",
      isSimulated: true,
      createdAt: "2026-04-16T09:20:00.000Z",
      updatedAt: "2026-04-16T09:34:00.000Z",
      timeline: [
        {
          status: "draft",
          occurredAt: "2026-04-16T09:20:00.000Z",
          note: "escrow placeholder created",
        },
        {
          status: "funded_simulated",
          occurredAt: "2026-04-16T09:22:00.000Z",
          note: "funding simulated",
        },
        {
          status: "locked",
          occurredAt: "2026-04-16T09:24:00.000Z",
          note: "locked for match",
        },
        {
          status: "settled",
          occurredAt: "2026-04-16T09:34:00.000Z",
          note: "payouts released",
        },
      ],
    },
  ],
  payouts: [
    {
      payoutId: "payout-demo-auction",
      playerId: "demo-player",
      seatId: "seat-1",
      escrowId: "escrow-demo-auction",
      matchId: "match-demo-auction",
      amountUsd: 18,
      currency: "USDC",
      status: "ready",
      lifecycleStatus: "available_to_claim",
      isSimulated: true,
      createdAt: "2026-04-16T09:34:00.000Z",
      updatedAt: "2026-04-16T09:34:00.000Z",
      timeline: [
        {
          status: "pending_settlement",
          occurredAt: "2026-04-16T09:33:00.000Z",
          note: "result accepted",
        },
        {
          status: "available_to_claim",
          occurredAt: "2026-04-16T09:34:00.000Z",
          note: "ready for claim",
        },
      ],
    },
  ],
};

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

export async function getRoomsSnapshot(): Promise<ServiceSnapshot<PublicRoomState[]>> {
  const data = await readJson<PublicRoomState[]>(`${roomsBaseUrl}/rooms`);
  return {
    data: data ?? fallbackRooms,
    source: data ? "live" : "fallback",
    baseUrl: roomsBaseUrl,
  };
}

export async function getLeaderboardSnapshot(
  game: RankedGame = "global",
  limit = 12,
): Promise<ServiceSnapshot<LeaderboardSnapshot>> {
  const data = await readJson<ApiEnvelope<LeaderboardSnapshot>>(
    `${apiBaseUrl}/leaderboard?game=${encodeURIComponent(game)}&limit=${limit}`,
  );

  return {
    data: data?.data ?? fallbackLeaderboard,
    source: data?.data ? "live" : "fallback",
    baseUrl: apiBaseUrl,
  };
}

export async function getPaymentsSnapshot(
  playerId = "demo-player",
): Promise<ServiceSnapshot<PlayerPaymentsSnapshot>> {
  const data = await readJson<PlayerPaymentsSnapshot>(
    `${apiBaseUrl}/payments/players/${encodeURIComponent(playerId)}`,
  );

  return {
    data: data ?? fallbackPayments,
    source: data ? "live" : "fallback",
    baseUrl: apiBaseUrl,
  };
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

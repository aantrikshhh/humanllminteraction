import type {
  GameKey,
  MatchCompletionEnvelope,
  PublicMatchResultSummary,
  PublicMatchSyncState,
  PublicRoomState,
  PublicSeatView,
  ReplayEnvelope,
  SeatId,
} from "@arena/contracts";
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

export interface MatchLedgerSeatImpact {
  seatId: SeatId;
  playerId?: string;
  displayName: string;
  score: number;
  isWinner: boolean;
  leaderboard?: {
    delta: number;
    previousRating: number;
    newRating: number;
    expectedScore: number;
    actualScore: number;
    wonMatch: boolean;
    matchesPlayed: number;
    wins: number;
  };
  payout?: {
    payoutId: string;
    amountUsd: number;
    currency: "USD" | "USDC";
    status: "pending" | "ready" | "paid" | "failed";
    lifecycleStatus: string;
  };
}

export interface MatchLedgerRecord {
  matchId: string;
  roomId: string;
  game: GameKey;
  completedAt: string;
  status:
    | "completion_recorded"
    | "leaderboard_recorded"
    | "payments_recorded"
    | "fully_recorded";
  publicResult: PublicMatchResultSummary;
  completion: MatchCompletionEnvelope;
  matchSync?: PublicMatchSyncState;
  participants: Array<{
    seatId: SeatId;
    playerId?: string;
    displayName: string;
    score: number;
    isWinner: boolean;
  }>;
  seatImpacts: MatchLedgerSeatImpact[];
  leaderboard?: {
    appliedAt: string;
    applied: {
      game: RankedGame;
      processedAt: string;
      entries: Array<{
        playerId: string;
        displayName: string;
        delta: number;
        previousRating: number;
        newRating: number;
        expectedScore: number;
        actualScore: number;
        wonMatch: boolean;
        matchesPlayed: number;
        wins: number;
      }>;
    };
  };
  payments?: {
    settledAt: string;
    escrowId: string;
    totalPayoutUsd: number;
    payouts: Array<{
      payoutId: string;
      playerId: string;
      seatId: string;
      escrowId: string;
      matchId: string;
      amountUsd: number;
      currency: "USD" | "USDC";
      status: "pending" | "ready" | "paid" | "failed";
      lifecycleStatus: string;
      isSimulated: boolean;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  updatedAt: string;
}

const roomsBaseUrl = process.env.ROOMS_BASE_URL ?? "http://127.0.0.1:4011";
const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:4010";

const demoSeats: PublicSeatView[] = [
  {
    seatId: "seat_1",
    displayName: "Seat 1",
    avatarId: "mask-amber",
    isConnected: true,
    isReady: true,
    score: 9,
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
    isReady: false,
    score: 2,
  },
  {
    seatId: "seat_4",
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
      itemName: "Signal Relay",
      itemValue: 30,
      currentBid: 6,
      currentPot: 24,
      currentLeaderSeatId: "seat_1",
      currentTurnSeatId: "seat_3",
      turnIndex: 6,
      turnsRemaining: 5,
      maxTurns: 16,
      phase: "bidding",
      viewerCanAct: false,
      seats: [
        {
          ...demoSeats[0],
          committedBid: 6,
          hasPassed: false,
          isLeader: true,
        },
        {
          ...demoSeats[1],
          committedBid: 4,
          hasPassed: false,
          isLeader: false,
        },
        {
          ...demoSeats[2],
          committedBid: 2,
          hasPassed: false,
          isLeader: false,
        },
        {
          ...demoSeats[3],
          committedBid: 5,
          hasPassed: true,
          isLeader: false,
        },
      ],
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
      proposalSeatId: "seat_1",
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

const fallbackMatchLedgerByMatchId: Record<string, MatchLedgerRecord> = {
  "match-demo-auction": {
    matchId: "match-demo-auction",
    roomId: "demo-auction-room",
    game: "auction",
    completedAt: "2026-04-16T09:31:00.000Z",
    status: "fully_recorded",
    publicResult: {
      completedAt: "2026-04-16T09:31:00.000Z",
      winningSeatIds: ["seat_1"],
      seatScores: {
        seat_1: 18,
        seat_2: 11,
        seat_3: 7,
        seat_4: 6,
      },
    },
    completion: {
      matchId: "match-demo-auction",
      roomId: "demo-auction-room",
      game: "auction",
      completedAt: "2026-04-16T09:31:00.000Z",
      result: {
        matchId: "match-demo-auction",
        game: "auction",
        roomId: "demo-auction-room",
        completedAt: "2026-04-16T09:31:00.000Z",
        winningSeatIds: ["seat_1"],
        seatScores: {
          seat_1: 18,
          seat_2: 11,
          seat_3: 7,
          seat_4: 6,
        },
        behavioralOutput: [
          {
            metricKey: "bid_discipline",
            value: 0.82,
            confidence: 0.91,
          },
        ],
      },
      replay: {
        matchId: "match-demo-auction",
        roomId: "demo-auction-room",
        available: true,
        eventCount: 14,
      },
      seatToPlayerId: {
        seat_1: "player-iris",
        seat_2: "player-kestrel",
        seat_3: "player-sable",
        seat_4: "player-orbit",
      },
    },
    matchSync: {
      status: "synced",
      attempts: 1,
      lastAttemptAt: "2026-04-16T09:31:20.000Z",
      syncedAt: "2026-04-16T09:31:20.000Z",
    },
    participants: [
      {
        seatId: "seat_1",
        playerId: "player-iris",
        displayName: "Seat 1",
        score: 18,
        isWinner: true,
      },
      {
        seatId: "seat_2",
        playerId: "player-kestrel",
        displayName: "Seat 2",
        score: 11,
        isWinner: false,
      },
      {
        seatId: "seat_3",
        playerId: "player-sable",
        displayName: "Seat 3",
        score: 7,
        isWinner: false,
      },
      {
        seatId: "seat_4",
        playerId: "player-orbit",
        displayName: "Seat 4",
        score: 6,
        isWinner: false,
      },
    ],
    seatImpacts: [
      {
        seatId: "seat_1",
        playerId: "player-iris",
        displayName: "Seat 1",
        score: 18,
        isWinner: true,
        leaderboard: {
          delta: 24,
          previousRating: 1524,
          newRating: 1548,
          expectedScore: 0.58,
          actualScore: 1,
          wonMatch: true,
          matchesPlayed: 16,
          wins: 11,
        },
        payout: {
          payoutId: "payout-demo-auction",
          amountUsd: 18,
          currency: "USDC",
          status: "ready",
          lifecycleStatus: "available_to_claim",
        },
      },
      {
        seatId: "seat_2",
        playerId: "player-kestrel",
        displayName: "Seat 2",
        score: 11,
        isWinner: false,
        leaderboard: {
          delta: 7,
          previousRating: 1514,
          newRating: 1521,
          expectedScore: 0.49,
          actualScore: 0.5,
          wonMatch: false,
          matchesPlayed: 15,
          wins: 9,
        },
      },
      {
        seatId: "seat_3",
        playerId: "player-sable",
        displayName: "Seat 3",
        score: 7,
        isWinner: false,
        leaderboard: {
          delta: -3,
          previousRating: 1501,
          newRating: 1498,
          expectedScore: 0.44,
          actualScore: 0.25,
          wonMatch: false,
          matchesPlayed: 14,
          wins: 8,
        },
      },
      {
        seatId: "seat_4",
        playerId: "player-orbit",
        displayName: "Seat 4",
        score: 6,
        isWinner: false,
        leaderboard: {
          delta: -6,
          previousRating: 1490,
          newRating: 1484,
          expectedScore: 0.39,
          actualScore: 0.25,
          wonMatch: false,
          matchesPlayed: 13,
          wins: 7,
        },
      },
    ],
    leaderboard: {
      appliedAt: "2026-04-16T09:31:15.000Z",
      applied: {
        game: "global",
        processedAt: "2026-04-16T09:31:15.000Z",
        entries: [
          {
            playerId: "player-iris",
            displayName: "Iris",
            delta: 24,
            previousRating: 1524,
            newRating: 1548,
            expectedScore: 0.58,
            actualScore: 1,
            wonMatch: true,
            matchesPlayed: 16,
            wins: 11,
          },
          {
            playerId: "player-kestrel",
            displayName: "Kestrel",
            delta: 7,
            previousRating: 1514,
            newRating: 1521,
            expectedScore: 0.49,
            actualScore: 0.5,
            wonMatch: false,
            matchesPlayed: 15,
            wins: 9,
          },
          {
            playerId: "player-sable",
            displayName: "Sable",
            delta: -3,
            previousRating: 1501,
            newRating: 1498,
            expectedScore: 0.44,
            actualScore: 0.25,
            wonMatch: false,
            matchesPlayed: 14,
            wins: 8,
          },
          {
            playerId: "player-orbit",
            displayName: "Orbit",
            delta: -6,
            previousRating: 1490,
            newRating: 1484,
            expectedScore: 0.39,
            actualScore: 0.25,
            wonMatch: false,
            matchesPlayed: 13,
            wins: 7,
          },
        ],
      },
    },
    payments: {
      settledAt: "2026-04-16T09:34:00.000Z",
      escrowId: "escrow-demo-auction",
      totalPayoutUsd: 18,
      payouts: [
        {
          payoutId: "payout-demo-auction",
          playerId: "demo-player",
          seatId: "seat_1",
          escrowId: "escrow-demo-auction",
          matchId: "match-demo-auction",
          amountUsd: 18,
          currency: "USDC",
          status: "ready",
          lifecycleStatus: "available_to_claim",
          isSimulated: true,
          createdAt: "2026-04-16T09:34:00.000Z",
          updatedAt: "2026-04-16T09:34:00.000Z",
        },
      ],
    },
    updatedAt: "2026-04-16T09:34:00.000Z",
  },
};

const fallbackMatchLedgerByRoomId: Record<string, MatchLedgerRecord> = {
  "demo-auction-room": fallbackMatchLedgerByMatchId["match-demo-auction"],
  "demo-auction-results": fallbackMatchLedgerByMatchId["match-demo-auction"],
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

export async function getRoomSnapshot(
  roomId: string,
): Promise<ServiceSnapshot<PublicRoomState | null>> {
  const data = await readJson<PublicRoomState>(`${roomsBaseUrl}/rooms/${encodeURIComponent(roomId)}`);
  return {
    data: data ?? fallbackRooms.find((room) => room.roomId === roomId) ?? null,
    source: data ? "live" : "fallback",
    baseUrl: roomsBaseUrl,
  };
}

export async function getReplaySnapshot(
  roomId: string,
): Promise<ServiceSnapshot<ReplayEnvelope | null>> {
  const data = await readJson<ReplayEnvelope>(
    `${roomsBaseUrl}/rooms/${encodeURIComponent(roomId)}/replay`,
  );
  return {
    data: data ?? null,
    source: data ? "live" : "fallback",
    baseUrl: roomsBaseUrl,
  };
}

export async function getMatchLedgerByMatchId(
  matchId: string,
): Promise<ServiceSnapshot<MatchLedgerRecord | null>> {
  const data = await readJson<ApiEnvelope<MatchLedgerRecord>>(
    `${apiBaseUrl}/matches/${encodeURIComponent(matchId)}`,
  );

  return {
    data: data?.data ?? fallbackMatchLedgerByMatchId[matchId] ?? null,
    source: data?.data ? "live" : "fallback",
    baseUrl: apiBaseUrl,
  };
}

export async function getMatchLedgerByRoomId(
  roomId: string,
): Promise<ServiceSnapshot<MatchLedgerRecord | null>> {
  const data = await readJson<ApiEnvelope<MatchLedgerRecord>>(
    `${apiBaseUrl}/matches/rooms/${encodeURIComponent(roomId)}`,
  );

  return {
    data: data?.data ?? fallbackMatchLedgerByRoomId[roomId] ?? null,
    source: data?.data ? "live" : "fallback",
    baseUrl: apiBaseUrl,
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

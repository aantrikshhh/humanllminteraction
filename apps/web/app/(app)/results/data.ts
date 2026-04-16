import type {
  GameKey,
  PublicMatchResultSummary,
  PublicMatchSyncState,
  PublicRoomState,
  ReplayEnvelope,
  ReplayEvent,
} from "@arena/contracts";

const roomsBaseUrl = process.env.ROOMS_BASE_URL ?? "http://127.0.0.1:4011";
const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:4010";

interface ApiEnvelope<T> {
  ok: true;
  data: T;
}

export interface ResultsMatchLedgerSeatImpact {
  seatId: string;
  playerId?: string;
  displayName: string;
  score: number;
  isWinner: boolean;
  leaderboard?: {
    delta: number;
    previousRating: number;
    newRating: number;
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

export interface ResultsMatchLedger {
  status: string;
  publicResult: PublicMatchResultSummary;
  matchSync?: PublicMatchSyncState;
  seatImpacts: ResultsMatchLedgerSeatImpact[];
  payments?: {
    settledAt: string;
    escrowId: string;
    totalPayoutUsd: number;
  };
  updatedAt: string;
}

export interface ResultsSnapshot {
  room: PublicRoomState | null;
  replay: ReplayEnvelope | null;
  matchLedger: ResultsMatchLedger | null;
  source: "live" | "fallback";
  baseUrl: string;
  state: "completed" | "incomplete" | "missing";
  isPreview: boolean;
}

const seatCatalog = [
  { seatId: "seat_1", displayName: "Mask 1", avatarId: "mask-amber" },
  { seatId: "seat_2", displayName: "Mask 2", avatarId: "mask-cyan" },
  { seatId: "seat_3", displayName: "Mask 3", avatarId: "mask-rose" },
  { seatId: "seat_4", displayName: "Mask 4", avatarId: "mask-verdant" },
];

interface ResultFixture {
  roomId: string;
  matchId: string;
  game: GameKey;
  completedAt: string;
  winningSeatIds: string[];
  seatScores: Record<string, number>;
  summary: string;
  publicState: Record<string, unknown>;
  replayEvents: ReplayEvent[];
  seatImpacts: ResultsMatchLedgerSeatImpact[];
  payments?: ResultsMatchLedger["payments"];
}

function buildSeats(seatScores: Record<string, number>) {
  return seatCatalog.map((seat) => ({
    ...seat,
    isConnected: true,
    isReady: true,
    score: seatScores[seat.seatId],
  }));
}

const fallbackResultFixtures: ResultFixture[] = [
  {
    roomId: "demo-auction-results",
    matchId: "match-demo-auction",
    game: "auction",
    completedAt: "2026-04-16T09:31:00.000Z",
    winningSeatIds: ["seat_1"],
    seatScores: { seat_1: 21, seat_2: 12, seat_3: 6, seat_4: 3 },
    summary:
      "Mask 1 held the final price line on the Signal Relay and converted the room with the cleanest late-bid discipline.",
    publicState: {
      itemName: "Signal Relay",
      finalBid: 8,
      finalPot: 21,
      winnerSeatId: "seat_1",
      summary:
        "Mask 1 held the final price line on the Signal Relay and converted the room with the cleanest late-bid discipline.",
    },
    replayEvents: [
      { sequence: 1, type: "room.created", occurredAt: "2026-04-16T09:20:00.000Z", publicPayload: { game: "auction", seatCount: 4 } },
      { sequence: 2, type: "auction.bid", occurredAt: "2026-04-16T09:24:00.000Z", actorSeatId: "seat_2", publicPayload: { amount: 6, pot: 15 } },
      { sequence: 3, type: "auction.bid", occurredAt: "2026-04-16T09:26:00.000Z", actorSeatId: "seat_1", publicPayload: { amount: 8, pot: 21 } },
      { sequence: 4, type: "match.result", occurredAt: "2026-04-16T09:31:00.000Z", publicPayload: { winningSeatIds: ["seat_1"], completedAt: "2026-04-16T09:31:00.000Z" } },
    ],
    seatImpacts: [
      {
        seatId: "seat_1",
        playerId: "demo-player",
        displayName: "Mask 1",
        score: 21,
        isWinner: true,
        leaderboard: { delta: 16, previousRating: 1530, newRating: 1546, matchesPlayed: 15, wins: 10 },
        payout: { payoutId: "payout-demo-auction", amountUsd: 18, currency: "USDC", status: "ready", lifecycleStatus: "available_to_claim" },
      },
      {
        seatId: "seat_2",
        playerId: "player-kestrel",
        displayName: "Mask 2",
        score: 12,
        isWinner: false,
        leaderboard: { delta: 5, previousRating: 1527, newRating: 1532, matchesPlayed: 17, wins: 10 },
      },
      {
        seatId: "seat_3",
        playerId: "player-sable",
        displayName: "Mask 3",
        score: 6,
        isWinner: false,
        leaderboard: { delta: -4, previousRating: 1522, newRating: 1518, matchesPlayed: 14, wins: 8 },
      },
      {
        seatId: "seat_4",
        playerId: "player-orbit",
        displayName: "Mask 4",
        score: 3,
        isWinner: false,
        leaderboard: { delta: -5, previousRating: 1509, newRating: 1504, matchesPlayed: 13, wins: 7 },
      },
    ],
    payments: {
      settledAt: "2026-04-16T09:34:00.000Z",
      escrowId: "escrow-demo-auction",
      totalPayoutUsd: 18,
    },
  },
  {
    roomId: "demo-split-results",
    matchId: "match-demo-split",
    game: "split",
    completedAt: "2026-04-16T08:42:00.000Z",
    winningSeatIds: ["seat_2"],
    seatScores: { seat_1: 6, seat_2: 14 },
    summary:
      "Mask 2 rejected the soft split, forced a cleaner second offer, and closed the room with the higher share.",
    publicState: {
      pot: 20,
      acceptedSplit: { seat_1: 6, seat_2: 14 },
      winnerSeatId: "seat_2",
      summary:
        "Mask 2 rejected the soft split, forced a cleaner second offer, and closed the room with the higher share.",
    },
    replayEvents: [
      { sequence: 1, type: "room.created", occurredAt: "2026-04-16T08:33:00.000Z", publicPayload: { game: "split", seatCount: 2 } },
      { sequence: 2, type: "split.offer", occurredAt: "2026-04-16T08:35:00.000Z", actorSeatId: "seat_1", publicPayload: { offer: { seat_1: 8, seat_2: 12 } } },
      { sequence: 3, type: "split.reject", occurredAt: "2026-04-16T08:37:00.000Z", actorSeatId: "seat_2", publicPayload: {} },
      { sequence: 4, type: "split.offer", occurredAt: "2026-04-16T08:40:00.000Z", actorSeatId: "seat_2", publicPayload: { offer: { seat_1: 6, seat_2: 14 } } },
      { sequence: 5, type: "match.result", occurredAt: "2026-04-16T08:42:00.000Z", publicPayload: { winningSeatIds: ["seat_2"], completedAt: "2026-04-16T08:42:00.000Z" } },
    ],
    seatImpacts: [
      {
        seatId: "seat_1",
        playerId: "player-helios",
        displayName: "Mask 1",
        score: 6,
        isWinner: false,
        leaderboard: { delta: -4, previousRating: 1483, newRating: 1479, matchesPlayed: 11, wins: 5 },
      },
      {
        seatId: "seat_2",
        playerId: "demo-player",
        displayName: "Mask 2",
        score: 14,
        isWinner: true,
        leaderboard: { delta: 9, previousRating: 1537, newRating: 1546, matchesPlayed: 15, wins: 10 },
        payout: { payoutId: "payout-demo-split", amountUsd: 14, currency: "USDC", status: "paid", lifecycleStatus: "claimed_simulated" },
      },
    ],
    payments: {
      settledAt: "2026-04-16T08:47:00.000Z",
      escrowId: "escrow-demo-split",
      totalPayoutUsd: 14,
    },
  },
  {
    roomId: "demo-pact-results",
    matchId: "match-demo-pact",
    game: "pact",
    completedAt: "2026-04-16T08:56:00.000Z",
    winningSeatIds: ["seat_2"],
    seatScores: { seat_1: 9, seat_2: 11 },
    summary:
      "Mask 2 protected the final two rounds and edged the pact room after a single decisive endgame betrayal.",
    publicState: {
      roundCount: 10,
      finalTrustIndex: 0.46,
      winnerSeatId: "seat_2",
      summary:
        "Mask 2 protected the final two rounds and edged the pact room after a single decisive endgame betrayal.",
    },
    replayEvents: [
      { sequence: 1, type: "room.created", occurredAt: "2026-04-16T08:44:00.000Z", publicPayload: { game: "pact", seatCount: 2 } },
      { sequence: 2, type: "pact.commit", occurredAt: "2026-04-16T08:48:00.000Z", actorSeatId: "seat_1", publicPayload: { round: 4, commitment: "cooperate" } },
      { sequence: 3, type: "pact.commit", occurredAt: "2026-04-16T08:54:00.000Z", actorSeatId: "seat_2", publicPayload: { round: 10, commitment: "betray" } },
      { sequence: 4, type: "match.result", occurredAt: "2026-04-16T08:56:00.000Z", publicPayload: { winningSeatIds: ["seat_2"], completedAt: "2026-04-16T08:56:00.000Z" } },
    ],
    seatImpacts: [
      {
        seatId: "seat_1",
        playerId: "demo-player",
        displayName: "Mask 1",
        score: 9,
        isWinner: false,
        leaderboard: { delta: -3, previousRating: 1549, newRating: 1546, matchesPlayed: 15, wins: 10 },
      },
      {
        seatId: "seat_2",
        playerId: "player-orbit",
        displayName: "Mask 2",
        score: 11,
        isWinner: true,
        leaderboard: { delta: 4, previousRating: 1500, newRating: 1504, matchesPlayed: 13, wins: 7 },
      },
    ],
  },
  {
    roomId: "demo-vault-results",
    matchId: "match-demo-vault",
    game: "vault",
    completedAt: "2026-04-16T09:12:00.000Z",
    winningSeatIds: ["seat_4"],
    seatScores: { seat_1: 7, seat_2: 9, seat_3: 12, seat_4: 16 },
    summary:
      "Mask 4 stayed quiet through the accusation cycle, took the final vault line, and left settlement pending for the winner.",
    publicState: {
      vaultValue: 44,
      accusationSeatId: "seat_2",
      winnerSeatId: "seat_4",
      summary:
        "Mask 4 stayed quiet through the accusation cycle, took the final vault line, and left settlement pending for the winner.",
    },
    replayEvents: [
      { sequence: 1, type: "room.created", occurredAt: "2026-04-16T09:00:00.000Z", publicPayload: { game: "vault", seatCount: 4 } },
      { sequence: 2, type: "vault.contribute", occurredAt: "2026-04-16T09:05:00.000Z", actorSeatId: "seat_4", publicPayload: { contribution: 5, vaultValue: 31 } },
      { sequence: 3, type: "vault.accuse", occurredAt: "2026-04-16T09:09:00.000Z", actorSeatId: "seat_2", publicPayload: { targetSeatId: "seat_3" } },
      { sequence: 4, type: "match.result", occurredAt: "2026-04-16T09:12:00.000Z", publicPayload: { winningSeatIds: ["seat_4"], completedAt: "2026-04-16T09:12:00.000Z" } },
    ],
    seatImpacts: [
      {
        seatId: "seat_1",
        playerId: "player-sable",
        displayName: "Mask 1",
        score: 7,
        isWinner: false,
        leaderboard: { delta: -2, previousRating: 1520, newRating: 1518, matchesPlayed: 14, wins: 8 },
      },
      {
        seatId: "seat_2",
        playerId: "player-rune",
        displayName: "Mask 2",
        score: 9,
        isWinner: false,
        leaderboard: { delta: -1, previousRating: 1492, newRating: 1491, matchesPlayed: 12, wins: 6 },
      },
      {
        seatId: "seat_3",
        playerId: "player-iris",
        displayName: "Mask 3",
        score: 12,
        isWinner: false,
        leaderboard: { delta: 0, previousRating: 1568, newRating: 1568, matchesPlayed: 18, wins: 12 },
      },
      {
        seatId: "seat_4",
        playerId: "demo-player",
        displayName: "Mask 4",
        score: 16,
        isWinner: true,
        leaderboard: { delta: 0, previousRating: 1546, newRating: 1546, matchesPlayed: 15, wins: 10 },
        payout: { payoutId: "payout-demo-vault", amountUsd: 11, currency: "USDC", status: "pending", lifecycleStatus: "pending_settlement" },
      },
    ],
    payments: {
      settledAt: "2026-04-16T09:12:15.000Z",
      escrowId: "escrow-demo-vault",
      totalPayoutUsd: 11,
    },
  },
  {
    roomId: "demo-settlement-results",
    matchId: "match-demo-settlement",
    game: "settlement",
    completedAt: "2026-04-16T09:48:00.000Z",
    winningSeatIds: ["seat_3"],
    seatScores: { seat_1: 18, seat_2: 20, seat_3: 24, seat_4: 13 },
    summary:
      "Mask 3 stabilized the harbor vote, held food output through the shortage, and closed the settlement with the largest civic score.",
    publicState: {
      districts: [
        { district: "Granary", ownerSeatId: "seat_3", output: 8 },
        { district: "Harbor", ownerSeatId: "seat_3", output: 7 },
        { district: "Forge", ownerSeatId: "seat_2", output: 5 },
      ],
      crisisResolved: true,
      winnerSeatId: "seat_3",
      summary:
        "Mask 3 stabilized the harbor vote, held food output through the shortage, and closed the settlement with the largest civic score.",
    },
    replayEvents: [
      { sequence: 1, type: "room.created", occurredAt: "2026-04-16T09:34:00.000Z", publicPayload: { game: "settlement", seatCount: 4 } },
      { sequence: 2, type: "settlement.vote", occurredAt: "2026-04-16T09:41:00.000Z", actorSeatId: "seat_3", publicPayload: { measure: "harbor_rationing", passed: true } },
      { sequence: 3, type: "settlement.crisis", occurredAt: "2026-04-16T09:45:00.000Z", publicPayload: { type: "late_harvest_shortage", resolved: true } },
      { sequence: 4, type: "match.result", occurredAt: "2026-04-16T09:48:00.000Z", publicPayload: { winningSeatIds: ["seat_3"], completedAt: "2026-04-16T09:48:00.000Z" } },
    ],
    seatImpacts: [
      {
        seatId: "seat_1",
        playerId: "player-rune",
        displayName: "Mask 1",
        score: 18,
        isWinner: false,
        leaderboard: { delta: 0, previousRating: 1491, newRating: 1491, matchesPlayed: 12, wins: 6 },
      },
      {
        seatId: "seat_2",
        playerId: "player-iris",
        displayName: "Mask 2",
        score: 20,
        isWinner: false,
        leaderboard: { delta: 0, previousRating: 1568, newRating: 1568, matchesPlayed: 18, wins: 12 },
      },
      {
        seatId: "seat_3",
        playerId: "demo-player",
        displayName: "Mask 3",
        score: 24,
        isWinner: true,
        leaderboard: { delta: 0, previousRating: 1546, newRating: 1546, matchesPlayed: 15, wins: 10 },
        payout: { payoutId: "payout-demo-settlement", amountUsd: 23, currency: "USDC", status: "paid", lifecycleStatus: "claimed_simulated" },
      },
      {
        seatId: "seat_4",
        playerId: "player-kestrel",
        displayName: "Mask 4",
        score: 13,
        isWinner: false,
        leaderboard: { delta: 0, previousRating: 1532, newRating: 1532, matchesPlayed: 17, wins: 10 },
      },
    ],
    payments: {
      settledAt: "2026-04-16T09:53:00.000Z",
      escrowId: "escrow-demo-settlement",
      totalPayoutUsd: 23,
    },
  },
];

const fallbackRoomById = Object.fromEntries(
  fallbackResultFixtures.map((fixture) => {
    const lastEvent = fixture.replayEvents.at(-1);
    return [
      fixture.roomId,
      {
        roomId: fixture.roomId,
        matchId: fixture.matchId,
        game: fixture.game,
        phase: "results",
        round: fixture.replayEvents.length,
        lastEventAt: lastEvent?.occurredAt ?? fixture.completedAt,
        seats: buildSeats(fixture.seatScores),
        publicResult: {
          completedAt: fixture.completedAt,
          winningSeatIds: fixture.winningSeatIds,
          seatScores: fixture.seatScores,
        },
        replaySummary: {
          available: true,
          eventCount: fixture.replayEvents.length,
          lastSequence: lastEvent?.sequence,
          lastOccurredAt: lastEvent?.occurredAt,
        },
        matchSync: {
          status: "synced",
          attempts: 1,
          lastAttemptAt: fixture.payments?.settledAt ?? fixture.completedAt,
          syncedAt: fixture.payments?.settledAt ?? fixture.completedAt,
        },
        publicState: fixture.publicState,
      } satisfies PublicRoomState,
    ];
  }),
) as Record<string, PublicRoomState>;

const fallbackReplayById = Object.fromEntries(
  fallbackResultFixtures.map((fixture) => [
    fixture.roomId,
    {
      matchId: fixture.matchId,
      game: fixture.game,
      version: 1,
      seed: fixture.matchId,
      createdAt: fixture.replayEvents[0]?.occurredAt ?? fixture.completedAt,
      events: fixture.replayEvents,
    } satisfies ReplayEnvelope,
  ]),
) as Record<string, ReplayEnvelope>;

const fallbackMatchLedgerById = Object.fromEntries(
  fallbackResultFixtures.map((fixture) => [
    fixture.roomId,
    {
      status: fixture.payments ? "fully_recorded" : "leaderboard_recorded",
      publicResult: {
        completedAt: fixture.completedAt,
        winningSeatIds: fixture.winningSeatIds,
        seatScores: fixture.seatScores,
      },
      matchSync: {
        status: "synced",
        attempts: 1,
        lastAttemptAt: fixture.payments?.settledAt ?? fixture.completedAt,
        syncedAt: fixture.payments?.settledAt ?? fixture.completedAt,
      },
      seatImpacts: fixture.seatImpacts,
      payments: fixture.payments,
      updatedAt: fixture.payments?.settledAt ?? fixture.completedAt,
    } satisfies ResultsMatchLedger,
  ]),
) as Record<string, ResultsMatchLedger>;

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
  const [room, replay, matchLedgerResponse] = await Promise.all([
    readJson<PublicRoomState>(roomPath),
    readJson<ReplayEnvelope>(replayPath),
    readJson<ApiEnvelope<ResultsMatchLedger>>(`${apiBaseUrl}/matches/rooms/${encodeURIComponent(roomId)}`),
  ]);
  const matchLedger = matchLedgerResponse?.data ?? null;

  if (room?.phase === "results") {
    return {
      room,
      replay,
      matchLedger,
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
      matchLedger,
      source: "live",
      baseUrl,
      state: "incomplete",
      isPreview: false,
    };
  }

  const fallbackRoom = fallbackRoomById[roomId] ?? null;
  const fallbackReplay = fallbackReplayById[roomId] ?? null;
  const fallbackMatchLedger = fallbackMatchLedgerById[roomId] ?? null;

  return {
    room: fallbackRoom,
    replay: fallbackReplay,
    matchLedger: fallbackMatchLedger,
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

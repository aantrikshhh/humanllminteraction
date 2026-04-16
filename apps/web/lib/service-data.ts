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

const generatedAt = "2026-04-16T09:58:00.000Z";

const seatCatalog: Array<{ seatId: SeatId; displayName: string; avatarId: string }> = [
  { seatId: "seat_1", displayName: "Mask 1", avatarId: "mask-amber" },
  { seatId: "seat_2", displayName: "Mask 2", avatarId: "mask-cyan" },
  { seatId: "seat_3", displayName: "Mask 3", avatarId: "mask-rose" },
  { seatId: "seat_4", displayName: "Mask 4", avatarId: "mask-verdant" },
];

type WalletSeed = {
  walletAddress: string;
  availableUsd: number;
  pendingUsd: number;
  totalEarnedUsd: number;
  connectionStatus: "connected" | "connecting" | "disconnected";
};

interface DemoCompletedParticipant {
  seatId: SeatId;
  playerId: string;
  playerDisplayName: string;
  score: number;
  delta: number;
  previousRating: number;
  newRating: number;
  expectedScore: number;
  actualScore: number;
  matchesPlayed: number;
  wins: number;
}

interface DemoCompletedMatchFixture {
  roomId: string;
  matchId: string;
  game: GameKey;
  completedAt: string;
  winningSeatIds: SeatId[];
  participants: DemoCompletedParticipant[];
  summary: string;
  publicState: Record<string, unknown>;
  behavioralOutput: MatchCompletionEnvelope["result"]["behavioralOutput"];
  replayEvents: ReplayEnvelope["events"];
  payout?: {
    payoutId: string;
    playerId: string;
    seatId: SeatId;
    escrowId: string;
    amountUsd: number;
    status: "pending" | "ready" | "paid" | "failed";
    lifecycleStatus: string;
    createdAt: string;
    updatedAt: string;
  };
}

const walletSeeds: Record<string, WalletSeed> = {
  "demo-player": {
    walletAddress: "0x7d64c9d2b0c8f6a2e2d6c7f1b8a5d4e2c1a9b7c5",
    availableUsd: 61,
    pendingUsd: 29,
    totalEarnedUsd: 90,
    connectionStatus: "connected",
  },
  "player-iris": {
    walletAddress: "0x9a11f0e8d4a2c18b47de9132051e7a43813bc0da",
    availableUsd: 34,
    pendingUsd: 0,
    totalEarnedUsd: 34,
    connectionStatus: "connected",
  },
  "player-kestrel": {
    walletAddress: "0xe72c5f8ab14d7fce65c2034d17524b670299af10",
    availableUsd: 12,
    pendingUsd: 0,
    totalEarnedUsd: 12,
    connectionStatus: "connected",
  },
};

const leaderboardEntriesBase = [
  {
    playerId: "player-iris",
    displayName: "Iris",
    rating: 1568,
    wins: 12,
    matchesPlayed: 18,
    lastMatchId: "match-demo-settlement",
    lastCompletedAt: "2026-04-16T09:48:00.000Z",
  },
  {
    playerId: "demo-player",
    displayName: "Cipher",
    rating: 1546,
    wins: 10,
    matchesPlayed: 15,
    lastMatchId: "match-demo-auction",
    lastCompletedAt: "2026-04-16T09:31:00.000Z",
  },
  {
    playerId: "player-kestrel",
    displayName: "Kestrel",
    rating: 1532,
    wins: 10,
    matchesPlayed: 17,
    lastMatchId: "match-demo-auction",
    lastCompletedAt: "2026-04-16T09:31:00.000Z",
  },
  {
    playerId: "player-sable",
    displayName: "Sable",
    rating: 1518,
    wins: 8,
    matchesPlayed: 14,
    lastMatchId: "match-demo-vault",
    lastCompletedAt: "2026-04-16T09:12:00.000Z",
  },
  {
    playerId: "player-orbit",
    displayName: "Orbit",
    rating: 1504,
    wins: 7,
    matchesPlayed: 13,
    lastMatchId: "match-demo-pact",
    lastCompletedAt: "2026-04-16T08:56:00.000Z",
  },
  {
    playerId: "player-rune",
    displayName: "Rune",
    rating: 1491,
    wins: 6,
    matchesPlayed: 12,
    lastMatchId: "match-demo-settlement",
    lastCompletedAt: "2026-04-16T09:48:00.000Z",
  },
  {
    playerId: "player-helios",
    displayName: "Helios",
    rating: 1479,
    wins: 5,
    matchesPlayed: 11,
    lastMatchId: "match-demo-split",
    lastCompletedAt: "2026-04-16T08:42:00.000Z",
  },
];

function buildSeatViews(
  seatScores: Partial<Record<SeatId, number>>,
  options: {
    readySeatIds?: SeatId[];
    connectedSeatIds?: SeatId[];
  } = {},
): PublicSeatView[] {
  const readySeatIds = new Set(options.readySeatIds ?? seatCatalog.map((seat) => seat.seatId));
  const connectedSeatIds = new Set(
    options.connectedSeatIds ?? seatCatalog.map((seat) => seat.seatId),
  );

  return seatCatalog.map((seat) => ({
    ...seat,
    isConnected: connectedSeatIds.has(seat.seatId),
    isReady: readySeatIds.has(seat.seatId),
    score: seatScores[seat.seatId],
  }));
}

function getSeatLabel(seatId: SeatId): string {
  return seatCatalog.find((seat) => seat.seatId === seatId)?.displayName ?? seatId;
}

function getSeatAvatar(seatId: SeatId): string {
  return seatCatalog.find((seat) => seat.seatId === seatId)?.avatarId ?? "mask-neutral";
}

const liveRooms: PublicRoomState[] = [
  {
    roomId: "demo-auction-room",
    matchId: "match-live-auction-0416",
    game: "auction",
    phase: "active",
    round: 2,
    seats: buildSeatViews(
      {
        seat_1: 8,
        seat_2: 6,
        seat_3: 3,
        seat_4: 0,
      },
      {
        readySeatIds: ["seat_1", "seat_2", "seat_3"],
      },
    ),
    publicState: {
      itemName: "Blackmail Ledger",
      itemValue: 9,
      currentBid: 5,
      currentPot: 11,
      currentLeaderSeatId: "seat_1",
      currentTurnSeatId: "seat_4",
      turnIndex: 7,
      turnsRemaining: 2,
      maxTurns: 6,
      phase: "late_bidding",
      summary:
        "Round 2 of 3. Mask 1 leads the 9-credit Ledger at 5 while Mask 4 decides whether to spend now or preserve bankroll for the 7-credit final prize.",
      viewerCanAct: true,
      seats: [
        {
          ...buildSeatViews({ seat_1: 8, seat_2: 6, seat_3: 3, seat_4: 0 })[0],
          committedBid: 5,
          hasPassed: false,
          isLeader: true,
        },
        {
          ...buildSeatViews({ seat_1: 8, seat_2: 6, seat_3: 3, seat_4: 0 })[1],
          committedBid: 4,
          hasPassed: false,
          isLeader: false,
        },
        {
          ...buildSeatViews({ seat_1: 8, seat_2: 6, seat_3: 3, seat_4: 0 })[2],
          committedBid: 2,
          hasPassed: true,
          isLeader: false,
        },
        {
          ...buildSeatViews({ seat_1: 8, seat_2: 6, seat_3: 3, seat_4: 0 })[3],
          committedBid: 0,
          hasPassed: false,
          isLeader: false,
        },
      ],
    },
    lastEventAt: "2026-04-16T09:56:00.000Z",
    joinState: {
      canJoin: true,
      openSeatIds: ["seat_4"],
      claimedSeatIds: ["seat_1", "seat_2", "seat_3"],
    },
  },
  {
    roomId: "demo-split-room",
    matchId: "match-live-split-0416",
    game: "split",
    phase: "ready",
    round: 1,
    seats: buildSeatViews(
      {
        seat_1: 0,
        seat_2: 0,
      },
      {
        readySeatIds: ["seat_1"],
      },
    ),
    publicState: {
      pot: 20,
      proposalSeatId: "seat_2",
      acceptedSeatIds: [],
      summary: "Mask 2 is setting the first split. Mask 1 is ready, the fourth seat stays closed for this head-to-head room.",
    },
    lastEventAt: "2026-04-16T09:50:00.000Z",
    joinState: {
      canJoin: true,
      openSeatIds: ["seat_2"],
      claimedSeatIds: ["seat_1"],
    },
  },
  {
    roomId: "demo-pact-room",
    matchId: "match-live-pact-0416",
    game: "pact",
    phase: "active",
    round: 6,
    seats: buildSeatViews(
      {
        seat_1: 11,
        seat_2: 9,
      },
      {
        readySeatIds: ["seat_1", "seat_2"],
      },
    ),
    publicState: {
      roundLabel: "Round 6 of 10",
      commitmentCount: 2,
      trustIndex: 0.57,
      summary: "The room is balanced on reciprocation. One more betrayal likely flips the advantage permanently.",
      historyPreview: [
        "Rounds 1-3 stayed cooperative.",
        "Round 4 introduced a single defection.",
        "Rounds 5-6 returned to mirrored play.",
      ],
    },
    lastEventAt: "2026-04-16T09:53:00.000Z",
    joinState: {
      canJoin: false,
      openSeatIds: [],
      claimedSeatIds: ["seat_1", "seat_2"],
    },
  },
  {
    roomId: "demo-vault-room",
    matchId: "match-live-vault-0416",
    game: "vault",
    phase: "active",
    round: 3,
    seats: buildSeatViews(
      {
        seat_1: 4,
        seat_2: 5,
        seat_3: 8,
        seat_4: 2,
      },
      {
        readySeatIds: ["seat_1", "seat_2", "seat_3", "seat_4"],
      },
    ),
    publicState: {
      vaultValue: 44,
      guardSeatId: "seat_3",
      suspicionSeatId: "seat_2",
      accusationWindowOpen: true,
      summary: "Mask 3 currently holds the cleanest line to the vault, but Mask 2 is drawing suspicion after a thin contribution round.",
    },
    lastEventAt: "2026-04-16T09:54:00.000Z",
    joinState: {
      canJoin: false,
      openSeatIds: [],
      claimedSeatIds: ["seat_1", "seat_2", "seat_3", "seat_4"],
    },
  },
  {
    roomId: "demo-settlement-room",
    matchId: "match-live-settlement-0416",
    game: "settlement",
    phase: "active",
    round: 5,
    seats: buildSeatViews(
      {
        seat_1: 14,
        seat_2: 11,
        seat_3: 13,
        seat_4: 9,
      },
      {
        readySeatIds: ["seat_1", "seat_2", "seat_3"],
      },
    ),
    publicState: {
      districtStatus: [
        { district: "Granary", ownerSeatId: "seat_1", output: 6 },
        { district: "Harbor", ownerSeatId: "seat_3", output: 5 },
        { district: "Forge", ownerSeatId: "seat_2", output: 4 },
      ],
      crisis: "Late harvest shortage",
      summary: "The harbor and granary are stabilizing the board, but the next vote determines whether the shortage becomes a panic event.",
    },
    lastEventAt: "2026-04-16T09:57:00.000Z",
    joinState: {
      canJoin: true,
      openSeatIds: ["seat_4"],
      claimedSeatIds: ["seat_1", "seat_2", "seat_3"],
    },
  },
];

const completedMatches: DemoCompletedMatchFixture[] = [
  {
    roomId: "demo-auction-results",
    matchId: "match-demo-auction",
    game: "auction",
    completedAt: "2026-04-16T09:31:00.000Z",
    winningSeatIds: ["seat_1"],
    participants: [
      {
        seatId: "seat_1",
        playerId: "demo-player",
        playerDisplayName: "Cipher",
        score: 21,
        delta: 16,
        previousRating: 1530,
        newRating: 1546,
        expectedScore: 0.52,
        actualScore: 1,
        matchesPlayed: 15,
        wins: 10,
      },
      {
        seatId: "seat_2",
        playerId: "player-kestrel",
        playerDisplayName: "Kestrel",
        score: 12,
        delta: 5,
        previousRating: 1527,
        newRating: 1532,
        expectedScore: 0.48,
        actualScore: 0.5,
        matchesPlayed: 17,
        wins: 10,
      },
      {
        seatId: "seat_3",
        playerId: "player-sable",
        playerDisplayName: "Sable",
        score: 6,
        delta: -4,
        previousRating: 1522,
        newRating: 1518,
        expectedScore: 0.41,
        actualScore: 0.25,
        matchesPlayed: 14,
        wins: 8,
      },
      {
        seatId: "seat_4",
        playerId: "player-orbit",
        playerDisplayName: "Orbit",
        score: 3,
        delta: -5,
        previousRating: 1509,
        newRating: 1504,
        expectedScore: 0.39,
        actualScore: 0.25,
        matchesPlayed: 13,
        wins: 7,
      },
    ],
    summary:
      "Cipher managed the bankroll best across all three rounds, stealing the Ledger in round two and still having enough left to close the final prize.",
    publicState: {
      itemName: "Embassy Cipher",
      finalBid: 4,
      finalPot: 10,
      winnerSeatId: "seat_1",
      summary:
        "Cipher finished the third round with the strongest final net worth after navigating all three prizes more efficiently than the rest of the table.",
    },
    behavioralOutput: [
      {
        metricKey: "bid_discipline",
        value: 0.84,
        confidence: 0.92,
      },
      {
        metricKey: "late_pressure_response",
        value: 0.73,
        confidence: 0.81,
      },
    ],
    replayEvents: [
      {
        sequence: 1,
        type: "room.created",
        occurredAt: "2026-04-16T09:20:00.000Z",
        publicPayload: { game: "auction", seatCount: 4 },
      },
      {
        sequence: 2,
        type: "room.phase",
        occurredAt: "2026-04-16T09:22:00.000Z",
        publicPayload: { phase: "active", round: 1, prize: "Signal Relay", prizeValue: 12 },
      },
      {
        sequence: 3,
        type: "auction.bid",
        occurredAt: "2026-04-16T09:24:00.000Z",
        actorSeatId: "seat_2",
        publicPayload: { amount: 4, pot: 9, round: 1 },
      },
      {
        sequence: 4,
        type: "room.phase",
        occurredAt: "2026-04-16T09:25:00.000Z",
        publicPayload: { phase: "active", round: 2, prize: "Blackmail Ledger", prizeValue: 9 },
      },
      {
        sequence: 5,
        type: "auction.bid",
        occurredAt: "2026-04-16T09:26:00.000Z",
        actorSeatId: "seat_1",
        publicPayload: { amount: 5, pot: 11, round: 2 },
      },
      {
        sequence: 6,
        type: "room.phase",
        occurredAt: "2026-04-16T09:28:00.000Z",
        publicPayload: { phase: "active", round: 3, prize: "Embassy Cipher", prizeValue: 7 },
      },
      {
        sequence: 7,
        type: "auction.pass",
        occurredAt: "2026-04-16T09:29:00.000Z",
        actorSeatId: "seat_4",
        publicPayload: { round: 3 },
      },
      {
        sequence: 8,
        type: "match.result",
        occurredAt: "2026-04-16T09:31:00.000Z",
        publicPayload: { winningSeatIds: ["seat_1"], completedAt: "2026-04-16T09:31:00.000Z" },
      },
    ],
    payout: {
      payoutId: "payout-demo-auction",
      playerId: "demo-player",
      seatId: "seat_1",
      escrowId: "escrow-demo-auction",
      amountUsd: 18,
      status: "ready",
      lifecycleStatus: "available_to_claim",
      createdAt: "2026-04-16T09:34:00.000Z",
      updatedAt: "2026-04-16T09:34:00.000Z",
    },
  },
  {
    roomId: "demo-split-results",
    matchId: "match-demo-split",
    game: "split",
    completedAt: "2026-04-16T08:42:00.000Z",
    winningSeatIds: ["seat_2"],
    participants: [
      {
        seatId: "seat_1",
        playerId: "player-helios",
        playerDisplayName: "Helios",
        score: 6,
        delta: -4,
        previousRating: 1483,
        newRating: 1479,
        expectedScore: 0.48,
        actualScore: 0,
        matchesPlayed: 11,
        wins: 5,
      },
      {
        seatId: "seat_2",
        playerId: "demo-player",
        playerDisplayName: "Cipher",
        score: 14,
        delta: 9,
        previousRating: 1537,
        newRating: 1546,
        expectedScore: 0.52,
        actualScore: 1,
        matchesPlayed: 15,
        wins: 10,
      },
    ],
    summary:
      "Mask 2 rejected the soft split, forced a cleaner second offer, and closed the room with the higher share.",
    publicState: {
      pot: 20,
      acceptedSplit: { seat_1: 6, seat_2: 14 },
      winnerSeatId: "seat_2",
      summary:
        "Mask 2 rejected the soft split, forced a cleaner second offer, and closed the room with the higher share.",
    },
    behavioralOutput: [
      {
        metricKey: "offer_pressure_tolerance",
        value: 0.77,
        confidence: 0.86,
      },
    ],
    replayEvents: [
      {
        sequence: 1,
        type: "room.created",
        occurredAt: "2026-04-16T08:33:00.000Z",
        publicPayload: { game: "split", seatCount: 2 },
      },
      {
        sequence: 2,
        type: "split.offer",
        occurredAt: "2026-04-16T08:35:00.000Z",
        actorSeatId: "seat_1",
        publicPayload: { offer: { seat_1: 8, seat_2: 12 } },
      },
      {
        sequence: 3,
        type: "split.reject",
        occurredAt: "2026-04-16T08:37:00.000Z",
        actorSeatId: "seat_2",
        publicPayload: {},
      },
      {
        sequence: 4,
        type: "split.offer",
        occurredAt: "2026-04-16T08:40:00.000Z",
        actorSeatId: "seat_2",
        publicPayload: { offer: { seat_1: 6, seat_2: 14 } },
      },
      {
        sequence: 5,
        type: "match.result",
        occurredAt: "2026-04-16T08:42:00.000Z",
        publicPayload: { winningSeatIds: ["seat_2"], completedAt: "2026-04-16T08:42:00.000Z" },
      },
    ],
    payout: {
      payoutId: "payout-demo-split",
      playerId: "demo-player",
      seatId: "seat_2",
      escrowId: "escrow-demo-split",
      amountUsd: 14,
      status: "paid",
      lifecycleStatus: "claimed_simulated",
      createdAt: "2026-04-16T08:45:00.000Z",
      updatedAt: "2026-04-16T08:47:00.000Z",
    },
  },
  {
    roomId: "demo-pact-results",
    matchId: "match-demo-pact",
    game: "pact",
    completedAt: "2026-04-16T08:56:00.000Z",
    winningSeatIds: ["seat_2"],
    participants: [
      {
        seatId: "seat_1",
        playerId: "demo-player",
        playerDisplayName: "Cipher",
        score: 9,
        delta: -3,
        previousRating: 1549,
        newRating: 1546,
        expectedScore: 0.51,
        actualScore: 0,
        matchesPlayed: 15,
        wins: 10,
      },
      {
        seatId: "seat_2",
        playerId: "player-orbit",
        playerDisplayName: "Orbit",
        score: 11,
        delta: 4,
        previousRating: 1500,
        newRating: 1504,
        expectedScore: 0.49,
        actualScore: 1,
        matchesPlayed: 13,
        wins: 7,
      },
    ],
    summary:
      "Mask 2 protected the final two rounds and edged the pact room after a single decisive endgame betrayal.",
    publicState: {
      roundCount: 10,
      finalTrustIndex: 0.46,
      winnerSeatId: "seat_2",
      summary:
        "Mask 2 protected the final two rounds and edged the pact room after a single decisive endgame betrayal.",
    },
    behavioralOutput: [
      {
        metricKey: "betrayal_timing",
        value: "endgame",
        confidence: 0.9,
      },
    ],
    replayEvents: [
      {
        sequence: 1,
        type: "room.created",
        occurredAt: "2026-04-16T08:44:00.000Z",
        publicPayload: { game: "pact", seatCount: 2 },
      },
      {
        sequence: 2,
        type: "pact.commit",
        occurredAt: "2026-04-16T08:48:00.000Z",
        actorSeatId: "seat_1",
        publicPayload: { round: 4, commitment: "cooperate" },
      },
      {
        sequence: 3,
        type: "pact.commit",
        occurredAt: "2026-04-16T08:54:00.000Z",
        actorSeatId: "seat_2",
        publicPayload: { round: 10, commitment: "betray" },
      },
      {
        sequence: 4,
        type: "match.result",
        occurredAt: "2026-04-16T08:56:00.000Z",
        publicPayload: { winningSeatIds: ["seat_2"], completedAt: "2026-04-16T08:56:00.000Z" },
      },
    ],
  },
  {
    roomId: "demo-vault-results",
    matchId: "match-demo-vault",
    game: "vault",
    completedAt: "2026-04-16T09:12:00.000Z",
    winningSeatIds: ["seat_4"],
    participants: [
      {
        seatId: "seat_1",
        playerId: "player-sable",
        playerDisplayName: "Sable",
        score: 7,
        delta: -2,
        previousRating: 1520,
        newRating: 1518,
        expectedScore: 0.44,
        actualScore: 0.25,
        matchesPlayed: 14,
        wins: 8,
      },
      {
        seatId: "seat_2",
        playerId: "player-rune",
        playerDisplayName: "Rune",
        score: 9,
        delta: -1,
        previousRating: 1492,
        newRating: 1491,
        expectedScore: 0.37,
        actualScore: 0.25,
        matchesPlayed: 12,
        wins: 6,
      },
      {
        seatId: "seat_3",
        playerId: "player-iris",
        playerDisplayName: "Iris",
        score: 12,
        delta: 0,
        previousRating: 1568,
        newRating: 1568,
        expectedScore: 0.61,
        actualScore: 0.5,
        matchesPlayed: 18,
        wins: 12,
      },
      {
        seatId: "seat_4",
        playerId: "demo-player",
        playerDisplayName: "Cipher",
        score: 16,
        delta: 0,
        previousRating: 1546,
        newRating: 1546,
        expectedScore: 0.49,
        actualScore: 1,
        matchesPlayed: 15,
        wins: 10,
      },
    ],
    summary:
      "Mask 4 stayed quiet through the accusation cycle, took the final vault line, and left settlement pending for the winner.",
    publicState: {
      vaultValue: 44,
      accusationSeatId: "seat_2",
      winnerSeatId: "seat_4",
      summary:
        "Mask 4 stayed quiet through the accusation cycle, took the final vault line, and left settlement pending for the winner.",
    },
    behavioralOutput: [
      {
        metricKey: "suspicion_management",
        value: 0.81,
        confidence: 0.84,
      },
    ],
    replayEvents: [
      {
        sequence: 1,
        type: "room.created",
        occurredAt: "2026-04-16T09:00:00.000Z",
        publicPayload: { game: "vault", seatCount: 4 },
      },
      {
        sequence: 2,
        type: "vault.contribute",
        occurredAt: "2026-04-16T09:05:00.000Z",
        actorSeatId: "seat_4",
        publicPayload: { contribution: 5, vaultValue: 31 },
      },
      {
        sequence: 3,
        type: "vault.accuse",
        occurredAt: "2026-04-16T09:09:00.000Z",
        actorSeatId: "seat_2",
        publicPayload: { targetSeatId: "seat_3" },
      },
      {
        sequence: 4,
        type: "match.result",
        occurredAt: "2026-04-16T09:12:00.000Z",
        publicPayload: { winningSeatIds: ["seat_4"], completedAt: "2026-04-16T09:12:00.000Z" },
      },
    ],
    payout: {
      payoutId: "payout-demo-vault",
      playerId: "demo-player",
      seatId: "seat_4",
      escrowId: "escrow-demo-vault",
      amountUsd: 11,
      status: "pending",
      lifecycleStatus: "pending_settlement",
      createdAt: "2026-04-16T09:12:15.000Z",
      updatedAt: "2026-04-16T09:12:15.000Z",
    },
  },
  {
    roomId: "demo-settlement-results",
    matchId: "match-demo-settlement",
    game: "settlement",
    completedAt: "2026-04-16T09:48:00.000Z",
    winningSeatIds: ["seat_3"],
    participants: [
      {
        seatId: "seat_1",
        playerId: "player-rune",
        playerDisplayName: "Rune",
        score: 18,
        delta: 0,
        previousRating: 1491,
        newRating: 1491,
        expectedScore: 0.36,
        actualScore: 0.5,
        matchesPlayed: 12,
        wins: 6,
      },
      {
        seatId: "seat_2",
        playerId: "player-iris",
        playerDisplayName: "Iris",
        score: 20,
        delta: 0,
        previousRating: 1568,
        newRating: 1568,
        expectedScore: 0.62,
        actualScore: 0.5,
        matchesPlayed: 18,
        wins: 12,
      },
      {
        seatId: "seat_3",
        playerId: "demo-player",
        playerDisplayName: "Cipher",
        score: 24,
        delta: 0,
        previousRating: 1546,
        newRating: 1546,
        expectedScore: 0.53,
        actualScore: 1,
        matchesPlayed: 15,
        wins: 10,
      },
      {
        seatId: "seat_4",
        playerId: "player-kestrel",
        playerDisplayName: "Kestrel",
        score: 13,
        delta: 0,
        previousRating: 1532,
        newRating: 1532,
        expectedScore: 0.47,
        actualScore: 0.25,
        matchesPlayed: 17,
        wins: 10,
      },
    ],
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
    behavioralOutput: [
      {
        metricKey: "coalition_resilience",
        value: 0.79,
        confidence: 0.88,
      },
    ],
    replayEvents: [
      {
        sequence: 1,
        type: "room.created",
        occurredAt: "2026-04-16T09:34:00.000Z",
        publicPayload: { game: "settlement", seatCount: 4 },
      },
      {
        sequence: 2,
        type: "settlement.vote",
        occurredAt: "2026-04-16T09:41:00.000Z",
        actorSeatId: "seat_3",
        publicPayload: { measure: "harbor_rationing", passed: true },
      },
      {
        sequence: 3,
        type: "settlement.crisis",
        occurredAt: "2026-04-16T09:45:00.000Z",
        publicPayload: { type: "late_harvest_shortage", resolved: true },
      },
      {
        sequence: 4,
        type: "match.result",
        occurredAt: "2026-04-16T09:48:00.000Z",
        publicPayload: { winningSeatIds: ["seat_3"], completedAt: "2026-04-16T09:48:00.000Z" },
      },
    ],
    payout: {
      payoutId: "payout-demo-settlement",
      playerId: "demo-player",
      seatId: "seat_3",
      escrowId: "escrow-demo-settlement",
      amountUsd: 23,
      status: "paid",
      lifecycleStatus: "claimed_simulated",
      createdAt: "2026-04-16T09:49:00.000Z",
      updatedAt: "2026-04-16T09:53:00.000Z",
    },
  },
];

function buildResultRoom(fixture: DemoCompletedMatchFixture): PublicRoomState {
  const seatScores = Object.fromEntries(
    fixture.participants.map((participant) => [participant.seatId, participant.score]),
  ) as Record<SeatId, number>;
  const lastEvent = fixture.replayEvents.at(-1);

  return {
    roomId: fixture.roomId,
    matchId: fixture.matchId,
    game: fixture.game,
    phase: "results",
    round: fixture.replayEvents.length,
    lastEventAt: lastEvent?.occurredAt ?? fixture.completedAt,
    seats: buildSeatViews(seatScores),
    publicResult: {
      completedAt: fixture.completedAt,
      winningSeatIds: fixture.winningSeatIds,
      seatScores,
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
      lastAttemptAt: fixture.payout?.updatedAt ?? fixture.completedAt,
      syncedAt: fixture.payout?.updatedAt ?? fixture.completedAt,
    },
    publicState: fixture.publicState,
  };
}

function buildReplay(fixture: DemoCompletedMatchFixture): ReplayEnvelope {
  return {
    matchId: fixture.matchId,
    game: fixture.game,
    version: 1,
    seed: fixture.matchId,
    createdAt: fixture.replayEvents[0]?.occurredAt ?? fixture.completedAt,
    events: fixture.replayEvents,
  };
}

function buildMatchLedger(fixture: DemoCompletedMatchFixture): MatchLedgerRecord {
  const publicResult = {
    completedAt: fixture.completedAt,
    winningSeatIds: fixture.winningSeatIds,
    seatScores: Object.fromEntries(
      fixture.participants.map((participant) => [participant.seatId, participant.score]),
    ) as Record<SeatId, number>,
  };

  return {
    matchId: fixture.matchId,
    roomId: fixture.roomId,
    game: fixture.game,
    completedAt: fixture.completedAt,
    status: fixture.payout ? "fully_recorded" : "leaderboard_recorded",
    publicResult,
    completion: {
      matchId: fixture.matchId,
      roomId: fixture.roomId,
      game: fixture.game,
      completedAt: fixture.completedAt,
      result: {
        matchId: fixture.matchId,
        game: fixture.game,
        roomId: fixture.roomId,
        completedAt: fixture.completedAt,
        winningSeatIds: fixture.winningSeatIds,
        seatScores: publicResult.seatScores,
        behavioralOutput: fixture.behavioralOutput,
      },
      replay: {
        matchId: fixture.matchId,
        roomId: fixture.roomId,
        available: true,
        eventCount: fixture.replayEvents.length,
      },
      seatToPlayerId: Object.fromEntries(
        fixture.participants.map((participant) => [participant.seatId, participant.playerId]),
      ),
    },
    matchSync: {
      status: "synced",
      attempts: 1,
      lastAttemptAt: fixture.payout?.updatedAt ?? fixture.completedAt,
      syncedAt: fixture.payout?.updatedAt ?? fixture.completedAt,
    },
    participants: fixture.participants.map((participant) => ({
      seatId: participant.seatId,
      playerId: participant.playerId,
      displayName: getSeatLabel(participant.seatId),
      score: participant.score,
      isWinner: fixture.winningSeatIds.includes(participant.seatId),
    })),
    seatImpacts: fixture.participants.map((participant) => ({
      seatId: participant.seatId,
      playerId: participant.playerId,
      displayName: getSeatLabel(participant.seatId),
      score: participant.score,
      isWinner: fixture.winningSeatIds.includes(participant.seatId),
      leaderboard: {
        delta: participant.delta,
        previousRating: participant.previousRating,
        newRating: participant.newRating,
        expectedScore: participant.expectedScore,
        actualScore: participant.actualScore,
        wonMatch: fixture.winningSeatIds.includes(participant.seatId),
        matchesPlayed: participant.matchesPlayed,
        wins: participant.wins,
      },
      payout:
        fixture.payout?.seatId === participant.seatId
          ? {
              payoutId: fixture.payout.payoutId,
              amountUsd: fixture.payout.amountUsd,
              currency: "USDC",
              status: fixture.payout.status,
              lifecycleStatus: fixture.payout.lifecycleStatus,
            }
          : undefined,
    })),
    leaderboard: {
      appliedAt: fixture.completedAt,
      applied: {
        game: "global",
        processedAt: fixture.completedAt,
        entries: fixture.participants.map((participant) => ({
          playerId: participant.playerId,
          displayName: participant.playerDisplayName,
          delta: participant.delta,
          previousRating: participant.previousRating,
          newRating: participant.newRating,
          expectedScore: participant.expectedScore,
          actualScore: participant.actualScore,
          wonMatch: fixture.winningSeatIds.includes(participant.seatId),
          matchesPlayed: participant.matchesPlayed,
          wins: participant.wins,
        })),
      },
    },
    payments: fixture.payout
      ? {
          settledAt: fixture.payout.updatedAt,
          escrowId: fixture.payout.escrowId,
          totalPayoutUsd: fixture.payout.amountUsd,
          payouts: [
            {
              payoutId: fixture.payout.payoutId,
              playerId: fixture.payout.playerId,
              seatId: fixture.payout.seatId,
              escrowId: fixture.payout.escrowId,
              matchId: fixture.matchId,
              amountUsd: fixture.payout.amountUsd,
              currency: "USDC",
              status: fixture.payout.status,
              lifecycleStatus: fixture.payout.lifecycleStatus,
              isSimulated: true,
              createdAt: fixture.payout.createdAt,
              updatedAt: fixture.payout.updatedAt,
            },
          ],
        }
      : undefined,
    updatedAt: fixture.payout?.updatedAt ?? fixture.completedAt,
  };
}

const fallbackRooms: PublicRoomState[] = [...liveRooms, ...completedMatches.map(buildResultRoom)];

const fallbackReplayByRoomId = Object.fromEntries(
  completedMatches.map((fixture) => [fixture.roomId, buildReplay(fixture)]),
) as Record<string, ReplayEnvelope>;

const fallbackMatchLedgerByMatchId = Object.fromEntries(
  completedMatches.map((fixture) => [fixture.matchId, buildMatchLedger(fixture)]),
) as Record<string, MatchLedgerRecord>;

const fallbackMatchLedgerByRoomId = Object.fromEntries(
  completedMatches.map((fixture) => [fixture.roomId, fallbackMatchLedgerByMatchId[fixture.matchId]]),
) as Record<string, MatchLedgerRecord>;

const fallbackEscrowParticipants: Record<string, string[]> = {
  "escrow-demo-auction": ["demo-player", "player-kestrel", "player-sable", "player-orbit"],
  "escrow-demo-split": ["demo-player", "player-helios"],
  "escrow-demo-pact": ["demo-player", "player-orbit"],
  "escrow-demo-vault": ["demo-player", "player-sable", "player-rune", "player-iris"],
  "escrow-demo-settlement": ["demo-player", "player-rune", "player-iris", "player-kestrel"],
};

const fallbackEscrows: PlayerPaymentsSnapshot["escrowSummaries"] = [
  {
    escrowId: "escrow-demo-auction",
    sponsorId: "arena-demo-sponsor",
    gameId: "auction",
    matchId: "match-demo-auction",
    status: "settled",
    fundedAmountUsd: 18,
    reservedAmountUsd: 18,
    releasedAmountUsd: 18,
    currency: "USDC",
    isSimulated: true,
    createdAt: "2026-04-16T09:22:00.000Z",
    updatedAt: "2026-04-16T09:34:00.000Z",
    timeline: [
      { status: "draft", occurredAt: "2026-04-16T09:22:00.000Z", note: "demo escrow created" },
      { status: "funded_simulated", occurredAt: "2026-04-16T09:24:00.000Z", note: "sponsor funded simulated prize pool" },
      { status: "locked", occurredAt: "2026-04-16T09:28:00.000Z", note: "escrow locked when final round opened" },
      { status: "settled", occurredAt: "2026-04-16T09:34:00.000Z", note: "winner payout released" },
    ],
  },
  {
    escrowId: "escrow-demo-split",
    sponsorId: "arena-demo-sponsor",
    gameId: "split",
    matchId: "match-demo-split",
    status: "settled",
    fundedAmountUsd: 14,
    reservedAmountUsd: 14,
    releasedAmountUsd: 14,
    currency: "USDC",
    isSimulated: true,
    createdAt: "2026-04-16T08:36:00.000Z",
    updatedAt: "2026-04-16T08:47:00.000Z",
    timeline: [
      { status: "draft", occurredAt: "2026-04-16T08:36:00.000Z", note: "head-to-head purse created" },
      { status: "funded_simulated", occurredAt: "2026-04-16T08:37:00.000Z", note: "funding simulated" },
      { status: "locked", occurredAt: "2026-04-16T08:40:00.000Z", note: "locked on final offer" },
      { status: "settled", occurredAt: "2026-04-16T08:47:00.000Z", note: "claim simulated" },
    ],
  },
  {
    escrowId: "escrow-demo-pact",
    sponsorId: "arena-demo-sponsor",
    gameId: "pact",
    matchId: "match-demo-pact",
    status: "settled",
    fundedAmountUsd: 10,
    reservedAmountUsd: 10,
    releasedAmountUsd: 10,
    currency: "USDC",
    isSimulated: true,
    createdAt: "2026-04-16T08:45:00.000Z",
    updatedAt: "2026-04-16T08:57:00.000Z",
    timeline: [
      { status: "draft", occurredAt: "2026-04-16T08:45:00.000Z", note: "trust room purse created" },
      { status: "funded_simulated", occurredAt: "2026-04-16T08:46:00.000Z", note: "funding simulated" },
      { status: "locked", occurredAt: "2026-04-16T08:53:00.000Z", note: "locked before final commitments resolved" },
      { status: "settled", occurredAt: "2026-04-16T08:57:00.000Z", note: "winner settled to opposing player" },
    ],
  },
  {
    escrowId: "escrow-demo-vault",
    sponsorId: "arena-demo-sponsor",
    gameId: "vault",
    matchId: "match-demo-vault",
    status: "settlement_pending",
    fundedAmountUsd: 11,
    reservedAmountUsd: 11,
    releasedAmountUsd: 0,
    currency: "USDC",
    isSimulated: true,
    createdAt: "2026-04-16T09:01:00.000Z",
    updatedAt: "2026-04-16T09:12:15.000Z",
    timeline: [
      { status: "draft", occurredAt: "2026-04-16T09:01:00.000Z", note: "vault purse created" },
      { status: "funded_simulated", occurredAt: "2026-04-16T09:03:00.000Z", note: "funding simulated" },
      { status: "locked", occurredAt: "2026-04-16T09:09:00.000Z", note: "locked during accusation review" },
      { status: "settlement_pending", occurredAt: "2026-04-16T09:12:15.000Z", note: "winner confirmed, payout not yet released" },
    ],
  },
  {
    escrowId: "escrow-demo-settlement",
    sponsorId: "arena-demo-sponsor",
    gameId: "settlement",
    matchId: "match-demo-settlement",
    status: "settled",
    fundedAmountUsd: 23,
    reservedAmountUsd: 23,
    releasedAmountUsd: 23,
    currency: "USDC",
    isSimulated: true,
    createdAt: "2026-04-16T09:35:00.000Z",
    updatedAt: "2026-04-16T09:53:00.000Z",
    timeline: [
      { status: "draft", occurredAt: "2026-04-16T09:35:00.000Z", note: "civic prize pool created" },
      { status: "funded_simulated", occurredAt: "2026-04-16T09:36:00.000Z", note: "funding simulated" },
      { status: "locked", occurredAt: "2026-04-16T09:46:00.000Z", note: "locked before final vote" },
      { status: "settled", occurredAt: "2026-04-16T09:53:00.000Z", note: "winner claim simulated" },
    ],
  },
];

const fallbackPayouts: PlayerPaymentsSnapshot["payouts"] = completedMatches
  .filter((fixture) => fixture.payout)
  .map((fixture) => ({
    payoutId: fixture.payout!.payoutId,
    playerId: fixture.payout!.playerId,
    seatId: fixture.payout!.seatId,
    escrowId: fixture.payout!.escrowId,
    matchId: fixture.matchId,
    amountUsd: fixture.payout!.amountUsd,
    currency: "USDC",
    status: fixture.payout!.status,
    lifecycleStatus: fixture.payout!.lifecycleStatus as
      | "pending_settlement"
      | "available_to_claim"
      | "claim_requested"
      | "claimed_simulated"
      | "failed",
    isSimulated: true,
    createdAt: fixture.payout!.createdAt,
    updatedAt: fixture.payout!.updatedAt,
    timeline:
      fixture.payout!.status === "pending"
        ? [
            {
              status: "pending_settlement",
              occurredAt: fixture.payout!.createdAt,
              note: "result accepted, awaiting escrow release",
            },
          ]
        : fixture.payout!.status === "ready"
          ? [
              {
                status: "pending_settlement",
                occurredAt: fixture.completedAt,
                note: "result accepted",
              },
              {
                status: "available_to_claim",
                occurredAt: fixture.payout!.updatedAt,
                note: "ready for player claim",
              },
            ]
          : [
              {
                status: "pending_settlement",
                occurredAt: fixture.completedAt,
                note: "result accepted",
              },
              {
                status: "available_to_claim",
                occurredAt: fixture.payout!.createdAt,
                note: "claim window opened",
              },
              {
                status: "claimed_simulated",
                occurredAt: fixture.payout!.updatedAt,
                note: "claim simulated on stub network",
              },
            ],
  }));

function buildFallbackLeaderboardSnapshot(
  game: RankedGame = "global",
  limit = 12,
): LeaderboardSnapshot {
  return {
    game,
    generatedAt,
    entries: leaderboardEntriesBase.slice(0, limit).map((entry, index) => ({
      game,
      playerId: entry.playerId,
      displayName: entry.displayName,
      rating: entry.rating,
      rank: index + 1,
      wins: entry.wins,
      matchesPlayed: entry.matchesPlayed,
      generatedAt,
      lastMatchId: entry.lastMatchId,
      lastCompletedAt: entry.lastCompletedAt,
    })),
  };
}

function buildFallbackPaymentsSnapshot(playerId = "demo-player"): PlayerPaymentsSnapshot {
  const walletSeed = walletSeeds[playerId] ?? {
    walletAddress: `0x${playerId.replace(/[^a-z0-9]/gi, "").slice(0, 40).padEnd(40, "0")}`,
    availableUsd: 0,
    pendingUsd: 0,
    totalEarnedUsd: 0,
    connectionStatus: "connected" as const,
  };

  return {
    wallet: {
      playerId,
      walletAddress: walletSeed.walletAddress,
      availableUsd: walletSeed.availableUsd,
      pendingUsd: walletSeed.pendingUsd,
      totalEarnedUsd: walletSeed.totalEarnedUsd,
      connectionStatus: walletSeed.connectionStatus,
      network: "stub-local",
      isSimulated: true,
      lastUpdatedAt: generatedAt,
    },
    escrowSummaries: fallbackEscrows.filter((escrow) =>
      (fallbackEscrowParticipants[escrow.escrowId] ?? []).includes(playerId),
    ),
    payouts: fallbackPayouts.filter((payout) => payout.playerId === playerId),
  };
}

const fallbackLeaderboard = buildFallbackLeaderboardSnapshot("global", 12);
const fallbackPayments = buildFallbackPaymentsSnapshot("demo-player");

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
    data: data ?? fallbackReplayByRoomId[roomId] ?? null,
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
    data: data?.data ?? buildFallbackLeaderboardSnapshot(game, limit),
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
    data: data ?? buildFallbackPaymentsSnapshot(playerId),
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

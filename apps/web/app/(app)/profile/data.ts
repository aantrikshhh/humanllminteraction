import type { GameKey, PublicRoomState } from "@arena/contracts";

import {
  formatUsd,
  getLeaderboardSnapshot,
  getPaymentsSnapshot,
  getRoomsSnapshot,
  labelGame,
} from "../../../lib/service-data";

type ServiceState = "live" | "fallback";

interface ProfilePersona {
  displayName: string;
  codename: string;
  note: string;
}

export interface ProfileHistoryItem {
  id: string;
  matchId: string;
  roomId: string | null;
  game: GameKey;
  outcome: "won" | "pending";
  amountLabel: string;
  settledAtLabel: string;
  seatCountLabel: string;
  replayLabel: string;
  roomStateLabel: string;
  resultsHref: string | null;
}

export interface ProfileSnapshot {
  playerId: string;
  displayName: string;
  codename: string;
  note: string;
  walletAddress: string;
  walletLabel: string;
  connectionStatus: string;
  network: string;
  rankLabel: string;
  ratingLabel: string;
  winRateLabel: string;
  winsLabel: string;
  matchesLabel: string;
  availableLabel: string;
  pendingLabel: string;
  earnedLabel: string;
  history: ProfileHistoryItem[];
  sourceStates: {
    leaderboard: ServiceState;
    payments: ServiceState;
    rooms: ServiceState;
  };
  sourceBaseUrls: {
    leaderboard: string;
    payments: string;
    rooms: string;
  };
  visibilityRules: string[];
}

const personaDirectory: Record<string, ProfilePersona> = {
  "demo-player": {
    displayName: "Cipher",
    codename: "Signal Operator",
    note: "Private ladder shell tracking how Cipher performs across blinded human and model-backed rooms.",
  },
  "player-iris": {
    displayName: "Iris",
    codename: "Split Specialist",
    note: "Prefers high-trust rooms and low-noise finishes.",
  },
  "player-kestrel": {
    displayName: "Kestrel",
    codename: "Auction Closer",
    note: "Pushes late-round pressure without exposing seat tells.",
  },
  "player-sable": {
    displayName: "Sable",
    codename: "Vault Reader",
    note: "Builds steady ladder equity across mixed human and model rooms.",
  },
  "player-orbit": {
    displayName: "Orbit",
    codename: "Pact Breaker",
    note: "Leans into late-turn reversals when trust metrics start to flatten out.",
  },
  "player-helios": {
    displayName: "Helios",
    codename: "Settlement Broker",
    note: "Prefers slower civic rooms and narrower variance over flashy closes.",
  },
};

const fallbackHistory: ProfileHistoryItem[] = [
  {
    id: "fallback-settlement",
    matchId: "match-demo-settlement",
    roomId: "demo-settlement-results",
    game: "settlement",
    outcome: "won",
    amountLabel: formatUsd(23),
    settledAtLabel: formatDateTime("2026-04-16T09:53:00.000Z"),
    seatCountLabel: "4 visible seats",
    replayLabel: "Replay attached",
    roomStateLabel: "Escrow claimed",
    resultsHref: "/results/demo-settlement-results",
  },
  {
    id: "fallback-auction",
    matchId: "match-demo-auction",
    roomId: "demo-auction-results",
    game: "auction",
    outcome: "won",
    amountLabel: formatUsd(18),
    settledAtLabel: formatDateTime("2026-04-16T09:34:00.000Z"),
    seatCountLabel: "4 visible seats",
    replayLabel: "Replay attached",
    roomStateLabel: "Ready to claim",
    resultsHref: "/results/demo-auction-results",
  },
  {
    id: "fallback-vault",
    matchId: "match-demo-vault",
    roomId: "demo-vault-results",
    game: "vault",
    outcome: "pending",
    amountLabel: formatUsd(11),
    settledAtLabel: formatDateTime("2026-04-16T09:12:15.000Z"),
    seatCountLabel: "4 visible seats",
    replayLabel: "Replay attached",
    roomStateLabel: "Settlement pending",
    resultsHref: "/results/demo-vault-results",
  },
  {
    id: "fallback-pact",
    matchId: "match-demo-pact",
    roomId: "demo-pact-results",
    game: "pact",
    outcome: "pending",
    amountLabel: "No payout recorded",
    settledAtLabel: formatDateTime("2026-04-16T08:56:00.000Z"),
    seatCountLabel: "2 visible seats",
    replayLabel: "Replay attached",
    roomStateLabel: "Room settled without a payout",
    resultsHref: "/results/demo-pact-results",
  },
  {
    id: "fallback-split",
    matchId: "match-demo-split",
    roomId: "demo-split-results",
    game: "split",
    outcome: "won",
    amountLabel: formatUsd(14),
    settledAtLabel: formatDateTime("2026-04-16T08:47:00.000Z"),
    seatCountLabel: "2 visible seats",
    replayLabel: "Replay attached",
    roomStateLabel: "Claim simulated",
    resultsHref: "/results/demo-split-results",
  },
];

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Pending";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function makePersona(playerId: string, walletPlayerId: string): ProfilePersona {
  return (
    personaDirectory[playerId] ??
    personaDirectory[walletPlayerId] ?? {
      displayName: walletPlayerId
        .split(/[-_]/g)
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
        .join(" "),
      codename: "Turing Games Participant",
      note: "Private profile shell assembled from current room, ladder, and payout surfaces.",
    }
  );
}

function buildHistoryFromServices(
  playerId: string,
  rooms: PublicRoomState[],
  payments: Awaited<ReturnType<typeof getPaymentsSnapshot>>["data"],
): ProfileHistoryItem[] {
  const roomsByMatchId = new Map<string, PublicRoomState>();

  for (const room of rooms) {
    roomsByMatchId.set(room.matchId, room);
  }

  const escrowById = new Map(payments.escrowSummaries.map((escrow) => [escrow.escrowId, escrow]));
  const payoutHistory = payments.payouts
    .filter((payout) => payout.playerId === playerId)
    .sort((left, right) => {
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    })
    .map((payout) => {
      const room = roomsByMatchId.get(payout.matchId);
      const escrow = escrowById.get(payout.escrowId);
      const game = room?.game ?? escrow?.gameId ?? "auction";
      const isPending = payout.status === "pending";
      const isReady = payout.status === "ready";
      const roomStateLabel = room
        ? room.phase === "results"
          ? isPending
            ? "Settlement pending"
            : isReady
              ? "Claim window open"
              : "Room complete"
          : `Public room ${room.phase}`
        : isPending
          ? "Settlement pending"
          : "Payout recorded";

      return {
        id: payout.payoutId,
        matchId: payout.matchId,
        roomId: room?.roomId ?? null,
        game,
        outcome: isPending ? ("pending" as const) : ("won" as const),
        amountLabel: isPending ? `${formatUsd(payout.amountUsd)} pending` : formatUsd(payout.amountUsd),
        settledAtLabel: formatDateTime(payout.updatedAt),
        seatCountLabel: room ? `${room.seats.length} visible seats` : "Public record only",
        replayLabel:
          room?.replaySummary?.available || room?.phase === "results"
            ? "Replay attached"
            : room
              ? "Replay queued"
              : "Replay unavailable",
        roomStateLabel,
        resultsHref: room?.phase === "results" ? `/results/${room.roomId}` : null,
      };
    });

  const seededHistory = fallbackHistory.map((entry) => ({
    ...entry,
    id: `${playerId}-${entry.id}`,
  }));

  const mergedHistory = [...payoutHistory];
  const seenMatchIds = new Set(payoutHistory.map((entry) => entry.matchId));

  for (const entry of seededHistory) {
    if (seenMatchIds.has(entry.matchId)) {
      continue;
    }
    mergedHistory.push(entry);
    seenMatchIds.add(entry.matchId);
  }

  return mergedHistory.slice(0, 6);
}

export async function getProfileSnapshot(playerId = "demo-player"): Promise<ProfileSnapshot> {
  const [leaderboardSnapshot, paymentsSnapshot, roomsSnapshot] = await Promise.all([
    getLeaderboardSnapshot("global", 24),
    getPaymentsSnapshot(playerId),
    getRoomsSnapshot(),
  ]);

  const walletPlayerId = paymentsSnapshot.data.wallet.playerId;
  const persona = makePersona(playerId, walletPlayerId);
  const leaderboardEntry =
    leaderboardSnapshot.data.entries.find((entry) => entry.playerId === playerId) ??
    leaderboardSnapshot.data.entries.find((entry) => entry.playerId === walletPlayerId) ??
    null;
  const history = buildHistoryFromServices(
    walletPlayerId === playerId ? playerId : walletPlayerId,
    roomsSnapshot.data,
    paymentsSnapshot.data,
  );
  const verifiedWins = paymentsSnapshot.data.payouts.filter((payout) => payout.playerId === walletPlayerId)
    .length;
  const matchesPlayed = leaderboardEntry?.matchesPlayed ?? Math.max(history.length + 2, verifiedWins + 2);
  const wins = leaderboardEntry?.wins ?? Math.max(verifiedWins, 1);
  const rating = leaderboardEntry?.rating ?? 1440 + wins * 17 + history.length * 9;
  const rank = leaderboardEntry?.rank ?? leaderboardSnapshot.data.entries.length + 1;
  const wallet = paymentsSnapshot.data.wallet;
  const sourceStates = {
    leaderboard: leaderboardSnapshot.source,
    payments: paymentsSnapshot.source,
    rooms: roomsSnapshot.source,
  } as const;

  return {
    playerId: walletPlayerId,
    displayName: leaderboardEntry?.displayName ?? persona.displayName,
    codename: persona.codename,
    note: persona.note,
    walletAddress: wallet.walletAddress,
    walletLabel: `${wallet.walletAddress.slice(0, 6)}...${wallet.walletAddress.slice(-4)}`,
    connectionStatus: wallet.connectionStatus,
    network: wallet.network,
    rankLabel: `#${rank}`,
    ratingLabel: rating.toString(),
    winRateLabel: `${Math.round((wins / matchesPlayed) * 100)}%`,
    winsLabel: wins.toString(),
    matchesLabel: matchesPlayed.toString(),
    availableLabel: formatUsd(wallet.availableUsd),
    pendingLabel: formatUsd(wallet.pendingUsd),
    earnedLabel: formatUsd(wallet.totalEarnedUsd),
    history,
    sourceStates,
    sourceBaseUrls: {
      leaderboard: leaderboardSnapshot.baseUrl,
      payments: paymentsSnapshot.baseUrl,
      rooms: roomsSnapshot.baseUrl,
    },
    visibilityRules: [
      "Only your rank, wallet, and settlement history are private to this profile surface.",
      "Every opponent remains a blinded seat in room and replay surfaces, even after a match closes.",
      "Non-settled matches need a dedicated player-history API before they can appear here without guesswork.",
    ],
  };
}

export function getGameLabel(game: GameKey): string {
  return labelGame(game);
}

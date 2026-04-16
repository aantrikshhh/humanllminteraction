import type { GameKey, PlayerId } from "@arena/contracts";

import { normalizeRatingConfig } from "./config";
import type {
  LeaderboardApplyResult,
  LeaderboardEngine,
  LeaderboardParticipant,
  LeaderboardSnapshot,
  LeaderboardSnapshotOptions,
  PlayerLeaderboardView,
  RankedGame,
  RatingConfig,
  RatingDelta,
  RatingSnapshot,
  ResolvedLeaderboardMatch,
} from "./types";

export function createLeaderboardEngine(
  config: Partial<RatingConfig> = {},
): LeaderboardEngine {
  return new InMemoryLeaderboardEngine(config);
}

class InMemoryLeaderboardEngine implements LeaderboardEngine {
  private readonly config: RatingConfig;
  private readonly tables = new Map<RankedGame, Map<PlayerId, RatingSnapshot>>();

  constructor(config: Partial<RatingConfig>) {
    this.config = normalizeRatingConfig(config);
  }

  applyMatch(match: ResolvedLeaderboardMatch): LeaderboardApplyResult {
    validateMatch(match);

    const appliedAt = match.result.completedAt;
    const gameUpdates = this.applyScope(match.result.game, match.participants, match, appliedAt);
    const globalUpdates = this.applyScope("global", match.participants, match, appliedAt);

    return {
      matchId: match.result.matchId,
      appliedAt,
      game: match.result.game,
      gameSnapshot: this.getSnapshot(match.result.game),
      globalSnapshot: this.getSnapshot("global"),
      updates: [...gameUpdates, ...globalUpdates],
    };
  }

  getSnapshot(
    game: RankedGame,
    options: LeaderboardSnapshotOptions = {},
  ): LeaderboardSnapshot {
    const generatedAt = new Date().toISOString();
    const table = this.tables.get(game);
    let entries = rankSnapshots(table ? Array.from(table.values()) : []);

    if (options.playerIds && options.playerIds.length > 0) {
      const playerIdSet = new Set(options.playerIds);
      entries = entries.filter((entry) => playerIdSet.has(entry.playerId));
    }

    if (options.limit && options.limit > 0) {
      entries = entries.slice(0, options.limit);
    }

    return {
      game,
      generatedAt,
      entries,
    };
  }

  getPlayerView(playerId: PlayerId): PlayerLeaderboardView {
    const global = this.getEntry("global", playerId);
    const byGame: Partial<Record<GameKey, RatingSnapshot>> = {};

    const rankedGames = this.getRankedGames();
    for (const game of rankedGames) {
      const entry = this.getEntry(game, playerId);
      if (entry) {
        byGame[game] = entry;
      }
    }

    return {
      playerId,
      global,
      byGame,
    };
  }

  private applyScope(
    game: RankedGame,
    participants: LeaderboardParticipant[],
    match: ResolvedLeaderboardMatch,
    appliedAt: string,
  ): RatingDelta[] {
    const table = this.getTable(game);
    const kFactor = game === "global" ? this.config.globalKFactor : this.config.kFactor;
    const deltas: RatingDelta[] = [];
    const ratingsByPlayer = new Map<PlayerId, number>();

    for (const participant of participants) {
      const snapshot = this.getOrCreateEntry(game, participant.playerId, participant.displayName, appliedAt);
      ratingsByPlayer.set(participant.playerId, snapshot.rating);
    }

    for (const participant of participants) {
      const currentEntry = table.get(participant.playerId);

      if (!currentEntry) {
        throw new Error(`Missing current rating entry for player ${participant.playerId}`);
      }

      currentEntry.displayName = normalizeDisplayName(
        participant.displayName,
        currentEntry.displayName,
      );

      const actualScore = computeActualScore(participant, participants);
      const expectedScore = computeExpectedScore(
        participant,
        participants,
        ratingsByPlayer,
        this.config.ratingSpreadDivisor,
      );

      const delta = Math.round(kFactor * (actualScore - expectedScore));
      currentEntry.rating = Math.max(this.config.minRating, currentEntry.rating + delta);
      currentEntry.matchesPlayed += 1;
      currentEntry.wins += participant.isWinner ? 1 : 0;
      currentEntry.generatedAt = appliedAt;
      currentEntry.lastMatchId = match.result.matchId;
      currentEntry.lastCompletedAt = match.result.completedAt;

      deltas.push({
        playerId: currentEntry.playerId,
        displayName: currentEntry.displayName,
        game,
        previousRating: ratingsByPlayer.get(participant.playerId) ?? this.config.baseRating,
        newRating: currentEntry.rating,
        delta: currentEntry.rating - (ratingsByPlayer.get(participant.playerId) ?? this.config.baseRating),
        expectedScore: roundMetric(expectedScore),
        actualScore: roundMetric(actualScore),
        wonMatch: participant.isWinner,
        matchesPlayed: currentEntry.matchesPlayed,
        wins: currentEntry.wins,
      });
    }

    const rankedEntries = rankSnapshots(Array.from(table.values()));
    table.clear();
    for (const entry of rankedEntries) {
      table.set(entry.playerId, entry);
    }

    return deltas.sort(compareDeltaOrder);
  }

  private getTable(game: RankedGame): Map<PlayerId, RatingSnapshot> {
    let table = this.tables.get(game);
    if (!table) {
      table = new Map<PlayerId, RatingSnapshot>();
      this.tables.set(game, table);
    }

    return table;
  }

  private getOrCreateEntry(
    game: RankedGame,
    playerId: PlayerId,
    displayName: string,
    generatedAt: string,
  ): RatingSnapshot {
    const table = this.getTable(game);
    const existing = table.get(playerId);
    if (existing) {
      return existing;
    }

    const created = createInitialRatingSnapshot(
      game,
      playerId,
      displayName,
      generatedAt,
      this.config.baseRating,
    );
    table.set(playerId, created);
    return created;
  }

  private getEntry(game: RankedGame, playerId: PlayerId): RatingSnapshot | undefined {
    const table = this.tables.get(game);
    if (!table) {
      return undefined;
    }

    return rankSnapshots(Array.from(table.values())).find((entry) => entry.playerId === playerId);
  }

  private getRankedGames(): GameKey[] {
    return Array.from(this.tables.keys()).filter(
      (game): game is GameKey => game !== "global",
    );
  }
}

export function createInitialRatingSnapshot(
  game: RankedGame,
  playerId: PlayerId,
  displayName: string,
  generatedAt: string,
  rating = 1500,
): RatingSnapshot {
  return {
    game,
    playerId,
    displayName: normalizeDisplayName(displayName, playerId),
    rating,
    rank: 1,
    wins: 0,
    matchesPlayed: 0,
    generatedAt,
  };
}

function validateMatch(match: ResolvedLeaderboardMatch): void {
  if (match.participants.length < 2) {
    throw new Error("Leaderboard matches require at least two participants");
  }

  const participantSeatIds = new Set(match.participants.map((participant) => participant.seatId));
  for (const seatId of Object.keys(match.result.seatScores)) {
    if (!participantSeatIds.has(seatId)) {
      throw new Error(`Match result contains seat ${seatId} without leaderboard participant data`);
    }
  }
}

function computeActualScore(
  participant: LeaderboardParticipant,
  participants: LeaderboardParticipant[],
): number {
  if (participants.length === 1) {
    return 1;
  }

  let total = 0;
  let comparisons = 0;

  for (const opponent of participants) {
    if (opponent.playerId === participant.playerId) {
      continue;
    }

    comparisons += 1;
    if (participant.score > opponent.score) {
      total += 1;
      continue;
    }

    if (participant.score === opponent.score) {
      total += 0.5;
    }
  }

  return comparisons === 0 ? 0.5 : total / comparisons;
}

function computeExpectedScore(
  participant: LeaderboardParticipant,
  participants: LeaderboardParticipant[],
  ratingsByPlayer: Map<PlayerId, number>,
  divisor: number,
): number {
  if (participants.length === 1) {
    return 1;
  }

  const rating = ratingsByPlayer.get(participant.playerId) ?? 1500;
  let total = 0;
  let comparisons = 0;

  for (const opponent of participants) {
    if (opponent.playerId === participant.playerId) {
      continue;
    }

    const opponentRating = ratingsByPlayer.get(opponent.playerId) ?? 1500;
    total += 1 / (1 + 10 ** ((opponentRating - rating) / divisor));
    comparisons += 1;
  }

  return comparisons === 0 ? 0.5 : total / comparisons;
}

function rankSnapshots(entries: RatingSnapshot[]): RatingSnapshot[] {
  const ranked = [...entries].sort(compareSnapshotOrder);

  return ranked.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

function compareSnapshotOrder(left: RatingSnapshot, right: RatingSnapshot): number {
  return (
    right.rating - left.rating ||
    right.wins - left.wins ||
    left.matchesPlayed - right.matchesPlayed ||
    left.playerId.localeCompare(right.playerId)
  );
}

function compareDeltaOrder(left: RatingDelta, right: RatingDelta): number {
  return (
    right.newRating - left.newRating ||
    right.delta - left.delta ||
    left.playerId.localeCompare(right.playerId)
  );
}

function normalizeDisplayName(displayName: string, fallback: string): string {
  const trimmed = displayName.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function roundMetric(value: number): number {
  return Math.round(value * 1000) / 1000;
}

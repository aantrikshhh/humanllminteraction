import type {
  GameKey,
  LeaderboardEntry,
  MatchResult,
  PlayerId,
  SeatAssignment,
  SeatId,
} from "@arena/contracts";

export type RankedGame = GameKey | "global";

export interface RatingConfig {
  baseRating: number;
  kFactor: number;
  globalKFactor: number;
  ratingSpreadDivisor: number;
  minRating: number;
}

export interface RatingDelta {
  playerId: PlayerId;
  displayName: string;
  game: RankedGame;
  previousRating: number;
  newRating: number;
  delta: number;
  expectedScore: number;
  actualScore: number;
  wonMatch: boolean;
  matchesPlayed: number;
  wins: number;
}

export interface RatingSnapshot extends LeaderboardEntry {
  generatedAt: string;
  lastMatchId?: string;
  lastCompletedAt?: string;
}

export interface LeaderboardSnapshot {
  game: RankedGame;
  generatedAt: string;
  entries: RatingSnapshot[];
}

export interface LeaderboardSnapshotOptions {
  limit?: number;
  playerIds?: PlayerId[];
}

export interface LeaderboardParticipant {
  seatId: SeatId;
  playerId: PlayerId;
  displayName: string;
  score: number;
  isWinner: boolean;
}

export interface ResolvedLeaderboardMatch {
  result: MatchResult;
  participants: LeaderboardParticipant[];
}

export interface LeaderboardApplyResult {
  matchId: string;
  appliedAt: string;
  game: GameKey;
  gameSnapshot: LeaderboardSnapshot;
  globalSnapshot: LeaderboardSnapshot;
  updates: RatingDelta[];
}

export interface PlayerLeaderboardView {
  playerId: PlayerId;
  global?: RatingSnapshot;
  byGame: Partial<Record<GameKey, RatingSnapshot>>;
}

export interface LeaderboardEngine {
  applyMatch(match: ResolvedLeaderboardMatch): LeaderboardApplyResult;
  getSnapshot(game: RankedGame, options?: LeaderboardSnapshotOptions): LeaderboardSnapshot;
  getPlayerView(playerId: PlayerId): PlayerLeaderboardView;
}

export interface SeatAssignmentLookup {
  seatId: SeatId;
  assignment: SeatAssignment;
}

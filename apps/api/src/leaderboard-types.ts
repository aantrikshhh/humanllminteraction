import type { GameKey, PlayerId } from "@arena/contracts";
import type {
  LeaderboardApplyResult,
  LeaderboardSnapshot,
  PlayerLeaderboardView,
  RankedGame,
  ResolvedLeaderboardMatch,
} from "@arena/leaderboard";

export interface LeaderboardQuery {
  game?: RankedGame;
  limit?: number;
}

export interface PlayerLeaderboardQuery {
  playerId: PlayerId;
}

export interface ApplyLeaderboardMatchRequest {
  match: ResolvedLeaderboardMatch;
}

export interface ApplyLeaderboardMatchResponse {
  ok: true;
  data: LeaderboardApplyResult;
}

export interface LeaderboardSnapshotResponse {
  ok: true;
  data: LeaderboardSnapshot;
}

export interface PlayerLeaderboardResponse {
  ok: true;
  data: PlayerLeaderboardView;
}

export interface LeaderboardRouteParams {
  game?: RankedGame;
  playerId?: PlayerId;
}

export interface GameLeaderboardSummary {
  game: GameKey;
  topPlayers: LeaderboardSnapshot["entries"];
}

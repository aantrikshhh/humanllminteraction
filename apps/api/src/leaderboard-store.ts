import {
  createLeaderboardEngine,
  type LeaderboardApplyResult,
  type LeaderboardSnapshot,
  type PlayerLeaderboardView,
  type RankedGame,
  type ResolvedLeaderboardMatch,
} from "@arena/leaderboard";

const leaderboardEngine = createLeaderboardEngine();

export function applyResolvedLeaderboardMatch(
  match: ResolvedLeaderboardMatch,
): LeaderboardApplyResult {
  return leaderboardEngine.applyMatch(match);
}

export function getLeaderboardSnapshot(
  game: RankedGame = "global",
  limit?: number,
): LeaderboardSnapshot {
  return leaderboardEngine.getSnapshot(game, { limit });
}

export function getPlayerLeaderboardView(playerId: string): PlayerLeaderboardView {
  return leaderboardEngine.getPlayerView(playerId);
}

export { leaderboardEngine };

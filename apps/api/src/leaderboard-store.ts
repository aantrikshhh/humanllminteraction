import {
  createLeaderboardEngine,
  type LeaderboardApplyResult,
  type LeaderboardSnapshot,
  type PlayerLeaderboardView,
  type RankedGame,
  type ResolvedLeaderboardMatch,
} from "@arena/leaderboard";

const leaderboardEngine = createLeaderboardEngine();
const appliedMatches = new Map<string, LeaderboardApplyResult>();

export function applyResolvedLeaderboardMatch(
  match: ResolvedLeaderboardMatch,
): LeaderboardApplyResult {
  const existing = appliedMatches.get(match.result.matchId);
  if (existing) {
    return existing;
  }

  const applied = leaderboardEngine.applyMatch(match);
  appliedMatches.set(match.result.matchId, applied);
  return applied;
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

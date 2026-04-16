import Link from "next/link";

import { getLeaderboardSnapshot } from "../../../lib/service-data";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const leaderboardSnapshot = await getLeaderboardSnapshot("global", 12);

  return (
    <main className="app-shell">
      <div className="shell stack">
        <div className="topbar topbar-app">
          <div className="brand">ARENA</div>
          <nav className="nav">
            <Link href="/">Overview</Link>
            <Link href="/lobby">Lobby</Link>
            <Link href="/results">Results</Link>
            <Link href="/payments">Payments</Link>
          </nav>
        </div>

        <section className="hero-band">
          <div className="stack">
            <div className="eyebrow">Leaderboard</div>
            <h1 className="section-title">Global rank before reveal.</h1>
            <p className="muted section-copy">
              Ratings stay player-based while matches remain seat-blinded. This page reads the
              in-memory leaderboard service when available and drops to seeded demo standings when
              the API is offline.
            </p>
          </div>
          <div className="service-stack">
            <div className="service-pill">
              <span>Source</span>
              <strong>{leaderboardSnapshot.source}</strong>
            </div>
            <div className="service-pill">
              <span>Endpoint</span>
              <strong>global</strong>
            </div>
          </div>
        </section>

        <section className="workspace">
          <div className="stack">
            <div className="section-row">
              <div>
                <h2>Top Players</h2>
                <p className="muted">
                  Source: <code>{leaderboardSnapshot.baseUrl}</code>
                </p>
              </div>
              <Link className="button" href="/lobby">
                Back to lobby
              </Link>
            </div>

            <div className="table-panel">
              <table className="ranking-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Rating</th>
                    <th>Wins</th>
                    <th>Matches</th>
                    <th>Last Match</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardSnapshot.data.entries.map((entry) => (
                    <tr key={entry.playerId}>
                      <td>#{entry.rank}</td>
                      <td>
                        <div className="table-player">
                          <strong>{entry.displayName}</strong>
                          <span>{entry.playerId}</span>
                        </div>
                      </td>
                      <td>{entry.rating}</td>
                      <td>{entry.wins}</td>
                      <td>{entry.matchesPlayed}</td>
                      <td>{entry.lastMatchId ? entry.lastMatchId.slice(0, 10) : "n/a"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

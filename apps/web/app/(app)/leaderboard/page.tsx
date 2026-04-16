import Link from "next/link";

import { getLeaderboardSnapshot, getMatchLedgerByRoomId } from "../../../lib/service-data";

export const dynamic = "force-dynamic";

interface LeaderboardPageProps {
  searchParams?: Promise<{
    roomId?: string;
  }>;
}

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const roomId = (await searchParams)?.roomId;
  const leaderboardSnapshot = await getLeaderboardSnapshot("global", 12);
  const roomLedgerSnapshot = roomId ? await getMatchLedgerByRoomId(roomId) : null;
  const roomLedger = roomLedgerSnapshot?.data ?? null;
  const topEntry = leaderboardSnapshot.data.entries[0] ?? null;
  const totalWins = leaderboardSnapshot.data.entries.reduce((sum, entry) => sum + entry.wins, 0);

  return (
    <main className="app-shell">
      <div className="shell stack">
        <div className="topbar topbar-app">
          <div className="brand">Turing Games</div>
          <nav className="nav">
            <Link href="/">Overview</Link>
            <Link href="/lobby">Lobby</Link>
            <Link href="/rooms">Rooms</Link>
            <Link href="/results">Results</Link>
            <Link href="/payments">Payments</Link>
          </nav>
        </div>

        <section className="hero-band">
          <div className="stack">
            <div className="eyebrow">Leaderboard</div>
            <h1 className="section-title">Ratings across blinded matches.</h1>
            <p className="muted section-copy">
              {roomLedger
                ? `Showing the global board alongside the latest rating impact for room ${roomId}.`
                : "This is the public standings view for the MVP. Matches stay seat-blinded during play, but player ratings, wins, and match volume still move once rooms settle."}
            </p>
          </div>
          <div className="service-stack">
            <div className="service-pill">
              <span>Source</span>
              <strong>{leaderboardSnapshot.source}</strong>
            </div>
            <div className="service-pill">
              <span>Top rating</span>
              <strong>{topEntry ? topEntry.rating : "n/a"}</strong>
            </div>
            <div className="service-pill">
              <span>Total wins shown</span>
              <strong>{totalWins}</strong>
            </div>
            {roomLedger ? (
              <div className="service-pill">
                <span>Room context</span>
                <strong>{roomLedger.roomId.slice(0, 8)}</strong>
              </div>
            ) : null}
          </div>
        </section>

        <section className="workspace">
          <div className="stack">
              {roomLedger ? (
                <div className="panel">
                  <div className="section-row">
                    <div>
                      <h2>Latest room impact</h2>
                      <p className="muted">
                        This room already settled. These deltas come from the same match ledger the
                        results page reads, so the story stays consistent as you move through the MVP.
                      </p>
                    </div>
                    <div className="inline-actions">
                      <Link className="button" href={`/results/${roomLedger.roomId}`}>
                        Back to results
                      </Link>
                      <Link className="button" href={`/payments?roomId=${encodeURIComponent(roomLedger.roomId)}`}>
                        Room payouts
                      </Link>
                    </div>
                  </div>
                  <div className="compact-list">
                    {roomLedger.seatImpacts.map((impact, index) => (
                      <div className="compact-row" key={`room-impact-${impact.seatId}`}>
                        <div>
                          <strong>
                            {index + 1}. {impact.displayName}
                          </strong>
                          <span>
                            Score {impact.score >= 0 ? "+" : ""}
                            {impact.score}
                            {impact.leaderboard
                              ? ` · rating ${impact.leaderboard.previousRating} -> ${impact.leaderboard.newRating}`
                              : " · rating delta pending"}
                          </span>
                        </div>
                        <span>
                          {impact.leaderboard
                            ? `${impact.leaderboard.delta >= 0 ? "+" : ""}${impact.leaderboard.delta}`
                            : "pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="section-row">
                <div>
                  <h2>Current standings</h2>
                  <p className="muted">
                    Read this page as the public summary of who is converting hidden-seat matches
                    into consistent wins.
                  </p>
                </div>
                <div className="inline-actions">
                  <Link className="button" href="/rooms">
                  Live rooms
                </Link>
                <Link className="button" href={roomLedger ? `/results/${roomLedger.roomId}` : "/results"}>
                  {roomLedger ? "Room results" : "Result index"}
                </Link>
                <Link className="button" href="/lobby">
                  Lobby
                </Link>
              </div>
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

              <div className="panel">
                <div className="section-row">
                  <h2>Use the board in the MVP loop</h2>
                  <span className="pill subtle">Next views</span>
                </div>
                <div className="compact-list">
                  <div className="compact-row">
                    <div>
                      <strong>Watch a room before it settles</strong>
                      <span>Open the room board if you want to show the live match before the rating changes land.</span>
                    </div>
                    <Link href="/rooms">Open rooms</Link>
                  </div>
                  <div className="compact-row">
                    <div>
                      <strong>Inspect completed results</strong>
                      <span>Result pages show standings, replay access, and payout state without revealing seat identity.</span>
                    </div>
                    <Link href={roomLedger ? `/results/${roomLedger.roomId}` : "/results"}>
                      {roomLedger ? "Open room result" : "Open results"}
                    </Link>
                  </div>
                  <div className="compact-row">
                    <div>
                      <strong>Check payout follow-through</strong>
                      <span>The payment surface shows the current MVP escrow and payout state after the room closes.</span>
                    </div>
                    <Link href={roomLedger ? `/payments?roomId=${encodeURIComponent(roomLedger.roomId)}` : "/payments"}>
                      {roomLedger ? "Open room payouts" : "Open payments"}
                    </Link>
                  </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

import Link from "next/link";

import LobbyRoomConsole from "./LobbyRoomConsole";
import {
  formatUsd,
  getLeaderboardSnapshot,
  getPaymentsSnapshot,
  getRoomsSnapshot,
} from "../../../lib/service-data";

export const dynamic = "force-dynamic";

export default async function LobbyPage() {
  const [roomsSnapshot, leaderboardSnapshot, paymentsSnapshot] = await Promise.all([
    getRoomsSnapshot(),
    getLeaderboardSnapshot("global", 5),
    getPaymentsSnapshot("demo-player"),
  ]);

  return (
    <main className="app-shell">
      <div className="shell stack">
        <div className="topbar topbar-app">
          <div className="brand">ARENA</div>
          <nav className="nav">
            <Link href="/">Overview</Link>
            <Link href="/leaderboard">Leaderboard</Link>
            <Link href="/results">Results</Link>
            <Link href="/payments">Payments</Link>
          </nav>
        </div>

        <section className="hero-band">
          <div className="stack">
            <div className="eyebrow">Operator Lobby</div>
            <h1 className="section-title">Live rooms, blinded seats, and demo payout flow.</h1>
            <p className="muted section-copy">
              The lobby reads from the room runtime, leaderboard API, and payments stub when they
              are running locally. If any service is down, the shell falls back to seeded demo data
              so the product remains usable during integration.
            </p>
          </div>

          <div className="service-stack">
            <div className="service-pill">
              <span>Rooms</span>
              <strong>{roomsSnapshot.source}</strong>
            </div>
            <div className="service-pill">
              <span>Leaderboard</span>
              <strong>{leaderboardSnapshot.source}</strong>
            </div>
            <div className="service-pill">
              <span>Payments</span>
              <strong>{paymentsSnapshot.source}</strong>
            </div>
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="workspace">
            <LobbyRoomConsole initialRooms={roomsSnapshot.data} />
          </section>

          <aside className="sidebar sidebar-wide">
            <div className="stack">
              <div className="panel">
                <div className="section-row">
                  <h2>Top Ladder</h2>
                  <Link href="/leaderboard">Full board</Link>
                </div>
                <div className="compact-list">
                  {leaderboardSnapshot.data.entries.slice(0, 5).map((entry) => (
                    <div className="compact-row" key={entry.playerId}>
                      <div>
                        <strong>{entry.displayName}</strong>
                        <span>
                          {entry.wins} wins · {entry.matchesPlayed} matches
                        </span>
                      </div>
                      <strong>{entry.rating}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="section-row">
                  <h2>Demo Wallet</h2>
                  <Link href="/payments">Payout flow</Link>
                </div>
                <div className="metric-grid">
                  <div className="metric">
                    <span>Available</span>
                    <strong>{formatUsd(paymentsSnapshot.data.wallet.availableUsd)}</strong>
                  </div>
                  <div className="metric">
                    <span>Pending</span>
                    <strong>{formatUsd(paymentsSnapshot.data.wallet.pendingUsd)}</strong>
                  </div>
                </div>
                <p className="muted">
                  Wallet <code>{paymentsSnapshot.data.wallet.walletAddress.slice(0, 12)}...</code>
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

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
  const liveRoom =
    roomsSnapshot.data.find((room) => room.phase !== "results") ?? roomsSnapshot.data[0] ?? null;
  const settledRoom = roomsSnapshot.data.find((room) => room.phase === "results") ?? null;

  return (
    <main className="app-shell">
      <div className="shell stack">
        <div className="topbar topbar-app">
          <div className="brand">ARENA</div>
          <nav className="nav">
            <Link href="/">Overview</Link>
            <Link href="/rooms">Rooms</Link>
            <Link href="/results">Results</Link>
            <Link href="/leaderboard">Leaderboard</Link>
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
            <div className="stack">
              <div className="section-row">
                <div>
                  <h2>Room controls</h2>
                  <p className="muted">
                    Create or advance a room here, then move laterally into the live room shell or
                    public result surface.
                  </p>
                </div>
                <div className="inline-actions">
                  <Link className="button" href="/rooms">
                    Room catalog
                  </Link>
                  <Link className="button" href="/results">
                    Result index
                  </Link>
                </div>
              </div>
              <LobbyRoomConsole initialRooms={roomsSnapshot.data} />
            </div>
          </section>

          <aside className="sidebar sidebar-wide">
            <div className="stack">
              <div className="panel">
                <div className="section-row">
                  <h2>Operator rail</h2>
                  <span className="pill subtle">Fast path</span>
                </div>
                <div className="compact-list">
                  <div className="compact-row">
                    <div>
                      <strong>Browse room catalog</strong>
                      <span>See every live or settled room in one place.</span>
                    </div>
                    <Link href="/rooms">Open</Link>
                  </div>
                  <div className="compact-row">
                    <div>
                      <strong>{liveRoom ? "Jump into the active room" : "Open the room stage"}</strong>
                      <span>
                        {liveRoom
                          ? `${liveRoom.roomId} · ${liveRoom.game} · ${liveRoom.phase}`
                          : "Use the room page once a lobby session has been created."}
                      </span>
                    </div>
                    <Link href={liveRoom ? `/rooms/${liveRoom.roomId}` : "/rooms"}>Open</Link>
                  </div>
                  <div className="compact-row">
                    <div>
                      <strong>{settledRoom ? "Review the latest settled room" : "Browse result surfaces"}</strong>
                      <span>
                        {settledRoom
                          ? `${settledRoom.roomId} is ready for payout and ladder follow-through.`
                          : "Use the result index or seeded preview while the runtime is still active."}
                      </span>
                    </div>
                    <Link href={settledRoom ? `/results/${settledRoom.roomId}` : "/results"}>Open</Link>
                  </div>
                </div>
              </div>

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

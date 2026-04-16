import Link from "next/link";

import { getRoomsSnapshot, labelGame } from "../../../lib/service-data";

export const dynamic = "force-dynamic";

export default async function RoomsIndexPage() {
  const roomsSnapshot = await getRoomsSnapshot();

  return (
    <main className="app-shell">
      <div className="shell stack">
        <div className="topbar topbar-app">
          <div className="brand">ARENA</div>
          <nav className="nav">
            <Link href="/">Overview</Link>
            <Link href="/lobby">Lobby</Link>
            <Link href="/results">Results</Link>
            <Link href="/leaderboard">Leaderboard</Link>
            <Link href="/payments">Payments</Link>
          </nav>
        </div>

        <section className="hero-band">
          <div className="stack">
            <div className="eyebrow">Rooms</div>
            <h1 className="section-title">Discover live and recently settled rooms.</h1>
            <p className="muted section-copy">
              This route exposes the current room catalog from the runtime, with direct links into
              both the live room shell and the seat-blinded result view.
            </p>
          </div>
          <div className="service-stack">
            <div className="service-pill">
              <span>Source</span>
              <strong>{roomsSnapshot.source}</strong>
            </div>
            <div className="service-pill">
              <span>Rooms</span>
              <strong>{roomsSnapshot.data.length}</strong>
            </div>
          </div>
        </section>

        <section className="workspace">
          <div className="stack">
            <div className="section-row">
              <div>
                <h2>Active catalog</h2>
                <p className="muted">
                  Source: <code>{roomsSnapshot.baseUrl}</code>
                </p>
              </div>
              <div className="inline-actions">
                <Link className="button" href="/results">
                  Result index
                </Link>
                <Link className="button" href="/leaderboard">
                  Leaderboard
                </Link>
                <Link className="button" href="/lobby">
                  Lobby
                </Link>
              </div>
            </div>

            <div className="card-grid">
              {roomsSnapshot.data.map((room) => (
                <article className="panel tile-card" key={room.roomId}>
                  <div className="tile-topline">
                    <span className="pill accent">{labelGame(room.game)}</span>
                    <span className="pill subtle">{room.phase}</span>
                  </div>
                  <h3>{room.roomId}</h3>
                  <p className="muted">
                    Match <code>{room.matchId.slice(0, 12)}</code> · round {room.round}
                  </p>
                  <div className="metric-grid">
                    <div className="metric">
                      <span>Seats</span>
                      <strong>{room.seats.length}</strong>
                    </div>
                    <div className="metric">
                      <span>Last event</span>
                      <strong>{room.lastEventAt.slice(11, 16)}</strong>
                    </div>
                  </div>
                  <div className="inline-actions">
                    <Link className="button primary" href={`/rooms/${room.roomId}`}>
                      Open room
                    </Link>
                    <Link className="button" href={`/results/${room.roomId}`}>
                      Result view
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <div className="panel">
              <div className="section-row">
                <h2>Operator loop</h2>
                <span className="pill subtle">Discoverability</span>
              </div>
              <div className="compact-list">
                <div className="compact-row">
                  <div>
                    <strong>Start from the lobby</strong>
                    <span>Create or seed a room before moving into the live stage.</span>
                  </div>
                  <Link href="/lobby">Open lobby</Link>
                </div>
                <div className="compact-row">
                  <div>
                    <strong>Review settled outcomes</strong>
                    <span>Use the result index for the read-only post-match surfaces.</span>
                  </div>
                  <Link href="/results">Open results</Link>
                </div>
                <div className="compact-row">
                  <div>
                    <strong>Inspect downstream effects</strong>
                    <span>Leaderboard and payments complete the operator loop after a match closes.</span>
                  </div>
                  <Link href="/payments">Open payments</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

import Link from "next/link";

import styles from "./results.module.css";

const sampleRooms = [
  {
    roomId: "demo-auction-results",
    label: "Auction room",
    note: "Seeded completed room with replay and placeholders for payout and rank impact.",
  },
];

export default function ResultsIndexPage() {
  return (
    <main className="app-shell">
      <div className="shell stack">
        <div className="topbar topbar-app">
          <div className="brand">ARENA</div>
          <nav className="nav">
            <Link href="/">Overview</Link>
            <Link href="/lobby">Lobby</Link>
            <Link href="/leaderboard">Leaderboard</Link>
            <Link href="/payments">Payments</Link>
          </nav>
        </div>

        <section className="hero-band">
          <div className="stack">
            <div className="eyebrow">Results</div>
            <h1 className="section-title">Completed rooms, no reveal required.</h1>
            <p className="muted section-copy">
              Post-match surfaces stay public, seat-based, and read-only. Winners, scores, replay
              availability, payout status, and ladder sync can all be shown without disclosing
              which opponents were human or model-backed.
            </p>
          </div>
          <div className="service-stack">
            <div className="service-pill">
              <span>Mode</span>
              <strong>Read only</strong>
            </div>
            <div className="service-pill">
              <span>Identity</span>
              <strong>Seat-blinded</strong>
            </div>
          </div>
        </section>

        <section className="workspace">
          <div className="stack">
            <div className="section-row">
              <div>
                <h2>Sample result rooms</h2>
                <p className="muted">Use a room id to inspect a completed match.</p>
              </div>
              <Link className="button" href="/lobby">
                Back to lobby
              </Link>
            </div>

            <div className="card-grid card-grid-single">
              {sampleRooms.map((room) => (
                <article className={`panel tile-card ${styles.winnerPanel}`} key={room.roomId}>
                  <div className="tile-topline">
                    <span className="pill accent">Preview</span>
                    <span className="pill subtle">{room.roomId}</span>
                  </div>
                  <h3>{room.label}</h3>
                  <p className="muted">{room.note}</p>
                  <div className="inline-actions">
                    <Link className="button primary" href={`/results/${room.roomId}`}>
                      Open result page
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

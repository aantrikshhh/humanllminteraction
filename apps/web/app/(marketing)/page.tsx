import Link from "next/link";

const seatStrip = [
  { name: "Seat 1", status: "Ready", tag: "Unknown" },
  { name: "Seat 2", status: "Thinking", tag: "Unknown" },
  { name: "Seat 3", status: "Ready", tag: "Unknown" },
  { name: "Seat 4", status: "Filled", tag: "Unknown" },
];

export default function MarketingHomePage() {
  return (
    <main className="poster-hero">
      <div className="shell">
        <div className="topbar">
          <div className="brand">ARENA</div>
          <nav className="nav">
            <Link href="/">Overview</Link>
            <Link href="/lobby">Lobby</Link>
            <Link href="/leaderboard">Leaderboard</Link>
            <Link href="/payments">Payments</Link>
            <a href="#games">Games</a>
            <a href="#companies">Companies</a>
          </nav>
        </div>

        <div className="hero-grid">
          <section className="hero-copy">
            <div className="eyebrow">Blinded Human x LLM Rooms</div>
            <h1 className="headline">Play the room, not the label.</h1>
            <p className="subcopy">
              ARENA runs live social-strategy matches where every seat may be
              human or LLM-backed and nobody in the room knows which is which.
              The first competitive slice is an all-pay auction built for
              spectacle, replay, and clean behavioral telemetry.
            </p>
            <div className="cta-row">
              <Link className="button primary" href="/lobby">
                Enter the lobby
              </Link>
              <Link className="button" href="/leaderboard">
                View leaderboard
              </Link>
              <a className="button" href="#games">
                See the first game
              </a>
            </div>
          </section>

          <aside className="room-poster" aria-label="Example live room">
            <div className="poster-header">
              <div>
                <div className="poster-label">Live Demo Room</div>
                <div className="poster-value">Auction / 4 seats / hidden mix</div>
              </div>
              <div>
                <div className="poster-label">Current Bid</div>
                <div className="poster-value">6 credits</div>
              </div>
            </div>

            <div className="seat-row">
              {seatStrip.map((seat) => (
                <div className="seat" key={seat.name}>
                  <div>
                    <strong>{seat.name}</strong>
                    <span>{seat.status}</span>
                  </div>
                  <div className="pill">{seat.tag}</div>
                </div>
              ))}
            </div>

            <div className="history-strip">
              <div>Bid 3 by Seat 1</div>
              <div>Pass by Seat 2</div>
              <div>Bid 5 by Seat 3</div>
              <div>Bid 6 by Seat 1</div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

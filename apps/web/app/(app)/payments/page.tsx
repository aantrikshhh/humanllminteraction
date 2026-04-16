import Link from "next/link";

import { formatUsd, getPaymentsSnapshot } from "../../../lib/service-data";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const paymentsSnapshot = await getPaymentsSnapshot("demo-player");

  return (
    <main className="app-shell">
      <div className="shell stack">
        <div className="topbar topbar-app">
          <div className="brand">ARENA</div>
          <nav className="nav">
            <Link href="/">Overview</Link>
            <Link href="/lobby">Lobby</Link>
            <Link href="/leaderboard">Leaderboard</Link>
            <Link href="/results">Results</Link>
          </nav>
        </div>

        <section className="hero-band">
          <div className="stack">
            <div className="eyebrow">Payments Stub</div>
            <h1 className="section-title">Simulated escrow and payouts for match wins.</h1>
            <p className="muted section-copy">
              This surface stays explicitly simulated for MVP. The wallet, escrow, and payout states
              are already real app views backed by the in-memory engine, with a clean seam for a
              future chain adapter.
            </p>
          </div>
          <div className="service-stack">
            <div className="service-pill">
              <span>Source</span>
              <strong>{paymentsSnapshot.source}</strong>
            </div>
            <div className="service-pill">
              <span>Network</span>
              <strong>{paymentsSnapshot.data.wallet.network}</strong>
            </div>
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="workspace">
            <div className="stack">
              <div className="section-row">
                <div>
                  <h2>Wallet</h2>
                  <p className="muted">
                    Source: <code>{paymentsSnapshot.baseUrl}</code>
                  </p>
                </div>
                <Link className="button" href="/lobby">
                  Back to lobby
                </Link>
              </div>

              <div className="metric-grid metric-grid-large">
                <div className="metric">
                  <span>Available</span>
                  <strong>{formatUsd(paymentsSnapshot.data.wallet.availableUsd)}</strong>
                </div>
                <div className="metric">
                  <span>Pending</span>
                  <strong>{formatUsd(paymentsSnapshot.data.wallet.pendingUsd)}</strong>
                </div>
                <div className="metric">
                  <span>Total earned</span>
                  <strong>{formatUsd(paymentsSnapshot.data.wallet.totalEarnedUsd)}</strong>
                </div>
              </div>

              <div className="panel">
                <strong>Connected wallet</strong>
                <p className="muted">
                  <code>{paymentsSnapshot.data.wallet.walletAddress}</code>
                </p>
              </div>

              <div className="card-grid card-grid-single">
                {paymentsSnapshot.data.escrowSummaries.map((escrow) => (
                  <article className="panel tile-card" key={escrow.escrowId}>
                    <div className="tile-topline">
                      <span className="pill accent">{escrow.gameId}</span>
                      <span className="pill subtle">{escrow.status}</span>
                    </div>
                    <h3>{escrow.escrowId}</h3>
                    <p className="muted">
                      Funded {formatUsd(escrow.fundedAmountUsd)} · released{" "}
                      {formatUsd(escrow.releasedAmountUsd)}
                    </p>
                    <div className="compact-list">
                      {escrow.timeline.map((event) => (
                        <div
                          className="compact-row"
                          key={`${escrow.escrowId}-${event.status}-${event.occurredAt}`}
                        >
                          <div>
                            <strong>{event.status}</strong>
                            <span>{event.note ?? "status update"}</span>
                          </div>
                          <span>{event.occurredAt.slice(11, 16)}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <aside className="sidebar sidebar-wide">
            <div className="stack">
              <div className="panel">
                <h2>Payouts</h2>
                <div className="compact-list">
                  {paymentsSnapshot.data.payouts.map((payout) => (
                    <div className="compact-row" key={payout.payoutId}>
                      <div>
                        <strong>{formatUsd(payout.amountUsd)}</strong>
                        <span>
                          {payout.matchId.slice(0, 10)} · {payout.lifecycleStatus}
                        </span>
                      </div>
                      <span>{payout.currency}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

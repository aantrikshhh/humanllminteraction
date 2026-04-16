import Link from "next/link";

import { formatUsd, getMatchLedgerByRoomId, getPaymentsSnapshot } from "../../../lib/service-data";

export const dynamic = "force-dynamic";

interface PaymentsPageProps {
  searchParams?: Promise<{
    roomId?: string;
  }>;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const roomId = (await searchParams)?.roomId;
  const paymentsSnapshot = await getPaymentsSnapshot("demo-player");
  const roomLedgerSnapshot = roomId ? await getMatchLedgerByRoomId(roomId) : null;
  const roomLedger = roomLedgerSnapshot?.data ?? null;
  const roomPayouts = roomLedger?.seatImpacts.filter((impact) => impact.payout) ?? [];

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
            <Link href="/leaderboard">Leaderboard</Link>
          </nav>
        </div>

        <section className="hero-band">
          <div className="stack">
            <div className="eyebrow">Payments Stub</div>
            <h1 className="section-title">Payout state after each completed room.</h1>
            <p className="muted section-copy">
              {roomLedger
                ? `Showing the settled payout record for room ${roomLedger.roomId}. Wallets stay simulated, but this room already exported its escrow and winner payout data.`
                : "This page closes the MVP loop after results land. Wallet balances, escrow progress, and winner payouts stay explicitly simulated for now, but they already behave like a real post-match product surface."}
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
            {roomLedger ? (
              <div className="service-pill">
                <span>Room context</span>
                <strong>{roomLedger.roomId.slice(0, 8)}</strong>
              </div>
            ) : null}
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="workspace">
            <div className="stack">
              {roomLedger ? (
                <div className="panel">
                  <div className="section-row">
                    <div>
                      <h2>Room settlement</h2>
                      <p className="muted">
                        This is the same completed match ledger linked from the results page. It
                        shows who received the simulated payout and whether escrow has already settled.
                      </p>
                    </div>
                    <div className="inline-actions">
                      <Link className="button" href={`/results/${roomLedger.roomId}`}>
                        Back to results
                      </Link>
                      <Link className="button" href={`/leaderboard?roomId=${encodeURIComponent(roomLedger.roomId)}`}>
                        Room impact
                      </Link>
                    </div>
                  </div>
                  <div className="compact-list">
                    <div className="compact-row">
                      <div>
                        <strong>Status</strong>
                        <span>{roomLedger.status}</span>
                      </div>
                      <span>{roomLedger.game}</span>
                    </div>
                    <div className="compact-row">
                      <div>
                        <strong>Winning seats</strong>
                        <span>{roomLedger.publicResult.winningSeatIds.join(", ")}</span>
                      </div>
                      <span>{roomLedger.payments ? formatUsd(roomLedger.payments.totalPayoutUsd) : "Pending"}</span>
                    </div>
                    {roomPayouts.map((impact) => (
                      <div className="compact-row" key={`room-payout-${impact.seatId}`}>
                        <div>
                          <strong>{impact.displayName}</strong>
                          <span>
                            {impact.payout?.currency} · {impact.payout?.lifecycleStatus}
                          </span>
                        </div>
                        <span>{formatUsd(impact.payout?.amountUsd ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="section-row">
                <div>
                  <h2>Wallet and escrow</h2>
                  <p className="muted">
                    Start here when you want to show what happens to winnings after a room reaches results.
                  </p>
                </div>
                <div className="inline-actions">
                  <Link className="button" href={roomLedger ? `/results/${roomLedger.roomId}` : "/results"}>
                    {roomLedger ? "Room results" : "Result index"}
                  </Link>
                  <Link className="button" href={roomLedger ? `/leaderboard?roomId=${encodeURIComponent(roomLedger.roomId)}` : "/leaderboard"}>
                    {roomLedger ? "Room impact" : "Leaderboard"}
                  </Link>
                  <Link className="button" href="/lobby">
                    Lobby
                  </Link>
                </div>
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
                      {formatUsd(escrow.fundedAmountUsd)} funded into escrow ·{" "}
                      {formatUsd(escrow.releasedAmountUsd)} already released to winners
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
                <h2>Recent payouts</h2>
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

              <div className="panel">
                <div className="section-row">
                  <h2>Keep the story moving</h2>
                  <span className="pill subtle">Post-match</span>
                </div>
                <div className="compact-list">
                  <div className="compact-row">
                    <div>
                      <strong>Return to live rooms</strong>
                      <span>Jump back to the room board if you want to show the next match forming in real time.</span>
                    </div>
                    <Link href="/rooms">Open rooms</Link>
                  </div>
                  <div className="compact-row">
                    <div>
                      <strong>Review settled matches</strong>
                      <span>Result pages keep winners, replay, and payouts legible without exposing which seats were model-backed.</span>
                    </div>
                    <Link href={roomLedger ? `/results/${roomLedger.roomId}` : "/results"}>
                      {roomLedger ? "Open room result" : "Open results"}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

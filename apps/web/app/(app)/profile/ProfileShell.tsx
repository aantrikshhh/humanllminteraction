import Link from "next/link";

import { getGameLabel, type ProfileSnapshot } from "./data";
import styles from "./profile.module.css";

interface ProfileShellProps {
  snapshot: ProfileSnapshot;
}

function sourcePill(state: "live" | "fallback") {
  return state === "live" ? styles.pillLive : styles.pillFallback;
}

function statusPill(status: "won" | "pending") {
  return status === "won" ? styles.pillWin : styles.pillPending;
}

export function ProfileShell({ snapshot }: ProfileShellProps) {
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
            <Link href="/payments">Payments</Link>
          </nav>
        </div>

        <section className="hero-band">
          <div className={styles.hero}>
            <article className={styles.identityPanel}>
              <div className={styles.identityTopline}>
                <span className={styles.operatorStamp}>Private profile</span>
                <div className={styles.identityStrip}>
                  <span className={styles.pillPrivate}>Seat-blinded</span>
                  <span className={styles.pillLocked}>Reveal withheld</span>
                </div>
              </div>

              <div className={styles.identityGrid}>
                <div className={styles.identityCopy}>
                  <span className={styles.kicker}>{snapshot.playerId}</span>
                  <h1 className={styles.displayName}>{snapshot.displayName}</h1>
                  <div className={styles.codename}>{snapshot.codename}</div>
                  <p className={styles.identityNote}>{snapshot.note}</p>
                  <div className={styles.identityStrip}>
                    <span className={styles.identityChip}>{snapshot.connectionStatus}</span>
                    <span className={styles.identityChip}>{snapshot.network}</span>
                    <span className={styles.identityChip}>{snapshot.walletLabel}</span>
                  </div>
                </div>

                <div className={styles.badgeColumn}>
                  <div className={styles.rankBadge}>
                    <span>Current rank</span>
                    <strong>{snapshot.rankLabel}</strong>
                  </div>
                  <div className={styles.walletBadge}>
                    <span>Wallet</span>
                    <strong>{snapshot.availableLabel}</strong>
                    <code>{snapshot.walletLabel}</code>
                  </div>
                </div>
              </div>
            </article>

            <aside className={`panel ${styles.metaPanel}`}>
              <div>
                <h2>Service surfaces</h2>
                <p className="muted">
                  This route composes existing ladder, payout, and room reads without adding any
                  new backend contract.
                </p>
              </div>
              <div className={styles.sourceGrid}>
                <div className={styles.sourceRow}>
                  <div>
                    <strong>Leaderboard</strong>
                    <span>{snapshot.sourceBaseUrls.leaderboard}</span>
                  </div>
                  <span className={sourcePill(snapshot.sourceStates.leaderboard)}>
                    {snapshot.sourceStates.leaderboard}
                  </span>
                </div>
                <div className={styles.sourceRow}>
                  <div>
                    <strong>Payments</strong>
                    <span>{snapshot.sourceBaseUrls.payments}</span>
                  </div>
                  <span className={sourcePill(snapshot.sourceStates.payments)}>
                    {snapshot.sourceStates.payments}
                  </span>
                </div>
                <div className={styles.sourceRow}>
                  <div>
                    <strong>Rooms</strong>
                    <span>{snapshot.sourceBaseUrls.rooms}</span>
                  </div>
                  <span className={sourcePill(snapshot.sourceStates.rooms)}>
                    {snapshot.sourceStates.rooms}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="workspace">
            <div className="stack">
              <div className={styles.metricsRail}>
                <div className={styles.metricTile}>
                  <span>Rating</span>
                  <strong>{snapshot.ratingLabel}</strong>
                </div>
                <div className={styles.metricTile}>
                  <span>Win rate</span>
                  <strong>{snapshot.winRateLabel}</strong>
                </div>
                <div className={styles.metricTile}>
                  <span>Verified wins</span>
                  <strong>{snapshot.winsLabel}</strong>
                </div>
                <div className={styles.metricTile}>
                  <span>Matches tracked</span>
                  <strong>{snapshot.matchesLabel}</strong>
                </div>
                <div className={styles.metricTile}>
                  <span>Pending</span>
                  <strong>{snapshot.pendingLabel}</strong>
                </div>
                <div className={styles.metricTile}>
                  <span>Total earned</span>
                  <strong>{snapshot.earnedLabel}</strong>
                </div>
              </div>

              <div className="panel">
                <div className={styles.historyHeader}>
                  <div>
                    <h2>Private match ledger</h2>
                    <p className="muted">
                      This ledger only shows activity we can verify from existing payout and room
                      surfaces. Opponents stay blinded, and non-settled matches remain out of view
                      until a dedicated player-history contract exists.
                    </p>
                  </div>
                  <Link className="button" href="/results">
                    Browse room results
                  </Link>
                </div>

                <div className={styles.historyList}>
                  {snapshot.history.map((item) => (
                    <article className={styles.historyRow} key={item.id}>
                      <div className={styles.historyPrimary}>
                        <div className={styles.historyTopline}>
                          <span className={statusPill(item.outcome)}>{item.outcome}</span>
                          <span className={styles.pillPrivate}>{getGameLabel(item.game)}</span>
                        </div>
                        <h3 className={styles.historyTitle}>{item.matchId}</h3>
                        <div className={styles.historyMeta}>
                          <span>{item.seatCountLabel}</span>
                          <span>{item.replayLabel}</span>
                          <span>{item.roomStateLabel}</span>
                        </div>
                      </div>

                      <div className={styles.historySecondary}>
                        <span>Settlement</span>
                        <strong>{item.amountLabel}</strong>
                        <span>{item.settledAtLabel}</span>
                      </div>

                      <div className={styles.historyAction}>
                        {item.resultsHref ? (
                          <Link className={styles.buttonGhost} href={item.resultsHref}>
                            Open result
                          </Link>
                        ) : (
                          <span className="muted">Awaiting result export</span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className="sidebar sidebar-wide">
            <div className="stack">
              <div className="panel">
                <h2>Visibility rules</h2>
                <ul className={styles.ruleList}>
                  {snapshot.visibilityRules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </div>

              <div className="panel">
                <h2>Current stance</h2>
                <div className="compact-list">
                  <div className="compact-row">
                    <div>
                      <strong>Identity mode</strong>
                      <span>Private player shell</span>
                    </div>
                    <span className={styles.pillLocked}>No reveal</span>
                  </div>
                  <div className="compact-row">
                    <div>
                      <strong>Wallet status</strong>
                      <span>{snapshot.connectionStatus}</span>
                    </div>
                    <span>{snapshot.network}</span>
                  </div>
                  <div className="compact-row">
                    <div>
                      <strong>Next useful seam</strong>
                      <span>Match-level history read API</span>
                    </div>
                    <span>Required</span>
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

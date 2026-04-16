import { headers } from "next/headers";
import Link from "next/link";
import type { ReplayEvent } from "@arena/contracts";

import {
  formatScore,
  formatTimestamp,
  formatUsd,
  getProjectedPrizeUsd,
  getResultsSnapshot,
  labelGame,
} from "../data";
import styles from "../results.module.css";

export const dynamic = "force-dynamic";

interface ResultsRoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default async function ResultsRoomPage({ params }: ResultsRoomPageProps) {
  const { roomId } = await params;
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host") ?? "127.0.0.1:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const snapshot = await getResultsSnapshot(roomId, origin);
  const room = snapshot.room;

  if (!room) {
    return (
      <main className="app-shell">
        <div className="shell stack">
          <div className="topbar topbar-app">
          <div className="brand">ARENA</div>
          <nav className="nav">
            <Link href="/">Overview</Link>
            <Link href="/lobby">Lobby</Link>
            <Link href="/rooms">Rooms</Link>
            <Link href="/results">Results</Link>
            <Link href="/leaderboard">Leaderboard</Link>
            <Link href="/payments">Payments</Link>
          </nav>
        </div>

          <section className="workspace">
            <div className="stack">
              <div className="section-row">
                <div>
                  <h1>Result room unavailable</h1>
                  <p className="muted">
                    The room record could not be loaded from the local rooms runtime.
                  </p>
                </div>
                <Link className="button" href="/results">
                  Browse previews
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const ledger = snapshot.matchLedger;
  const orderedSeats = [...room.seats].sort((left, right) => {
    return (right.score ?? 0) - (left.score ?? 0);
  });
  const publicResult = ledger?.publicResult ?? room.publicResult;
  const matchSync = ledger?.matchSync ?? room.matchSync;
  const winningSeatIds = publicResult?.winningSeatIds ?? [];
  const winningScore =
    publicResult?.winningSeatIds.length && publicResult.seatScores
      ? Math.max(
          ...publicResult.winningSeatIds.map((seatId) => publicResult?.seatScores[seatId] ?? 0),
        )
      : (orderedSeats[0]?.score ?? 0);
  const winners =
    winningSeatIds.length > 0
      ? orderedSeats.filter((seat) => winningSeatIds.includes(seat.seatId))
      : orderedSeats.filter((seat) => (seat.score ?? 0) === winningScore);
  const replayEvents = snapshot.replay?.events ?? [];
  const lastEvents = replayEvents.slice(-4).reverse();
  const leadMargin =
    orderedSeats.length > 1 ? winningScore - (orderedSeats[1]?.score ?? 0) : winningScore;
  const projectedPrize = ledger?.payments?.totalPayoutUsd ?? getProjectedPrizeUsd(room.game);
  const winnerPayouts = ledger?.seatImpacts.filter((impact) => impact.isWinner && impact.payout);
  const payoutSplit =
    winnerPayouts && winnerPayouts.length > 0
      ? winnerPayouts.reduce((sum, impact) => sum + (impact.payout?.amountUsd ?? 0), 0) / winnerPayouts.length
      : winners.length > 0
        ? projectedPrize / winners.length
        : 0;
  const replayUrl =
    snapshot.source === "live"
      ? `/api/rooms/${encodeURIComponent(room.roomId)}/replay`
      : null;
  const phaseMessage =
    snapshot.state === "completed"
      ? snapshot.isPreview
        ? "Previewing a seeded completed room because no live result was available."
        : "Completed room loaded from the local runtime. Public identities remain seat-blinded."
      : "This room exists, but it has not finalized yet. The page is holding the public result layout until a terminal room state lands.";

  return (
    <main className="app-shell">
      <div className="shell stack">
        <div className="topbar topbar-app">
          <div className="brand">ARENA</div>
          <nav className="nav">
            <Link href="/">Overview</Link>
            <Link href="/lobby">Lobby</Link>
            <Link href="/rooms">Rooms</Link>
            <Link href="/leaderboard">Leaderboard</Link>
            <Link href="/results">Results</Link>
            <Link href="/payments">Payments</Link>
          </nav>
        </div>

        <section className="hero-band">
          <div className="stack">
            <div className="eyebrow">Post-match results</div>
            <h1 className="section-title">
              {snapshot.state === "completed"
                ? `${labelGame(room.game)} room complete.`
                : `${labelGame(room.game)} room awaiting final result.`}
            </h1>
            <p className={`section-copy muted ${snapshot.state === "incomplete" ? styles.heroNotice : ""}`}>
              {phaseMessage}
            </p>
          </div>
          <div className="service-stack">
            <div className="service-pill">
              <span>Room source</span>
              <strong>{snapshot.source}</strong>
            </div>
            <div className="service-pill">
              <span>Replay</span>
              <strong>{snapshot.replay ? "available" : "pending"}</strong>
            </div>
            <div className="service-pill">
              <span>Reveal</span>
              <strong>withheld</strong>
            </div>
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="workspace">
            <div className="stack">
              <article className={`panel ${styles.winnerPanel}`}>
                <div className={styles.heroSummary}>
                  <div className={styles.heroCopy}>
                    <div className={styles.heroKicker}>{room.roomId}</div>
                    <h2 className={styles.heroTitle}>
                      {snapshot.state === "completed"
                        ? winners.length === 1
                          ? `${winners[0]?.displayName} took the room.`
                          : `${winners.length} seats finished tied at the top.`
                        : "Result shell is armed and waiting."}
                    </h2>
                    <div className={styles.heroText}>
                      {snapshot.state === "completed"
                        ? "Public post-match surfaces stay seat-based by design. Standings, replays, ladder sync, and payouts can all resolve without exposing which seats were model-backed."
                        : "The room runtime is reachable, but the room has not emitted a final public result yet. This page stays read-only and can render as soon as the room enters the results phase."}
                    </div>
                    <div className={styles.winnerStrip}>
                      <span className={styles.winnerBadge}>Match {room.matchId.slice(0, 12)}</span>
                      <span className={styles.winnerBadge}>Round {room.round}</span>
                      <span className={styles.winnerBadge}>{formatTimestamp(room.lastEventAt)}</span>
                    </div>
                  </div>

                  <div className={styles.scoreCard}>
                    <span className={styles.scoreLead}>Lead margin</span>
                    <strong className={styles.scoreValue}>{formatScore(leadMargin)}</strong>
                    <div className={styles.scoreMeta}>
                      <div className="panel panel-subtle">
                        <strong>{orderedSeats.length}</strong>
                        <p className="muted">visible seats in the public result</p>
                      </div>
                      <div className="panel panel-subtle">
                        <strong>{replayEvents.length}</strong>
                        <p className="muted">replay events captured so far</p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              <div className={styles.calloutGrid}>
                <div className={styles.callout}>
                  <span className={styles.calloutLabel}>Top finish</span>
                  <strong className={styles.calloutValue}>
                    {winners.map((seat) => seat.displayName).join(", ")}
                  </strong>
                </div>
                <div className={styles.callout}>
                  <span className={styles.calloutLabel}>Projected payout</span>
                  <strong className={styles.calloutValue}>
                    {snapshot.state === "completed" ? formatUsd(payoutSplit) : "Pending"}
                  </strong>
                </div>
              <div className={styles.callout}>
                <span className={styles.calloutLabel}>Leaderboard sync</span>
                <strong className={styles.calloutValue}>
                  {snapshot.state === "completed"
                      ? matchSync?.status ?? ledger?.status ?? "Awaiting match-level delta"
                      : "Blocked"}
                </strong>
              </div>
            </div>

              <div className="section-row">
                <div>
                  <h2>Continue through the operator loop</h2>
                  <p className="muted">
                    Move between the live room, result index, ladder, and payout surface without
                    losing the room context.
                  </p>
                </div>
                <div className="inline-actions">
                  <Link className="button" href={`/rooms/${room.roomId}`}>
                    Live room
                  </Link>
                  <Link className="button" href="/results">
                    Result index
                  </Link>
                  <Link className="button" href="/leaderboard">
                    Leaderboard
                  </Link>
                  <Link className="button" href="/payments">
                    Payments
                  </Link>
                </div>
              </div>

              <div className="panel">
                <div className="section-row">
                  <div>
                    <h2>Final standings</h2>
                    <p className="muted">
                      The public result stays seat-based even after the room closes.
                    </p>
                  </div>
                  <span className="pill subtle">{labelGame(room.game)}</span>
                </div>
                {matchSync ? (
                  <div className="panel panel-subtle">
                    <strong>Match sync {matchSync.status}</strong>
                    <p className="muted">
                      Attempts {matchSync.attempts}
                      {matchSync.syncedAt ? ` · synced ${formatTimestamp(matchSync.syncedAt)}` : ""}
                      {matchSync.lastError ? ` · ${matchSync.lastError}` : ""}
                    </p>
                  </div>
                ) : null}
                <div className={styles.outcomeRail}>
                  {orderedSeats.map((seat, index) => (
                    <div className={styles.outcomeRow} key={seat.seatId}>
                      <div className={styles.outcomeSeat}>
                        <strong>{seat.displayName}</strong>
                        <span className={styles.outcomeSeatMeta}>
                          #{index + 1} · {seat.avatarId} · {seat.isConnected ? "connected" : "offline"}
                        </span>
                      </div>
                      <div className={styles.outcomeScore}>
                        <strong>{formatScore(seat.score)}</strong>
                        <span>{index < winners.length ? "room winner" : "final score"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="section-row">
                  <div>
                    <h2>Replay availability</h2>
                    <p className="muted">
                      Replays can stay public because they are driven by seat ids and public events.
                    </p>
                  </div>
                  {replayUrl ? (
                    <a className="button" href={replayUrl} target="_blank" rel="noreferrer">
                      Open replay JSON
                    </a>
                  ) : null}
                </div>
                <div className={styles.timelinePanel}>
                  {lastEvents.length > 0 ? (
                    lastEvents.map((event) => (
                      <TimelineItem event={event} key={`${event.sequence}-${event.type}`} />
                    ))
                  ) : (
                    <div className="panel panel-subtle">
                      <strong>Replay not attached yet</strong>
                      <p className="muted">
                        The public result page can render without a replay, but the room runtime
                        still needs to expose a completed-room replay for audit and demo playback.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <aside className="sidebar sidebar-wide">
            <div className="stack">
              <div className="panel">
                <div className="section-row">
                  <h2>Leaderboard impact</h2>
                  <span className="pill subtle">{ledger ? "Live" : "Placeholder"}</span>
                </div>
                <div className={styles.placeholderBlock}>
                  {ledger
                    ? ledger.seatImpacts.map((impact, index) => (
                        <div className={styles.placeholderStat} key={`ladder-${impact.seatId}`}>
                          <strong>
                            {index + 1}. {impact.displayName}
                          </strong>
                          <span className={styles.supportCopy}>
                            {impact.leaderboard
                              ? `${impact.leaderboard.delta >= 0 ? "+" : ""}${impact.leaderboard.delta} rating · now ${impact.leaderboard.newRating} · ${impact.leaderboard.wins} wins`
                              : "No leaderboard delta recorded for this seat yet."}
                          </span>
                        </div>
                      ))
                    : orderedSeats.slice(0, 3).map((seat, index) => (
                        <div className={styles.placeholderStat} key={`ladder-${seat.seatId}`}>
                          <strong>
                            {index + 1}. {seat.displayName}
                          </strong>
                          <span className={styles.supportCopy}>
                            Public seat results are ready. Match-level rating deltas need a dedicated
                            API read surface keyed by room or match.
                          </span>
                        </div>
                      ))}
                </div>
              </div>

              <div className="panel">
                <div className="section-row">
                  <h2>Payout summary</h2>
                  <span className="pill subtle">{ledger?.payments ? "Live" : "Placeholder"}</span>
                </div>
                <div className={styles.placeholderBlock}>
                  <div className={styles.placeholderStat}>
                    <strong>Prize pool {formatUsd(projectedPrize)}</strong>
                    <span className={styles.supportCopy}>
                      Estimated from the current game’s demo escrow policy.
                    </span>
                  </div>
                  <div className={styles.placeholderStat}>
                    <strong>
                      Winner share {snapshot.state === "completed" ? formatUsd(payoutSplit) : "Pending"}
                    </strong>
                    <span className={styles.supportCopy}>
                      {ledger?.payments
                        ? `Escrow ${ledger.payments.escrowId} settled ${formatTimestamp(ledger.payments.settledAt)}.`
                        : "The public UI can show totals, but a match-level payout lookup is still needed to replace this placeholder with live settlement state."}
                    </span>
                  </div>
                  {ledger?.seatImpacts
                    .filter((impact) => impact.payout)
                    .map((impact) => (
                      <div className={styles.placeholderStat} key={`payout-${impact.seatId}`}>
                        <strong>
                          {impact.displayName} · {formatUsd(impact.payout?.amountUsd ?? 0)}
                        </strong>
                        <span className={styles.supportCopy}>
                          {impact.payout?.currency} · {impact.payout?.lifecycleStatus}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="panel">
                <div className="section-row">
                  <h2>Hidden-seat policy</h2>
                  <span className="pill accent">No reveal</span>
                </div>
                <p className={styles.supportCopy}>
                  This result view deliberately avoids revealing which seats were human, LLM, or
                  scripted. Public outcomes stay useful without collapsing the core premise.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function TimelineItem({ event }: { event: ReplayEvent }) {
  return (
    <div className={styles.timelineItem}>
      <div className={styles.timelineBody}>
        <div className={styles.timelineType}>{event.type}</div>
        <div className="muted">
          {event.actorSeatId ? `${event.actorSeatId} · ` : ""}
          event #{event.sequence}
        </div>
      </div>
      <div className={styles.timelineTime}>{formatTimestamp(event.occurredAt)}</div>
    </div>
  );
}

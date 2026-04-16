import Link from "next/link";

import { splitBrief, splitModule } from "@arena/game-split";

import { getRoomsSnapshot } from "../../../lib/service-data";
import { GameSuiteMasthead } from "../GameSuiteMasthead";

import {
  contentPlan,
  findLiveSplitRoom,
  getFairnessCopy,
  getFairnessLabel,
  getSplitStatus,
  hiddenInfoRail,
  interactionThesis,
  premiseColumns,
  publicInfoRail,
  roundTimeline,
  sampleState,
  splitSignals,
  visualThesis,
} from "./data";
import styles from "./split.module.css";

export const dynamic = "force-dynamic";

function getSeatAccent(avatarId: string) {
  if (avatarId.includes("amber")) {
    return "#ffc178";
  }

  if (avatarId.includes("teal")) {
    return "#6bf2de";
  }

  return "#97d0ff";
}

function getBandClassName(fairnessBand: string) {
  switch (fairnessBand) {
    case "predatory":
      return styles.bandPredatory;
    case "tense":
      return styles.bandTense;
    case "fair":
      return styles.bandFair;
    case "generous":
      return styles.bandGenerous;
    default:
      return "";
  }
}

export default async function SplitPage() {
  const roomsSnapshot = await getRoomsSnapshot();
  const liveSplitRoom = findLiveSplitRoom(roomsSnapshot.data);
  const splitStatus = getSplitStatus(liveSplitRoom);
  const pendingOffer = sampleState.pendingOffer;

  return (
    <main className={`app-shell ${styles.page}`}>
      <div className={`shell ${styles.stack}`}>
        <GameSuiteMasthead
          currentGame="split"
          statusLabel={splitStatus.label}
          statusDetail={splitStatus.detail}
          primaryHref={splitStatus.ctaHref}
          primaryLabel={splitStatus.ctaLabel}
        />

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div>
              <p className={styles.eyebrow}>Game Slice / Hidden-seat ultimatum chamber</p>
              <h1 className={styles.headline}>Mercy is expensive when every cut gets remembered.</h1>
            </div>

            <p className={styles.lede}>
              {splitBrief.summary} The proposer chooses the split. The responder can
              take the deal or torch the whole round. Roles alternate, scores
              persist, and the room never discloses which seat is human. That
              makes Split one of the cleanest ARENA slices for measuring fairness
              thresholds under hidden identity.
            </p>

            <div className={styles.ctaRow}>
              <Link className="button primary" href={splitStatus.ctaHref}>
                {splitStatus.ctaLabel}
              </Link>
              <Link className="button" href="/lobby">
                Open operator lobby
              </Link>
            </div>

            <div className={styles.heroMeta}>
              <div className={styles.metaCard}>
                <span>Visual thesis</span>
                <strong>{visualThesis}</strong>
              </div>
              <div className={styles.metaCard}>
                <span>Public rule</span>
                <strong>Only offers, round outcomes, seat scores, and the active role cross the wire.</strong>
              </div>
              <div className={styles.metaCard}>
                <span>Content plan</span>
                <strong>{contentPlan[0]}</strong>
              </div>
              <div className={styles.metaCard}>
                <span>Interaction thesis</span>
                <strong>{interactionThesis[0]}</strong>
              </div>
            </div>
          </div>

          <aside className={styles.heroStage}>
            <div className={styles.statusCard}>
              <span>Live room status</span>
              <strong>{splitStatus.label}</strong>
              <p className={styles.statusCallout}>{splitStatus.detail}</p>
            </div>

            <div className={styles.stageGrid}>
              {sampleState.seats.map((seat) => (
                <article
                  className={styles.seatCard}
                  key={seat.seatId}
                  style={{ "--seat-accent": getSeatAccent(seat.avatarId) } as React.CSSProperties}
                >
                  <div className={styles.seatHeader}>
                    <div className={styles.seatMask}>{seat.displayName.replace("Seat ", "S")}</div>
                    <span className={styles.rolePill}>{seat.role}</span>
                  </div>

                  <div>
                    <h2 className={styles.seatName}>{seat.displayName}</h2>
                    <p className={styles.seatMeta}>
                      Score {seat.cumulativeScore}. Accepted {seat.acceptedCount}. Rejected{" "}
                      {seat.rejectedCount}.
                    </p>
                  </div>

                  <div className={styles.fairnessRail}>
                    <span>Current standing</span>
                    <strong className={styles.seatScore}>{seat.cumulativeScore}</strong>
                    <div className={styles.fairnessMeter}>
                      <span style={{ width: `${Math.max(16, sampleState.averageOfferShare * 100)}%` }} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </section>

        <section className={styles.signalGrid}>
          {splitSignals.map((signal) => (
            <article className={styles.signalCard} key={signal.label}>
              <span>{signal.label}</span>
              <strong>{signal.value}</strong>
              <p>{signal.detail}</p>
            </article>
          ))}
        </section>

        <section className={styles.supportSection}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionKicker}>Why this game works</span>
            <h2>Split makes fairness legible before the room can guess who is synthetic.</h2>
            <p className={styles.sectionCopy}>
              The surface area is intentionally small: one proposer, one responder,
              one number, one yes-or-burn decision. Because the public rule is so
              compact, the behavioral signal is unusually crisp. You can watch
              generosity, retaliation, or exploitation emerge round by round
              without exposing identity metadata.
            </p>
          </div>

          <div className={styles.premiseGrid}>
            {premiseColumns.map((column) => (
              <article className={styles.premiseColumn} key={column.title}>
                <h3>{column.title}</h3>
                <p>{column.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.detailSection}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionKicker}>Sample public room state</span>
            <h2>The room only needs a few facts to feel the pressure.</h2>
            <p className={styles.sectionCopy}>
              Pot: {sampleState.potTotal}. Max rounds: {sampleState.maxRounds}. Turn
              window: {Math.floor(splitModule.timers.actionMs / 1000)} seconds.
              Current round: {sampleState.currentRound}. The latest fairness pulse is{" "}
              <strong className={getBandClassName(sampleState.fairnessPulse)}>
                {getFairnessLabel(sampleState.fairnessPulse)}
              </strong>
              .
            </p>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.historyPanel}>
              <article className={styles.controlCard}>
                <span>Pending offer</span>
                <strong>
                  {pendingOffer
                    ? `${pendingOffer.amountToResponder}/${sampleState.potTotal} to the responder`
                    : "No active offer"}
                </strong>
                <p>
                  {pendingOffer
                    ? getFairnessCopy(pendingOffer.offerShare)
                    : "All rounds are settled. Open a new room to generate fresh pressure."}
                </p>
              </article>

              <div className={styles.historyStack}>
                {roundTimeline.map((entry) => (
                  <article className={styles.historyCard} key={`${entry.label}-${entry.decision}`}>
                    <div className={styles.historyHeader}>
                      <strong>{entry.label}</strong>
                      <span
                        className={`${styles.historyDecision} ${getBandClassName(entry.fairnessBand)}`}
                      >
                        {entry.decision}
                      </span>
                    </div>

                    <p>{entry.detail}</p>

                    <div className={styles.historyMetrics}>
                      <div className={styles.historyMetric}>
                        <span>Fairness band</span>
                        <strong className={getBandClassName(entry.fairnessBand)}>
                          {getFairnessLabel(entry.fairnessBand)}
                        </strong>
                      </div>
                      <div className={styles.historyMetric}>
                        <span>Status</span>
                        <strong style={{ textTransform: "capitalize" }}>{entry.decision}</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className={styles.infoPanel}>
              <article className={styles.railCard}>
                <span>What the room shows publicly</span>
                <ul>
                  {publicInfoRail.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className={styles.railCard}>
                <span>What stays server-side</span>
                <ul>
                  {hiddenInfoRail.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className={styles.proofCard}>
                <span>Current sample pulse</span>
                <strong className={getBandClassName(sampleState.fairnessPulse)}>
                  {getFairnessLabel(sampleState.fairnessPulse)}
                </strong>
                <p>
                  Average offer share sits at {Math.round(sampleState.averageOfferShare * 100)}%
                  while the agreement rate is {Math.round(sampleState.agreementRate * 100)}%. The
                  room can interpret that behavior without learning anything about seat backing.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.finalSection}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionKicker}>Flagship CTA</span>
            <h2>Use Split when you want a fast, legible benchmark for fairness and punishment.</h2>
            <p className={styles.sectionCopy}>
              Seats: {splitBrief.playerCountLabel}. Round cap: {sampleState.maxRounds}. Live room
              routing comes from the same lobby used by the broader ARENA demo, so the page can
              brief the game and then hand off directly to the room surface.
            </p>
          </div>

          <div className={styles.finalBody}>
            <div className={styles.proofLine}>
              <span>Rooms source</span>
              <strong>{roomsSnapshot.source}</strong>
              <span>Live room</span>
              <strong>{liveSplitRoom ? liveSplitRoom.roomId.slice(0, 12) : "not created yet"}</strong>
            </div>

            <div className={styles.ctaRow}>
              <Link className="button primary" href={splitStatus.ctaHref}>
                {splitStatus.ctaLabel}
              </Link>
              <Link className="button" href="/results">
                Open result shells
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

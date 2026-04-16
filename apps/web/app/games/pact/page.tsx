import Link from "next/link";

import { pactBrief, pactModule } from "@arena/game-pact";

import { getRoomsSnapshot } from "../../../lib/service-data";
import { GameSuiteMasthead } from "../GameSuiteMasthead";

import {
  contentPlan,
  describeStrategy,
  findLivePactRoom,
  finishedSample,
  formatStrategyLabel,
  getPactStatus,
  hiddenInfoRail,
  interactionThesis,
  liveSample,
  operatorPath,
  pactPageIntro,
  publicInfoRail,
  scenarioCards,
  strategySpotlight,
  trustSignals,
  visualThesis,
} from "./data";
import PactSimulator from "./PactSimulator";
import styles from "./pact.module.css";

export const dynamic = "force-dynamic";

export default async function PactPage() {
  const roomsSnapshot = await getRoomsSnapshot();
  const livePactRoom = findLivePactRoom(roomsSnapshot.data);
  const pactStatus = getPactStatus(livePactRoom);

  return (
    <main className={`app-shell ${styles.page}`}>
      <div className={`shell ${styles.stack}`}>
        <GameSuiteMasthead
          currentGame="pact"
          statusLabel={pactStatus.label}
          statusDetail={pactStatus.detail}
          primaryHref={pactStatus.ctaHref}
          primaryLabel={pactStatus.ctaLabel}
        />

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div>
              <p className={styles.eyebrow}>Game Slice / Hidden-seat trust duel</p>
              <h1 className={styles.headline}>Trust becomes visible only after both masks commit.</h1>
            </div>

            <p className={styles.lede}>{pactPageIntro}</p>

            <div className={styles.ctaRow}>
              <Link className="button primary" href={pactStatus.ctaHref}>
                {pactStatus.ctaLabel}
              </Link>
              <Link className="button" href="/lobby">
                Open lobby
              </Link>
            </div>

            <div className={styles.metaGrid}>
              <div className={styles.metaCard}>
                <span>Visual thesis</span>
                <strong>{visualThesis}</strong>
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
              <strong>{pactStatus.label}</strong>
              <p className={styles.statusCallout}>{pactStatus.detail}</p>
            </div>

            <div className={styles.scoreGrid}>
              {liveSample.seats.map((seat) => (
                <article className={styles.seatCard} key={seat.seatId}>
                  <div className={styles.seatMask}>{seat.displayName.replace("Seat ", "S")}</div>
                  <strong>{seat.displayName}</strong>
                  <div className={styles.seatMeta}>Identity hidden in-room</div>
                  <div className={styles.seatScore}>{seat.score} pts</div>
                </article>
              ))}
            </div>
          </aside>
        </section>

        <section className={styles.signalGrid}>
          {trustSignals.map((signal) => (
            <article className={styles.signalCard} key={signal.label}>
              <span>{signal.label}</span>
              <strong>{signal.value}</strong>
              <p>{signal.detail}</p>
            </article>
          ))}
        </section>

        <PactSimulator />

        <section className={styles.storySection}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionKicker}>Why Pact works</span>
            <h2>Two seats are enough when every decision leaves residue.</h2>
            <p className={styles.sectionCopy}>
              {pactBrief.summary} The page below uses real reducer-driven sample states, not mock
              copy, so every panel matches the same public state shape the room service projects in
              multiplayer.
            </p>
          </div>

          <div className={styles.scenarioGrid}>
            {scenarioCards.map((card) => (
              <article className={styles.storyCard} key={card.title}>
                <div className={styles.storyHeader}>
                  <span>{card.eyebrow}</span>
                  <strong>{card.title}</strong>
                  <p>{card.description}</p>
                </div>

                <div className={styles.badge}>
                  Round {card.state.currentRound} of {card.state.totalRounds}
                </div>

                <div className={styles.roundStrip}>
                  {card.state.history.slice(-5).map((round) => (
                    <div className={styles.roundPill} key={`${card.title}-${round.round}`}>
                      <strong>R{round.round}</strong>
                      <span>{round.outcomeCode}</span>
                    </div>
                  ))}
                </div>

                <p>
                  {card.state.status} Locked choices: {card.state.commitmentCount}/2.
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.detailSection}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionKicker}>Room protocol</span>
            <h2>The room publishes trust pressure, not seat identity.</h2>
            <p className={styles.sectionCopy}>
              Pact is attractive as benchmark infrastructure because the public protocol is simple,
              stable, and hard to leak. The room only needs to expose shared state, while the
              experiment ledger captures the interesting private detail off-screen.
            </p>
          </div>

          <div className={styles.detailGrid}>
            <article className={styles.timeline}>
              <div className={styles.timelineHeader}>
                <span>Operator path</span>
                <strong>From lobby to round resolution</strong>
              </div>
              <ol>
                {operatorPath.map((item) => (
                  <li key={item.step}>
                    <strong>{item.step}</strong>
                    <div className={styles.timelineNote}>{item.detail}</div>
                  </li>
                ))}
              </ol>
            </article>

            <article className={styles.railCard}>
              <span>Public room rail</span>
              <strong>Safe to stream and replay</strong>
              <ul>
                {publicInfoRail.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className={styles.railCard}>
              <span>Private experiment rail</span>
              <strong>Server-side only</strong>
              <ul>
                {hiddenInfoRail.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className={styles.strategySection}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionKicker}>Behavioral output</span>
            <h2>The finished match turns into strategy fingerprints, not just winners.</h2>
            <p className={styles.sectionCopy}>
              Finalization already emits cooperation, retaliation, forgiveness, endgame betrayal,
              and strategy labels. That makes Pact valuable even when both seats finish close on
              score.
            </p>
          </div>

          <div className={styles.spotlightGrid}>
            {strategySpotlight.map((item) => (
              <article className={styles.spotlightCard} key={item.title}>
                <span>{item.title}</span>
                <strong>{formatStrategyLabel(item.summary?.label)}</strong>
                <p>{item.description}</p>
                <p>{describeStrategy(item.summary)}</p>

                <div className={styles.metricRail}>
                  <div className={styles.metric}>
                    <span>Cooperation</span>
                    <span>
                      {item.summary ? `${Math.round(item.summary.cooperationRate * 100)}%` : "n/a"}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span>Forgiveness</span>
                    <span>
                      {item.summary?.forgivenessRate === null || item.summary?.forgivenessRate === undefined
                        ? "n/a"
                        : `${Math.round(item.summary.forgivenessRate * 100)}%`}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span>Endgame betrayal</span>
                    <span>
                      {item.summary
                        ? `${Math.round(item.summary.endgameBetrayalRate * 100)}%`
                        : "n/a"}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.finalSection}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionKicker}>Final CTA</span>
            <h2>Run the cleanest trust duel in the stack.</h2>
            <p className={styles.sectionCopy}>
              Seats: {pactBrief.playerCountLabel}. Action window:{" "}
              {Math.floor(pactModule.timers.actionMs / 1000)} seconds. Final sample winner:{" "}
              {finishedSample.seats.reduce((best, seat) => (seat.score > best.score ? seat : best)).displayName}
              . If there is a live room, enter it. Otherwise the lobby can create one in a single step.
            </p>
          </div>

          <div className={styles.proofLine}>
            <span>Rooms source</span>
            <strong>{roomsSnapshot.source}</strong>
            <span>Live room</span>
            <strong>{livePactRoom ? livePactRoom.roomId.slice(0, 12) : "not created yet"}</strong>
            <span>Status rail</span>
            <strong>{pactStatus.label}</strong>
          </div>

          <div className={styles.ctaRow}>
            <Link className="button primary" href={pactStatus.ctaHref}>
              {pactStatus.ctaLabel}
            </Link>
            <Link className="button" href="/results">
              Open result shells
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

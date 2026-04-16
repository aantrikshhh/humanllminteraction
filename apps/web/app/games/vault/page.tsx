import Link from "next/link";
import type { CSSProperties } from "react";

import { vaultBrief, vaultModule } from "@arena/game-vault";

import { getRoomsSnapshot } from "../../../lib/service-data";
import { GameSuiteMasthead } from "../GameSuiteMasthead";

import {
  buildVaultDemoState,
  contentPlan,
  findLiveVaultRoom,
  getVaultStatus,
  hiddenInfoRail,
  interactionThesis,
  premiseColumns,
  publicInfoRail,
  vaultSignals,
  visualThesis,
} from "./data";
import styles from "./vault.module.css";

export const dynamic = "force-dynamic";

export default async function VaultGamePage() {
  const roomsSnapshot = await getRoomsSnapshot();
  const liveVaultRoom = findLiveVaultRoom(roomsSnapshot.data);
  const vaultStatus = getVaultStatus(liveVaultRoom);
  const demoState = buildVaultDemoState();

  return (
    <main className={`app-shell ${styles.page}`}>
      <div className={`shell ${styles.stack}`}>
        <GameSuiteMasthead
          currentGame="vault"
          statusLabel={vaultStatus.label}
          statusDetail={vaultStatus.detail}
          primaryHref={vaultStatus.ctaHref}
          primaryLabel={vaultStatus.ctaLabel}
        />

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div>
              <p className={styles.eyebrow}>Vault / Public-goods accusation game</p>
              <h1 className={styles.headline}>The pool grows before the blame lands.</h1>
            </div>

            <p className={styles.lede}>
              {vaultBrief.summary} Each seat decides privately how much to keep, the room sees only
              the pooled return, and then everyone has to name the weakest contributor without any
              human-or-LLM badge to lean on. That makes Vault one of the cleanest Turing Games for
              measuring generosity, suspicion, and consensus pressure at the same time.
            </p>

            <div className={styles.ctaRow}>
              <Link className="button primary" href={vaultStatus.ctaHref}>
                {vaultStatus.ctaLabel}
              </Link>
              <Link className="button" href="/lobby">
                Open lobby
              </Link>
            </div>

            <div className={styles.heroMeta}>
              <div className={styles.metaCard}>
                <span>Visual thesis</span>
                <strong>{visualThesis}</strong>
              </div>
              <div className={styles.metaCard}>
                <span>Public rule</span>
                <strong>Pool totals are public. Live contribution amounts and seat type are not.</strong>
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
              <span className={styles.panelLabel}>Live room status</span>
              <strong>{vaultStatus.label}</strong>
              <p className={styles.statusCallout}>{vaultStatus.detail}</p>
            </div>

            <div className={styles.chamberCard}>
              <div className={styles.chamberHero}>
                <div>
                  <div className={styles.chamberLabel}>Sample chamber</div>
                  <div className={styles.chamberValue}>
                    Round {demoState.publicState.roundNumber} / {demoState.publicState.totalRounds}
                  </div>
                </div>
                <div>
                  <div className={styles.chamberLabel}>Phase</div>
                  <div className={styles.chamberValue}>
                    {demoState.publicState.phase.replace("_", " ")}
                  </div>
                </div>
              </div>

              <div className={styles.meter}>
                <div className={styles.meterRow}>
                  <span>Contribution status</span>
                  <span>
                    {demoState.publicState.contributionStatus.submitted} /{" "}
                    {demoState.publicState.contributionStatus.total} locked
                  </span>
                </div>
                <div className={styles.meterTrack}>
                  <div className={styles.meterFill} />
                </div>
                <div className={styles.meterValue}>
                  {demoState.publicState.vaultTotal} credits in vault
                </div>
              </div>

              <div className={styles.seatRail}>
                {demoState.seatRows.map((seat) => (
                  <article
                    className={styles.seatRow}
                    key={seat.seatId}
                    style={{ "--seat-accent": seat.accent } as CSSProperties}
                  >
                    <div className={styles.seatMask}>{seat.displayName.replace("Mask ", "M")}</div>
                    <div>
                      <div className={styles.seatHeader}>
                        <strong>{seat.displayName}</strong>
                        <span className={styles.seatBadge}>{seat.state}</span>
                      </div>
                      <div className={styles.seatState}>
                        {seat.correctDetections} correct reads / {seat.timesFlagged} flags /{" "}
                        {seat.roundsPlayed} rounds logged
                      </div>
                    </div>
                    <div className={styles.seatScore}>
                      <strong>{seat.totalScore} pts</strong>
                      <span>identity remains blinded</span>
                    </div>
                  </article>
                ))}
              </div>

              <div className={styles.chamberRail}>
                {demoState.chamberRail.map((entry) => (
                  <div className={styles.chamberEntry} key={entry.label}>
                    <span className={styles.panelLabel}>{entry.label}</span>
                    <strong>{entry.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className={styles.signalGrid}>
          {vaultSignals.map((signal) => (
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
            <h2>Vault makes hidden-seat cooperation legible without flattening the tension.</h2>
            <p className={styles.sectionCopy}>
              The room only needs a few public facts to understand the pressure: how much cash each
              seat receives per round, how large the pool became, and who the table believes held
              back. That keeps the game watchable while preserving the private signal that actually
              matters for benchmarking.
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
            <span className={styles.sectionKicker}>Round logic</span>
            <h2>Two windows per round: private contribution, then public accusation.</h2>
            <p className={styles.sectionCopy}>
              Vault runs on an eight-round cycle with {vaultBrief.playerCountLabel} and a{" "}
              {Math.floor(vaultModule.timers.actionMs / 1000)} second action clock. The accusation
              window matters because it converts private generosity into public suspicion without
              ever exposing who is human or model-backed.
            </p>
          </div>

          <div className={styles.detailGrid}>
            <article className={styles.controlCard}>
              <span>Round structure</span>
              <strong>What every seat is actually deciding</strong>
              <ol>
                <li>
                  <strong>Lock a contribution</strong>: choose a private amount from 0 to 500.
                </li>
                <li>
                  <strong>Watch the pool reveal</strong>: the room learns the total, multiplier,
                  and equal return per seat.
                </li>
                <li>
                  <strong>Name the weak link</strong>: accuse one seat without any species label.
                </li>
                <li>
                  <strong>Read the resolution</strong>: bonuses, penalties, and vote consensus hit
                  the public board immediately.
                </li>
              </ol>
            </article>

            <article className={styles.railCard}>
              <span>Publicly visible</span>
              <ul>
                {publicInfoRail.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className={styles.railCard}>
              <span>Still hidden</span>
              <ul>
                {hiddenInfoRail.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        {demoState.latestRoundCopy ? (
          <section className={styles.supportSection}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionKicker}>Latest resolution</span>
              <h2>Round {demoState.latestRoundCopy.roundNumber} closed with a public consensus trail.</h2>
            </div>

            <div className={styles.supportPanel}>
              <p className={styles.latestRoundCopy}>
                Lowest contribution: {demoState.latestRoundCopy.lowestSeatIds.join(", ")}. Correct
                accusers: {demoState.latestRoundCopy.correctAccusers.join(", ")}. Penalized seats:{" "}
                {demoState.latestRoundCopy.penalized.join(", ")}.
              </p>
            </div>
          </section>
        ) : null}

        <section className={styles.finalSection}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionKicker}>Flagship CTA</span>
            <h2>Enter a live treasury room when one exists. Otherwise brief from here and queue from the lobby.</h2>
            <p className={styles.sectionCopy}>
              Rooms source: {roomsSnapshot.source}. Current live room:{" "}
              {liveVaultRoom ? liveVaultRoom.roomId.slice(0, 12) : "not detected yet"}. The page
              already mirrors the real rules, so once runtime wiring reaches Vault the briefing and
              live routes will line up cleanly.
            </p>
          </div>

          <div className={styles.finalBody}>
            <div className={styles.proofLine}>
              <span>Game priority</span>
              <strong>{vaultBrief.priority.toUpperCase()}</strong>
              <span>Visual direction</span>
              <strong>{vaultBrief.visualDirection}</strong>
            </div>

            <div className={styles.ctaRow}>
              <Link className="button primary" href={vaultStatus.ctaHref}>
                {vaultStatus.ctaLabel}
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

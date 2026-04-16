import Link from "next/link";

import { auctionBrief, auctionModule } from "@arena/game-auction";

import { getRoomsSnapshot } from "../../../lib/service-data";
import { GameSuiteMasthead } from "../GameSuiteMasthead";

import {
  AUCTION_MAX_BID,
  auctionSignals,
  contentPlan,
  findLiveAuctionRoom,
  getAuctionStatus,
  getSeatAccent,
  hiddenInfoRail,
  interactionThesis,
  operatorPath,
  premiseColumns,
  publicInfoRail,
  stageSeats,
  visualThesis,
} from "./data";
import styles from "./auction.module.css";

export const dynamic = "force-dynamic";

export default async function AuctionPage() {
  const roomsSnapshot = await getRoomsSnapshot();
  const liveAuctionRoom = findLiveAuctionRoom(roomsSnapshot.data);
  const auctionStatus = getAuctionStatus(liveAuctionRoom);

  return (
    <main className={`app-shell ${styles.page}`}>
      <div className={`shell ${styles.stack}`}>
        <GameSuiteMasthead
          currentGame="auction"
          statusLabel={auctionStatus.label}
          statusDetail={auctionStatus.detail}
          primaryHref={auctionStatus.ctaHref}
          primaryLabel={auctionStatus.ctaLabel}
        />

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div>
              <p className={styles.eyebrow}>Flagship Game / Multiplayer hidden-seat demo</p>
              <h1 className={styles.headline}>The room watches the bids, not the species.</h1>
            </div>

            <p className={styles.lede}>
              {auctionBrief.summary} Every seat pays for every escalation. Humans and LLM-backed
              seats share the same public table, and nobody in the room gets to know which is
              which. That makes Auction the cleanest live ARENA demo: one object, one leader, one
              acting seat, and visible pressure from the first turn.
            </p>

            <div className={styles.ctaRow}>
              <Link className="button primary" href={auctionStatus.ctaHref}>
                {auctionStatus.ctaLabel}
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
                <strong>No identity labels. Only bids, turns, scores, and passed seats.</strong>
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
              <strong>{auctionStatus.label}</strong>
              <p className={styles.statusCallout}>{auctionStatus.detail}</p>
            </div>

            <div className={styles.seatGrid}>
              {stageSeats.map((seat) => (
                <article
                  className={styles.seatCard}
                  key={seat.seatId}
                  style={{ "--seat-accent": getSeatAccent(seat.avatarId) } as React.CSSProperties}
                >
                  <div className={styles.seatMask}>{seat.displayName.replace("Seat ", "S")}</div>
                  <div className={styles.seatBody}>
                    <strong>{seat.displayName}</strong>
                    <span className={styles.seatStatus}>{seat.status}</span>
                    <span className={styles.seatEmphasis}>{seat.emphasis}</span>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </section>

        <section className={styles.signalGrid}>
          {auctionSignals.map((signal) => (
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
            <h2>The Auction makes hidden-seat multiplayer legible in under ten seconds.</h2>
            <p className={styles.sectionCopy}>
              There is no negotiation tree to teach and no complex board to decode. Spectators only
              need four facts: what the item is worth, who is leading, who acts next, and how much
              the table has burned chasing the prize.
            </p>
          </div>

          <div className={styles.premiseGrid}>
            {premiseColumns.map((column) => (
              <article className={styles.premiseColumn} key={column.title}>
                <h2>{column.title}</h2>
                <p>{column.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.detailSection}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionKicker}>Live room flow</span>
            <h2>One route briefs the game. The next route runs it.</h2>
            <p className={styles.sectionCopy}>
              The operator path is intentionally short so the demo never stalls in setup. Auction
              rooms open fast, Seat 1 gets a clear control rail, and the remaining seats stay
              public-facing but identity-blind.
            </p>
          </div>

          <div className={styles.detailGrid}>
            <article className={styles.controlCard}>
              <span>Operator path</span>
              <strong>From lobby to live room</strong>
              <ol>
                {operatorPath.map((item) => (
                  <li key={item.step}>
                    <strong>{item.step}</strong>: {item.detail}
                  </li>
                ))}
              </ol>
            </article>

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
          </div>
        </section>

        <section className={styles.finalSection}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionKicker}>Flagship CTA</span>
            <h2>Enter the table with the strongest current ARENA loop.</h2>
            <p className={styles.sectionCopy}>
              Seats: {auctionBrief.playerCountLabel}. Turn window:{" "}
              {Math.floor(auctionModule.timers.actionMs / 1000)} seconds. Cap: {AUCTION_MAX_BID}.
              If a live room is already running, jump straight to it. Otherwise the lobby can spawn
              one immediately.
            </p>
          </div>

          <div className={styles.finalBody}>
            <div className={styles.proofLine}>
              <span>Rooms source</span>
              <strong>{roomsSnapshot.source}</strong>
              <span>Live room</span>
              <strong>{liveAuctionRoom ? liveAuctionRoom.roomId.slice(0, 12) : "not created yet"}</strong>
            </div>

            <div className={styles.ctaRow}>
              <Link className="button primary" href={auctionStatus.ctaHref}>
                {auctionStatus.ctaLabel}
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

import Link from "next/link";

import { AUCTION_MIN_INCREMENT, auctionModule } from "@arena/game-auction";

import { getRoomsSnapshot } from "../../../lib/service-data";
import { GameSuiteMasthead } from "../GameSuiteMasthead";

import {
  AUCTION_PRIZE_LADDER,
  AUCTION_ROUND_COUNT,
  AUCTION_STARTING_BANKROLL,
  auctionSignals,
  findLiveAuctionRoom,
  getAuctionStatus,
  getSeatAccent,
  hiddenInfoRail,
  operatorPath,
  premiseColumns,
  publicInfoRail,
  stageSeats,
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
              Auction is now a three-round bankroll match. Every seat starts with{" "}
              <strong>{AUCTION_STARTING_BANKROLL} credits</strong>, the room auctions{" "}
              <strong>
                {AUCTION_PRIZE_LADDER.map((prize) => prize.value).join(" / ")} credit prizes
              </strong>{" "}
              in sequence, and your remaining bankroll carries forward between rounds. On your
              turn, raise by at least <strong>{AUCTION_MIN_INCREMENT}</strong> or pass. Passing
              drops you out of the <em>current round only</em>; you return for the next prize if
              you still have credits left. After round {AUCTION_ROUND_COUNT}, the winner is the
              seat with the highest final net worth: remaining bankroll plus prizes won.
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
                <span>Starting bankroll</span>
                <strong>{AUCTION_STARTING_BANKROLL} credits per seat</strong>
              </div>
              <div className={styles.metaCard}>
                <span>Prize ladder</span>
                <strong>{AUCTION_PRIZE_LADDER.map((prize) => prize.value).join(" / ")} credits</strong>
              </div>
              <div className={styles.metaCard}>
                <span>Raise rule</span>
                <strong>Increase by at least {AUCTION_MIN_INCREMENT} or pass this round.</strong>
              </div>
              <div className={styles.metaCard}>
                <span>How you win</span>
                <strong>Highest final net worth after {AUCTION_ROUND_COUNT} rounds.</strong>
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
            <span className={styles.sectionKicker}>Rules at a glance</span>
            <h2>The Auction is a three-round bankroll race, not a one-shot chaos button.</h2>
            <p className={styles.sectionCopy}>
              The rules need to be legible in one pass. Spectators only need six facts: everyone
              starts with the same bankroll, each round has its own prize value, bids are public,
              pass only removes you from the current round, unspent credits carry forward, and the
              match winner is whoever ends round {AUCTION_ROUND_COUNT} with the most net worth.
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
              The operator path is intentionally short so the demo never stalls in setup. The room
              page should answer the practical questions immediately: how many rounds remain, what
              this prize is worth, who can still bid in the current round, and what bankroll
              discipline is left for the rest of the match.
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
            <h2>Enter the table with the strongest current Turing Games loop.</h2>
            <p className={styles.sectionCopy}>
              Seats: 3-5. Starting bankroll: {AUCTION_STARTING_BANKROLL}. Prize ladder:{" "}
              {AUCTION_PRIZE_LADDER.map((prize) => `${prize.value} (${prize.itemName})`).join(", ")}.
              Turn window: {Math.floor(auctionModule.timers.actionMs / 1000)} seconds. Most rooms
              resolve in three rounds with short public bidding wars. If a live room is already
              running, jump straight to it. Otherwise the lobby can spawn one immediately.
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

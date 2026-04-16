import Link from "next/link";

import LobbyRoomConsole from "./LobbyRoomConsole";
import styles from "./lobby.module.css";
import {
  formatUsd,
  getLeaderboardSnapshot,
  getPaymentsSnapshot,
  getRoomsSnapshot,
} from "../../../lib/service-data";

export const dynamic = "force-dynamic";

export default async function LobbyPage() {
  const [roomsSnapshot, leaderboardSnapshot, paymentsSnapshot] = await Promise.all([
    getRoomsSnapshot(),
    getLeaderboardSnapshot("global", 5),
    getPaymentsSnapshot("demo-player"),
  ]);
  const liveRoom =
    roomsSnapshot.data.find((room) => room.phase !== "results") ?? roomsSnapshot.data[0] ?? null;
  const settledRoom = roomsSnapshot.data.find((room) => room.phase === "results") ?? null;
  const liveCount = roomsSnapshot.data.filter((room) => room.phase !== "results").length;
  const settledCount = roomsSnapshot.data.filter((room) => room.phase === "results").length;
  const topEntry = leaderboardSnapshot.data.entries[0] ?? null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <div className={styles.brandBlock}>
            <div className={styles.brandMark}>A</div>
            <div className={styles.brandMeta}>
              <span className={styles.brandKicker}>Blinded Multiplayer Arena</span>
              <div className={styles.brandName}>ARENA</div>
            </div>
          </div>
          <nav className={styles.nav}>
            <Link href="/">Overview</Link>
            <Link href="/rooms">Rooms</Link>
            <Link href="/results">Results</Link>
            <Link href="/leaderboard">Leaderboard</Link>
            <Link href="/payments">Payments</Link>
          </nav>
        </div>

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>Live Lobby</div>
            <h1 className={styles.heroTitle}>Play the room. Guess the minds.</h1>
            <p className={styles.heroText}>
              This is the fastest ARENA demo path: launch a blinded multiplayer match, claim one
              mask, and let the rest of the table stay ambiguous while the room flows into results,
              ladder movement, and payout state.
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href="#launch">
                Start the demo
              </a>
              <Link className={styles.secondaryAction} href={liveRoom ? `/rooms/${liveRoom.roomId}` : "/rooms"}>
                {liveRoom ? "Jump into the hottest room" : "Browse room board"}
              </Link>
            </div>
          </div>

          <div className={styles.heroMeta}>
            <div className={styles.statusGrid}>
              <div className={styles.statusCard}>
                <span>Live rooms</span>
                <strong>{liveCount}</strong>
              </div>
              <div className={styles.statusCard}>
                <span>Settled rooms</span>
                <strong>{settledCount}</strong>
              </div>
              <div className={styles.statusCard}>
                <span>Top ladder</span>
                <strong>{topEntry ? `${topEntry.displayName} · ${topEntry.rating}` : "Warming up"}</strong>
              </div>
              <div className={styles.statusCard}>
                <span>Wallet available</span>
                <strong>{formatUsd(paymentsSnapshot.data.wallet.availableUsd)}</strong>
              </div>
            </div>

            <div className={styles.signalCard}>
              <h2>Two-minute flow</h2>
              <p>Keep the story tight. One room, one human mask, one hidden table.</p>
              <div className={styles.signalList}>
                <div className={styles.signalRow}>
                  <div className={styles.signalIndex}>1</div>
                  <div>
                    <span className={styles.signalLabel}>Launch Auction Live</span>
                    <span className={styles.signalValue}>Best on-camera multiplayer slice.</span>
                  </div>
                </div>
                <div className={styles.signalRow}>
                  <div className={styles.signalIndex}>2</div>
                  <div>
                    <span className={styles.signalLabel}>Claim a mask and ready up</span>
                    <span className={styles.signalValue}>The room shows seats, not identities.</span>
                  </div>
                </div>
                <div className={styles.signalRow}>
                  <div className={styles.signalIndex}>3</div>
                  <div>
                    <span className={styles.signalLabel}>Cut to results, leaderboard, payments</span>
                    <span className={styles.signalValue}>Show the loop, not the plumbing.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.body}>
          <div className={styles.mainColumn}>
            <section className={styles.sectionCard}>
              <div className={styles.sectionHeading}>
                <h2 className={styles.sectionTitle}>The demo route</h2>
                <p>
                  Keep the opening simple: start one room, get one decision on screen fast, then
                  branch into results and proof.
                </p>
              </div>
              <div className={styles.stepGrid}>
                <article className={styles.stepCard}>
                  <div className={styles.stepIndex}>01</div>
                  <strong>Launch a room</strong>
                  <p className={styles.note}>
                    `Auction Live` is the strongest multiplayer pitch. `Auction Solo` is the safest
                    backup if you only have one browser seat.
                  </p>
                </article>
                <article className={styles.stepCard}>
                  <div className={styles.stepIndex}>02</div>
                  <strong>Make one move</strong>
                  <p className={styles.note}>
                    Join, claim a visible mask, ready the room, and take a first action while the
                    other seats remain unreadable.
                  </p>
                </article>
                <article className={styles.stepCard}>
                  <div className={styles.stepIndex}>03</div>
                  <strong>Show impact</strong>
                  <p className={styles.note}>
                    Cut to the result view, then the leaderboard and payout stub so the product arc
                    closes cleanly.
                  </p>
                </article>
              </div>
            </section>

            <section className={styles.sectionCard} id="launch">
              <div className={styles.sectionHeading}>
                <h2>Launch and watch the board</h2>
                <p>
                  The lobby is split in two: a creation rail for new rooms and a live board for
                  matches already in motion.
                </p>
              </div>
              <LobbyRoomConsole initialRooms={roomsSnapshot.data} />
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.sectionCard}>
              <div className={styles.sectionHeading}>
                <h2>Live pulse</h2>
                <p>Only surface the proof points that help someone understand the room state fast.</p>
              </div>
              <div className={styles.stackList}>
                <div className={styles.infoItem}>
                  <strong>Rooms service</strong>
                  <span className={styles.note}>{roomsSnapshot.source}</span>
                </div>
                <div className={styles.infoItem}>
                  <strong>Leaderboard snapshot</strong>
                  <span className={styles.note}>{leaderboardSnapshot.source}</span>
                </div>
                <div className={styles.infoItem}>
                  <strong>Payments snapshot</strong>
                  <span className={styles.note}>{paymentsSnapshot.source}</span>
                </div>
                <div className={styles.infoItem}>
                  <strong>Current room focus</strong>
                  <span className={styles.note}>
                    {liveRoom
                      ? `${liveRoom.game} · ${liveRoom.roomId} · ${liveRoom.phase}`
                      : "No live room yet. Start one below."}
                  </span>
                </div>
              </div>
            </section>

            <section className={styles.sectionCard}>
              <div className={styles.sectionHeading}>
                <h2>Where to cut next</h2>
                <p>These are the only secondary surfaces worth showing in a tight MVP video.</p>
              </div>
              <div className={styles.stackList}>
                <div className={styles.infoItem}>
                  <strong>Results view</strong>
                  <span className={styles.note}>
                    {settledRoom
                      ? `Latest settled room: ${settledRoom.roomId}`
                      : "Use the first room that reaches results during the run."}
                  </span>
                  <Link
                    className={styles.subtleLink}
                    href={settledRoom ? `/results/${settledRoom.roomId}` : "/results"}
                  >
                    Open results
                  </Link>
                </div>
                <div className={styles.infoItem}>
                  <strong>Leaderboard</strong>
                  <span className={styles.note}>Show rating movement and match volume as proof of loop.</span>
                  <Link className={styles.subtleLink} href="/leaderboard">
                    Open leaderboard
                  </Link>
                </div>
                <div className={styles.infoItem}>
                  <strong>Payments</strong>
                  <span className={styles.note}>
                    Wallet <span className={styles.mono}>{paymentsSnapshot.data.wallet.walletAddress.slice(0, 12)}...</span>
                  </span>
                  <Link className={styles.subtleLink} href="/payments">
                    Open payments
                  </Link>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

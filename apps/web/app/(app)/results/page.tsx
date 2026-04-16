import Link from "next/link";
import type { GameKey } from "@arena/contracts";

import { getRoomsSnapshot, labelGame } from "../../../lib/service-data";

import styles from "./results.module.css";

export const dynamic = "force-dynamic";

export default async function ResultsIndexPage() {
  const roomsSnapshot = await getRoomsSnapshot();
  const completedRooms = roomsSnapshot.data
    .filter((room) => room.phase === "results")
    .map((room) => ({
      roomId: room.roomId,
      game: room.game as GameKey,
      phase: "results" as const,
    }));
  const fallbackPreviewRooms: Array<{ roomId: string; game: GameKey; phase: "results" }> = [
    {
      roomId: "demo-auction-results",
      game: "auction",
      phase: "results",
    },
  ];
  const previewRooms =
    completedRooms.length > 0 ? completedRooms : fallbackPreviewRooms;

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
            <Link href="/payments">Payments</Link>
          </nav>
        </div>

        <section className="hero-band">
          <div className="stack">
            <div className="eyebrow">Results</div>
            <h1 className="section-title">Completed rooms, no reveal required.</h1>
            <p className="muted section-copy">
              Post-match surfaces stay public, seat-based, and read-only. Winners, scores, replay
              availability, payout status, and ladder sync can all be shown without disclosing
              which opponents were human or model-backed.
            </p>
          </div>
          <div className="service-stack">
            <div className="service-pill">
              <span>Mode</span>
              <strong>Read only</strong>
            </div>
            <div className="service-pill">
              <span>Identity</span>
              <strong>Seat-blinded</strong>
            </div>
            <div className="service-pill">
              <span>Rooms</span>
              <strong>{roomsSnapshot.source}</strong>
            </div>
          </div>
        </section>

        <section className="workspace">
          <div className="stack">
              <div className="section-row">
                <div>
                  <h2>Completed rooms</h2>
                  <p className="muted">
                    Browse result pages from the live runtime when available, otherwise use the seeded
                  preview room.
                </p>
              </div>
              <div className="inline-actions">
                <Link className="button" href="/rooms">
                  Live rooms
                </Link>
                <Link className="button" href="/lobby">
                  Back to lobby
                </Link>
              </div>
              </div>

            <div className="card-grid card-grid-single">
              {previewRooms.map((room) => (
                <article className={`panel tile-card ${styles.winnerPanel}`} key={room.roomId}>
                  <div className="tile-topline">
                    <span className="pill accent">
                      {room.phase === "results" ? "Completed" : "Preview"}
                    </span>
                    <span className="pill subtle">{labelGame(room.game)}</span>
                  </div>
                  <h3>{room.roomId}</h3>
                  <p className="muted">
                    {room.phase === "results"
                      ? "Room finalized and ready for replay, payout, and leaderboard follow-through."
                      : "Seeded completed room with replay and placeholder downstream state."}
                  </p>
                  <div className="inline-actions">
                    <Link className="button primary" href={`/results/${room.roomId}`}>
                      Open result page
                    </Link>
                    <Link className="button" href={`/rooms/${room.roomId}`}>
                      Open live room shell
                    </Link>
                    <Link className="button" href="/payments">
                      Payments
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <div className="panel">
              <div className="section-row">
                <h2>Continue through the app</h2>
                <span className="pill subtle">Read surfaces</span>
              </div>
              <div className="compact-list">
                <div className="compact-row">
                  <div>
                    <strong>Watch rooms before they settle</strong>
                    <span>Use the room catalog to jump into the live stage before the result locks.</span>
                  </div>
                  <Link href="/rooms">Open rooms</Link>
                </div>
                <div className="compact-row">
                  <div>
                    <strong>Check ranking impact</strong>
                    <span>Leaderboard stays player-based while result pages remain seat-blinded.</span>
                  </div>
                  <Link href="/leaderboard">Open board</Link>
                </div>
                <div className="compact-row">
                  <div>
                    <strong>Verify payout state</strong>
                    <span>Escrow and payout status live on the payment surface after the room closes.</span>
                  </div>
                  <Link href="/payments">Open payments</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

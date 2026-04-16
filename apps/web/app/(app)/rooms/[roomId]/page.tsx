import Link from "next/link";

import type { PublicRoomState } from "@arena/contracts";

import { getRoomSnapshot, labelGame } from "../../../../lib/service-data";

import RoomPageClient from "./RoomPageClient";
import styles from "./room-page.module.css";

export const dynamic = "force-dynamic";

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomId } = await params;
  const roomSnapshot = await getRoomSnapshot(roomId);

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

        <section className={`hero-band ${styles.heroBand}`}>
          <div className="stack">
            <div className="eyebrow">Identity-Blind Multiplayer</div>
            <h1 className="section-title">
              {roomSnapshot.data ? `${labelGame(roomSnapshot.data.game)} live room` : "Room offline"}
            </h1>
            <p className="muted section-copy">
              Claim a mask, ready the seat, and play the room from here. The live stage stays
              readable, while diagnostics sit behind the inspector.
            </p>
          </div>
          <div className="service-stack">
            <div className="service-pill">
              <span>Room ID</span>
              <strong>{roomId.slice(0, 16)}</strong>
            </div>
            {roomSnapshot.data ? (
              <div className="service-pill">
                <span>Status</span>
                <strong>{roomSnapshot.data.phase}</strong>
              </div>
            ) : null}
            <div className="service-pill">
              <span>Source</span>
              <strong>{roomSnapshot.source}</strong>
            </div>
          </div>
        </section>

        {roomSnapshot.data ? (
          <section className="workspace">
            <div className="stack">
              <div className="section-row">
                <div>
                  <h2>Room loop</h2>
                  <p className="muted">
                    Stay inside the live stage, then move directly into results, rankings, or the
                    payout stub once the match settles.
                  </p>
                </div>
                <div className="inline-actions">
                  <Link className="button" href="/rooms">
                    Room catalog
                  </Link>
                  <Link className="button" href={`/results/${roomId}`}>
                    Result view
                  </Link>
                  <Link className="button" href="/payments">
                    Payments
                  </Link>
                </div>
              </div>
              <RoomPageClient
                initialRoom={roomSnapshot.data as PublicRoomState}
                initialSource={roomSnapshot.source}
              />
            </div>
          </section>
        ) : (
          <section className="workspace">
            <div className="stack">
              <div className="section-row">
                <div>
                  <h2>Room not found</h2>
                  <p className="muted">
                    This room is not available from the current runtime or fallback snapshot.
                  </p>
                </div>
                <div className="inline-actions">
                  <Link className="button" href="/rooms">
                    Room catalog
                  </Link>
                  <Link className="button" href="/results">
                    Result index
                  </Link>
                  <Link className="button" href="/lobby">
                    Lobby
                  </Link>
                </div>
              </div>
              <div className={`panel ${styles.emptyState}`}>
                <strong>No room snapshot was returned for this id.</strong>
                <p className="muted">
                  Create a live room from the lobby, then reopen this route with the new room id.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

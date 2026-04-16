"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

import type { PublicRoomState, PublicSeatView } from "@arena/contracts";
import {
  AUCTION_MAX_BID,
  AUCTION_MIN_INCREMENT,
  type AuctionAction,
  type AuctionPublicState,
} from "@arena/game-auction";

import { labelGame } from "../../../../lib/service-data";

import styles from "./room-page.module.css";

interface RoomPageClientProps {
  initialRoom: PublicRoomState;
  initialSource: "live" | "fallback";
}

const operatorSeatId = "seat_1";

function isAuctionRoom(room: PublicRoomState): room is PublicRoomState<AuctionPublicState> {
  return room.game === "auction";
}

function formatRelativeTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "pending";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatSeatScore(seat: PublicSeatView): string {
  return typeof seat.score === "number" ? `${seat.score} pts` : "score hidden";
}

function describeSeatState(seat: PublicSeatView, roomPhase: PublicRoomState["phase"]): string {
  if (!seat.isConnected) {
    return "Disconnected";
  }

  if (!seat.isReady && roomPhase !== "results") {
    return "Awaiting ready";
  }

  if (roomPhase === "results") {
    return "Match settled";
  }

  return "Identity blinded";
}

function getSeatAccent(avatarId: string): string {
  if (avatarId.includes("amber")) return "#f3c26f";
  if (avatarId.includes("cyan")) return "#6ad7ff";
  if (avatarId.includes("rose")) return "#ff8bc2";
  if (avatarId.includes("verdant")) return "#79f0a8";
  return "#d3def8";
}

export default function RoomPageClient({ initialRoom, initialSource }: RoomPageClientProps) {
  const [room, setRoom] = useState(initialRoom);
  const [source, setSource] = useState(initialSource);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const auctionState = isAuctionRoom(room) ? room.publicState : null;
  const operatorSeat = room.seats.find((seat) => seat.seatId === operatorSeatId) ?? null;
  const canOperatorAct =
    room.phase !== "results" &&
    auctionState?.phase === "bidding" &&
    auctionState.currentTurnSeatId === operatorSeatId;

  const bidPresets = useMemo(() => {
    if (!auctionState) {
      return [];
    }

    const nextBid = auctionState.currentBid + AUCTION_MIN_INCREMENT;
    return [
      nextBid,
      Math.min(AUCTION_MAX_BID, nextBid + 2),
      Math.min(AUCTION_MAX_BID, Math.max(nextBid, Math.ceil(AUCTION_MAX_BID * 0.75))),
    ].filter((amount, index, values) => amount <= AUCTION_MAX_BID && values.indexOf(amount) === index);
  }, [auctionState]);

  useEffect(() => {
    let active = true;

    const refreshRoom = async (silent = false) => {
      try {
        const response = await fetch("/api/rooms", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`refresh failed with status ${response.status}`);
        }

        const rooms = (await response.json()) as PublicRoomState[];
        const nextRoom = rooms.find((candidate) => candidate.roomId === initialRoom.roomId) ?? null;

        if (!active) {
          return;
        }

        if (!nextRoom) {
          setMissing(true);
          if (!silent) {
            setError("Room is no longer available in the live runtime.");
          }
          return;
        }

        startTransition(() => {
          setRoom(nextRoom);
          setSource("live");
          setMissing(false);
          if (!silent) {
            setError(null);
          }
        });
      } catch (cause) {
        if (!active || silent) {
          return;
        }

        setError(cause instanceof Error ? cause.message : "could not refresh room");
      }
    };

    const intervalId = window.setInterval(() => {
      void refreshRoom(true);
    }, 2_500);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [initialRoom.roomId]);

  const sendAction = async (action: AuctionAction) => {
    try {
      const response = await fetch(`/api/rooms/${room.roomId}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          type: "room.action",
          seatId: operatorSeatId,
          payload: action,
        }),
      });

      if (!response.ok) {
        throw new Error(`action failed with status ${response.status}`);
      }

      const nextRoom = (await response.json()) as PublicRoomState;
      startTransition(() => {
        setRoom(nextRoom);
        setSource("live");
        setMissing(false);
        setError(null);
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "could not submit action");
    }
  };

  return (
    <div className={styles.pageStack}>
      <section className={styles.stageGrid}>
        <div className={`workspace ${styles.stageSurface}`}>
          <div className={styles.stageHeader}>
            <div className="stack">
              <div className={styles.badgeRow}>
                <span className="pill accent">{labelGame(room.game)}</span>
                <span className="pill subtle">{room.phase}</span>
                <span className="pill subtle">{source}</span>
              </div>
              <div>
                <h2 className={styles.roomTitle}>Room {room.roomId.slice(0, 8)}</h2>
                <p className="muted">
                  Match <code>{room.matchId.slice(0, 12)}</code> · last event{" "}
                  {formatRelativeTimestamp(room.lastEventAt)}
                </p>
              </div>
            </div>

            <div className="inline-actions">
              <Link className="button" href="/lobby">
                Lobby
              </Link>
              <button
                className="button"
                disabled={isPending}
                onClick={() => window.location.reload()}
                type="button"
              >
                Refresh shell
              </button>
            </div>
          </div>

          {error ? <div className="panel error-panel">{error}</div> : null}
          {missing ? (
            <div className={`panel ${styles.warningPanel}`}>
              <strong>Live runtime no longer reports this room.</strong>
              <p className="muted">
                The page is still showing the last known snapshot until a fresh room is created or
                the runtime returns this id again.
              </p>
            </div>
          ) : null}

          <div className={styles.poster}>
            <div className={styles.posterGlow} />

            <div className={styles.posterTop}>
              <div>
                <div className={styles.posterLabel}>Current stage</div>
                <div className={styles.posterValue}>
                  {auctionState?.phase === "settled" ? "Auction settled" : `Round ${room.round}`}
                </div>
              </div>
              <div className={styles.posterMeta}>
                <span>Seats blinded</span>
                <strong>{room.seats.length}</strong>
              </div>
            </div>

            {auctionState ? (
              <div className={styles.auctionBand}>
                <div className={styles.auctionMetric}>
                  <span>Current bid</span>
                  <strong>{auctionState.currentBid}</strong>
                </div>
                <div className={styles.auctionMetric}>
                  <span>Pot</span>
                  <strong>{auctionState.currentPot}</strong>
                </div>
                <div className={styles.auctionMetric}>
                  <span>Leader</span>
                  <strong>{auctionState.currentLeaderSeatId ?? "none"}</strong>
                </div>
                <div className={styles.auctionMetric}>
                  <span>Turns left</span>
                  <strong>{auctionState.turnsRemaining}</strong>
                </div>
              </div>
            ) : (
              <div className={styles.genericBand}>
                <strong>{labelGame(room.game)} room state</strong>
                <p className="muted">
                  This page can render any room, but only Auction exposes operator controls in the
                  current MVP.
                </p>
              </div>
            )}

            <div className={styles.seatStage}>
              {room.seats.map((seat) => {
                const isOperator = seat.seatId === operatorSeatId;
                const isCurrentTurn = auctionState?.currentTurnSeatId === seat.seatId;
                const isLeader = auctionState?.currentLeaderSeatId === seat.seatId;

                return (
                  <article
                    className={styles.seatCard}
                    key={seat.seatId}
                    style={
                      {
                        "--seat-accent": getSeatAccent(seat.avatarId),
                      } as React.CSSProperties
                    }
                  >
                    <div className={styles.seatFrame}>
                      <div className={styles.seatMask}>
                        <span>{seat.displayName.replace("Seat ", "S")}</span>
                      </div>
                      <div className={styles.seatGlyph} />
                    </div>

                    <div className={styles.seatCopy}>
                      <div className={styles.seatHeadline}>
                        <strong>{seat.displayName}</strong>
                        {isOperator ? (
                          <span className="pill accent">Operator</span>
                        ) : (
                          <span className="pill subtle">Blinded</span>
                        )}
                      </div>
                      <p>{describeSeatState(seat, room.phase)}</p>
                    </div>

                    <div className={styles.seatStats}>
                      <span>{formatSeatScore(seat)}</span>
                      {isCurrentTurn ? (
                        <strong className={styles.turnSignal}>Acting now</strong>
                      ) : isLeader ? (
                        <strong className={styles.leaderSignal}>Leading bid</strong>
                      ) : (
                        <strong>Observed</strong>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        <aside className={styles.sidebarStack}>
          <section className="panel">
            <div className="stack">
              <div className="section-row">
                <div>
                  <h2>Operator seat</h2>
                  <p className="muted">Seat 1 is the only controllable seat on this page.</p>
                </div>
                <span className={`pill ${operatorSeat?.isConnected ? "accent" : "subtle"}`}>
                  {operatorSeat?.isConnected ? "connected" : "offline"}
                </span>
              </div>

              <div className={styles.operatorSummary}>
                <div>
                  <span>Ready state</span>
                  <strong>{operatorSeat?.isReady ? "Ready" : "Pending"}</strong>
                </div>
                <div>
                  <span>Score</span>
                  <strong>{operatorSeat ? formatSeatScore(operatorSeat) : "n/a"}</strong>
                </div>
              </div>

              {auctionState ? (
                <div className={`panel panel-subtle ${styles.turnPanel}`}>
                  <strong>
                    {canOperatorAct
                      ? "Your move is live."
                      : auctionState.phase === "settled"
                        ? `Winner: ${auctionState.winnerSeatId ?? "pending"}`
                        : `Waiting on ${auctionState.currentTurnSeatId ?? "room"}`}
                  </strong>
                  <p className="muted">
                    The interface avoids identity tells. You know turn order and public scores, not
                    which seats are human or model-backed.
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="panel">
            <div className="stack">
              <div>
                <h2>Auction controls</h2>
                <p className="muted">
                  This action rail stays disabled unless the room is live and Seat 1 owns the turn.
                </p>
              </div>

              <div className={styles.actionGrid}>
                {bidPresets.map((amount) => (
                  <button
                    className="button primary"
                    disabled={!canOperatorAct}
                    key={amount}
                    onClick={() => void sendAction({ type: "auction.bid", amount })}
                    type="button"
                  >
                    Bid {amount}
                  </button>
                ))}

                <button
                  className="button"
                  disabled={!canOperatorAct}
                  onClick={() =>
                    void sendAction({
                      type: "auction.bid",
                      amount: AUCTION_MAX_BID,
                    })
                  }
                  type="button"
                >
                  Push to max
                </button>

                <button
                  className="button"
                  disabled={!canOperatorAct}
                  onClick={() => void sendAction({ type: "auction.pass" })}
                  type="button"
                >
                  Pass
                </button>
              </div>

              {!auctionState ? (
                <div className={`panel panel-subtle ${styles.genericStatePanel}`}>
                  <strong>{labelGame(room.game)} is view-only here.</strong>
                  <p className="muted">
                    The page will still keep polling and render the room state, but no non-Auction
                    operator controls have been added yet.
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="panel">
            <div className="stack">
              <h2>Room telemetry</h2>
              <div className={styles.telemetryList}>
                <div className={styles.telemetryRow}>
                  <span>Game</span>
                  <strong>{labelGame(room.game)}</strong>
                </div>
                <div className={styles.telemetryRow}>
                  <span>Phase</span>
                  <strong>{room.phase}</strong>
                </div>
                <div className={styles.telemetryRow}>
                  <span>Round</span>
                  <strong>{room.round}</strong>
                </div>
                <div className={styles.telemetryRow}>
                  <span>Seat count</span>
                  <strong>{room.seats.length}</strong>
                </div>
              </div>

              <div className={styles.publicStateBlock}>
                <div className={styles.publicStateLabel}>Public state</div>
                <pre>{JSON.stringify(room.publicState, null, 2)}</pre>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

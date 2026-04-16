"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import type { PublicRoomState } from "@arena/contracts";
import {
  AUCTION_MAX_BID,
  AUCTION_MIN_INCREMENT,
  type AuctionAction,
  type AuctionPublicState,
} from "@arena/game-auction";

import { labelGame } from "../../../lib/service-data";

interface LobbyRoomConsoleProps {
  initialRooms: PublicRoomState[];
}

const operatorSeatId = "seat_1";

const demoAuctionRoomPayload = {
  game: "auction",
  phase: "active",
  seats: [
    {
      displayName: "Seat 1",
      avatarId: "mask-amber",
      backingType: "human",
      playerId: "demo-player",
    },
    {
      displayName: "Seat 2",
      avatarId: "mask-cyan",
      backingType: "llm",
      llmModelId: "demo-auction-fake-1",
      promptVersionId: "auction-fake-v1",
    },
    {
      displayName: "Seat 3",
      avatarId: "mask-rose",
      backingType: "llm",
      llmModelId: "demo-auction-fake-2",
      promptVersionId: "auction-fake-v1",
    },
    {
      displayName: "Seat 4",
      avatarId: "mask-verdant",
      backingType: "llm",
      llmModelId: "demo-auction-fake-3",
      promptVersionId: "auction-fake-v1",
    },
  ],
} as const;

function isAuctionRoom(room: PublicRoomState): room is PublicRoomState<AuctionPublicState> {
  return room.game === "auction";
}

export default function LobbyRoomConsole({ initialRooms }: LobbyRoomConsoleProps) {
  const [rooms, setRooms] = useState(initialRooms);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refreshRooms = async (silent = false) => {
    try {
      const response = await fetch("/api/rooms", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`refresh failed with status ${response.status}`);
      }

      const nextRooms = (await response.json()) as PublicRoomState[];
      startTransition(() => {
        setRooms(nextRooms);
        if (!silent) {
          setError(null);
        }
      });
    } catch (cause) {
      if (!silent) {
        setError(cause instanceof Error ? cause.message : "could not refresh rooms");
      }
    }
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshRooms(true);
    }, 3_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const createDemoAuctionRoom = async () => {
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(demoAuctionRoomPayload),
      });

      if (!response.ok) {
        throw new Error(`room creation failed with status ${response.status}`);
      }

      const room = (await response.json()) as PublicRoomState;
      startTransition(() => {
        setRooms((current) => [room, ...current.filter((candidate) => candidate.roomId !== room.roomId)]);
        setError(null);
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "could not create demo room");
    }
  };

  const sendAuctionAction = async (roomId: string, action: AuctionAction) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/messages`, {
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

      const room = (await response.json()) as PublicRoomState;
      startTransition(() => {
        setRooms((current) =>
          current.map((candidate) => (candidate.roomId === room.roomId ? room : candidate)),
        );
        setError(null);
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "could not submit action");
    }
  };

  return (
    <div className="stack">
      <div className="section-row">
        <div>
          <h2>Active Rooms</h2>
          <p className="muted">Create a live Auction room here, then play as Seat 1.</p>
        </div>
        <div className="inline-actions">
          <button className="button primary" onClick={() => void createDemoAuctionRoom()} type="button">
            Create demo auction room
          </button>
          <button className="button" onClick={() => void refreshRooms()} type="button">
            {isPending ? "Refreshing..." : "Refresh"}
          </button>
          <Link className="button" href="/games/auction">
            Open flagship game
          </Link>
        </div>
      </div>

      {error ? <div className="panel error-panel">{error}</div> : null}

      <div className="card-grid">
        {rooms.map((room) => {
          const readySeats = room.seats.filter((seat) => seat.isReady).length;
          const connectedSeats = room.seats.filter((seat) => seat.isConnected).length;
          const auctionState = isAuctionRoom(room) ? room.publicState : null;
          const canOperatorAct =
            auctionState?.phase === "bidding" && auctionState.currentTurnSeatId === operatorSeatId;

          return (
            <article className="panel tile-card" key={room.roomId}>
              <div className="tile-topline">
                <span className="pill accent">{labelGame(room.game)}</span>
                <span className="pill subtle">{room.phase}</span>
              </div>
              <h3>{labelGame(room.game)} room</h3>
              <p className="muted">
                Match <code>{room.matchId.slice(0, 8)}</code> · round {room.round}
              </p>

              {auctionState ? (
                <div className="metric-grid metric-grid-large">
                  <div className="metric">
                    <span>Current bid</span>
                    <strong>{auctionState.currentBid}</strong>
                  </div>
                  <div className="metric">
                    <span>Pot</span>
                    <strong>{auctionState.currentPot}</strong>
                  </div>
                  <div className="metric">
                    <span>Leader</span>
                    <strong>{auctionState.currentLeaderSeatId ?? "none"}</strong>
                  </div>
                </div>
              ) : null}

              <div className="metric-grid">
                <div className="metric">
                  <span>Connected</span>
                  <strong>
                    {connectedSeats}/{room.seats.length}
                  </strong>
                </div>
                <div className="metric">
                  <span>Ready</span>
                  <strong>
                    {readySeats}/{room.seats.length}
                  </strong>
                </div>
              </div>

              <div className="seat-column">
                {room.seats.map((seat) => (
                  <div className="seat-line" key={seat.seatId}>
                    <div>
                      <strong>{seat.displayName}</strong>
                      <span>{seat.seatId === operatorSeatId ? "Operator seat" : "Hidden identity"}</span>
                    </div>
                    <span className={`pill ${seat.isReady ? "accent" : "subtle"}`}>
                      {seat.isReady ? "Ready" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>

              {auctionState ? (
                <div className="stack">
                  <div className="panel panel-subtle">
                    <strong>
                      {auctionState.phase === "settled"
                        ? `Winner: ${auctionState.winnerSeatId ?? "pending"}`
                        : canOperatorAct
                          ? "Your turn as Seat 1"
                          : `Waiting on ${auctionState.currentTurnSeatId ?? "the room"}`}
                    </strong>
                    <p className="muted">
                      Human and LLM seats stay visually identical. Only Seat 1 is controllable from
                      this operator console.
                    </p>
                  </div>

                  <div className="inline-actions">
                    <button
                      className="button"
                      disabled={!canOperatorAct}
                      onClick={() =>
                        void sendAuctionAction(room.roomId, {
                          type: "auction.bid",
                          amount: Math.min(
                            AUCTION_MAX_BID,
                            auctionState.currentBid + AUCTION_MIN_INCREMENT,
                          ),
                        })
                      }
                      type="button"
                    >
                      Bid +{AUCTION_MIN_INCREMENT}
                    </button>
                    <button
                      className="button"
                      disabled={!canOperatorAct}
                      onClick={() =>
                        void sendAuctionAction(room.roomId, {
                          type: "auction.bid",
                          amount: Math.min(
                            AUCTION_MAX_BID,
                            auctionState.currentBid + AUCTION_MIN_INCREMENT * 3,
                          ),
                        })
                      }
                      type="button"
                    >
                      Bid +{AUCTION_MIN_INCREMENT * 3}
                    </button>
                    <button
                      className="button"
                      disabled={!canOperatorAct}
                      onClick={() =>
                        void sendAuctionAction(room.roomId, {
                          type: "auction.pass",
                        })
                      }
                      type="button"
                    >
                      Pass
                    </button>
                  </div>
                </div>
              ) : (
                <Link className="button primary" href={`/games/${room.game}`}>
                  Review rules
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

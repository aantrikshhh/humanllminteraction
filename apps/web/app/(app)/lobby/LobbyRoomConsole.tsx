"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import type { GameKey, PublicRoomState, SeatBackingType } from "@arena/contracts";
import { type AuctionPublicState } from "@arena/game-auction";

import { labelGame } from "../../../lib/service-data";

interface LobbyRoomConsoleProps {
  initialRooms: PublicRoomState[];
}

interface CreateRoomTemplate {
  game: GameKey;
  title: string;
  strap: string;
  detail: string;
  players: string;
  payload: {
    game: GameKey;
    seats: Array<{
      displayName: string;
      avatarId: string;
      backingType: SeatBackingType;
      llmModelId?: string;
      promptVersionId?: string;
    }>;
  };
}

const roomTemplates: CreateRoomTemplate[] = [
  {
    game: "auction",
    title: "Auction",
    strap: "Fast bluffing pressure",
    detail: "One human bidder enters a four-seat auction against three hidden rivals.",
    players: "1 human + 3 hidden agents",
    payload: {
      game: "auction",
      seats: [
        { displayName: "Mask 1", avatarId: "mask-amber", backingType: "human" },
        {
          displayName: "Mask 2",
          avatarId: "mask-cyan",
          backingType: "llm",
          llmModelId: "auction-shadow-1",
          promptVersionId: "auction-hidden-v1",
        },
        {
          displayName: "Mask 3",
          avatarId: "mask-rose",
          backingType: "llm",
          llmModelId: "auction-shadow-2",
          promptVersionId: "auction-hidden-v1",
        },
        {
          displayName: "Mask 4",
          avatarId: "mask-verdant",
          backingType: "scripted",
        },
      ],
    },
  },
  {
    game: "split",
    title: "Split",
    strap: "One offer, one answer",
    detail: "Claim a single mask and negotiate against one hidden counterpart.",
    players: "1 human + 1 hidden agent",
    payload: {
      game: "split",
      seats: [
        { displayName: "Mask 1", avatarId: "mask-amber", backingType: "human" },
        {
          displayName: "Mask 2",
          avatarId: "mask-cyan",
          backingType: "llm",
          llmModelId: "split-shadow-1",
          promptVersionId: "split-hidden-v1",
        },
      ],
    },
  },
  {
    game: "pact",
    title: "Pact",
    strap: "Repeated trust loop",
    detail: "Fifteen hidden commitment rounds against one unknown rival.",
    players: "1 human + 1 hidden agent",
    payload: {
      game: "pact",
      seats: [
        { displayName: "Mask 1", avatarId: "mask-amber", backingType: "human" },
        {
          displayName: "Mask 2",
          avatarId: "mask-cyan",
          backingType: "llm",
          llmModelId: "pact-shadow-1",
          promptVersionId: "pact-hidden-v1",
        },
      ],
    },
  },
  {
    game: "vault",
    title: "Vault",
    strap: "Public goods with accusations",
    detail: "Contribute, then accuse. Three hidden seats pressure every round.",
    players: "1 human + 3 hidden agents",
    payload: {
      game: "vault",
      seats: [
        { displayName: "Mask 1", avatarId: "mask-amber", backingType: "human" },
        {
          displayName: "Mask 2",
          avatarId: "mask-cyan",
          backingType: "llm",
          llmModelId: "vault-shadow-1",
          promptVersionId: "vault-hidden-v1",
        },
        {
          displayName: "Mask 3",
          avatarId: "mask-rose",
          backingType: "scripted",
        },
        {
          displayName: "Mask 4",
          avatarId: "mask-verdant",
          backingType: "llm",
          llmModelId: "vault-shadow-2",
          promptVersionId: "vault-hidden-v1",
        },
      ],
    },
  },
  {
    game: "settlement",
    title: "Settlement",
    strap: "Turn-based coalition strain",
    detail: "Rotate through pledges and hidden commitments across a live frontier room.",
    players: "1 human + 3 hidden agents",
    payload: {
      game: "settlement",
      seats: [
        { displayName: "Mask 1", avatarId: "mask-amber", backingType: "human" },
        {
          displayName: "Mask 2",
          avatarId: "mask-cyan",
          backingType: "llm",
          llmModelId: "settlement-shadow-1",
          promptVersionId: "settlement-hidden-v1",
        },
        {
          displayName: "Mask 3",
          avatarId: "mask-rose",
          backingType: "scripted",
        },
        {
          displayName: "Mask 4",
          avatarId: "mask-verdant",
          backingType: "llm",
          llmModelId: "settlement-shadow-2",
          promptVersionId: "settlement-hidden-v1",
        },
      ],
    },
  },
];

function isAuctionRoom(room: PublicRoomState): room is PublicRoomState<AuctionPublicState> {
  return room.game === "auction";
}

function getOpenMaskCount(room: PublicRoomState): number {
  return room.joinState?.openSeatIds.length ?? room.seats.filter((seat) => !seat.isConnected && !seat.isReady).length;
}

function getClaimedMaskCount(room: PublicRoomState): number {
  return room.joinState?.claimedSeatIds.length ?? room.seats.filter((seat) => seat.isConnected && !seat.isReady).length;
}

export default function LobbyRoomConsole({ initialRooms }: LobbyRoomConsoleProps) {
  const router = useRouter();
  const [rooms, setRooms] = useState(initialRooms);
  const [error, setError] = useState<string | null>(null);
  const [creatingGame, setCreatingGame] = useState<GameKey | null>(null);
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

  const createRoom = async (template: CreateRoomTemplate) => {
    setCreatingGame(template.game);

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(template.payload),
      });

      if (!response.ok) {
        throw new Error(`room creation failed with status ${response.status}`);
      }

      const room = (await response.json()) as PublicRoomState;
      startTransition(() => {
        setRooms((current) => [room, ...current.filter((candidate) => candidate.roomId !== room.roomId)]);
        setError(null);
      });

      router.push(`/rooms/${room.roomId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "could not create room");
    } finally {
      setCreatingGame(null);
    }
  };

  return (
    <div className="stack">
      <div className="section-row">
        <div>
          <h2>Launch a live room</h2>
          <p className="muted">
            Every fresh room starts joinable. Enter with one browser, claim the lone human mask, and play against
            hidden agent seats.
          </p>
        </div>
        <div className="inline-actions">
          <button className="button" onClick={() => void refreshRooms()} type="button">
            {isPending ? "Refreshing..." : "Refresh"}
          </button>
          <Link className="button" href="/rooms">
            Room index
          </Link>
        </div>
      </div>

      {error ? <div className="panel error-panel">{error}</div> : null}

      <div className="card-grid">
        {roomTemplates.map((template) => (
          <article className="panel tile-card" key={template.game}>
            <div className="tile-topline">
              <span className="pill accent">{template.title}</span>
              <span className="pill subtle">{template.players}</span>
            </div>
            <h3>{template.strap}</h3>
            <p className="muted">{template.detail}</p>
            <div className="metric-grid">
              <div className="metric">
                <span>Human masks</span>
                <strong>1</strong>
              </div>
              <div className="metric">
                <span>Hidden seats</span>
                <strong>{template.payload.seats.length - 1}</strong>
              </div>
              <div className="metric">
                <span>Game</span>
                <strong>{labelGame(template.game)}</strong>
              </div>
            </div>
            <div className="inline-actions">
              <button
                className="button primary"
                disabled={creatingGame === template.game}
                onClick={() => void createRoom(template)}
                type="button"
              >
                {creatingGame === template.game ? "Opening..." : `Create ${template.title}`}
              </button>
              <Link className="button" href={`/games/${template.game}`}>
                Brief
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="section-row">
        <div>
          <h2>Active rooms</h2>
          <p className="muted">Open any live room, claim one visible mask, then let the rest stay identity-blinded.</p>
        </div>
      </div>

      <div className="card-grid">
        {rooms.map((room) => {
          const readySeats = room.seats.filter((seat) => seat.isReady).length;
          const connectedSeats = room.seats.filter((seat) => seat.isConnected).length;
          const openSeats = getOpenMaskCount(room);
          const claimedSeats = getClaimedMaskCount(room);
          const auctionState = isAuctionRoom(room) ? room.publicState : null;

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
                    <span>Turns left</span>
                    <strong>{auctionState.turnsRemaining}</strong>
                  </div>
                </div>
              ) : null}

              <div className="metric-grid">
                <div className="metric">
                  <span>Open masks</span>
                  <strong>{openSeats}</strong>
                </div>
                <div className="metric">
                  <span>Claimed</span>
                  <strong>{claimedSeats}</strong>
                </div>
                <div className="metric">
                  <span>Ready</span>
                  <strong>
                    {readySeats}/{room.seats.length}
                  </strong>
                </div>
                <div className="metric">
                  <span>Connected</span>
                  <strong>
                    {connectedSeats}/{room.seats.length}
                  </strong>
                </div>
              </div>

              <div className="seat-column">
                {room.seats.map((seat) => {
                  const isOpen = room.joinState?.openSeatIds.includes(seat.seatId) ?? (!seat.isConnected && !seat.isReady);
                  const isClaimed = room.joinState?.claimedSeatIds.includes(seat.seatId) ?? (seat.isConnected && !seat.isReady);
                  const status = isOpen ? "Open mask" : isClaimed ? "Claimed mask" : "Hidden seat";

                  return (
                    <div className="seat-line" key={seat.seatId}>
                      <div>
                        <strong>{seat.displayName}</strong>
                        <span>{status}</span>
                      </div>
                      <span className={`pill ${seat.isReady ? "accent" : "subtle"}`}>
                        {seat.isReady ? "Ready" : isOpen ? "Open" : isClaimed ? "Claimed" : "Live"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="inline-actions">
                <Link className="button primary" href={`/rooms/${room.roomId}`}>
                  Enter room
                </Link>
                <Link className="button" href={`/results/${room.roomId}`}>
                  Result view
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

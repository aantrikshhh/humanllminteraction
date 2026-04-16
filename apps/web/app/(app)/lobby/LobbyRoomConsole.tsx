"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import type { GameKey, PublicRoomState, SeatBackingType } from "@arena/contracts";
import { type AuctionPublicState } from "@arena/game-auction";

import { labelGame } from "../../../lib/service-data";
import styles from "./lobby.module.css";

interface LobbyRoomConsoleProps {
  initialRooms: PublicRoomState[];
}

interface CreateRoomTemplate {
  id: string;
  game: GameKey;
  title: string;
  icon: string;
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
    id: "auction-solo",
    game: "auction",
    title: "Auction Solo",
    icon: "◐",
    strap: "Fast bluffing pressure",
    detail: "One human bidder enters a four-seat auction against three hidden rivals for the fastest solo demo path.",
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
    id: "auction-live",
    game: "auction",
    title: "Auction Live",
    icon: "◈",
    strap: "Two humans, two hidden seats",
    detail: "The strongest on-camera multiplayer demo: two claimed human masks inside a four-seat hidden-identity auction.",
    players: "2 humans + 2 hidden agents",
    payload: {
      game: "auction",
      seats: [
        { displayName: "Mask 1", avatarId: "mask-amber", backingType: "human" },
        { displayName: "Mask 2", avatarId: "mask-cyan", backingType: "human" },
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
    id: "split",
    game: "split",
    title: "Split",
    icon: "⟂",
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
    id: "pact",
    game: "pact",
    title: "Pact",
    icon: "✦",
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
    id: "vault",
    game: "vault",
    title: "Vault",
    icon: "◫",
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
    id: "settlement",
    game: "settlement",
    title: "Settlement",
    icon: "⌘",
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

function getHumanSeatCount(template: CreateRoomTemplate): number {
  return template.payload.seats.filter((seat) => seat.backingType === "human").length;
}

function getHiddenSeatCount(template: CreateRoomTemplate): number {
  return template.payload.seats.filter((seat) => seat.backingType !== "human").length;
}

function getRoomIcon(game: GameKey): string {
  switch (game) {
    case "auction":
      return "◈";
    case "split":
      return "⟂";
    case "pact":
      return "✦";
    case "vault":
      return "◫";
    case "settlement":
      return "⌘";
    default:
      return "•";
  }
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

  const featuredTemplates = roomTemplates.filter((template) => template.game === "auction");
  const secondaryTemplates = roomTemplates.filter((template) => template.game !== "auction");

  return (
    <div className={styles.mainColumn}>
      <div className={styles.sectionHeading}>
        <div>
          <h2>Launch rail</h2>
          <p>
            Start with Auction if you need a clean demo. The other games are here when you want to
            show breadth after the main loop lands.
          </p>
        </div>
        <div className={styles.actionRow}>
          <button className={styles.ghostButton} onClick={() => void refreshRooms()} type="button">
            {isPending ? "Refreshing..." : "Refresh board"}
          </button>
          <Link className={styles.ghostButton} href="/rooms">
            Full room index
          </Link>
        </div>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.quickRail}>
        {featuredTemplates.map((template) => (
          <article className={styles.railCard} key={template.id}>
            <div className={styles.railTopline}>
              <span className={`${styles.pill} ${styles.pillWarm}`}>Featured demo</span>
              <span className={`${styles.pill} ${styles.pillMuted}`}>{template.players}</span>
            </div>
            <div className={styles.railTitle}>
              <div className={styles.iconShell}>{template.icon}</div>
              <div>
                <h3>{template.title}</h3>
                <p>{template.strap}</p>
              </div>
            </div>
            <p className={styles.note}>{template.detail}</p>
            <div className={styles.metrics}>
              <div className={styles.metric}>
                <span>Human masks</span>
                <strong>{getHumanSeatCount(template)}</strong>
              </div>
              <div className={styles.metric}>
                <span>Hidden seats</span>
                <strong>{getHiddenSeatCount(template)}</strong>
              </div>
              <div className={styles.metric}>
                <span>Game</span>
                <strong>{labelGame(template.game)}</strong>
              </div>
            </div>
            <div className={styles.actionRow}>
              <button
                className={styles.actionButton}
                disabled={creatingGame === template.game}
                onClick={() => void createRoom(template)}
                type="button"
              >
                {creatingGame === template.game ? "Opening room..." : `Create ${template.title}`}
              </button>
              <Link className={styles.ghostButton} href={`/games/${template.game}`}>
                Game brief
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.subsectionHeading}>
        <h3>More game slices</h3>
        <p>Use these after the flagship demo when you want to show the broader format library.</p>
      </div>

      <div className={styles.liveGrid}>
        {secondaryTemplates.map((template) => (
          <article className={styles.railCard} key={template.id}>
            <div className={styles.railTopline}>
              <span className={`${styles.pill} ${styles.pillCool}`}>{labelGame(template.game)}</span>
              <span className={`${styles.pill} ${styles.pillMuted}`}>{template.players}</span>
            </div>
            <div className={styles.railTitle}>
              <div className={styles.iconShell}>{template.icon}</div>
              <div>
                <h3>{template.title}</h3>
                <p>{template.strap}</p>
              </div>
            </div>
            <p className={styles.note}>{template.detail}</p>
            <div className={styles.actionRow}>
              <button
                className={styles.actionButton}
                disabled={creatingGame === template.game}
                onClick={() => void createRoom(template)}
                type="button"
              >
                {creatingGame === template.game ? "Opening room..." : "Launch room"}
              </button>
              <Link className={styles.ghostButton} href={`/games/${template.game}`}>
                Brief
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.subsectionHeading}>
        <h3>Live rooms</h3>
        <p>Open any active room, claim one visible mask, and leave the rest of the table ambiguous.</p>
      </div>

      <div className={styles.liveGrid}>
        {rooms.map((room) => {
          const readySeats = room.seats.filter((seat) => seat.isReady).length;
          const connectedSeats = room.seats.filter((seat) => seat.isConnected).length;
          const openSeats = getOpenMaskCount(room);
          const claimedSeats = getClaimedMaskCount(room);
          const auctionState = isAuctionRoom(room) ? room.publicState : null;

          return (
            <article className={styles.liveCard} key={room.roomId}>
              <div className={styles.liveTopline}>
                <span className={`${styles.pill} ${styles.pillCool}`}>{labelGame(room.game)}</span>
                <span className={`${styles.pill} ${styles.pillMuted}`}>{room.phase}</span>
              </div>
              <div className={styles.railTitle}>
                <div className={styles.iconShell}>{getRoomIcon(room.game)}</div>
                <div>
                  <h3 className={styles.liveTitle}>{labelGame(room.game)} room</h3>
                  <p>
                    Match <span className={styles.mono}>{room.matchId.slice(0, 8)}</span> · round {room.round}
                  </p>
                </div>
              </div>
              <p className={styles.note}>
                {openSeats > 0
                  ? `${openSeats} visible mask${openSeats === 1 ? "" : "s"} still available to claim.`
                  : "All visible masks are claimed or the room is already in motion."}
              </p>

              {auctionState ? (
                <div className={styles.metrics}>
                  <div className={styles.metric}>
                    <span>Current bid</span>
                    <strong>{auctionState.currentBid}</strong>
                  </div>
                  <div className={styles.metric}>
                    <span>Pot</span>
                    <strong>{auctionState.currentPot}</strong>
                  </div>
                  <div className={styles.metric}>
                    <span>Turns left</span>
                    <strong>{auctionState.turnsRemaining}</strong>
                  </div>
                </div>
              ) : null}

              <div className={styles.metrics}>
                <div className={styles.metric}>
                  <span>Open masks</span>
                  <strong>{openSeats}</strong>
                </div>
                <div className={styles.metric}>
                  <span>Claimed</span>
                  <strong>{claimedSeats}</strong>
                </div>
                <div className={styles.metric}>
                  <span>Ready</span>
                  <strong>
                    {readySeats}/{room.seats.length}
                  </strong>
                </div>
                <div className={styles.metric}>
                  <span>Connected</span>
                  <strong>
                    {connectedSeats}/{room.seats.length}
                  </strong>
                </div>
              </div>

              <div className={styles.seatList}>
                {room.seats.map((seat) => {
                  const isOpen = room.joinState?.openSeatIds.includes(seat.seatId) ?? (!seat.isConnected && !seat.isReady);
                  const isClaimed = room.joinState?.claimedSeatIds.includes(seat.seatId) ?? (seat.isConnected && !seat.isReady);
                  const status = isOpen ? "Open mask" : isClaimed ? "Claimed mask" : "Hidden seat";

                  return (
                    <div className={styles.seatRow} key={seat.seatId}>
                      <div className={styles.seatCopy}>
                        <strong>{seat.displayName}</strong>
                        <span>{status}</span>
                      </div>
                      <span className={`${styles.pill} ${seat.isReady ? styles.pillWarm : styles.pillMuted}`}>
                        {seat.isReady ? "Ready" : isOpen ? "Open" : isClaimed ? "Claimed" : "Live"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className={styles.actionRow}>
                <Link className={styles.actionButton} href={`/rooms/${room.roomId}`}>
                  Enter room
                </Link>
                <Link className={styles.ghostButton} href={`/results/${room.roomId}`}>
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

"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
  type FormEvent,
} from "react";

import type { PlayerSession, PublicRoomState, PublicSeatView } from "@arena/contracts";
import {
  AUCTION_MAX_BID,
  AUCTION_MIN_INCREMENT,
  type AuctionAction,
  type AuctionSeatPublicView,
  type AuctionPublicState,
} from "@arena/game-auction";
import type { PactAction, PactPublicState } from "@arena/game-pact";
import {
  SETTLEMENT_MAX_CONTRIBUTION,
  type SettlementAction,
  type SettlementPublicState,
} from "@arena/game-settlement";
import type { SplitAction, SplitPublicState } from "@arena/game-split";
import type { VaultAction, VaultPublicState } from "@arena/game-vault";

import { labelGame } from "../../../../lib/service-data";

import styles from "./room-page.module.css";

interface RoomPageClientProps {
  initialRoom: PublicRoomState;
  initialSource: "live" | "fallback";
}

interface RoomMutationEnvelope {
  room: PublicRoomState;
  session: PlayerSession | null;
}

interface AuctionRuleCard {
  label: string;
  value: string;
  detail: string;
}

type RoomAction = AuctionAction | SplitAction | PactAction | VaultAction | SettlementAction;

const storageKeyPrefix = "arena.room-session";
const settlementStances = ["fortify", "trade", "appease"] as const;

function isAuctionRoom(room: PublicRoomState): room is PublicRoomState<AuctionPublicState> {
  return room.game === "auction";
}

function isSplitRoom(room: PublicRoomState): room is PublicRoomState<SplitPublicState> {
  return room.game === "split";
}

function isPactRoom(room: PublicRoomState): room is PublicRoomState<PactPublicState> {
  return room.game === "pact";
}

function isVaultRoom(room: PublicRoomState): room is PublicRoomState<VaultPublicState> {
  return room.game === "vault";
}

function isSettlementRoom(room: PublicRoomState): room is PublicRoomState<SettlementPublicState> {
  return room.game === "settlement";
}

function storageKeyForRoom(roomId: string): string {
  return `${storageKeyPrefix}.${roomId}`;
}

function readStoredSession(roomId: string): PlayerSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(storageKeyForRoom(roomId));
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as PlayerSession;
  } catch {
    window.localStorage.removeItem(storageKeyForRoom(roomId));
    return null;
  }
}

function writeStoredSession(roomId: string, session: PlayerSession | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(storageKeyForRoom(roomId));
    return;
  }

  window.localStorage.setItem(storageKeyForRoom(roomId), JSON.stringify(session));
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

function formatAuctionSeatLine(seat: AuctionSeatPublicView): string {
  return `${seat.bankroll} bank · ${seat.committedBid} committed · ${seat.totalValueWon} won`;
}

function describeSeatState(
  seat: PublicSeatView,
  roomPhase: PublicRoomState["phase"],
  options: {
    isOwned: boolean;
    isOpen: boolean;
  },
): string {
  if (options.isOwned) {
    if (roomPhase === "results") {
      return "Your mask is locked for post-match review.";
    }

    return seat.isReady ? "Ready and synced to this browser." : "Claimed here. Mark ready to enter.";
  }

  if (options.isOpen) {
    return "Open mask. Claim it without exposing who else is human or model-backed.";
  }

  if (roomPhase === "results") {
    return "Match settled.";
  }

  if (!seat.isConnected) {
    return "Seat offline.";
  }

  if (!seat.isReady) {
    return "Joined, waiting on ready.";
  }

  return "Identity remains blinded.";
}

function getSeatAccent(avatarId: string): string {
  if (avatarId.includes("amber")) return "#f3c26f";
  if (avatarId.includes("cyan")) return "#6ad7ff";
  if (avatarId.includes("rose")) return "#ff8bc2";
  if (avatarId.includes("verdant")) return "#79f0a8";
  return "#d3def8";
}

function parseMutationEnvelope(payload: unknown): RoomMutationEnvelope {
  if (!payload || typeof payload !== "object") {
    throw new Error("room service returned an invalid response");
  }

  if ("roomId" in payload) {
    return {
      room: payload as PublicRoomState,
      session: null,
    };
  }

  if ("room" in payload) {
    const room = (payload as { room: PublicRoomState }).room;
    const session = "session" in payload ? ((payload as { session?: PlayerSession }).session ?? null) : null;
    return { room, session };
  }

  throw new Error("room service returned an unexpected shape");
}

export default function RoomPageClient({ initialRoom, initialSource }: RoomPageClientProps) {
  const [room, setRoom] = useState(initialRoom);
  const [source, setSource] = useState(initialSource);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [splitOfferAmount, setSplitOfferAmount] = useState(50);
  const [vaultContributionAmount, setVaultContributionAmount] = useState(0);
  const [settlementPledgeAmount, setSettlementPledgeAmount] = useState(0);
  const [settlementCommitAmount, setSettlementCommitAmount] = useState(0);
  const [settlementStance, setSettlementStance] =
    useState<(typeof settlementStances)[number]>("fortify");
  const [isPending, startTransition] = useTransition();

  const auctionState = isAuctionRoom(room) ? room.publicState : null;
  const splitState = isSplitRoom(room) ? room.publicState : null;
  const pactState = isPactRoom(room) ? room.publicState : null;
  const vaultState = isVaultRoom(room) ? room.publicState : null;
  const settlementState = isSettlementRoom(room) ? room.publicState : null;
  const roomIsPlayable = room.phase === "ready" || room.phase === "active";

  const ownedSeat = session?.seatId
    ? room.seats.find((seat) => seat.seatId === session.seatId) ?? null
    : null;

  const auctionOwnedSeat =
    auctionState && session?.seatId
      ? auctionState.seats.find((seat) => seat.seatId === session.seatId) ?? null
      : null;

  const openSeatCount = room.joinState?.openSeatIds.length
    ?? room.seats.filter((seat) => !seat.isConnected && !seat.isReady).length;

  const auctionCanAct =
    roomIsPlayable &&
    auctionState?.phase === "bidding" &&
    Boolean(ownedSeat) &&
    Boolean(ownedSeat?.isReady) &&
    auctionState.currentTurnSeatId === ownedSeat?.seatId;

  const splitCanAct = Boolean(
    ownedSeat &&
      splitState &&
      roomIsPlayable &&
      ownedSeat.isReady &&
      ((splitState.phase === "offer" && splitState.proposerSeatId === ownedSeat.seatId) ||
        (splitState.phase === "response" && splitState.responderSeatId === ownedSeat.seatId)),
  );

  const pactCanAct = Boolean(
    ownedSeat && pactState && roomIsPlayable && ownedSeat.isReady && pactState.phase === "choice_window",
  );

  const vaultCanAct = Boolean(
    ownedSeat &&
      vaultState &&
      roomIsPlayable &&
      ownedSeat.isReady &&
      vaultState.phase !== "match_complete",
  );

  const settlementCanAct = Boolean(
    ownedSeat &&
      settlementState &&
      roomIsPlayable &&
      ownedSeat.isReady &&
      settlementState.phase !== "settled" &&
      settlementState.currentTurnSeatId === ownedSeat.seatId,
  );

  const isBusy = isMutating || isPending;

  const auctionBidPresets = useMemo(() => {
    if (!auctionState) {
      return [];
    }

    const maxAffordableBid = Math.min(
      AUCTION_MAX_BID,
      auctionOwnedSeat?.bankroll ?? auctionState.startingBankroll,
    );
    const nextBid = auctionState.currentBid + AUCTION_MIN_INCREMENT;
    if (nextBid > maxAffordableBid) {
      return [];
    }

    return [
      nextBid,
      Math.min(maxAffordableBid, nextBid + AUCTION_MIN_INCREMENT * 2),
      maxAffordableBid,
    ].filter((amount, index, values) => amount <= maxAffordableBid && values.indexOf(amount) === index);
  }, [auctionOwnedSeat?.bankroll, auctionState]);

  const auctionRuleCards = useMemo<AuctionRuleCard[]>(() => {
    if (!auctionState) {
      return [];
    }

    return [
      {
        label: "Starting stack",
        value: `${auctionState.startingBankroll} credits`,
        detail: "That bankroll carries across the whole match. Spend early and you have less leverage in later rounds.",
      },
      {
        label: "Prize ladder",
        value: auctionState.prizeValues.join(" / "),
        detail: `Round ${auctionState.currentRound} is playing for ${auctionState.currentRoundPrizeValue} credits right now.`,
      },
      {
        label: "Raise rule",
        value: `+${AUCTION_MIN_INCREMENT} minimum, ${AUCTION_MAX_BID} round cap`,
        detail: "On your turn you either raise this round's total bid or pass out of this round only.",
      },
      {
        label: "Winning score",
        value: "prizes won - credits spent",
        detail: `${auctionState.totalRounds} rounds total. Final winner is the seat with the best net score after bankroll and prizes are both accounted for.`,
      },
    ];
  }, [auctionState]);

  const splitOfferPresets = useMemo(() => {
    if (!splitState) {
      return [];
    }

    return [25, 40, 50, 70, splitState.potTotal]
      .map((percentageOrTotal) =>
        percentageOrTotal === splitState.potTotal
          ? splitState.potTotal
          : Math.round((splitState.potTotal * percentageOrTotal) / 100),
      )
      .filter((amount, index, values) => amount >= 0 && amount <= splitState.potTotal && values.indexOf(amount) === index);
  }, [splitState]);

  const vaultContributionPresets = useMemo(() => {
    if (!vaultState) {
      return [];
    }

    const max = vaultState.contributionRange.max;
    return [0, Math.floor(max / 3), Math.floor((max * 2) / 3), max]
      .filter((amount, index, values) => amount >= 0 && values.indexOf(amount) === index);
  }, [vaultState]);

  const settlementMaxContribution = useMemo(() => {
    if (!settlementState || !ownedSeat) {
      return SETTLEMENT_MAX_CONTRIBUTION;
    }

    const seatState = settlementState.seats.find((seat) => seat.seatId === ownedSeat.seatId) as
      | { visibleSuppliesRemaining?: number }
      | undefined;

    return Math.max(
      0,
      Math.min(SETTLEMENT_MAX_CONTRIBUTION, seatState?.visibleSuppliesRemaining ?? SETTLEMENT_MAX_CONTRIBUTION),
    );
  }, [ownedSeat, settlementState]);

  useEffect(() => {
    const storedSession = readStoredSession(initialRoom.roomId);

    if (storedSession) {
      setSession(storedSession);
      setDisplayName(storedSession.displayName ?? "");
      return;
    }

    setDisplayName("");
  }, [initialRoom.roomId]);

  useEffect(() => {
    writeStoredSession(room.roomId, session);
  }, [room.roomId, session]);

  useEffect(() => {
    if (splitState) {
      setSplitOfferAmount(Math.round(splitState.potTotal / 2));
    }
  }, [splitState?.potTotal]);

  useEffect(() => {
    if (vaultState) {
      setVaultContributionAmount(Math.min(vaultContributionAmount, vaultState.contributionRange.max));
    }
  }, [vaultContributionAmount, vaultState?.contributionRange.max]);

  useEffect(() => {
    setSettlementPledgeAmount((current) => Math.min(current, settlementMaxContribution));
    setSettlementCommitAmount((current) => Math.min(current, settlementMaxContribution));
  }, [settlementMaxContribution]);

  useEffect(() => {
    let active = true;

    const refreshRoom = async (silent = false) => {
      try {
        const response = await fetch(`/api/rooms/${room.roomId}`, {
          method: "GET",
          cache: "no-store",
        });

        if (response.status === 404) {
          if (active) {
            setMissing(true);
            if (!silent) {
              setError("Room is no longer available in the live runtime.");
            }
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`refresh failed with status ${response.status}`);
        }

        const nextRoom = (await response.json()) as PublicRoomState;
        if (!active) {
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
  }, [room.roomId]);

  const applyMutation = (envelope: RoomMutationEnvelope, fallbackSession: PlayerSession | null = session) => {
    startTransition(() => {
      setRoom(envelope.room);
      setSource("live");
      setMissing(false);
      setError(null);
      if (envelope.session) {
        setSession(envelope.session);
        if (envelope.session.displayName) {
          setDisplayName(envelope.session.displayName);
        }
      } else {
        setSession(fallbackSession);
      }
    });
  };

  const postMutation = async (
    path: string,
    payload: Record<string, unknown>,
    fallbackSession: PlayerSession | null = session,
  ) => {
    setIsMutating(true);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `request failed with status ${response.status}`);
      }

      const nextPayload = await response.json();
      applyMutation(parseMutationEnvelope(nextPayload), fallbackSession);
    } finally {
      setIsMutating(false);
    }
  };

  const handleJoin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextDisplayName = displayName.trim();
    if (!nextDisplayName) {
      setError("Choose a short display name before joining.");
      return;
    }

    try {
      await postMutation(`/api/rooms/${room.roomId}/join`, {
        displayName: nextDisplayName,
        sessionId: session?.sessionId,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "could not join room");
    }
  };

  const handleClaimSeat = async (seatId: string) => {
    if (!session?.sessionId) {
      setError("Join the room before claiming a mask.");
      return;
    }

    try {
      await postMutation(
        `/api/rooms/${room.roomId}/claim`,
        {
          sessionId: session.sessionId,
          seatId,
        },
        { ...session, seatId },
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "could not claim seat");
    }
  };

  const handleReadyToggle = async (isReady: boolean) => {
    if (!session?.sessionId || !ownedSeat) {
      setError("Claim a mask before changing ready state.");
      return;
    }

    try {
      await postMutation(
        `/api/rooms/${room.roomId}/ready`,
        {
          sessionId: session.sessionId,
          seatId: ownedSeat.seatId,
          isReady,
        },
        session,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "could not update ready state");
    }
  };

  const sendAction = async (action: RoomAction) => {
    if (!session?.sessionId || !ownedSeat) {
      setError("Claim a mask before sending an action.");
      return;
    }

    setIsMutating(true);
    try {
      const response = await fetch(`/api/rooms/${room.roomId}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          type: "room.action",
          seatId: ownedSeat.seatId,
          sessionId: session.sessionId,
          payload: action,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `action failed with status ${response.status}`);
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
    } finally {
      setIsMutating(false);
    }
  };

  const sessionHeading = session ? "Session locked" : "Enter this room";
  const sessionCopy = session
    ? ownedSeat
      ? "Your browser holds one mask in this room. Identity stays hidden for every other seat."
      : "You are inside the room. Claim one open mask to participate."
    : "Join with a short display name, then claim one open mask without revealing who else is human.";
  const stageMetrics = buildStageMetrics(room, openSeatCount, ownedSeat);
  const focusTitle = describePrimaryInstruction(room, {
    hasSession: Boolean(session),
    ownedSeat,
  });

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
                {ownedSeat ? <span className="pill accent">you hold {ownedSeat.displayName}</span> : null}
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
              <Link className="button" href={`/results/${room.roomId}`}>
                Results
              </Link>
              <button
                className="button"
                disabled={isBusy}
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
                This page is holding the last snapshot until the room reappears or a new room is created.
              </p>
            </div>
          ) : null}

          <div className={styles.poster}>
            <div className={styles.posterGlow} />

            <div className={styles.posterTop}>
              <div>
                <div className={styles.posterLabel}>Live stage</div>
                <div className={styles.posterValue}>{focusTitle}</div>
              </div>
              <div className={styles.posterMeta}>
                <span>Next route</span>
                <strong>{room.phase === "results" ? "Results" : "Play"}</strong>
              </div>
            </div>

            <div className={styles.focusGrid}>
              <article className={styles.focusCard}>
                <span className={styles.focusEyebrow}>Now</span>
                <strong className={styles.focusHeadline}>
                  {describeActionStatus(room, ownedSeat?.seatId, ownedSeat)}
                </strong>
                <p className="muted">{describePosterState(room, ownedSeat?.seatId)}</p>
              </article>

              <article className={styles.visibilityCard}>
                <span className={styles.focusEyebrow}>Visibility</span>
                <strong className={styles.focusHeadline}>Public play, hidden identity</strong>
                <p className="muted">{describePosterSubcopy(room, ownedSeat?.seatId)}</p>
              </article>
            </div>

            <div className={styles.summaryBand}>
              {stageMetrics.map((metric) => (
                <div className={styles.summaryMetric} key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>

            <div className={styles.seatHeader}>
              <div>
                <span className={styles.posterLabel}>Masks on stage</span>
                <p className="muted">
                  Open masks are claimable. Occupied masks stay blinded even after a browser joins.
                </p>
              </div>
              <span className="pill subtle">{openSeatCount} open</span>
            </div>

            <div className={styles.seatStage}>
              {room.seats.map((seat) => {
                const isOwned = session?.seatId === seat.seatId;
                const isOpen = room.joinState?.openSeatIds.includes(seat.seatId)
                  ?? (!seat.isConnected && !seat.isReady);
                const isCurrentTurn = getCurrentTurnSeatId(room) === seat.seatId;
                const isLeader =
                  roomIsPlayable && isAuctionRoom(room) && room.publicState.currentLeaderSeatId === seat.seatId;
                const auctionSeatState =
                  auctionState?.seats.find((candidate) => candidate.seatId === seat.seatId) ?? null;

                return (
                  <article
                    className={[
                      styles.seatCard,
                      isOwned ? styles.seatCardOwned : "",
                      isCurrentTurn ? styles.seatCardCurrent : "",
                      isOpen ? styles.seatCardOpen : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={seat.seatId}
                    style={
                      {
                        "--seat-accent": getSeatAccent(seat.avatarId),
                      } as CSSProperties
                    }
                  >
                    <div className={styles.seatFrame}>
                      <div className={styles.seatMask}>
                        <span>{seat.displayName.replace(/^(Seat|Mask)\s+/i, "M")}</span>
                      </div>
                      <div className={styles.seatGlyph} />
                    </div>

                    <div className={styles.seatCopy}>
                      <div className={styles.seatHeadline}>
                        <strong>{seat.displayName}</strong>
                        {isOwned ? (
                          <span className="pill accent">Yours</span>
                        ) : isOpen ? (
                          <span className="pill subtle">Open</span>
                        ) : (
                          <span className="pill subtle">Blinded</span>
                        )}
                      </div>
                      <p>{describeSeatState(seat, room.phase, { isOwned, isOpen })}</p>
                    </div>

                    <div className={styles.seatStats}>
                      <span>{auctionSeatState ? formatAuctionSeatLine(auctionSeatState) : formatSeatScore(seat)}</span>
                      {isCurrentTurn ? (
                        <strong className={styles.turnSignal}>Acting now</strong>
                      ) : isLeader ? (
                        <strong className={styles.leaderSignal}>
                          {auctionState ? `Leading r${auctionState.currentRound}` : "Leading"}
                        </strong>
                      ) : isOpen ? (
                        <strong>Claimable</strong>
                      ) : (
                        <strong>Observed</strong>
                      )}
                    </div>

                    {!ownedSeat && isOpen && session ? (
                      <button
                        className={`button ${styles.claimButton}`}
                        disabled={isBusy}
                        onClick={() => void handleClaimSeat(seat.seatId)}
                        type="button"
                      >
                        Claim mask
                      </button>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        <aside className={styles.sidebarStack}>
          <section className={`panel ${styles.controlDock}`}>
            <div className="stack">
              <div className="section-row">
                <div>
                  <h2>{sessionHeading}</h2>
                  <p className="muted">{sessionCopy}</p>
                </div>
                <span className={`pill ${session ? "accent" : "subtle"}`}>
                  {session ? "joined" : "visitor"}
                </span>
              </div>

              {!session ? (
                <form className={styles.joinForm} onSubmit={handleJoin}>
                  <label className={styles.joinField}>
                    <span>Display name</span>
                    <input
                      autoComplete="nickname"
                      className={styles.joinInput}
                      maxLength={24}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="QuietSignal"
                      type="text"
                      value={displayName}
                    />
                  </label>
                  <button className="button primary" disabled={isBusy} type="submit">
                    Join room
                  </button>
                </form>
              ) : (
                <div className={styles.sessionStack}>
                  <div className={styles.sessionPanel}>
                    <div>
                      <span>Display name</span>
                      <strong>{session.displayName ?? "Guest"}</strong>
                    </div>
                    <div>
                      <span>Session</span>
                      <strong>{session.sessionId.slice(0, 8)}</strong>
                    </div>
                  </div>

                  {ownedSeat ? (
                    <div className={styles.ownedSeatPanel}>
                      <div className={styles.ownedSeatHeading}>
                        <div>
                          <span>Your mask</span>
                          <strong>{ownedSeat.displayName}</strong>
                        </div>
                        <span className={`pill ${ownedSeat.isReady ? "accent" : "subtle"}`}>
                          {ownedSeat.isReady ? "ready" : "pending"}
                        </span>
                      </div>
                      <p className="muted">
                        Ready state is public. Identity type is not.
                      </p>
                      <div className={styles.readyRail}>
                        <button
                          className="button primary"
                          disabled={isBusy || ownedSeat.isReady}
                          onClick={() => void handleReadyToggle(true)}
                          type="button"
                        >
                          Ready up
                        </button>
                        <button
                          className="button"
                          disabled={isBusy || !ownedSeat.isReady}
                          onClick={() => void handleReadyToggle(false)}
                          type="button"
                        >
                          Hold
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`panel panel-subtle ${styles.claimPanel}`}>
                      <strong>{openSeatCount > 0 ? "Claim one open mask." : "No open masks right now."}</strong>
                      <p className="muted">
                        The room only reveals which masks are available to claim, not whether occupied masks are human
                        or model-backed.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className={`panel ${styles.controlDock}`}>
            <div className="stack">
              <div>
                <h2>Action rail</h2>
                <p className="muted">{describeControlsCopy(room)}</p>
              </div>

              <div className={`panel panel-subtle ${styles.turnPanel}`}>
                <strong>{describeActionStatus(room, ownedSeat?.seatId, ownedSeat)}</strong>
                <p className="muted">
                  Everyone sees room state and scores. Nobody sees which occupied masks are human.
                </p>
              </div>

              {auctionState ? (
                <div className={`panel panel-subtle ${styles.rulesPanel}`}>
                  <div className={styles.rulesHeader}>
                    <strong>Auction rules at a glance</strong>
                    <span className="pill subtle">Readable economy</span>
                  </div>
                  <div className={styles.rulesGrid}>
                    {auctionRuleCards.map((rule) => (
                      <article className={styles.ruleCard} key={rule.label}>
                        <span>{rule.label}</span>
                        <strong>{rule.value}</strong>
                        <p className="muted">{rule.detail}</p>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}

              {auctionState ? (
                <div className={styles.actionGrid}>
                  {auctionBidPresets.map((amount) => (
                    <button
                      className="button primary"
                      disabled={!auctionCanAct || isBusy}
                      key={amount}
                      onClick={() => void sendAction({ type: "auction.bid", amount })}
                      type="button"
                    >
                      Bid {amount}
                    </button>
                  ))}
                  <button
                    className="button"
                    disabled={!auctionCanAct || auctionBidPresets.length === 0 || isBusy}
                    onClick={() =>
                      void sendAction({
                        type: "auction.bid",
                        amount: auctionBidPresets[auctionBidPresets.length - 1] ?? AUCTION_MAX_BID,
                      })
                    }
                    type="button"
                  >
                    Push to max round bid
                  </button>
                  <button
                    className="button"
                    disabled={!auctionCanAct || isBusy}
                    onClick={() => void sendAction({ type: "auction.pass" })}
                    type="button"
                  >
                    Pass
                  </button>
                </div>
              ) : null}

              {splitState ? (
                <div className={styles.actionGrid}>
                  {splitState.phase === "offer" ? (
                    <>
                      <div className={styles.controlGroup}>
                        <label className={styles.joinField}>
                          <span>Responder share</span>
                          <input
                            className={styles.joinInput}
                            max={splitState.potTotal}
                            min={0}
                            onChange={(event) => setSplitOfferAmount(Number(event.target.value))}
                            type="number"
                            value={splitOfferAmount}
                          />
                        </label>
                        <div className={styles.choiceRail}>
                          {splitOfferPresets.map((amount) => (
                            <button
                              className="button"
                              disabled={!splitCanAct}
                              key={amount}
                              onClick={() => setSplitOfferAmount(amount)}
                              type="button"
                            >
                              {amount}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        className="button primary"
                        disabled={!splitCanAct || isBusy}
                        onClick={() =>
                          void sendAction({
                            type: "split.offer",
                            amount: Math.max(0, Math.min(splitState.potTotal, Math.round(splitOfferAmount))),
                          })
                        }
                        type="button"
                      >
                        Send offer
                      </button>
                    </>
                  ) : (
                    <div className={styles.choiceRail}>
                      <button
                        className="button primary"
                        disabled={!splitCanAct || isBusy}
                        onClick={() => void sendAction({ type: "split.accept" })}
                        type="button"
                      >
                        Accept
                      </button>
                      <button
                        className="button"
                        disabled={!splitCanAct || isBusy}
                        onClick={() => void sendAction({ type: "split.reject" })}
                        type="button"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ) : null}

              {pactState ? (
                <div className={styles.choiceRail}>
                  <button
                    className="button primary"
                    disabled={!pactCanAct || isBusy}
                    onClick={() => void sendAction({ type: "pact.choose", choice: "cooperate" })}
                    type="button"
                  >
                    Cooperate
                  </button>
                  <button
                    className="button"
                    disabled={!pactCanAct || isBusy}
                    onClick={() => void sendAction({ type: "pact.choose", choice: "betray" })}
                    type="button"
                  >
                    Betray
                  </button>
                </div>
              ) : null}

              {vaultState ? (
                <div className={styles.actionGrid}>
                  {vaultState.phase === "contribution_window" ? (
                    <>
                      <label className={styles.joinField}>
                        <span>Contribution</span>
                        <input
                          className={styles.joinInput}
                          max={vaultState.contributionRange.max}
                          min={vaultState.contributionRange.min}
                          onChange={(event) => setVaultContributionAmount(Number(event.target.value))}
                          type="number"
                          value={vaultContributionAmount}
                        />
                      </label>
                      <div className={styles.choiceRail}>
                        {vaultContributionPresets.map((amount) => (
                          <button
                            className="button"
                            disabled={!vaultCanAct || isBusy}
                            key={amount}
                            onClick={() => setVaultContributionAmount(amount)}
                            type="button"
                          >
                            {amount}
                          </button>
                        ))}
                      </div>
                      <button
                        className="button primary"
                        disabled={!vaultCanAct || isBusy}
                        onClick={() =>
                          void sendAction({
                            type: "vault.contribute",
                            amount: Math.max(
                              vaultState.contributionRange.min,
                              Math.min(vaultState.contributionRange.max, Math.round(vaultContributionAmount)),
                            ),
                          })
                        }
                        type="button"
                      >
                        Lock contribution
                      </button>
                    </>
                  ) : (
                    <div className={styles.choiceRail}>
                      {room.seats
                        .filter((seat) => seat.seatId !== ownedSeat?.seatId)
                        .map((seat) => (
                          <button
                            className="button"
                            disabled={!vaultCanAct || isBusy}
                            key={seat.seatId}
                            onClick={() =>
                              void sendAction({
                                type: "vault.accuse",
                                targetSeatId: seat.seatId,
                              })
                            }
                            type="button"
                          >
                            Accuse {seat.displayName}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              ) : null}

              {settlementState ? (
                <div className={styles.actionGrid}>
                  {settlementState.phase === "pledge" ? (
                    <>
                      <label className={styles.joinField}>
                        <span>Pledge</span>
                        <input
                          className={styles.joinInput}
                          max={settlementMaxContribution}
                          min={0}
                          onChange={(event) => setSettlementPledgeAmount(Number(event.target.value))}
                          type="number"
                          value={settlementPledgeAmount}
                        />
                      </label>
                      <label className={styles.joinField}>
                        <span>Stance</span>
                        <select
                          className={styles.joinInput}
                          onChange={(event) =>
                            setSettlementStance(event.target.value as (typeof settlementStances)[number])
                          }
                          value={settlementStance}
                        >
                          {settlementStances.map((stance) => (
                            <option key={stance} value={stance}>
                              {stance}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        className="button primary"
                        disabled={!settlementCanAct || isBusy}
                        onClick={() =>
                          void sendAction({
                            type: "settlement.pledge",
                            pledge: Math.max(0, Math.min(settlementMaxContribution, Math.round(settlementPledgeAmount))),
                            stance: settlementStance,
                          })
                        }
                        type="button"
                      >
                        Broadcast pledge
                      </button>
                    </>
                  ) : (
                    <>
                      <label className={styles.joinField}>
                        <span>Commitment</span>
                        <input
                          className={styles.joinInput}
                          max={settlementMaxContribution}
                          min={0}
                          onChange={(event) => setSettlementCommitAmount(Number(event.target.value))}
                          type="number"
                          value={settlementCommitAmount}
                        />
                      </label>
                      <button
                        className="button primary"
                        disabled={!settlementCanAct || isBusy}
                        onClick={() =>
                          void sendAction({
                            type: "settlement.commit",
                            contribution: Math.max(0, Math.min(settlementMaxContribution, Math.round(settlementCommitAmount))),
                          })
                        }
                        type="button"
                      >
                        Lock commitment
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </section>

          <section className={`panel panel-subtle ${styles.nextPanel}`}>
            <div className="stack">
              <div>
                <span className={styles.focusEyebrow}>After the room</span>
                <h2 className={styles.nextTitle}>
                  {room.phase === "results" ? "Move into the public readout." : "Keep the next step one click away."}
                </h2>
                <p className="muted">
                  Results, leaderboard movement, and payout stubs are connected already. The inspector stays here only
                  when you need to audit the live state.
                </p>
              </div>
              <div className={styles.quickLinkRail}>
                <Link className="button primary" href={`/results/${room.roomId}`}>
                  {room.phase === "results" ? "Open result" : "Result view"}
                </Link>
                <Link className="button" href="/leaderboard">
                  Leaderboard
                </Link>
                <Link className="button" href="/payments">
                  Payments
                </Link>
              </div>
            </div>
          </section>

          <details className={styles.inspector}>
            <summary className={styles.inspectorSummary}>
              <div>
                <span className={styles.focusEyebrow}>Inspector</span>
                <strong className={styles.inspectorTitle}>Live telemetry and public state</strong>
              </div>
              <span className="pill subtle">advanced</span>
            </summary>

            <div className={styles.inspectorBody}>
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
          </details>
        </aside>
      </section>
    </div>
  );
}

function getCurrentTurnSeatId(room: PublicRoomState): string | undefined {
  if (room.phase === "lobby") {
    return undefined;
  }

  if (isAuctionRoom(room)) {
    return room.publicState.currentTurnSeatId;
  }

  if (isSplitRoom(room)) {
    return room.publicState.phase === "offer"
      ? room.publicState.proposerSeatId
      : room.publicState.responderSeatId;
  }

  if (isSettlementRoom(room)) {
    return room.publicState.currentTurnSeatId;
  }

  return undefined;
}

function describePosterState(room: PublicRoomState, ownedSeatId?: string): string {
  if (room.phase === "lobby") {
    return ownedSeatId
      ? "Your mask is claimed, but the room is still waiting for every visible human mask to be claimed and marked ready before bidding should begin."
      : "Join the room, claim one open mask, and get every visible human seat ready before the live match starts.";
  }

  if (room.phase === "ready") {
    return ownedSeatId
      ? "All visible human masks are ready. Your first legal action will open the live match."
      : "All visible human masks are ready. The next player action will open the live match.";
  }

  if (isAuctionRoom(room)) {
    return `Round ${room.publicState.currentRound}/${room.publicState.totalRounds} · prize ${room.publicState.currentRoundPrizeValue} · bid ${room.publicState.currentBid}/${AUCTION_MAX_BID} · pot ${room.publicState.currentPot} · ${room.publicState.roundTurnsRemaining} round turns left.`;
  }

  if (isSplitRoom(room)) {
    return room.publicState.narrative;
  }

  if (isPactRoom(room)) {
    return room.publicState.status;
  }

  if (isVaultRoom(room)) {
    return `${room.publicState.phase.replace(/_/g, " ")} · ${room.publicState.contributionStatus.submitted}/${room.publicState.contributionStatus.total} contributions · ${room.publicState.accusationStatus.submitted}/${room.publicState.accusationStatus.total} accusations.`;
  }

  if (isSettlementRoom(room)) {
    return `${room.publicState.currentRound.title} · stability ${room.publicState.stability} · ${ownedSeatId ? `current turn ${room.publicState.currentTurnSeatId ?? "reveal"}` : "watch the room cycle"}.`;
  }

  return `${labelGame(room.game)} live room`;
}

function describePosterSubcopy(room: PublicRoomState, ownedSeatId?: string): string {
  if (room.phase === "lobby") {
    return ownedSeatId
      ? "Joining a room and claiming a mask does not reveal which occupied seats are human or model-backed. Public play begins only after the visible human seats are ready."
      : "You can see which masks are open to claim, but the room never labels whether occupied seats are human or LLM-backed.";
  }

  if (isAuctionRoom(room)) {
    return ownedSeatId
      ? `Each seat started with ${room.publicState.startingBankroll} credits. Passing only removes you from this round. Final standing is prizes won minus total credits spent across all ${room.publicState.totalRounds} rounds.`
      : `Each seat starts with ${room.publicState.startingBankroll} credits, the room auctions ${room.publicState.totalRounds} prizes in sequence, and passing only removes a seat from the current round.`;
  }

  if (isSplitRoom(room)) {
    return ownedSeatId
      ? "The proposer sets the responder share. The responder can accept or burn the pot."
      : "Join to take one side of the negotiation chamber.";
  }

  if (isPactRoom(room)) {
    return "Both seats commit in secret. The room only reveals the outcome once both choices lock.";
  }

  if (isVaultRoom(room)) {
    return "Contributions stay hidden until the pool is revealed. Then the room accuses the weakest contributor.";
  }

  if (isSettlementRoom(room)) {
    return "Public pledges and private commitments resolve one crisis at a time across the village board.";
  }

  return "Occupied masks remain identity-blinded throughout the room.";
}

function describeControlsCopy(room: PublicRoomState): string {
  if (room.phase === "lobby") {
    return "Controls unlock after the visible human masks are claimed and marked ready.";
  }

  switch (room.game) {
    case "auction":
      return `When your mask owns the turn, raise this round's total bid by at least ${AUCTION_MIN_INCREMENT} credit or pass out of the current round. Your button amount is your full committed bid for this round, not an extra add-on.`;
    case "split":
      return "Offer when you are proposer. Accept or reject when you are responder.";
    case "pact":
      return "Choose cooperate or betray once per round. The room reveals both choices together.";
    case "vault":
      return "Contribute during the pool phase, then accuse a different seat once the vault is revealed.";
    case "settlement":
      return "Make a public pledge on your turn, then return to lock a hidden commitment in the commit phase.";
    default:
      return "Controls unlock only when your claimed mask can act.";
  }
}

function describeActionStatus(
  room: PublicRoomState,
  ownedSeatId?: string,
  ownedSeat?: PublicSeatView | null,
): string {
  if (!ownedSeatId) {
    return "Join and claim a mask to unlock room actions.";
  }

  if (room.phase === "results") {
    return "Match complete. Move into the result surface when you are ready.";
  }

  if (!ownedSeat?.isReady) {
    return "Claimed mask. Mark ready to enter.";
  }

  if (room.phase === "lobby") {
    return "Waiting for the remaining visible human masks to claim and ready.";
  }

  if (room.phase === "ready") {
    return "All visible human masks are ready. Your first move opens the match.";
  }

  if (isAuctionRoom(room)) {
    return room.publicState.currentTurnSeatId === ownedSeatId
      ? `Your round ${room.publicState.currentRound} bid is live.`
      : `Waiting on ${room.publicState.currentTurnSeatId ?? "the room"} in round ${room.publicState.currentRound}.`;
  }

  if (isSplitRoom(room)) {
    const ownerSeatId =
      room.publicState.phase === "offer" ? room.publicState.proposerSeatId : room.publicState.responderSeatId;
    return ownerSeatId === ownedSeatId
      ? `Your ${room.publicState.phase === "offer" ? "offer" : "response"} is live.`
      : `Waiting on ${ownerSeatId ?? "the room"}.`;
  }

  if (isPactRoom(room)) {
    return room.publicState.phase === "choice_window"
      ? `Commitments locked: ${room.publicState.commitmentCount} of 2.`
      : "Pact round resolved.";
  }

  if (isVaultRoom(room)) {
    return room.publicState.phase === "contribution_window"
      ? `Contributions locked: ${room.publicState.contributionStatus.submitted} of ${room.publicState.contributionStatus.total}.`
      : `Accusations locked: ${room.publicState.accusationStatus.submitted} of ${room.publicState.accusationStatus.total}.`;
  }

  if (isSettlementRoom(room)) {
    return room.publicState.currentTurnSeatId === ownedSeatId
      ? `Your ${room.publicState.phase === "pledge" ? "pledge" : "commitment"} is live.`
      : `Waiting on ${room.publicState.currentTurnSeatId ?? "reveal"}.`;
  }

  return "Waiting on the room.";
}

function describePrimaryInstruction(
  room: PublicRoomState,
  options: { hasSession: boolean; ownedSeat?: PublicSeatView | null },
): string {
  if (!options.hasSession) {
    return "Join the room to take a mask.";
  }

  if (!options.ownedSeat) {
    return "Claim one open mask to enter the match.";
  }

  if (room.phase === "results") {
    return "The room is settled.";
  }

  return describeActionStatus(room, options.ownedSeat.seatId, options.ownedSeat);
}

function buildStageMetrics(
  room: PublicRoomState,
  openSeatCount: number,
  ownedSeat: PublicSeatView | null,
): Array<{ label: string; value: string }> {
  if (isAuctionRoom(room)) {
    const auctionOwnedSeat =
      ownedSeat ? room.publicState.seats.find((seat) => seat.seatId === ownedSeat.seatId) : null;

    return [
      {
        label: "Round",
        value: `${room.publicState.currentRound}/${room.publicState.totalRounds}`,
      },
      {
        label: "Prize",
        value: String(room.publicState.currentRoundPrizeValue),
      },
      {
        label: auctionOwnedSeat ? "Your bankroll" : "Open masks",
        value: auctionOwnedSeat ? String(auctionOwnedSeat.bankroll) : String(openSeatCount),
      },
      {
        label: "Live pulse",
        value: describeLivePulse(room),
      },
    ];
  }

  return [
    {
      label: "Phase",
      value: room.phase.replace(/_/g, " "),
    },
    {
      label: "Round",
      value: String(room.round),
    },
    {
      label: ownedSeat ? "Your mask" : "Open masks",
      value: ownedSeat ? ownedSeat.displayName : String(openSeatCount),
    },
    {
      label: "Live pulse",
      value: describeLivePulse(room),
    },
  ];
}

function describeLivePulse(room: PublicRoomState): string {
  if (room.phase === "lobby" || room.phase === "ready") {
    return room.phase;
  }

  if (isAuctionRoom(room)) {
    return `r${room.publicState.currentRound} · ${room.publicState.currentBid} bid`;
  }

  if (isSplitRoom(room)) {
    return room.publicState.phase;
  }

  if (isPactRoom(room)) {
    return `${room.publicState.commitmentCount}/2 locked`;
  }

  if (isVaultRoom(room)) {
    return room.publicState.phase === "contribution_window"
      ? `${room.publicState.contributionStatus.submitted}/${room.publicState.contributionStatus.total} in`
      : `${room.publicState.accusationStatus.submitted}/${room.publicState.accusationStatus.total} accuse`;
  }

  if (isSettlementRoom(room)) {
    return room.publicState.currentTurnSeatId ?? room.publicState.phase;
  }

  return labelGame(room.game);
}

import type { PublicRoomState } from "@arena/contracts";
import {
  AUCTION_ITEM_NAME,
  AUCTION_ITEM_VALUE,
  AUCTION_MAX_BID,
  AUCTION_MIN_INCREMENT,
  auctionBrief,
  auctionModule,
} from "@arena/game-auction";

export const visualThesis =
  "A masked exchange floor: theatrical, high-contrast, and tense enough to sell hidden human-vs-LLM multiplayer in a single screen.";

export const contentPlan = [
  "Hero: flagship multiplayer premise, live-room CTA, and blinded-seat board.",
  "Support: why Auction works as the ARENA demo and what information is intentionally public.",
  "Detail: operator path, room lifecycle, and what a player is actually deciding in real time.",
  "Final CTA: enter a live room or create one from the lobby.",
] as const;

export const interactionThesis = [
  "Slow ambient glows to make the page feel like a lit stage instead of a document.",
  "Seat halos and subtle scanlines so the hero reads like a live table with hidden identities.",
  "A dense action rail that points directly into the room flow instead of a dead-end marketing screen.",
] as const;

export const auctionSignals = [
  {
    label: "Seat count",
    value: auctionBrief.playerCountLabel,
    detail: "Enough seats for live bluffing, small enough for spectators to read the room.",
  },
  {
    label: "Opening item",
    value: `${AUCTION_ITEM_NAME} · value ${AUCTION_ITEM_VALUE}`,
    detail: "The room is racing over a shared prize, so every action is easy to follow on stream.",
  },
  {
    label: "Bid cadence",
    value: `+${AUCTION_MIN_INCREMENT} minimum`,
    detail: "Turns stay fast, readable, and brutal because every increase is public and irreversible.",
  },
  {
    label: "Action clock",
    value: `${Math.floor(auctionModule.timers.actionMs / 1000)} second turns`,
    detail: "Tension comes from short windows, not hidden menus or deep rules overhead.",
  },
] as const;

export const premiseColumns = [
  {
    title: "Blinded seats, real pressure",
    body:
      "Each seat is just a seat. The room never labels who is human, who is LLM-backed, or who is scripted. Players read timing, aggression, and restraint from public bids only.",
  },
  {
    title: "All-pay stakes",
    body:
      "This is not a clean winner-takes-all auction. Every bid burns capital whether you win or not, which creates visible risk and stronger behavioral data every round.",
  },
  {
    title: "Built for spectators",
    body:
      "One item, one live leader, one acting seat, and a visible pot. The state is legible enough for demos, streams, and benchmarking sessions without hidden UI complexity.",
  },
] as const;

export const operatorPath = [
  {
    step: "Create the room",
    detail: "Use the operator lobby to spin up a seeded Auction room with Seat 1 under human control and the remaining seats hidden.",
  },
  {
    step: "Open the live table",
    detail: "The room page becomes the command surface: current bid, current leader, turn owner, and blinded seat board.",
  },
  {
    step: "Play the room out",
    detail: "Pass or increase the bid. The runtime advances hidden LLM seats automatically until the match resolves and propagates into results, leaderboard, and payout flows.",
  },
] as const;

export const publicInfoRail = [
  "Current item name and reference value",
  "Current bid, total pot, and leading seat",
  "Which seat acts now and which seats have passed",
  "Seat readiness, connection state, and public score",
] as const;

export const hiddenInfoRail = [
  "Whether any seat is human or LLM-backed",
  "Prompt versions, model ids, or internal decision traces",
  "Private bankroll intent beyond the committed public bid",
  "Any backstage orchestration metadata used for benchmarking",
] as const;

export const stageSeats = [
  { seatId: "seat_1", displayName: "Seat 1", avatarId: "mask-amber", status: "Operator rail", emphasis: "human-controlled" },
  { seatId: "seat_2", displayName: "Seat 2", avatarId: "mask-cyan", status: "Identity blinded", emphasis: "unknown seat" },
  { seatId: "seat_3", displayName: "Seat 3", avatarId: "mask-rose", status: "Identity blinded", emphasis: "unknown seat" },
  { seatId: "seat_4", displayName: "Seat 4", avatarId: "mask-verdant", status: "Identity blinded", emphasis: "unknown seat" },
] as const;

export function findLiveAuctionRoom(rooms: PublicRoomState[]): PublicRoomState | null {
  return rooms.find((room) => room.game === "auction") ?? null;
}

export function getAuctionStatus(room: PublicRoomState | null) {
  if (!room) {
    return {
      label: "No live auction room detected",
      detail: "The page can still brief the game, but the operator lobby must create a room before the live flow is available.",
      ctaHref: "/lobby",
      ctaLabel: "Create a live auction room",
    };
  }

  return {
    label: `Live room ${room.roomId.slice(0, 8)}`,
    detail: `Phase ${room.phase} · round ${room.round} · ${room.seats.length} visible seats`,
    ctaHref: `/rooms/${room.roomId}`,
    ctaLabel: "Enter the live auction room",
  };
}

export function getSeatAccent(avatarId: string) {
  if (avatarId.includes("amber")) return "#f2c168";
  if (avatarId.includes("cyan")) return "#77d8ff";
  if (avatarId.includes("rose")) return "#ff8eb8";
  if (avatarId.includes("verdant")) return "#8ef0a8";
  return "#d8e2f6";
}

export { AUCTION_MAX_BID };

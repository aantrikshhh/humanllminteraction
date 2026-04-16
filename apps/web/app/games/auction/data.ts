import type { PublicRoomState } from "@arena/contracts";
import {
  AUCTION_MIN_INCREMENT,
  auctionModule,
} from "@arena/game-auction";

export const AUCTION_STARTING_BANKROLL = 20;
export const AUCTION_PRIZE_LADDER = [
  { round: 1, itemName: "Signal Relay", value: 12 },
  { round: 2, itemName: "Blackmail Ledger", value: 9 },
  { round: 3, itemName: "Embassy Cipher", value: 7 },
] as const;
export const AUCTION_ROUND_COUNT = AUCTION_PRIZE_LADDER.length;

export const visualThesis =
  "A masked exchange floor: theatrical, high-contrast, and tense enough to sell hidden human-vs-LLM multiplayer in a single screen.";

export const contentPlan = [
  "Hero: multi-round bankroll rules, live-room CTA, and blinded-seat board.",
  "Support: how the prize ladder works and why pass only ends your current round.",
  "Detail: what the table can see, what stays hidden, and how final net worth is scored.",
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
    value: "3-5 seats",
    detail: "Enough bodies for social pressure, still small enough for spectators to follow every decision.",
  },
  {
    label: "Bankroll",
    value: `${AUCTION_STARTING_BANKROLL} credits each`,
    detail: "Every seat starts with the same public budget and carries the remainder into the next round.",
  },
  {
    label: "Prize ladder",
    value: AUCTION_PRIZE_LADDER.map((prize) => prize.value).join(" / "),
    detail: "Three auctions run back to back, so overspending early makes later prizes harder to contest.",
  },
  {
    label: "Action clock",
    value: `${Math.floor(auctionModule.timers.actionMs / 1000)} second turns`,
    detail: "Each acting seat must raise by at least the minimum or pass out of the current round.",
  },
] as const;

export const premiseColumns = [
  {
    title: "Blinded seats, real pressure",
    body:
      "Each seat is just a seat. The room never labels who is human, who is LLM-backed, or who is scripted. Players read timing, aggression, and restraint from public bids only.",
  },
  {
    title: "Three rounds, one bankroll",
    body:
      "The match is not one vague brawl over one item. Every seat starts with 20 credits, the room auctions three prizes in sequence, and whatever you do not spend carries into the next round.",
  },
  {
    title: "Built for spectators",
    body:
      "Each round has one prize, one live leader, one acting seat, and one visible spend total. The table is easy to read, while the hidden identities still create uncertainty.",
  },
] as const;

export const operatorPath = [
  {
    step: "Create the room",
    detail: "Use the operator lobby to spin up a seeded Auction room with Seat 1 under human control and the remaining seats hidden.",
  },
  {
    step: "Open the live table",
    detail: "The room page becomes the command surface: current round, prize value, current leader, acting seat, and blinded seat board.",
  },
  {
    step: "Play the room out",
    detail: "In each round, raise by at least the minimum or pass out of that round only. After round three, the runtime settles final net worth and propagates the result into results, leaderboard, and payout flows.",
  },
] as const;

export const publicInfoRail = [
  "Current round, current prize, and prize value",
  "Current bid, round spend, and leading seat",
  "Which seat acts now and which seats have passed this round",
  "Seat readiness, connection state, and public score",
] as const;

export const hiddenInfoRail = [
  "Whether any seat is human or LLM-backed",
  "Prompt versions, model ids, or internal decision traces",
  "Private intent behind bankroll preservation or aggression",
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
      detail: "The rules are still readable here, but the lobby must create a room before the live multi-round table is available.",
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

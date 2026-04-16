import {
  AgentRuntimeRegistry,
  DeterministicFakeAgentAdapter,
} from "@arena/agents";
import {
  AUCTION_MAX_BID,
  AUCTION_MIN_INCREMENT,
  type AuctionAction,
  type AuctionPublicState,
} from "@arena/game-auction";

import type { RoomRecord } from "./runtime.js";
import { InMemoryRoomRuntime } from "./runtime.js";

const registry = new AgentRuntimeRegistry({
  fallbackAdapter: new DeterministicFakeAgentAdapter<AuctionPublicState, AuctionAction>({
    id: "auction-deterministic-fake",
    supportedGames: ["auction"],
    defaultModelId: "auction-deterministic-fake",
    defaultPromptVersionId: "auction-fake-v1",
  }),
});

export async function processAutomatedTurns(
  runtime: InMemoryRoomRuntime,
  roomId: string,
): Promise<void> {
  for (let guard = 0; guard < 32; guard += 1) {
    const room = runtime.getRoom(roomId);
    if (!room || room.phase === "results" || room.phase === "closed") {
      return;
    }

    if (room.game !== "auction") {
      return;
    }

    const publicState = room.publicState as AuctionPublicState;
    const currentTurnSeatId = publicState.currentTurnSeatId;
    if (!currentTurnSeatId) {
      return;
    }

    const seat = room.seats.find(
      (candidate) => candidate.publicSeat.seatId === currentTurnSeatId,
    );
    if (!seat || seat.privateSeat.backingType === "human") {
      return;
    }

    const availableActions = listAuctionActions(publicState);
    if (availableActions.length === 0) {
      return;
    }

    const outcome = await registry.requestMove({
      game: "auction",
      seatId: currentTurnSeatId,
      publicState,
      privateSeat: seat.privateSeat,
      availableActions,
      deadlineIso: new Date(Date.now() + 5_000).toISOString(),
    });

    runtime.handleClientMessage(roomId, {
      type: "room.action",
      seatId: currentTurnSeatId,
      payload: outcome.action,
    });
  }
}

function listAuctionActions(publicState: AuctionPublicState): AuctionAction[] {
  if (publicState.phase !== "bidding") {
    return [];
  }

  const nextBid = publicState.currentBid + AUCTION_MIN_INCREMENT;
  const mediumBid = Math.min(AUCTION_MAX_BID, nextBid + AUCTION_MIN_INCREMENT * 2);
  const highBid = Math.min(AUCTION_MAX_BID, nextBid + AUCTION_MIN_INCREMENT * 5);

  const actions: AuctionAction[] = [{ type: "auction.pass" }];

  for (const amount of [nextBid, mediumBid, highBid]) {
    if (
      Number.isInteger(amount) &&
      amount >= nextBid &&
      amount <= AUCTION_MAX_BID &&
      !actions.some(
        (candidate) => candidate.type === "auction.bid" && candidate.amount === amount,
      )
    ) {
      actions.push({
        type: "auction.bid",
        amount,
      });
    }
  }

  return actions;
}

export function isAutomationCandidate(room: RoomRecord | undefined): boolean {
  if (!room || room.game !== "auction" || room.phase === "results" || room.phase === "closed") {
    return false;
  }

  const publicState = room.publicState as AuctionPublicState;
  return Boolean(publicState.currentTurnSeatId);
}

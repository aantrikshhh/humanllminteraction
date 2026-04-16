import {
  AgentRuntimeRegistry,
  DeterministicFakeAgentAdapter,
  OpenAIResponsesAgentAdapter,
} from "@arena/agents";
import {
  AUCTION_MAX_BID,
  AUCTION_MIN_INCREMENT,
  type AuctionAction,
  type AuctionPublicState,
} from "@arena/game-auction";
import type { PactAction, PactPrivateState, PactPublicState } from "@arena/game-pact";
import type { SettlementAction, SettlementPrivateState, SettlementPublicState } from "@arena/game-settlement";
import type { SplitAction, SplitPrivateState, SplitPublicState } from "@arena/game-split";
import type { VaultAction, VaultPrivateState, VaultPublicState } from "@arena/game-vault";
import type { PrivateSeatMetadata, SeatAssignment, SeatId } from "@arena/contracts";

import type { RoomRecord } from "./runtime.js";
import { InMemoryRoomRuntime } from "./runtime.js";

const deterministicAdapter = new DeterministicFakeAgentAdapter({
  id: "arena-deterministic-fake",
  supportedGames: ["auction", "split", "pact", "vault", "settlement"],
  defaultModelId: "arena-deterministic-fake",
  defaultPromptVersionId: "arena-fake-v1",
});

const liveOpenAiAdapter = createOpenAiAdapter();

const registry = new AgentRuntimeRegistry({
  adapters: liveOpenAiAdapter ? [liveOpenAiAdapter] : [],
  fallbackAdapter: deterministicAdapter,
});

type AutomationPlan =
  | {
      game: "auction";
      seatId: SeatId;
      publicState: AuctionPublicState;
      availableActions: AuctionAction[];
    }
  | {
      game: "split";
      seatId: SeatId;
      publicState: SplitPublicState;
      availableActions: SplitAction[];
    }
  | {
      game: "pact";
      seatId: SeatId;
      publicState: PactPublicState;
      availableActions: PactAction[];
    }
  | {
      game: "vault";
      seatId: SeatId;
      publicState: VaultPublicState;
      availableActions: VaultAction[];
    }
  | {
      game: "settlement";
      seatId: SeatId;
      publicState: SettlementPublicState;
      availableActions: SettlementAction[];
    };

export async function processAutomatedTurns(
  runtime: InMemoryRoomRuntime,
  roomId: string,
): Promise<void> {
  for (let guard = 0; guard < 96; guard += 1) {
    const room = runtime.getRoom(roomId);
    if (!room || room.phase === "results" || room.phase === "closed") {
      return;
    }

    const plan = getAutomationPlan(room);
    if (!plan) {
      return;
    }

    const seat = room.seats.find(
      (candidate) => candidate.publicSeat.seatId === plan.seatId,
    );
    if (!seat || seat.privateSeat.backingType === "human") {
      return;
    }

    const outcome = await requestAutomatedMove(plan, seat.privateSeat);

    runtime.handleClientMessage(roomId, {
      type: "room.action",
      seatId: plan.seatId,
      payload: outcome.action,
    });
  }
}

export function isAutomationCandidate(room: RoomRecord | undefined): boolean {
  if (
    !room ||
    room.phase === "lobby" ||
    room.phase === "results" ||
    room.phase === "closed"
  ) {
    return false;
  }

  return Boolean(getAutomationPlan(room));
}

function getAutomationPlan(room: RoomRecord): AutomationPlan | null {
  switch (room.game) {
    case "auction":
      return getAuctionPlan(room);
    case "split":
      return getSplitPlan(room);
    case "pact":
      return getPactPlan(room);
    case "vault":
      return getVaultPlan(room);
    case "settlement":
      return getSettlementPlan(room);
    default:
      return null;
  }
}

function getAuctionPlan(room: RoomRecord): AutomationPlan | null {
  const publicState = room.publicState as AuctionPublicState;
  const currentTurnSeatId = publicState.currentTurnSeatId;
  if (!currentTurnSeatId) {
    return null;
  }

  if (!isAutomatedSeat(room.seats, currentTurnSeatId)) {
    return null;
  }

  const availableActions = listAuctionActions(publicState);
  if (availableActions.length === 0) {
    return null;
  }

  return {
    game: "auction",
    seatId: currentTurnSeatId,
    publicState,
    availableActions,
  };
}

function getSplitPlan(room: RoomRecord): AutomationPlan | null {
  const state = room.gameState as SplitPrivateState | undefined;
  if (!state || state.phase === "settled") {
    return null;
  }

  const actingSeatId =
    state.phase === "offer" ? state.proposerSeatId : state.responderSeatId;
  if (!isAutomatedSeat(room.seats, actingSeatId)) {
    return null;
  }

  const publicState = room.publicState as SplitPublicState;
  const availableActions: SplitAction[] =
    state.phase === "offer"
      ? buildSplitOfferActions(state)
      : [{ type: "split.accept" }, { type: "split.reject" }];

  if (availableActions.length === 0) {
    return null;
  }

  return {
    game: "split",
    seatId: actingSeatId,
    publicState,
    availableActions,
  };
}

function getPactPlan(room: RoomRecord): AutomationPlan | null {
  const state = room.gameState as PactPrivateState | undefined;
  if (!state || state.phase === "match_complete") {
    return null;
  }

  const seatId = state.seatOrder.find(
    (candidate) =>
      typeof state.pendingChoices[candidate] === "undefined" &&
      isAutomatedSeat(room.seats, candidate),
  );

  if (!seatId) {
    return null;
  }

  return {
    game: "pact",
    seatId,
    publicState: room.publicState as PactPublicState,
    availableActions: [
      { type: "pact.choose", choice: "cooperate" },
      { type: "pact.choose", choice: "betray" },
    ],
  };
}

function getVaultPlan(room: RoomRecord): AutomationPlan | null {
  const state = room.gameState as VaultPrivateState | undefined;
  if (!state || state.phase === "match_complete") {
    return null;
  }

  if (state.phase === "contribution_window") {
    const seatId = state.seatOrder.find(
      (candidate) =>
        typeof state.currentRound.contributions[candidate] === "undefined" &&
        isAutomatedSeat(room.seats, candidate),
    );

    if (!seatId) {
      return null;
    }

    return {
      game: "vault",
      seatId,
      publicState: room.publicState as VaultPublicState,
      availableActions: buildVaultContributionActions(state),
    };
  }

  const seatId = state.seatOrder.find(
    (candidate) =>
      typeof state.currentRound.accusations[candidate] === "undefined" &&
      isAutomatedSeat(room.seats, candidate),
  );

  if (!seatId) {
    return null;
  }

  return {
    game: "vault",
    seatId,
    publicState: room.publicState as VaultPublicState,
    availableActions: state.seatOrder
      .filter((candidate) => candidate !== seatId)
      .map((targetSeatId) => ({
        type: "vault.accuse" as const,
        targetSeatId,
      })),
  };
}

function getSettlementPlan(room: RoomRecord): AutomationPlan | null {
  const state = room.gameState as SettlementPrivateState | undefined;
  if (!state || state.phase === "settled" || !state.currentTurnSeatId) {
    return null;
  }

  if (!isAutomatedSeat(room.seats, state.currentTurnSeatId)) {
    return null;
  }

  const actingSeat = state.seats.find(
    (candidate) => candidate.seatId === state.currentTurnSeatId,
  );
  const round = state.rounds[state.roundIndex];
  if (!actingSeat || !round) {
    return null;
  }

  const maxContribution = Math.min(
    round.config.maxContributionPerSeat,
    actingSeat.suppliesRemaining,
  );

  if (state.phase === "pledge") {
    const availableActions: SettlementAction[] = [];
    for (let pledge = 0; pledge <= maxContribution; pledge += 1) {
      for (const stance of ["fortify", "trade", "appease"] as const) {
        availableActions.push({
          type: "settlement.pledge",
          pledge,
          stance,
        });
      }
    }

    return {
      game: "settlement",
      seatId: state.currentTurnSeatId,
      publicState: room.publicState as SettlementPublicState,
      availableActions,
    };
  }

  return {
    game: "settlement",
    seatId: state.currentTurnSeatId,
    publicState: room.publicState as SettlementPublicState,
    availableActions: Array.from({ length: maxContribution + 1 }, (_, contribution) => ({
      type: "settlement.commit" as const,
      contribution,
    })),
  };
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

function buildSplitOfferActions(state: SplitPrivateState): SplitAction[] {
  const values = uniqueIntegers([
    0,
    Math.round(state.config.potTotal * 0.25),
    Math.round(state.config.potTotal * 0.4),
    Math.round(state.config.potTotal * 0.5),
    Math.round(state.config.potTotal * 0.7),
    state.config.potTotal,
  ]).filter((amount) => amount >= 0 && amount <= state.config.potTotal);

  return values.map((amount) => ({
    type: "split.offer",
    amount,
  }));
}

function buildVaultContributionActions(state: VaultPrivateState): VaultAction[] {
  const max = state.config.endowmentPerRound;
  return uniqueIntegers([0, Math.floor(max / 3), Math.floor((max * 2) / 3), max]).map(
    (amount) => ({
      type: "vault.contribute",
      amount,
    }),
  );
}

function isAutomatedSeat(seats: SeatAssignment[], seatId: SeatId): boolean {
  const seat = seats.find((candidate) => candidate.publicSeat.seatId === seatId);
  return Boolean(seat && seat.privateSeat.backingType !== "human");
}

function uniqueIntegers(values: number[]): number[] {
  return [...new Set(values.map((value) => Math.round(value)))].sort((left, right) => left - right);
}

function requestAutomatedMove(
  plan: AutomationPlan,
  privateSeat: PrivateSeatMetadata,
) {
  const deadlineIso = new Date(Date.now() + 5_000).toISOString();
  const adapterId = resolveAdapterId(privateSeat);

  switch (plan.game) {
    case "auction":
      return registry.requestMove({
        game: plan.game,
        seatId: plan.seatId,
        publicState: plan.publicState,
        privateSeat,
        availableActions: plan.availableActions,
        deadlineIso,
      }, { adapterId });
    case "split":
      return registry.requestMove({
        game: plan.game,
        seatId: plan.seatId,
        publicState: plan.publicState,
        privateSeat,
        availableActions: plan.availableActions,
        deadlineIso,
      }, { adapterId });
    case "pact":
      return registry.requestMove({
        game: plan.game,
        seatId: plan.seatId,
        publicState: plan.publicState,
        privateSeat,
        availableActions: plan.availableActions,
        deadlineIso,
      }, { adapterId });
    case "vault":
      return registry.requestMove({
        game: plan.game,
        seatId: plan.seatId,
        publicState: plan.publicState,
        privateSeat,
        availableActions: plan.availableActions,
        deadlineIso,
      }, { adapterId });
    case "settlement":
      return registry.requestMove({
        game: plan.game,
        seatId: plan.seatId,
        publicState: plan.publicState,
        privateSeat,
        availableActions: plan.availableActions,
        deadlineIso,
      }, { adapterId });
    default:
      throw new Error("Unsupported automation game plan");
  }
}

function createOpenAiAdapter() {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return null;
  }

  try {
    return new OpenAIResponsesAgentAdapter({
      id: "arena-openai-live",
      supportedGames: ["auction", "split", "pact", "vault", "settlement"],
      defaultPromptVersionId: "arena-openai-v1",
      reasoningEffort: normalizeReasoningEffort(process.env.OPENAI_REASONING_EFFORT),
    });
  } catch {
    return null;
  }
}

function resolveAdapterId(privateSeat: PrivateSeatMetadata): string | undefined {
  if (privateSeat.backingType === "llm" && liveOpenAiAdapter) {
    return liveOpenAiAdapter.id;
  }

  if (privateSeat.backingType === "scripted") {
    return deterministicAdapter.id;
  }

  return undefined;
}

function normalizeReasoningEffort(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high" || normalized === "xhigh") {
    return normalized;
  }

  return undefined;
}

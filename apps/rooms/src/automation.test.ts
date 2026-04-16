import assert from "node:assert/strict";
import test from "node:test";

import type { PactPrivateState } from "@arena/game-pact";
import type { SettlementPrivateState } from "@arena/game-settlement";
import type { SplitPrivateState } from "@arena/game-split";
import type { VaultPrivateState } from "@arena/game-vault";

import { isAutomationCandidate, processAutomatedTurns } from "./automation.js";
import { InMemoryRoomRuntime } from "./runtime.js";

test("automation stays idle while a lobby room is still waiting for a human claim", () => {
  const runtime = new InMemoryRoomRuntime(() => "2026-04-16T12:00:00.000Z");

  for (const game of ["split", "pact", "vault", "auction", "settlement"] as const) {
    const room = runtime.createRoom({
      game,
      seats:
        game === "split" || game === "pact"
          ? [
              { displayName: "Human", avatarId: "human", backingType: "human" },
              { displayName: "Model", avatarId: "model", backingType: "llm" },
            ]
          : [
              { displayName: "Human", avatarId: "human", backingType: "human" },
              { displayName: "Model Two", avatarId: "model-2", backingType: "llm" },
              { displayName: "Model Three", avatarId: "model-3", backingType: "llm" },
              ...(game === "settlement" ? [] : [{ displayName: "Model Four", avatarId: "model-4", backingType: "scripted" as const }]),
            ],
    });

    assert.equal(room.phase, "lobby");
    assert.equal(isAutomationCandidate(runtime.getRoom(room.roomId)), false);
  }
});

test("split automation resolves the hidden responder and advances to the next human decision", async () => {
  const runtime = new InMemoryRoomRuntime(() => "2026-04-16T12:00:00.000Z");
  const room = runtime.createRoom({
    game: "split",
    seats: [
      { displayName: "Human", avatarId: "human", backingType: "human" },
      { displayName: "Model", avatarId: "model", backingType: "llm" },
    ],
  });

  const sessionId = claimSeat(runtime, room.roomId, "seat_1");
  runtime.handleClientMessage(room.roomId, {
    type: "room.action",
    seatId: "seat_1",
    sessionId,
    payload: { type: "split.offer", amount: 25 },
  });

  await processAutomatedTurns(runtime, room.roomId);

  const state = runtime.getRoom(room.roomId)?.gameState as SplitPrivateState | undefined;
  assert.ok(state);
  assert.equal(state.phase, "response");
  assert.equal(state.roundIndex, 1);
  assert.equal(state.proposerSeatId, "seat_2");
  assert.equal(state.responderSeatId, "seat_1");
  assert.equal(state.history.length, 1);
  assert.ok(state.pendingOffer);
});

test("pact automation commits the hidden choice, resolves the round, and leaves the next decision to the human seat", async () => {
  const runtime = new InMemoryRoomRuntime(() => "2026-04-16T12:00:00.000Z");
  const room = runtime.createRoom({
    game: "pact",
    seats: [
      { displayName: "Human", avatarId: "human", backingType: "human" },
      { displayName: "Model", avatarId: "model", backingType: "llm" },
    ],
  });

  const sessionId = claimSeat(runtime, room.roomId, "seat_1");
  runtime.handleClientMessage(room.roomId, {
    type: "room.action",
    seatId: "seat_1",
    sessionId,
    payload: { type: "pact.choose", choice: "cooperate" },
  });

  await processAutomatedTurns(runtime, room.roomId);

  const state = runtime.getRoom(room.roomId)?.gameState as PactPrivateState | undefined;
  assert.ok(state);
  assert.equal(state.phase, "choice_window");
  assert.equal(state.history.length, 1);
  assert.equal(state.pendingChoices["seat_1"], undefined);
  assert.ok(state.pendingChoices["seat_2"]);
});

test("vault automation fills hidden contributions and accusations until the next human accusation", async () => {
  const runtime = new InMemoryRoomRuntime(() => "2026-04-16T12:00:00.000Z");
  const room = runtime.createRoom({
    game: "vault",
    seats: [
      { displayName: "Human", avatarId: "human", backingType: "human" },
      { displayName: "Model Two", avatarId: "model-2", backingType: "llm" },
      { displayName: "Model Three", avatarId: "model-3", backingType: "llm" },
      { displayName: "Model Four", avatarId: "model-4", backingType: "llm" },
    ],
  });

  const sessionId = claimSeat(runtime, room.roomId, "seat_1");
  runtime.handleClientMessage(room.roomId, {
    type: "room.action",
    seatId: "seat_1",
    sessionId,
    payload: { type: "vault.contribute", amount: 100 },
  });

  await processAutomatedTurns(runtime, room.roomId);

  const state = runtime.getRoom(room.roomId)?.gameState as VaultPrivateState | undefined;
  assert.ok(state);
  assert.equal(state.phase, "accusation_window");
  assert.equal(Object.keys(state.currentRound.contributions).length, 4);
  assert.equal(Object.keys(state.currentRound.accusations).length, 3);
  assert.equal(state.currentRound.accusations["seat_1"], undefined);
  assert.equal(state.completedRounds.length, 0);
});

test("settlement automation resolves hidden pledges and commitments through the next human turn", async () => {
  const runtime = new InMemoryRoomRuntime(() => "2026-04-16T12:00:00.000Z");
  const room = runtime.createRoom({
    game: "settlement",
    seats: [
      { displayName: "Human", avatarId: "human", backingType: "human" },
      { displayName: "Model Two", avatarId: "model-2", backingType: "llm" },
      { displayName: "Model Three", avatarId: "model-3", backingType: "llm" },
    ],
  });

  const sessionId = claimSeat(runtime, room.roomId, "seat_1");
  runtime.handleClientMessage(room.roomId, {
    type: "room.action",
    seatId: "seat_1",
    sessionId,
    payload: { type: "settlement.pledge", pledge: 1, stance: "trade" },
  });

  await processAutomatedTurns(runtime, room.roomId);

  let state = runtime.getRoom(room.roomId)?.gameState as SettlementPrivateState | undefined;
  assert.ok(state);
  assert.equal(state.phase, "commit");
  assert.equal(state.currentTurnSeatId, "seat_1");
  assert.equal(Object.keys(state.rounds[0]?.pledges ?? {}).length, 3);

  runtime.handleClientMessage(room.roomId, {
    type: "room.action",
    seatId: "seat_1",
    sessionId,
    payload: { type: "settlement.commit", contribution: 1 },
  });

  await processAutomatedTurns(runtime, room.roomId);

  state = runtime.getRoom(room.roomId)?.gameState as SettlementPrivateState | undefined;
  assert.ok(state);
  assert.equal(state.phase, "pledge");
  assert.equal(state.roundIndex, 1);
  assert.equal(state.currentTurnSeatId, "seat_1");
  assert.equal(state.rounds[0]?.phase, "resolved");
  assert.equal(state.rounds[0]?.totalContribution !== undefined, true);
});

function claimSeat(
  runtime: InMemoryRoomRuntime,
  roomId: string,
  seatId: `seat_${number}`,
): string {
  const session = runtime.createOrRefreshSession(roomId, {
    displayName: "Arena Guest",
  }).session;
  runtime.claimSeat(roomId, session.sessionId, seatId);
  return session.sessionId;
}

import assert from "node:assert/strict";
import test from "node:test";

import type { SeatAssignment } from "@arena/contracts";
import {
  PACT_PAYOFF_MATRIX,
  pactModule,
  type PactChoice,
  type PactPrivateState,
} from "@arena/game-pact";

function makeSeat(id: string, name: string): SeatAssignment {
  return {
    publicSeat: {
      seatId: id,
      displayName: name,
      avatarId: `${id}-avatar`,
      isConnected: true,
      isReady: true,
    },
    privateSeat: {
      seatId: id,
      backingType: id === "a" ? "human" : "llm",
    },
  };
}

const seats = [makeSeat("a", "Seat A"), makeSeat("b", "Seat B")];

function reduceChoice(
  state: PactPrivateState,
  seatId: "a" | "b",
  choice: PactChoice,
  nowIso: string,
): PactPrivateState {
  return pactModule.reduce(
    {
      seed: "pact-regression",
      nowIso,
      state,
      seats,
    },
    {
      seatId,
      submittedAt: nowIso,
      action: { type: "pact.choose", choice },
    },
  ).nextState;
}

test("keeps pending commitments hidden until both seats lock choices", () => {
  const initialState = pactModule.createInitialState("pact-hidden-rail", seats);

  const afterFirstChoice = reduceChoice(initialState, "a", "cooperate", "2026-04-16T10:00:00.000Z");
  const publicState = pactModule.projectPublicState(afterFirstChoice);

  assert.equal(publicState.commitmentCount, 1);
  assert.equal(publicState.history.length, 0);
  assert.equal(publicState.status, "Round 1 of 15. Choices stay hidden until both seats commit.");
  assert.equal("pendingChoices" in (publicState as Record<string, unknown>), false);
  assert.equal("choices" in (publicState as Record<string, unknown>), false);
});

test("rejects duplicate commitments from the same seat within a round", () => {
  const initialState = pactModule.createInitialState("pact-duplicate", seats);
  const afterFirstChoice = reduceChoice(initialState, "a", "cooperate", "2026-04-16T10:00:00.000Z");

  assert.throws(
    () =>
      pactModule.validateAction(
        {
          seed: "pact-duplicate",
          nowIso: "2026-04-16T10:00:01.000Z",
          state: afterFirstChoice,
          seats,
        },
        {
          seatId: "a",
          submittedAt: "2026-04-16T10:00:01.000Z",
          action: { type: "pact.choose", choice: "betray" },
        },
      ),
    /already committed a choice/,
  );
});

test("resolves payoffs and terminal strategy summaries consistently", () => {
  let state = pactModule.createInitialState("pact-terminal", seats);
  let now = new Date("2026-04-16T11:00:00.000Z").getTime();

  const rounds: Array<[PactChoice, PactChoice]> = [
    ["cooperate", "cooperate"],
    ["cooperate", "betray"],
    ["betray", "betray"],
    ...Array.from({ length: 12 }, () => ["betray", "betray"] as const),
  ];

  for (const [aChoice, bChoice] of rounds) {
    state = reduceChoice(state, "a", aChoice, new Date(now).toISOString());
    now += 500;
    state = reduceChoice(state, "b", bChoice, new Date(now).toISOString());
    now += 500;
  }

  const publicState = pactModule.projectPublicState(state);

  assert.equal(publicState.phase, "match_complete");
  assert.equal(publicState.history.length, 15);
  assert.deepEqual(publicState.history[0]?.payoffs, {
    a: PACT_PAYOFF_MATRIX.CC.seatA,
    b: PACT_PAYOFF_MATRIX.CC.seatB,
  });
  assert.deepEqual(publicState.history[1]?.payoffs, {
    a: PACT_PAYOFF_MATRIX.CB.seatA,
    b: PACT_PAYOFF_MATRIX.CB.seatB,
  });

  const seatASummary = publicState.strategySummary?.find((summary) => summary.seatId === "a");
  const seatBSummary = publicState.strategySummary?.find((summary) => summary.seatId === "b");

  assert.equal(seatASummary?.label, "tit_for_tat");
  assert.equal(seatBSummary?.label, "opportunist");
  assert.equal(seatASummary?.retaliationRate, 1);
  assert.equal(seatBSummary?.endgameBetrayalRate, 1);
});

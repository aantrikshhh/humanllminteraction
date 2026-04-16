import assert from "node:assert/strict";

import type { SeatAssignment } from "@arena/contracts";
import { pactModule } from "@arena/game-pact";

type PactChoice = "cooperate" | "betray";

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
      backingType: "scripted",
    },
  };
}

function runMatch(seed: string, rounds: Array<[aChoice: PactChoice, bChoice: PactChoice]>) {
  const seats = [makeSeat("a", "Seat A"), makeSeat("b", "Seat B")];
  let state = pactModule.createInitialState(seed, seats);
  let now = new Date("2026-04-16T00:00:00.000Z").getTime();

  for (const [aChoice, bChoice] of rounds) {
    state = pactModule.reduce(
      {
        seed,
        nowIso: new Date(now).toISOString(),
        state,
        seats,
      },
      {
        seatId: "a",
        submittedAt: new Date(now).toISOString(),
        action: { type: "pact.choose", choice: aChoice },
      },
    ).nextState;

    now += 500;

    state = pactModule.reduce(
      {
        seed,
        nowIso: new Date(now).toISOString(),
        state,
        seats,
      },
      {
        seatId: "b",
        submittedAt: new Date(now).toISOString(),
        action: { type: "pact.choose", choice: bChoice },
      },
    ).nextState;

    now += 500;
  }

  const publicState = pactModule.projectPublicState(state);
  const result = pactModule.finalizeMatch(state, {
    roomId: `room-${seed}`,
    matchId: `match-${seed}`,
    game: "pact",
    phase: "results",
    round: publicState.currentRound,
    seats: publicState.seats,
    publicState,
    lastEventAt: new Date(now).toISOString(),
  });

  return { publicState, result };
}

function getMetric(
  result: ReturnType<typeof runMatch>["result"],
  metricKey: string,
): string | number | boolean | undefined {
  return result.behavioralOutput.find((metric) => metric.metricKey === metricKey)?.value;
}

{
  const rounds = Array.from({ length: 15 }, () => ["cooperate", "betray"] as const);
  const { result } = runMatch("pact-always-extremes", rounds);

  assert.equal(getMetric(result, "pact.strategy_label.a"), "always_cooperate");
  assert.equal(getMetric(result, "pact.strategy_label.b"), "always_betray");
  assert.equal(getMetric(result, "pact.cooperation_rate.a"), 1);
  assert.equal(getMetric(result, "pact.cooperation_rate.b"), 0);
  assert.deepEqual(result.winningSeatIds, ["b"]);
}

{
  const rounds: Array<[PactChoice, PactChoice]> = [
    ["cooperate", "cooperate"],
    ["cooperate", "cooperate"],
    ["cooperate", "betray"],
    ...Array.from({ length: 12 }, () => ["betray", "cooperate"] as const),
  ];
  const { result } = runMatch("pact-grim-trigger", rounds);

  assert.equal(getMetric(result, "pact.strategy_label.a"), "grim_trigger");
  assert.equal(getMetric(result, "pact.retaliation_rate.a"), 1);
  assert.equal(getMetric(result, "pact.endgame_betrayal_rate.a"), 1);
  assert.deepEqual(result.winningSeatIds, ["a"]);
}

{
  const rounds: Array<[PactChoice, PactChoice]> = [
    ["cooperate", "cooperate"],
    ["cooperate", "betray"],
    ["cooperate", "cooperate"],
    ["cooperate", "cooperate"],
    ["cooperate", "betray"],
    ["cooperate", "cooperate"],
    ["betray", "cooperate"],
    ["cooperate", "cooperate"],
    ["cooperate", "betray"],
    ["cooperate", "cooperate"],
    ["cooperate", "cooperate"],
    ["cooperate", "cooperate"],
    ["cooperate", "cooperate"],
    ["cooperate", "cooperate"],
    ["cooperate", "cooperate"],
  ];
  const { result } = runMatch("pact-forgiving-cooperator", rounds);

  assert.equal(getMetric(result, "pact.strategy_label.a"), "cooperative");
  assert.equal(getMetric(result, "pact.forgiveness_rate.a"), 1);
  assert.equal(getMetric(result, "pact.endgame_betrayal_rate.a"), 0);
  assert.equal(getMetric(result, "pact.mutual_cooperation_rate"), 0.733);
}

console.log("pact strategy simulations passed");

import type { PublicRoomState, SeatAssignment } from "@arena/contracts";
import type {
  PactChoice,
  PactPublicRoomState,
  PactPublicState,
  PactStrategySummary,
} from "@arena/game-pact";
import { PACT_TOTAL_ROUNDS, pactBrief, pactModule } from "@arena/game-pact";

function makeSeat(
  seatId: string,
  displayName: string,
  avatarId: string,
  backingType: SeatAssignment["privateSeat"]["backingType"],
): SeatAssignment {
  return {
    publicSeat: {
      seatId,
      displayName,
      avatarId,
      isConnected: true,
      isReady: true,
    },
    privateSeat: {
      seatId,
      backingType,
    },
  };
}

function buildState(
  seed: string,
  rounds: Array<[seatAChoice: PactChoice, seatBChoice: PactChoice]>,
  pendingSeat?: { seatId: string; choice: PactChoice },
): PactPublicState {
  const seats = [
    makeSeat("seat_a", "Seat A", "mask-amber", "human"),
    makeSeat("seat_b", "Seat B", "mask-cyan", "llm"),
  ];

  let state = pactModule.createInitialState(seed, seats);
  let now = new Date("2026-04-16T12:00:00.000Z").getTime();

  for (const [seatAChoice, seatBChoice] of rounds) {
    state = pactModule.reduce(
      {
        seed,
        nowIso: new Date(now).toISOString(),
        state,
        seats,
      },
      {
        seatId: "seat_a",
        submittedAt: new Date(now).toISOString(),
        action: { type: "pact.choose", choice: seatAChoice },
      },
    ).nextState;
    now += 1_000;

    state = pactModule.reduce(
      {
        seed,
        nowIso: new Date(now).toISOString(),
        state,
        seats,
      },
      {
        seatId: "seat_b",
        submittedAt: new Date(now).toISOString(),
        action: { type: "pact.choose", choice: seatBChoice },
      },
    ).nextState;
    now += 1_000;
  }

  if (pendingSeat) {
    state = pactModule.reduce(
      {
        seed,
        nowIso: new Date(now).toISOString(),
        state,
        seats,
      },
      {
        seatId: pendingSeat.seatId,
        submittedAt: new Date(now).toISOString(),
        action: { type: "pact.choose", choice: pendingSeat.choice },
      },
    ).nextState;
  }

  return pactModule.projectPublicState(state);
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "n/a";
  }

  return `${Math.round(value * 100)}%`;
}

function findSummary(
  state: PactPublicState,
  seatId: string,
): PactStrategySummary | undefined {
  return state.strategySummary?.find((summary) => summary.seatId === seatId);
}

export const visualThesis =
  "a cold diplomatic chamber lit by a single shared trust ledger and two masked seats";

export const contentPlan = [
  "Poster hero with live trust-pressure signal.",
  "Three public metrics that explain the game immediately.",
  "Round filmstrip plus strategy fingerprints after the match.",
  "CTA into the lobby or a live room.",
];

export const interactionThesis = [
  "Hero behaves like a scoreboard wall, not a marketing card.",
  "Round filmstrip reads left to right like surveillance footage of trust collapse.",
  "Strategy badges make behavioral output feel productized instead of debug-shaped.",
];

export const operatorPath = [
  {
    step: "Create room",
    detail: "Spawn a two-seat Pact room from the lobby without exposing who is human or model-backed.",
  },
  {
    step: "Claim seat",
    detail: "A browser session claims one public seat and stays identity-blind to the other side.",
  },
  {
    step: "Lock choice",
    detail: "Each seat commits cooperate or betray. The room only publishes how many choices are in.",
  },
  {
    step: "Resolve round",
    detail: "When both commits land, the room reveals the outcome, updates scores, and advances instantly.",
  },
];

export const publicInfoRail = [
  "Round number and total horizon",
  "How many commitments are locked this round",
  "Resolved history with cumulative scores",
  "Seat display names, scores, and room readiness",
];

export const hiddenInfoRail = [
  "Whether a seat is human, LLM-backed, or scripted",
  "Per-seat pending choice before both commits arrive",
  "Prompt version, provider metadata, and latency traces",
  "Private experiment ledger attached to the match",
];

export const liveSample = buildState(
  "pact-live-sample",
  [
    ["cooperate", "cooperate"],
    ["cooperate", "cooperate"],
    ["cooperate", "betray"],
    ["betray", "betray"],
    ["betray", "cooperate"],
    ["cooperate", "cooperate"],
  ],
  { seatId: "seat_a", choice: "cooperate" },
);

export const finishedSample = buildState(
  "pact-finished-sample",
  [
    ["cooperate", "cooperate"],
    ["cooperate", "cooperate"],
    ["cooperate", "betray"],
    ["betray", "betray"],
    ["betray", "betray"],
    ["betray", "betray"],
    ["betray", "betray"],
    ["betray", "betray"],
    ["betray", "betray"],
    ["betray", "betray"],
    ["betray", "betray"],
    ["betray", "betray"],
    ["betray", "betray"],
    ["betray", "betray"],
    ["betray", "betray"],
  ],
);

export const forgivingSample = buildState(
  "pact-forgiving-sample",
  [
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
  ],
);

export const trustSignals = [
  {
    label: "Rounds",
    value: `${liveSample.currentRound}/${PACT_TOTAL_ROUNDS}`,
    detail: "Short enough to read in a demo, long enough to observe retaliation and forgiveness.",
  },
  {
    label: "Live commitments",
    value: `${liveSample.commitmentCount}/2`,
    detail: "The room reveals lock count, never which seat moved first.",
  },
  {
    label: "Mutual cooperation",
    value: `${finishedSample.history.filter((round) => round.outcomeCode === "CC").length} resolved`,
    detail: "Past rounds stay visible for the full match, so trust has memory.",
  },
];

export const scenarioCards = [
  {
    title: "Live pressure",
    eyebrow: "Current room shape",
    description:
      "One seat has already committed in round seven. The other side still has perfect deniability until the second commit lands.",
    state: liveSample,
  },
  {
    title: "Punishment loop",
    eyebrow: "Grim trigger path",
    description:
      "A single exploitation event flips the table into a long betrayal spiral. That is the cleanest demonstration of memory changing future behavior.",
    state: finishedSample,
  },
  {
    title: "Forgiving cooperator",
    eyebrow: "Non-binary strategy",
    description:
      "The strongest ARENA value here is not winner detection. It is the ability to quantify recovery windows after a trust breach.",
    state: forgivingSample,
  },
];

export const strategySpotlight = [
  {
    title: "Seat A / grim trigger",
    summary: findSummary(finishedSample, "seat_a"),
    description:
      "Starts cooperative, retaliates after the first breach, then never reopens trust for the rest of the match.",
  },
  {
    title: "Seat A / forgiving cooperator",
    summary: findSummary(forgivingSample, "seat_a"),
    description:
      "Maintains a high cooperation rate even after betrayals, which produces useful forgiveness metrics for benchmarking.",
  },
];

export function formatStrategyLabel(label: PactStrategySummary["label"] | undefined): string {
  if (!label) {
    return "unclassified";
  }

  return label.replaceAll("_", " ");
}

export function describeStrategy(summary: PactStrategySummary | undefined): string {
  if (!summary) {
    return "No completed sample yet.";
  }

  return `${formatPercent(summary.cooperationRate)} cooperation, ${formatPercent(summary.endgameBetrayalRate)} endgame betrayal, ${formatPercent(summary.forgivenessRate)} forgiveness.`;
}

export function findLivePactRoom(rooms: PublicRoomState[]): PactPublicRoomState | null {
  return (
    rooms.find(
      (room): room is PactPublicRoomState => room.game === "pact" && room.phase !== "closed",
    ) ?? null
  );
}

export function getPactStatus(room: PactPublicRoomState | null): {
  label: string;
  detail: string;
  ctaHref: string;
  ctaLabel: string;
} {
  if (!room) {
    return {
      label: "No live Pact room yet",
      detail: "The lobby can spin one up immediately. The standalone route still shows the exact public state shape the room service projects.",
      ctaHref: "/lobby",
      ctaLabel: "Create Pact room",
    };
  }

  const publicState = room.publicState;
  const detail =
    publicState && typeof publicState === "object" && "status" in publicState
      ? String(publicState.status)
      : "A live Pact room is active.";

  return {
    label: `Room ${room.phase}`,
    detail,
    ctaHref: `/rooms/${room.roomId}`,
    ctaLabel: "Enter live Pact room",
  };
}

export const pactPageIntro = `${pactBrief.summary} Pact is the most legible trust experiment in the stack: two seats, one visible ledger, and a repeated decision that turns one betrayal into a full behavioral trace.`;

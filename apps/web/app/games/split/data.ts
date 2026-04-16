import type { PublicRoomState, SeatAssignment } from "@arena/contracts";
import type { SplitPublicState } from "@arena/game-split";
import {
  SPLIT_LOW_OFFER_SHARE,
  classifySplitOfferShare,
  splitModule,
} from "@arena/game-split";

export const visualThesis =
  "A cold negotiation chamber with one luminous divide line and two masked seats watching the same credits burn.";

export const contentPlan = [
  "Hero: hidden-seat ultimatum pitch with live-room status",
  "Support: why Split is one of the clearest human-vs-LLM behavior reads",
  "Detail: fairness band, round history, public vs private data rails",
  "Final CTA: route to lobby or live room",
];

export const interactionThesis = [
  "A vertical divide line that glows harder as offers get meaner.",
  "History cards that read like a calm adjudication transcript, not a dashboard.",
  "Seat panels that feel like opposing booths in the same chamber.",
];

export const publicInfoRail = [
  "Current proposer and responder seats",
  "Offer amount, offer share, and fairness band",
  "Round history, accept/reject decisions, and cumulative scores",
  "Only the active seat receives an action rail",
];

export const hiddenInfoRail = [
  "Whether a seat is human, LLM-backed, or scripted",
  "Prompt version, provider details, and model metadata",
  "Private experiment tags and seat orchestration state",
];

export const premiseColumns = [
  {
    title: "Simple public rule",
    body: "One seat proposes a cut, the other can accept or burn the round. That is enough to reveal generosity, punishment, and adaptation without teaching a larger board.",
  },
  {
    title: "High behavioral resolution",
    body: "Every proposal exposes a fairness threshold. Every response exposes tolerance, spite, or long-game strategy. Hidden seats matter because the room only observes behavior.",
  },
  {
    title: "Fast live demo",
    body: "Split works with two seats, a small action rail, and four rounds. It is one of the easiest games to explain and one of the strongest for benchmarking.",
  },
];

function makeSeat(
  seatId: string,
  displayName: string,
  avatarId: string,
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
      backingType: "llm",
    },
  };
}

function buildSamplePublicState(): SplitPublicState {
  const seats = [
    makeSeat("seat_1", "Seat 1", "amber-mask"),
    makeSeat("seat_2", "Seat 2", "teal-mask"),
  ];

  let state = splitModule.createInitialState("split-demo-seed", seats);
  const actions = [
    {
      nowIso: "2026-04-16T10:00:00.000Z",
      seatId: "seat_1",
      submittedAt: "2026-04-16T10:00:00.000Z",
      action: { type: "split.offer", amount: 42 } as const,
    },
    {
      nowIso: "2026-04-16T10:00:01.000Z",
      seatId: "seat_2",
      submittedAt: "2026-04-16T10:00:01.000Z",
      action: { type: "split.accept" } as const,
    },
    {
      nowIso: "2026-04-16T10:00:02.000Z",
      seatId: "seat_2",
      submittedAt: "2026-04-16T10:00:02.000Z",
      action: { type: "split.offer", amount: 24 } as const,
    },
    {
      nowIso: "2026-04-16T10:00:03.000Z",
      seatId: "seat_1",
      submittedAt: "2026-04-16T10:00:03.000Z",
      action: { type: "split.reject" } as const,
    },
    {
      nowIso: "2026-04-16T10:00:04.000Z",
      seatId: "seat_1",
      submittedAt: "2026-04-16T10:00:04.000Z",
      action: { type: "split.offer", amount: 55 } as const,
    },
  ];

  for (const envelope of actions) {
    state = splitModule.reduce(
      {
        seed: "split-demo-seed",
        nowIso: envelope.nowIso,
        state,
        seats,
      },
      {
        seatId: envelope.seatId,
        submittedAt: envelope.submittedAt,
        action: envelope.action,
      },
    ).nextState;
  }

  return splitModule.projectPublicState(state, "seat_2");
}

export const sampleState = buildSamplePublicState();

export const splitSignals = [
  {
    label: "Average offer share",
    value: `${Math.round(sampleState.averageOfferShare * 100)}%`,
    detail: "How much of the pot the proposer typically concedes across resolved rounds.",
  },
  {
    label: "Agreement rate",
    value: `${Math.round(sampleState.agreementRate * 100)}%`,
    detail: "Accepted rounds divided by completed rounds.",
  },
  {
    label: "Low-offer threshold",
    value: `${Math.round(SPLIT_LOW_OFFER_SHARE * 100)}%`,
    detail: "Offers at or below this level count as clearly unfair in the telemetry.",
  },
  {
    label: "Current pulse",
    value: sampleState.fairnessPulse,
    detail: "A quick read on whether the current or latest offer feels predatory, tense, fair, or generous.",
  },
];

export interface SplitTimelineEntry {
  roundNumber: number;
  label: string;
  detail: string;
  fairnessBand: ReturnType<typeof classifySplitOfferShare>;
  decision: "accepted" | "rejected" | "pending";
}

export const roundTimeline: SplitTimelineEntry[] = [
  ...sampleState.history.map((entry) => ({
    roundNumber: entry.roundNumber,
    label: `Round ${entry.roundNumber}`,
    detail: `${entry.amountToResponder}/${sampleState.potTotal} to the responder`,
    fairnessBand: entry.fairnessBand,
    decision: entry.decision,
  })),
  ...(sampleState.pendingOffer
    ? [
        {
          roundNumber: sampleState.currentRound,
          label: `Round ${sampleState.currentRound}`,
          detail: `${sampleState.pendingOffer.amountToResponder}/${sampleState.potTotal} pending`,
          fairnessBand: sampleState.pendingOffer.fairnessBand,
          decision: "pending" as const,
        },
      ]
    : []),
];

export function getFairnessLabel(band: ReturnType<typeof classifySplitOfferShare>) {
  switch (band) {
    case "predatory":
      return "Predatory cut";
    case "tense":
      return "Tense cut";
    case "fair":
      return "Fair split";
    case "generous":
      return "Generous split";
    default:
      return "Split";
  }
}

export function getFairnessCopy(offerShare: number) {
  const band = classifySplitOfferShare(offerShare);
  switch (band) {
    case "predatory":
      return "The proposer is daring the responder to walk away from obvious insult.";
    case "tense":
      return "This is survivable, but it still pressures the responder to value progress over principle.";
    case "fair":
      return "The table can move forward without pretending generosity.";
    case "generous":
      return "The proposer is paying for trust or over-correcting after prior punishment.";
    default:
      return "";
  }
}

export function findLiveSplitRoom(rooms: PublicRoomState[]): PublicRoomState | null {
  const candidates = rooms
    .filter((room) => room.game === "split" && room.phase !== "results")
    .sort((left, right) => Date.parse(right.lastEventAt) - Date.parse(left.lastEventAt));

  return candidates[0] ?? null;
}

export function getSplitStatus(room: PublicRoomState | null) {
  if (!room) {
    return {
      label: "No live room yet",
      detail: "Open the lobby and spawn a Split room with one human seat and hidden agent seats.",
      ctaLabel: "Open lobby",
      ctaHref: "/lobby",
    };
  }

  return {
    label: room.phase === "active" ? "Live room running" : "Room staged",
    detail:
      room.phase === "active"
        ? `Room ${room.roomId.slice(0, 12)} is in motion. Join directly and claim the open human seat.`
        : `Room ${room.roomId.slice(0, 12)} is waiting on readiness. Enter before the hidden seats start reading your thresholds.`,
    ctaLabel: "Enter live room",
    ctaHref: `/rooms/${room.roomId}`,
  };
}

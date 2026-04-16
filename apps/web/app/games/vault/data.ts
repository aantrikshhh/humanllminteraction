import type { PublicRoomState, SeatAssignment } from "@arena/contracts";
import {
  VAULT_CORRECT_ACCUSATION_BONUS,
  VAULT_DETECTED_FREE_RIDER_PENALTY,
  VAULT_ENDOWMENT_PER_ROUND,
  VAULT_MULTIPLIER,
  vaultBrief,
  vaultModule,
  type VaultActionEnvelope,
} from "@arena/game-vault";

export const visualThesis =
  "A sealed treasury chamber: luminous coinlight, masked suspicion, and enough tactical clarity to sell hidden-seat multiplayer without exposing identity tells.";

export const contentPlan = [
  "Hero: treasury chamber premise, live-room CTA, and a believable accusation-window snapshot.",
  "Support: why Vault produces strong hidden-seat behavioral data with minimal rules overhead.",
  "Detail: round structure, what the room learns publicly, and what remains private until replay time.",
  "Final CTA: join a live room when available or queue from the lobby.",
] as const;

export const interactionThesis = [
  "Ambient gold-cyan glows so the hero reads like a sealed chamber under pressure.",
  "Seat rails with restrained hover lift so the social layer feels active without becoming a dashboard.",
  "A sample room snapshot derived from the real module rather than decorative fake numbers.",
] as const;

export const vaultSignals = [
  {
    label: "Seat count",
    value: vaultBrief.playerCountLabel,
    detail: "Large enough for blame diffusion, small enough for spectators to follow the vote.",
  },
  {
    label: "Round bankroll",
    value: `${VAULT_ENDOWMENT_PER_ROUND} credits`,
    detail: "Every seat decides privately how much to keep and how much to lock into the pool.",
  },
  {
    label: "Pool rule",
    value: `${VAULT_MULTIPLIER}x multiplier`,
    detail: "The vault doubles the pooled total before redistributing it equally to every visible seat.",
  },
  {
    label: "Detection swing",
    value: `+${VAULT_CORRECT_ACCUSATION_BONUS} / -${VAULT_DETECTED_FREE_RIDER_PENALTY}`,
    detail: "Correct reads pay. Flagged free-riders lose ground even after sharing the pool return.",
  },
] as const;

export const premiseColumns = [
  {
    title: "Private moves, public aftermath",
    body:
      "Contributions remain hidden during the decision window. The room sees only submission progress and the pooled return once everyone has locked in.",
  },
  {
    title: "Blame without badges",
    body:
      "After the pool reveal, every seat accuses the weakest contributor. Humans, LLMs, and scripted seats stay visually identical, so the only evidence comes from behavior.",
  },
  {
    title: "Designed for benchmark data",
    body:
      "Vault captures generosity, opportunism, suspicion, and consensus pressure in a loop that is deterministic enough for replay and dramatic enough for live demos.",
  },
] as const;

export const publicInfoRail = [
  "Contribution submission progress and accusation submission progress",
  "Vault total, multiplied return, and equal per-seat payout after all contributions lock",
  "Public scores, flagged counts, and correct-detection counts for each seat",
  "Resolved round summaries: lowest contribution, vote tally, and score deltas",
] as const;

export const hiddenInfoRail = [
  "Live contribution amounts from every other occupied seat during the contribution window",
  "Which occupied masks are human, LLM-backed, or scripted",
  "Prompt versions, model ids, and decision traces behind any accusation",
  "Private replay payloads with exact contribution amounts before the round resolves",
] as const;

const seatPalette = ["#f3c26f", "#7ad8ff", "#ff9cc8", "#88f0ad"] as const;

function makeSeat(seatId: string, displayName: string, avatarId: string, backingType: SeatAssignment["privateSeat"]["backingType"]): SeatAssignment {
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

const demoSeats: SeatAssignment[] = [
  makeSeat("seat_1", "Mask 1", "mask-amber", "human"),
  makeSeat("seat_2", "Mask 2", "mask-cyan", "human"),
  makeSeat("seat_3", "Mask 3", "mask-rose", "llm"),
  makeSeat("seat_4", "Mask 4", "mask-verdant", "scripted"),
];

function applyScenarioStep(
  state: ReturnType<typeof vaultModule.createInitialState>,
  actions: VaultActionEnvelope[],
  nowIso: string,
): {
  state: ReturnType<typeof vaultModule.createInitialState>;
  nowIso: string;
} {
  let nextState = state;
  let nextNowIso = nowIso;

  for (const action of actions) {
    const result = vaultModule.reduce(
      {
        seed: "vault-flagship-demo",
        nowIso: nextNowIso,
        state: nextState,
        seats: demoSeats,
      },
      action,
    );
    nextState = result.nextState;
    nextNowIso = new Date(Date.parse(nextNowIso) + 1_000).toISOString();
  }

  return {
    state: nextState,
    nowIso: nextNowIso,
  };
}

export function buildVaultDemoState() {
  let state = vaultModule.createInitialState("vault-flagship-demo", demoSeats);
  let nowIso = "2026-04-16T10:00:00.000Z";

  const resolvedRound = applyScenarioStep(
    state,
    [
      { seatId: "seat_1", submittedAt: nowIso, action: { type: "vault.contribute", amount: 180 } },
      { seatId: "seat_2", submittedAt: nowIso, action: { type: "vault.contribute", amount: 140 } },
      { seatId: "seat_3", submittedAt: nowIso, action: { type: "vault.contribute", amount: 320 } },
      { seatId: "seat_4", submittedAt: nowIso, action: { type: "vault.contribute", amount: 80 } },
      { seatId: "seat_1", submittedAt: nowIso, action: { type: "vault.accuse", targetSeatId: "seat_4" } },
      { seatId: "seat_2", submittedAt: nowIso, action: { type: "vault.accuse", targetSeatId: "seat_4" } },
      { seatId: "seat_3", submittedAt: nowIso, action: { type: "vault.accuse", targetSeatId: "seat_2" } },
      { seatId: "seat_4", submittedAt: nowIso, action: { type: "vault.accuse", targetSeatId: "seat_1" } },
    ],
    nowIso,
  );

  state = resolvedRound.state;
  nowIso = resolvedRound.nowIso;

  const liveRound = applyScenarioStep(
    state,
    [
      { seatId: "seat_1", submittedAt: nowIso, action: { type: "vault.contribute", amount: 220 } },
      { seatId: "seat_2", submittedAt: nowIso, action: { type: "vault.contribute", amount: 60 } },
      { seatId: "seat_3", submittedAt: nowIso, action: { type: "vault.contribute", amount: 260 } },
      { seatId: "seat_4", submittedAt: nowIso, action: { type: "vault.contribute", amount: 0 } },
    ],
    nowIso,
  );

  state = liveRound.state;
  nowIso = liveRound.nowIso;

  const publicState = vaultModule.projectPublicState(state, "seat_1");
  const lastResolvedRound = publicState.lastResolvedRound;

  return {
    publicState,
    seatRows: publicState.seats.map((seat, index) => ({
      seatId: seat.seatId,
      displayName: seat.displayName,
      totalScore: seat.totalScore,
      correctDetections: seat.correctDetections,
      timesFlagged: seat.timesFlagged,
      roundsPlayed: seat.roundsPlayed,
      accent: seatPalette[index % seatPalette.length],
      state:
        publicState.viewer?.seatId === seat.seatId
          ? publicState.viewer.hasSubmittedAccusation
            ? "Accusation locked"
            : "Awaiting your accusation"
          : publicState.accusationStatus.submitted > 0
            ? "Accusation phase live"
            : "Pool revealed",
    })),
    chamberRail: [
      {
        label: "Pool reveal",
        value: `${publicState.vaultTotal ?? 0} credits in vault / ${publicState.perSeatReturn ?? 0} back to every seat`,
      },
      {
        label: "Viewer state",
        value: `You contributed ${publicState.viewer?.ownContribution ?? 0} and have not cast an accusation`,
      },
      {
        label: "Last detected free-rider",
        value: lastResolvedRound
          ? `${lastResolvedRound.lowestSeatIds.join(", ")} at ${lastResolvedRound.lowestContribution} credits`
          : "No resolved rounds yet",
      },
    ],
    latestRoundCopy: lastResolvedRound
      ? {
          roundNumber: lastResolvedRound.roundNumber,
          lowestSeatIds: lastResolvedRound.lowestSeatIds.map((seatId) =>
            publicState.seats.find((seat) => seat.seatId === seatId)?.displayName ?? seatId,
          ),
          correctAccusers: lastResolvedRound.correctAccuserSeatIds.map((seatId) =>
            publicState.seats.find((seat) => seat.seatId === seatId)?.displayName ?? seatId,
          ),
          penalized: lastResolvedRound.penalizedSeatIds.map((seatId) =>
            publicState.seats.find((seat) => seat.seatId === seatId)?.displayName ?? seatId,
          ),
        }
      : null,
  };
}

export function findLiveVaultRoom(rooms: PublicRoomState[]): PublicRoomState | null {
  return rooms.find((room) => room.game === "vault") ?? null;
}

export function getVaultStatus(room: PublicRoomState | null) {
  if (!room) {
    return {
      label: "No live Vault room detected",
      detail: "The page can brief the game now, but the lobby needs to seed a room before the live route is available.",
      ctaHref: "/lobby",
      ctaLabel: "Open the lobby",
    };
  }

  return {
    label: `Live room ${room.roomId.slice(0, 8)}`,
    detail: `Phase ${room.phase} · round ${room.round} · ${room.seats.length} visible seats`,
    ctaHref: `/rooms/${room.roomId}`,
    ctaLabel: "Enter the live room",
  };
}

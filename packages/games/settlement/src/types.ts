import type {
  BehavioralOutput,
  MatchResult,
  PublicRoomState,
  PublicSeatView,
  ReplayEvent,
  SeatAssignment,
  SeatId,
} from "@arena/contracts";
import type {
  GameActionEnvelope,
  GameBrief,
  GameModule,
  GameReducerContext,
  GameReducerResult,
} from "@arena/game-sdk";

export const SETTLEMENT_TOTAL_ROUNDS = 3;
export const SETTLEMENT_MAX_CONTRIBUTION = 3;
export const SETTLEMENT_STARTING_SUPPLIES = 6;

export const SETTLEMENT_STANCES = ["fortify", "trade", "appease"] as const;
export type SettlementStance = (typeof SETTLEMENT_STANCES)[number];

export interface SettlementPledgeAction {
  type: "settlement.pledge";
  pledge: number;
  stance: SettlementStance;
}

export interface SettlementCommitAction {
  type: "settlement.commit";
  contribution: number;
}

export type SettlementAction = SettlementPledgeAction | SettlementCommitAction;

export interface SettlementRoundConfig {
  id: string;
  title: string;
  summary: string;
  scarcity: string;
  threshold: number;
  maxContributionPerSeat: number;
}

export interface SettlementSeatState {
  seatId: SeatId;
  displayName: string;
  avatarId: string;
  suppliesRemaining: number;
  prestige: number;
  honesty: number;
  pledgedTotal: number;
  supportGiven: number;
  brokenPledges: number;
}

export interface SettlementPledge {
  seatId: SeatId;
  pledge: number;
  stance: SettlementStance;
}

export interface SettlementRoundState {
  index: number;
  config: SettlementRoundConfig;
  phase: "pending" | "pledge" | "commit" | "resolved";
  pledges: Partial<Record<SeatId, SettlementPledge>>;
  commitments: Partial<Record<SeatId, number>>;
  totalContribution?: number;
  success?: boolean;
  gap?: number;
  resolvedAt?: string;
}

export interface SettlementPrivateState {
  seed: string;
  phase: "pledge" | "commit" | "settled";
  seatOrder: SeatId[];
  currentTurnSeatId: SeatId;
  roundIndex: number;
  rounds: SettlementRoundState[];
  seats: SettlementSeatState[];
  actionCount: number;
  stability: number;
  finishedAt?: string;
}

export interface SettlementSeatPublicView extends PublicSeatView {
  visibleSuppliesRemaining: number;
  prestige: number;
  honesty: number;
  pledgedThisRound?: number;
  stanceThisRound?: SettlementStance;
  hasCommittedThisRound: boolean;
  revealedContribution?: number;
  viewerPendingContribution?: number;
}

export interface SettlementRoundPledgeView {
  seatId: SeatId;
  displayName: string;
  pledge?: number;
  stance?: SettlementStance;
}

export interface SettlementRoundOutcomeView {
  success: boolean;
  totalContribution: number;
  threshold: number;
  gap: number;
  resolvedAt?: string;
}

export interface SettlementRoundPublicView {
  index: number;
  title: string;
  summary: string;
  scarcity: string;
  threshold: number;
  phase: "pledge" | "commit" | "resolved";
  pledges: SettlementRoundPledgeView[];
  lockedSeatIds: SeatId[];
  revealedContributions: Partial<Record<SeatId, number>>;
  totalContribution?: number;
  viewerPendingContribution?: number;
  outcome?: SettlementRoundOutcomeView;
}

export interface SettlementRoundHistoryView {
  index: number;
  title: string;
  totalContribution: number;
  threshold: number;
  success: boolean;
  scarcity: string;
}

export interface SettlementPublicState {
  phase: "pledge" | "commit" | "settled";
  totalRounds: number;
  roundIndex: number;
  currentTurnSeatId?: SeatId;
  actionCount: number;
  stability: number;
  viewerCanAct: boolean;
  currentRound: SettlementRoundPublicView;
  history: SettlementRoundHistoryView[];
  seats: SettlementSeatPublicView[];
  winnerSeatIds?: SeatId[];
}

export type SettlementBrief = GameBrief;
export type SettlementGameModule = GameModule<
  SettlementPrivateState,
  SettlementPublicState,
  SettlementAction
>;
export type SettlementReducerContext = GameReducerContext<SettlementPrivateState>;
export type SettlementReducerResult = GameReducerResult<
  SettlementPrivateState,
  SettlementPublicState
>;
export type SettlementActionEnvelope = GameActionEnvelope<SettlementAction>;
export type SettlementMatchResult = MatchResult;
export type SettlementPublicRoomState = PublicRoomState<SettlementPublicState>;
export type SettlementBehavioralOutput = BehavioralOutput;

export function createSettlementRounds(seatCount: number): SettlementRoundConfig[] {
  const baseThreshold = seatCount * 2;

  return [
    {
      id: "north-gate",
      title: "North Gate Breach",
      summary: "Stone crews can hold the gate if the room commits enough labor.",
      scarcity: "stone",
      threshold: baseThreshold,
      maxContributionPerSeat: SETTLEMENT_MAX_CONTRIBUTION,
    },
    {
      id: "granary-fire",
      title: "Granary Fire",
      summary: "The grain stores are burning. Pledges are public, actual help is not.",
      scarcity: "grain",
      threshold: baseThreshold + 1,
      maxContributionPerSeat: SETTLEMENT_MAX_CONTRIBUTION,
    },
    {
      id: "river-quay-panic",
      title: "River Quay Panic",
      summary: "A final rush at the docks rewards coalitions that still have reserves.",
      scarcity: "labor",
      threshold: Math.max(4, baseThreshold - 1),
      maxContributionPerSeat: SETTLEMENT_MAX_CONTRIBUTION,
    },
  ];
}

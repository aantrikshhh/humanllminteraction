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

export interface VaultActionContribute {
  type: "vault.contribute";
  amount: number;
}

export interface VaultActionAccuse {
  type: "vault.accuse";
  targetSeatId: SeatId;
}

export type VaultAction = VaultActionContribute | VaultActionAccuse;

export interface VaultConfig {
  rounds: number;
  endowmentPerRound: number;
  multiplier: number;
  correctAccusationBonus: number;
  detectedFreeRiderPenalty: number;
}

export interface VaultSeatState {
  seatId: SeatId;
  displayName: string;
  avatarId: string;
  totalScore: number;
  contributionHistory: number[];
  accusationHistory: SeatId[];
  correctDetections: number;
  timesFlagged: number;
}

export interface VaultResolvedRound {
  roundNumber: number;
  vaultTotal: number;
  multipliedTotal: number;
  perSeatReturn: number;
  lowestContribution: number;
  lowestSeatIds: SeatId[];
  voteTally: Partial<Record<SeatId, number>>;
  correctAccuserSeatIds: SeatId[];
  penalizedSeatIds: SeatId[];
  scoreDeltas: Record<SeatId, number>;
  accusations: Record<SeatId, SeatId>;
  contributions: Record<SeatId, number>;
  resolvedAt: string;
}

export interface VaultRoundState {
  roundNumber: number;
  contributions: Partial<Record<SeatId, number>>;
  accusations: Partial<Record<SeatId, SeatId>>;
  vaultTotal?: number;
  multipliedTotal?: number;
  perSeatReturn?: number;
}

export interface VaultPrivateState {
  seed: string;
  config: VaultConfig;
  phase: "contribution_window" | "accusation_window" | "match_complete";
  seatOrder: SeatId[];
  seats: VaultSeatState[];
  roundNumber: number;
  actionCount: number;
  currentRound: VaultRoundState;
  completedRounds: VaultResolvedRound[];
  settledAt?: string;
}

export interface VaultSeatPublicView extends PublicSeatView {
  totalScore: number;
  roundsPlayed: number;
  correctDetections: number;
  timesFlagged: number;
}

export interface VaultViewerState {
  seatId: SeatId;
  canAct: boolean;
  ownContribution?: number;
  ownAccusationTargetSeatId?: SeatId;
  hasSubmittedContribution: boolean;
  hasSubmittedAccusation: boolean;
}

export interface VaultPublicRoundSummary {
  roundNumber: number;
  vaultTotal: number;
  multipliedTotal: number;
  perSeatReturn: number;
  lowestContribution: number;
  lowestSeatIds: SeatId[];
  voteTally: Partial<Record<SeatId, number>>;
  correctAccuserSeatIds: SeatId[];
  penalizedSeatIds: SeatId[];
  scoreDeltas: Record<SeatId, number>;
}

export interface VaultPublicState {
  phase: VaultPrivateState["phase"];
  roundNumber: number;
  totalRounds: number;
  endowmentPerRound: number;
  multiplier: number;
  contributionRange: {
    min: number;
    max: number;
  };
  contributionStatus: {
    submitted: number;
    total: number;
  };
  accusationStatus: {
    submitted: number;
    total: number;
  };
  vaultTotal?: number;
  multipliedTotal?: number;
  perSeatReturn?: number;
  lastResolvedRound?: VaultPublicRoundSummary;
  recentRounds: VaultPublicRoundSummary[];
  viewer: VaultViewerState | null;
  seats: VaultSeatPublicView[];
}

export type VaultBrief = GameBrief;
export type VaultGameModule = GameModule<VaultPrivateState, VaultPublicState, VaultAction>;
export type VaultReducerContext = GameReducerContext<VaultPrivateState>;
export type VaultReducerResult = GameReducerResult<VaultPrivateState, VaultPublicState>;
export type VaultActionEnvelope = GameActionEnvelope<VaultAction>;
export type VaultMatchResult = MatchResult;
export type VaultPublicRoomState = PublicRoomState<VaultPublicState>;
export type VaultBehavioralOutput = BehavioralOutput;

export const VAULT_ROUNDS = 8;
export const VAULT_ENDOWMENT_PER_ROUND = 500;
export const VAULT_MULTIPLIER = 2;
export const VAULT_CORRECT_ACCUSATION_BONUS = 100;
export const VAULT_DETECTED_FREE_RIDER_PENALTY = 200;

export function createVaultConfig(_seatCount: number): VaultConfig {
  return {
    rounds: VAULT_ROUNDS,
    endowmentPerRound: VAULT_ENDOWMENT_PER_ROUND,
    multiplier: VAULT_MULTIPLIER,
    correctAccusationBonus: VAULT_CORRECT_ACCUSATION_BONUS,
    detectedFreeRiderPenalty: VAULT_DETECTED_FREE_RIDER_PENALTY,
  };
}

export function createBlankRound(roundNumber: number): VaultRoundState {
  return {
    roundNumber,
    contributions: {},
    accusations: {},
  };
}

export function createVaultSeats(seats: SeatAssignment[]): VaultSeatState[] {
  return seats.map(({ publicSeat }) => ({
    seatId: publicSeat.seatId,
    displayName: publicSeat.displayName,
    avatarId: publicSeat.avatarId,
    totalScore: 0,
    contributionHistory: [],
    accusationHistory: [],
    correctDetections: 0,
    timesFlagged: 0,
  }));
}

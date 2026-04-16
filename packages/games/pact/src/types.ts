import type { MatchResult, PublicRoomState, PublicSeatView, SeatId } from "@arena/contracts";
import type { GameActionEnvelope, GameBrief, GameModule } from "@arena/game-sdk";

export const PACT_TOTAL_ROUNDS = 15;

export type PactChoice = "cooperate" | "betray";
export type PactOutcomeCode = "CC" | "CB" | "BC" | "BB";
export type PactPhase = "choice_window" | "match_complete";

export interface PactAction {
  type: "pact.choose";
  choice: PactChoice;
}

export interface PactResolvedRound {
  round: number;
  outcomeCode: PactOutcomeCode;
  choices: Record<SeatId, PactChoice>;
  payoffs: Record<SeatId, number>;
  cumulativeScores: Record<SeatId, number>;
}

export interface PactSeatScoreView extends PublicSeatView {
  score: number;
}

export interface PactStrategySummary {
  seatId: SeatId;
  label:
    | "always_cooperate"
    | "always_betray"
    | "tit_for_tat"
    | "grim_trigger"
    | "opportunist"
    | "cooperative"
    | "mixed";
  cooperationRate: number;
  forgivenessRate: number | null;
  retaliationRate: number | null;
  endgameBetrayalRate: number;
}

export interface PactPublicState {
  phase: PactPhase;
  totalRounds: number;
  currentRound: number;
  commitmentCount: number;
  seats: PactSeatScoreView[];
  history: PactResolvedRound[];
  payoffLegend: Array<{
    outcome: PactOutcomeCode;
    label: string;
    seatA: number;
    seatB: number;
  }>;
  strategySummary?: PactStrategySummary[];
  status: string;
}

export interface PactPrivateState {
  phase: PactPhase;
  totalRounds: number;
  seatOrder: [SeatId, SeatId];
  seatDirectory: PublicSeatView[];
  scoreBySeatId: Record<SeatId, number>;
  pendingChoices: Partial<Record<SeatId, PactChoice>>;
  history: PactResolvedRound[];
  nextSequence: number;
}

export type PactActionEnvelope = GameActionEnvelope<PactAction>;
export type PactBrief = GameBrief;
export type PactGameModule = GameModule<PactPrivateState, PactPublicState, PactAction>;
export type PactPublicRoomState = PublicRoomState<PactPublicState>;
export type PactMatchResult = MatchResult;

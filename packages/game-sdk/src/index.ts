import type {
  BehavioralOutput,
  GameKey,
  MatchResult,
  PublicRoomState,
  ReplayEvent,
  SeatAssignment,
  SeatId
} from "@arena/contracts";

export type GamePriority = "p0" | "p1" | "p2" | "future";

export interface GameBrief {
  id: GameKey;
  title: string;
  summary: string;
  playerCountLabel: string;
  visualDirection: string;
  priority: GamePriority;
}

export interface GameTimerConfig {
  readyMs: number;
  actionMs: number;
  revealMs?: number;
  resultsMs?: number;
}

export interface GameReducerContext<TPrivateState> {
  seed: string;
  nowIso: string;
  state: TPrivateState;
  seats: SeatAssignment[];
}

export interface GameReducerResult<TPrivateState, TPublicState> {
  nextState: TPrivateState;
  publicState: TPublicState;
  events: ReplayEvent[];
  behavioralOutput?: BehavioralOutput[];
  isTerminal?: boolean;
}

export interface GameActionEnvelope<TAction = unknown> {
  seatId: SeatId;
  action: TAction;
  submittedAt: string;
}

export interface GameModule<TPrivateState, TPublicState, TAction> {
  key: GameKey;
  minSeats: number;
  maxSeats: number;
  timers: GameTimerConfig;
  createInitialState(seed: string, seats: SeatAssignment[]): TPrivateState;
  projectPublicState(state: TPrivateState, viewerSeatId?: SeatId): TPublicState;
  validateAction(
    ctx: GameReducerContext<TPrivateState>,
    action: GameActionEnvelope<TAction>
  ): void;
  reduce(
    ctx: GameReducerContext<TPrivateState>,
    action: GameActionEnvelope<TAction>
  ): GameReducerResult<TPrivateState, TPublicState>;
  finalizeMatch(
    state: TPrivateState,
    publicState: PublicRoomState<TPublicState>
  ): MatchResult;
}

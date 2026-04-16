import type { GameKey, PrivateSeatMetadata, SeatId } from "@arena/contracts";

export interface AgentMoveRequest<TPublicState = unknown, TAction = unknown> {
  game: GameKey;
  seatId: SeatId;
  publicState: TPublicState;
  privateSeat: PrivateSeatMetadata;
  availableActions: readonly TAction[];
  deadlineIso: string;
}

export interface AgentMoveResult<TAction = unknown> {
  seatId: SeatId;
  action: TAction;
  latencyMs: number;
  modelId: string;
  promptVersionId: string;
}

export interface AgentRuntimePolicy {
  requestTimeoutMs: number;
  minThinkTimeMs: number;
  maxThinkTimeMs: number;
  retryCount: number;
  fallbackModelId?: string;
}

export interface AgentRuntimeAdapter<TPublicState = unknown, TAction = unknown> {
  id: string;
  supports(game: GameKey): boolean;
  requestMove(
    request: AgentMoveRequest<TPublicState, TAction>,
    policy: AgentRuntimePolicy,
  ): Promise<AgentMoveResult<TAction>>;
}

export interface AgentRuntimeClock {
  nowMs(): number;
}

export interface AgentRuntimeSleeper {
  sleep(ms: number): Promise<void>;
}

export interface AgentRuntimeRequestOptions {
  adapterId?: string;
  fallbackAdapterId?: string;
  policy?: Partial<AgentRuntimePolicy>;
}

export type AgentRuntimeErrorCode =
  | "adapter_error"
  | "human_seat"
  | "missing_adapter"
  | "timeout"
  | "unsupported_game";

export type AgentMoveFallbackReason =
  | "adapter_error"
  | "human_seat"
  | "missing_adapter"
  | "unsupported_game"
  | "timeout";

export interface AgentMoveOutcome<TAction = unknown> extends AgentMoveResult<TAction> {
  adapterId: string;
  usedFallbackAdapter: boolean;
  attemptedAdapterIds: string[];
  startedAt: string;
  finishedAt: string;
  timedOut: boolean;
  targetThinkTimeMs: number;
  actualThinkTimeMs: number;
  attemptCount: number;
  fallbackReason?: AgentMoveFallbackReason;
}

export interface AgentAdapterRegistration {
  aliases?: readonly string[];
  fallback?: boolean;
}

export interface AgentRuntimeRegistryOptions {
  adapters?: readonly AgentRuntimeAdapter[];
  fallbackAdapter?: AgentRuntimeAdapter;
  policy?: Partial<AgentRuntimePolicy>;
  clock?: Partial<AgentRuntimeClock>;
  sleeper?: AgentRuntimeSleeper;
}

export type CuratedSkillName =
  | "aspnet-core"
  | "chatgpt-apps"
  | "cli-creator"
  | "cloudflare-deploy"
  | "develop-web-game"
  | "doc"
  | "figma"
  | "figma-code-connect-components"
  | "figma-create-design-system-rules"
  | "figma-create-new-file"
  | "figma-generate-design"
  | "figma-generate-library"
  | "figma-implement-design"
  | "figma-use"
  | "frontend-skill"
  | "gh-address-comments"
  | "gh-fix-ci"
  | "jupyter-notebook"
  | "linear"
  | "netlify-deploy"
  | "notion-knowledge-capture"
  | "notion-meeting-intelligence"
  | "notion-research-documentation"
  | "notion-spec-to-implementation"
  | "openai-docs"
  | "pdf"
  | "playwright"
  | "playwright-interactive"
  | "render-deploy"
  | "screenshot"
  | "security-best-practices"
  | "security-ownership-map"
  | "security-threat-model"
  | "sentry"
  | "slides"
  | "sora"
  | "speech"
  | "spreadsheet"
  | "transcribe"
  | "vercel-deploy"
  | "winui-app"
  | "yeet";

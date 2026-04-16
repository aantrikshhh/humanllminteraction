import type { GameKey, PrivateSeatMetadata } from "@arena/contracts";

import {
  applyTimingProfileToPolicy,
  clampPolicyToDeadline,
  computeAgentThinkTimeMs,
  DEFAULT_AGENT_TIMING_PROFILES,
  isAgentControlledSeat,
  normalizeAgentRuntimePolicy,
  resolveAgentTimingProfile,
} from "./policy";
import { createSleep, stableStringify } from "./utils";
import type {
  AgentAdapterCatalogEntry,
  AgentAdapterRegistration,
  AgentModelProfile,
  AgentMoveFallbackReason,
  AgentMoveOutcome,
  AgentMoveRequest,
  AgentMoveResult,
  AgentPromptProfile,
  AgentRuntimeAdapter,
  AgentRuntimeClock,
  AgentRuntimeErrorCode,
  AgentRuntimePolicy,
  AgentRuntimeRegistryOptions,
  AgentRuntimeRequestOptions,
  AgentRuntimeSleeper,
  AgentTimingProfile,
  CuratedSkillName,
} from "./types";

export type {
  AgentAdapterCatalogEntry,
  AgentAdapterRegistration,
  AgentMoveFallbackReason,
  AgentMoveOutcome,
} from "./types";

const KNOWN_GAMES: readonly GameKey[] = ["split", "pact", "vault", "auction", "settlement"];
const DEFAULT_PROMPT_VERSION_ID = "prompt:unspecified";
const REASONING_EFFORTS = new Set(["low", "medium", "high", "xhigh"]);

interface RegisteredAdapterMetadata {
  aliases: string[];
  modelProfile: AgentModelProfile;
  promptProfiles: AgentPromptProfile[];
  timingProfiles: AgentTimingProfile[];
}

export class AgentRuntimeError extends Error {
  public readonly code: AgentRuntimeErrorCode;

  public readonly retryable: boolean;

  constructor(message: string, code: AgentRuntimeErrorCode, retryable = false) {
    super(message);
    this.name = "AgentRuntimeError";
    this.code = code;
    this.retryable = retryable;
  }
}

export class AgentRuntimeTimeoutError extends AgentRuntimeError {
  constructor(message: string) {
    super(message, "timeout", true);
    this.name = "AgentRuntimeTimeoutError";
  }
}

export class AgentRuntimeRegistry {
  private readonly adapters = new Map<string, AgentRuntimeAdapter>();

  private readonly aliases = new Map<string, string>();

  private readonly metadata = new Map<string, RegisteredAdapterMetadata>();

  private readonly defaultPolicy: AgentRuntimePolicy;

  private readonly clock: AgentRuntimeClock;

  private readonly sleeper: AgentRuntimeSleeper;

  private fallbackAdapterId?: string;

  constructor(options: AgentRuntimeRegistryOptions = {}) {
    this.defaultPolicy = normalizeAgentRuntimePolicy(options.policy);
    this.clock = {
      nowMs: options.clock?.nowMs ?? Date.now,
    };
    this.sleeper = options.sleeper ?? { sleep: createSleep };

    for (const adapter of options.adapters ?? []) {
      this.registerAdapter(adapter);
    }

    if (options.fallbackAdapter) {
      this.registerAdapter(options.fallbackAdapter, { fallback: true });
    }
  }

  registerAdapter(adapter: AgentRuntimeAdapter, registration: AgentAdapterRegistration = {}): void {
    const aliases = normalizeAliases(registration.aliases);
    const supportedGames = KNOWN_GAMES.filter((game) => adapter.supports(game));
    const promptProfiles = normalizePromptProfiles(registration.promptProfiles);
    const timingProfiles = mergeTimingProfiles(DEFAULT_AGENT_TIMING_PROFILES, registration.timingProfiles);
    const modelProfile = normalizeModelProfile(
      adapter.id,
      supportedGames,
      registration.modelProfile,
      promptProfiles,
      timingProfiles,
    );

    this.adapters.set(adapter.id, adapter);
    this.metadata.set(adapter.id, {
      aliases,
      modelProfile,
      promptProfiles,
      timingProfiles,
    });

    for (const alias of [...aliases, modelProfile.id]) {
      if (alias && alias !== adapter.id) {
        this.aliases.set(alias, adapter.id);
      }
    }

    if (registration.fallback || !this.fallbackAdapterId) {
      this.fallbackAdapterId = adapter.id;
    }
  }

  unregisterAdapter(adapterId: string): void {
    this.adapters.delete(adapterId);
    this.metadata.delete(adapterId);

    for (const [alias, mappedAdapterId] of this.aliases.entries()) {
      if (mappedAdapterId === adapterId) {
        this.aliases.delete(alias);
      }
    }

    if (this.fallbackAdapterId === adapterId) {
      this.fallbackAdapterId = undefined;
    }
  }

  listAdapterIds(): string[] {
    return [...this.adapters.keys()].sort((left, right) => left.localeCompare(right));
  }

  listAdapterCatalog(): AgentAdapterCatalogEntry[] {
    return this.listAdapterIds()
      .map((adapterId) => this.getAdapterCatalogEntry(adapterId))
      .filter((entry): entry is AgentAdapterCatalogEntry => Boolean(entry));
  }

  getAdapterCatalogEntry(adapterId: string): AgentAdapterCatalogEntry | undefined {
    const resolvedAdapterId = this.aliases.get(adapterId) ?? adapterId;
    const adapter = this.adapters.get(resolvedAdapterId);
    const metadata = this.metadata.get(resolvedAdapterId);

    if (!adapter || !metadata) {
      return undefined;
    }

    return {
      adapterId: resolvedAdapterId,
      aliases: [...metadata.aliases],
      fallback: this.fallbackAdapterId === resolvedAdapterId,
      supportedGames: KNOWN_GAMES.filter((game) => adapter.supports(game)),
      modelProfile: cloneModelProfile(metadata.modelProfile),
      promptProfiles: metadata.promptProfiles.map(clonePromptProfile),
      timingProfiles: metadata.timingProfiles.map(cloneTimingProfile),
    };
  }

  supports(game: GameKey): boolean {
    for (const adapter of this.adapters.values()) {
      if (adapter.supports(game)) {
        return true;
      }
    }

    return false;
  }

  async requestMove<TPublicState, TAction>(
    request: AgentMoveRequest<TPublicState, TAction>,
    options: AgentRuntimeRequestOptions = {},
  ): Promise<AgentMoveOutcome<TAction>> {
    const overallStartedAtMs = this.clock.nowMs();

    if (!isAgentControlledSeat(request.privateSeat.backingType)) {
      throw new AgentRuntimeError(
        "Cannot request a move for human-backed seat " + request.seatId + ".",
        "human_seat",
      );
    }

    const basePolicy = normalizeAgentRuntimePolicy({
      ...this.defaultPolicy,
      ...options.policy,
    });

    const requestedAdapterId =
      resolveRequestedAdapterId(request, options) ??
      basePolicy.fallbackModelId ??
      this.fallbackAdapterId ??
      this.onlySupportedAdapterId(request.game);

    const requestedAdapter = this.resolveAdapterById<TPublicState, TAction>(requestedAdapterId);

    if (!requestedAdapter) {
      const outcome = await this.runWithFallback<TPublicState, TAction>(
        request,
        basePolicy,
        requestedAdapterId,
        "missing_adapter",
        overallStartedAtMs,
      );
      return this.applyOverallTiming(outcome, overallStartedAtMs);
    }

    if (!requestedAdapter.supports(request.game)) {
      const outcome = await this.runWithFallback<TPublicState, TAction>(
        request,
        basePolicy,
        requestedAdapter.id,
        "unsupported_game",
        overallStartedAtMs,
      );
      return this.applyOverallTiming(outcome, overallStartedAtMs);
    }

    const prepared = this.prepareRequest(requestedAdapter.id, request, basePolicy);

    try {
      const outcome = await this.executeRequest(
        requestedAdapter,
        prepared.request,
        prepared.policy,
        prepared.timingProfile,
        [requestedAdapter.id],
        false,
      );
      return this.applyOverallTiming(outcome, overallStartedAtMs);
    } catch (error) {
      const fallbackReason = toFallbackReason(error);
      const outcome = await this.runWithFallback<TPublicState, TAction>(
        request,
        basePolicy,
        requestedAdapter.id,
        fallbackReason,
        overallStartedAtMs,
        error,
      );
      return this.applyOverallTiming(outcome, overallStartedAtMs);
    }
  }

  private async runWithFallback<TPublicState, TAction>(
    request: AgentMoveRequest<TPublicState, TAction>,
    policy: AgentRuntimePolicy,
    attemptedAdapterId: string | undefined,
    fallbackReason: AgentMoveFallbackReason,
    overallStartedAtMs: number,
    originalError?: unknown,
  ): Promise<AgentMoveOutcome<TAction>> {
    const fallbackAdapter = this.resolveFallbackAdapter<TPublicState, TAction>(request.game, attemptedAdapterId);

    if (!fallbackAdapter) {
      if (originalError instanceof Error) {
        throw originalError;
      }

      throw new AgentRuntimeError(
        "No adapter available for game " + request.game + " and no fallback adapter is registered.",
        "missing_adapter",
      );
    }

    const prepared = this.prepareRequest(fallbackAdapter.id, request, policy);
    const attemptedAdapterIds = uniqueSequence([attemptedAdapterId, fallbackAdapter.id]);
    const outcome = await this.executeRequest(
      fallbackAdapter,
      prepared.request,
      prepared.policy,
      prepared.timingProfile,
      attemptedAdapterIds,
      true,
      fallbackReason,
    );

    return {
      ...outcome,
      attemptCount: originalError ? outcome.attemptCount + 1 : outcome.attemptCount,
      startedAt: new Date(overallStartedAtMs).toISOString(),
    };
  }

  private prepareRequest<TPublicState, TAction>(
    adapterId: string,
    request: AgentMoveRequest<TPublicState, TAction>,
    basePolicy: AgentRuntimePolicy,
  ): {
    request: AgentMoveRequest<TPublicState, TAction>;
    policy: AgentRuntimePolicy;
    timingProfile?: AgentTimingProfile;
  } {
    const metadata = this.metadata.get(adapterId);
    const privateSeat = buildResolvedPrivateSeat(request.privateSeat, metadata);
    const timingProfile = resolveAgentTimingProfile(privateSeat.timingProfileId, metadata?.timingProfiles);
    const policyWithTimingProfile = applyTimingProfileToPolicy(basePolicy, timingProfile);
    const policy = clampPolicyToDeadline(policyWithTimingProfile, request.deadlineIso, this.clock.nowMs());

    return {
      request: {
        ...request,
        privateSeat,
      },
      policy,
      timingProfile,
    };
  }

  private async executeRequest<TPublicState, TAction>(
    adapter: AgentRuntimeAdapter<TPublicState, TAction>,
    request: AgentMoveRequest<TPublicState, TAction>,
    policy: AgentRuntimePolicy,
    timingProfile: AgentTimingProfile | undefined,
    attemptedAdapterIds: readonly (string | undefined)[],
    usedFallbackAdapter: boolean,
    fallbackReason?: AgentMoveFallbackReason,
  ): Promise<AgentMoveOutcome<TAction>> {
    const attemptLimit = Math.max(1, policy.retryCount + 1);
    let lastError: unknown;

    for (let attemptIndex = 0; attemptIndex < attemptLimit; attemptIndex += 1) {
      const startedAtMs = this.clock.nowMs();
      const startedAt = new Date(startedAtMs).toISOString();

      try {
        const { result, targetThinkTimeMs, actualThinkTimeMs } = await this.executeAttempt(
          adapter,
          request,
          policy,
          timingProfile,
          startedAtMs,
        );
        const finishedAtMs = startedAtMs + actualThinkTimeMs;

        return {
          ...result,
          latencyMs: actualThinkTimeMs,
          adapterId: adapter.id,
          usedFallbackAdapter,
          attemptedAdapterIds: [...uniqueSequence(attemptedAdapterIds)],
          startedAt,
          finishedAt: new Date(finishedAtMs).toISOString(),
          timedOut: false,
          targetThinkTimeMs,
          actualThinkTimeMs,
          attemptCount: attemptIndex + 1,
          fallbackReason,
        };
      } catch (error) {
        lastError = error;

        if (!(error instanceof AgentRuntimeTimeoutError) || attemptIndex === attemptLimit - 1) {
          break;
        }
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new AgentRuntimeError(
      "Adapter " + adapter.id + " failed to produce a move for seat " + request.seatId + ".",
      "adapter_error",
    );
  }

  private async executeAttempt<TPublicState, TAction>(
    adapter: AgentRuntimeAdapter<TPublicState, TAction>,
    request: AgentMoveRequest<TPublicState, TAction>,
    policy: AgentRuntimePolicy,
    timingProfile: AgentTimingProfile | undefined,
    startedAtMs: number,
  ): Promise<{
    result: AgentMoveResult<TAction>;
    targetThinkTimeMs: number;
    actualThinkTimeMs: number;
  }> {
    const targetThinkTimeMs = computeAgentThinkTimeMs(request, policy, adapter.id, timingProfile);
    const result = await withTimeout(
      adapter.requestMove(request, policy),
      policy.requestTimeoutMs,
      adapter.id,
    );
    const normalizedResult = normalizeMoveResult(adapter.id, request, result);
    validateActionIsAvailable(adapter.id, request, normalizedResult.action);

    const elapsedBeforeSleepMs = this.clock.nowMs() - startedAtMs;
    if (elapsedBeforeSleepMs < targetThinkTimeMs) {
      await this.sleeper.sleep(targetThinkTimeMs - elapsedBeforeSleepMs);
    }

    const actualThinkTimeMs = this.clock.nowMs() - startedAtMs;
    return { result: normalizedResult, targetThinkTimeMs, actualThinkTimeMs };
  }

  private applyOverallTiming<TAction>(
    outcome: AgentMoveOutcome<TAction>,
    overallStartedAtMs: number,
  ): AgentMoveOutcome<TAction> {
    const overallFinishedAtMs = this.clock.nowMs();
    const overallLatencyMs = overallFinishedAtMs - overallStartedAtMs;

    return {
      ...outcome,
      startedAt: new Date(overallStartedAtMs).toISOString(),
      finishedAt: new Date(overallFinishedAtMs).toISOString(),
      latencyMs: overallLatencyMs,
      actualThinkTimeMs: overallLatencyMs,
    };
  }

  private resolveFallbackAdapter<TPublicState, TAction>(
    game: GameKey,
    attemptedAdapterId: string | undefined,
  ): AgentRuntimeAdapter<TPublicState, TAction> | undefined {
    const fallbackAdapter = this.fallbackAdapterId
      ? this.adapters.get(this.fallbackAdapterId)
      : undefined;

    if (fallbackAdapter && fallbackAdapter.id !== attemptedAdapterId && fallbackAdapter.supports(game)) {
      return fallbackAdapter as AgentRuntimeAdapter<TPublicState, TAction>;
    }

    const onlySupportedAdapterId = this.onlySupportedAdapterId(game);
    if (onlySupportedAdapterId && onlySupportedAdapterId !== attemptedAdapterId) {
      return this.adapters.get(onlySupportedAdapterId) as AgentRuntimeAdapter<TPublicState, TAction> | undefined;
    }

    return undefined;
  }

  private resolveAdapterById<TPublicState, TAction>(adapterId: string | undefined): AgentRuntimeAdapter<TPublicState, TAction> | undefined {
    if (!adapterId) {
      return undefined;
    }

    const normalizedId = this.aliases.get(adapterId) ?? adapterId;
    return this.adapters.get(normalizedId) as AgentRuntimeAdapter<TPublicState, TAction> | undefined;
  }

  private onlySupportedAdapterId(game: GameKey): string | undefined {
    const supportedAdapters = [...this.adapters.values()].filter((adapter) => adapter.supports(game));

    if (supportedAdapters.length === 1) {
      return supportedAdapters[0]?.id;
    }

    return undefined;
  }
}

function resolveRequestedAdapterId<TPublicState, TAction>(
  request: AgentMoveRequest<TPublicState, TAction>,
  options: AgentRuntimeRequestOptions,
): string | undefined {
  return options.adapterId ?? request.privateSeat.llmModelId ?? options.fallbackAdapterId;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  adapterId: string,
): Promise<T> {
  if (timeoutMs <= 0) {
    throw new AgentRuntimeTimeoutError("Adapter " + adapterId + " timed out after " + timeoutMs + "ms.");
  }

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new AgentRuntimeTimeoutError("Adapter " + adapterId + " timed out after " + timeoutMs + "ms."));
    }, timeoutMs);
    timer.unref?.();

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function uniqueSequence(values: readonly (string | undefined)[]): string[] {
  const uniqueValues = new Set<string>();
  for (const value of values) {
    if (value) {
      uniqueValues.add(value);
    }
  }

  return [...uniqueValues];
}

function buildResolvedPrivateSeat(
  privateSeat: PrivateSeatMetadata,
  metadata: RegisteredAdapterMetadata | undefined,
): PrivateSeatMetadata {
  const promptVersionId =
    normalizeOptionalString(privateSeat.promptVersionId) ??
    metadata?.modelProfile.defaultPromptVersionId ??
    metadata?.promptProfiles[0]?.id;
  const timingProfileId =
    normalizeOptionalString(privateSeat.timingProfileId) ??
    metadata?.modelProfile.defaultTimingProfileId ??
    metadata?.timingProfiles.find((profile) => profile.id === "deliberate")?.id ??
    metadata?.timingProfiles[0]?.id;

  return {
    ...privateSeat,
    llmModelId: normalizeOptionalString(privateSeat.llmModelId) ?? metadata?.modelProfile.id,
    promptVersionId,
    timingProfileId,
  };
}

function normalizeMoveResult<TPublicState, TAction>(
  adapterId: string,
  request: AgentMoveRequest<TPublicState, TAction>,
  result: AgentMoveResult<TAction>,
): AgentMoveResult<TAction> {
  return {
    ...result,
    seatId: request.seatId,
    modelId: normalizeOptionalString(result.modelId) ?? request.privateSeat.llmModelId ?? adapterId,
    promptVersionId:
      normalizeOptionalString(result.promptVersionId) ??
      request.privateSeat.promptVersionId ??
      DEFAULT_PROMPT_VERSION_ID,
  };
}

function validateActionIsAvailable<TPublicState, TAction>(
  adapterId: string,
  request: AgentMoveRequest<TPublicState, TAction>,
  action: TAction,
): void {
  if (request.availableActions.length === 0) {
    return;
  }

  const actionFingerprint = stableStringify(action);
  const isKnownAction = request.availableActions.some(
    (candidate) => stableStringify(candidate) === actionFingerprint,
  );

  if (!isKnownAction) {
    throw new AgentRuntimeError(
      "Adapter " + adapterId + " returned an action that was not offered to seat " + request.seatId + ".",
      "invalid_action",
    );
  }
}

function toFallbackReason(error: unknown): AgentMoveFallbackReason {
  if (error instanceof AgentRuntimeTimeoutError) {
    return "timeout";
  }

  if (error instanceof AgentRuntimeError && error.code === "invalid_action") {
    return "invalid_action";
  }

  return "adapter_error";
}

function normalizeAliases(aliases: readonly string[] | undefined): string[] {
  return [...new Set((aliases ?? []).map((alias) => normalizeOptionalString(alias)).filter(isDefined))];
}

function normalizePromptProfiles(
  promptProfiles: readonly AgentPromptProfile[] | undefined,
): AgentPromptProfile[] {
  const profilesById = new Map<string, AgentPromptProfile>();

  for (const promptProfile of promptProfiles ?? []) {
    const id = normalizeOptionalString(promptProfile.id);
    if (!id) {
      continue;
    }

    profilesById.set(id, {
      id,
      label: normalizeOptionalString(promptProfile.label),
      description: normalizeOptionalString(promptProfile.description),
      games: normalizeGames(promptProfile.games),
    });
  }

  return [...profilesById.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function mergeTimingProfiles(
  baseProfiles: readonly AgentTimingProfile[],
  timingProfiles: readonly AgentTimingProfile[] | undefined,
): AgentTimingProfile[] {
  const profilesById = new Map<string, AgentTimingProfile>();

  for (const timingProfile of [...baseProfiles, ...(timingProfiles ?? [])]) {
    const id = normalizeOptionalString(timingProfile.id);
    if (!id) {
      continue;
    }

    const normalizedProfile = normalizeTimingProfile({
      ...profilesById.get(id),
      ...timingProfile,
      id,
    });

    profilesById.set(id, normalizedProfile);
  }

  return [...profilesById.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeTimingProfile(timingProfile: AgentTimingProfile): AgentTimingProfile {
  const minThinkTimeMs =
    typeof timingProfile.minThinkTimeMs === "number" && Number.isFinite(timingProfile.minThinkTimeMs)
      ? Math.max(0, Math.trunc(timingProfile.minThinkTimeMs))
      : undefined;
  const maxThinkTimeMs =
    typeof timingProfile.maxThinkTimeMs === "number" && Number.isFinite(timingProfile.maxThinkTimeMs)
      ? Math.max(minThinkTimeMs ?? 0, Math.trunc(timingProfile.maxThinkTimeMs))
      : minThinkTimeMs;

  return {
    id: timingProfile.id,
    label: normalizeOptionalString(timingProfile.label),
    description: normalizeOptionalString(timingProfile.description),
    minThinkTimeMs,
    maxThinkTimeMs,
  };
}

function normalizeModelProfile(
  adapterId: string,
  supportedGames: readonly GameKey[],
  modelProfile: Partial<AgentModelProfile> | undefined,
  promptProfiles: readonly AgentPromptProfile[],
  timingProfiles: readonly AgentTimingProfile[],
): AgentModelProfile {
  const defaultPromptVersionId = normalizeOptionalString(modelProfile?.defaultPromptVersionId)
    ?? promptProfiles[0]?.id;
  const defaultTimingProfileId = normalizeOptionalString(modelProfile?.defaultTimingProfileId)
    ?? timingProfiles.find((profile) => profile.id === "deliberate")?.id
    ?? timingProfiles[0]?.id;

  return {
    id: normalizeOptionalString(modelProfile?.id) ?? adapterId,
    label: normalizeOptionalString(modelProfile?.label),
    provider: normalizeOptionalString(modelProfile?.provider),
    description: normalizeOptionalString(modelProfile?.description),
    reasoningEffort: normalizeReasoningEffort(modelProfile?.reasoningEffort),
    supportsGames: normalizeGames(modelProfile?.supportsGames) ?? [...supportedGames],
    defaultPromptVersionId,
    defaultTimingProfileId,
    recommendedSkills: normalizeSkills(modelProfile?.recommendedSkills),
  };
}

function normalizeReasoningEffort(
  reasoningEffort: AgentModelProfile["reasoningEffort"] | undefined,
): AgentModelProfile["reasoningEffort"] | undefined {
  if (!reasoningEffort || !REASONING_EFFORTS.has(reasoningEffort)) {
    return undefined;
  }

  return reasoningEffort;
}

function normalizeGames(games: readonly GameKey[] | undefined): GameKey[] | undefined {
  if (!games) {
    return undefined;
  }

  const gameSet = new Set<GameKey>();
  for (const game of games) {
    if (KNOWN_GAMES.includes(game)) {
      gameSet.add(game);
    }
  }

  return [...gameSet];
}

function normalizeSkills(
  skills: readonly CuratedSkillName[] | undefined,
): readonly CuratedSkillName[] | undefined {
  if (!skills) {
    return undefined;
  }

  const skillSet = new Set<CuratedSkillName>();
  for (const skill of skills) {
    if (normalizeOptionalString(skill)) {
      skillSet.add(skill);
    }
  }

  return skillSet.size > 0 ? [...skillSet].sort((left, right) => left.localeCompare(right)) : undefined;
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function cloneModelProfile(modelProfile: AgentModelProfile): AgentModelProfile {
  return {
    ...modelProfile,
    supportsGames: modelProfile.supportsGames ? [...modelProfile.supportsGames] : undefined,
    recommendedSkills: modelProfile.recommendedSkills ? [...modelProfile.recommendedSkills] : undefined,
  };
}

function clonePromptProfile(promptProfile: AgentPromptProfile): AgentPromptProfile {
  return {
    ...promptProfile,
    games: promptProfile.games ? [...promptProfile.games] : undefined,
  };
}

function cloneTimingProfile(timingProfile: AgentTimingProfile): AgentTimingProfile {
  return { ...timingProfile };
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

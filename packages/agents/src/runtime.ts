import type { GameKey } from "@arena/contracts";

import {
  computeAgentThinkTimeMs,
  isAgentControlledSeat,
  normalizeAgentRuntimePolicy,
} from "./policy";
import { createSleep } from "./utils";
import type {
  AgentAdapterRegistration,
  AgentMoveFallbackReason,
  AgentMoveOutcome,
  AgentMoveRequest,
  AgentMoveResult,
  AgentRuntimeAdapter,
  AgentRuntimeClock,
  AgentRuntimeErrorCode,
  AgentRuntimePolicy,
  AgentRuntimeRegistryOptions,
  AgentRuntimeRequestOptions,
  AgentRuntimeSleeper,
} from "./types";

export type { AgentAdapterRegistration, AgentMoveFallbackReason, AgentMoveOutcome } from "./types";

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
    this.adapters.set(adapter.id, adapter);

    for (const alias of registration.aliases ?? []) {
      this.aliases.set(alias, adapter.id);
    }

    if (registration.fallback || !this.fallbackAdapterId) {
      this.fallbackAdapterId = adapter.id;
    }
  }

  unregisterAdapter(adapterId: string): void {
    this.adapters.delete(adapterId);

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

    const policy = normalizeAgentRuntimePolicy({
      ...this.defaultPolicy,
      ...options.policy,
    });

    const requestedAdapterId =
      resolveRequestedAdapterId(request, options) ??
      policy.fallbackModelId ??
      this.fallbackAdapterId ??
      this.onlySupportedAdapterId(request.game);

    const requestedAdapter = this.resolveAdapterById<TPublicState, TAction>(requestedAdapterId);

    if (!requestedAdapter) {
      const outcome = await this.runWithFallback<TPublicState, TAction>(
        request,
        policy,
        requestedAdapterId,
        "missing_adapter",
        overallStartedAtMs,
      );
      return this.applyOverallTiming(outcome, overallStartedAtMs);
    }

    if (!requestedAdapter.supports(request.game)) {
      const outcome = await this.runWithFallback<TPublicState, TAction>(
        request,
        policy,
        requestedAdapter.id,
        "unsupported_game",
        overallStartedAtMs,
      );
      return this.applyOverallTiming(outcome, overallStartedAtMs);
    }

    try {
      const outcome = await this.executeRequest(requestedAdapter, request, policy, [requestedAdapter.id], false);
      return this.applyOverallTiming(outcome, overallStartedAtMs);
    } catch (error) {
      const fallbackReason: AgentMoveFallbackReason =
        error instanceof AgentRuntimeTimeoutError ? "timeout" : "adapter_error";
      const outcome = await this.runWithFallback<TPublicState, TAction>(
        request,
        policy,
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

    const attemptedAdapterIds = uniqueSequence([attemptedAdapterId, fallbackAdapter.id]);
    const outcome = await this.executeRequest(
      fallbackAdapter,
      request,
      policy,
      attemptedAdapterIds,
      true,
      fallbackReason,
    );

    return {
      ...outcome,
      attemptCount: originalError ? outcome.attemptCount + 1 : outcome.attemptCount,
    };
  }

  private async executeRequest<TPublicState, TAction>(
    adapter: AgentRuntimeAdapter<TPublicState, TAction>,
    request: AgentMoveRequest<TPublicState, TAction>,
    policy: AgentRuntimePolicy,
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
    startedAtMs: number,
  ): Promise<{
    result: AgentMoveResult<TAction>;
    targetThinkTimeMs: number;
    actualThinkTimeMs: number;
  }> {
    const targetThinkTimeMs = computeAgentThinkTimeMs(request, policy, adapter.id);
    const result = await withTimeout(
      adapter.requestMove(request, policy),
      policy.requestTimeoutMs,
      adapter.id,
    );
    const elapsedBeforeSleepMs = this.clock.nowMs() - startedAtMs;

    if (elapsedBeforeSleepMs < targetThinkTimeMs) {
      await this.sleeper.sleep(targetThinkTimeMs - elapsedBeforeSleepMs);
    }

    const actualThinkTimeMs = this.clock.nowMs() - startedAtMs;
    return { result, targetThinkTimeMs, actualThinkTimeMs };
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

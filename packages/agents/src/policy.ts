import type { AgentMoveRequest, AgentRuntimePolicy } from "./types";

import { clampNumber, hashString, integerOrDefault, stableStringify } from "./utils";

export const DEFAULT_AGENT_RUNTIME_POLICY: Readonly<AgentRuntimePolicy> = {
  requestTimeoutMs: 5_000,
  minThinkTimeMs: 50,
  maxThinkTimeMs: 400,
  retryCount: 0,
};

export function normalizeAgentRuntimePolicy(
  policy: Partial<AgentRuntimePolicy> = {},
): AgentRuntimePolicy {
  const requestTimeoutMs = clampNumber(
    integerOrDefault(policy.requestTimeoutMs, DEFAULT_AGENT_RUNTIME_POLICY.requestTimeoutMs),
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const minThinkTimeMs = clampNumber(
    integerOrDefault(policy.minThinkTimeMs, DEFAULT_AGENT_RUNTIME_POLICY.minThinkTimeMs),
    0,
    requestTimeoutMs,
  );
  const maxThinkTimeMs = clampNumber(
    integerOrDefault(policy.maxThinkTimeMs, DEFAULT_AGENT_RUNTIME_POLICY.maxThinkTimeMs),
    minThinkTimeMs,
    requestTimeoutMs,
  );

  return {
    requestTimeoutMs,
    minThinkTimeMs,
    maxThinkTimeMs,
    retryCount: Math.max(0, integerOrDefault(policy.retryCount, DEFAULT_AGENT_RUNTIME_POLICY.retryCount)),
    fallbackModelId: normalizeOptionalString(policy.fallbackModelId),
  };
}

export function computeAgentThinkTimeMs<TPublicState, TAction>(
  request: AgentMoveRequest<TPublicState, TAction>,
  policy: AgentRuntimePolicy,
  adapterId: string,
): number {
  const normalizedPolicy = normalizeAgentRuntimePolicy(policy);

  if (normalizedPolicy.maxThinkTimeMs <= normalizedPolicy.minThinkTimeMs) {
    return normalizedPolicy.minThinkTimeMs;
  }

  const fingerprint = stableStringify({
    adapterId,
    availableActions: request.availableActions,
    deadlineIso: request.deadlineIso,
    game: request.game,
    privateSeat: {
      backingType: request.privateSeat.backingType,
      llmModelId: request.privateSeat.llmModelId,
      promptVersionId: request.privateSeat.promptVersionId,
      seatId: request.privateSeat.seatId,
      timingProfileId: request.privateSeat.timingProfileId,
    },
    publicState: request.publicState,
    seatId: request.seatId,
  });

  const span = normalizedPolicy.maxThinkTimeMs - normalizedPolicy.minThinkTimeMs;
  const offset = hashString(fingerprint) % (span + 1);
  return normalizedPolicy.minThinkTimeMs + offset;
}

export function isAgentControlledSeat(backingType: AgentMoveRequest["privateSeat"]["backingType"]): boolean {
  return backingType !== "human";
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}


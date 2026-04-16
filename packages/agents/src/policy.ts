import type {
  AgentMoveRequest,
  AgentRuntimePolicy,
  AgentTimingProfile,
} from "./types";

import { clampNumber, hashString, integerOrDefault, stableStringify } from "./utils";

export const DEFAULT_AGENT_RUNTIME_POLICY: Readonly<AgentRuntimePolicy> = {
  requestTimeoutMs: 5_000,
  minThinkTimeMs: 50,
  maxThinkTimeMs: 400,
  retryCount: 0,
};

export const DEFAULT_AGENT_TIMING_PROFILES: readonly AgentTimingProfile[] = [
  {
    id: "instant",
    label: "Instant",
    description: "Useful for CI or deterministic scripted seats.",
    minThinkTimeMs: 0,
    maxThinkTimeMs: 0,
  },
  {
    id: "snappy",
    label: "Snappy",
    description: "Fast but still human-looking for tight multiplayer loops.",
    minThinkTimeMs: 90,
    maxThinkTimeMs: 220,
  },
  {
    id: "deliberate",
    label: "Deliberate",
    description: "Balanced hidden-seat pacing for normal turns.",
    minThinkTimeMs: 180,
    maxThinkTimeMs: 520,
  },
  {
    id: "cinematic",
    label: "Cinematic",
    description: "Longer pacing for high-suspense turns and demo rooms.",
    minThinkTimeMs: 450,
    maxThinkTimeMs: 1_100,
  },
] as const;

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
  timingProfile?: AgentTimingProfile,
): number {
  const normalizedPolicy = applyTimingProfileToPolicy(policy, timingProfile);

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

export function resolveAgentTimingProfile(
  timingProfileId: string | undefined,
  timingProfiles: readonly AgentTimingProfile[] = DEFAULT_AGENT_TIMING_PROFILES,
): AgentTimingProfile | undefined {
  const normalizedId = normalizeOptionalString(timingProfileId);
  if (!normalizedId) {
    return undefined;
  }

  return timingProfiles.find((profile) => profile.id === normalizedId);
}

export function applyTimingProfileToPolicy(
  policy: Partial<AgentRuntimePolicy>,
  timingProfile: AgentTimingProfile | undefined,
): AgentRuntimePolicy {
  const normalizedPolicy = normalizeAgentRuntimePolicy(policy);

  if (!timingProfile) {
    return normalizedPolicy;
  }

  return normalizeAgentRuntimePolicy({
    ...normalizedPolicy,
    minThinkTimeMs: timingProfile.minThinkTimeMs ?? normalizedPolicy.minThinkTimeMs,
    maxThinkTimeMs: timingProfile.maxThinkTimeMs ?? normalizedPolicy.maxThinkTimeMs,
  });
}

export function clampPolicyToDeadline(
  policy: AgentRuntimePolicy,
  deadlineIso: string,
  nowMs: number,
): AgentRuntimePolicy {
  const deadlineMs = Date.parse(deadlineIso);
  if (!Number.isFinite(deadlineMs)) {
    return normalizeAgentRuntimePolicy(policy);
  }

  const remainingMs = Math.max(1, Math.trunc(deadlineMs - nowMs));
  return normalizeAgentRuntimePolicy({
    ...policy,
    requestTimeoutMs: Math.min(policy.requestTimeoutMs, remainingMs),
  });
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

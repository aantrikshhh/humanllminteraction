import assert from "node:assert/strict";
import test from "node:test";

import {
  AgentRuntimeRegistry,
  DeterministicFakeAgentAdapter,
  normalizeAgentRuntimePolicy,
} from "../../packages/agents/src/index.ts";

const publicState = {
  round: 1,
  potUsd: 10,
  players: ["alpha", "beta"],
};

const seat = {
  seatId: "seat_1",
  displayName: "Seat 1",
  avatarId: "avatar-01",
  isConnected: true,
  isReady: true,
};

const privateSeat = {
  seatId: "seat_1",
  backingType: "llm" as const,
  llmModelId: "primary-model",
  promptVersionId: "prompt-v1",
  timingProfileId: "timing-v1",
};

test("normalizeAgentRuntimePolicy clamps invalid values", () => {
  const policy = normalizeAgentRuntimePolicy({
    requestTimeoutMs: 0,
    minThinkTimeMs: 200,
    maxThinkTimeMs: 20,
    retryCount: -2,
    fallbackModelId: "  ci-fallback  ",
  });

  assert.equal(policy.requestTimeoutMs, 1);
  assert.equal(policy.minThinkTimeMs, 1);
  assert.equal(policy.maxThinkTimeMs, 1);
  assert.equal(policy.retryCount, 0);
  assert.equal(policy.fallbackModelId, "ci-fallback");
});

test("DeterministicFakeAgentAdapter chooses the same action for the same request", async () => {
  const adapter = new DeterministicFakeAgentAdapter({ id: "fake-ci" });
  const request = {
    game: "auction" as const,
    seatId: seat.seatId,
    publicState,
    privateSeat,
    availableActions: [
      { type: "bid", amount: 10 },
      { type: "pass" },
      { type: "bid", amount: 25 },
    ],
    deadlineIso: "2026-04-16T10:00:00.000Z",
  };

  const first = await adapter.requestMove(request, normalizeAgentRuntimePolicy());
  const second = await adapter.requestMove(request, normalizeAgentRuntimePolicy());

  assert.deepEqual(first.action, second.action);
  assert.equal(first.modelId, "primary-model");
  assert.equal(first.promptVersionId, "prompt-v1");
  assert.ok(first.latencyMs >= 0);
});

test("AgentRuntimeRegistry exposes catalog metadata and fills prompt and timing defaults", async () => {
  const registry = new AgentRuntimeRegistry();
  registry.registerAdapter(
    new DeterministicFakeAgentAdapter({
      id: "auction-primary-adapter",
      supportedGames: ["auction"],
      defaultModelId: "adapter-default-model",
      defaultPromptVersionId: "adapter-prompt-v0",
    }),
    {
      aliases: ["auction-primary", "gpt-5.4-arena"],
      modelProfile: {
        id: "gpt-5.4-arena",
        label: "Arena Primary",
        provider: "openai",
        reasoningEffort: "high",
        recommendedSkills: ["openai-docs", "playwright"],
      },
      promptProfiles: [
        {
          id: "auction-hidden-seat-v2",
          label: "Auction Hidden Seat V2",
          games: ["auction"],
        },
      ],
      timingProfiles: [
        {
          id: "broadcast",
          minThinkTimeMs: 120,
          maxThinkTimeMs: 180,
        },
      ],
    },
  );

  const catalogEntry = registry.getAdapterCatalogEntry("auction-primary");
  assert.ok(catalogEntry);
  assert.equal(catalogEntry.adapterId, "auction-primary-adapter");
  assert.equal(catalogEntry.fallback, true);
  assert.deepEqual(catalogEntry.aliases, ["auction-primary", "gpt-5.4-arena"]);
  assert.deepEqual(catalogEntry.supportedGames, ["auction"]);
  assert.equal(catalogEntry.modelProfile.id, "gpt-5.4-arena");
  assert.equal(catalogEntry.modelProfile.reasoningEffort, "high");
  assert.deepEqual(catalogEntry.modelProfile.recommendedSkills, ["openai-docs", "playwright"]);
  assert.ok(catalogEntry.timingProfiles.some((profile) => profile.id === "broadcast"));
  assert.ok(catalogEntry.timingProfiles.some((profile) => profile.id === "deliberate"));

  const outcome = await registry.requestMove(
    {
      game: "auction",
      seatId: seat.seatId,
      publicState,
      privateSeat: {
        ...privateSeat,
        llmModelId: undefined,
        promptVersionId: undefined,
        timingProfileId: "broadcast",
      },
      availableActions: [
        { type: "bid", amount: 10 },
        { type: "pass" },
      ],
      deadlineIso: "2026-04-16T10:00:00.000Z",
    },
    {
      adapterId: "auction-primary",
      policy: {
        minThinkTimeMs: 0,
        maxThinkTimeMs: 0,
      },
    },
  );

  assert.equal(outcome.adapterId, "auction-primary-adapter");
  assert.equal(outcome.modelId, "gpt-5.4-arena");
  assert.equal(outcome.promptVersionId, "auction-hidden-seat-v2");
  assert.ok(outcome.targetThinkTimeMs >= 120);
  assert.ok(outcome.targetThinkTimeMs <= 180);
});

test("AgentRuntimeRegistry falls back to a deterministic adapter after timeout", async () => {
  const registry = new AgentRuntimeRegistry({
    adapters: [
      {
        id: "primary-model",
        supports: () => true,
        requestMove: async () => new Promise(() => {}),
      },
    ],
    fallbackAdapter: new DeterministicFakeAgentAdapter({ id: "ci-fallback" }),
  });

  const outcome = await registry.requestMove(
    {
      game: "auction",
      seatId: seat.seatId,
      publicState,
      privateSeat,
      availableActions: [
        { type: "bid", amount: 10 },
        { type: "pass" },
      ],
      deadlineIso: "2026-04-16T10:00:00.000Z",
    },
    {
      policy: {
        requestTimeoutMs: 20,
        minThinkTimeMs: 0,
        maxThinkTimeMs: 0,
        retryCount: 0,
      },
    },
  );

  assert.equal(outcome.usedFallbackAdapter, true);
  assert.equal(outcome.fallbackReason, "timeout");
  assert.equal(outcome.adapterId, "ci-fallback");
  assert.equal(outcome.seatId, seat.seatId);
  assert.equal(outcome.timedOut, false);
  assert.ok(outcome.actualThinkTimeMs >= 0);
  assert.ok(outcome.targetThinkTimeMs >= 0);
  assert.ok(outcome.attemptedAdapterIds.includes("primary-model"));
  assert.ok(outcome.attemptedAdapterIds.includes("ci-fallback"));
});

test("AgentRuntimeRegistry falls back when an adapter returns an invalid action", async () => {
  const registry = new AgentRuntimeRegistry({
    adapters: [
      {
        id: "primary-model",
        supports: () => true,
        requestMove: async () => ({
          seatId: "seat_999",
          action: { type: "raise", amount: 99 },
          latencyMs: 0,
          modelId: "primary-model",
          promptVersionId: "broken-prompt",
        }),
      },
    ],
    fallbackAdapter: new DeterministicFakeAgentAdapter({ id: "ci-fallback" }),
  });

  const outcome = await registry.requestMove(
    {
      game: "auction",
      seatId: seat.seatId,
      publicState,
      privateSeat,
      availableActions: [
        { type: "bid", amount: 10 },
        { type: "pass" },
      ],
      deadlineIso: "2026-04-16T10:00:00.000Z",
    },
    {
      policy: {
        minThinkTimeMs: 0,
        maxThinkTimeMs: 0,
      },
    },
  );

  assert.equal(outcome.usedFallbackAdapter, true);
  assert.equal(outcome.fallbackReason, "invalid_action");
  assert.equal(outcome.adapterId, "ci-fallback");
  assert.deepEqual(outcome.action, outcome.action);
  assert.ok(outcome.attemptedAdapterIds.includes("primary-model"));
  assert.ok(outcome.attemptedAdapterIds.includes("ci-fallback"));
});

test("AgentRuntimeRegistry clamps think time to the request deadline", async () => {
  let nowMs = Date.parse("2026-04-16T10:00:00.000Z");
  const registry = new AgentRuntimeRegistry({
    fallbackAdapter: new DeterministicFakeAgentAdapter({
      id: "ci-fallback",
      supportedGames: ["auction"],
    }),
    clock: {
      nowMs: () => nowMs,
    },
    sleeper: {
      sleep: async (ms) => {
        nowMs += ms;
      },
    },
    policy: {
      requestTimeoutMs: 5_000,
    },
  });

  registry.registerAdapter(
    new DeterministicFakeAgentAdapter({
      id: "deadline-aware",
      supportedGames: ["auction"],
    }),
    {
      fallback: true,
      timingProfiles: [
        {
          id: "showtime",
          minThinkTimeMs: 200,
          maxThinkTimeMs: 300,
        },
      ],
    },
  );

  const outcome = await registry.requestMove(
    {
      game: "auction",
      seatId: seat.seatId,
      publicState,
      privateSeat: {
        ...privateSeat,
        llmModelId: "deadline-aware",
        promptVersionId: undefined,
        timingProfileId: "showtime",
      },
      availableActions: [
        { type: "bid", amount: 10 },
        { type: "pass" },
      ],
      deadlineIso: "2026-04-16T10:00:00.040Z",
    },
    {
      policy: {
        minThinkTimeMs: 0,
        maxThinkTimeMs: 0,
      },
    },
  );

  assert.ok(outcome.targetThinkTimeMs <= 40);
  assert.ok(outcome.actualThinkTimeMs <= 40);
  assert.equal(outcome.timedOut, false);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AgentRuntimeRegistry,
  DeterministicFakeAgentAdapter,
  normalizeAgentRuntimePolicy,
} from '../../packages/agents/src/index.ts';

const publicState = {
  round: 1,
  potUsd: 10,
  players: ['alpha', 'beta'],
};

const seat = {
  seatId: 'seat_1',
  displayName: 'Seat 1',
  avatarId: 'avatar-01',
  isConnected: true,
  isReady: true,
};

const privateSeat = {
  seatId: 'seat_1',
  backingType: 'llm',
  llmModelId: 'primary-model',
  promptVersionId: 'prompt-v1',
  timingProfileId: 'timing-v1',
};

test('normalizeAgentRuntimePolicy clamps invalid values', () => {
  const policy = normalizeAgentRuntimePolicy({
    requestTimeoutMs: 0,
    minThinkTimeMs: 200,
    maxThinkTimeMs: 20,
    retryCount: -2,
    fallbackModelId: '  ci-fallback  ',
  });

  assert.equal(policy.requestTimeoutMs, 1);
  assert.equal(policy.minThinkTimeMs, 1);
  assert.equal(policy.maxThinkTimeMs, 1);
  assert.equal(policy.retryCount, 0);
  assert.equal(policy.fallbackModelId, 'ci-fallback');
});

test('DeterministicFakeAgentAdapter chooses the same action for the same request', async () => {
  const adapter = new DeterministicFakeAgentAdapter({ id: 'fake-ci' });
  const request = {
    game: 'auction',
    seatId: seat.seatId,
    publicState,
    privateSeat,
    availableActions: [
      { type: 'bid', amount: 10 },
      { type: 'pass' },
      { type: 'bid', amount: 25 },
    ],
    deadlineIso: '2026-04-16T10:00:00.000Z',
  };

  const first = await adapter.requestMove(request, normalizeAgentRuntimePolicy());
  const second = await adapter.requestMove(request, normalizeAgentRuntimePolicy());

  assert.deepEqual(first.action, second.action);
  assert.equal(first.modelId, 'primary-model');
  assert.equal(first.promptVersionId, 'prompt-v1');
  assert.ok(first.latencyMs >= 0);
});

test('AgentRuntimeRegistry falls back to a deterministic adapter after timeout', async () => {
  const registry = new AgentRuntimeRegistry({
    adapters: [
      {
        id: 'primary-model',
        supports: () => true,
        requestMove: async () => new Promise(() => {}),
      },
    ],
    fallbackAdapter: new DeterministicFakeAgentAdapter({ id: 'ci-fallback' }),
  });

  const outcome = await registry.requestMove(
    {
      game: 'auction',
      seatId: seat.seatId,
      publicState,
      privateSeat,
      availableActions: [
        { type: 'bid', amount: 10 },
        { type: 'pass' },
      ],
      deadlineIso: '2026-04-16T10:00:00.000Z',
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
  assert.equal(outcome.fallbackReason, 'timeout');
  assert.equal(outcome.adapterId, 'ci-fallback');
  assert.equal(outcome.seatId, seat.seatId);
  assert.equal(outcome.timedOut, false);
  assert.ok(outcome.actualThinkTimeMs >= 0);
  assert.ok(outcome.targetThinkTimeMs >= 0);
  assert.ok(outcome.attemptedAdapterIds.includes('primary-model'));
  assert.ok(outcome.attemptedAdapterIds.includes('ci-fallback'));
});

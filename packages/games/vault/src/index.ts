import type {
  VaultAction,
  VaultActionEnvelope,
  VaultBrief,
  VaultGameModule,
  VaultPrivateState,
  VaultPublicRoomState,
  VaultPublicState,
} from "./types";

import {
  VAULT_CORRECT_ACCUSATION_BONUS,
  VAULT_DETECTED_FREE_RIDER_PENALTY,
  VAULT_ENDOWMENT_PER_ROUND,
  VAULT_MULTIPLIER,
  VAULT_ROUNDS,
  createBlankRound,
  createVaultConfig,
  createVaultSeats,
} from "./types";

import {
  applyVaultAction,
  createVaultState,
  finalizeVaultMatch,
  isVaultAction,
  projectVaultPublicState,
  validateVaultAction,
} from "./state";

export const vaultBrief: VaultBrief = {
  id: "vault",
  title: "The Vault",
  summary:
    "A multiplayer public-goods match where contributions stay private, the pool is revealed, and the room hunts for free-riders.",
  playerCountLabel: "4-6 seats",
  visualDirection: "pixel treasury chamber",
  priority: "p1",
};

export const vaultModule: VaultGameModule = {
  key: "vault",
  minSeats: 4,
  maxSeats: 6,
  timers: {
    readyMs: 15_000,
    actionMs: 18_000,
    revealMs: 4_000,
    resultsMs: 8_000,
  },
  createInitialState: createVaultState,
  projectPublicState: projectVaultPublicState,
  validateAction: (ctx, action) => validateVaultAction(ctx.state, action),
  reduce: (ctx, action) => {
    const result = applyVaultAction(ctx.state, action, ctx.nowIso);
    return {
      ...result,
      publicState: projectVaultPublicState(result.nextState, action.seatId),
    };
  },
  finalizeMatch: finalizeVaultMatch,
};

export {
  VAULT_CORRECT_ACCUSATION_BONUS,
  VAULT_DETECTED_FREE_RIDER_PENALTY,
  VAULT_ENDOWMENT_PER_ROUND,
  VAULT_MULTIPLIER,
  VAULT_ROUNDS,
  applyVaultAction,
  createBlankRound,
  createVaultConfig,
  createVaultSeats,
  createVaultState,
  finalizeVaultMatch,
  isVaultAction,
  projectVaultPublicState,
  validateVaultAction,
};

export type {
  VaultAction,
  VaultActionEnvelope,
  VaultBrief,
  VaultGameModule,
  VaultPrivateState,
  VaultPublicRoomState,
  VaultPublicState,
};

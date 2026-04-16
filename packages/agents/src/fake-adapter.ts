import type { GameKey } from "@arena/contracts";

import { computeAgentThinkTimeMs } from "./policy";
import type {
  AgentMoveRequest,
  AgentMoveResult,
  AgentRuntimeAdapter,
  AgentRuntimePolicy,
} from "./types";
import { hashString, stableStringify } from "./utils";

export interface DeterministicFakeAgentAdapterOptions<TPublicState = unknown, TAction = unknown> {
  id?: string;
  supportedGames?: readonly GameKey[];
  defaultModelId?: string;
  defaultPromptVersionId?: string;
  fallbackActionFactory?: (request: AgentMoveRequest<TPublicState, TAction>) => TAction;
}

export class DeterministicFakeAgentAdapter<TPublicState = unknown, TAction = unknown>
  implements AgentRuntimeAdapter<TPublicState, TAction>
{
  public readonly id: string;

  private readonly supportedGames?: readonly GameKey[];

  private readonly defaultModelId: string;

  private readonly defaultPromptVersionId: string;

  private readonly fallbackActionFactory?: (
    request: AgentMoveRequest<TPublicState, TAction>,
  ) => TAction;

  constructor(options: DeterministicFakeAgentAdapterOptions<TPublicState, TAction> = {}) {
    this.id = options.id ?? "deterministic-fake";
    this.supportedGames = options.supportedGames;
    this.defaultModelId = options.defaultModelId ?? this.id;
    this.defaultPromptVersionId = options.defaultPromptVersionId ?? "fake-prompt-v1";
    this.fallbackActionFactory = options.fallbackActionFactory;
  }

  supports(game: GameKey): boolean {
    if (!this.supportedGames) {
      return true;
    }

    return this.supportedGames.includes(game);
  }

  async requestMove(
    request: AgentMoveRequest<TPublicState, TAction>,
    policy: AgentRuntimePolicy,
  ): Promise<AgentMoveResult<TAction>> {
    const action = this.chooseAction(request);

    return {
      seatId: request.seatId,
      action,
      latencyMs: computeAgentThinkTimeMs(request, policy, this.id),
      modelId: request.privateSeat.llmModelId ?? policy.fallbackModelId ?? this.defaultModelId,
      promptVersionId: request.privateSeat.promptVersionId ?? this.defaultPromptVersionId,
    };
  }

  private chooseAction(request: AgentMoveRequest<TPublicState, TAction>): TAction {
    if (request.availableActions.length === 0) {
      if (this.fallbackActionFactory) {
        return this.fallbackActionFactory(request);
      }

      throw new Error(
        `Deterministic fake adapter ${this.id} requires at least one available action or a fallbackActionFactory.`,
      );
    }

    const fingerprint = stableStringify({
      adapterId: this.id,
      actions: request.availableActions,
      deadlineIso: request.deadlineIso,
      game: request.game,
      publicState: request.publicState,
      seatId: request.seatId,
    });
    const index = hashString(fingerprint) % request.availableActions.length;

    return request.availableActions[index] as TAction;
  }
}


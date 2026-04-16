import type { GameKey } from "@arena/contracts";

import { computeAgentThinkTimeMs } from "./policy";
import type {
  AgentMoveRequest,
  AgentMoveResult,
  AgentRuntimeAdapter,
  AgentRuntimePolicy,
} from "./types";

type FetchLike = typeof fetch;

export interface OpenAIResponsesAgentAdapterOptions<TPublicState = unknown, TAction = unknown> {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  defaultPromptVersionId?: string;
  id?: string;
  reasoningEffort?: "low" | "medium" | "high" | "xhigh";
  supportedGames?: readonly GameKey[];
  fetchImpl?: FetchLike;
}

interface OpenAIResponsePayload {
  error?: {
    message?: string;
  };
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}

export class OpenAIResponsesAgentAdapter<TPublicState = unknown, TAction = unknown>
  implements AgentRuntimeAdapter<TPublicState, TAction>
{
  public readonly id: string;

  private readonly apiKey: string;

  private readonly baseUrl: string;

  private readonly defaultModel: string;

  private readonly defaultPromptVersionId: string;

  private readonly reasoningEffort?: "low" | "medium" | "high" | "xhigh";

  private readonly supportedGames?: readonly GameKey[];

  private readonly fetchImpl: FetchLike;

  constructor(options: OpenAIResponsesAgentAdapterOptions<TPublicState, TAction> = {}) {
    const apiKey = options.apiKey?.trim() || process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("OpenAIResponsesAgentAdapter requires OPENAI_API_KEY.");
    }

    this.id = options.id ?? "arena-openai-live";
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
    this.defaultModel = options.defaultModel ?? process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
    this.defaultPromptVersionId =
      options.defaultPromptVersionId ?? process.env.OPENAI_PROMPT_VERSION_ID ?? "arena-openai-v1";
    this.reasoningEffort =
      options.reasoningEffort ?? normalizeReasoningEffort(process.env.OPENAI_REASONING_EFFORT);
    this.supportedGames = options.supportedGames;
    this.fetchImpl = options.fetchImpl ?? fetch;
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
    if (request.availableActions.length === 0) {
      throw new Error(`OpenAI adapter ${this.id} cannot act without available actions.`);
    }

    const response = await this.fetchImpl(`${this.baseUrl}/responses`, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(this.buildPayload(request)),
    });

    const payload = (await response.json()) as OpenAIResponsePayload;
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `OpenAI request failed with status ${response.status}.`);
    }

    const text = extractResponseText(payload);
    const actionIndex = parseActionIndex(text, request.availableActions.length);

    return {
      seatId: request.seatId,
      action: request.availableActions[actionIndex] as TAction,
      latencyMs: computeAgentThinkTimeMs(request, policy, this.id),
      modelId: this.defaultModel,
      promptVersionId: request.privateSeat.promptVersionId ?? this.defaultPromptVersionId,
    };
  }

  private buildPayload(request: AgentMoveRequest<TPublicState, TAction>) {
    const actions = request.availableActions.map((action, index) => ({
      index,
      action,
    }));

    const systemPrompt = [
      "You are controlling one hidden seat inside ARENA, a multiplayer social-strategy game.",
      "Stay in character as a seat, not as an assistant.",
      "Choose exactly one legal move from the provided action list.",
      "Do not mention being an AI, a model, an API, or a simulation.",
      "Return strict JSON with a single integer field named actionIndex.",
    ].join(" ");

    const userPrompt = [
      `Game: ${request.game}.`,
      `Seat: ${request.seatId}.`,
      `Deadline: ${request.deadlineIso}.`,
      "Public room state:",
      JSON.stringify(request.publicState),
      "Available actions by index:",
      JSON.stringify(actions),
      "Pick the index of the strongest legal move for this seat.",
    ].join("\n");

    const body: Record<string, unknown> = {
      model: this.defaultModel,
      store: false,
      max_output_tokens: 120,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "arena_move",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              actionIndex: {
                type: "integer",
                minimum: 0,
                maximum: Math.max(0, request.availableActions.length - 1),
              },
            },
            required: ["actionIndex"],
          },
        },
      },
    };

    if (this.reasoningEffort) {
      body.reasoning = { effort: this.reasoningEffort };
    }

    return body;
  }
}

function normalizeReasoningEffort(value: string | undefined): "low" | "medium" | "high" | "xhigh" | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high" || normalized === "xhigh") {
    return normalized;
  }

  return undefined;
}

function extractResponseText(payload: OpenAIResponsePayload): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string" && content.text.trim()) {
        return content.text;
      }
    }
  }

  throw new Error("OpenAI response did not include any text output.");
}

function parseActionIndex(text: string, actionCount: number): number {
  const trimmed = text.trim();
  const parsed = JSON.parse(trimmed) as { actionIndex?: unknown };
  const actionIndex =
    typeof parsed.actionIndex === "number" ? Math.trunc(parsed.actionIndex) : Number.NaN;

  if (!Number.isInteger(actionIndex) || actionIndex < 0 || actionIndex >= actionCount) {
    throw new Error(`OpenAI response returned invalid actionIndex: ${String(parsed.actionIndex)}`);
  }

  return actionIndex;
}

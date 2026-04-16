import type { IncomingMessage, ServerResponse } from "node:http";

import {
  createInMemoryPaymentsEngine,
  type CreateEscrowInput,
  type CreateWalletInput,
  type MatchSettlementInput,
  type PaymentsEngine,
} from "@arena/payments";

import { recordMatchSettlement } from "./match-ledger-store";

export interface PaymentsApi {
  connectWallet(input: CreateWalletInput): ReturnType<PaymentsEngine["connectWallet"]>;
  getWallet(playerId: string): ReturnType<PaymentsEngine["getWalletSummary"]>;
  createEscrow(input: CreateEscrowInput): ReturnType<PaymentsEngine["createEscrow"]>;
  authorizeEscrow(escrowId: string, note?: string): ReturnType<PaymentsEngine["authorizeEscrow"]>;
  fundEscrow(escrowId: string, note?: string): ReturnType<PaymentsEngine["fundEscrow"]>;
  lockEscrow(escrowId: string, note?: string): ReturnType<PaymentsEngine["lockEscrow"]>;
  settleMatch(input: MatchSettlementInput): ReturnType<PaymentsEngine["createPayouts"]>;
  claimPayout(payoutId: string, note?: string): ReturnType<PaymentsEngine["requestPayoutClaim"]>;
  getPlayerSnapshot(playerId: string): ReturnType<PaymentsEngine["getPlayerSnapshot"]>;
  getEscrow(escrowId: string): ReturnType<PaymentsEngine["getEscrow"]>;
  getPayout(payoutId: string): ReturnType<PaymentsEngine["getPayout"]>;
}

export function createPaymentsApi(engine: PaymentsEngine = createInMemoryPaymentsEngine()): PaymentsApi {
  return {
    connectWallet: (input) => engine.connectWallet(input),
    getWallet: (playerId) => engine.getWalletSummary(playerId),
    createEscrow: (input) => engine.createEscrow(input),
    authorizeEscrow: (escrowId, note) => engine.authorizeEscrow(escrowId, note),
    fundEscrow: (escrowId, note) => engine.fundEscrow(escrowId, note),
    lockEscrow: (escrowId, note) => engine.lockEscrow(escrowId, note),
    settleMatch: (input) => engine.createPayouts(input),
    claimPayout: (payoutId, note) => engine.requestPayoutClaim(payoutId, note),
    getPlayerSnapshot: (playerId) => engine.getPlayerSnapshot(playerId),
    getEscrow: (escrowId) => engine.getEscrow(escrowId),
    getPayout: (payoutId) => engine.getPayout(payoutId),
  };
}

export const paymentsApi = createPaymentsApi();

export async function handlePaymentsRequest(
  request: IncomingMessage,
  response: ServerResponse,
  api: PaymentsApi = paymentsApi,
): Promise<boolean> {
  const url = new URL(request.url ?? "/", "http://localhost");
  const method = request.method?.toUpperCase() ?? "GET";

  try {
    if (method === "GET" && url.pathname === "/payments/health") {
      writeJson(response, 200, {
        service: "@arena/api/payments",
        status: "ok",
        simulated: true,
      });
      return true;
    }

    const walletMatch = matchPath(url.pathname, /^\/payments\/players\/([^/]+)\/wallet$/u);
    if (method === "GET" && walletMatch) {
      writeJson(response, 200, api.getWallet(walletMatch[1]));
      return true;
    }

    const connectWalletMatch = matchPath(
      url.pathname,
      /^\/payments\/players\/([^/]+)\/wallet\/connect$/u,
    );
    if (method === "POST" && connectWalletMatch) {
      const body = await readJson<CreateWalletInput>(request);
      writeJson(response, 200, api.connectWallet({ ...body, playerId: connectWalletMatch[1] }));
      return true;
    }

    const playerMatch = matchPath(url.pathname, /^\/payments\/players\/([^/]+)$/u);
    if (method === "GET" && playerMatch) {
      writeJson(response, 200, api.getPlayerSnapshot(playerMatch[1]));
      return true;
    }

    if (method === "POST" && url.pathname === "/payments/escrows") {
      const body = await readJson<CreateEscrowInput>(request);
      writeJson(response, 201, api.createEscrow(body));
      return true;
    }

    const authorizeMatch = matchPath(url.pathname, /^\/payments\/escrows\/([^/]+)\/authorize$/u);
    if (method === "POST" && authorizeMatch) {
      const body = await readJson<{ note?: string }>(request);
      writeJson(response, 200, api.authorizeEscrow(authorizeMatch[1], body.note));
      return true;
    }

    const fundMatch = matchPath(url.pathname, /^\/payments\/escrows\/([^/]+)\/fund$/u);
    if (method === "POST" && fundMatch) {
      const body = await readJson<{ note?: string }>(request);
      writeJson(response, 200, api.fundEscrow(fundMatch[1], body.note));
      return true;
    }

    const lockMatch = matchPath(url.pathname, /^\/payments\/escrows\/([^/]+)\/lock$/u);
    if (method === "POST" && lockMatch) {
      const body = await readJson<{ note?: string }>(request);
      writeJson(response, 200, api.lockEscrow(lockMatch[1], body.note));
      return true;
    }

    const escrowMatch = matchPath(url.pathname, /^\/payments\/escrows\/([^/]+)$/u);
    if (method === "GET" && escrowMatch) {
      writeJson(response, 200, api.getEscrow(escrowMatch[1]));
      return true;
    }

    if (method === "POST" && url.pathname === "/payments/settlements") {
      const body = await readJson<MatchSettlementInput>(request);
      const payouts = api.settleMatch(body);
      recordMatchSettlement(body, payouts, api.getEscrow(body.escrowId));
      writeJson(response, 201, payouts);
      return true;
    }

    const claimMatch = matchPath(url.pathname, /^\/payments\/payouts\/([^/]+)\/claim$/u);
    if (method === "POST" && claimMatch) {
      const body = await readJson<{ note?: string }>(request);
      writeJson(response, 200, api.claimPayout(claimMatch[1], body.note));
      return true;
    }

    const payoutMatch = matchPath(url.pathname, /^\/payments\/payouts\/([^/]+)$/u);
    if (method === "GET" && payoutMatch) {
      writeJson(response, 200, api.getPayout(payoutMatch[1]));
      return true;
    }
  } catch (error) {
    writeJson(response, 400, {
      error: "payments_error",
      message: error instanceof Error ? error.message : "unknown error",
    });
    return true;
  }

  return false;
}

function matchPath(pathname: string, pattern: RegExp): RegExpMatchArray | null {
  return pathname.match(pattern);
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {} as T;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

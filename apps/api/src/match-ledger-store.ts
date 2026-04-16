import type {
  MatchCompletionEnvelope,
  MatchResult,
  PlayerId,
  PublicMatchResultSummary,
  PublicMatchSyncState,
  SeatId,
} from "@arena/contracts";
import type {
  LeaderboardApplyResult,
  ResolvedLeaderboardMatch,
} from "@arena/leaderboard";
import type {
  EscrowRecord,
  MatchSettlementInput,
  PayoutLedgerRecord,
} from "@arena/payments";

import type {
  MatchLedgerParticipant,
  MatchLedgerRecord,
  MatchLedgerSeatImpact,
} from "./match-ledger-types";

const recordsByMatchId = new Map<string, MatchLedgerRecord>();
const matchIdsByRoomId = new Map<string, Set<string>>();

export function getMatchLedgerRecordByMatchId(matchId: string): MatchLedgerRecord | undefined {
  return recordsByMatchId.get(matchId);
}

export function getMatchLedgerRecordByRoomId(roomId: string): MatchLedgerRecord | undefined {
  const matchIds = matchIdsByRoomId.get(roomId);
  if (!matchIds || matchIds.size === 0) {
    return undefined;
  }

  return [...matchIds]
    .map((matchId) => recordsByMatchId.get(matchId))
    .filter((record): record is MatchLedgerRecord => Boolean(record))
    .sort(compareLedgerRecords)
    .at(-1);
}

export function recordMatchCompletion(
  completion: MatchCompletionEnvelope,
  matchSync?: PublicMatchSyncState,
): MatchLedgerRecord {
  const existing = recordsByMatchId.get(completion.matchId);
  const mergedCompletion = existing
    ? mergeCompletion(existing.completion, completion)
    : normalizeCompletion(completion);
  const result = mergedCompletion.result;
  const participants = mergeParticipants(existing?.participants ?? [], [], result, mergedCompletion);
  const next = finalizeRecord({
    matchId: mergedCompletion.matchId,
    roomId: mergedCompletion.roomId,
    game: mergedCompletion.game,
    completedAt: mergedCompletion.completedAt,
    publicResult: toPublicResult(result),
    completion: mergedCompletion,
    matchSync: mergeMatchSync(existing?.matchSync, matchSync),
    participants,
    leaderboard: existing?.leaderboard,
    payments: existing?.payments,
  });

  return storeRecord(next);
}

export function recordMatchLeaderboardApplication(
  match: ResolvedLeaderboardMatch,
  applied: LeaderboardApplyResult,
): MatchLedgerRecord {
  const existing = recordsByMatchId.get(match.result.matchId);
  const inferredCompletion = createCompletionFromResult(
    match.result,
    Object.fromEntries(match.participants.map((participant) => [participant.seatId, participant.playerId])),
  );
  const completion = existing ? mergeCompletion(existing.completion, inferredCompletion) : inferredCompletion;
  const participants = mergeParticipants(existing?.participants ?? [], match.participants, match.result, completion);
  const next = finalizeRecord({
    matchId: match.result.matchId,
    roomId: match.result.roomId,
    game: match.result.game,
    completedAt: match.result.completedAt,
    publicResult: toPublicResult(match.result),
    completion,
    matchSync: existing?.matchSync,
    participants,
    leaderboard: {
      appliedAt: applied.appliedAt,
      applied,
    },
    payments: existing?.payments,
  });

  return storeRecord(next);
}

export function recordMatchSettlement(
  input: MatchSettlementInput,
  payouts: PayoutLedgerRecord[],
  escrow?: EscrowRecord,
): MatchLedgerRecord {
  const existing = recordsByMatchId.get(input.result.matchId);
  const inferredCompletion = createCompletionFromResult(input.result, input.seatToPlayerId);
  const completion = existing ? mergeCompletion(existing.completion, inferredCompletion) : inferredCompletion;
  const participants = mergeParticipants(existing?.participants ?? [], [], input.result, completion);
  const settledAt =
    escrow?.updatedAt ??
    payouts.reduce<string>(
      (latest, payout) => (payout.updatedAt > latest ? payout.updatedAt : latest),
      input.result.completedAt,
    );
  const next = finalizeRecord({
    matchId: input.result.matchId,
    roomId: input.result.roomId,
    game: input.result.game,
    completedAt: input.result.completedAt,
    publicResult: toPublicResult(input.result),
    completion,
    matchSync: existing?.matchSync,
    participants,
    leaderboard: existing?.leaderboard,
    payments: {
      settledAt,
      escrowId: input.escrowId,
      totalPayoutUsd: payouts.reduce((sum, payout) => sum + payout.amountUsd, 0),
      escrow,
      payouts,
    },
  });

  return storeRecord(next);
}

function storeRecord(record: MatchLedgerRecord): MatchLedgerRecord {
  recordsByMatchId.set(record.matchId, record);
  const roomMatches = matchIdsByRoomId.get(record.roomId) ?? new Set<string>();
  roomMatches.add(record.matchId);
  matchIdsByRoomId.set(record.roomId, roomMatches);
  return record;
}

function finalizeRecord(input: Omit<MatchLedgerRecord, "status" | "seatImpacts" | "updatedAt">): MatchLedgerRecord {
  const seatImpacts = buildSeatImpacts(input);
  return {
    ...input,
    status: deriveStatus(Boolean(input.leaderboard), Boolean(input.payments)),
    seatImpacts,
    updatedAt: resolveUpdatedAt(input, seatImpacts),
  };
}

function deriveStatus(hasLeaderboard: boolean, hasPayments: boolean) {
  if (hasLeaderboard && hasPayments) {
    return "fully_recorded" as const;
  }

  if (hasLeaderboard) {
    return "leaderboard_recorded" as const;
  }

  if (hasPayments) {
    return "payments_recorded" as const;
  }

  return "completion_recorded" as const;
}

function buildSeatImpacts(record: Omit<MatchLedgerRecord, "status" | "seatImpacts" | "updatedAt">): MatchLedgerSeatImpact[] {
  const participantBySeat = new Map<string, MatchLedgerParticipant>();
  for (const participant of record.participants) {
    participantBySeat.set(participant.seatId, participant);
  }

  const leaderboardByPlayerId = new Map(
    record.leaderboard?.applied.updates.map((update) => [update.playerId, update]) ?? [],
  );
  const payoutBySeatId = new Map(record.payments?.payouts.map((payout) => [payout.seatId, payout]) ?? []);

  return Object.entries(record.publicResult.seatScores)
    .map(([seatId, score]) => {
      const participant = participantBySeat.get(seatId);
      const payout = payoutBySeatId.get(seatId);
      const leaderboardUpdate =
        participant?.playerId ? leaderboardByPlayerId.get(participant.playerId) : undefined;

      return {
        seatId,
        playerId: participant?.playerId ?? record.completion.seatToPlayerId[seatId],
        displayName: participant?.displayName ?? formatSeatFallback(seatId),
        score,
        isWinner: record.publicResult.winningSeatIds.includes(seatId),
        leaderboard: leaderboardUpdate
          ? {
              delta: leaderboardUpdate.delta,
              previousRating: leaderboardUpdate.previousRating,
              newRating: leaderboardUpdate.newRating,
              expectedScore: leaderboardUpdate.expectedScore,
              actualScore: leaderboardUpdate.actualScore,
              wonMatch: leaderboardUpdate.wonMatch,
              matchesPlayed: leaderboardUpdate.matchesPlayed,
              wins: leaderboardUpdate.wins,
            }
          : undefined,
        payout: payout
          ? {
              payoutId: payout.payoutId,
              amountUsd: payout.amountUsd,
              currency: payout.currency,
              status: payout.status,
              lifecycleStatus: payout.lifecycleStatus,
            }
          : undefined,
      } satisfies MatchLedgerSeatImpact;
    })
    .sort((left, right) => right.score - left.score || left.seatId.localeCompare(right.seatId));
}

function resolveUpdatedAt(
  record: Omit<MatchLedgerRecord, "status" | "seatImpacts" | "updatedAt">,
  seatImpacts: MatchLedgerSeatImpact[],
): string {
  let latest = record.completedAt;

  if (record.leaderboard?.appliedAt && record.leaderboard.appliedAt > latest) {
    latest = record.leaderboard.appliedAt;
  }

  if (record.payments?.settledAt && record.payments.settledAt > latest) {
    latest = record.payments.settledAt;
  }

  if (record.matchSync?.syncedAt && record.matchSync.syncedAt > latest) {
    latest = record.matchSync.syncedAt;
  }

  if (record.matchSync?.lastAttemptAt && record.matchSync.lastAttemptAt > latest) {
    latest = record.matchSync.lastAttemptAt;
  }

  if (record.completion.result.completedAt > latest) {
    latest = record.completion.result.completedAt;
  }

  for (const seatImpact of seatImpacts) {
    if (seatImpact.payout && record.payments?.settledAt && record.payments.settledAt > latest) {
      latest = record.payments.settledAt;
    }
  }

  return latest;
}

function mergeParticipants(
  existing: MatchLedgerParticipant[],
  nextParticipants: ResolvedLeaderboardMatch["participants"],
  result: MatchResult,
  completion: MatchCompletionEnvelope,
): MatchLedgerParticipant[] {
  const participantsBySeat = new Map<string, MatchLedgerParticipant>();

  for (const participant of existing) {
    participantsBySeat.set(participant.seatId, participant);
  }

  for (const participant of nextParticipants) {
    participantsBySeat.set(participant.seatId, {
      seatId: participant.seatId,
      playerId: participant.playerId,
      displayName: participant.displayName,
      score: participant.score,
      isWinner: participant.isWinner,
    });
  }

  for (const [seatId, score] of Object.entries(result.seatScores)) {
    const current = participantsBySeat.get(seatId);
    participantsBySeat.set(seatId, {
      seatId,
      playerId: current?.playerId ?? completion.seatToPlayerId[seatId],
      displayName: current?.displayName ?? formatSeatFallback(seatId),
      score,
      isWinner: result.winningSeatIds.includes(seatId),
    });
  }

  return [...participantsBySeat.values()].sort((left, right) => {
    return right.score - left.score || left.seatId.localeCompare(right.seatId);
  });
}

function createCompletionFromResult(
  result: MatchResult,
  seatToPlayerId: Partial<Record<SeatId, PlayerId>>,
): MatchCompletionEnvelope {
  return {
    matchId: result.matchId,
    roomId: result.roomId,
    game: result.game,
    completedAt: result.completedAt,
    result,
    replay: {
      matchId: result.matchId,
      roomId: result.roomId,
      available: false,
    },
    seatToPlayerId,
  };
}

function mergeCompletion(
  current: MatchCompletionEnvelope,
  incoming: MatchCompletionEnvelope,
): MatchCompletionEnvelope {
  ensureStableMatchIdentity(current, incoming.matchId, incoming.roomId, incoming.game);

  return normalizeCompletion({
    ...current,
    ...incoming,
    result: incoming.result ?? current.result,
    replay: {
      ...current.replay,
      ...incoming.replay,
    },
    seatToPlayerId: {
      ...current.seatToPlayerId,
      ...incoming.seatToPlayerId,
    },
  });
}

function normalizeCompletion(completion: MatchCompletionEnvelope): MatchCompletionEnvelope {
  return {
    ...completion,
    replay: {
      matchId: completion.matchId,
      roomId: completion.roomId,
      available: completion.replay.available,
      eventCount: completion.replay.eventCount,
    },
    seatToPlayerId: {
      ...completion.seatToPlayerId,
    },
  };
}

function mergeMatchSync(
  current: PublicMatchSyncState | undefined,
  incoming: PublicMatchSyncState | undefined,
): PublicMatchSyncState | undefined {
  if (!current) {
    return incoming;
  }

  if (!incoming) {
    return current;
  }

  return {
    ...current,
    ...incoming,
  };
}

function toPublicResult(result: MatchResult): PublicMatchResultSummary {
  return {
    completedAt: result.completedAt,
    winningSeatIds: result.winningSeatIds,
    seatScores: result.seatScores,
  };
}

function formatSeatFallback(seatId: string): string {
  const suffix = seatId.replace(/^seat_/u, "");
  return `Seat ${suffix}`;
}

function compareLedgerRecords(left: MatchLedgerRecord, right: MatchLedgerRecord): number {
  if (left.completedAt !== right.completedAt) {
    return left.completedAt.localeCompare(right.completedAt);
  }

  return left.updatedAt.localeCompare(right.updatedAt);
}

function ensureStableMatchIdentity(
  current: MatchCompletionEnvelope,
  matchId: string,
  roomId: string,
  game: string,
): void {
  if (current.matchId !== matchId) {
    throw new Error(`Mismatched matchId for ledger record: ${matchId}`);
  }

  if (current.roomId !== roomId) {
    throw new Error(`Mismatched roomId for match ${matchId}: ${roomId}`);
  }

  if (current.game !== game) {
    throw new Error(`Mismatched game for match ${matchId}: ${game}`);
  }
}

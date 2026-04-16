import test from "node:test";
import assert from "node:assert/strict";

import type { MatchCompletionEnvelope, MatchResult } from "@arena/contracts";
import type { ResolvedLeaderboardMatch } from "@arena/leaderboard";
import type { EscrowRecord, MatchSettlementInput, PayoutLedgerRecord } from "@arena/payments";

import {
  getMatchLedgerRecordByMatchId,
  getMatchLedgerRecordByRoomId,
  recordMatchCompletion,
  recordMatchLeaderboardApplication,
  recordMatchSettlement,
} from "./match-ledger-store.js";

function createResult(matchId: string, roomId: string): MatchResult {
  return {
    matchId,
    roomId,
    game: "auction",
    completedAt: "2026-04-16T12:00:00.000Z",
    winningSeatIds: ["seat_1"],
    seatScores: {
      seat_1: 24,
      seat_2: 8,
      seat_3: 3,
    },
    behavioralOutput: [],
  };
}

function createCompletion(matchId: string, roomId: string): MatchCompletionEnvelope {
  const result = createResult(matchId, roomId);
  return {
    matchId,
    roomId,
    game: "auction",
    completedAt: result.completedAt,
    result,
    replay: {
      matchId,
      roomId,
      available: true,
      eventCount: 12,
    },
    seatToPlayerId: {
      seat_1: "player_alpha",
      seat_2: "player_beta",
      seat_3: "player_gamma",
    },
  };
}

function createResolvedMatch(matchId: string, roomId: string): ResolvedLeaderboardMatch {
  const result = createResult(matchId, roomId);
  return {
    result,
    participants: [
      {
        seatId: "seat_1",
        playerId: "player_alpha",
        displayName: "Seat 1",
        score: 24,
        isWinner: true,
      },
      {
        seatId: "seat_2",
        playerId: "player_beta",
        displayName: "Seat 2",
        score: 8,
        isWinner: false,
      },
      {
        seatId: "seat_3",
        playerId: "player_gamma",
        displayName: "Seat 3",
        score: 3,
        isWinner: false,
      },
    ],
  };
}

test("records completion, leaderboard, and payments into one match ledger", () => {
  const matchId = "match-ledger-complete";
  const roomId = "room-ledger-complete";
  const completion = createCompletion(matchId, roomId);
  const resolvedMatch = createResolvedMatch(matchId, roomId);

  const completionRecord = recordMatchCompletion(completion, {
    status: "synced",
    attempts: 1,
    syncedAt: "2026-04-16T12:01:00.000Z",
  });
  assert.equal(completionRecord.status, "completion_recorded");
  assert.equal(completionRecord.completion.replay.available, true);

  const leaderboardRecord = recordMatchLeaderboardApplication(resolvedMatch, {
    matchId,
    appliedAt: "2026-04-16T12:02:00.000Z",
    game: "auction",
    updates: [
      {
        playerId: "player_alpha",
        displayName: "Seat 1",
        game: "auction",
        previousRating: 1000,
        newRating: 1018,
        delta: 18,
        expectedScore: 0.5,
        actualScore: 1,
        wonMatch: true,
        matchesPlayed: 1,
        wins: 1,
      },
    ],
    gameSnapshot: {
      game: "auction",
      generatedAt: "2026-04-16T12:02:00.000Z",
      entries: [],
    },
    globalSnapshot: {
      game: "global",
      generatedAt: "2026-04-16T12:02:00.000Z",
      entries: [],
    },
  });
  assert.equal(leaderboardRecord.status, "leaderboard_recorded");
  assert.equal(leaderboardRecord.seatImpacts[0]?.leaderboard?.delta, 18);

  const settlementInput: MatchSettlementInput = {
    escrowId: "escrow-match-ledger-complete",
    result: resolvedMatch.result,
    seatToPlayerId: completion.seatToPlayerId as Record<string, string>,
    strategy: "winners_equally",
  };
  const payouts: PayoutLedgerRecord[] = [
    {
      payoutId: "payout-seat-1",
      playerId: "player_alpha",
      seatId: "seat_1",
      escrowId: settlementInput.escrowId,
      matchId,
      amountUsd: 48,
      currency: "USDC",
      status: "ready",
      lifecycleStatus: "available_to_claim",
      createdAt: "2026-04-16T12:03:00.000Z",
      updatedAt: "2026-04-16T12:03:00.000Z",
      isSimulated: true,
      timeline: [],
    },
  ];
  const escrow: EscrowRecord = {
    escrowId: settlementInput.escrowId,
    sponsorId: "arena-demo-sponsor",
    gameId: "auction",
    matchId,
    status: "settled",
    fundedAmountUsd: 48,
    reservedAmountUsd: 48,
    releasedAmountUsd: 48,
    currency: "USDC",
    isSimulated: true,
    createdAt: "2026-04-16T11:58:00.000Z",
    updatedAt: "2026-04-16T12:03:00.000Z",
    timeline: [],
  };

  const settledRecord = recordMatchSettlement(settlementInput, payouts, escrow);
  assert.equal(settledRecord.status, "fully_recorded");
  assert.equal(settledRecord.payments?.totalPayoutUsd, 48);
  assert.equal(settledRecord.seatImpacts[0]?.payout?.amountUsd, 48);
  assert.equal(getMatchLedgerRecordByMatchId(matchId)?.matchId, matchId);
  assert.equal(getMatchLedgerRecordByRoomId(roomId)?.roomId, roomId);
});

test("room lookup returns the latest match recorded for that room", () => {
  const roomId = "room-rematch";
  recordMatchCompletion(createCompletion("match-rematch-1", roomId));
  const latest = recordMatchCompletion({
    ...createCompletion("match-rematch-2", roomId),
    completedAt: "2026-04-16T12:10:00.000Z",
    result: {
      ...createResult("match-rematch-2", roomId),
      completedAt: "2026-04-16T12:10:00.000Z",
    },
  });

  const byRoom = getMatchLedgerRecordByRoomId(roomId);
  assert.equal(byRoom?.matchId, latest.matchId);
});

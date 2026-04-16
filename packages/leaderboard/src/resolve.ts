import type {
  MatchResult,
  SeatAssignment,
  SeatId,
} from "@arena/contracts";

import type { LeaderboardParticipant, ResolvedLeaderboardMatch } from "./types.ts";

export function resolveLeaderboardMatch(
  result: MatchResult,
  assignments: SeatAssignment[],
): ResolvedLeaderboardMatch {
  const assignmentBySeat = new Map<SeatId, SeatAssignment>();

  for (const assignment of assignments) {
    assignmentBySeat.set(assignment.publicSeat.seatId, assignment);
  }

  const participants = Object.entries(result.seatScores).map(([seatId, score]) => {
    const assignment = assignmentBySeat.get(seatId);

    if (!assignment) {
      throw new Error(`Missing seat assignment for seat ${seatId}`);
    }

    if (!assignment.privateSeat.playerId) {
      throw new Error(
        `Seat ${seatId} is missing privateSeat.playerId and cannot enter the leaderboard`,
      );
    }

    return {
      seatId,
      playerId: assignment.privateSeat.playerId,
      displayName: assignment.publicSeat.displayName,
      score,
      isWinner: result.winningSeatIds.includes(seatId),
    } satisfies LeaderboardParticipant;
  });

  validateResolvedParticipants(participants, result);

  return {
    result,
    participants,
  };
}

function validateResolvedParticipants(
  participants: LeaderboardParticipant[],
  result: MatchResult,
): void {
  if (participants.length < 2) {
    throw new Error("Leaderboard matches require at least two participants");
  }

  const uniquePlayers = new Set(participants.map((participant) => participant.playerId));
  if (uniquePlayers.size !== participants.length) {
    throw new Error("Each leaderboard participant must map to a unique playerId");
  }

  for (const seatId of result.winningSeatIds) {
    if (!participants.some((participant) => participant.seatId === seatId)) {
      throw new Error(`Winning seat ${seatId} is missing from resolved participants`);
    }
  }
}

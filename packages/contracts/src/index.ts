export type GameKey = "split" | "pact" | "vault" | "auction" | "settlement";
export type SeatBackingType = "human" | "llm" | "scripted";
export type RoomPhase = "lobby" | "ready" | "active" | "results" | "closed";

export type MatchId = string;
export type RoomId = string;
export type PlayerId = string;
export type SeatId = string;
export type SessionId = string;

export type PlayerIdentityKind = "anonymous" | "invite" | "wallet" | "registered";
export type MatchSyncStatus = "pending" | "syncing" | "synced" | "failed";

export interface PlayerIdentity {
  playerId: PlayerId;
  kind: PlayerIdentityKind;
  displayName: string;
  walletAddress?: string;
  inviteCode?: string;
  createdAt: string;
  lastSeenAt?: string;
}

export interface PlayerSession {
  sessionId: SessionId;
  playerId?: PlayerId;
  kind: PlayerIdentityKind;
  displayName?: string;
  roomId?: RoomId;
  seatId?: SeatId;
  connectedAt: string;
  lastSeenAt: string;
  status: "active" | "expired";
}

export interface PublicRoomJoinState {
  canJoin: boolean;
  openSeatIds: SeatId[];
  claimedSeatIds: SeatId[];
}

export interface PublicSeatView {
  seatId: SeatId;
  displayName: string;
  avatarId: string;
  isConnected: boolean;
  isReady: boolean;
  score?: number;
}

export interface PrivateSeatMetadata {
  seatId: SeatId;
  playerId?: PlayerId;
  sessionId?: SessionId;
  backingType: SeatBackingType;
  llmModelId?: string;
  promptVersionId?: string;
  timingProfileId?: string;
}

export interface SeatAssignment {
  publicSeat: PublicSeatView;
  privateSeat: PrivateSeatMetadata;
}

export interface PublicMatchSyncState {
  status: MatchSyncStatus;
  attempts: number;
  lastAttemptAt?: string;
  syncedAt?: string;
  lastError?: string;
}

export interface PublicReplaySummary {
  available: boolean;
  eventCount?: number;
  lastSequence?: number;
  lastOccurredAt?: string;
}

export interface PublicMatchResultSummary {
  completedAt: string;
  winningSeatIds: SeatId[];
  seatScores: Record<SeatId, number>;
}

export interface PublicRoomState<TPublicState = unknown> {
  roomId: RoomId;
  matchId: MatchId;
  game: GameKey;
  phase: RoomPhase;
  round: number;
  seats: PublicSeatView[];
  publicState: TPublicState;
  lastEventAt: string;
  publicResult?: PublicMatchResultSummary;
  replaySummary?: PublicReplaySummary;
  matchSync?: PublicMatchSyncState;
  joinState?: PublicRoomJoinState;
}

export interface ClientMessage<TPayload = unknown> {
  type:
    | "room.join"
    | "room.ready"
    | "room.action"
    | "room.rematch"
    | "room.leave"
    | "room.heartbeat";
  matchId?: MatchId;
  seatId?: SeatId;
  sessionId?: SessionId;
  payload?: TPayload;
}

export interface RoomSessionEnvelope<TPublicState = unknown> {
  room: PublicRoomState<TPublicState>;
  session: PlayerSession;
}

export interface ServerEvent<TPayload = unknown> {
  type:
    | "room.snapshot"
    | "room.state"
    | "room.error"
    | "room.system"
    | "match.result"
    | "match.reveal";
  occurredAt: string;
  payload: TPayload;
}

export interface BehavioralOutput {
  metricKey: string;
  value: number | string | boolean | null;
  unit?: string;
  confidence?: number;
}

export interface ReplayEvent<TPayload = unknown> {
  sequence: number;
  type: string;
  occurredAt: string;
  actorSeatId?: SeatId;
  publicPayload: TPayload;
  privatePayload?: unknown;
}

export interface ReplayEnvelope {
  matchId: MatchId;
  game: GameKey;
  version: number;
  seed: string;
  createdAt: string;
  events: ReplayEvent[];
}

export interface MatchResult {
  matchId: MatchId;
  game: GameKey;
  roomId: RoomId;
  completedAt: string;
  winningSeatIds: SeatId[];
  seatScores: Record<SeatId, number>;
  behavioralOutput: BehavioralOutput[];
}

export interface MatchReplayReference {
  matchId: MatchId;
  roomId: RoomId;
  available: boolean;
  eventCount?: number;
}

export interface MatchCompletionEnvelope {
  matchId: MatchId;
  roomId: RoomId;
  game: GameKey;
  completedAt: string;
  result: MatchResult;
  replay: MatchReplayReference;
  seatToPlayerId: Partial<Record<SeatId, PlayerId>>;
}

export interface LeaderboardEntry {
  game: GameKey | "global";
  playerId: PlayerId;
  displayName: string;
  rating: number;
  rank: number;
  wins: number;
  matchesPlayed: number;
}

export interface PayoutRecord {
  payoutId: string;
  playerId: PlayerId;
  matchId: MatchId;
  amountUsd: number;
  currency: "USD" | "USDC";
  status: "pending" | "ready" | "paid" | "failed";
  createdAt: string;
}

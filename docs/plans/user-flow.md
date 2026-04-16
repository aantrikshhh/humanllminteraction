# User Flow Plan

## Scope

The User Flow stream owns the player-facing app shell from first visit through game handoff and post-match recovery. For MVP, the flow should optimize for low-friction entry while preserving the core privacy constraint: the UI must never reveal whether any seat is human- or LLM-backed.

In scope:

- guest-first onboarding and session bootstrap
- app-shell layout, loading, error, and not-found states
- lobby/home surface for game selection plus create/join room entry points
- room create, invite-link/join-code entry, room lobby, ready-up, leave, reconnect, results, rematch
- profile shell with identity summary and slots for leaderboard and wallet summaries
- shared shell behavior around game-route handoff

Out of scope:

- marketing pages under `app/(marketing)`
- room authority, matchmaking/ranking logic, or payment settlement logic
- game-specific HUDs, rules, and per-game client rendering
- any use of `PrivateSeatMetadata` or server-only seat backing details in the browser

## Owned Paths

Primary owned surface:

- `apps/web/app/(app)/**`
- `apps/web/components/app-shell/**` (create this directory; it does not exist yet)

Recommended file ownership inside `apps/web/app/(app)`:

- `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`
- `onboarding/**`
- `lobby/**`
- `rooms/**` for create/join/lobby/results/rematch wrappers
- `profile/**`
- shared route-local helpers under `(app)/_lib/**` or `(app)/_components/**` if needed

Explicitly not owned:

- `apps/web/app/(marketing)/**`
- game-specific leaf routes under `apps/web/app/(app)/games/**`
- current placeholder game folders under `apps/web/app/games/**`, except for agreeing the final handoff path contract

Planning note: the repo currently contains game placeholders under `apps/web/app/games/*`, while the coordination docs assign game routes to `apps/web/app/(app)/games/*`. That mismatch should be resolved before implementation starts.

## Dependencies

| Upstream stream | Required input | Why it matters |
| --- | --- | --- |
| Core Multiplayer + LLM Runtime | Stable room join/rejoin handshake, `PublicRoomState`, `ClientMessage`, `ServerEvent`, heartbeat cadence, room error codes, seat reclaim semantics | The app shell should be thin and server-authoritative. Room screens depend on a stable public protocol and reconnect model. |
| Art Direction + Asset Governance | App-shell tokens, typography, avatar treatment, icon/sprite guidance, attribution-safe asset usage | Player surfaces need a coherent look that matches the approved visual direction. |
| Leaderboard | Read-only summary slice for profile shell and post-match deltas | The profile shell should show standings hooks without owning rank calculation. |
| Payments Stub | `WalletSummary` plus any escrow/payout summary shape needed in profile or results side panels | Payments UI should plug into the profile shell without blocking entry-to-match flow. |
| Game streams | Canonical active-play route per game and a small handoff contract keyed by `GameKey` and `roomId`/`matchId` | User Flow owns the path into a game client shell, but not the game client itself. |
| QA + CI | Shared selectors, seedable flow fixtures, and agreed browser scenarios | The main player funnel must be testable end to end. |

Missing contracts that should be frozen early because User Flow depends on them:

- `PlayerSessionSummary` or equivalent bootstrap payload
- `CreateRoomRequest` / `CreateRoomResponse`
- `JoinRoomRequest` / `JoinRoomResponse`
- invite code / deep-link format
- public room-list item shape for lobby discovery, if room browsing is part of MVP
- room/system error codes that map to user-facing recovery states

## State Model

Use an explicit layered state model, not a collection of unrelated booleans. The server-owned room phase should remain authoritative, while the client tracks transport and user intent around it.

### 1. Session state

- `bootstrapping`: app checks for an existing opaque player session
- `needs-profile`: no valid session; show onboarding
- `ready`: session exists and the player can enter lobby/create/join room

Recommended MVP identity model: guest-first session bootstrap with display name + avatar choice, then optional wallet attachment later. That keeps the demo flow short and gives Payments a stable `playerId` shell to build on.

### 2. Lobby intent state

- `idle`
- `loading`
- `create-pending`
- `join-pending`
- `error`

Lobby should work even if public room browsing is delayed. MVP can ship with game cards plus create/join affordances first, then add room discovery once the runtime exposes a stable summary feed.

### 3. Room transport state

- `disconnected`
- `connecting`
- `live`
- `reconnecting`
- `stale`
- `closed`

This state is client-owned and should drive banners, retry affordances, and disabled actions. It should react to browser lifecycle events and transport events, not infer status from gameplay timing.

### 4. Authoritative room phase

Mirror the runtime contract from `packages/contracts`:

- `lobby`
- `ready`
- `active`
- `results`
- `closed`

Rules:

- The first `room.snapshot` or `room.state` event decides which room view to render.
- `active` phase triggers handoff into the game route for the room's `game`.
- `results` phase renders the shared results/rematch shell.
- `closed` phase returns the player to lobby with a reason message when available.

### 5. Post-match intent state

- `idle`
- `rematch-pending`
- `rematch-confirmed`
- `leaving`
- `error`

This should stay separate from room phase so optimistic UI for rematch/leave actions does not override server truth.

## Implementation Plan

### 1. Freeze route conventions and handoff boundaries

- Resolve the current path mismatch and standardize on one game-route pattern under `(app)`. Preferred pattern: `apps/web/app/(app)/games/<game>/<roomId>/page.tsx` so the app shell stays consistent and game ownership remains isolated.
- Reserve shared room lifecycle routes for User Flow, e.g. `/lobby`, `/rooms/new`, `/rooms/join`, `/rooms/[roomId]`, `/profile`.
- Keep the route tree split by team/concern via Next.js route groups, which are explicitly intended for organizing routes by team or feature without affecting URL paths: https://nextjs.org/docs/app/api-reference/file-conventions/route-groups

### 2. Build the app-shell skeleton first

- Create `(app)` root layout, loading, error, and not-found boundaries before implementing leaf pages.
- Keep pages and layouts as Server Components by default, and move only interactive panels, browser APIs, and room transport hooks into Client Components. That follows current Next.js guidance for App Router shells: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Add segment-level `loading.tsx` skeletons so navigation into lobby/room/results never shows a blank screen; Next.js now treats `loading.js` as the standard way to provide instant loading states while the segment streams: https://nextjs.org/docs/app/api-reference/file-conventions/loading
- Add retryable `error.tsx` boundaries at `(app)` and room-level segments so room/connectivity failures stay recoverable without losing the whole shell: https://nextjs.org/docs/app/getting-started/error-handling

### 3. Implement session bootstrap and onboarding

- Default to a guest-first onboarding step with only the fields needed to establish a durable player shell: display name, avatar choice, and optional region/timezone if needed for analytics.
- Submit onboarding with a Server Action and track pending/result state with `useActionState`; this keeps mutations close to the route boundary and degrades cleanly before hydration. Relevant docs:
  - https://nextjs.org/docs/app/getting-started/updating-data
  - https://react.dev/reference/react/useActionState
- Persist the authoritative session server-side, preferably via an opaque cookie-backed session, and only mirror low-risk UI preferences locally for faster optimistic restore.

### 4. Build lobby, create-room, and join-room flows

- Make the default app landing page branch to onboarding or lobby based on session bootstrap state.
- Ship lobby in two layers:
  - MVP core: game cards, create room, join by code/link, recent invites
  - Optional enhancement: discoverable public/private room list once the runtime exposes a stable room summary contract
- Use Server Actions for create/join mutations and `useTransition` for non-blocking route changes so the shell remains responsive during room entry and redirect work: https://react.dev/reference/react/useTransition
- Normalize error handling into a small set of user-facing states: invalid code, room full, room closed, session expired, transport unavailable

### 5. Build the shared room shell

- Create a single room wrapper route owned by User Flow that renders:
  - room header and phase banner
  - public seat grid from `PublicSeatView[]`
  - ready/unready and leave actions
  - connection/reconnect banner
  - results/rematch panel when the room enters `results`
- Keep the room shell driven by `PublicRoomState` plus transport state only. Do not import or derive UI from `PrivateSeatMetadata`.
- Add a dedicated transport hook in `app-shell` that handles websocket connect, heartbeat, reconnect backoff, and close-code mapping. MDN still recommends treating the `WebSocket` `close` event as the authoritative client signal that a connection ended, and using browser visibility changes to stop background work or flush session analytics:
  - https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/close_event
  - https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event
- Prefer `visibilitychange` over `beforeunload` for last-observable session handling on desktop and mobile browsers.

### 6. Hand off cleanly into active play

- When the authoritative room phase becomes `active`, navigate into the canonical game route instead of embedding game-specific UI in the room shell.
- Keep a lightweight shared handoff/loading shell around the transition so game streams inherit consistent chrome, breadcrumbs, and failure states.
- Define a tiny route contract for game streams:
  - route params they receive
  - how they request shared app-shell chrome
  - how they return to results/rematch when play completes

### 7. Build results, rematch, and profile shell

- Render post-match summary from `MatchResult`: winners, scores, behavioral highlights if public, and next actions.
- Support rematch voting without blocking return-to-lobby behavior; the shared shell should tolerate a room closing while a rematch is pending.
- Build a profile shell that can render immediately from session data, then stream or hydrate optional leaderboard and wallet summaries when those streams land.
- Keep leaderboard/payments surfaces additive. A missing summary must not block room entry, rejoin, or results recovery.

### 8. Prepare QA and instrumentation hooks

- Add stable test selectors to onboarding, lobby, room, and results surfaces as they are built.
- Emit telemetry at the flow boundaries that matter for the demo and experiments: onboarding completed, room created, room joined, ready toggled, reconnect shown, game handoff started/completed, result viewed, rematch requested.
- Treat mixed human/LLM rooms as normal UI cases. The shell should never branch copy or affordances on seat backing type.

## Acceptance Criteria

- A first-time visitor can complete onboarding in one step and reach the lobby without creating a full account.
- A returning visitor with a valid session lands in the lobby or a recoverable in-progress room, not back in onboarding.
- A player can create a room or join by code/deep link and receive clear, retryable errors for invalid or closed rooms.
- Room views render only public seat information and never expose `backingType`, model IDs, prompt versions, or other private metadata.
- Ready/unready, leave, reconnect, and room-close states all render deterministically from public room state plus transport state.
- When a room becomes active, the player reaches the game client shell through a defined handoff path with loading and error boundaries in place.
- When a match ends, the player can view results, request a rematch, or return to lobby without refreshing the browser.
- The profile shell renders useful identity information immediately and can accept leaderboard/payments summary data later without changing the core room-entry flow.
- The app shell supports the mandatory demo/test modes: human vs human, human vs LLM, LLM vs LLM, reconnect, and rematch.

## Risks

- Route collision risk: the repo currently disagrees about whether game routes live under `app/games/*` or `app/(app)/games/*`. Freeze this before implementation or multiple streams will build incompatible URLs.
- Contract drift risk: User Flow needs session bootstrap, create/join room, and room error semantics that are not yet defined in shared contracts.
- Reconnect risk: the room shell depends on stable seat reclaim and heartbeat behavior from the runtime. If reconnect semantics are underspecified, the UI will oscillate between stale and closed states.
- Privacy risk: even if private metadata stays server-side, careless copy or timing-specific UI can still imply which seats are synthetic. Avoid labels like "waiting for AI" or asymmetric status copy.
- Identity continuity risk: a guest-first flow is correct for MVP speed, but it creates follow-on work for wallet attachment, cross-device continuity, and profile recovery.
- Over-hydration risk: if the app shell becomes a large client bundle, lobby and room entry will feel worse on stage and on mobile. Keep Server Components as the default and isolate interactivity.

# ARENA Demo Runbook

## Plan

1. Confirm the current local stack shape and startup order from `apps/api`, `apps/rooms`, and `apps/web`.
2. Derive concrete operator steps from the working Auction-first lobby, room, and results flows.
3. Document failure recovery and current product gaps so a demo operator can recover without reading code.

## Research Notes

- The current demo path is `web -> rooms -> api`, with the web app proxying room actions through same-origin routes under `/api/rooms/*`.
- `apps/rooms` is the authoritative runtime. It persists room snapshots, replays, and completed results to disk when `ROOMS_PERSISTENCE_ENABLED` is on.
- `apps/api` currently keeps leaderboard, payments, and match-ledger state in memory. That means API restarts lose downstream state.
- The live demo path is Auction-first. The operator controls `seat_1`; non-human seats are currently automated hidden seats driven by deterministic fake adapters.
- The current room UX is polling-based, not socket-based. A convincing live demo is still possible, but operator expectations need to match that.

## Purpose

This runbook is for running the current ARENA stack locally in a stable demo configuration. It covers:

- local startup order
- required environment variables
- pre-demo smoke checks
- live demo operator steps
- recovery when one service fails
- known product gaps and the operator workarounds required today

## Current Demo Shape

The current strongest demo is:

- create a new Auction room from `/lobby`
- play as `seat_1` from `/rooms/[roomId]`
- let hidden automated seats take the remaining turns
- finish the room into `results`
- show `/results/[roomId]`
- show the leaderboard and payments shells as proof of downstream propagation

What is real in this stack:

- room authority
- hidden-seat public/private separation
- room persistence to disk
- replay generation
- automatic completion propagation from rooms to API
- leaderboard and payout stub updates

What is still demo-grade:

- hidden seats use deterministic fake adapters, not provider-backed LLMs
- API state is in memory
- payments are simulated
- the web app polls instead of using a true realtime transport
- Auction is the only live gameplay path that is demo-ready

## Local Startup Order

Use three terminals and start the services in this order:

1. `apps/api`
2. `apps/rooms`
3. `apps/web`

The room service depends on the API base URL for match propagation. The web app depends on both.

### Terminal 1: API

```bash
cd /Users/aant/repos/human-llm-interaction
PORT=4010 npm run dev:api
```

Expected log:

```text
@arena/api listening on http://localhost:4010
```

### Terminal 2: Rooms

Use a dedicated persistence directory for demos so you can isolate room state cleanly between sessions.

```bash
cd /Users/aant/repos/human-llm-interaction
PORT=4011 \
API_BASE_URL=http://127.0.0.1:4010 \
ROOMS_PERSISTENCE_ENABLED=true \
ROOMS_PERSISTENCE_DIR=/Users/aant/repos/human-llm-interaction/.arena/demo-run \
npm run dev:rooms
```

Expected log:

```text
@arena/rooms listening on http://localhost:4011 (restored N rooms)
```

### Terminal 3: Web

```bash
cd /Users/aant/repos/human-llm-interaction
PORT=3000 \
API_BASE_URL=http://127.0.0.1:4010 \
ROOMS_BASE_URL=http://127.0.0.1:4011 \
npm run dev:web
```

Then open:

- [http://127.0.0.1:3000](http://127.0.0.1:3000)
- [http://127.0.0.1:3000/lobby](http://127.0.0.1:3000/lobby)

## Environment Variables

### Required for a local demo

| Variable | Service | Default | Recommended demo value | Why it matters |
| --- | --- | --- | --- | --- |
| `PORT` | API | `4010` | `4010` | API listener |
| `PORT` | Rooms | `4011` | `4011` | Room runtime listener |
| `PORT` | Web | `3000` | `3000` | Next.js app listener |
| `API_BASE_URL` | Rooms | `http://127.0.0.1:4010` | `http://127.0.0.1:4010` | Match completion, leaderboard, and payment sync |
| `API_BASE_URL` | Web | `http://127.0.0.1:4010` | `http://127.0.0.1:4010` | Server-side reads for leaderboard, payments, and results |
| `ROOMS_BASE_URL` | Web | `http://127.0.0.1:4011` | `http://127.0.0.1:4011` | Room list, room reads, replay reads, and message proxying |
| `ROOMS_PERSISTENCE_ENABLED` | Rooms | `true` | `true` | Room restore after restart |
| `ROOMS_PERSISTENCE_DIR` | Rooms | `.arena/rooms-state` under cwd | dedicated demo path | Prevents state collisions across demo runs |

### Optional test-only variables

These are relevant if you want to run the Playwright smoke suite:

- `ARENA_BASE_URL`
- `API_BASE_URL`
- `ROOMS_BASE_URL`
- `PLAYWRIGHT_CHANNEL`

The default smoke config assumes:

- web: `http://127.0.0.1:3000`
- api: `http://127.0.0.1:4010`
- rooms: `http://127.0.0.1:4011`

## Pre-Demo Validation

Run these once before the live session.

### Repo-level checks

```bash
cd /Users/aant/repos/human-llm-interaction
npm run typecheck
npm run test
npm run build -w @arena/web
```

These should all pass before demo day.

### Service health checks

```bash
curl http://127.0.0.1:4010/health
curl http://127.0.0.1:4010/payments/health
curl http://127.0.0.1:4010/matches/health
curl http://127.0.0.1:4011/health
curl http://127.0.0.1:3000/lobby
```

Expected:

- API returns `status: "ok"`
- payments health returns `simulated: true`
- match ledger health returns `status: "ok"`
- rooms health returns `status: "ok"` and `persistenceEnabled: true`
- the web lobby returns HTML and renders without a 500

### Room smoke check

Fastest operator smoke path:

1. open [http://127.0.0.1:3000/lobby](http://127.0.0.1:3000/lobby)
2. click `Create demo auction room`
3. confirm a room card appears
4. click `Open live room`
5. confirm the room page shows:
   - `Operator seat`
   - `Seats blinded`
   - `Room telemetry`
6. click one `Bid` button
7. confirm the room state updates and no error panel appears

### Result propagation smoke check

After finishing a room into results:

```bash
curl http://127.0.0.1:4011/rooms
curl http://127.0.0.1:4011/rooms/<roomId>/replay
curl http://127.0.0.1:4010/matches/rooms/<roomId>
curl http://127.0.0.1:4010/leaderboard
curl http://127.0.0.1:4010/payments/players/demo-player
```

Expected:

- rooms service lists the room in `results`
- replay endpoint returns events
- match ledger returns a record for that room
- leaderboard returns entries
- payments player snapshot shows simulated wallet and payouts for `demo-player`

## Demo Operator Flow

### Recommended live narrative

1. Start at `/lobby`.
2. Explain that seats are intentionally blinded and the audience is not told which seats are human or model-backed.
3. Create a demo Auction room.
4. Open the live room and narrate that the operator is only controlling `seat_1`.
5. Take one or more bids or passes while the hidden seats auto-play.
6. Let the room settle.
7. Open `/results/[roomId]`.
8. Show that the result remains seat-based and does not reveal which seats were human or automated.
9. Show `/leaderboard`.
10. Show `/payments` and explain that payouts are simulated in the current stack.

### Exact operator steps

#### 1. Create the room

From `/lobby`:

- click `Create demo auction room`
- wait for the room card to appear
- click `Open live room`

The seeded room currently creates:

- `seat_1` as the operator-controlled human seat
- `seat_2`, `seat_3`, and `seat_4` as hidden automated seats

#### 2. Run the live room

On `/rooms/[roomId]`:

- watch the `Current bid`, `Pot`, and `Leader` metrics
- if the status says `Your turn as Seat 1`, click one of the `Bid` buttons or `Pass`
- if the status says `Waiting on seat_X`, wait for polling to refresh the room
- use `Refresh shell` only if the page looks stale

Operator guidance:

- for a short demo, take one aggressive bid and then pass later
- if you want the room to finish faster, pass whenever `seat_1` has the turn
- do not promise fully manual multiplayer join flow yet; this is still an operator-seeded room

#### 3. Show the result

From the room page or lobby card:

- open `/results/[roomId]`

Call out:

- standings stay seat-based
- replay is public-safe because it uses public events and seat ids
- the product withholds reveal of who was human vs LLM

#### 4. Show downstream systems

Open:

- [http://127.0.0.1:3000/leaderboard](http://127.0.0.1:3000/leaderboard)
- [http://127.0.0.1:3000/payments](http://127.0.0.1:3000/payments)

Say explicitly:

- leaderboard is live in the demo stack
- payouts are stubbed and simulated
- blockchain settlement is not wired to a real chain yet

## Failure Recovery

### If the web app fails

Symptoms:

- browser shows a 500
- `/lobby` does not render
- room actions fail through `/api/rooms/*`

Recovery:

1. restart the web process
2. keep API and rooms running
3. reload `/lobby`

Why this is safe:

- the web app is only the presentation layer
- room authority lives in `apps/rooms`

### If the rooms service fails

Symptoms:

- room list stops refreshing
- live room page shows request failures
- `/api/rooms/*` returns `rooms_proxy_unavailable`

Recovery:

1. restart the rooms service with the same `ROOMS_PERSISTENCE_DIR`
2. wait for the `restored N rooms` startup log
3. reload `/lobby` or the room page

Why this is usually safe:

- rooms, replays, and completed results are persisted to disk when persistence is enabled

Operator caveat:

- the room page polls `/api/rooms`, so it may show the last known snapshot briefly while the runtime comes back

### If the API fails

Symptoms:

- match sync shows `failed`
- leaderboard page stops updating
- payments page errors or shows stale data
- `/matches/*`, `/leaderboard`, or `/payments/*` health checks fail

Recovery:

1. restart the API service
2. create and finish a fresh room rather than relying on previously completed rooms

Important limitation:

- API state is in memory only
- a restarted API loses leaderboard, payments, and match-ledger state
- completed rooms that were already marked `synced` in the rooms runtime will not automatically republish their old results to repopulate the restarted API

Practical operator rule:

- if the API restarts mid-demo, do not try to salvage old leaderboard or payout state
- create a new room and narrate the fresh run

### If result propagation fails for one room

Symptoms:

- room reaches `results`
- `/results/[roomId]` renders, but leaderboard sync is missing or failed
- `GET /matches/rooms/<roomId>` returns 404 or incomplete data

Recovery:

1. verify API health
2. refresh the room list via `/lobby` or call `GET /rooms`
3. if the room still shows failed sync and API had been unstable, create a fresh room

Why:

- the current operator surface does not expose a manual resync button
- the safe demo fallback is to run a fresh room

## Current Product Gaps And Required Operator Workarounds

### 1. No public multiplayer join flow yet

Current state:

- the demo room is created by the operator from `/lobby`
- the operator is implicitly `seat_1`

Workaround:

- present the live room as an operator-seeded multiplayer simulation with hidden seats
- do not demo public seat claiming, invite links, or self-serve joining yet

### 2. Auction is the only live gameplay path

Current state:

- other games exist in packages and routes
- Auction is the only path with a complete live room shell and operator controls

Workaround:

- use Auction for the live gameplay portion
- refer to the others as integrated modules, not live-ready showcase flows

### 3. Hidden seats are not provider-backed LLMs yet

Current state:

- automated seats are driven by deterministic fake adapters

Workaround:

- say `hidden AI-backed seats in the current demo runtime`
- do not claim live provider calls or real model-vs-model benchmarking in this build

### 4. Payments are simulated

Current state:

- escrow, wallet, and payout flows are stubbed
- the API reports `simulated: true`

Workaround:

- describe the payments surface as a settlement stub
- do not claim real on-chain release or withdraw capability

### 5. Leaderboard, payments, and match ledger are not durable yet

Current state:

- API state resets on restart

Workaround:

- keep the API process stable for the whole demo
- if API restarts, run a new room and narrate the reset honestly

### 6. The live room is polling-based

Current state:

- the room page refreshes on a polling interval

Workaround:

- expect slight UI delay between turns
- use `Refresh shell` if the page looks stale
- do not overclaim realtime socket transport

### 7. No operator admin panel for manual repair

Current state:

- there is no UI to force resync, mutate room state, or replay failed downstream writes

Workaround:

- recover by restarting the affected service or running a fresh room

## Recommended Demo Script

Use this if you want a short, reliable five-minute demo:

1. `ARENA puts humans and hidden AI agents into the same multiplayer room without revealing which is which.`
2. `I’ll create a fresh Auction room.`
3. `I’m only controlling Seat 1. The other seats are blinded and handled by the runtime.`
4. `The room resolves, then pushes a public-safe result, replay, leaderboard update, and payout stub downstream.`
5. `Notice that the result surface stays seat-based. The system never needs to publicly reveal which seat was human or model-backed.`

## Do Not Do During The Demo

- Do not restart the API unless the demo has already gone off-script.
- Do not rely on older completed rooms after an API restart.
- Do not demo non-Auction live play as though it is equally complete.
- Do not claim real blockchain payouts.
- Do not claim the hidden seats are already running production provider-backed models.

## Demo-Day Checklist

- `npm run typecheck`
- `npm run test`
- `npm run build -w @arena/web`
- API running on `4010`
- rooms running on `4011`
- web running on `3000`
- `ROOMS_PERSISTENCE_ENABLED=true`
- dedicated `ROOMS_PERSISTENCE_DIR` set
- `http://127.0.0.1:4010/health`, `http://127.0.0.1:4010/payments/health`, `http://127.0.0.1:4010/matches/health`, and `http://127.0.0.1:4011/health` all green
- `/lobby` loads
- one fresh Auction room can be created
- one room can be finished to results
- `/results/[roomId]`, `/leaderboard`, and `/payments` all render

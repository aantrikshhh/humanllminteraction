# Room Server

Owns authoritative multiplayer rooms.

- Enforces timers, reconnect rules, turn order, and validation.
- Keeps private seat metadata server-side.
- Emits replay and match result events to downstream services.
- Persists canonical room snapshots, replay envelopes, and completed results to disk.

## Persistence

- `ROOMS_PERSISTENCE_ENABLED`: set to `false` to disable file-backed persistence. Defaults to enabled.
- `ROOMS_PERSISTENCE_DIR`: overrides the storage root. Defaults to `.arena/rooms-state` under the current working directory.

On-disk layout:

- `rooms/<roomId>.json`: canonical room snapshot used for startup restore.
- `replays/<roomId>.json`: materialized replay envelope for inspection/export.
- `results/<roomId>.json`: materialized match result for completed rooms.

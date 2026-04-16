Original prompt: Build the Split game slice as a deterministic multiplayer-ready module plus a thin route UI, staying within the split-owned paths only.

- Implemented a repeated 2-seat ultimatum game with alternating proposer/responder roles across 4 rounds.
- Public state includes only seat-facing data, scores, roles, current offer, and round history. No backing-type metadata is exposed.
- Added a smoke test that covers accept/reject progression and final scoring.
- Added a thin Next route that renders a sample public room state and game explanation without assuming live transport.

TODOs
- Wire `splitModule` into the room runtime when the main thread is ready to register more game modules.
- Replace the static route sample with live room data once the room transport/API contract for split is available.

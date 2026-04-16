Original prompt: build a deterministic multiplayer-ready Vault game module and a thin route UI for ARENA, confined to packages/games/vault, apps/web/app/games/vault, and a vault-specific simulation test.

2026-04-16
- Chose an 8-round linear public-goods structure from the product spec: private contributions, public pool reveal, then accusation voting.
- Kept other players' live contributions private in public projection; only the viewer sees their own submitted value.
- Implemented tie-aware lowest-contributor detection so equal free-riders resolve deterministically by seat order where needed.
- Added a thin `/games/vault` route with a static sample room state instead of live transport wiring.
- Expanded the standalone route into a flagship-style brief driven by real module constants and a derived demo state.
- Added stronger vault-specific simulation coverage around privacy, round resolution, and additive behavioral metrics.

TODO
- Wire this module into the room runtime once the main thread adds generic room registration for non-auction games.
- Replace the derived demo chamber with live room state after the API/web integration surface settles.

Original prompt: build a deterministic multiplayer-ready 'Settlement' MVP slice and a thin route UI. Keep scope disciplined: implement a Settlement Lite loop that still demonstrates multiplayer negotiation and hidden human-or-LLM seat compatibility, but avoid overreaching into spatial networking or live transport.

- Chosen scope: `Settlement Lite` is a three-round threshold public-goods game with public pledges and hidden commitments.
- Reason for the shape: it preserves negotiation, bluffing, and hidden human/LLM seat compatibility without needing spatial transport or real-time synchronization.
- Local package work added:
  - typed settlement actions, state, projections, scoring, and match finalization
  - deterministic coercion helper so incomplete states can still finalize safely
  - a settlement-specific smoke test for public-state hiding and final scoring
- Remaining for integration:
  - room/runtime wiring must mount this module and optionally auto-fill LLM seats
  - live room UI still needs transport and action submission plumbing from the main thread

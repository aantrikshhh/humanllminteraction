# ARENA — Human x AI Game Platform

## Detailed Technical Specification

---

## Overview

Arena is a platform where humans play competitive game-theory games against AI agents — and get paid for winning. Every game produces structured behavioral data as a natural byproduct of gameplay. Companies submit their own AI agents and game scenarios to run experiments, benchmark agent performance, and collect ground-truth human behavioral data.

**Two value propositions:**
1. **Players earn money by winning.** Wallet-based KYC payouts. Leaderboard rankings. The better you play, the more you earn.
2. **Companies run experiments.** Submit custom AI agents, define game scenarios, fund reward pools. Get back structured behavioral data and agent performance benchmarks.

---

## Platform Architecture

```
ARENA PLATFORM
├── Game Engine Layer
│   ├── Game Templates (The Split, The Pact, The Vault, The Auction, The Settlement)
│   ├── 2D World Renderer (Phaser.js)
│   ├── AI Agent Interface (OpenAI / custom agent API)
│   └── Game State Machine (round management, phase transitions)
├── Data Pipeline
│   ├── Observer LLM (real-time behavioral tagging)
│   ├── Structured Data Output (JSON per game session)
│   ├── Distribution Accuracy Calculator
│   └── Eval Report Generator
├── Player Layer
│   ├── Wallet Connect (MetaMask / WalletConnect)
│   ├── KYC Verification
│   ├── Leaderboard + ELO Rating
│   ├── Payout Engine
│   └── Player Profile (cross-game behavioral stats)
├── Company Layer
│   ├── Agent Submission API
│   ├── Scenario Builder
│   ├── Reward Pool Deposit (USDC / platform token)
│   ├── Eval Dashboard
│   └── Data Export
└── On-Chain Layer (Polygon)
    ├── Reward Escrow (smart contract)
    ├── Player Reputation (soulbound token / attestation)
    └── Data Provenance (session hashes)
```

---

## The Games

### Game 1: The Split

**Based on:** Ultimatum Game

**Players:** 2 (human vs human, human vs AI, or AI vs AI — blinded)

**Mechanics:**
- A pot of 1000 points appears
- Proposer offers a split (slider: 0-1000)
- Responder sees the offer and accepts or rejects
- Accept: both get the proposed amounts
- Reject: both get zero
- Roles alternate each round
- 10 rounds per match

**Scoring:** Total points accumulated across all rounds. ELO rating adjusted after each match.

**Data output per round:**
```json
{
  "round": 3,
  "proposer": "player_a",
  "offer_to_responder": 350,
  "offer_to_self": 650,
  "responder_action": "accept",
  "responder_reaction_time_ms": 2340,
  "cumulative_scores": {"player_a": 1850, "player_b": 1200}
}
```

**Key behavioral metrics:**
- Fairness threshold distribution (what's the minimum acceptable offer?)
- Punishment behavior (rejecting unfair offers at personal cost)
- Anchoring effects (do early offers set expectations for later rounds?)
- Adaptation (do proposers adjust based on previous rejections?)

---

### Game 2: The Pact

**Based on:** Iterated Prisoner's Dilemma

**Players:** 2 (blinded human/AI)

**Mechanics:**
- Simultaneous choice each round: Cooperate or Betray
- Payoff matrix:
  - Both cooperate: +300 each
  - Both betray: +100 each
  - You betray, they cooperate: +500 / +0
  - You cooperate, they betray: +0 / +500
- 15 rounds with the SAME opponent
- Full history visible before each choice

**Scoring:** Total points. ELO adjusted.

**Data output per round:**
```json
{
  "round": 7,
  "player_a_choice": "cooperate",
  "player_b_choice": "betray",
  "player_a_points": 0,
  "player_b_points": 500,
  "history": ["CC", "CC", "CC", "CC", "CB", "BC", "CB"]
}
```

**Key behavioral metrics:**
- Cooperation rate over time
- Forgiveness rate (cooperate after being betrayed)
- Retaliation patterns (tit-for-tat, grudge, etc.)
- End-game effects (do players defect in final rounds?)
- Strategy classification (always cooperate, always defect, tit-for-tat, pavlov, etc.)

---

### Game 3: The Vault

**Based on:** Public Goods Game + Free-Rider Detection

**Players:** 4-6 (mix of humans and AI, blinded)

**Mechanics:**
- Each player starts with 500 points per round
- Phase 1: Privately choose how much to invest in the vault (0-500)
- The vault multiplies total contributions by 2x and splits equally among all players
- Phase 2: After seeing vault results (total, not individual contributions), vote on who contributed the least
- Correct guess: +100 bonus
- Getting voted as free-rider (correctly): -200 penalty
- 8 rounds

**Scoring:** Net points (vault returns + detection bonuses - penalties).

**Data output per round:**
```json
{
  "round": 4,
  "contributions": {
    "player_a": 300, "player_b": 450, "player_c": 100,
    "player_d": 400, "player_e": 250
  },
  "vault_total": 1500,
  "vault_multiplied": 3000,
  "per_player_return": 600,
  "votes_for_free_rider": {
    "player_a": "player_c", "player_b": "player_c",
    "player_c": "player_e", "player_d": "player_c", "player_e": "player_a"
  },
  "actual_lowest": "player_c",
  "correct_detections": ["player_a", "player_b", "player_d"]
}
```

**Key behavioral metrics:**
- Contribution levels (how much do people cooperate when they can free-ride?)
- Detection accuracy (how well do humans spot free-riders?)
- Punishment effectiveness (does the threat of detection increase contributions?)
- Contribution decay over rounds (does cooperation erode over time?)

---

### Game 4: The Auction

**Based on:** All-Pay Auction / Dollar Auction

**Players:** 3-5 (blinded)

**Mechanics:**
- Prize of 1000 points is auctioned
- Players bid in rounds (minimum raise: 50 points)
- ALL bidders pay their final bid, not just the winner
- If you bid 400 and lose, you lose 400 points
- Players can see all bids in real-time
- Bidding ends when all but one player pass consecutively
- Game plays 5 auctions per match

**Scoring:** Net profit/loss across all 5 auctions.

**Data output per auction:**
```json
{
  "auction": 2,
  "bid_sequence": [
    {"player": "a", "bid": 100},
    {"player": "b", "bid": 150},
    {"player": "c", "bid": 200},
    {"player": "a", "bid": 250},
    {"player": "b", "bid": 300},
    {"player": "a", "pass": true},
    {"player": "c", "bid": 350},
    {"player": "b", "pass": true}
  ],
  "winner": "player_c",
  "winner_profit": 650,
  "loser_losses": {"player_a": -250, "player_b": -300}
}
```

**Key behavioral metrics:**
- Escalation of commitment (sunk cost fallacy in action)
- Walk-away thresholds (when do people quit?)
- Competitive arousal (do players bid past rational limits?)
- Learning effects (do players bid more conservatively in later auctions?)

---

### Game 5: The Settlement (2D World)

**Based on:** Public Goods + Social Deduction in a spatial environment

**Players:** 5 (1 human + 4 AI for single-player; expandable to multiplayer)

**2D World:** Top-down village map with 5-6 locations (mine, farm, workshop, storage, town hall). Rendered with Phaser.js. Pixel art sprites.

**Mechanics:**

```
Each game = 5 Days. Each Day has 4 phases:

DAY PHASE (spatial, 60 seconds):
- Players move sprites around the village
- Visit locations to gather resources (food/wood/stone)
- Can see where other characters go
- Each location has limited yield per day
- Movement is click-to-move with simple pathfinding

NIGHT PHASE (hidden, automated):
- Screen darkens
- The saboteur secretly damages a structure or steals from storage
- Non-saboteur characters "sleep"

MORNING PHASE (reveal, 15 seconds):
- Damage announced: "The farm was raided. 50 food stolen."
- Camera pans to damage location

COUNCIL PHASE (structured interaction, 90 seconds):
- All sprites auto-gather at town hall
- Structured actions available:
  * Accuse [character] — triggers response
  * Defend [character] — builds alliance
  * Share info — "I was at the mine all day"
  * Stay silent
- After discussion, vote to banish one character
- Banished = removed from village

WIN CONDITIONS:
- Identify and banish saboteur before day 5 = player wins
- Saboteur survives all 5 days OR destroys 3 structures = saboteur wins
```

**AI Character Archetypes:**

| Character | Personality | When saboteur, style is... |
|---|---|---|
| Marcus | Data-driven, cites numbers, dismissive | Uses fake efficiency arguments |
| Priya | Bold, visionary, pushes big moves | Misdirects toward ambitious but wasteful plans |
| Jordan | Diplomatic, consensus-seeking, avoids conflict | Builds false trust, deflects blame smoothly |
| Sam | Practical, risk-averse, detail-focused | Advocates over-cautious strategies that slow progress |

**Data output per game:**
```json
{
  "game_id": "g_0482",
  "saboteur": "jordan",
  "outcome": "saboteur_detected_day_4",
  "player_movement_log": [
    {"day": 1, "locations_visited": ["mine", "storage", "farm"], "time_per_location_ms": [12000, 8000, 15000]}
  ],
  "resource_contributions": [
    {"day": 1, "player_contributed": 30, "player_hoarded": 10}
  ],
  "council_actions": [
    {"day": 1, "action": "accuse", "target": "marcus", "reason": "near farm during raid"}
  ],
  "suspicion_trajectory": [
    {"day": 1, "marcus": 40, "priya": 10, "jordan": 20, "sam": 30}
  ],
  "vote_history": [
    {"day": 1, "player_voted": "marcus", "actual_saboteur": "jordan"}
  ]
}
```

---

### Game 6: The Arena (Future — Post-Hackathon)

**Based on:** Marketplace dynamics + spatial strategy

**2D World:** A bazaar/marketplace. Players are merchants with stalls. AI customers walk through. Players set prices, position stalls, form alliances, sabotage competitors.

**Scope:** Too complex for hackathon. Design document only.

---

## Company Integration: Agent Submission API

Companies submit AI agents that play in the games. The API:

```
POST /api/agents
{
  "company_id": "acme_corp",
  "agent_name": "NegotiatorV3",
  "game": "the_split",
  "endpoint": "https://acme.com/agent/v3/decide",
  "reward_pool_usdc": 2000,
  "num_games": 500,
  "scenario_config": {
    "pot_size": 1000,
    "rounds": 10
  }
}
```

The agent endpoint receives game state and returns a decision:

```
POST https://acme.com/agent/v3/decide
Request:
{
  "game": "the_split",
  "round": 3,
  "role": "proposer",
  "history": [{"round": 1, "proposed": 600, "response": "accept"}, ...],
  "pot_size": 1000
}

Response:
{
  "action": "propose",
  "value": 550
}
```

**What companies get back:**
- Win/loss rate of their agent against human players
- Behavioral distribution comparison (how did humans respond to their agent vs baseline?)
- Per-round performance metrics
- Eval report with distribution accuracy scores

---

## Data Pipeline: The Observer LLM

A background LLM process runs during each game session (for games with qualitative interaction like The Settlement):

**Input:** Full game transcript + actions + outcomes
**Output:** Structured behavioral tags

```json
{
  "session_id": "s_2847",
  "behavioral_tags": {
    "dominant_strategy": "tit_for_tat_with_forgiveness",
    "risk_profile": "moderate_risk_averse",
    "social_style": "cooperative_until_provoked",
    "cognitive_biases_observed": ["sunk_cost", "anchoring"],
    "trust_calibration_speed": "slow_to_trust_fast_to_punish"
  }
}
```

For numerical games (The Split, The Pact, The Auction), no Observer LLM is needed — the data is already perfectly structured from the choices themselves.

---

## Player Profile System

Cross-game behavioral fingerprint built from all games played:

```json
{
  "player_id": "0x1a2b....",
  "games_played": 147,
  "elo_ratings": {
    "the_split": 1450,
    "the_pact": 1380,
    "the_vault": 1520,
    "the_auction": 1290,
    "the_settlement": 1410
  },
  "behavioral_profile": {
    "fairness_threshold": 0.32,
    "cooperation_rate": 0.71,
    "forgiveness_rate": 0.55,
    "free_rider_detection_accuracy": 0.78,
    "escalation_resistance": 0.45,
    "deception_detection_accuracy": 0.62
  },
  "total_earned_usd": 342.50,
  "reputation_score": 87
}
```

---

## Monetization

### Revenue Stream 1: Company Bounties (Primary)
Companies deposit funds to run experiments. Platform takes 15-20% fee.
- $2,000 for 500 games of The Split with a custom agent
- $5,000 for 200 games of The Settlement with a custom scenario
- $10,000 for a full behavioral benchmark (all games, 1000 players)

### Revenue Stream 2: Data Licensing
Aggregate behavioral distributions (anonymized) sold to:
- Synthetic persona companies (Artificial Societies, Blok, Synthetic Society)
- AI labs (benchmarking LLM social behavior)
- Behavioral research institutions
- Pricing: per-dataset or subscription

### Revenue Stream 3: Platform Fees
- Agent submission fee (one-time setup)
- Premium analytics dashboard for companies
- API access for real-time behavioral data

### Revenue Stream 4: Player Progression (Future)
- Cosmetic sprite skins (purchasable)
- Premium game modes
- Tournament entry fees (with prize pools)

---

## On-Chain Layer (Polygon) — Keep It Simple

### Hackathon Scope:
- Points system in the UI
- Wallet connect button (MetaMask)
- Leaderboard showing points + wallet address
- "Rewards coming soon" badge

### Post-Hackathon:
- ERC-20 token on Polygon via thirdweb (no custom Solidity)
- Company bounty escrow: USDC deposited, released on game completion
- Player reputation: soulbound token or on-chain attestation
- Data provenance: game session hashes stored on-chain

### Why Polygon:
- ~$0.01 gas fees (micropayments per game viable)
- Mature gaming ecosystem (Immutable partnership)
- EVM compatible (easy tooling)
- thirdweb has first-class support

---

## Hackathon Build Priority

| Priority | Component | Time Estimate |
|---|---|---|
| P0 | The Split (complete playable game) | 2 hours |
| P0 | AI opponent (OpenAI-powered agent) | 1 hour |
| P0 | Data output display (show structured JSON after game) | 0.5 hours |
| P1 | Platform landing page (game selector, vision) | 1 hour |
| P1 | Leaderboard + wallet connect | 0.5 hours |
| P1 | Eval report (distribution comparison chart) | 1 hour |
| P2 | Second game (The Pact) | 1 hour |
| P2 | Mock company dashboard | 0.5 hours |
| P3 | The Settlement 2D world (if time permits) | 3+ hours |

**Total P0+P1:** ~6 hours. Leaves 30 min buffer for demo prep.

---

## Tech Stack

- **Frontend:** Next.js + React
- **2D Engine:** Phaser.js (for The Settlement)
- **AI Agents:** OpenAI API (GPT-4o for game decisions)
- **Backend:** Next.js API routes or Express
- **Database:** Supabase or Firebase (quick setup)
- **Wallet:** thirdweb SDK or RainbowKit
- **Chain:** Polygon (testnet for hackathon)
- **Hosting:** Vercel

---

## The Pitch (30-second version)

"Arena is where humans play competitive game-theory games against AI — and earn money for winning. Companies submit their AI agents to test them against real humans. Every game produces structured behavioral data that benchmarks how well AI predicts human decisions. We're the LMSYS Chatbot Arena for human behavior — and the market doesn't exist yet."

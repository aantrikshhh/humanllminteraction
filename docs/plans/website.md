# Website Plan

## Scope

The Website stream owns the public, mostly static ARENA marketing surface. The site should explain the product to two audiences without splitting into two separate brands: players who want to understand the games and companies or research teams who want to understand the benchmark, replay, and telemetry value.

- Build the public route tree under `apps/web/app/(marketing)` and the reusable section library under `apps/web/components/marketing`.
- Lead with the core hook immediately: structured multiplayer games, hidden human-vs-LLM seats, and one flagship live demo (`The Auction`).
- Present the platform as a credible product, not a placeholder dashboard: strong public narrative, consistent visual system, game catalog, and asset credits.
- Keep the public site crawlable and static-friendly. Primary marketing content should render as HTML, not depend on client-only hydration for comprehension.
- Keep blockchain, payouts, and leaderboard claims secondary until their owned streams ship stable surfaces. The website can mention them as demo-context features, not as the main story.

Out of scope for this stream:

- `apps/web/app/(app)` authenticated flows
- `apps/web/app/games/*` playable game clients
- room lifecycle, seat state, replay logic, leaderboard math, and payments behavior
- inventing a separate design system outside `@arena/theme`

## Owned Paths

Primary ownership is unchanged from `docs/coordination/WORKSTREAMS.md`.

| Path | Ownership Notes | Planned Outputs |
| --- | --- | --- |
| `apps/web/app/(marketing)` | Entire public route tree | marketing layout, landing page, explainer pages, game catalog pages, credits, FAQ, legal shells, route metadata helpers |
| `apps/web/app/(marketing)/page.*` | home route | value proposition, flagship demo narrative, proof sections, CTA band |
| `apps/web/app/(marketing)/how-it-works/**` | public explainer | blinded-seat model, room flow summary, replay and telemetry explanation |
| `apps/web/app/(marketing)/games/**` | marketing-only catalog | catalog index and detail pages for `auction`, `split`, `pact`, `vault`, and `settlement` |
| `apps/web/app/(marketing)/for-companies/**` | company-facing pitch | buyer narrative, experiment workflow, benchmark value, data outputs |
| `apps/web/app/(marketing)/research/**` | research-facing pitch | methodology framing, behavioral outputs, replay/export narrative |
| `apps/web/app/(marketing)/faq/**` | support content | answer high-friction product questions without pushing users into the app flow |
| `apps/web/app/(marketing)/credits/**` | attribution surface | public credits page backed by asset manifest data when available |
| `apps/web/app/(marketing)/legal/**` | static shells | `privacy` and `terms` shells once copy is available |
| `apps/web/components/marketing` | shared marketing component library | nav, footer, hero, feature grid, proof strip, game card, FAQ, credits table, CTA sections |

Implementation note:

- If the app stack remains Next.js App Router, keep public-only special files such as `sitemap.ts`, `robots.ts`, and metadata assets inside `app/(marketing)` so ownership stays clean.
- Do not create or modify routes under `app/(app)` or `app/games/*`.

## Dependencies

| Dependency | Source | Why It Matters | Blocking Level |
| --- | --- | --- | --- |
| Theme tokens and primitives | `packages/theme`, Art Direction stream | Website must inherit palette, type, spacing, and sprite treatment from the shared theme instead of inventing a parallel visual system. | High |
| Asset manifest and credits rules | `docs/coordination/ASSET_GOVERNANCE.md`, `packages/theme` | The public site needs a real credits surface and must only use approved packs with traceable attribution. | High |
| Public game metadata | `packages/games/*`, `@arena/game-sdk` `GameBrief` exports | Catalog cards and game detail pages should come from stable game metadata, not duplicated copy. | High |
| Canonical player CTA destination | User Flow stream | The home page and game pages need one primary CTA, but the final destination depends on whether the entry point is onboarding, lobby, or room join. | High |
| Product narrative priorities | Shared context plus product owner decisions | The site needs a stable hierarchy between player story, company story, and research story to avoid constant copy churn. | Medium |
| Visual assets and screenshots | Art Direction stream plus individual game streams | Game catalog pages will need screenshots, box-art treatments, or approved placeholders that match the Kenney-first direction. | Medium |
| QA budgets and checks | QA + CI stream | Lighthouse, accessibility, and responsive smoke checks should be automated once routes exist. | Medium |
| Legal copy | Product/legal owner | `privacy` and `terms` shells can be scaffolded early, but final text is external. | Low |

Cross-stream coordination to lock early:

- Confirm the canonical public CTA target from the User Flow stream.
- Confirm whether credits data is pulled from a theme registry, a markdown source, or both.
- Confirm whether game detail pages should show implementation status badges (`flagship`, `mvp`, `future`) alongside `GameBrief.priority`.

## Information Architecture

Research-backed IA guardrails:

- Keep top-level navigation short. Primary navigation should stay at four links or fewer plus one CTA.
- Use descriptive, human-readable URLs and topical directories such as `/games/[slug]` and `/legal/*`.
- Keep deeper pages internally linked from category pages and footer navigation so users and crawlers can understand site structure.

Primary navigation:

- `How It Works`
- `Games`
- `For Companies`
- primary CTA: `See the Demo` or `Enter ARENA` once the User Flow stream defines the canonical destination

Footer navigation:

- `Research`
- `FAQ`
- `Credits`
- `Privacy`
- `Terms`

Route inventory:

| Route | Purpose | Core Content |
| --- | --- | --- |
| `/` | landing page | hero, hidden-seat premise, flagship `The Auction`, multiplayer proof, company/research teaser, CTA |
| `/how-it-works` | product explainer | seat abstraction, hidden human-vs-LLM model, room authority, replay and telemetry outputs |
| `/games` | catalog index | game grid, flagship highlight, quick summaries, seat counts, status tags |
| `/games/[slug]` | game marketing details | premise, seat count, why it is interesting to watch, what data it yields, visual direction |
| `/for-companies` | commercial pitch | benchmark workflow, custom agent story, reward pool/demo framing, export/report value |
| `/research` | methodology pitch | behavioral signals, replay quality, experiment structure, benchmark/research positioning |
| `/faq` | objection handling | hidden seats, fairness, rewards status, replay visibility, privacy boundaries |
| `/credits` | attribution | approved asset packs, authors, license summary, links to source records |
| `/legal/privacy` | compliance shell | privacy language once finalized |
| `/legal/terms` | compliance shell | terms language once finalized |

Deliberate exclusions:

- No public `/leaderboard` route. That path is already owned by the Leaderboard stream under `app/(app)`, and a second public route would create ownership and URL conflicts.
- No marketing route for live room states or game sessions. Public pages can preview the experience, but they should hand off into owned app flows for actual play.

## Implementation Plan

1. Lock the marketing route map and content model.
   - Create one source of truth for navigation, footer links, FAQ entries, and company/research proof points.
   - Treat game catalog content as data-driven. Use the `GameBrief` exports as the base record and extend locally only for marketing-only fields such as watchability, telemetry hooks, and screenshots.
   - Keep page generation static-first unless a dependency explicitly requires runtime data.

2. Build the shared public shell first.
   - Implement the marketing layout, header, footer, skip link, page section wrapper, and CTA band before building page-specific variants.
   - Use semantic landmarks consistently: labeled `nav`, one `main`, footer, and headings that mirror the visible information hierarchy.
   - Keep the mobile menu simple and keyboard-safe instead of building an over-engineered ARIA menu.

3. Deliver pages in dependency order.
   - First ship `/`, `/how-it-works`, and `/games` so the product story and flagship demo narrative exist immediately.
   - Next ship `/games/[slug]` pages for all five games, with `auction` receiving the richest treatment because it is the flagship live demo.
   - Then add `/for-companies` and `/research` so the company story is explicit without overloading the home page.
   - Finish with `/faq`, `/credits`, and legal shells.

4. Apply current best practices while building, not as a cleanup step.
   - Keep the main message and primary CTA in server-rendered HTML so search engines and users see the same core content.
   - Give every page a unique title and description, descriptive URL, one clear page-level heading, and obvious internal links back to related content.
   - Prioritize only the above-the-fold hero art. Give all images explicit dimensions, lazy-load below-the-fold media, and avoid background-image-only critical content.
   - Keep client JavaScript light on marketing routes to protect interaction latency. Use client components only for actual interaction such as mobile nav or FAQ disclosure.
   - Respect `prefers-reduced-motion`; motion should support atmosphere, not become required for comprehension.

5. Integrate with theme and asset governance.
   - Pull typography, palette, spacing, and sprite accents from `@arena/theme`.
   - Ensure every public art usage can be traced back to the asset manifest or approved supplement list.
   - Build the credits page so it can render from structured manifest data later without changing the page contract.

6. Validate the public site like a product surface, not just documentation.
   - Run responsive checks at mobile, tablet, and desktop breakpoints.
   - Run keyboard-only and screen-reader sanity passes across the nav, CTA flow, FAQ, and credits page.
   - Add QA hooks for Lighthouse and route smoke tests once the QA + CI stream is ready.

## Acceptance Criteria

- The public route tree is fully contained within `apps/web/app/(marketing)` and does not collide with `app/(app)` or `app/games/*`.
- The home page communicates, within the first two sections, that ARENA is a multiplayer platform, seats can be human or LLM-backed without disclosure during play, `The Auction` is the flagship demo, and gameplay produces structured experiment data.
- Primary navigation is stable at four links or fewer plus one CTA, with footer links handling secondary pages.
- `/games` renders all five games from stable metadata and links to detail pages under `/games/[slug]`.
- Every public page has a unique metadata title and description, a descriptive URL, one page-level heading, and crawlable body copy.
- The first focusable control on each page is a skip link to main content, navigation is keyboard-usable, and page landmarks are semantically labeled.
- Marketing images include intrinsic dimensions; above-the-fold hero media is prioritized; below-the-fold media is lazy-loaded; layout shift from image loading is effectively eliminated.
- The credits page can display required asset attribution without inventing a second asset-tracking source.
- Home page and one representative secondary page are built to meet good Core Web Vitals targets: LCP at or under 2.5 seconds, CLS at or under 0.1, and interaction cost kept low by minimizing client-side JavaScript on marketing routes.
- Lighthouse audits for home page and one representative secondary page should be suitable for CI gating once QA is wired: Accessibility `>= 95`, SEO `>= 95`, and no critical best-practices failures.

## Risks

- Theme and art dependencies are likely to land after route work starts. Without early token and asset handoff, the website can become structurally correct but visually generic.
- The product narrative currently spans players, companies, research, payouts, and on-chain ideas. Without a clear hierarchy, the home page will bloat and the primary CTA will become ambiguous.
- Game metadata is available at the `GameBrief` level today, but marketing pages will likely need richer fields such as screenshots, spectator value, and telemetry summaries. That data contract must be agreed before implementation hardens.
- Heavy pixel art, video, or animated hero treatments can easily break performance budgets if the site treats every visual as above-the-fold critical media.
- `docs/coordination/ASSET_GOVERNANCE.md` names `apps/web/app/credits` as a credits surface, while Website ownership is `app/(marketing)`. The intended implementation should be `/credits` via `app/(marketing)/credits`, but that path convention needs to stay explicit to avoid stream conflicts.
- Public copy can accidentally overpromise live payouts, blockchain, or leaderboard behavior that only exists as a stub elsewhere in the repo. The website should describe current demo capability, not future platform ambition, unless the page clearly labels it as roadmap.

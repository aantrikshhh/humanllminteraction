# Art and Asset Governance Plan

## Scope

Own:

- `packages/theme`
- `docs/coordination/ASSET_GOVERNANCE.md`
- generated credits data

Do not own:

- reducers
- rank logic
- provider logic

## Research-Backed Direction

Use a single `competitive pixel tactics` house style.

References:

- `https://kenney.nl/support`
- `https://kenney.nl/assets/pixel-ui-pack`
- `https://kenney.nl/assets/tiny-town`
- `https://kenney.nl/assets/roguelike-rpg-pack`
- `https://0x72.itch.io/dungeontileset-ii`
- `https://0x72.itch.io/dungeonui`
- `https://ansimuz.itch.io/patreons-top-down-collection`
- `https://opengameart.org/content/faq`

## Implementation Steps

- define theme tokens for color, spacing, radius, motion, and typography
- define scene families for marketing, lobby, auction floor, negotiation chamber, treasury chamber, and village map
- finalize asset manifest schema and example data in `packages/theme`
- generate credits data from the asset manifest instead of maintaining it manually

## Asset Rules

- Kenney is the base style
- 0x72, ansimuz, and OpenGameArt are supplements only
- every imported asset or pack gets manifest metadata and credit text
- do not mix asset families on a screen without normalizing size and density

## Acceptance Criteria

- website and games share one visual language
- credits are renderable from structured metadata
- Settlement can use the same asset system without inventing a parallel art pipeline

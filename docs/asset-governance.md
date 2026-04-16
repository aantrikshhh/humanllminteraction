# Asset Governance

## Visual Direction

Primary style: `Kenney-first competitive pixel tactics`

Approved supplements:

- `0x72 DungeonTileset II`
- `0x72 DungeonUI`
- `ansimuz top-down collection`
- selective `OpenGameArt` assets

Credit these supplements whenever they are used, even if attribution is optional for a specific pack.

## Sourcing Rules

- Use Kenney as the default source for most UI and environment assets.
- Use 0x72 for compact retro dungeon tiles or UI gaps.
- Use ansimuz for high-personality environment scenes when Kenney is too plain.
- Use OpenGameArt only after checking the exact asset license and attribution requirements.
- Do not mix packs on the same screen unless tile size, palette, and line weight are normalized.

## Required Manifest Fields

Every third-party asset or pack used must be represented in the asset manifest with:

- `assetId`
- `source`
- `pack`
- `assetPath`
- `author`
- `assetUrl`
- `license`
- `licenseUrl`
- `requiredAttribution`
- `creditText`
- `usedIn`
- `notes`

## Required Surfaces

The app must expose credits in at least two places:

- a dedicated credits page
- an in-app credits link for demo builds

The repo must also contain a human-readable asset ledger.

## CI Rule

No third-party asset should be merged unless it has a manifest entry and a valid credit string.

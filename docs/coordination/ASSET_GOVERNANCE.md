# Asset Governance

## Primary Direction

- Primary house style: Kenney-first pixel tactics
- Approved supplements:
  - 0x72 DungeonTileset II
  - 0x72 DungeonUI
  - ansimuz top-down collection
  - selected OpenGameArt assets

## Rules

- Credit every approved supplement when used, even if attribution is optional.
- Track OpenGameArt attribution per asset, not per site.
- Avoid mixing packs on the same gameplay screen unless tile size, outline weight, and palette are normalized.
- Default map workflow: Tiled JSON plus Phaser tilemap loading.

## Asset Manifest Schema

Each imported third-party asset should have one entry with:

- `assetId`
- `source`
- `pack`
- `assetPath`
- `license`
- `author`
- `assetUrl`
- `licenseUrl`
- `requiredAttribution`
- `creditText`
- `usedIn`
- `notes`

## Credits Surfaces

- `THIRD_PARTY_ASSETS.md` at repo root
- `apps/web/app/credits`
- demo-build footer or credits modal

## Pack Usage Guidance

- Kenney: base UI, base world tiles, common prop language
- 0x72: dungeon and compact retro UI accents
- ansimuz: expressive environment and character supplements
- OpenGameArt: last-mile gap fillers after license review

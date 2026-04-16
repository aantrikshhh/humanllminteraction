# Art and Asset Research

## Recommended Visual Direction

Use a single `competitive pixel tactics` house style so the product looks intentional instead of assembled from unrelated packs.

Primary direction:

- Kenney as the base visual language
- Game-icons for symbolic UI
- 0x72, ansimuz, and selected OpenGameArt assets only as controlled supplements

## Why This Direction

- It is the fastest path to visual cohesion.
- It keeps licensing risk low.
- It supports both room-based strategy games and the later `Settlement` spatial experience.
- It makes it easier for a single art direction stream to normalize tile size, palette, and UI density across multiple games.

## Approved Sources

### Primary

- Kenney support and licensing: https://kenney.nl/support
- Pixel UI Pack: https://kenney.nl/assets/pixel-ui-pack
- UI Pack - Pixel Adventure: https://kenney.nl/assets/ui-pack-pixel-adventure
- Tiny Town: https://kenney.nl/assets/tiny-town
- Roguelike/RPG Pack: https://kenney.nl/assets/roguelike-rpg-pack
- Roguelike Characters: https://kenney.nl/assets/roguelike-characters

### Required Supplemental Sources

- 0x72 DungeonTileset II: https://0x72.itch.io/dungeontileset-ii
- 0x72 DungeonUI: https://0x72.itch.io/dungeonui
- ansimuz top-down collection: https://ansimuz.itch.io/patreons-top-down-collection
- OpenGameArt licensing FAQ: https://opengameart.org/content/faq

### Additional Icon Source

- Game-icons.net license: https://game-icons.net/about.html

## Asset Workflow

- Use Tiled for map authoring
- Export JSON from Tiled for Phaser consumption
- Keep one tile size per scene family
- Track every imported asset in the future manifest
- Generate a credits page from the manifest

## Style Guardrails

- Do not mix pixel UI and vector UI on the same screen.
- Do not mix mismatched sprite scales on the same map.
- Normalize palette and contrast before mixing any supplemental source with Kenney assets.


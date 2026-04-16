import assetManifestExampleJson from "./asset-manifest.example.json";

export type AssetSourceId = "kenney" | "0x72" | "ansimuz" | "opengameart";
export type AssetAttributionMode = "not-required" | "recommended" | "per-asset";

export interface AssetSourcePolicy {
  sourceId: AssetSourceId;
  source: string;
  author: string;
  homepageUrl: string;
  policyUrl: string;
  defaultLicense: string;
  commercialUse: "allowed" | "per-asset";
  attributionMode: AssetAttributionMode;
  projectCreditPolicy: "always-credit";
  researchNotes: string[];
}

export interface AssetManifestEntry {
  assetId: string;
  sourceId: AssetSourceId;
  source: string;
  pack: string;
  assetName: string;
  assetPath: string;
  author: string;
  assetUrl: string;
  license: string;
  licenseUrl: string;
  requiredAttribution: boolean;
  creditText: string;
  usedIn: string[];
  notes?: string;
}

export interface AssetManifest {
  version: number;
  generatedAt: string;
  assets: AssetManifestEntry[];
}

export interface AssetCreditsGroup {
  source: AssetSourcePolicy;
  assets: AssetManifestEntry[];
}

export const approvedAssetSourcePolicies: Record<AssetSourceId, AssetSourcePolicy> = {
  kenney: {
    sourceId: "kenney",
    source: "Kenney",
    author: "Kenney",
    homepageUrl: "https://kenney.nl/assets",
    policyUrl: "https://kenney.nl/support",
    defaultLicense: "CC0",
    commercialUse: "allowed",
    attributionMode: "not-required",
    projectCreditPolicy: "always-credit",
    researchNotes: [
      "Kenney support states that game assets on asset pages are CC0.",
      "Commercial use is allowed and attribution is not required.",
      "This project still credits Kenney as a house-style source by policy."
    ]
  },
  "0x72": {
    sourceId: "0x72",
    source: "0x72",
    author: "0x72",
    homepageUrl: "https://0x72.itch.io/",
    policyUrl: "https://0x72.itch.io/dungeonui",
    defaultLicense: "CC0",
    commercialUse: "allowed",
    attributionMode: "not-required",
    projectCreditPolicy: "always-credit",
    researchNotes: [
      "DungeonUI and DungeonTileset II are published by 0x72 as CC0 packs.",
      "CC0 does not require attribution, but this project credits 0x72 whenever those packs are used."
    ]
  },
  ansimuz: {
    sourceId: "ansimuz",
    source: "ansimuz",
    author: "ansimuz",
    homepageUrl: "https://ansimuz.itch.io/",
    policyUrl: "https://ansimuz.itch.io/magical-road-pixel-art-environment",
    defaultLicense: "itch.io pack license",
    commercialUse: "allowed",
    attributionMode: "recommended",
    projectCreditPolicy: "always-credit",
    researchNotes: [
      "ansimuz itch.io packs state they may be used in personal or commercial projects.",
      "Credit is described as appreciated rather than required on the referenced pack page.",
      "This project treats ansimuz credits as mandatory project policy when assets are used."
    ]
  },
  opengameart: {
    sourceId: "opengameart",
    source: "OpenGameArt",
    author: "varies by asset",
    homepageUrl: "https://opengameart.org/",
    policyUrl: "https://opengameart.org/content/faq",
    defaultLicense: "per asset",
    commercialUse: "per-asset",
    attributionMode: "per-asset",
    projectCreditPolicy: "always-credit",
    researchNotes: [
      "OpenGameArt allows commercial use, but developers must follow each asset's specific license terms.",
      "The FAQ recommends crediting with the asset name, author name, license, and asset URL when no custom notice is given.",
      "This project only uses OpenGameArt as a filler source after per-asset license review."
    ]
  }
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Asset manifest field "${field}" must be a non-empty string.`);
  }

  return value;
}

function assertStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`Asset manifest field "${field}" must be a string array.`);
  }

  return value;
}

function assertBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Asset manifest field "${field}" must be a boolean.`);
  }

  return value;
}

function assertSourceId(value: unknown): AssetSourceId {
  const sourceId = assertString(value, "sourceId");

  if (!Object.hasOwn(approvedAssetSourcePolicies, sourceId)) {
    throw new Error(`Unknown asset source "${sourceId}" in manifest entry.`);
  }

  return sourceId as AssetSourceId;
}

function normalizeAssetEntry(input: unknown, index: number): AssetManifestEntry {
  if (!isRecord(input)) {
    throw new Error(`Asset manifest entry ${index} must be an object.`);
  }

  const sourceId = assertSourceId(input.sourceId);
  const sourcePolicy = approvedAssetSourcePolicies[sourceId];

  return {
    assetId: assertString(input.assetId, "assetId"),
    sourceId,
    source: assertString(input.source, "source"),
    pack: assertString(input.pack, "pack"),
    assetName: assertString(input.assetName, "assetName"),
    assetPath: assertString(input.assetPath, "assetPath"),
    author: assertString(input.author, "author"),
    assetUrl: assertString(input.assetUrl, "assetUrl"),
    license: assertString(input.license, "license"),
    licenseUrl: assertString(input.licenseUrl, "licenseUrl"),
    requiredAttribution: assertBoolean(input.requiredAttribution, "requiredAttribution"),
    creditText: assertString(input.creditText, "creditText"),
    usedIn: assertStringArray(input.usedIn, "usedIn"),
    notes:
      typeof input.notes === "string" && input.notes.trim().length > 0
        ? input.notes
        : `Declared under the ${sourcePolicy.source} source policy.`
  };
}

function normalizeAssetManifest(input: unknown): AssetManifest {
  if (!isRecord(input)) {
    throw new Error("Asset manifest must be an object.");
  }

  const assets = input.assets;
  if (!Array.isArray(assets)) {
    throw new Error('Asset manifest field "assets" must be an array.');
  }

  return {
    version:
      typeof input.version === "number" && Number.isFinite(input.version) ? input.version : 1,
    generatedAt:
      typeof input.generatedAt === "string" && input.generatedAt.trim().length > 0
        ? input.generatedAt
        : new Date().toISOString(),
    assets: assets.map((entry, index) => normalizeAssetEntry(entry, index))
  };
}

export const assetManifestExample = normalizeAssetManifest(assetManifestExampleJson);

export function getAssetSourcePolicy(sourceId: AssetSourceId): AssetSourcePolicy {
  return approvedAssetSourcePolicies[sourceId];
}

export function listApprovedAssetSources(): AssetSourcePolicy[] {
  return Object.values(approvedAssetSourcePolicies);
}

export function groupAssetCreditsBySource(
  manifest: AssetManifest = assetManifestExample
): AssetCreditsGroup[] {
  return listApprovedAssetSources().map((source) => ({
    source,
    assets: manifest.assets.filter((asset) => asset.sourceId === source.sourceId)
  }));
}

export function listDisplayCredits(
  manifest: AssetManifest = assetManifestExample
): AssetManifestEntry[] {
  return [...manifest.assets].sort((left, right) => {
    if (left.source === right.source) {
      return left.assetName.localeCompare(right.assetName);
    }

    return left.source.localeCompare(right.source);
  });
}

export function formatCreditLine(asset: AssetManifestEntry): string {
  return asset.creditText;
}

export function formatUsageSurfaceLabel(surface: string): string {
  return surface
    .split(":")
    .map((segment) =>
      segment.length === 0 ? segment : `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}`
    )
    .join(" / ");
}

export function summarizeManifest(
  manifest: AssetManifest = assetManifestExample
): { totalAssets: number; sourcesUsed: number; requiredCredits: number } {
  const sourcesUsed = new Set(manifest.assets.map((asset) => asset.sourceId)).size;
  const requiredCredits = manifest.assets.filter((asset) => asset.requiredAttribution).length;

  return {
    totalAssets: manifest.assets.length,
    sourcesUsed,
    requiredCredits
  };
}

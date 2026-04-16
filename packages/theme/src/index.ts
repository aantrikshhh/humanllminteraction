export interface AssetManifestEntry {
  assetId: string;
  source: string;
  pack: string;
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

export interface SceneTheme {
  id: string;
  tileSize: number;
  palette: string[];
  typography: {
    display: string;
    body: string;
  };
}

export interface ThemeRegistry {
  scenes: SceneTheme[];
  assets: AssetManifestEntry[];
}

export * from "./asset-manifest";

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
  assets: import("./asset-manifest").AssetManifestEntry[];
}

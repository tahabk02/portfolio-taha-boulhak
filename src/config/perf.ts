/**
 * Central performance tunables and feature flags.
 * All values are relative multipliers or device-independent caps; the scene has
 * its own units, so nothing here is expressed in metres.
 */
export const FEATURE_FLAGS = {
  /** Rebuild of the player character. Set to false (or VITE_ENABLE_CHARACTER_V2=false) to roll back. */
  ENABLE_CHARACTER_V2: import.meta.env?.VITE_ENABLE_CHARACTER_V2 !== 'false',
  /** Allow the lightweight 2D fallback (auto-detected or user-toggled). */
  ENABLE_FAST_MODE: true,
  /** Auto-select fast mode on low-end devices / lost WebGL / sustained low FPS. */
  ENABLE_AUTO_FAST_MODE: true,
  /** Subtle glow + billboard prompt on the interactable zone in range. */
  ENABLE_ZONE_HIGHLIGHTS: true,
  /** Show the interaction state debug overlay in development. */
  ENABLE_DEBUG_STATE_OVERLAY: import.meta.env?.DEV ?? false,
  /** Emit renderer.info snapshots to the console (dev only). */
  ENABLE_RENDERER_INFO_LOG: false,
} as const;

export const PERF = {
  /** Hard cap for device pixel ratio on every device. */
  maxDpr: 2,
  /** Single shadow-casting light map size. */
  shadowMapSize: 2048,
  /** Reduced shadow map for software / fast GPU path. */
  shadowMapSizeLow: 1024,
  /** Texture anisotropy ceiling (GPU max may be 16). */
  maxAnisotropy: 8,
  /** Anisotropy when running on a software renderer. */
  maxAnisotropyLow: 1,
  /** FPS sampling window used by the auto fast-mode guard. */
  lowFpsThreshold: 30,
  lowFpsWindowMs: 3000,
  /** Device tier thresholds from the Web Platform. */
  lowEndCores: 4,
  lowEndMemoryGb: 4,
  /** Screen canvas paint cadence (ms). */
  screenPaintIntervalMs: 55,
  screenPaintIntervalLowMs: 140,
  /** Camera obstruction re-test cadence (ms). */
  cameraObstructionIntervalMs: 80,
  /** Soft cap of rendered frames per second for the FPS guard sampling. */
  fpsSampleMinFrames: 20,
} as const;

/** Runtime capability snapshot used by the 3D/fast-mode gate. */
export interface DeviceTier {
  webgl: boolean;
  webgl2: boolean;
  softwareRenderer: boolean;
  lowEnd: boolean;
  cores: number;
  memoryGb: number;
  preferredFastMode: boolean;
}

/** Copy + UI constants shared by the loading screen and fallback page. */
export const UI_TIMING = {
  loadingFadeMs: 320,
  loadingMaxProgressBeforeAssets: 90,
  fastModeNoticeMs: 6000,
} as const;

/** PC-view tuning, in the room's metre units. */
export const ENABLE_PC_VIEW = true;

export const PC_VIEW = {
  cameraDistance: 1.12,
  minCameraDistance: 0.62,
  maxCameraDistance: 1.55,
  fovOffset: -8,
  transitionSeconds: 1.4,
  autoAdvanceMs: 8000,
  interactionPauseMs: 15000,
  failsafeMs: 2000,
  vignetteOpacity: 0.2,
} as const;

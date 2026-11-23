/** NEON DODGE simulation values; screen-space values are pixels, not room units. */
export const NEON_DODGE = {
  fixedStepSeconds: 1 / 60,
  maxFrameDeltaSeconds: 0.1,
  maxCatchUpSteps: 5,
  startCountdownSeconds: 1.2,
  dashSeconds: 0.65,
  playerMoveFraction: 0.065,
  playerCollisionRadiusPx: 18,
  initialHazardCount: 8,
  hazardTopPaddingPx: 30,
  hazardRecycleRangePx: 180,
} as const;

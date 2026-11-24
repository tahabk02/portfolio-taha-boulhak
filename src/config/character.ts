import { SCALE } from './scale';

/**
 * Character v2 proportions. Every dimension is a RATIO of the character's
 * total height H (the scene's own units). H matches the legacy avatar so the
 * collider radius, camera follow height and seat anchors stay valid.
 */
export const CHARACTER = {
  flagName: 'ENABLE_CHARACTER_V2',
  /** Legacy total height, in scene units (same origin: feet at y = 0). */
  H: SCALE.characterHeight,
  ratios: {
    headHeight: 0.135,
    neckHeight: 0.03,
    hairHeight: 0.025,
    shoulderWidth: 0.26,
    torsoHeight: 0.3,
    pelvisRise: 0.04,
    hipWidth: 0.18,
    legLength: 0.47,
    armLength: 0.38,
    handHeight: 0.055,
    footLength: 0.15,
    headWidth: 0.112,
    headDepth: 0.125,
    /** Split of the leg length. */
    thigh: 0.245,
    shin: 0.195,
    ankle: 0.03,
    /** Split of the arm length. */
    upperArm: 0.19,
    forearm: 0.14,
    /** Shoulder/deltoid padding beyond the torso half-width. */
    deltoid: 0.016,
  },
  /** Soft silhouette tunables (multipliers, no absolute units). */
  shape: {
    waistPinch: 0.78,
    chestForward: 0.06,
    torsoZScale: 0.64,
    shoulderSlope: 0.55,
    legThickness: 0.9,
    armThickness: 0.82,
    shoeWidth: 0.72,
  },
  hair: {
    curlCount: 260,
    curlRadius: 0.019,
    /** Low-end preview falls back to this count. */
    curlCountLow: 0,
    bounce: 0.012,
  },
  springs: {
    drawstring: 26,
    hair: 18,
    glasses: 30,
  },
  colors: {
    skin: '#c08a63',
    skinShadow: '#a06d4c',
    skinLight: '#d09a72',
    hair: '#211813',
    hairLight: '#33251c',
    beard: '#2a1e17',
    hoodie: '#111312',
    hoodieHighlight: '#232725',
    hoodieStitch: '#4b514d',
    pants: '#1d2327',
    pantsHighlight: '#2c3439',
    shoe: '#0f1111',
    sole: '#5c615e',
    laces: '#8e9490',
    metal: '#b8bcb8',
    sclera: '#e8e2d8',
    iris: '#4a2f1e',
    pupil: '#120c08',
    lip: '#7d4a3c',
    lens: '#cfdde2',
  },
  /** Sit/stand posture anchors, as ratios of H (hip-local spine heights). */
  seats: {
    desk: { spine: 0.269, arm: 0.717, torsoLean: 0.06 },
    gaming: { spine: 0.284, arm: 0.717, torsoLean: 0.05 },
    sofa: { spine: 0.39, arm: 0.62, torsoLean: -0.16 },
    podcast: { spine: 0.39, arm: 0.66, torsoLean: -0.08 },
  },
} as const;

const R = CHARACTER.ratios;
const H = CHARACTER.H;

/** Derived, named anchors (all scene units, computed from ratios × H). */
export const CHAR_DIM = {
  headHeight: R.headHeight * H,
  headWidth: R.headWidth * H,
  headDepth: R.headDepth * H,
  neckHeight: R.neckHeight * H,
  hairHeight: R.hairHeight * H,
  shoulderWidth: R.shoulderWidth * H,
  torsoHeight: R.torsoHeight * H,
  hipWidth: R.hipWidth * H,
  pelvisRise: R.pelvisRise * H,
  legLength: R.legLength * H,
  armLength: R.armLength * H,
  handHeight: R.handHeight * H,
  footLength: R.footLength * H,
  thigh: R.thigh * H,
  shin: R.shin * H,
  ankle: R.ankle * H,
  upperArm: R.upperArm * H,
  forearm: R.forearm * H,
  deltoid: R.deltoid * H,
  /** Hip pivot (legs) measured from the feet. */
  hipY: R.legLength * H,
  /** Spine group origin (hip + pelvis rise). */
  spineY: (R.legLength + R.pelvisRise) * H,
  /** Shoulder pivot height. */
  shoulderY: (R.legLength + R.pelvisRise + R.torsoHeight) * H,
  /** Head group origin relative to the spine group. */
  headLocalY: (R.torsoHeight + R.neckHeight * 0.5) * H,
  /** Eye line relative to the head group origin. */
  eyeLocalY: R.headHeight * 0.44,
  eyeLocalX: R.headWidth * 0.34,
  eyeLocalZ: -R.headDepth * 0.44,
  /** Foot/ankle pivot relative to the knee group. */
  footOffsetY: -(R.shin * H),
  kneeOffsetY: -(R.thigh * H),
  /** Elbow pivot relative to the shoulder. */
  elbowOffsetY: -(R.upperArm * H),
  /** Wrist (hand group) relative to the elbow. */
  wristOffsetY: -(R.forearm * H),
} as const;

export const SEAT_ANCHORS = {
  desk: {
    spineY: CHARACTER.seats.desk.spine * H,
    armY: CHARACTER.seats.desk.arm * H,
    lean: CHARACTER.seats.desk.torsoLean,
  },
  gaming: {
    spineY: CHARACTER.seats.gaming.spine * H,
    armY: CHARACTER.seats.gaming.arm * H,
    lean: CHARACTER.seats.gaming.torsoLean,
  },
  sofa: {
    spineY: CHARACTER.seats.sofa.spine * H,
    armY: CHARACTER.seats.sofa.arm * H,
    lean: CHARACTER.seats.sofa.torsoLean,
  },
  podcast: {
    spineY: CHARACTER.seats.podcast.spine * H,
    armY: CHARACTER.seats.podcast.arm * H,
    lean: CHARACTER.seats.podcast.torsoLean,
  },
} as const;

/** Character preview toggles (dev-only route `?character=preview`). */
export const CHARACTER_PREVIEW = {
  queryKey: 'character',
  queryValue: 'preview',
  turntableSpeed: 0.25,
  reportDir: 'char-reports',
} as const;

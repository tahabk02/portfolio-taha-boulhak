import { ROOM_BOUNDS } from './colliders';
import { WORLD_SCALE } from './scale';

export type CeilingPreset = 'work' | 'gaming' | 'creative' | 'chill' | 'off';
export type CeilingColorTheme = 'emerald' | 'warm' | 'ice';

export const ENABLE_CEILING_V2 = true;

export const CEILING = {
  room: {
    width: WORLD_SCALE.roomWidth,
    depth: ROOM_BOUNDS.maxZ - ROOM_BOUNDS.minZ,
    centerZ: (ROOM_BOUNDS.minZ + ROOM_BOUNDS.maxZ) / 2,
    minZ: ROOM_BOUNDS.minZ,
    maxZ: ROOM_BOUNDS.maxZ,
    inset: 0.2,
  },
  cove: { inset: 0.34, thickness: 0.035, railDepth: 0.055, glowOpacity: 0.12, washWidth: 0.92, railHeight: 0.2 },
  featureCenterX: 0,
  pendant: { radius: 1.12, tube: 0.035, height: 0.43, lightHeight: 0.62, lightRange: 5.4, lightPower: 1.2 },
  hex: { radius: 0.25, tileHeight: 0.055, count: 13, height: 0.32, rowRise: 0.025, scale: [0.82, 0.9] as const, layout: [[-1.12, -0.72], [-0.56, -0.72], [0, -0.72], [0.56, -0.72], [1.12, -0.72], [-0.84, 0], [-0.28, 0], [0.28, 0], [0.84, 0], [-1.12, 0.72], [-0.56, 0.72], [0, 0.72], [0.56, 0.72]] as const },
  track: {
    railX: [-5.75, 2.9] as const, length: 7.4, railWidth: 0.075, railThickness: 0.055,
    headRadius: 0.11, headLength: 0.15, headBottomScale: 0.7, lensScale: 0.72, height: 0.24,
    coneTopRadius: 0.055, coneBottomRadius: 0.42, coneLength: 1.28, coneCenterOffset: 0.78, coneLengthScale: 1.35,
    deskSpotPower: 1.35, deskSpotRange: 5.6, deskSpotAngle: 0.52, deskSpotPenumbra: 0.72, deskSpotDecay: 1.8,
    fixtures: [
      { rail: 0, z: -2.6, targetX: -8, targetZ: 0.35 }, { rail: 0, z: -0.9, targetX: -7.3, targetZ: 3.7 }, { rail: 0, z: 0.9, targetX: -1.8, targetZ: 0.4 },
      { rail: 1, z: -2.6, targetX: 0, targetZ: -0.3 }, { rail: 1, z: -0.7, targetX: 6, targetZ: 3.5 }, { rail: 1, z: 1.2, targetX: 6.8, targetZ: 4.2 },
    ] as const,
  },
  baffles: { count: 13, spacing: 0.22, length: 2.7, width: 0.075, thickness: 0.07, x: -8.05, z: 0.2, height: 0.13 },
  switch: { x: -9.91, y: 1.38, z: 4.72, width: 0.36, height: 0.25, depth: 0.045, buttonRadius: 0.072 },
  starField: { x: 4.2, z: 7.14, width: 4.5, depth: 1.8, count: 18, radius: 0.018 },
  lights: {
    transitionSeconds: 0.45,
    nightAmbient: 0.11,
    ambientNormal: 1.05,
    work: { brightness: 0.82, ambient: 1.05, cove: 0.34, hex: 0.42, spots: 0.62, pendant: 0.52 },
    gaming: { brightness: 0.62, ambient: 0.42, cove: 0.74, hex: 0.52, spots: 0.18, pendant: 0.4 },
    creative: { brightness: 0.78, ambient: 0.78, cove: 0.3, hex: 0.34, spots: 0.78, pendant: 0.36 },
    chill: { brightness: 0.4, ambient: 0.36, cove: 0.46, hex: 0.22, spots: 0.12, pendant: 0.25 },
    off: { brightness: 0, ambient: 0.11, cove: 0, hex: 0, spots: 0, pendant: 0 },
  },
  colors: {
    emerald: { main: '#3fd08f', warm: '#f4e7ca', cyan: '#56d9e8', magenta: '#e45aa8' },
    warm: { main: '#f0cf94', warm: '#fff0d4', cyan: '#6fc7bd', magenta: '#dc72a4' },
    ice: { main: '#79d9e8', warm: '#d9f5f3', cyan: '#68c8ff', magenta: '#bb83e8' },
  },
  hardware: { darkMetal: '#101916', coveBase: '#15271f', panelBase: '#18231e', wood: '#60432c', woodEmissive: '#21180d', star: '#e5f5dc', markOpacity: 0.62 },
  animation: { reducedMotionHz: 0, normalHz: 24, pulseSeconds: 4.8, coveLoopSeconds: 20 },
} as const;

import { ROOM_BOUNDS } from './colliders';
import { WORLD_SCALE } from './scale';

export type CeilingPreset = 'work' | 'gaming' | 'creative' | 'chill' | 'off';
export type CeilingColorTheme = 'emerald' | 'warm' | 'ice';

export const ENABLE_CEILING_V2 = true;

export const CEILING = {
  room: {
    width: WORLD_SCALE.roomWidth,
    depth: WORLD_SCALE.roomDepth,
    centerZ: 2.2,
    minZ: ROOM_BOUNDS.minZ,
    maxZ: ROOM_BOUNDS.maxZ,
    inset: 0.2,
  },
  cove: { inset: 0.34, thickness: 0.035, glowOpacity: 0.12, waveSeconds: 20 },
  pendant: { radius: 1.12, tube: 0.035, height: 0.43 },
  hex: { radius: 0.25, count: 13, spacing: 0.56, height: 0.32 },
  track: { offsetX: 2.9, length: 7.4, headRadius: 0.11, height: 0.24 },
  baffles: { count: 13, spacing: 0.22, length: 2.7, width: 0.075, depth: 0.045 },
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
  animation: { reducedMotionHz: 0, normalHz: 24, pulseSeconds: 4.8 },
} as const;

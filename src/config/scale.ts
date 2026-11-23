/** World measurements in metres. Furniture source dimensions are documented beside each transform. */
export const WORLD_SCALE = {
  floorY: -1.42,
  roomWidth: 20,
  roomDepth: 18,
  roomHeight: 2.8,
} as const;

export const SCALE = {
  characterHeight: 1.75,
  movement: { walkSpeed: 1.6, runSpeed: 3.5, acceleration: 10, turnRate: 10, capsuleRadius: 0.3 },
  thirdPersonCamera: { height: 1.6, distance: 3, minDistance: 1.8, maxDistance: 5 },
  desk: {
    width: 2.4,
    height: 0.75,
    depth: 1.05,
    source: { width: 4.95, height: 1.388, depth: 2.65 },
    transform: { x: 2.4 / 4.95, y: 0.75 / 1.388, z: 1.05 / 2.65 },
  },
  laptop: {
    width: 0.32,
    closedHeight: 0.02,
    screenHeight: 0.21,
    source: { width: 2.38, depth: 1.64, screenHeight: 1.58 },
    transform: {
      x: 0.32 / (2.38 * (1.7 / 4.95)),
      y: 0.21 / (1.58 * (0.75 / 1.388)),
      z: 0.22 / (1.64 * (0.82 / 2.65)),
    },
  },
  officeChair: { seatHeight: 0.46, seatWidth: 0.5, seatDepth: 0.5, totalHeight: 1.05 },
  bed: {
    width: 1.6,
    depth: 2,
    mattressTop: 0.5,
    headboardHeight: 1,
    source: { width: 2.65, depth: 3.35, mattressTop: 0.63, headboardHeight: 1.12 },
    transform: { x: 1.6 / 2.65, y: 0.5 / 0.63, z: 2 / 3.35 },
  },
  television: { width: 1.45, height: 0.82, centerHeight: 1.45 },
  deskMonitor: { width: 0.72, height: 0.42 },
  rug: { width: 2.4, depth: 1.7 },
  door: { width: 0.9, height: 2.05 },
  gamingDesk: {
    width: 1.9,
    height: 0.75,
    depth: 0.9,
    source: { width: 2.65, height: 0.845, depth: 1.16 },
    transform: { x: 1.9 / 2.65, y: 0.75 / 0.845, z: 0.9 / 1.16 },
  },
} as const;

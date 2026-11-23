import { SCALE, WORLD_SCALE } from './scale';

/**
 * Static room colliders, expressed in the room's own units.
 * Values mirror the original hand-authored blocking boxes so the walkable
 * layout and feel stay identical; the radius is added by the resolver.
 */
export interface RoomCollider {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const ROOM_BOUNDS = {
  minX: -9.15,
  maxX: 9.18,
  /** Invisible wall plane behind the desk (z = -2.02 in the old blocker). */
  minZ: -2.02,
  maxZ: 9.3,
} as const;

export const COLLISION = {
  radius: SCALE.movement.capsuleRadius,
  /** The old blocker sampled at 72% of the capsule radius. */
  radiusScale: 0.72,
  /** Penetration resolution step when the avatar starts inside a collider. */
  pushOutStep: 0.04,
  /** Maximum distance the push-out fallback will move the avatar in one frame. */
  maxPushOut: 1.2,
  /** Keep camera and avatar slightly off the wall planes. */
  wallMargin: 0.28,
} as const;

export const ROOM_COLLIDERS: RoomCollider[] = [
  { id: 'desk', minX: -1.28, maxX: 1.28, minZ: -2.36, maxZ: -1.18 },
  { id: 'office-chair', minX: -0.62, maxX: 0.62, minZ: -1.25, maxZ: 0.02 },
  { id: 'bed', minX: 6.75, maxX: 8.45, minZ: 6.15, maxZ: 8.25 },
  { id: 'bed-nightstand', minX: 6.22, maxX: 6.82, minZ: 6.25, maxZ: 6.82 },
  { id: 'gaming-desk', minX: 5.12, maxX: 7.18, minZ: -0.58, maxZ: 0.38 },
  { id: 'gaming-chair', minX: 5.52, maxX: 6.78, minZ: 0.25, maxZ: 1.42 },
  { id: 'podcast-seat-left', minX: -9.38, maxX: -8.3, minZ: -0.18, maxZ: 0.88 },
  { id: 'podcast-seat-right', minX: -7.82, maxX: -6.72, minZ: -0.18, maxZ: 0.88 },
  { id: 'podcast-table', minX: -8.82, maxX: -7.28, minZ: 0.65, maxZ: 2.16 },
  { id: 'mini-gym', minX: -8.28, maxX: -6.32, minZ: 2.78, maxZ: 4.73 },
  { id: 'sofa', minX: 5.58, maxX: 6.85, minZ: 2.0, maxZ: 5.0 },
  { id: 'coffee-table', minX: 7.02, maxX: 7.94, minZ: 2.78, maxZ: 4.26 },
  { id: 'media-console', minX: 8.68, maxX: WORLD_SCALE.roomWidth, minZ: 2.12, maxZ: 4.98 },
];

/** Camera-specific clamps derived from the room shell. */
export const CAMERA_LIMITS = {
  minX: ROOM_BOUNDS.minX + COLLISION.wallMargin,
  maxX: ROOM_BOUNDS.maxX - COLLISION.wallMargin,
  minZ: ROOM_BOUNDS.minZ + COLLISION.wallMargin,
  maxZ: ROOM_BOUNDS.maxZ - COLLISION.wallMargin,
  minY: WORLD_SCALE.floorY + 0.42,
  maxY: WORLD_SCALE.floorY + WORLD_SCALE.roomHeight - 0.18,
  obstructionMargin: 0.18,
  minObstructedDistance: 1.0,
  /** Head height used as the camera ray origin (relative to avatar root). */
  headOffset: SCALE.thirdPersonCamera.height,
} as const;

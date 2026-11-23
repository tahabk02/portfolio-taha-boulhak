import {
  COLLISION,
  ROOM_BOUNDS,
  type RoomCollider,
} from '../config/colliders';

export interface PlanarPoint {
  x: number;
  z: number;
}

export interface ResolvedMove extends PlanarPoint {
  blockedX: boolean;
  blockedZ: boolean;
  pushedOut: boolean;
}

function inflatedHit(x: number, z: number, radius: number, collider: RoomCollider): boolean {
  return (
    x > collider.minX - radius &&
    x < collider.maxX + radius &&
    z > collider.minZ - radius &&
    z < collider.maxZ + radius
  );
}

/** True when the capsule centre is inside any inflated collider. */
export function isBlocked(
  x: number,
  z: number,
  radius: number,
  colliders: RoomCollider[]
): boolean {
  for (const collider of colliders) {
    if (inflatedHit(x, z, radius, collider)) return true;
  }
  return false;
}

function clampToRoom(x: number, z: number, radius: number): PlanarPoint {
  return {
    x: Math.min(ROOM_BOUNDS.maxX - radius, Math.max(ROOM_BOUNDS.minX + radius, x)),
    z: Math.min(ROOM_BOUNDS.maxZ - radius, Math.max(ROOM_BOUNDS.minZ + radius, z)),
  };
}

/**
 * Pushes the avatar out of a collider if it was trapped (spawn overlap,
 * teleport, resize, stale seat). Returns the same point when already free.
 */
export function pushOutOfColliders(
  point: PlanarPoint,
  radius: number,
  colliders: RoomCollider[],
  step = COLLISION.pushOutStep,
  maxPush = COLLISION.maxPushOut
): { point: PlanarPoint; pushed: boolean } {
  let { x, z } = point;
  for (const collider of colliders) {
    if (!inflatedHit(x, z, radius, collider)) continue;
    const left = x - (collider.minX - radius);
    const right = collider.maxX + radius - x;
    const back = z - (collider.minZ - radius);
    const front = collider.maxZ + radius - z;
    const smallest = Math.min(left, right, back, front);
    if (smallest > maxPush) continue;
    if (smallest === left) x = collider.minX - radius - step;
    else if (smallest === right) x = collider.maxX + radius + step;
    else if (smallest === back) z = collider.minZ - radius - step;
    else z = collider.maxZ + radius + step;
    const clamped = clampToRoom(x, z, radius);
    x = clamped.x;
    z = clamped.z;
    return { point: { x, z }, pushed: true };
  }
  return { point, pushed: false };
}

/**
 * Axis-separated capsule-vs-AABB move. Blocked axes are cancelled so the
 * avatar slides along obstacles instead of stopping dead, then the capsule is
 * clamped to the room shell.
 */
export function resolvePlanarMove(
  point: PlanarPoint,
  delta: PlanarPoint,
  radius: number,
  colliders: RoomCollider[]
): ResolvedMove {
  const start = clampToRoom(point.x, point.z, radius);
  const startFree = pushOutOfColliders(start, radius, colliders);
  let x = startFree.point.x;
  let z = startFree.point.z;

  const targetX = x + delta.x;
  const blockedX = isBlocked(targetX, z, radius, colliders);
  if (!blockedX) x = targetX;

  const targetZ = z + delta.z;
  const blockedZ = isBlocked(x, targetZ, radius, colliders);
  if (!blockedZ) z = targetZ;

  const clamped = clampToRoom(x, z, radius);
  return {
    x: clamped.x,
    z: clamped.z,
    blockedX,
    blockedZ,
    pushedOut: startFree.pushed,
  };
}

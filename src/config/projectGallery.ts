import { ROOM_BOUNDS } from './colliders';
import { WORLD_SCALE } from './scale';

/** The room's far-end wall gallery, kept separate from the desk/work wall. */
export const PROJECT_GALLERY = {
  panelWidth: WORLD_SCALE.roomWidth * 0.46,
  panelHeight: WORLD_SCALE.roomHeight * 0.86,
  /** Keep the frame flush with the inside face of the far wall. */
  panelInset: 0.07,
  panelDepth: 0.07,
  canvasWidth: 1800,
  canvasHeight: 500,
  cameraBackOffset: WORLD_SCALE.roomDepth * 0.32,
  cameraHeightAboveFloor: WORLD_SCALE.roomHeight * 0.58,
  cameraTargetHeightAboveFloor: WORLD_SCALE.roomHeight * 0.5,
  get wallZ() {
    return ROOM_BOUNDS.maxZ - this.panelInset;
  },
} as const;

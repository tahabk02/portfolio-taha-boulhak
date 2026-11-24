import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CHARACTER, CHAR_DIM, SEAT_ANCHORS } from '../config/character';

export type SeatKey = 'desk' | 'gaming' | 'sofa' | 'podcast';

export interface CharacterSeatAnchor {
  spineY: number;
  armY: number;
}

export interface CharacterAnchors {
  standSpineY: number;
  standArmY: number;
  seat: Record<SeatKey, CharacterSeatAnchor>;
  eyeBaseX: number;
  eyeBaseY: number;
  mouthClosedScaleY: number;
}

export interface PlayerAvatar {
  root: THREE.Group;
  arms: THREE.Group[];
  elbows: THREE.Group[];
  legs: THREE.Group[];
  knees: THREE.Group[];
  head: THREE.Group;
  torso: THREE.Mesh;
  spine: THREE.Group;
  eyes: THREE.Object3D[];
  mouth: THREE.Object3D;
  anchors: CharacterAnchors;
  updateSecondary?: (now: number, dt: number, speed: number) => void;
  dispose: () => void;
}

const H = CHARACTER.H;
const C = CHARACTER.colors;

const seatArm = (spineY: number) => spineY + CHAR_DIM.torsoHeight * 0.94;

export const LEGACY_ANCHORS: CharacterAnchors = {
  standSpineY: 0.72,
  standArmY: 1.22,
  seat: {
    desk: { spineY: 0.38, armY: 1.08 },
    gaming: { spineY: 0.4, armY: 1.08 },
    sofa: { spineY: 0.55, armY: 1.05 },
    podcast: { spineY: 0.55, armY: 1.05 },
  },
  eyeBaseX: 0.072,
  eyeBaseY: 0.16,
  mouthClosedScaleY: 0.22,
};

export const V2_ANCHORS: CharacterAnchors = {
  standSpineY: CHAR_DIM.spineY,
  standArmY: CHAR_DIM.shoulderY,
  seat: {
    desk: { spineY: SEAT_ANCHORS.desk.spineY, armY: seatArm(SEAT_ANCHORS.desk.spineY) },
    gaming: { spineY: SEAT_ANCHORS.gaming.spineY, armY: seatArm(SEAT_ANCHORS.gaming.spineY) },
    sofa: { spineY: SEAT_ANCHORS.sofa.spineY, armY: seatArm(SEAT_ANCHORS.sofa.spineY) },
    podcast: { spineY: SEAT_ANCHORS.podcast.spineY, armY: seatArm(SEAT_ANCHORS.podcast.spineY) },
  },
  eyeBaseX: CHAR_DIM.eyeLocalX,
  eyeBaseY: CHAR_DIM.eyeLocalY,
  mouthClosedScaleY: 0.22,
};

export interface CharacterV2Options {
  lowQuality?: boolean;
}

function prep(geometry: THREE.BufferGeometry, hex: string) {
  const next = geometry.index ? geometry.toNonIndexed() : geometry;
  if (next !== geometry) geometry.dispose();
  const color = new THREE.Color(hex);
  const count = next.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const offset = i * 3;
    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
  }
  next.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return next;
}

function part(
  geometry: THREE.BufferGeometry,
  hex: string,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1]
) {
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(position[0], position[1], position[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2])),
    new THREE.Vector3(scale[0], scale[1], scale[2])
  );
  geometry.applyMatrix4(matrix);
  return prep(geometry, hex);
}

function mergeMesh(
  geometries: THREE.BufferGeometry[],
  material: THREE.Material,
  name?: string
) {
  const merged = mergeGeometries(geometries, false) ?? new THREE.BufferGeometry();
  for (const geometry of geometries) geometry.dispose();
  const mesh = new THREE.Mesh(merged, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (name) mesh.name = name;
  return mesh;
}

function createMaterials() {
  const list: THREE.Material[] = [];
  const track = <T extends THREE.Material>(material: T) => (list.push(material), material);

  const skin = track(new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.58, metalness: 0, clearcoat: 0.08, clearcoatRoughness: 0.7,
  }));
  const hair = track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0 }));
  const cloth = track(new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.85, metalness: 0,
    sheen: 0.18, sheenRoughness: 0.9, sheenColor: new THREE.Color('#4a514c'),
  }));
  const shoe = track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.68, metalness: 0 }));
  const metal = track(new THREE.MeshStandardMaterial({ color: new THREE.Color(C.metal), metalness: 0.9, roughness: 0.24 }));
  const lens = track(new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(C.lens), transparent: true, opacity: 0.16, roughness: 0.06,
    metalness: 0.1, transmission: 0, depthWrite: false, side: THREE.DoubleSide,
  }));
  return { skin, hair, cloth, shoe, metal, lens, list };
}

function buildTorso(materials: ReturnType<typeof createMaterials>) {
  const R = CHARACTER.ratios;
  const shape = CHARACTER.shape;
  const shoulderHalf = (R.shoulderWidth * H) / 2;
  const hipHalf = (R.hipWidth * H) / 2;
  const waist = hipHalf * shape.waistPinch;
  const chest = shoulderHalf * 0.9;
  const torsoHeight = CHAR_DIM.torsoHeight;

  const profile: THREE.Vector2[] = [
    new THREE.Vector2(hipHalf * 0.94, 0),
    new THREE.Vector2(hipHalf, torsoHeight * 0.06),
    new THREE.Vector2(waist * 1.08, torsoHeight * 0.2),
    new THREE.Vector2(waist, torsoHeight * 0.34),
    new THREE.Vector2(chest * 0.78, torsoHeight * 0.52),
    new THREE.Vector2(chest, torsoHeight * 0.7),
    new THREE.Vector2(shoulderHalf, torsoHeight * 0.9),
    new THREE.Vector2(shoulderHalf * 0.84, torsoHeight),
  ];

  const pieces: THREE.BufferGeometry[] = [];
  pieces.push(part(
    new THREE.LatheGeometry(profile, 28),
    C.hoodie,
    [0, 0, 0],
    [0, 0, 0],
    [1, 1, shape.torsoZScale]
  ));

  pieces.push(part(
    new THREE.SphereGeometry(hipHalf * 1.02, 16, 12),
    C.hoodie,
    [0, torsoHeight * 0.02, 0],
    [0, 0, 0],
    [1, 0.7, shape.torsoZScale]
  ));

  for (const side of [-1, 1]) {
    pieces.push(part(
      new THREE.SphereGeometry(shoulderHalf * 0.36, 12, 10),
      C.hoodie,
      [side * shoulderHalf * 0.78, torsoHeight * 0.975, 0],
      [0, 0, side * -0.2],
      [1.1, 0.85, 0.95]
    ));
  }

  pieces.push(part(
    new THREE.TorusGeometry(shoulderHalf * 0.62, 0.012, 6, 22),
    C.hoodieHighlight,
    [0, torsoHeight * 0.995, 0.012],
    [Math.PI / 2, 0, 0],
    [1, 1, shape.torsoZScale]
  ));

  pieces.push(part(
    new THREE.TorusGeometry(hipHalf * 0.98, 0.018, 6, 24),
    C.hoodieHighlight,
    [0, -CHAR_DIM.pelvisRise * 0.75, 0],
    [Math.PI / 2, 0, 0],
    [1, 1, shape.torsoZScale]
  ));

  const torso = mergeMesh(pieces, materials.cloth, 'avatar-hoodie');

  const hoodPieces: THREE.BufferGeometry[] = [];
  hoodPieces.push(part(
    new THREE.SphereGeometry(shoulderHalf * 0.74, 16, 12),
    C.hoodieHighlight,
    [0, torsoHeight - 0.005, 0.03],
    [0.18, 0, 0],
    [1.02, 0.62, 0.86]
  ));
  const hood = mergeMesh(hoodPieces, materials.cloth, 'avatar-hoodie-hood');
  torso.add(hood);

  return { torso, shoulderHalf, hipHalf, torsoHeight };
}

function buildLegs(materials: ReturnType<typeof createMaterials>) {
  const R = CHARACTER.ratios;
  const shape = CHARACTER.shape;
  const hipX = (R.hipWidth * H) / 2;
  const thighLength = CHAR_DIM.thigh;
  const shinLength = CHAR_DIM.shin;
  const thighRadius = hipX * 0.5 * shape.legThickness;
  const shinRadius = thighRadius * 0.82;
  const legs: THREE.Group[] = [];
  const knees: THREE.Group[] = [];

  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.name = `avatar-leg-${side}`;
    leg.position.set(side * hipX, CHAR_DIM.hipY, 0);

    const thigh = mergeMesh([
      part(new THREE.CapsuleGeometry(thighRadius, thighLength - thighRadius * 2, 5, 12), C.pants, [0, -thighLength / 2, 0], [0, 0, 0], [1, 1, 0.9]),
    ], materials.cloth, `avatar-thigh-${side}`);
    leg.add(thigh);

    const knee = new THREE.Group();
    knee.name = `avatar-knee-${side}`;
    knee.position.y = -thighLength;
    leg.add(knee);
    knees.push(knee);

    const shin = mergeMesh([
      part(new THREE.CapsuleGeometry(shinRadius, shinLength - shinRadius * 2, 5, 12), C.pants, [0, -shinLength / 2, 0], [0, 0, 0], [1, 1, 0.92]),
      part(new THREE.TorusGeometry(shinRadius * 0.9, 0.008, 5, 16), C.pantsHighlight, [0, -shinLength * 0.94, 0], [Math.PI / 2, 0, 0]),
    ], materials.cloth, `avatar-shin-${side}`);
    knee.add(shin);

    const foot = new THREE.Group();
    foot.name = `avatar-foot-${side}`;
    foot.position.set(0, -shinLength, -0.02);
    knee.add(foot);

    const soleLength = CHAR_DIM.footLength;
    const shoeWidth = hipX * 2 * shape.shoeWidth * 0.34;
    const shoe = mergeMesh([
      part(new RoundedBoxGeometry(shoeWidth, 0.03, soleLength, 3, 0.012), C.sole, [0, 0.015, -soleLength * 0.16]),
      part(new RoundedBoxGeometry(shoeWidth * 0.92, 0.075, soleLength * 0.9, 4, 0.03), C.shoe, [0, 0.062, -soleLength * 0.14]),
      part(new THREE.SphereGeometry(shoeWidth * 0.5, 12, 8), C.shoe, [0, 0.06, -soleLength * 0.56], [0, 0, 0], [1, 0.55, 0.6]),
    ], materials.shoe, `avatar-shoe-${side}`);
    foot.add(shoe);

    legs.push(leg);
  }

  return { legs, knees };
}

function buildArms(materials: ReturnType<typeof createMaterials>, shoulderHalf: number) {
  const R = CHARACTER.ratios;
  const shape = CHARACTER.shape;
  const upperLength = CHAR_DIM.upperArm;
  const foreLength = CHAR_DIM.forearm;
  const upperRadius = shoulderHalf * 0.27 * shape.armThickness;
  const foreRadius = upperRadius * 0.84;
  const arms: THREE.Group[] = [];
  const elbows: THREE.Group[] = [];

  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.name = `avatar-arm-${side}`;
    arm.position.set(side * shoulderHalf, CHAR_DIM.shoulderY, 0);
    arm.rotation.z = side * 0.08;

    arm.add(mergeMesh([
      part(new THREE.SphereGeometry(upperRadius * 1.18, 12, 10), C.hoodie, [0, 0, 0]),
      part(new THREE.CapsuleGeometry(upperRadius, upperLength - upperRadius * 2, 5, 12), C.hoodie, [0, -upperLength / 2, 0]),
      part(new THREE.TorusGeometry(upperRadius * 0.98, 0.008, 5, 16), C.hoodieStitch, [0, -upperLength * 0.06, 0], [Math.PI / 2, 0, 0]),
    ], materials.cloth, `avatar-upper-arm-${side}`));

    const elbow = new THREE.Group();
    elbow.name = `avatar-elbow-${side}`;
    elbow.position.y = -upperLength;
    arm.add(elbow);
    elbows.push(elbow);

    const handLength = CHAR_DIM.handHeight;
    elbow.add(mergeMesh([
      part(new THREE.CapsuleGeometry(foreRadius, foreLength - foreRadius * 2, 5, 12), C.hoodie, [0, -foreLength / 2, 0]),
      part(new THREE.CylinderGeometry(foreRadius * 1.04, foreRadius * 0.98, foreLength * 0.22, 14), C.hoodieHighlight, [0, -foreLength * 0.9, 0]),
      part(new THREE.SphereGeometry(foreRadius * 0.96, 10, 8), C.skin, [0, -foreLength - handLength * 0.28, -0.004], [0, 0, 0], [0.92, 1.25, 0.78]),
    ], materials.cloth, `avatar-forearm-${side}`));

    arms.push(arm);
  }

  return { arms, elbows };
}

function buildHead(materials: ReturnType<typeof createMaterials>) {
  const head = new THREE.Group();
  head.name = 'avatar-head';
  head.position.set(0, CHAR_DIM.headLocalY, 0);

  const face = mergeMesh([
    part(new THREE.SphereGeometry(1, 20, 16), C.skin, [0, CHAR_DIM.headHeight * 0.5, 0], [0, 0, 0],
      [CHAR_DIM.headWidth * 0.5, CHAR_DIM.headHeight * 0.5, CHAR_DIM.headDepth * 0.5]),
  ], materials.skin, 'avatar-face');
  head.add(face);

  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), materials.skin);
  const mouthColors = new Float32Array(mouth.geometry.attributes.position.count * 3);
  const lipColor = new THREE.Color(C.lip);
  for (let i = 0; i < mouthColors.length; i += 3) {
    mouthColors[i] = lipColor.r; mouthColors[i + 1] = lipColor.g; mouthColors[i + 2] = lipColor.b;
  }
  mouth.geometry.setAttribute('color', new THREE.BufferAttribute(mouthColors, 3));
  mouth.scale.set(1, V2_ANCHORS.mouthClosedScaleY, 0.7);
  mouth.position.set(0, CHAR_DIM.eyeLocalY - CHAR_DIM.headHeight * 0.34, -CHAR_DIM.headDepth * 0.46);
  head.add(mouth);

  return { head, mouth };
}

export function createPlayerAvatarV2(options: CharacterV2Options = {}): PlayerAvatar {
  const lowQuality = Boolean(options.lowQuality);
  const materials = createMaterials();
  const geometries: THREE.BufferGeometry[] = [];
  const textures: THREE.Texture[] = [];
  const track = <T extends THREE.BufferGeometry>(geometry: T) => (geometries.push(geometry), geometry);
  const trackTexture = <T extends THREE.Texture>(texture: T) => (textures.push(texture), texture);

  const root = new THREE.Group();
  root.name = 'avatar-v2';

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext('2d');
  if (shadowContext) {
    const gradient = shadowContext.createRadialGradient(64, 64, 4, 64, 64, 60);
    gradient.addColorStop(0, 'rgba(0,0,0,.26)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    shadowContext.fillStyle = gradient;
    shadowContext.fillRect(0, 0, 128, 128);
  }
  const shadowTexture = trackTexture(new THREE.CanvasTexture(shadowCanvas));
  shadowTexture.colorSpace = THREE.SRGBColorSpace;
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false });
  materials.list.push(shadowMaterial);
  const contactShadow = new THREE.Mesh(track(new THREE.PlaneGeometry(CHAR_DIM.shoulderWidth * 1.7, CHAR_DIM.footLength * 1.9)), shadowMaterial);
  contactShadow.name = 'avatar-contact-shadow';
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.012;
  root.add(contactShadow);

  const spine = new THREE.Group();
  spine.name = 'avatar-spine';
  spine.position.y = V2_ANCHORS.standSpineY;
  root.add(spine);

  const torsoParts = buildTorso(materials);
  spine.add(torsoParts.torso);

  const neck = mergeMesh([
    part(new THREE.CylinderGeometry(CHAR_DIM.headWidth * 0.27, CHAR_DIM.headWidth * 0.32, CHAR_DIM.neckHeight, 14), C.skin,
      [0, torsoParts.torsoHeight + CHAR_DIM.neckHeight * 0.5, 0]),
  ], materials.skin, 'avatar-neck');
  spine.add(neck);

  const { head, mouth } = buildHead(materials);
  spine.add(head);

  const { legs, knees } = buildLegs(materials);
  for (const leg of legs) root.add(leg);

  const { arms, elbows } = buildArms(materials, torsoParts.shoulderHalf);
  for (const arm of arms) root.add(arm);

  const eyes: THREE.Object3D[] = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.name = `avatar-eye-${side}`;
    eye.position.set(side * V2_ANCHORS.eyeBaseX, V2_ANCHORS.eyeBaseY, -CHAR_DIM.headDepth * 0.42);
    eye.scale.set(1, 1.4, 1);
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(CHAR_DIM.headWidth * 0.13, 10, 8), materials.skin);
    const eyeColors = new Float32Array(sclera.geometry.attributes.position.count * 3);
    const scleraColor = new THREE.Color(C.sclera);
    for (let i = 0; i < eyeColors.length; i += 3) {
      eyeColors[i] = scleraColor.r; eyeColors[i + 1] = scleraColor.g; eyeColors[i + 2] = scleraColor.b;
    }
    sclera.geometry.setAttribute('color', new THREE.BufferAttribute(eyeColors, 3));
    sclera.scale.set(1, 0.62, 0.45);
    track(sclera.geometry);
    eye.add(sclera);
    eyes.push(eye);
    head.add(eye);
  }

  torsoParts.torso.scale.y = 1;

  return {
    root,
    arms,
    elbows,
    legs,
    knees,
    head,
    torso: torsoParts.torso,
    spine,
    eyes,
    mouth,
    anchors: V2_ANCHORS,
    dispose: () => {
      geometries.forEach((geometry) => geometry.dispose());
      textures.forEach((texture) => texture.dispose());
      materials.list.forEach((material) => material.dispose());
    },
  };
}

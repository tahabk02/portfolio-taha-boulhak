import * as THREE from 'three';
import { CEILING, ENABLE_CEILING_V2 } from '../config/ceiling';
import { WORLD_SCALE } from '../config/scale';

export interface CeilingTracker {
  geo: <T extends THREE.BufferGeometry>(geometry: T) => T;
  mat: <T extends THREE.Material>(material: T) => T;
}

const noShadow = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) { child.castShadow = false; child.receiveShadow = false; }
  });
};

/** Static signature lighting architecture. All repeated fittings are instanced. */
export function buildCeilingV2(root: THREE.Group, track: CeilingTracker, floorY: number) {
  if (!ENABLE_CEILING_V2) return null;
  const group = new THREE.Group();
  group.name = 'ceilingV2';
  group.userData.featureFlag = 'ENABLE_CEILING_V2';
  root.add(group);

  const top = floorY + WORLD_SCALE.roomHeight - CEILING.room.inset;
  const width = CEILING.room.width - CEILING.cove.inset * 2;
  const depth = CEILING.room.depth - CEILING.cove.inset * 2;
  const centerZ = CEILING.room.centerZ;
  const darkMetal = track.mat(new THREE.MeshStandardMaterial({ color: 0x101916, metalness: 0.66, roughness: 0.31 }));
  const coveMat = track.mat(new THREE.MeshStandardMaterial({ color: 0x15271f, emissive: 0x3fd08f, emissiveIntensity: 0.7, roughness: 0.64 }));
  const panelMat = track.mat(new THREE.MeshStandardMaterial({ color: 0x18231e, emissive: 0x3fd08f, emissiveIntensity: 0.52, roughness: 0.72 }));
  const ringMat = track.mat(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf4e7ca, emissiveIntensity: 0.72, roughness: 0.26, metalness: 0.16 }));
  const lensMat = track.mat(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0d4, emissiveIntensity: 0.86, roughness: 0.2 }));
  const woodMat = track.mat(new THREE.MeshStandardMaterial({ color: 0x60432c, roughness: 0.64, metalness: 0.03, emissive: 0x21180d, emissiveIntensity: 0.18 }));
  const glowMat = track.mat(new THREE.MeshBasicMaterial({ color: 0x3fd08f, transparent: true, opacity: CEILING.cove.glowOpacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));

  const railGeo = track.geo(new THREE.BoxGeometry(1, CEILING.cove.thickness, 0.055));
  const perimeter = new THREE.InstancedMesh(railGeo, coveMat, 4);
  perimeter.name = 'ceiling-cove-led-perimeter';
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  const setInstance = (mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, sx: number, sy = 1, sz = 1, rotationY = 0) => {
    position.set(x, y, z); scale.set(sx, sy, sz); quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);
    matrix.compose(position, quat, scale); mesh.setMatrixAt(index, matrix);
  };
  setInstance(perimeter, 0, 0, top, centerZ - depth / 2, width);
  setInstance(perimeter, 1, 0, top, centerZ + depth / 2, width);
  setInstance(perimeter, 2, -width / 2, top, centerZ, depth, 1, 1, Math.PI / 2);
  setInstance(perimeter, 3, width / 2, top, centerZ, depth, 1, 1, Math.PI / 2);
  perimeter.instanceMatrix.needsUpdate = true; perimeter.frustumCulled = false; group.add(perimeter);

  const glowGeo = track.geo(new THREE.PlaneGeometry(1, 1));
  glowGeo.rotateX(-Math.PI / 2);
  const coveGlow = new THREE.InstancedMesh(glowGeo, glowMat, 4);
  coveGlow.name = 'ceiling-cove-soft-wash';
  const glowPlane = (i: number, x: number, z: number, sx: number, sz: number, rot = 0) => {
    setInstance(coveGlow, i, x, top - 0.018, z, sx, sz, 1, rot);
    coveGlow.setColorAt(i, new THREE.Color(0x3fd08f));
  };
  glowPlane(0, 0, centerZ - depth / 2 + 0.46, width, 0.9);
  glowPlane(1, 0, centerZ + depth / 2 - 0.46, width, 0.9);
  glowPlane(2, -width / 2 + 0.46, centerZ, depth, 0.9, Math.PI / 2);
  glowPlane(3, width / 2 - 0.46, centerZ, depth, 0.9, Math.PI / 2);
  coveGlow.instanceMatrix.needsUpdate = true; coveGlow.frustumCulled = false; group.add(coveGlow);

  const pendant = new THREE.Group(); pendant.name = 'ceiling-pendant-feature'; pendant.position.set(0, top - CEILING.pendant.height, centerZ); group.add(pendant);
  const ring = new THREE.Mesh(track.geo(new THREE.TorusGeometry(CEILING.pendant.radius, CEILING.pendant.tube, 8, 72)), ringMat);
  ring.name = 'ceiling-pendant-ring'; ring.rotation.x = Math.PI / 2; noShadow(ring); pendant.add(ring);

  const hexGeo = track.geo(new THREE.CylinderGeometry(CEILING.hex.radius, CEILING.hex.radius, 0.055, 6));
  const hexes = new THREE.InstancedMesh(hexGeo, panelMat, CEILING.hex.count);
  hexes.name = 'ceiling-hex-light-cluster'; hexes.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  const hexCoords: Array<[number, number]> = [[-1.12, -0.72], [-0.56, -0.72], [0, -0.72], [0.56, -0.72], [1.12, -0.72], [-0.84, 0], [-0.28, 0], [0.28, 0], [0.84, 0], [-1.12, 0.72], [-0.56, 0.72], [0, 0.72], [0.56, 0.72]];
  hexCoords.forEach(([x, z], i) => {
    position.set(x, top - CEILING.hex.height - (i % 3) * 0.025, centerZ + z); scale.setScalar(0.82 + (i % 2) * 0.08);
    quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6); matrix.compose(position, quat, scale); hexes.setMatrixAt(i, matrix);
  });
  hexes.instanceMatrix.needsUpdate = true; hexes.frustumCulled = false; group.add(hexes);

  const trackRailGeo = track.geo(new THREE.BoxGeometry(0.075, 0.055, CEILING.track.length));
  const tracks = new THREE.InstancedMesh(trackRailGeo, darkMetal, 2);
  tracks.name = 'ceiling-black-track-rails';
  setInstance(tracks, 0, -CEILING.track.offsetX, top - 0.08, centerZ, 1);
  setInstance(tracks, 1, CEILING.track.offsetX, top - 0.08, centerZ, 1);
  tracks.instanceMatrix.needsUpdate = true; group.add(tracks);

  const headGeo = track.geo(new THREE.CylinderGeometry(CEILING.track.headRadius, CEILING.track.headRadius * 0.7, 0.15, 16));
  const heads = new THREE.InstancedMesh(headGeo, darkMetal, 6);
  heads.name = 'ceiling-track-spot-heads';
  const lensGeo = track.geo(new THREE.CircleGeometry(CEILING.track.headRadius * 0.72, 16));
  const lenses = new THREE.InstancedMesh(lensGeo, lensMat, 6);
  lenses.name = 'ceiling-track-spot-lenses';
  for (let i = 0; i < 6; i++) {
    const x = i < 3 ? -CEILING.track.offsetX : CEILING.track.offsetX;
    const z = centerZ - 2.45 + (i % 3) * 2.45;
    setInstance(heads, i, x, top - CEILING.track.height, z, 1);
    position.set(x, top - CEILING.track.height - 0.078, z); quat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0)); scale.setScalar(1); matrix.compose(position, quat, scale); lenses.setMatrixAt(i, matrix);
  }
  heads.instanceMatrix.needsUpdate = true; lenses.instanceMatrix.needsUpdate = true; group.add(heads, lenses);

  // Warm walnut acoustic baffles suspended above the podcast recording zone.
  const baffleGeo = track.geo(new THREE.BoxGeometry(CEILING.baffles.width, 0.07, CEILING.baffles.length));
  const baffles = new THREE.InstancedMesh(baffleGeo, woodMat, CEILING.baffles.count);
  baffles.name = 'ceiling-podcast-acoustic-baffles';
  for (let i = 0; i < CEILING.baffles.count; i++) {
    setInstance(baffles, i, -8.05 - ((CEILING.baffles.count - 1) * CEILING.baffles.spacing) / 2 + i * CEILING.baffles.spacing, top - 0.13, 0.2, 1);
  }
  baffles.instanceMatrix.needsUpdate = true; group.add(baffles);

  // A discreet syntax mark and paintbrush line-art sit near the perimeter, clear of displays.
  const markMat = track.mat(new THREE.LineBasicMaterial({ color: 0x3fd08f, transparent: true, opacity: 0.62 }));
  const makeLine = (name: string, points: THREE.Vector3[], x: number, y: number, z: number) => {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), markMat);
    track.geo(line.geometry); line.name = name; line.position.set(x, y, z); line.frustumCulled = false; group.add(line);
  };
  const iconY = top - 0.028;
  makeLine('ceiling-code-braces', [new THREE.Vector3(-0.18, 0, -0.2), new THREE.Vector3(-0.32, 0, -0.1), new THREE.Vector3(-0.32, 0, 0.1), new THREE.Vector3(-0.18, 0, 0.2), new THREE.Vector3(0.18, 0, -0.2), new THREE.Vector3(0.32, 0, -0.1), new THREE.Vector3(0.32, 0, 0.1), new THREE.Vector3(0.18, 0, 0.2)], -4.6, iconY, centerZ - 3.2);
  makeLine('ceiling-pencil-outline', [new THREE.Vector3(-0.28, 0, 0.12), new THREE.Vector3(0.22, 0, -0.13), new THREE.Vector3(0.3, 0, -0.26), new THREE.Vector3(-0.2, 0, -0.01), new THREE.Vector3(-0.28, 0, 0.12)], 4.5, iconY, centerZ + 3.1);

  const starGeo = track.geo(new THREE.SphereGeometry(0.018, 6, 5));
  const starMat = track.mat(new THREE.MeshBasicMaterial({ color: 0xe5f5dc }));
  const stars = new THREE.InstancedMesh(starGeo, starMat, 18);
  stars.name = 'ceiling-gaming-fiber-stars';
  for (let i = 0; i < 18; i++) {
    const x = 4.2 + ((i * 17) % 45) / 10;
    const z = centerZ + 3.5 + ((i * 13) % 18) / 10;
    position.set(x, top - 0.055, z); scale.setScalar(0.8 + (i % 4) * 0.2); matrix.compose(position, quat, scale); stars.setMatrixAt(i, matrix);
  }
  stars.instanceMatrix.needsUpdate = true; group.add(stars);

  // Near-door physical toggle plate. StudioScene connects its hit target to the light store.
  const switchPlate = new THREE.Group(); switchPlate.name = 'ceiling-switch-panel'; switchPlate.userData.ceilingLightSwitch = true;
  switchPlate.position.set(-9.83, floorY + 1.38, 4.72); switchPlate.rotation.y = Math.PI / 2; group.add(switchPlate);
  const switchBody = new THREE.Mesh(track.geo(new THREE.BoxGeometry(0.36, 0.25, 0.045)), darkMetal);
  switchBody.name = 'ceiling-switch-body'; switchBody.userData.ceilingLightSwitch = true; switchPlate.add(switchBody);
  const switchButton = new THREE.Mesh(track.geo(new THREE.CircleGeometry(0.072, 24)), track.mat(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x3fd08f, emissiveIntensity: 0.6, roughness: 0.25 })));
  switchButton.name = 'ceiling-switch-button'; switchButton.userData.ceilingLightSwitch = true; switchButton.position.set(0, 0, 0.027); switchPlate.add(switchButton);
  noShadow(group);

  return { group, ring, perimeter, coveGlow, hexes, heads, lenses, glowMat, panelMat, ringMat, lensMat, coveMat, switchButton };
}

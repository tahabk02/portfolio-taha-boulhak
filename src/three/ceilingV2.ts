import * as THREE from 'three';
import { CEILING, ENABLE_CEILING_V2 } from '../config/ceiling';
import { WORLD_SCALE } from '../config/scale';
import type { CeilingLightingState } from '../lib/ceilingLighting';

export interface CeilingTracker {
  geo: <T extends THREE.BufferGeometry>(geometry: T) => T;
  mat: <T extends THREE.Material>(material: T) => T;
}

export interface CeilingRoomLights {
  hemisphere: THREE.HemisphereLight;
  key: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
  accents: THREE.PointLight[];
}

export interface CeilingRig {
  group: THREE.Group;
  switchButton: THREE.Mesh;
  tick: (dt: number, now: number, state: CeilingLightingState, lowEnd: boolean, reducedMotion: boolean, roomLights: CeilingRoomLights) => boolean;
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
  const darkMetal = track.mat(new THREE.MeshStandardMaterial({ color: CEILING.hardware.darkMetal, metalness: 0.66, roughness: 0.31 }));
  const coveMat = track.mat(new THREE.MeshStandardMaterial({ color: CEILING.hardware.coveBase, emissive: 0x3fd08f, emissiveIntensity: 0.7, roughness: 0.64 }));
  const panelMat = track.mat(new THREE.MeshStandardMaterial({ color: CEILING.hardware.panelBase, emissive: 0x3fd08f, emissiveIntensity: 0.52, roughness: 0.72 }));
  const ringMat = track.mat(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf4e7ca, emissiveIntensity: 0.72, roughness: 0.26, metalness: 0.16 }));
  const lensMat = track.mat(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0d4, emissiveIntensity: 0.86, roughness: 0.2 }));
  const woodMat = track.mat(new THREE.MeshStandardMaterial({ color: CEILING.hardware.wood, roughness: 0.64, metalness: 0.03, emissive: CEILING.hardware.woodEmissive, emissiveIntensity: 0.18 }));
  const glowMat = track.mat(new THREE.MeshBasicMaterial({ color: 0x3fd08f, transparent: true, opacity: CEILING.cove.glowOpacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));

  const railGeo = track.geo(new THREE.BoxGeometry(1, CEILING.cove.thickness, CEILING.cove.railDepth));
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
  setInstance(perimeter, 0, CEILING.featureCenterX, top, centerZ - depth / 2, width);
  setInstance(perimeter, 1, CEILING.featureCenterX, top, centerZ + depth / 2, width);
  setInstance(perimeter, 2, -width / 2, top, centerZ, depth, 1, 1, Math.PI / 2);
  setInstance(perimeter, 3, width / 2, top, centerZ, depth, 1, 1, Math.PI / 2);
  perimeter.instanceMatrix.needsUpdate = true; perimeter.frustumCulled = false; group.add(perimeter);

  const glowGeo = track.geo(new THREE.BufferGeometry());
  glowGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 0, -0.5,
    -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
  ], 3));
  glowGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1], 2));
  glowGeo.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  glowGeo.computeVertexNormals();
  const coveGlow = new THREE.InstancedMesh(glowGeo, glowMat, 4);
  coveGlow.name = 'ceiling-cove-soft-wash';
  const glowPlane = (i: number, x: number, z: number, sx: number, sz: number, rot = 0) => {
    setInstance(coveGlow, i, x, top - 0.018, z, sx, 0.52, sz, rot);
    coveGlow.setColorAt(i, new THREE.Color(0x3fd08f));
  };
  glowPlane(0, CEILING.featureCenterX, centerZ - depth / 2 + CEILING.cove.washWidth / 2, width, CEILING.cove.washWidth);
  glowPlane(1, CEILING.featureCenterX, centerZ + depth / 2 - CEILING.cove.washWidth / 2, width, CEILING.cove.washWidth);
  glowPlane(2, -width / 2 + CEILING.cove.washWidth / 2, centerZ, depth, CEILING.cove.washWidth, Math.PI / 2);
  glowPlane(3, width / 2 - CEILING.cove.washWidth / 2, centerZ, depth, CEILING.cove.washWidth, Math.PI / 2);
  coveGlow.instanceMatrix.needsUpdate = true; coveGlow.frustumCulled = false; group.add(coveGlow);

  const pendant = new THREE.Group(); pendant.name = 'ceiling-pendant-feature'; pendant.position.set(CEILING.featureCenterX, top - CEILING.pendant.height, centerZ); group.add(pendant);
  const ring = new THREE.Mesh(track.geo(new THREE.TorusGeometry(CEILING.pendant.radius, CEILING.pendant.tube, 8, 72)), ringMat);
  ring.name = 'ceiling-pendant-ring'; ring.rotation.x = Math.PI / 2; noShadow(ring); pendant.add(ring);

  const hexGeo = track.geo(new THREE.CylinderGeometry(CEILING.hex.radius, CEILING.hex.radius, CEILING.hex.tileHeight, 6));
  const hexes = new THREE.InstancedMesh(hexGeo, panelMat, CEILING.hex.count);
  hexes.name = 'ceiling-hex-light-cluster'; hexes.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  const hexCoords = CEILING.hex.layout;
  hexCoords.forEach(([x, z], i) => {
    position.set(CEILING.featureCenterX + x, top - CEILING.hex.height - (i % 3) * CEILING.hex.rowRise, centerZ + z); scale.setScalar(CEILING.hex.scale[i % 2]);
    quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6); matrix.compose(position, quat, scale); hexes.setMatrixAt(i, matrix);
    hexes.setColorAt(i, new THREE.Color(0x3fd08f));
  });
  hexes.instanceMatrix.needsUpdate = true; hexes.frustumCulled = false; group.add(hexes);

  const trackRailGeo = track.geo(new THREE.BoxGeometry(CEILING.track.railWidth, CEILING.track.railThickness, CEILING.track.length));
  const tracks = new THREE.InstancedMesh(trackRailGeo, darkMetal, CEILING.track.railX.length);
  tracks.name = 'ceiling-black-track-rails';
  CEILING.track.railX.forEach((x, i) => setInstance(tracks, i, x, top - 0.08, centerZ, 1));
  tracks.instanceMatrix.needsUpdate = true; group.add(tracks);

  const headGeo = track.geo(new THREE.CylinderGeometry(CEILING.track.headRadius, CEILING.track.headRadius * CEILING.track.headBottomScale, CEILING.track.headLength, 16));
  const heads = new THREE.InstancedMesh(headGeo, darkMetal, CEILING.track.fixtures.length);
  heads.name = 'ceiling-track-spot-heads';
  const lensGeo = track.geo(new THREE.CircleGeometry(CEILING.track.headRadius * CEILING.track.lensScale, 16));
  const lenses = new THREE.InstancedMesh(lensGeo, lensMat, CEILING.track.fixtures.length);
  lenses.name = 'ceiling-track-spot-lenses';
  const downAxis = new THREE.Vector3(0, -1, 0); const faceAxis = new THREE.Vector3(0, 0, 1);
  const beamDirection = new THREE.Vector3(); const beamTarget = new THREE.Vector3();
  for (let i = 0; i < CEILING.track.fixtures.length; i++) {
    const fixture = CEILING.track.fixtures[i];
    const x = CEILING.track.railX[fixture.rail]; const z = centerZ + fixture.z;
    position.set(x, top - CEILING.track.height, z);
    beamTarget.set(fixture.targetX, floorY + 0.72, fixture.targetZ);
    beamDirection.copy(beamTarget).sub(position).normalize();
    quat.setFromUnitVectors(downAxis, beamDirection); scale.setScalar(1); matrix.compose(position, quat, scale); heads.setMatrixAt(i, matrix);
    position.addScaledVector(beamDirection, 0.09); quat.setFromUnitVectors(faceAxis, beamDirection); matrix.compose(position, quat, scale); lenses.setMatrixAt(i, matrix);
  }
  heads.instanceMatrix.needsUpdate = true; lenses.instanceMatrix.needsUpdate = true; group.add(heads, lenses);

  const coneMat = track.mat(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { uColor: { value: new THREE.Color(0xf4e7ca) }, uOpacity: { value: 0.065 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; void main(){ float edge=1.0-smoothstep(0.72,1.0,abs(vUv.x-0.5)*2.0); float fade=smoothstep(0.0,0.16,vUv.y)*(1.0-smoothstep(0.78,1.0,vUv.y)); gl_FragColor=vec4(uColor,uOpacity*edge*fade); }',
  }));
  const coneGeo = track.geo(new THREE.CylinderGeometry(CEILING.track.coneTopRadius, CEILING.track.coneBottomRadius, CEILING.track.coneLength, 16, 4, true));
  const cones = new THREE.InstancedMesh(coneGeo, coneMat, CEILING.track.fixtures.length);
  cones.name = 'ceiling-track-soft-light-cones';
  for (let i = 0; i < CEILING.track.fixtures.length; i++) {
    const fixture = CEILING.track.fixtures[i];
    const x = CEILING.track.railX[fixture.rail]; const z = centerZ + fixture.z;
    position.set(x, top - CEILING.track.height, z);
    beamTarget.set(fixture.targetX, floorY + 0.72, fixture.targetZ);
    beamDirection.copy(beamTarget).sub(position).normalize();
    quat.setFromUnitVectors(downAxis, beamDirection);
    position.addScaledVector(beamDirection, CEILING.track.coneCenterOffset); scale.set(1, CEILING.track.coneLengthScale, 1); matrix.compose(position, quat, scale); cones.setMatrixAt(i, matrix);
  }
  cones.instanceMatrix.needsUpdate = true; cones.frustumCulled = false; group.add(cones);

  // Two shadow-free practical ceiling lights stay within the scene's three-light budget.
  const pendantLight = new THREE.PointLight(0xf4e7ca, 0, CEILING.pendant.lightRange, 2);
  pendantLight.name = 'ceiling-pendant-practical-light'; pendantLight.position.set(0, top - 0.62, centerZ); group.add(pendantLight);
  const deskSpot = new THREE.SpotLight(0xfff0d4, 0, CEILING.track.deskSpotRange, CEILING.track.deskSpotAngle, CEILING.track.deskSpotPenumbra, CEILING.track.deskSpotDecay);
  deskSpot.name = 'ceiling-desk-focus-spot'; deskSpot.position.set(0, top - 0.42, -0.45);
  deskSpot.target.position.set(0, floorY + 0.72, -0.22); group.add(deskSpot, deskSpot.target);

  // Warm walnut acoustic baffles suspended above the podcast recording zone.
  const baffleGeo = track.geo(new THREE.BoxGeometry(CEILING.baffles.width, CEILING.baffles.thickness, CEILING.baffles.length));
  const baffles = new THREE.InstancedMesh(baffleGeo, woodMat, CEILING.baffles.count);
  baffles.name = 'ceiling-podcast-acoustic-baffles';
  for (let i = 0; i < CEILING.baffles.count; i++) {
    setInstance(baffles, i, CEILING.baffles.x - ((CEILING.baffles.count - 1) * CEILING.baffles.spacing) / 2 + i * CEILING.baffles.spacing, top - CEILING.baffles.height, CEILING.baffles.z, 1);
  }
  baffles.instanceMatrix.needsUpdate = true; group.add(baffles);

  // A discreet syntax mark and paintbrush line-art sit near the perimeter, clear of displays.
  const markMat = track.mat(new THREE.LineBasicMaterial({ color: CEILING.colors.emerald.main, transparent: true, opacity: CEILING.hardware.markOpacity }));
  const makeLine = (name: string, points: THREE.Vector3[], x: number, y: number, z: number) => {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), markMat);
    track.geo(line.geometry); line.name = name; line.position.set(x, y, z); line.frustumCulled = false; group.add(line);
  };
  const iconY = top - 0.028;
  makeLine('ceiling-code-braces', [new THREE.Vector3(-0.18, 0, -0.2), new THREE.Vector3(-0.32, 0, -0.1), new THREE.Vector3(-0.32, 0, 0.1), new THREE.Vector3(-0.18, 0, 0.2), new THREE.Vector3(0.18, 0, -0.2), new THREE.Vector3(0.32, 0, -0.1), new THREE.Vector3(0.32, 0, 0.1), new THREE.Vector3(0.18, 0, 0.2)], -4.6, iconY, centerZ - 3.2);
  makeLine('ceiling-pencil-outline', [new THREE.Vector3(-0.28, 0, 0.12), new THREE.Vector3(0.22, 0, -0.13), new THREE.Vector3(0.3, 0, -0.26), new THREE.Vector3(-0.2, 0, -0.01), new THREE.Vector3(-0.28, 0, 0.12)], 4.5, iconY, centerZ + 3.1);

  const starGeo = track.geo(new THREE.SphereGeometry(CEILING.starField.radius, 6, 5));
  const starMat = track.mat(new THREE.MeshBasicMaterial({ color: CEILING.hardware.star }));
  const stars = new THREE.InstancedMesh(starGeo, starMat, CEILING.starField.count);
  stars.name = 'ceiling-gaming-fiber-stars';
  for (let i = 0; i < CEILING.starField.count; i++) {
    const x = CEILING.starField.x + ((i * 17) % (CEILING.starField.width * 10)) / 10;
    const z = CEILING.starField.z + ((i * 13) % (CEILING.starField.depth * 10)) / 10;
    position.set(x, top - 0.055, z); scale.setScalar(0.8 + (i % 4) * 0.2); matrix.compose(position, quat, scale); stars.setMatrixAt(i, matrix);
  }
  stars.instanceMatrix.needsUpdate = true; group.add(stars);

  // Near-door physical toggle plate. StudioScene connects its hit target to the light store.
  const switchPlate = new THREE.Group(); switchPlate.name = 'ceiling-switch-panel'; switchPlate.userData.ceilingLightSwitch = true;
  switchPlate.position.set(CEILING.switch.x, floorY + CEILING.switch.y, CEILING.switch.z); switchPlate.rotation.y = Math.PI / 2; group.add(switchPlate);
  const switchBody = new THREE.Mesh(track.geo(new THREE.BoxGeometry(CEILING.switch.width, CEILING.switch.height, CEILING.switch.depth)), darkMetal);
  switchBody.name = 'ceiling-switch-body'; switchBody.userData.ceilingLightSwitch = true; switchPlate.add(switchBody);
  const switchButton = new THREE.Mesh(track.geo(new THREE.CircleGeometry(CEILING.switch.buttonRadius, 24)), track.mat(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: CEILING.colors.emerald.main, emissiveIntensity: 0.6, roughness: 0.25 })));
  switchButton.name = 'ceiling-switch-button'; switchButton.userData.ceilingLightSwitch = true; switchButton.position.set(0, 0, 0.027); switchPlate.add(switchButton);
  noShadow(group);

  const mix = { cove: 0, hex: 0, spots: 0, pendant: 0, ambient: 0.11 };
  const themeMain = new THREE.Color(); const themeAccent = new THREE.Color(); const waveColor = new THREE.Color();
  let lastTheme: CeilingLightingState['colorTheme'] | null = null;
  let lastPreset: CeilingLightingState['preset'] | null = null;
  const tick = (dt: number, now: number, state: CeilingLightingState, lowEnd: boolean, reducedMotion: boolean, roomLights: CeilingRoomLights) => {
    const preset = state.enabled ? CEILING.lights[state.preset] : CEILING.lights.off;
    const brightness = state.enabled ? state.brightness : 0;
    const targetCove = preset.cove * brightness * Number(state.zones.cove);
    const targetHex = preset.hex * brightness * Number(state.zones.hexPanels);
    const targetSpots = preset.spots * brightness * Number(state.zones.trackSpots);
    const targetPendant = preset.pendant * brightness * Number(state.zones.pendantRing);
    const targetAmbient = state.enabled ? CEILING.lights.nightAmbient + (preset.ambient - CEILING.lights.nightAmbient) * brightness : CEILING.lights.nightAmbient;
    const alpha = 1 - Math.exp(-dt / CEILING.lights.transitionSeconds);
    mix.cove += (targetCove - mix.cove) * alpha; mix.hex += (targetHex - mix.hex) * alpha;
    mix.spots += (targetSpots - mix.spots) * alpha; mix.pendant += (targetPendant - mix.pendant) * alpha;
    mix.ambient += (targetAmbient - mix.ambient) * alpha;

    const theme = CEILING.colors[state.colorTheme];
    if (lastTheme !== state.colorTheme || lastPreset !== state.preset) {
      lastTheme = state.colorTheme; lastPreset = state.preset;
      themeMain.set(theme.main);
      themeAccent.set(state.preset === 'gaming' ? theme.magenta : state.preset === 'creative' ? theme.warm : theme.cyan);
      coveMat.emissive.copy(themeMain); panelMat.emissive.copy(themeMain); ringMat.emissive.set(theme.warm); lensMat.emissive.set(theme.warm);
      glowMat.color.copy(themeMain); (coneMat.uniforms.uColor.value as THREE.Color).copy(themeAccent);
      pendantLight.color.copy(themeMain); deskSpot.color.set(theme.warm); switchButton.material instanceof THREE.MeshStandardMaterial && switchButton.material.emissive.copy(themeMain);
      if (hexes.instanceColor) {
        for (let i = 0; i < CEILING.hex.count; i++) {
          waveColor.copy(i % 4 === 0 ? themeAccent : themeMain);
          hexes.instanceColor.setXYZ(i, waveColor.r, waveColor.g, waveColor.b);
        }
        hexes.instanceColor.needsUpdate = true;
      }
    }
    coveMat.emissiveIntensity = mix.cove;
    panelMat.emissiveIntensity = mix.hex;
    ringMat.emissiveIntensity = mix.pendant;
    lensMat.emissiveIntensity = mix.spots;
    (coneMat.uniforms.uOpacity as { value: number }).value = lowEnd ? 0 : 0.065 * mix.spots;
    glowMat.opacity = lowEnd ? 0 : CEILING.cove.glowOpacity * mix.cove;
    coveGlow.visible = !lowEnd; cones.visible = !lowEnd;
    pendantLight.intensity = lowEnd ? 0 : 1.2 * mix.pendant;
    deskSpot.intensity = lowEnd ? 0 : 1.35 * mix.spots;
    roomLights.hemisphere.intensity = mix.ambient;
    roomLights.key.intensity = 2.35 * mix.ambient;
    roomLights.rim.intensity = 1.18 * mix.ambient;
    roomLights.accents[0].intensity = 2.2 * mix.ambient;
    roomLights.accents[1].intensity = 1.1 * mix.ambient;
    roomLights.accents[2].intensity = 0.9 * mix.ambient;
    roomLights.accents[3].intensity = 0.75 * mix.ambient;
    if (switchButton.material instanceof THREE.MeshStandardMaterial) switchButton.material.emissiveIntensity = switchButton.userData.hovered ? 1.4 : state.enabled ? 0.85 : 0.1;

    const isTransitioning = Math.abs(targetCove - mix.cove) > 0.006 || Math.abs(targetHex - mix.hex) > 0.006 || Math.abs(targetSpots - mix.spots) > 0.006 || Math.abs(targetPendant - mix.pendant) > 0.006 || Math.abs(targetAmbient - mix.ambient) > 0.006;
    const animate = !lowEnd && !reducedMotion && state.enabled && (mix.cove > 0.01 || mix.hex > 0.01);
    if (animate) {
      const phase = now / 1000 * Math.PI * 2 / CEILING.animation.coveLoopSeconds;
      const coveWave = 0.88 + 0.12 * Math.sin(phase);
      coveMat.emissiveIntensity = mix.cove * coveWave;
      coveMat.emissive.copy(themeMain).lerp(themeAccent, 0.08 + 0.06 * Math.sin(phase));
      glowMat.color.copy(coveMat.emissive);
      const instanceColor = hexes.instanceColor;
      if (instanceColor) {
        for (let i = 0; i < CEILING.hex.count; i++) {
          const wave = 0.76 + 0.24 * (0.5 + 0.5 * Math.sin(now / 1000 * Math.PI * 2 / CEILING.animation.pulseSeconds - i * 0.52));
          waveColor.copy(i % 4 === 0 ? themeAccent : themeMain).multiplyScalar(wave);
          instanceColor.setXYZ(i, waveColor.r, waveColor.g, waveColor.b);
        }
        instanceColor.needsUpdate = true;
      }
    }
    return isTransitioning || animate;
  };

  return { group, switchButton, tick } satisfies CeilingRig;
}

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  createSkillTabletTexture,
  createStudioSignTexture,
  createStudioParquetMaps,
  type TabletScreenType,
} from './screenPainter';
import { SCALE, WORLD_SCALE } from '../config/scale';
import { TARGET_WALL } from '../config/layout';

interface Tracker {
  geo: <T extends THREE.BufferGeometry>(g: T) => T;
  mat: <T extends THREE.Material>(m: T) => T;
  tex: <T extends THREE.Texture>(t: T) => T;
}

function createRoundedShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.min(radius, hw, hh);
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return shape;
}

function createFrameMoldShape(outerW: number, outerH: number, innerW: number, innerH: number): THREE.Shape {
  const shape = createRoundedShape(outerW, outerH, 0.024);
  const hole = new THREE.Path();
  const hw = innerW / 2;
  const hh = innerH / 2;
  hole.moveTo(-hw, -hh);
  hole.lineTo(hw, -hh);
  hole.lineTo(hw, hh);
  hole.lineTo(-hw, hh);
  hole.closePath();
  shape.holes.push(hole);
  return shape;
}

/**
 * Builds the architectural studio room: smoked-oak parquet floor, emerald plaster back wall,
 * walnut acoustic wall slats (InstancedMesh), and three illuminated wall-mounted skill tablets.
 */
export function buildStudioRoomAndArt(
  root: THREE.Group,
  track: Tracker,
  walnutMat: THREE.Material,
  darkSteelMat: THREE.Material,
  brassMat: THREE.Material,
  maxAnisotropy: number,
  floorY: number
) {
  // 1. Architectural Smoked-Oak Parquet Studio Floor
  const parquetMaps = createStudioParquetMaps(maxAnisotropy);
  track.tex(parquetMaps.map);

  const floorMat = track.mat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: parquetMaps.map,
      roughness: 0.72,
      metalness: 0.04,
      envMapIntensity: 0.38,
    })
  );
  const floorMesh = new THREE.Mesh(track.geo(new THREE.PlaneGeometry(WORLD_SCALE.roomWidth, WORLD_SCALE.roomDepth)), floorMat);
  floorMesh.name = 'room-floor';
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(0, floorY, 2.2);
  floorMesh.receiveShadow = false;
  root.add(floorMesh);

  // Subtle woven dark wool area rug grounded cleanly beneath the desk & chair zone
  const workRugWidth = 3.1;
  const workRugDepth = 2.8;
  const rugShape = createRoundedShape(workRugWidth, workRugDepth, 0.14);
  const rugGeo = track.geo(
    new THREE.ExtrudeGeometry(rugShape, {
      depth: 0.014,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.008,
      bevelSegments: 2,
    })
  );
  rugGeo.rotateX(-Math.PI / 2);
  const rugMat = track.mat(
    new THREE.MeshStandardMaterial({
      color: 0x16241d,
      roughness: 0.96,
      metalness: 0.0,
    })
  );
  const studioRug = new THREE.Mesh(rugGeo, rugMat);
  studioRug.name = 'rug';
  studioRug.position.set(0.15, floorY + 0.002, -1.15);
  root.add(studioRug);

  // 2. Architectural Back Gallery Wall (z = -2.48)
  const wallZ = -2.48;
  const wallH = WORLD_SCALE.roomHeight;
  const wallMat = track.mat(
    new THREE.MeshStandardMaterial({
      color: 0x183d2c,
      roughness: 0.92,
      metalness: 0.02,
      envMapIntensity: 0.35,
    })
  );
  const backWall = new THREE.Mesh(track.geo(new THREE.PlaneGeometry(WORLD_SCALE.roomWidth, wallH)), wallMat);
  backWall.position.set(0, floorY + wallH / 2, wallZ);
  backWall.receiveShadow = true;
  root.add(backWall);

  const ceilingMat = track.mat(new THREE.MeshStandardMaterial({ color: 0x12271e, roughness: 0.96, side: THREE.DoubleSide }));
  const ceiling = new THREE.Mesh(track.geo(new THREE.PlaneGeometry(WORLD_SCALE.roomWidth, WORLD_SCALE.roomDepth)), ceilingMat);
  ceiling.rotation.x = -Math.PI / 2;
  ceiling.position.set(0, floorY + WORLD_SCALE.roomHeight, 2.2);
  root.add(ceiling);

  const doorway = new THREE.Group();
  doorway.name = 'doorway';
  const doorX = -WORLD_SCALE.roomWidth / 2 + 0.1;
  const doorZ = 6.2;
  const doorWallMat = track.mat(new THREE.MeshStandardMaterial({ color: 0x173829, roughness: 0.92 }));
  for (const [index, [centerZ, length]] of [[-0.75, 11.5], [8.8, 4.8]].entries()) {
    const wallSegment = new THREE.Mesh(track.geo(new THREE.BoxGeometry(0.12, WORLD_SCALE.roomHeight, length)), doorWallMat);
    wallSegment.name = `room-left-wall-segment-${index + 1}`;
    wallSegment.position.set(-WORLD_SCALE.roomWidth / 2, floorY + WORLD_SCALE.roomHeight / 2, centerZ);
    root.add(wallSegment);
  }
  const doorFrameMat = track.mat(new THREE.MeshStandardMaterial({ color: 0x3a2b1d, roughness: 0.78 }));
  const door = new THREE.Mesh(track.geo(new THREE.BoxGeometry(0.07, SCALE.door.height, SCALE.door.width)), doorFrameMat);
  door.name = 'door';
  door.position.set(doorX, floorY + SCALE.door.height / 2, doorZ);
  doorway.add(door);
  for (const z of [-SCALE.door.width / 2 - 0.07, SCALE.door.width / 2 + 0.07]) {
    const post = new THREE.Mesh(track.geo(new THREE.BoxGeometry(0.16, 2.15, 0.12)), walnutMat);
    post.position.set(doorX + 0.02, floorY + 1.075, doorZ + z);
    doorway.add(post);
  }
  const lintel = new THREE.Mesh(track.geo(new THREE.BoxGeometry(0.16, 0.12, 1.08)), walnutMat);
  lintel.position.set(doorX + 0.02, floorY + 2.12, doorZ);
  doorway.add(lintel);
  const doorKnob = new THREE.Mesh(track.geo(new THREE.SphereGeometry(0.035, 12, 10)), brassMat);
  doorKnob.position.set(doorX + 0.06, floorY + 1.0, doorZ + 0.29);
  doorway.add(doorKnob);
  root.add(doorway);

  // Crisp architectural dark baseboard molding along wall bottom
  const baseboard = new THREE.Mesh(
    track.geo(new THREE.BoxGeometry(WORLD_SCALE.roomWidth, 0.14, 0.045)),
    darkSteelMat
  );
  baseboard.position.set(0, floorY + 0.07, wallZ + 0.022);
  root.add(baseboard);

  // Dark acoustic felt backing strips & Walnut Vertical Wall Slats (InstancedMesh)
  const feltBackMat = track.mat(
    new THREE.MeshStandardMaterial({ color: 0x0e1411, roughness: 0.95, metalness: 0 })
  );
  for (const bx of [-4.35, 4.35]) {
    const backing = new THREE.Mesh(track.geo(new THREE.BoxGeometry(2.6, 2.1, 0.02)), feltBackMat);
    backing.position.set(bx, floorY + 1.6, wallZ + 0.01);
    root.add(backing);
  }

  const slatGeo = track.geo(new THREE.BoxGeometry(0.056, 2.1, 0.042));
  const slatsPerSide = 22;
  const slatInst = new THREE.InstancedMesh(slatGeo, walnutMat, slatsPerSide * 2);
  const dummy = new THREE.Object3D();
  let sIdx = 0;
  for (const startX of [-5.55, 3.12]) {
    for (let i = 0; i < slatsPerSide; i++) {
      dummy.position.set(startX + i * 0.114, floorY + 1.6, wallZ + 0.036);
      dummy.updateMatrix();
      slatInst.setMatrixAt(sIdx++, dummy.matrix);
    }
  }
  slatInst.instanceMatrix.needsUpdate = true;
  slatInst.computeBoundingSphere();
  root.add(slatInst);

  // Centered acoustic slat panel behind the reference workstation.
  const centerBacking = new THREE.Mesh(track.geo(new THREE.BoxGeometry(5.9, 2.1, 0.018)), feltBackMat);
  centerBacking.position.set(0, floorY + 1.6, wallZ + 0.012);
  root.add(centerBacking);
  const centerSlats = new THREE.InstancedMesh(slatGeo, walnutMat, 51);
  for (let i = 0; i < 51; i++) {
    dummy.position.set(-2.85 + i * 0.114, floorY + 1.6, wallZ + 0.036);
    dummy.updateMatrix();
    centerSlats.setMatrixAt(i, dummy.matrix);
  }
  centerSlats.instanceMatrix.needsUpdate = true;
  centerSlats.computeBoundingSphere();
  root.add(centerSlats);

  // 3. Three real wall-mounted tablets replacing the gallery paintings.
  const tabletFrameMat = track.mat(new THREE.MeshPhysicalMaterial({
    color: 0x27332d, metalness: 0.84, roughness: 0.24, clearcoat: 0.55, clearcoatRoughness: 0.18,
  }));
  const tabletGlassMat = track.mat(new THREE.MeshPhysicalMaterial({
    color: 0xffffff, transparent: true, opacity: 0.055, depthWrite: false,
    metalness: 0.0, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04,
  }));
  const screenFor = (type: TabletScreenType) => {
    const texture = track.tex(createSkillTabletTexture(type, maxAnisotropy));
    const material = track.mat(new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
    return { texture, material };
  };
  const ledMat = track.mat(new THREE.MeshBasicMaterial({ color: 0x7fe0b0, toneMapped: false }));
  const cameraMat = track.mat(new THREE.MeshBasicMaterial({ color: 0x101713 }));

  const buildWallTablet = (opts: { type: TabletScreenType; x: number; y: number; z: number; width: number; height: number }) => {
    const group = new THREE.Group();
    group.name = 'setup-monitor';
    group.position.set(opts.x, opts.y, opts.z);
    root.add(group);

    const bodyShape = createRoundedShape(opts.width, opts.height, 0.025);
    const bodyGeo = track.geo(new THREE.ExtrudeGeometry(bodyShape, {
      depth: 0.04, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.006, bevelSegments: 2,
    }));
    const body = new THREE.Mesh(bodyGeo, tabletFrameMat);
    body.name = 'setup-monitor-frame';
    body.castShadow = true; body.receiveShadow = true; group.add(body);

    const screenW = opts.width - 0.045;
    const screenH = opts.height - 0.05;
    const display = screenFor(opts.type);
    const screen = new THREE.Mesh(track.geo(new THREE.PlaneGeometry(screenW, screenH)), display.material);
    screen.name = 'wall-tablet-screen';
    screen.userData.tabletType = opts.type;
    screen.userData.tabletPage = 0;
    screen.userData.setTabletPage = (page: number) => {
      const normalizedPage = ((page % 2) + 2) % 2;
      screen.userData.tabletPage = normalizedPage;
      display.texture.userData.setPage(normalizedPage);
    };
    if (opts.type === 'frontend') {
      const editorCanvas = document.createElement('canvas');
      editorCanvas.width = 768; editorCanvas.height = 432;
      const editorCtx = editorCanvas.getContext('2d');
      const editorTexture = track.tex(new THREE.CanvasTexture(editorCanvas));
      editorTexture.colorSpace = THREE.SRGBColorSpace;
      const editorMaterial = track.mat(new THREE.MeshBasicMaterial({ map: editorTexture, toneMapped: false }));
      const drawEditor = (value: string) => {
        if (!editorCtx) return;
        const ctx = editorCtx;
        ctx.fillStyle = '#111821'; ctx.fillRect(0, 0, 768, 432);
        ctx.fillStyle = '#202b35'; ctx.fillRect(0, 0, 768, 34);
        ctx.fillStyle = '#c7d0d8'; ctx.font = 'bold 14px Arial'; ctx.fillText('VS CODE  ·  mon-projet.ts', 18, 22);
        ctx.fillStyle = '#80dbb0'; ctx.fillRect(0, 34, 6, 398);
        ctx.fillStyle = '#202833'; ctx.fillRect(6, 34, 132, 398);
        ctx.fillStyle = '#aebbc7'; ctx.font = '13px Arial'; ctx.fillText('EXPLORER', 18, 58);
        ['▾ mon-projet', '  ▾ src', '    App.tsx', '    style.css', '  package.json'].forEach((line, i) => ctx.fillText(line, 16, 86 + i * 25));
        ctx.fillStyle = '#151c24'; ctx.fillRect(138, 34, 630, 398);
        const lines = value.slice(0, 16000).split('\n').slice(0, 18);
        ctx.font = '15px Consolas, ui-monospace, monospace';
        lines.forEach((line, i) => {
          const y = 72 + i * 19;
          ctx.fillStyle = '#778391'; ctx.fillText(String(i + 1).padStart(2, ' '), 150, y);
          ctx.fillStyle = '#d4deeb'; ctx.fillText(line.slice(0, 76), 184, y);
        });
        ctx.fillStyle = '#21382e'; ctx.fillRect(6, 414, 762, 18);
        ctx.fillStyle = '#b9edcf'; ctx.font = '11px Arial'; ctx.fillText('TypeScript  ·  UTF-8  ·  Enregistrement local', 16, 427);
        editorTexture.needsUpdate = true;
      };
      screen.userData.setDeskCode = (value: string | null) => {
        if (value === null) screen.material = display.material;
        else { drawEditor(value); screen.material = editorMaterial; }
      };
    }
    screen.position.set(0, 0, 0.047); group.add(screen);

    // Narrow clear glass overlay and a tiny centered front camera make the devices read as tablets.
    const glass = new THREE.Mesh(track.geo(new THREE.PlaneGeometry(screenW, screenH)), tabletGlassMat);
    glass.position.set(0, 0, 0.049); group.add(glass);
    const camera = new THREE.Mesh(track.geo(new THREE.CircleGeometry(0.012, 16)), cameraMat);
    camera.position.set(0, opts.height / 2 - 0.025, 0.048); group.add(camera);

    const stand = new THREE.Mesh(track.geo(new THREE.BoxGeometry(0.055, 0.14, 0.055)), tabletFrameMat);
    stand.position.set(0, -opts.height / 2 + 0.03, 0.005); group.add(stand);
    const foot = new THREE.Mesh(track.geo(new RoundedBoxGeometry(0.24, 0.02, 0.16, 3, 0.012)), tabletFrameMat);
    foot.position.set(0, -opts.height / 2 - 0.03, 0.045); group.add(foot);
  };

  const deskForMonitors = root.getObjectByName('desk');
  root.updateMatrixWorld(true);
  const desktopBounds = deskForMonitors ? new THREE.Box3().setFromObject(deskForMonitors) : null;
  const desktopCenter = desktopBounds?.getCenter(new THREE.Vector3()) ?? new THREE.Vector3();
  const monitorWidth = 1.1;
  const monitorHeight = 0.72;
  const monitorY = (desktopBounds?.max.y ?? floorY + SCALE.desk.height) + monitorHeight / 2 + 0.04;
  const monitorZ = (desktopBounds?.min.z ?? -0.41) + 0.12;
  buildWallTablet({ type: 'frontend', x: desktopCenter.x - 0.59, y: monitorY, z: monitorZ, width: monitorWidth, height: monitorHeight });
  buildWallTablet({ type: 'backend', x: desktopCenter.x + 0.59, y: monitorY, z: monitorZ, width: monitorWidth, height: monitorHeight });

  // Soft white hex panels create the geometric feature wall above the two displays.
  const hexHousing = track.mat(new THREE.MeshStandardMaterial({ color: 0x151b18, roughness: 0.42, metalness: 0.32 }));
  const hexLight = track.mat(new THREE.MeshBasicMaterial({ color: 0xfffbef, toneMapped: false }));
  const hexLayout: Array<[number, number]> = [
    [-0.38, 0.31], [0, 0.31], [0.38, 0.31],
    [-0.57, 0], [-0.19, 0], [0.19, 0], [0.57, 0],
    [-0.38, -0.31], [0, -0.31], [0.38, -0.31],
  ];
  for (const [x, y] of hexLayout) {
    const housing = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.195, 0.195, 0.045, 6)), hexHousing);
    housing.rotation.x = Math.PI / 2;
    housing.position.set(x, floorY + 1.95 + y, wallZ + 0.09);
    housing.castShadow = true;
    root.add(housing);
    const panel = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.17, 0.17, 0.012, 6)), hexLight);
    panel.rotation.x = Math.PI / 2;
    panel.position.set(x, floorY + 1.95 + y, wallZ + 0.12);
    root.add(panel);
  }

  // Desktop gaming tower with three illuminated front fans and a tempered-glass panel.
  if (desktopBounds) {
    const pcMetal = track.mat(new THREE.MeshStandardMaterial({ color: 0x171c1b, metalness: 0.52, roughness: 0.34 }));
    const pcGlass = track.mat(new THREE.MeshPhysicalMaterial({ color: 0x101917, metalness: 0.18, roughness: 0.16, clearcoat: 0.8 }));
    const pcGlow = track.mat(new THREE.MeshBasicMaterial({ color: 0xb5f4dc, toneMapped: false }));
    const pcGroup = new THREE.Group();
    pcGroup.name = 'desk-pc-tower';
    pcGroup.position.set(desktopBounds.max.x - 0.16, desktopBounds.max.y + 0.225, desktopCenter.z + 0.1);
    root.add(pcGroup);
    const pcCase = new THREE.Mesh(track.geo(new THREE.BoxGeometry(0.25, 0.45, 0.32)), pcMetal);
    pcCase.castShadow = true; pcCase.receiveShadow = true; pcGroup.add(pcCase);
    const pcFront = new THREE.Mesh(track.geo(new THREE.BoxGeometry(0.23, 0.43, 0.012)), pcGlass);
    pcFront.position.z = 0.166; pcGroup.add(pcFront);
    const fanGeometry = track.geo(new THREE.TorusGeometry(0.048, 0.005, 8, 28));
    for (const y of [-0.13, 0, 0.13]) {
      const fan = new THREE.Mesh(fanGeometry, pcGlow);
      fan.position.set(0, y, 0.176); pcGroup.add(fan);
      const hub = new THREE.Mesh(track.geo(new THREE.CircleGeometry(0.013, 16)), pcGlow);
      hub.position.set(0, y, 0.177); pcGroup.add(hub);
    }

    const deskSpeaker = new THREE.Group();
    deskSpeaker.name = 'desk-speaker';
    deskSpeaker.position.set(desktopCenter.x + 0.75, desktopBounds.max.y + 0.11, desktopCenter.z - 0.17);
    root.add(deskSpeaker);
    const speakerBody = new THREE.Mesh(track.geo(new RoundedBoxGeometry(0.11, 0.22, 0.15, 4, 0.018)), pcMetal);
    speakerBody.castShadow = true; deskSpeaker.add(speakerBody);
    for (const [y, radius] of [[-0.035, 0.036], [0.06, 0.022]] as const) {
      const driver = new THREE.Mesh(track.geo(new THREE.CircleGeometry(radius, 24)), pcGlass);
      driver.position.set(0, y, 0.076); deskSpeaker.add(driver);
    }

    // Compact mechanical keyboard; one instanced set of keys keeps the setup light to render.
    const keyboardX = desktopCenter.x;
    const keyboardZ = desktopBounds.max.z - 0.14;
    const keyboardBase = new THREE.Mesh(track.geo(new RoundedBoxGeometry(0.62, 0.025, 0.2, 4, 0.018)), pcMetal);
    keyboardBase.name = 'desk-mechanical-keyboard';
    keyboardBase.position.set(keyboardX, desktopBounds.max.y + 0.013, keyboardZ);
    keyboardBase.castShadow = true; keyboardBase.receiveShadow = true; root.add(keyboardBase);
    const keyMaterial = track.mat(new THREE.MeshStandardMaterial({ color: 0x333a37, roughness: 0.72 }));
    const keyGeometry = track.geo(new RoundedBoxGeometry(0.032, 0.009, 0.026, 2, 0.004));
    const keys = new THREE.InstancedMesh(keyGeometry, keyMaterial, 75);
    keys.name = 'desk-keycaps';
    const keyTransform = new THREE.Object3D();
    let keyIndex = 0;
    for (let row = 0; row < 5; row++) {
      for (let column = 0; column < 15; column++) {
        keyTransform.position.set((column - 7) * 0.04, desktopBounds.max.y + 0.033, keyboardZ + (row - 2) * 0.034);
        keyTransform.updateMatrix();
        keys.setMatrixAt(keyIndex, keyTransform.matrix);
        if ([31, 32, 33, 46].includes(keyIndex)) keys.setColorAt(keyIndex, new THREE.Color(0x78caa5));
        keyIndex++;
      }
    }
    keys.instanceMatrix.needsUpdate = true;
    if (keys.instanceColor) keys.instanceColor.needsUpdate = true;
    keys.castShadow = true; keys.receiveShadow = true; root.add(keys);

    // A small over-ear headset rests beside the keyboard, away from the PC tower.
    const headset = new THREE.Group();
    headset.name = 'desk-headphones';
    headset.position.set(desktopCenter.x + 0.46, desktopBounds.max.y + 0.02, desktopCenter.z - 0.015);
    root.add(headset);
    const band = new THREE.Mesh(track.geo(new THREE.TorusGeometry(0.09, 0.012, 10, 28, Math.PI)), pcMetal);
    band.position.y = 0.09; headset.add(band);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(track.geo(new RoundedBoxGeometry(0.055, 0.09, 0.045, 3, 0.012)), pcMetal);
      ear.position.set(side * 0.09, 0.015, 0); headset.add(ear);
    }

    // Second small plant balances the existing planter on the other end of the desk.
    const plantPot = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.055, 0.075, 0.14, 20)), walnutMat);
    plantPot.name = 'desk-left-planter';
    plantPot.position.set(desktopCenter.x - 0.76, desktopBounds.max.y + 0.07, desktopCenter.z - 0.29);
    plantPot.castShadow = true; root.add(plantPot);
    const leafMaterial = track.mat(new THREE.MeshStandardMaterial({ color: 0x39744b, roughness: 0.75 }));
    for (let i = 0; i < 7; i++) {
      const angle = i * Math.PI * 2 / 7;
      const leaf = new THREE.Mesh(track.geo(new THREE.SphereGeometry(0.055, 12, 10)), leafMaterial);
      leaf.name = 'desk-left-plant-leaf';
      leaf.scale.set(0.56, 1.8, 0.62);
      leaf.position.set(
        plantPot.position.x + Math.cos(angle) * 0.075,
        desktopBounds.max.y + 0.2 + (i % 3) * 0.045,
        plantPot.position.z + Math.sin(angle) * 0.06
      );
      leaf.rotation.z = Math.cos(angle) * 0.45;
      leaf.castShadow = true; root.add(leaf);
    }
  }

  // Backlit studio identity sign above the tablet wall.
  const signGroup = new THREE.Group();
  signGroup.position.set(0, floorY + 2.42, wallZ + 0.035);
  root.add(signGroup);
  signGroup.visible = false;
  const signShape = createRoundedShape(2.12, 0.53, 0.045);
  const signHousing = new THREE.Mesh(track.geo(new THREE.ExtrudeGeometry(signShape, {
    depth: 0.07, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 2,
  })), tabletFrameMat);
  signHousing.castShadow = true;
  signGroup.add(signHousing);
  const signTexture = track.tex(createStudioSignTexture(maxAnisotropy));
  const signScreen = new THREE.Mesh(track.geo(new THREE.PlaneGeometry(2.02, 0.43)), track.mat(new THREE.MeshBasicMaterial({ map: signTexture, toneMapped: false })));
  signScreen.position.z = 0.079;
  signGroup.add(signScreen);

  // Floating walnut shelves soften the acoustic slat wall and add a little studio personality.
  const shelfAccentMat = track.mat(new THREE.MeshStandardMaterial({ color: 0xd8bd85, metalness: 0.72, roughness: 0.28 }));
  const shelfLedMat = track.mat(new THREE.MeshBasicMaterial({ color: 0x80e0ad, toneMapped: false }));
  const shelfBookMats = [
    track.mat(new THREE.MeshStandardMaterial({ color: 0x285642, roughness: 0.82 })),
    track.mat(new THREE.MeshStandardMaterial({ color: 0x874b37, roughness: 0.84 })),
    track.mat(new THREE.MeshStandardMaterial({ color: 0xe2d8c4, roughness: 0.86 })),
    track.mat(new THREE.MeshStandardMaterial({ color: 0x263b4b, roughness: 0.84 })),
  ];
  const ornamentMat = track.mat(new THREE.MeshStandardMaterial({ color: 0x8bc39d, roughness: 0.36, metalness: 0.18 }));
  const shelfBookMark = track.mat(new THREE.MeshStandardMaterial({ color: 0xd9bd82, metalness: 0.6, roughness: 0.3 }));

  const buildShelf = (x: number, y: number, side: 'left' | 'right') => {
    const shelf = new THREE.Group();
    shelf.position.set(x, y, wallZ + 0.12);
    root.add(shelf);
    const back = new THREE.Mesh(track.geo(new THREE.BoxGeometry(1.48, 0.62, 0.045)), feltBackMat);
    back.position.set(0, 0.34, -0.035); shelf.add(back);
    const board = new THREE.Mesh(track.geo(new THREE.BoxGeometry(1.58, 0.085, 0.34)), walnutMat);
    board.position.set(0, 0, 0.045); board.castShadow = true; board.receiveShadow = true; shelf.add(board);
    for (const bx of [-0.52, 0.52]) {
      const bracket = new THREE.Mesh(track.geo(new THREE.BoxGeometry(0.035, 0.25, 0.035)), shelfAccentMat);
      bracket.position.set(bx, -0.095, -0.005); bracket.rotation.x = -0.42; shelf.add(bracket);
    }
    const glowStrip = new THREE.Mesh(track.geo(new THREE.BoxGeometry(1.25, 0.012, 0.018)), shelfLedMat);
    glowStrip.position.set(0, -0.052, 0.19); shelf.add(glowStrip);

    if (side === 'left') {
      const books = [0, 1, 2, 3];
      books.forEach((bookIndex, i) => {
        const width = 0.12 + (i % 2) * 0.018;
        const height = 0.27 + (i % 3) * 0.055;
        const book = new THREE.Mesh(track.geo(new THREE.BoxGeometry(width, height, 0.19)), shelfBookMats[bookIndex]);
        book.position.set(-0.52 + i * 0.15, 0.043 + height / 2, 0.025);
        book.rotation.z = i % 2 ? -0.055 : 0.025;
        book.castShadow = true; shelf.add(book);
        const spineMark = new THREE.Mesh(track.geo(new THREE.BoxGeometry(width * 0.52, 0.012, 0.004)), shelfBookMark);
        spineMark.position.set(book.position.x, book.position.y + height * 0.23, 0.123);
        spineMark.rotation.z = book.rotation.z; shelf.add(spineMark);
      });
      const orb = new THREE.Mesh(track.geo(new THREE.SphereGeometry(0.105, 22, 16)), ornamentMat);
      orb.position.set(0.42, 0.15, 0.02); orb.scale.y = 0.82; orb.castShadow = true; shelf.add(orb);
      const ring = new THREE.Mesh(track.geo(new THREE.TorusGeometry(0.13, 0.009, 8, 32)), shelfAccentMat);
      ring.position.copy(orb.position); ring.rotation.x = 0.5; ring.rotation.y = -0.35; shelf.add(ring);
    } else {
      const planterMat = track.mat(new THREE.MeshStandardMaterial({ color: 0xc5b9a4, roughness: 0.58 }));
      const planter = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.12, 0.16, 0.23, 20)), planterMat);
      planter.position.set(-0.45, 0.15, 0.015); planter.castShadow = true; shelf.add(planter);
      const plantStemMat = track.mat(new THREE.MeshStandardMaterial({ color: 0x39744b, roughness: 0.7 }));
      for (let i = 0; i < 7; i++) {
        const angle = i * 2.4;
        const leaf = new THREE.Mesh(track.geo(new THREE.SphereGeometry(0.065, 14, 10)), i % 2 ? plantStemMat : ornamentMat);
        leaf.scale.set(0.52, 1.9, 0.58);
        leaf.position.set(-0.45 + Math.cos(angle) * 0.1, 0.31 + (i % 3) * 0.07, 0.015 + Math.sin(angle) * 0.08);
        leaf.rotation.z = Math.cos(angle) * 0.55; leaf.rotation.x = Math.sin(angle) * 0.35;
        leaf.castShadow = true; shelf.add(leaf);
      }
      const smallBook = new THREE.Mesh(track.geo(new THREE.BoxGeometry(0.52, 0.09, 0.20)), shelfBookMats[0]);
      smallBook.position.set(0.39, 0.09, 0.02); smallBook.rotation.z = -0.035; shelf.add(smallBook);
      const topBook = new THREE.Mesh(track.geo(new THREE.BoxGeometry(0.44, 0.07, 0.18)), shelfBookMats[2]);
      topBook.position.set(0.42, 0.17, 0.025); topBook.rotation.z = 0.025; shelf.add(topBook);
    }
  };
  buildShelf(-4.38, floorY + 1.5, 'left');
  buildShelf(4.38, floorY + 1.5, 'right');
}

/** Adds a warm, lived-in sleeping corner beside the developer desk. */
export function buildBedroomCorner(
  root: THREE.Group,
  track: Tracker,
  walnutMat: THREE.Material,
  darkSteelMat: THREE.Material,
  brassMat: THREE.Material,
  floorY: number
) {
  const bedX = 7.6;
  const bedZ = 7.2;
  const bedroom = new THREE.Group();
  bedroom.name = 'bedroom-furniture';
  const bedScale = SCALE.bed.transform;
  bedroom.scale.set(bedScale.x, bedScale.y, bedScale.z);
  bedroom.position.set(bedX * (1 - bedScale.x), floorY * (1 - bedScale.y), bedZ * (1 - bedScale.z));
  root.add(bedroom);
  const duvetCanvas = document.createElement('canvas');
  duvetCanvas.width = 256;
  duvetCanvas.height = 256;
  const duvetContext = duvetCanvas.getContext('2d');
  if (duvetContext) {
    duvetContext.fillStyle = '#536d5c';
    duvetContext.fillRect(0, 0, 256, 256);
    let seed = 19;
    for (let i = 0; i < 1700; i++) {
      seed = (seed * 16807) % 2147483647;
      const x = seed % 256;
      seed = (seed * 16807) % 2147483647;
      const y = seed % 256;
      const alpha = 0.025 + (seed % 40) / 1000;
      duvetContext.fillStyle = `rgba(238, 239, 220, ${alpha})`;
      duvetContext.fillRect(x, y, 1 + (seed % 3), 1);
    }
  }
  const duvetTexture = track.tex(new THREE.CanvasTexture(duvetCanvas));
  duvetTexture.colorSpace = THREE.SRGBColorSpace;
  const linen = track.mat(new THREE.MeshStandardMaterial({ color: 0xe8e1d2, roughness: 0.96 }));
  const blanket = track.mat(new THREE.MeshStandardMaterial({ map: duvetTexture, bumpMap: duvetTexture, bumpScale: 0.003, color: 0xffffff, roughness: 0.94 }));
  const pillowMat = track.mat(new THREE.MeshStandardMaterial({ color: 0xf6f1e8, roughness: 0.98 }));
  const glow = track.mat(new THREE.MeshStandardMaterial({
    color: 0xffd89b, emissive: 0xffa943, emissiveIntensity: 1.5, roughness: 0.45,
  }));

  const addBox = (
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    material: THREE.Material,
    parent = bedroom
  ) => {
    const mesh = new THREE.Mesh(track.geo(new THREE.BoxGeometry(...size)), material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // Low oak platform, soft mattress, folded green throw and two pillows.
  addBox('bed', [2.65, 0.24, 3.35], [bedX, floorY + 0.19, bedZ], walnutMat);
  for (const xOffset of [-1.08, 1.08]) {
    for (const zOffset of [-1.42, 1.42]) {
      addBox('bed-leg', [0.13, 0.16, 0.13], [bedX + xOffset, floorY + 0.08, bedZ + zOffset], walnutMat);
    }
  }
  addBox('bed-mattress', [2.52, 0.34, 3.18], [bedX, floorY + 0.46, bedZ], linen);
  addBox('bed-throw', [2.54, 0.12, 1.34], [bedX, floorY + 0.68, bedZ + 0.77], blanket);
  for (const xOffset of [-0.52, 0, 0.52]) {
    const fold = new THREE.Mesh(track.geo(new THREE.SphereGeometry(1, 16, 10)), blanket);
    fold.scale.set(0.028, 0.012, 0.55);
    fold.position.set(bedX + xOffset, floorY + 0.748, bedZ + 0.77);
    bedroom.add(fold);
  }
  for (const xOffset of [-0.64, 0.64]) {
    const pillow = new THREE.Mesh(track.geo(new RoundedBoxGeometry(0.92, 0.17, 0.62, 4, 0.065)), pillowMat);
    pillow.name = 'bed-pillow';
    pillow.position.set(bedX + xOffset, floorY + 0.69, bedZ - 1.05);
    pillow.castShadow = true;
    bedroom.add(pillow);
    pillow.rotation.y = xOffset < 0 ? -0.035 : 0.035;
  }
  const headboard = addBox('bed-headboard', [2.65, 1.26, 0.16], [bedX, floorY + 0.66, bedZ - 1.74], walnutMat);

  // Layered rug makes the sleeping area easy to read from the follow camera.
  const rug = addBox('bed-rug', [SCALE.rug.width / bedScale.x, 0.035, SCALE.rug.depth / bedScale.z], [bedX, floorY + 0.025, bedZ + 0.08], blanket);
  rug.material = track.mat(new THREE.MeshStandardMaterial({ color: 0x293d31, roughness: 1 }));
  rug.castShadow = false;
  headboard.scale.y = SCALE.bed.headboardHeight / (1.26 * bedScale.y);

  // Nightstand and a small amber bedside lamp.
  const standX = bedX - 1.77;
  addBox('nightstand', [0.88, 0.84, 0.82], [standX, floorY + 0.43, bedZ - 1.1], walnutMat);
  addBox('nightstand-drawer', [0.72, 0.25, 0.025], [standX, floorY + 0.52, bedZ - 0.677], darkSteelMat);
  const lampStem = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.035, 0.05, 0.25, 16)), brassMat);
  lampStem.position.set(standX, floorY + 0.99, bedZ - 1.1);
  bedroom.add(lampStem);
  const lampShade = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.11, 0.19, 0.24, 20, 1, true)), linen);
  lampShade.position.set(standX, floorY + 1.2, bedZ - 1.1);
  bedroom.add(lampShade);
  const bulb = new THREE.Mesh(track.geo(new THREE.SphereGeometry(0.075, 16, 12)), glow);
  bulb.name = 'bedside-lamp-bulb';
  bulb.position.set(standX, floorY + 1.1, bedZ - 1.1);
  bedroom.add(bulb);
  const lampLight = new THREE.PointLight(0xffba69, 0.72, 3.5, 1.8);
  lampLight.name = 'bedside-lamp-light';
  lampLight.position.copy(bulb.position);
  bedroom.add(lampLight);

  // Keep the four-pane wooden window on its original back-wall position.
  const wallZ = -2.445;
  const windowX = -5.65;
  const window = new THREE.Group();
  window.name = 'bedroom-window';
  window.position.set(windowX, floorY + 2.05, wallZ);
  window.scale.setScalar(1.3);
  root.add(window);
  const windowWood = track.mat(new THREE.MeshStandardMaterial({ color: 0x765338, roughness: 0.72 }));
  const windowDaylight = track.mat(new THREE.MeshBasicMaterial({ color: 0xd7efff, toneMapped: false }));
  const windowPart = (name: string, size: [number, number, number], position: [number, number, number], material: THREE.Material) => {
    const part = new THREE.Mesh(track.geo(new THREE.BoxGeometry(...size)), material);
    part.name = name;
    part.position.set(...position);
    part.castShadow = material === windowWood;
    part.receiveShadow = true;
    window.add(part);
    return part;
  };
  const windowWidth = 2.3;
  const windowHeight = 1.25;
  const rail = 0.075;
  const muntin = 0.055;
  const frameDepth = 0.07;
  const innerWidth = windowWidth - rail * 2;
  const innerHeight = windowHeight - rail * 2;
  windowPart('bedroom-window-frame-left', [rail, windowHeight, frameDepth], [-windowWidth / 2 + rail / 2, 0, 0.055], windowWood);
  windowPart('bedroom-window-frame-right', [rail, windowHeight, frameDepth], [windowWidth / 2 - rail / 2, 0, 0.055], windowWood);
  windowPart('bedroom-window-frame-top', [windowWidth, rail, frameDepth], [0, windowHeight / 2 - rail / 2, 0.055], windowWood);
  windowPart('bedroom-window-frame-bottom', [windowWidth, rail, frameDepth], [0, -windowHeight / 2 + rail / 2, 0.055], windowWood);
  const paneWidth = (innerWidth - muntin) / 2;
  const paneHeight = (innerHeight - muntin) / 2;
  for (const xSide of [-1, 1]) {
    for (const ySide of [-1, 1]) {
      windowPart(
        `bedroom-window-pane-${xSide}-${ySide}`,
        [paneWidth, paneHeight, 0.012],
        [xSide * (muntin / 2 + paneWidth / 2), ySide * (muntin / 2 + paneHeight / 2), 0.075],
        windowDaylight
      );
    }
  }
  windowPart('bedroom-window-muntin-v', [muntin, innerHeight, 0.045], [0, 0, 0.074], windowWood);
  windowPart('bedroom-window-muntin-h', [innerWidth, muntin, 0.045], [0, 0, 0.074], windowWood);
  windowPart('bedroom-window-sill', [windowWidth + 0.2, 0.09, 0.2], [0, -windowHeight / 2 - 0.045, 0.09], windowWood);
}

/** Adds a second workstation and a console lounge on the right side of the room. */
export function buildGamingCorner(
  root: THREE.Group,
  track: Tracker,
  walnutMat: THREE.Material,
  darkSteelMat: THREE.Material,
  brassMat: THREE.Material,
  floorY: number
) {
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 768;
  screenCanvas.height = 432;
  const screenCtx = screenCanvas.getContext('2d');
  if (screenCtx) {
    const gradient = screenCtx.createLinearGradient(0, 0, 768, 432);
    gradient.addColorStop(0, '#10281f');
    gradient.addColorStop(0.52, '#174d39');
    gradient.addColorStop(1, '#172b40');
    screenCtx.fillStyle = gradient;
    screenCtx.fillRect(0, 0, 768, 432);
    screenCtx.fillStyle = 'rgba(128, 231, 177, .17)';
    screenCtx.beginPath(); screenCtx.arc(575, 165, 158, 0, Math.PI * 2); screenCtx.fill();
    screenCtx.fillStyle = '#a9edc8';
    screenCtx.font = '800 24px system-ui, sans-serif';
    screenCtx.fillText('TAHA  /  GAME ROOM', 54, 70);
    screenCtx.fillStyle = '#f3f4e8';
    screenCtx.font = '800 66px system-ui, sans-serif';
    screenCtx.fillText('PLAY', 54, 198);
    screenCtx.fillStyle = 'rgba(242, 248, 240, .76)';
    screenCtx.font = '500 21px system-ui, sans-serif';
    screenCtx.fillText('BUILD  ·  CREATE  ·  REPEAT', 58, 240);
    for (let i = 0; i < 3; i++) {
      screenCtx.fillStyle = ['#8ce6b3', '#e5c183', '#92bde9'][i];
      screenCtx.fillRect(58 + i * 130, 300, 96, 8);
      screenCtx.fillStyle = 'rgba(255,255,255,.16)';
      screenCtx.fillRect(58 + i * 130, 318, 105, 4);
    }
    // The main gaming display now reads as a working VS Code window with a live app preview.
    const ctx = screenCtx;
    ctx.fillStyle = '#111821'; ctx.fillRect(0, 0, 768, 432);
    ctx.fillStyle = '#202a35'; ctx.fillRect(0, 0, 768, 34);
    for (const [i, color] of ['#ff6e6e', '#f4c66b', '#6fdaa3'].entries()) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(17 + i * 18, 17, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#cbd5df'; ctx.font = 'bold 13px Arial'; ctx.fillText('VS CODE  ·  portfolio.tsx', 90, 22);
    ctx.fillStyle = '#18212b'; ctx.fillRect(0, 34, 120, 398);
    ctx.fillStyle = '#91a0ae'; ctx.font = '12px Arial'; ctx.fillText('EXPLORER', 14, 57);
    ['▾ taha-portfolio', '  ▾ src', '    App.tsx', '    projects.ts', '    styles.css', '  package.json'].forEach((line, i) => { ctx.fillStyle = i === 2 ? '#e0ebf6' : '#9baab7'; ctx.fillText(line, 10, 85 + i * 25); });
    ctx.fillStyle = '#151c25'; ctx.fillRect(120, 34, 430, 398);
    ctx.fillStyle = '#bec9d4'; ctx.font = '12px ui-monospace, monospace'; ctx.fillText('portfolio.tsx', 140, 58);
    const codeLines: Array<[string, string]> = [
      ['import', " { createStudio } from './room';"], ['const', ' projects = loadProjects();'], ['', ''],
      ['function', ' Portfolio() {'], ['', '  return ('], ['', '    <Studio color="emerald">'],
      ['', '      <Room lights="neon" />'], ['', '      <Projects items={projects} />'], ['', '      <Contact open />'],
      ['', '    </Studio>'], ['', '  );'], ['', '}'], ['', ''], ['export', ' default Portfolio;'],
    ];
    ctx.font = '13px Consolas, ui-monospace, monospace';
    codeLines.forEach(([keyword, rest], i) => {
      const y = 88 + i * 22; ctx.fillStyle = '#657382'; ctx.fillText(String(i + 1).padStart(2, ' '), 132, y);
      if (keyword) { ctx.fillStyle = '#c792ea'; ctx.fillText(keyword, 159, y); }
      ctx.fillStyle = rest.includes('"') ? '#a8d7a0' : '#d5dce5'; ctx.fillText(rest, 159 + ctx.measureText(keyword).width, y);
    });
    ctx.fillStyle = '#101720'; ctx.fillRect(550, 34, 218, 398);
    ctx.fillStyle = '#768797'; ctx.font = '11px Arial'; ctx.fillText('LIVE PREVIEW', 564, 56);
    const preview = ctx.createLinearGradient(550, 74, 768, 350); preview.addColorStop(0, '#173b31'); preview.addColorStop(1, '#19263b');
    ctx.fillStyle = preview; ctx.fillRect(562, 72, 194, 258); ctx.strokeStyle = 'rgba(140,235,185,.35)'; ctx.strokeRect(562, 72, 194, 258);
    ctx.fillStyle = '#9ce8bc'; ctx.font = 'bold 10px Arial'; ctx.fillText('TAHA / DEVELOPER', 576, 104);
    ctx.fillStyle = '#f1f4ef'; ctx.font = 'bold 22px Arial'; ctx.fillText('Build things', 576, 166); ctx.fillText('that matter.', 576, 193);
    ctx.fillStyle = '#91a89b'; ctx.font = '10px Arial'; ctx.fillText('Full-stack · 3D · Creative code', 576, 218);
    ctx.fillStyle = '#64dfb0'; ctx.fillRect(576, 246, 110, 25); ctx.fillStyle = '#10221a'; ctx.font = 'bold 10px Arial'; ctx.fillText('VIEW PROJECTS', 588, 262);
    ctx.fillStyle = '#284136'; ctx.fillRect(0, 414, 768, 18); ctx.fillStyle = '#b3e7c5'; ctx.font = '10px Arial'; ctx.fillText('TypeScript · UTF-8 · main · 0 errors', 12, 427);
  }
  const screenTexture = track.tex(new THREE.CanvasTexture(screenCanvas));
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  const screenMaterial = track.mat(new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false }));
  const pcScreenCanvas = document.createElement('canvas');
  pcScreenCanvas.width = screenCanvas.width; pcScreenCanvas.height = screenCanvas.height;
  const pcScreenCtx = pcScreenCanvas.getContext('2d');
  pcScreenCtx?.drawImage(screenCanvas, 0, 0);
  const pcScreenTexture = track.tex(new THREE.CanvasTexture(pcScreenCanvas));
  pcScreenTexture.colorSpace = THREE.SRGBColorSpace;
  const pcScreenMaterial = track.mat(new THREE.MeshBasicMaterial({ map: pcScreenTexture, toneMapped: false }));
  const makeSideScreen = (mode: 'code' | 'timeline') => {
    const canvas = document.createElement('canvas');
    canvas.width = 768; canvas.height = 432;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#111821'; ctx.fillRect(0, 0, 768, 432);
      ctx.fillStyle = '#202b35'; ctx.fillRect(0, 0, 768, 34);
      ctx.fillStyle = '#80dbb0'; ctx.fillRect(0, 34, 7, 398);
      if (mode === 'code') {
        ctx.fillStyle = '#242b34'; ctx.fillRect(7, 34, 761, 25);
        ctx.fillStyle = '#bdc7d0'; ctx.font = '13px Arial'; ctx.fillText('●  Visual Studio Code     StudioScene.tsx', 20, 52);
        ctx.fillStyle = '#202833'; ctx.fillRect(7, 59, 118, 373);
        ctx.fillStyle = '#c7d0d8'; ctx.font = '12px Arial'; ctx.fillText('EXPLORER', 18, 80);
        ctx.font = '12px ui-monospace, monospace';
        ['▾ src', '  ▾ three', '    studioProps.ts', '    StudioScene.tsx', '  ▾ config', '    scale.ts', 'package.json'].forEach((line, i) => {
          ctx.fillStyle = i === 3 ? '#d8e7f4' : '#9eabb6'; ctx.fillText(line, 15, 103 + i * 22);
        });
        ctx.fillStyle = '#161d25'; ctx.fillRect(125, 59, 643, 373);
        ctx.fillStyle = '#bac5cf'; ctx.font = '12px ui-monospace, monospace'; ctx.fillText('studioProps.ts   ×', 143, 79);
        const code = [
          ['import', '#c792ea', ' * as THREE from \'three\';'],
          ['const', '#c792ea', ' workstation = new THREE.Group();'],
          ['workstation', '#82aaff', '.name = \'gaming-workstation\';'],
          ['', '#d6deeb', ''],
          ['function', '#c792ea', ' buildRoom(scene: THREE.Scene) {'],
          ['', '#d6deeb', '  const floor = createParquetFloor();'],
          ['', '#d6deeb', '  const desk = createDesk({'],
          ['', '#d6deeb', '    width: 1.9, depth: 0.9,'],
          ['', '#d6deeb', '    material: walnutMaterial,'],
          ['', '#d6deeb', '  });'],
          ['', '#d6deeb', '  scene.add(floor, desk, workstation);'],
          ['', '#d6deeb', '  return { scene, workstation };'],
          ['', '#d6deeb', '}'],
          ['', '#d6deeb', ''],
          ['const', '#c792ea', ' player = createCharacter();'],
          ['', '#d6deeb', 'player.moveTo(room.spawnPoint);'],
        ];
        ctx.font = '14px ui-monospace, Consolas, monospace';
        code.forEach(([keyword, color, rest], i) => {
          const y = 101 + i * 19;
          ctx.fillStyle = '#687585'; ctx.fillText(String(i + 1), 139, y);
          ctx.fillStyle = '#454f5a'; ctx.fillRect(164, y - 11, 1, 14);
          if (keyword) { ctx.fillStyle = color; ctx.fillText(keyword, 177, y); }
          const restX = 177 + ctx.measureText(keyword).width;
          ctx.fillStyle = color; ctx.fillText(rest, restX, y);
        });
        ctx.fillStyle = '#6fbd91'; ctx.fillRect(7, 422, 761, 10);
        ctx.fillStyle = '#152b23'; ctx.font = '10px Arial'; ctx.fillText('TypeScript  ·  UTF-8  ·  Ln 18, Col 1', 18, 430);
      } else {
        ctx.fillStyle = '#10151c'; ctx.fillRect(28, 52, 712, 238);
        const scene = ctx.createLinearGradient(28, 52, 740, 290);
        scene.addColorStop(0, '#243c4a'); scene.addColorStop(1, '#594a42');
        ctx.fillStyle = scene; ctx.fillRect(28, 52, 712, 238);
        ctx.fillStyle = 'rgba(132, 202, 175, .62)'; ctx.beginPath(); ctx.arc(390, 164, 76, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#202b35'; ctx.fillRect(28, 305, 712, 102);
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = ['#76d5ac', '#a6b8d9', '#d3ae76'][i % 3];
          ctx.fillRect(54 + i * 82, 328 + (i % 3) * 12, 58, 8);
          ctx.fillStyle = '#64737d'; ctx.fillRect(54 + i * 82, 382, 63, 5);
        }
      }
    }
    const texture = track.tex(new THREE.CanvasTexture(canvas));
    texture.colorSpace = THREE.SRGBColorSpace;
    return track.mat(new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  };
  const sideScreenMaterials = [makeSideScreen('code'), makeSideScreen('timeline')];
  const blackGlass = track.mat(new THREE.MeshPhysicalMaterial({ color: 0x101815, metalness: 0.22, roughness: 0.15, clearcoat: 0.9 }));
  const graphite = track.mat(new THREE.MeshStandardMaterial({ color: 0x202823, metalness: 0.72, roughness: 0.3 }));
  const whiteConsole = track.mat(new THREE.MeshStandardMaterial({ color: 0xe8e7e1, metalness: 0.08, roughness: 0.36 }));
  const greenLed = track.mat(new THREE.MeshBasicMaterial({ color: 0x7fe0b0, toneMapped: false }));
  const blueLed = track.mat(new THREE.MeshBasicMaterial({ color: 0x70baff, toneMapped: false }));
  const gamingDeskSurface = track.mat(new THREE.MeshStandardMaterial({ color: 0x514234, roughness: 0.72, metalness: 0.02 }));
  const sofaFabric = track.mat(new THREE.MeshStandardMaterial({ color: 0x25272a, roughness: 0.97 }));
  const cushionFabric = track.mat(new THREE.MeshStandardMaterial({ color: 0x33363a, roughness: 0.98 }));
  const deskX = 6.15;
  const deskZ = -0.1;
  const gamingScale = SCALE.gamingDesk.transform;
  const gamingWorkstation = new THREE.Group();
  gamingWorkstation.name = 'gaming-workstation';
  gamingWorkstation.scale.set(gamingScale.x, gamingScale.y, gamingScale.z);
  gamingWorkstation.position.set(
    deskX * (1 - gamingScale.x),
    floorY * (1 - gamingScale.y),
    deskZ * (1 - gamingScale.z)
  );
  root.add(gamingWorkstation);

  const addBox = (
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    material: THREE.Material,
    parent = root
  ) => {
    const mesh = new THREE.Mesh(track.geo(new THREE.BoxGeometry(...size)), material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // Enlarged dark walnut workstation inspired by the multi-screen reference.
  addBox('gaming-desk-top', [2.65, 0.13, 1.16], [deskX, floorY + 0.78, deskZ], gamingDeskSurface, gamingWorkstation);
  const deskMat = track.mat(new THREE.MeshStandardMaterial({ color: 0x17201f, roughness: 0.78, metalness: 0.05 }));
  addBox('gaming-desk-large-mat', [1.7, 0.018, 0.82], [deskX, floorY + 0.835, deskZ + 0.1], deskMat, gamingWorkstation);
  const rgbStrip = track.mat(new THREE.MeshBasicMaterial({ color: 0x36dbc7, toneMapped: false }));
  addBox('gaming-desk-rear-rgb-strip', [1.95, 0.012, 0.014], [deskX, floorY + 0.858, deskZ - 0.56], rgbStrip, gamingWorkstation);
  for (const xOffset of [-1.08, 1.08]) {
    if (xOffset < 0) continue; // The left drawer pedestal replaces this pair of legs.
    for (const zOffset of [-0.39, 0.39]) {
      addBox('gaming-desk-leg', [0.085, 0.75, 0.085], [deskX + xOffset, floorY + 0.375, deskZ + zOffset], darkSteelMat, gamingWorkstation);
    }
  }
  addBox('gaming-desk-front-inlay', [2.52, 0.018, 0.012], [deskX, floorY + 0.78, deskZ + 0.584], graphite, gamingWorkstation);
  addBox('gaming-desk-cable-tray', [1.55, 0.055, 0.34], [deskX - 0.12, floorY + 0.69, deskZ - 0.04], graphite, gamingWorkstation);
  const drawerX = deskX - 0.69 / gamingScale.x;
  addBox('gaming-drawer-unit', [0.62, 0.74, 0.82], [drawerX, floorY + 0.37, deskZ], graphite, gamingWorkstation);
  for (let i = 0; i < 3; i++) {
    const drawerY = floorY + 0.18 + i * 0.23;
    addBox(`gaming-drawer-face-${i}`, [0.55, 0.19, 0.025], [drawerX, drawerY, deskZ + 0.423], gamingDeskSurface, gamingWorkstation);
    addBox(`gaming-drawer-pull-${i}`, [0.13, 0.018, 0.025], [drawerX, drawerY, deskZ + 0.447], darkSteelMat, gamingWorkstation);
  }
  const mainMonitorX = deskX;
  const monitorCenterY = floorY + 1.13;
  const monitorFrame = addBox('gaming-monitor-frame', [1.42, 0.88, 0.105], [mainMonitorX, monitorCenterY, deskZ - 0.39], graphite, gamingWorkstation);
  monitorFrame.scale.set(0.94 / (1.42 * gamingScale.x), 0.57 / (0.88 * gamingScale.y), 1);
  const monitorScreen = new THREE.Mesh(track.geo(new THREE.PlaneGeometry(1.29, 0.73)), pcScreenMaterial);
  monitorScreen.name = 'gaming-pc-monitor';
  monitorScreen.position.set(mainMonitorX, monitorCenterY, deskZ - 0.331);
  monitorScreen.scale.set(0.9 / (1.29 * gamingScale.x), 0.52 / (0.73 * gamingScale.y), 1);
  monitorScreen.userData.setDeskCode = (value: string | null) => {
    if (!pcScreenCtx) return;
    const ctx = pcScreenCtx;
    ctx.fillStyle = '#151c25'; ctx.fillRect(120, 34, 430, 380);
    ctx.fillStyle = '#bec9d4'; ctx.font = '12px ui-monospace, monospace'; ctx.fillText(value === null ? 'portfolio.tsx' : 'mon-projet.ts', 140, 58);
    const lines = (value ?? "const projects = ['portfolio', 'room'];\n\nfunction start() {\n  return projects.map(open);\n}\n\nstart();").split('\n').slice(0, 14);
    ctx.font = '13px Consolas, ui-monospace, monospace';
    lines.forEach((line, index) => {
      const y = 88 + index * 22;
      ctx.fillStyle = '#657382'; ctx.fillText(String(index + 1).padStart(2, ' '), 132, y);
      ctx.fillStyle = /^(const|function|return|export)/.test(line.trim()) ? '#c792ea' : '#d5dce5';
      ctx.fillText(line.slice(0, 52), 159, y);
    });
    pcScreenTexture.needsUpdate = true;
  };
  gamingWorkstation.add(monitorScreen);
  addBox('gaming-monitor-neck', [0.09, 0.2, 0.08], [mainMonitorX, floorY + 0.88, deskZ - 0.39], graphite, gamingWorkstation);
  addBox('gaming-monitor-foot', [0.48, 0.035, 0.27], [mainMonitorX, floorY + 0.8625, deskZ - 0.33], graphite, gamingWorkstation);
  const monitorLightbar = new THREE.Mesh(track.geo(new RoundedBoxGeometry(1.18, 0.035, 0.045, 4, 0.014)), blackGlass);
  monitorLightbar.name = 'gaming-monitor-lightbar'; monitorLightbar.position.set(mainMonitorX, monitorCenterY + 0.305, deskZ - 0.36); gamingWorkstation.add(monitorLightbar);
  addBox('gaming-monitor-lightbar-glow', [1.0, 0.008, 0.012], [mainMonitorX, monitorCenterY + 0.285, deskZ - 0.332], blueLed, gamingWorkstation);
  for (const [side, material] of [[-1, sideScreenMaterials[0]], [1, sideScreenMaterials[1]]] as const) {
    const monitorX = deskX + side * 0.69 / gamingScale.x;
    const sideMonitorY = floorY + 1.1;
    const sideFrame = addBox(`gaming-monitor-frame-${side}`, [1.15, 0.82, 0.095], [monitorX, sideMonitorY, deskZ - 0.39], graphite, gamingWorkstation);
    sideFrame.scale.set(0.45 / (1.15 * gamingScale.x), 0.4 / (0.82 * gamingScale.y), 1);
    sideFrame.rotation.y = side * 0.11;
    const sideScreen = new THREE.Mesh(track.geo(new THREE.PlaneGeometry(1.08, 0.75)), material);
    sideScreen.name = `gaming-side-monitor-${side}`;
    sideScreen.position.set(monitorX, sideMonitorY, deskZ - 0.335);
    sideScreen.scale.set(0.42 / (1.08 * gamingScale.x), 0.36 / (0.75 * gamingScale.y), 1);
    sideScreen.rotation.y = side * 0.11;
    gamingWorkstation.add(sideScreen);
    addBox(`gaming-monitor-neck-${side}`, [0.07, 0.16, 0.065], [monitorX, floorY + 0.88, deskZ - 0.39], graphite, gamingWorkstation);
    addBox(`gaming-monitor-foot-${side}`, [0.32, 0.03, 0.2], [monitorX, floorY + 0.86, deskZ - 0.33], graphite, gamingWorkstation);
  }
  addBox('gaming-keyboard', [1.18, 0.045, 0.34], [deskX - 0.12, floorY + 0.8675, deskZ + 0.28], darkSteelMat, gamingWorkstation);
  const keyCanvas = document.createElement('canvas');
  keyCanvas.width = 768; keyCanvas.height = 256;
  const keyCtx = keyCanvas.getContext('2d');
  if (keyCtx) {
    keyCtx.fillStyle = '#171d24'; keyCtx.fillRect(0, 0, 768, 256);
    const rows = [
      ['ESC','1','2','3','4','5','6','7','8','9','0','-','=','⌫'],
      ['TAB','Q','W','E','R','T','Y','U','I','O','P','[',']'],
      ['CAPS','A','S','D','F','G','H','J','K','L',';','ENTER'],
      ['SHIFT','Z','X','C','V','B','N','M',',','.','/','SHIFT'],
      ['CTRL','FN','ALT','SPACE','ALT','CTRL','←','↓','↑','→'],
    ];
    const gap = 5, keyH = 39, top = 12;
    rows.forEach((row, r) => {
      const keyW = (738 - gap * (row.length - 1)) / row.length;
      row.forEach((label, c) => {
        const x = 15 + c * (keyW + gap), y = top + r * (keyH + 6);
        keyCtx.fillStyle = '#313b46'; keyCtx.beginPath(); keyCtx.roundRect(x, y, keyW, keyH, 5); keyCtx.fill();
        keyCtx.strokeStyle = '#596775'; keyCtx.lineWidth = 1; keyCtx.stroke();
        keyCtx.fillStyle = label === 'W' || label === 'A' || label === 'S' || label === 'D' ? '#9be5bf' : '#f0f3f6';
        keyCtx.font = `${label.length > 3 ? 10 : 15}px Arial`; keyCtx.textAlign = 'center';
        keyCtx.fillText(label, x + keyW / 2, y + 24);
      });
    });
  }
  const keyTexture = track.tex(new THREE.CanvasTexture(keyCanvas)); keyTexture.colorSpace = THREE.SRGBColorSpace;
  const keyMesh = new THREE.Mesh(track.geo(new THREE.PlaneGeometry(1.18, 0.32)), track.mat(new THREE.MeshBasicMaterial({ map: keyTexture, toneMapped: false })));
  keyMesh.name = 'gaming-keyboard-readable-keys';
  keyMesh.rotation.x = -Math.PI / 2;
  keyMesh.position.set(deskX - 0.12, floorY + 0.891, deskZ + 0.28);
  gamingWorkstation.add(keyMesh);
  addBox('gaming-keyboard-light', [0.68, 0.009, 0.012], [deskX - 0.12, floorY + 0.895, deskZ + 0.28], greenLed, gamingWorkstation);
  const gamingMouse = new THREE.Group();
  gamingMouse.name = 'gaming-mouse';
  gamingMouse.position.set(deskX + 0.48 / gamingScale.x, floorY + 0.845, deskZ + 0.28);
  gamingWorkstation.add(gamingMouse);
  const gamingMouseBase = new THREE.Mesh(track.geo(new RoundedBoxGeometry(0.13, 0.012, 0.19, 4, 0.05)), graphite);
  gamingMouseBase.position.y = 0.006; gamingMouse.add(gamingMouseBase);
  const gamingMouseShell = new THREE.Mesh(track.geo(new THREE.SphereGeometry(0.07, 18, 12)), blackGlass);
  gamingMouseShell.scale.set(0.8, 0.53, 1.25);
  gamingMouseShell.position.set(0, 0.035, 0.005); gamingMouse.add(gamingMouseShell);
  const gamingMouseWheel = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.009, 0.009, 0.028, 12)), greenLed);
  gamingMouseWheel.rotation.z = Math.PI / 2;
  gamingMouseWheel.position.set(0, 0.069, -0.035); gamingMouse.add(gamingMouseWheel);
  const gamingHeadset = new THREE.Group();
  gamingHeadset.name = 'gaming-headphones';
  gamingHeadset.position.set(deskX + 0.45 / gamingScale.x, floorY + 0.845, deskZ - 0.035);
  gamingWorkstation.add(gamingHeadset);
  const headsetBand = new THREE.Mesh(track.geo(new THREE.TorusGeometry(0.09, 0.012, 10, 28, Math.PI)), graphite);
  headsetBand.position.y = 0.11; gamingHeadset.add(headsetBand);
  for (const side of [-1, 1]) {
    const earCup = new THREE.Mesh(track.geo(new RoundedBoxGeometry(0.055, 0.085, 0.045, 3, 0.012)), blackGlass);
    earCup.position.set(side * 0.09, 0.03, 0); gamingHeadset.add(earCup);
  }

  // Tower shell with a glass side, softly glowing fan rings and a small power light.
  const towerX = deskX + 1.14;
  const towerZ = deskZ - 0.04;
  const pcTower = new THREE.Group();
  pcTower.name = 'gaming-pc-tower-group';
  pcTower.scale.setScalar(0.76);
  pcTower.position.set(towerX, floorY + 1.21, towerZ);
  gamingWorkstation.add(pcTower);
  addBox('gaming-pc-tower', [0.48, 0.72, 0.56], [0, 0, 0], graphite, pcTower);
  addBox('gaming-pc-glass', [0.012, 0.58, 0.42], [0.247, 0, 0], blackGlass, pcTower);
  const fanGeo = track.geo(new THREE.TorusGeometry(0.105, 0.012, 8, 28));
  for (const y of [0.22, 0, -0.22]) {
    const fan = new THREE.Mesh(fanGeo, greenLed);
    fan.position.set(0.22, y, 0);
    fan.rotation.y = Math.PI / 2;
    pcTower.add(fan);
    const fanAccent = new THREE.Mesh(track.geo(new THREE.TorusGeometry(0.075, 0.006, 8, 28)), blueLed);
    fanAccent.position.copy(fan.position);
    fanAccent.rotation.y = Math.PI / 2;
    pcTower.add(fanAccent);
    const fanHub = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.027, 0.027, 0.016, 20)), graphite);
    fanHub.position.set(0.215, y, 0);
    fanHub.rotation.z = Math.PI / 2;
    pcTower.add(fanHub);
  }
  addBox('gaming-pc-gpu', [0.23, 0.055, 0.3], [0.02, -0.09, 0], graphite, pcTower);
  addBox('gaming-pc-gpu-light', [0.18, 0.008, 0.012], [0.02, -0.09, 0.157], greenLed, pcTower);
  addBox('gaming-pc-power-led', [0.015, 0.025, 0.025], [0.26, -0.27, -0.17], blueLed, pcTower);

  gamingWorkstation.updateMatrixWorld(true);
  const gamingDeskBounds = new THREE.Box3().setFromObject(gamingWorkstation.getObjectByName('gaming-desk-top')!);
  const pcBounds = new THREE.Box3().setFromObject(pcTower);
  pcTower.position.y += (gamingDeskBounds.max.y - pcBounds.min.y) / gamingWorkstation.scale.y;
  buildMeshOfficeChair(root, track, floorY, deskX, 0.82, 'gaming-chair', 1.1);

  // Colorful code-and-gaming tags fill the empty wall behind this workstation.
  const graffitiCanvas = document.createElement('canvas');
  graffitiCanvas.width = 1280; graffitiCanvas.height = 520;
  const graffitiCtx = graffitiCanvas.getContext('2d');
  if (graffitiCtx) {
    graffitiCtx.lineCap = 'round';
    for (let i = 0; i < 92; i++) {
      const x = (i * 193 + 47) % 1280, y = (i * 97 + 31) % 520;
      graffitiCtx.fillStyle = ['rgba(38,226,202,.72)','rgba(255,77,174,.66)','rgba(255,198,76,.62)'][i % 3];
      graffitiCtx.beginPath(); graffitiCtx.arc(x, y, 2 + (i % 7), 0, Math.PI * 2); graffitiCtx.fill();
    }
    graffitiCtx.save(); graffitiCtx.translate(48, 360); graffitiCtx.rotate(-0.035);
    graffitiCtx.font = '900 238px Arial Black, Arial'; graffitiCtx.lineWidth = 22;
    graffitiCtx.strokeStyle = '#19252b'; graffitiCtx.strokeText('PLAY', 0, 0);
    graffitiCtx.fillStyle = '#31e6d0'; graffitiCtx.fillText('PLAY', 0, 0);
    graffitiCtx.lineWidth = 7; graffitiCtx.strokeStyle = '#f3f2e7'; graffitiCtx.strokeText('PLAY', 0, 0);
    graffitiCtx.font = '900 108px Arial Black, Arial'; graffitiCtx.lineWidth = 14; graffitiCtx.strokeStyle = '#172229'; graffitiCtx.strokeText('CODE', 685, -70);
    graffitiCtx.fillStyle = '#ff62ae'; graffitiCtx.fillText('CODE', 685, -70);
    graffitiCtx.font = '900 75px Arial Black, Arial'; graffitiCtx.lineWidth = 10; graffitiCtx.strokeStyle = '#172229'; graffitiCtx.strokeText('CREATE', 715, 25);
    graffitiCtx.fillStyle = '#f3cc65'; graffitiCtx.fillText('CREATE', 715, 25);
    graffitiCtx.font = '700 38px ui-monospace, monospace'; graffitiCtx.fillStyle = '#f3f2e7'; graffitiCtx.fillText('</ BUILD SOMETHING COOL >', 690, 85);
    graffitiCtx.restore();
    graffitiCtx.strokeStyle = '#ff62ae'; graffitiCtx.lineWidth = 19;
    graffitiCtx.beginPath(); graffitiCtx.moveTo(682, 430); graffitiCtx.bezierCurveTo(810, 320, 980, 485, 1210, 300); graffitiCtx.stroke();
    graffitiCtx.strokeStyle = '#31e6d0'; graffitiCtx.lineWidth = 10;
    graffitiCtx.beginPath(); graffitiCtx.moveTo(35, 440); graffitiCtx.bezierCurveTo(160, 385, 250, 510, 375, 430); graffitiCtx.stroke();
  }
  const graffitiTexture = track.tex(new THREE.CanvasTexture(graffitiCanvas)); graffitiTexture.colorSpace = THREE.SRGBColorSpace;
  const graffiti = new THREE.Mesh(track.geo(new THREE.PlaneGeometry(3.65, 1.48)), track.mat(new THREE.MeshBasicMaterial({ map: graffitiTexture, transparent: true, toneMapped: false, depthWrite: false })));
  const graffitiX = deskX + 0.9;
  graffiti.name = 'gaming-wall-graffiti'; graffiti.position.set(graffitiX, floorY + 2.2, -2.435); root.add(graffiti);
  const ledMats = [0x22f2db, 0xff4ab8, 0xa56cff, 0xffc94f].map((color) => track.mat(new THREE.MeshBasicMaterial({ color, toneMapped: false })));
  const addWallLed = (name: string, width: number, height: number, x: number, y: number, material: THREE.Material, z = -2.42) => {
    const led = new THREE.Mesh(track.geo(new THREE.BoxGeometry(width, height, 0.018)), material);
    led.name = name; led.position.set(x, y, z); root.add(led);
  };
  addWallLed('gaming-wall-led-top', 3.82, 0.025, graffitiX, floorY + 2.97, ledMats[0]);
  addWallLed('gaming-wall-led-bottom', 3.82, 0.025, graffitiX, floorY + 1.43, ledMats[1]);
  addWallLed('gaming-wall-led-left', 0.025, 1.52, graffitiX - 1.9, floorY + 2.2, ledMats[2]);
  addWallLed('gaming-wall-led-right', 0.025, 1.52, graffitiX + 1.9, floorY + 2.2, ledMats[3]);

  // Neon creator mural fills the open green wall between the podcast and main desk features.
  const muralX = -9.9;
  const muralZ = 1.3;
  const muralY = floorY + 1.91;
  const muralFrameMat = track.mat(new THREE.MeshStandardMaterial({ color: 0x101a17, roughness: 0.68, metalness: 0.34 }));
  const muralBacking = new THREE.Mesh(track.geo(new RoundedBoxGeometry(3.3, 1.72, 0.075, 6, 0.055)), muralFrameMat);
  muralBacking.name = 'creator-neon-mural-backing'; muralBacking.rotation.y = Math.PI / 2; muralBacking.position.set(muralX, muralY, muralZ); muralBacking.castShadow = true; root.add(muralBacking);
  const muralCanvas = document.createElement('canvas'); muralCanvas.width = 1280; muralCanvas.height = 640;
  const muralCtx = muralCanvas.getContext('2d');
  if (muralCtx) {
    const ctx = muralCtx;
    const bg = ctx.createLinearGradient(0, 0, 1280, 640); bg.addColorStop(0, '#10251f'); bg.addColorStop(0.55, '#111c21'); bg.addColorStop(1, '#19182b');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1280, 640);
    ctx.strokeStyle = 'rgba(62,231,204,.12)'; ctx.lineWidth = 2;
    for (let x = 0; x <= 1280; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 640); ctx.stroke(); }
    for (let y = 0; y <= 640; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1280, y); ctx.stroke(); }
    ctx.save(); ctx.translate(92, 410); ctx.rotate(-0.035); ctx.font = '900 300px Arial Black, Arial'; ctx.lineJoin = 'round';
    ctx.shadowColor = '#24e9d0'; ctx.shadowBlur = 34; ctx.lineWidth = 26; ctx.strokeStyle = '#091411'; ctx.strokeText('TAHA', 0, 0);
    ctx.shadowBlur = 15; ctx.fillStyle = '#43f0d3'; ctx.fillText('TAHA', 0, 0);
    ctx.shadowBlur = 0; ctx.lineWidth = 7; ctx.strokeStyle = '#e8fff8'; ctx.strokeText('TAHA', 0, 0); ctx.restore();
    ctx.fillStyle = '#f2c96c'; ctx.font = '800 42px ui-monospace, monospace'; ctx.fillText('DIGITAL CREATOR', 104, 492);
    ctx.fillStyle = '#d8e9df'; ctx.font = '600 30px ui-monospace, monospace'; ctx.fillText('CODE  /  DESIGN  /  PLAY', 104, 548);
    ctx.lineCap = 'round'; ctx.lineWidth = 18; ctx.shadowBlur = 17;
    ctx.shadowColor = '#ff54bd'; ctx.strokeStyle = '#ff54bd'; ctx.beginPath(); ctx.moveTo(870, 545); ctx.bezierCurveTo(1000, 430, 1115, 605, 1226, 475); ctx.stroke();
    ctx.shadowColor = '#24e9d0'; ctx.strokeStyle = '#24e9d0'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(810, 142); ctx.bezierCurveTo(930, 60, 1085, 195, 1210, 78); ctx.stroke();
    ctx.shadowBlur = 0;
    for (let i = 0; i < 48; i++) {
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255,84,189,.72)' : 'rgba(67,240,211,.65)';
      ctx.beginPath(); ctx.arc((i * 193 + 71) % 1280, (i * 107 + 37) % 640, 2 + i % 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  const muralTexture = track.tex(new THREE.CanvasTexture(muralCanvas)); muralTexture.colorSpace = THREE.SRGBColorSpace;
  const muralArt = new THREE.Mesh(track.geo(new THREE.PlaneGeometry(3.18, 1.6)), track.mat(new THREE.MeshBasicMaterial({ map: muralTexture, toneMapped: false })));
  muralArt.name = 'creator-neon-mural-art'; muralArt.rotation.y = Math.PI / 2; muralArt.position.set(-9.85, muralY, muralZ); root.add(muralArt);
  const muralLed = [0x2be8d0, 0xff51bd, 0x9a71ff, 0xffcb5d].map((color) => track.mat(new THREE.MeshBasicMaterial({ color, toneMapped: false })));
  const muralRails: Array<[string, [number, number, number], [number, number, number], number]> = [
    ['top', [0.025, 0.022, 3.48], [-9.82, floorY + 2.78, muralZ], 0],
    ['bottom', [0.025, 0.022, 3.48], [-9.82, floorY + 1.04, muralZ], 1],
    ['left', [0.025, 1.72, 0.022], [-9.82, muralY, muralZ - 1.74], 2],
    ['right', [0.025, 1.72, 0.022], [-9.82, muralY, muralZ + 1.74], 3],
  ];
  for (const [name, size, position, colorIndex] of muralRails) {
    const rail = new THREE.Mesh(track.geo(new THREE.BoxGeometry(...size)), muralLed[colorIndex]);
    rail.name = `creator-neon-mural-led-${name}`; rail.position.set(...position); root.add(rail);
  }
  const muralWash = new THREE.PointLight(0x36ddc8, 1.25, 4.8, 1.8);
  muralWash.name = 'creator-neon-mural-wash'; muralWash.position.set(-8.9, muralY, muralZ); root.add(muralWash);

  // Full podcast set on the green rear wall, staged like a small recording room.
  const podcastX = -8.05;
  const podcastPanelMat = track.mat(new THREE.MeshStandardMaterial({ color: 0x101915, roughness: 0.88, metalness: 0.05 }));
  addBox('podcast-acoustic-panel', [3.38, 2.18, 0.09], [podcastX, floorY + 1.62, -2.425], podcastPanelMat);
  const podcastSlatGeo = track.geo(new THREE.BoxGeometry(0.052, 2.05, 0.055));
  const podcastSlats = new THREE.InstancedMesh(podcastSlatGeo, walnutMat, 35);
  const slatDummy = new THREE.Object3D();
  for (let i = 0; i < 35; i++) {
    slatDummy.position.set(podcastX - 1.62 + i * 0.096, floorY + 1.62, -2.335);
    slatDummy.updateMatrix(); podcastSlats.setMatrixAt(i, slatDummy.matrix);
  }
  podcastSlats.name = 'podcast-acoustic-walnut-slats'; podcastSlats.instanceMatrix.needsUpdate = true;
  podcastSlats.computeBoundingSphere(); root.add(podcastSlats);

  const podcastCanvas = document.createElement('canvas');
  podcastCanvas.width = 1280; podcastCanvas.height = 800;
  const podcastCtx = podcastCanvas.getContext('2d');
  if (podcastCtx) {
    podcastCtx.save(); podcastCtx.translate(95, 335); podcastCtx.rotate(-0.12);
    podcastCtx.font = '900 105px Arial Black, Arial'; podcastCtx.lineWidth = 14;
    podcastCtx.strokeStyle = '#15231e'; podcastCtx.strokeText('TALK', 0, 0);
    podcastCtx.fillStyle = '#45e6cb'; podcastCtx.fillText('TALK', 0, 0);
    podcastCtx.restore();
    podcastCtx.save(); podcastCtx.translate(1000, 430); podcastCtx.rotate(0.08);
    podcastCtx.font = '900 92px Arial Black, Arial'; podcastCtx.lineWidth = 13;
    podcastCtx.strokeStyle = '#15231e'; podcastCtx.strokeText('LIVE', 0, 0);
    podcastCtx.fillStyle = '#ff62ae'; podcastCtx.fillText('LIVE', 0, 0);
    podcastCtx.restore();
    podcastCtx.fillStyle = '#f4d176'; podcastCtx.font = '900 54px Arial Black, Arial';
    podcastCtx.fillText('REC ●', 76, 565);
    podcastCtx.fillStyle = '#45e6cb'; podcastCtx.font = '900 45px ui-monospace, monospace';
    podcastCtx.fillText('#TAHA  #PODCAST', 815, 565);
    podcastCtx.lineCap = 'round'; podcastCtx.lineWidth = 13;
    podcastCtx.strokeStyle = '#ff62ae'; podcastCtx.beginPath(); podcastCtx.moveTo(46, 610); podcastCtx.bezierCurveTo(205, 520, 275, 710, 425, 598); podcastCtx.stroke();
    podcastCtx.strokeStyle = '#45e6cb'; podcastCtx.beginPath(); podcastCtx.moveTo(820, 630); podcastCtx.bezierCurveTo(945, 535, 1090, 707, 1230, 585); podcastCtx.stroke();
    for (let i = 0; i < 48; i++) {
      const x = (i * 173 + 37) % 1280, y = (i * 89 + 19) % 800;
      podcastCtx.fillStyle = ['#45e6cb','#ff62ae','#f4d176'][i % 3]; podcastCtx.globalAlpha = 0.8;
      podcastCtx.beginPath(); podcastCtx.arc(x, y, 3 + i % 6, 0, Math.PI * 2); podcastCtx.fill();
    }
    podcastCtx.globalAlpha = 1;
  }
  const podcastTexture = track.tex(new THREE.CanvasTexture(podcastCanvas)); podcastTexture.colorSpace = THREE.SRGBColorSpace;
  const podcastTags = new THREE.Mesh(track.geo(new THREE.PlaneGeometry(3.22, 2.02)), track.mat(new THREE.MeshBasicMaterial({ map: podcastTexture, transparent: true, toneMapped: false, depthWrite: false })));
  podcastTags.name = 'podcast-tag-wall'; podcastTags.position.set(podcastX, floorY + 1.62, -2.285); root.add(podcastTags);

  const logoCanvas = document.createElement('canvas'); logoCanvas.width = 512; logoCanvas.height = 256;
  const logoCtx = logoCanvas.getContext('2d');
  if (logoCtx) {
    logoCtx.fillStyle = '#f5df37'; logoCtx.fillRect(0, 0, 512, 256);
    logoCtx.strokeStyle = '#fff39b'; logoCtx.lineWidth = 9; logoCtx.strokeRect(12, 12, 488, 232);
    logoCtx.fillStyle = '#175544'; logoCtx.font = '900 68px Arial Black, Arial'; logoCtx.textAlign = 'center';
    logoCtx.fillText('TAHA', 256, 100); logoCtx.font = '900 48px Arial Black, Arial'; logoCtx.fillText('PODCAST STUDIO', 256, 162);
    logoCtx.font = '700 25px Arial'; logoCtx.fillText('TALK  •  CREATE  •  CONNECT', 256, 208);
  }
  const logoTexture = track.tex(new THREE.CanvasTexture(logoCanvas)); logoTexture.colorSpace = THREE.SRGBColorSpace;
  const podcastLogoFrame = new THREE.Mesh(track.geo(new THREE.BoxGeometry(1.42, 0.72, 0.06)), walnutMat);
  podcastLogoFrame.name = 'podcast-studio-sign-frame'; podcastLogoFrame.position.set(podcastX, floorY + 2.25, -2.25); root.add(podcastLogoFrame);
  const podcastLogo = new THREE.Mesh(track.geo(new THREE.PlaneGeometry(1.3, 0.6)), track.mat(new THREE.MeshBasicMaterial({ map: logoTexture, toneMapped: false })));
  podcastLogo.name = 'podcast-studio-sign'; podcastLogo.position.set(podcastX, floorY + 2.25, -2.215); root.add(podcastLogo);

  const podcastLedMats = [0x45e6cb, 0xff42bd, 0x9d64ff, 0xffc94f].map((color) => track.mat(new THREE.MeshBasicMaterial({ color, toneMapped: false })));
  addWallLed('podcast-led-top', 3.52, 0.04, podcastX, floorY + 2.75, podcastLedMats[0], -2.25);
  addWallLed('podcast-led-bottom', 3.52, 0.04, podcastX, floorY + 0.49, podcastLedMats[1], -2.25);
  addWallLed('podcast-led-left', 0.04, 2.3, podcastX - 1.74, floorY + 1.62, podcastLedMats[2], -2.25);
  addWallLed('podcast-led-right', 0.04, 2.3, podcastX + 1.74, floorY + 1.62, podcastLedMats[3], -2.25);
  const podcastCeilingLed = track.mat(new THREE.MeshBasicMaterial({ color: 0xe34cff, toneMapped: false }));
  const ceilingStrip = new THREE.Mesh(track.geo(new THREE.BoxGeometry(3.45, 0.035, 0.05)), podcastCeilingLed);
  ceilingStrip.name = 'podcast-ceiling-led-strip'; ceilingStrip.position.set(podcastX, floorY + WORLD_SCALE.roomHeight - 0.12, 0.5); root.add(ceilingStrip);
  const podcastCeilingWash = new THREE.PointLight(0xbf48ff, 2.2, 4.6, 1.5);
  podcastCeilingWash.name = 'podcast-ceiling-wash';
  podcastCeilingWash.position.set(podcastX, floorY + WORLD_SCALE.roomHeight - 0.28, 0.55); root.add(podcastCeilingWash);
  for (const [i, x] of [podcastX - 1.48, podcastX + 1.48].entries()) {
    const shelf = new THREE.Group(); shelf.name = `podcast-wall-shelf-${i + 1}`; shelf.position.set(x, floorY + 1.4, -2.18); root.add(shelf);
    addBox('podcast-shelf-board-top', [0.48, 0.07, 0.42], [0, 0.78, 0], walnutMat, shelf);
    addBox('podcast-shelf-board-middle', [0.48, 0.07, 0.42], [0, 0.08, 0], walnutMat, shelf);
    addBox('podcast-shelf-board-bottom', [0.48, 0.07, 0.42], [0, -0.62, 0], walnutMat, shelf);
    addBox('podcast-shelf-side-left', [0.045, 1.42, 0.38], [-0.22, 0.08, 0], graphite, shelf);
    addBox('podcast-shelf-side-right', [0.045, 1.42, 0.38], [0.22, 0.08, 0], graphite, shelf);
    addBox('podcast-on-air-lightbox', [0.32, 0.16, 0.06], [0, 0.47, 0.23], podcastLedMats[i], shelf);
    addBox('podcast-shelf-book', [0.22, 0.38, 0.16], [-0.08, -0.27, 0.04], blackGlass, shelf);
  }
  const podcastPinkWash = new THREE.PointLight(0xff42bd, 1.8, 3.2, 1.8);
  podcastPinkWash.name = 'podcast-pink-wash';
  podcastPinkWash.position.set(podcastX - 1.5, floorY + 1.65, -1.95); root.add(podcastPinkWash);
  const podcastTealWash = new THREE.PointLight(0x45e6cb, 1.8, 3.2, 1.8);
  podcastTealWash.name = 'podcast-teal-wash';
  podcastTealWash.position.set(podcastX + 1.5, floorY + 1.65, -1.95); root.add(podcastTealWash);

  const podcastRugMat = track.mat(new THREE.MeshStandardMaterial({ color: 0xb7ad9b, roughness: 0.98 }));
  addBox('podcast-area-rug', [3.48, 0.025, 3.7], [podcastX, floorY + 0.015, 0.35], podcastRugMat);
  const chairFrameMat = track.mat(new THREE.MeshStandardMaterial({ color: 0x67432c, roughness: 0.62, metalness: 0.06 }));
  const podcastUpholstery = track.mat(new THREE.MeshStandardMaterial({ color: 0xd6d3cb, roughness: 0.88 }));
  const addPodcastRoundedBox = (
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    material: THREE.Material,
    parent: THREE.Group,
    radius: number
  ) => {
    const mesh = new THREE.Mesh(track.geo(new RoundedBoxGeometry(...size, 5, radius)), material);
    mesh.name = name; mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
    return mesh;
  };
  const podcastSeatPositions = [podcastX - 0.78, podcastX + 0.78];
  for (const [index, x] of podcastSeatPositions.entries()) {
    const chair = new THREE.Group(); chair.name = `podcast-armchair-${index + 1}`;
    chair.position.set(x, floorY, 0.34); chair.rotation.y = index === 0 ? Math.PI + 0.38 : Math.PI - 0.38; root.add(chair);
    addPodcastRoundedBox('podcast-chair-seat', [0.74, 0.15, 0.68], [0, 0.52, 0], podcastUpholstery, chair, 0.07);
    addPodcastRoundedBox('podcast-chair-back', [0.72, 0.79, 0.14], [0, 0.98, 0.28], podcastUpholstery, chair, 0.065);
    for (const side of [-1, 1]) {
      addPodcastRoundedBox('podcast-chair-arm-wood', [0.09, 0.42, 0.62], [side * 0.4, 0.7, -0.01], chairFrameMat, chair, 0.035);
      addPodcastRoundedBox('podcast-chair-arm-pad', [0.15, 0.06, 0.58], [side * 0.4, 0.93, -0.01], walnutMat, chair, 0.025);
      for (const z of [-0.24, 0.24]) addPodcastRoundedBox('podcast-chair-leg', [0.065, 0.48, 0.065], [side * 0.31, 0.25, z], chairFrameMat, chair, 0.024);
    }
  }

  const podcastTable = new THREE.Group(); podcastTable.name = 'podcast-round-table';
  podcastTable.position.set(podcastX, floorY, 1.4); root.add(podcastTable);
  const roundTop = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.69, 0.72, 0.1, 40)), blackGlass);
  roundTop.name = 'podcast-round-table-top'; roundTop.position.y = 0.49; podcastTable.add(roundTop);
  const tableColumn = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.12, 0.17, 0.48, 20)), graphite);
  tableColumn.position.y = 0.24; podcastTable.add(tableColumn);
  const tableFoot = new THREE.Mesh(track.geo(new THREE.BoxGeometry(0.95, 0.07, 0.48)), graphite);
  tableFoot.position.y = 0.045; podcastTable.add(tableFoot);
  const vaseProfile = [new THREE.Vector2(0, 0), new THREE.Vector2(0.13, 0), new THREE.Vector2(0.2, 0.14), new THREE.Vector2(0.18, 0.32), new THREE.Vector2(0.08, 0.38), new THREE.Vector2(0.07, 0.51), new THREE.Vector2(0, 0.51)];
  const vase = new THREE.Mesh(track.geo(new THREE.LatheGeometry(vaseProfile, 24)), track.mat(new THREE.MeshStandardMaterial({ color: 0xf0eee5, roughness: 0.23, metalness: 0.04 })));
  vase.name = 'podcast-table-vase'; vase.position.set(0, 0.55, 0); podcastTable.add(vase);
  const flowerColors = [0xff6c83, 0xffbd58, 0xf4f0da, 0xa96cdb, 0xe9548b];
  for (let i = 0; i < 9; i++) {
    const angle = i * 2.4, endX = Math.cos(angle) * (0.1 + (i % 3) * 0.035), endZ = Math.sin(angle) * (0.1 + (i % 2) * 0.035);
    const stem = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.008, 0.012, 0.42 + (i % 3) * 0.055, 8)), track.mat(new THREE.MeshStandardMaterial({ color: 0x427a4d, roughness: 0.8 })));
    stem.position.set(endX * 0.48, 0.94 + (i % 3) * 0.027, endZ * 0.48); stem.rotation.z = endX * 1.8; stem.rotation.x = -endZ * 1.8; podcastTable.add(stem);
    const bloom = new THREE.Mesh(track.geo(new THREE.SphereGeometry(0.065, 14, 10)), track.mat(new THREE.MeshStandardMaterial({ color: flowerColors[i % flowerColors.length], roughness: 0.72 })));
    bloom.position.set(endX, 1.2 + (i % 3) * 0.055, endZ); podcastTable.add(bloom);
  }

  const podcastMicMat = track.mat(new THREE.MeshStandardMaterial({ color: 0x171d22, metalness: 0.72, roughness: 0.26 }));
  const podcastGrilleMat = track.mat(new THREE.MeshStandardMaterial({ color: 0x87949b, metalness: 0.84, roughness: 0.32 }));
  const makePodcastBar = (parent: THREE.Group, name: string, start: THREE.Vector3, end: THREE.Vector3, radius: number) => {
    const delta = new THREE.Vector3().subVectors(end, start);
    const bar = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(radius, radius, delta.length(), 10)), podcastMicMat);
    bar.name = name; bar.position.copy(start).add(end).multiplyScalar(0.5);
    bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); parent.add(bar);
  };
  for (const [index, side] of [-1, 1].entries()) {
    const micRig = new THREE.Group(); micRig.name = `podcast-boom-mic-${index + 1}`;
    micRig.position.set(podcastX + side * 1.44, floorY, -0.05); root.add(micRig);
    const base = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.15, 0.18, 0.035, 24)), podcastMicMat); base.position.y = 0.025; micRig.add(base);
    const pole = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.018, 0.024, 1.36, 12)), podcastMicMat); pole.position.y = 0.7; micRig.add(pole);
    const boomStart = new THREE.Vector3(0, 1.34, 0), boomEnd = new THREE.Vector3(-side * 0.82, 1.58, 0.22);
    makePodcastBar(micRig, 'podcast-mic-boom-arm', boomStart, boomEnd, 0.014);
    const capsule = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.043, 0.05, 0.2, 16)), podcastMicMat);
    capsule.position.copy(boomEnd).add(new THREE.Vector3(-side * 0.09, 0, 0)); capsule.rotation.z = side === -1 ? Math.PI / 2 : -Math.PI / 2; micRig.add(capsule);
    const grille = new THREE.Mesh(track.geo(new THREE.SphereGeometry(0.052, 16, 12)), podcastGrilleMat);
    grille.position.copy(capsule.position).add(new THREE.Vector3(-side * 0.1, 0, 0)); micRig.add(grille);
    const filter = new THREE.Mesh(track.geo(new THREE.TorusGeometry(0.09, 0.007, 8, 24)), podcastMicMat);
    filter.position.copy(capsule.position).add(new THREE.Vector3(0, -0.04, 0.14)); micRig.add(filter);
  }

  // Compact workout corner: rubber mat, padded bench, rack and a small barbell.
  const gymMat = track.mat(new THREE.MeshStandardMaterial({ color: 0x18251f, roughness: 0.94 }));
  const gymMetal = track.mat(new THREE.MeshStandardMaterial({ color: 0x333d40, metalness: 0.82, roughness: 0.3 }));
  addBox('mini-gym-mat', [1.9, 0.025, 1.9], [-7.3, floorY + 0.015, 3.75], gymMat);
  addBox('mini-gym-bench-pad', [0.48, 0.13, 1.22], [-7.3, floorY + 0.53, 3.82], blackGlass);
  for (const zOffset of [-0.42, 0.42]) addBox('mini-gym-bench-leg', [0.42, 0.48, 0.08], [-7.3, floorY + 0.25, 3.82 + zOffset], gymMetal);
  for (const xOffset of [-0.62, 0.62]) {
    addBox('mini-gym-rack-upright', [0.07, 1.55, 0.07], [-7.3 + xOffset, floorY + 0.78, 3.36], gymMetal);
    addBox('mini-gym-rack-foot', [0.17, 0.06, 0.48], [-7.3 + xOffset, floorY + 0.04, 3.36], graphite);
  }
  const bar = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.025, 0.025, 1.56, 16)), gymMetal);
  bar.name = 'mini-gym-barbell'; bar.rotation.z = Math.PI / 2; bar.position.set(-7.3, floorY + 1.4, 3.36); root.add(bar);
  for (const xOffset of [-0.66, 0.66]) {
    const plate = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.21, 0.21, 0.07, 20)), graphite);
    plate.name = 'mini-gym-weight-plate'; plate.rotation.z = Math.PI / 2; plate.position.set(-7.3 + xOffset, floorY + 1.4, 3.36); root.add(plate);
    const hub = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 16)), brassMat);
    hub.rotation.z = Math.PI / 2; hub.position.copy(plate.position); root.add(hub);
  }

  // Deep charcoal lounge sofa, with separated seat cushions and a softly channelled back.
  const sofa = new THREE.Group();
  sofa.name = 'gaming-sofa';
  sofa.position.set(6.2, floorY, 3.5);
  sofa.rotation.y = Math.PI / 2;
  root.add(sofa);
  const addSofaCushion = (name: string, size: [number, number, number], position: [number, number, number], material: THREE.Material) => {
    const mesh = new THREE.Mesh(track.geo(new RoundedBoxGeometry(...size, 5, 0.09)), material);
    mesh.name = name; mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; sofa.add(mesh);
    return mesh;
  };
  addSofaCushion('sofa-base', [2.75, 0.38, 1.12], [0, 0.39, 0], sofaFabric);
  addSofaCushion('sofa-back', [2.75, 0.86, 0.34], [0, 0.91, -0.39], sofaFabric);
  for (const x of [-1.08, 1.08]) {
    for (const z of [-0.36, 0.36]) {
      addBox('sofa-foot', [0.12, 0.21, 0.12], [x, 0.105, z], graphite, sofa);
    }
  }
  for (const side of [-1, 1]) {
    addSofaCushion('sofa-arm', [0.34, 0.68, 1.05], [side * 1.2, 0.62, 0], sofaFabric);
  }
  for (const x of [-0.84, 0, 0.84]) {
    addSofaCushion('sofa-seat-cushion', [0.82, 0.16, 0.78], [x, 0.66, 0.13], cushionFabric);
    const backCushion = addSofaCushion('sofa-back-cushion', [0.82, 0.67, 0.2], [x, 1.0, -0.2], cushionFabric);
    backCushion.rotation.z = x === 0 ? 0 : (x < 0 ? -0.035 : 0.035);
  }

  // Low coffee table between sofa and screen with a subtle brass edge.
  addBox('lounge-coffee-table-top', [0.78, 0.12, 1.28], [7.48, floorY + 0.43, 3.52], walnutMat);
  for (const xOffset of [-0.29, 0.29]) {
    for (const zOffset of [-0.47, 0.47]) {
      addBox('lounge-coffee-table-leg', [0.045, 0.4, 0.045], [7.48 + xOffset, floorY + 0.2, 3.52 + zOffset], brassMat);
    }
  }

  // A slim side wall anchors the television and separates the lounge from the desk zone.
  const sideWallMat = track.mat(new THREE.MeshStandardMaterial({ color: 0xe9e7e1, roughness: 0.9, metalness: 0.01 }));
  const sideWall = new THREE.Mesh(track.geo(new THREE.PlaneGeometry(7.4, WORLD_SCALE.roomHeight)), sideWallMat);
  sideWall.rotation.y = -Math.PI / 2;
  sideWall.position.set(9.55, floorY + WORLD_SCALE.roomHeight / 2, 2.5);
  root.add(sideWall);
  const featurePanelMat = track.mat(new THREE.MeshStandardMaterial({ color: 0xf4f2ed, roughness: 0.88 }));
  const featurePanelShadowMat = track.mat(new THREE.MeshStandardMaterial({ color: 0xe0ded8, roughness: 0.92 }));
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      const panel = addBox('tv-wall-relief-panel', [0.045, 0.72, 0.78], [9.52, floorY + 0.58 + row * 0.86, 1.45 + col * 0.86], row === 1 && col === 2 ? featurePanelShadowMat : featurePanelMat);
      panel.receiveShadow = true;
    }
  }
  const tvFrame = new THREE.Mesh(track.geo(new THREE.BoxGeometry(0.16, 1.52, 2.72)), graphite);
  tvFrame.name = 'bedroom-television-frame';
  tvFrame.scale.set(1, SCALE.television.height / 1.52, SCALE.television.width / 2.72);
  tvFrame.position.set(9.38, floorY + SCALE.television.centerHeight, 3.55);
  tvFrame.castShadow = true;
  root.add(tvFrame);
  const tvScreen = new THREE.Mesh(track.geo(new THREE.PlaneGeometry(2.55, 1.35)), screenMaterial);
  tvScreen.name = 'bedroom-television-screen';
  tvScreen.scale.set(SCALE.television.width / 2.55, SCALE.television.height / 1.35, 1);
  tvScreen.rotation.y = -Math.PI / 2;
  tvScreen.position.set(9.285, floorY + SCALE.television.centerHeight, 3.55);
  const arcadeCanvas = document.createElement('canvas');
  arcadeCanvas.width = 960; arcadeCanvas.height = 540;
  const arcadeCtx = arcadeCanvas.getContext('2d');
  const arcadeTexture = track.tex(new THREE.CanvasTexture(arcadeCanvas));
  arcadeTexture.colorSpace = THREE.SRGBColorSpace;
  const arcadeMaterial = track.mat(new THREE.MeshBasicMaterial({ map: arcadeTexture, toneMapped: false }));
  tvScreen.material = arcadeMaterial;
  const arcade = {
    active: false,
    gameOver: false,
    elapsed: 0,
    playerX: 0.5,
    playerY: 0.8,
    shield: 0,
    hazards: Array.from({ length: 8 }, (_, i) => ({ x: ((i * 37 + 13) % 91) / 100 + 0.04, y: -i * 83 - 30, speed: 150 + (i % 4) * 32, size: 12 + (i % 3) * 4 })),
  };
  const drawArcadeScreen = () => {
    if (!arcadeCtx) return;
    const ctx = arcadeCtx;
    const bg = ctx.createLinearGradient(0, 0, 960, 540);
    bg.addColorStop(0, '#091424'); bg.addColorStop(0.55, '#111b39'); bg.addColorStop(1, '#25133f');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 960, 540);
    ctx.strokeStyle = 'rgba(77, 230, 210, .13)'; ctx.lineWidth = 1;
    for (let x = 0; x <= 960; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 540); ctx.stroke(); }
    for (let y = 0; y <= 540; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(960, y); ctx.stroke(); }
    for (let i = 0; i < 76; i++) {
      ctx.fillStyle = i % 4 === 0 ? 'rgba(255, 98, 174, .72)' : 'rgba(226, 244, 255, .62)';
      ctx.fillRect((i * 139) % 960, (i * 83) % 540, i % 4 === 0 ? 3 : 2, i % 4 === 0 ? 3 : 2);
    }
    if (!arcade.active) {
      ctx.fillStyle = 'rgba(4, 11, 23, .77)'; ctx.fillRect(112, 74, 736, 392);
      ctx.strokeStyle = '#48e8d1'; ctx.lineWidth = 3; ctx.strokeRect(112, 74, 736, 392);
      ctx.textAlign = 'center'; ctx.shadowColor = '#4cebd6'; ctx.shadowBlur = 22;
      ctx.fillStyle = '#f4f8ff'; ctx.font = '900 27px Arial, sans-serif'; ctx.fillText('TAHA CONSOLE  /  HOME', 480, 132);
      ctx.shadowBlur = 0; ctx.fillStyle = '#ff5eb4'; ctx.font = '900 58px Arial Black, Arial'; ctx.fillText('NEON DODGE', 480, 234);
      ctx.fillStyle = '#c1d2e7'; ctx.font = '600 23px Arial, sans-serif'; ctx.fillText('Évite les météores et tiens le plus longtemps possible.', 480, 289);
      ctx.fillStyle = '#0e2932'; ctx.fillRect(331, 337, 298, 70);
      ctx.strokeStyle = '#48e8d1'; ctx.lineWidth = 2; ctx.strokeRect(331, 337, 298, 70);
      ctx.fillStyle = '#6effe4'; ctx.font = '800 25px Arial, sans-serif'; ctx.fillText(arcade.gameOver ? 'REJOUER' : 'PRÊT À JOUER', 480, 381);
      ctx.fillStyle = '#afbed1'; ctx.font = '500 17px Arial, sans-serif'; ctx.fillText('Installe-toi sur le canapé puis utilise le bouton « Jouer à la console »', 480, 438);
    } else {
      ctx.fillStyle = 'rgba(4, 10, 20, .72)'; ctx.fillRect(28, 24, 904, 48);
      ctx.textAlign = 'left'; ctx.fillStyle = '#f0f7ff'; ctx.font = '800 21px Arial, sans-serif'; ctx.fillText('NEON DODGE', 48, 55);
      ctx.textAlign = 'right'; ctx.fillStyle = '#65ffe2'; ctx.fillText(`SCORE  ${Math.floor(arcade.elapsed * 10)}`, 910, 55);
      ctx.textAlign = 'center';
      for (const hazard of arcade.hazards) {
        const x = hazard.x * 960, y = hazard.y;
        ctx.save(); ctx.translate(x, y); ctx.rotate(arcade.elapsed * 0.8);
        ctx.shadowColor = '#ff55a7'; ctx.shadowBlur = 18; ctx.fillStyle = '#ff58ad';
        ctx.fillRect(-hazard.size, -hazard.size, hazard.size * 2, hazard.size * 2);
        ctx.shadowBlur = 0; ctx.fillStyle = '#ffe6f3'; ctx.fillRect(-4, -4, 8, 8); ctx.restore();
      }
      const px = arcade.playerX * 960, py = arcade.playerY * 540;
      ctx.save(); ctx.translate(px, py); ctx.shadowColor = arcade.shield > 0 ? '#ffd866' : '#50f4df'; ctx.shadowBlur = 24;
      ctx.fillStyle = arcade.shield > 0 ? '#ffdb71' : '#54f5e0';
      ctx.beginPath(); ctx.moveTo(0, -27); ctx.lineTo(22, 22); ctx.lineTo(0, 14); ctx.lineTo(-22, 22); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#f5fbff'; ctx.beginPath(); ctx.arc(0, 1, 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      if (arcade.shield > 0) { ctx.strokeStyle = 'rgba(255, 218, 105, .82)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, 36, 0, Math.PI * 2); ctx.stroke(); }
    }
    arcadeTexture.needsUpdate = true;
  };
  const setConsolePlaying = (active: boolean) => {
    arcade.active = active; arcade.gameOver = false; arcade.elapsed = 0; arcade.playerX = 0.5; arcade.playerY = 0.8; arcade.shield = 0;
    arcade.hazards.forEach((hazard, i) => { hazard.x = ((i * 37 + 13) % 91) / 100 + 0.04; hazard.y = -i * 83 - 30; });
    drawArcadeScreen();
  };
  const moveConsolePlayer = (dx: number, dy: number) => {
    if (!arcade.active) return;
    arcade.playerX = THREE.MathUtils.clamp(arcade.playerX + dx * 0.065, 0.055, 0.945);
    arcade.playerY = THREE.MathUtils.clamp(arcade.playerY + dy * 0.055, 0.12, 0.9);
    drawArcadeScreen();
  };
  const activateConsoleShield = () => { if (arcade.active) { arcade.shield = 1.1; drawArcadeScreen(); } };
  const updateConsoleGame = (dt: number) => {
    if (!arcade.active) return;
    arcade.elapsed += dt; arcade.shield = Math.max(0, arcade.shield - dt);
    const px = arcade.playerX * 960, py = arcade.playerY * 540;
    for (const hazard of arcade.hazards) {
      hazard.y += hazard.speed * dt;
      if (hazard.y > 570) { hazard.y = -24 - Math.random() * 180; hazard.x = 0.05 + Math.random() * 0.9; }
      if (arcade.shield <= 0 && Math.hypot(hazard.x * 960 - px, hazard.y - py) < hazard.size + 18) {
        arcade.active = false; arcade.gameOver = true;
      }
    }
    drawArcadeScreen();
  };
  tvScreen.userData.setConsolePlaying = setConsolePlaying;
  tvScreen.userData.moveConsolePlayer = moveConsolePlayer;
  tvScreen.userData.activateConsoleShield = activateConsoleShield;
  tvScreen.userData.updateConsoleGame = updateConsoleGame;
  drawArcadeScreen();
  root.add(tvScreen);
  const tvGlow = new THREE.PointLight(0x7fc5ff, 0.8, 4.2, 1.8);
  tvGlow.name = 'bedroom-tv-glow';
  tvGlow.position.set(8.75, floorY + 2.5, 3.55);
  root.add(tvGlow);

  // Minimal white media table, grounded on the floor, with the console and controller on top.
  addBox('tv-media-console', [0.58, 0.2, 3.5], [8.98, floorY + 0.72, 3.55], whiteConsole);
  addBox('tv-media-console-leg-left', [0.1, 0.72, 0.1], [9.12, floorY + 0.36, 2.05], graphite);
  addBox('tv-media-console-leg-right', [0.1, 0.72, 0.1], [9.12, floorY + 0.36, 5.05], graphite);
  addBox('tv-media-console-cable-tray', [0.12, 0.07, 2.5], [9.15, floorY + 0.58, 3.55], graphite);
  addBox('tv-floating-plant-shelf', [0.32, 0.08, 3.72], [9.3, floorY + 2.13, 3.55], whiteConsole);
  const shelfPotMat = track.mat(new THREE.MeshStandardMaterial({ color: 0x9a9b94, roughness: 0.82 }));
  const shelfLeafMat = track.mat(new THREE.MeshStandardMaterial({ color: 0x55765a, roughness: 0.9 }));
  for (const z of [2.05, 2.78, 3.55, 4.32, 5.05]) {
    const pot = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.085, 0.065, 0.16, 18)), shelfPotMat);
    pot.position.set(9.27, floorY + 2.25, z); pot.castShadow = true; root.add(pot);
    for (const leafOffset of [-1, 0, 1]) {
      const leaf = new THREE.Mesh(track.geo(new THREE.SphereGeometry(0.075, 12, 10)), shelfLeafMat);
      leaf.scale.set(0.7, 1.75, 0.55);
      leaf.position.set(9.27 + Math.abs(leafOffset) * 0.025, floorY + 2.39 + (leafOffset === 0 ? 0.07 : 0), z + leafOffset * 0.075);
      leaf.rotation.z = leafOffset * -0.28; leaf.castShadow = true; root.add(leaf);
    }
  }
  const consoleShell = new THREE.Mesh(track.geo(new RoundedBoxGeometry(0.34, 0.95, 0.43, 7, 0.085)), whiteConsole);
  consoleShell.name = 'game-console-shell'; consoleShell.position.set(8.98, floorY + 1.295, 4.27); consoleShell.castShadow = true; root.add(consoleShell);
  // Curved split faceplates create the sculpted white wings of a real home console.
  for (const side of [-1, 1]) {
    const plateShape = new THREE.Shape();
    const inner = side * 0.082;
    const outer = side * 0.215;
    plateShape.moveTo(inner, -0.44);
    plateShape.bezierCurveTo(side * 0.17, -0.39, outer, -0.25, outer, -0.12);
    plateShape.lineTo(outer, 0.26);
    plateShape.bezierCurveTo(outer, 0.37, side * 0.16, 0.43, inner, 0.45);
    plateShape.lineTo(inner, -0.44);
    const plateGeo = track.geo(new THREE.ExtrudeGeometry(plateShape, { depth: 0.045, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.012, bevelThickness: 0.012 }));
    const plate = new THREE.Mesh(plateGeo, whiteConsole);
    plate.name = 'game-console-curved-faceplate';
    plate.rotation.y = Math.PI / 2;
    plate.position.set(8.79, floorY + 1.295, 4.27);
    plate.castShadow = true; plate.receiveShadow = true; root.add(plate);
  }
  const consoleCenter = new THREE.Mesh(track.geo(new RoundedBoxGeometry(0.035, 0.82, 0.2, 4, 0.014)), blackGlass);
  consoleCenter.name = 'game-console-center'; consoleCenter.position.set(8.765, floorY + 1.295, 4.27); root.add(consoleCenter);
  addBox('game-console-led', [0.012, 0.035, 0.035], [8.744, floorY + 1.67, 4.27], blueLed);
  addBox('game-console-power-button', [0.014, 0.025, 0.025], [8.744, floorY + 0.94, 4.27], greenLed);
  for (const z of [4.225, 4.315]) addBox('game-console-usb-port', [0.014, 0.035, 0.022], [8.744, floorY + 0.91, z], graphite);
  const consoleFoot = new THREE.Mesh(track.geo(new RoundedBoxGeometry(0.38, 0.035, 0.3, 5, 0.035)), graphite);
  consoleFoot.name = 'game-console-stand'; consoleFoot.position.set(8.98, floorY + 0.837, 4.27); root.add(consoleFoot);
  for (let i = 0; i < 7; i++) addBox('game-console-vent', [0.012, 0.012, 0.23], [9.07, floorY + 1.03 + i * 0.045, 4.27], graphite);
  const controller = new THREE.Group();
  controller.name = 'dual-sense-controller';
  controller.position.set(8.98, floorY + 0.885, 2.72);
  const controllerShell = new THREE.Mesh(track.geo(new RoundedBoxGeometry(0.32, 0.065, 0.2, 6, 0.03)), whiteConsole);
  controllerShell.castShadow = true; controller.add(controllerShell);
  for (const side of [-1, 1]) {
    const grip = new THREE.Mesh(track.geo(new RoundedBoxGeometry(0.105, 0.075, 0.14, 5, 0.035)), whiteConsole);
    grip.position.set(side * 0.11, -0.027, 0.035); grip.rotation.z = side * 0.2;
    controller.add(grip);
  }
  const controllerTouchpad = new THREE.Mesh(track.geo(new RoundedBoxGeometry(0.1, 0.009, 0.055, 3, 0.008)), graphite);
  controllerTouchpad.position.set(0, 0.038, 0.005); controller.add(controllerTouchpad);
  for (const x of [-0.055, 0.055]) {
    const stick = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.018, 0.02, 0.015, 14)), graphite);
    stick.position.set(x, 0.04, -0.045); controller.add(stick);
  }
  for (const [i, color] of [0x55d9c1, 0x69a9ff, 0xff6e9f, 0xf2cf67].entries()) {
    const button = new THREE.Mesh(track.geo(new THREE.SphereGeometry(0.012, 12, 8)), track.mat(new THREE.MeshBasicMaterial({ color, toneMapped: false })));
    button.position.set(0.105 + (i % 2) * 0.025, 0.04, -0.035 + Math.floor(i / 2) * 0.025); controller.add(button);
  }
  const dpad = new THREE.Mesh(track.geo(new RoundedBoxGeometry(0.07, 0.012, 0.018, 3, 0.006)), graphite);
  dpad.position.set(-0.105, 0.04, -0.035); controller.add(dpad);
  const controllerLed = new THREE.Mesh(track.geo(new THREE.BoxGeometry(0.06, 0.009, 0.012)), blueLed);
  controllerLed.position.set(0, 0.04, 0.065); controller.add(controllerLed);
  root.add(controller);
}

/**
 * Upgrades the walnut desk with architectural steel trestle legs, under-desk 3-drawer walnut credenza,
 * cable grommet, articulated studio desk lamp, and ceramic planter.
 */
/** Groups and relocates the podcast wall decor and bedroom window as one rigid assembly. */
export function buildPodcastWall(root: THREE.Group) {
  const isPodcastWallDecoration = (name: string) =>
    name === 'bedroom-window' ||
    name === 'podcast-acoustic-panel' ||
    name === 'podcast-acoustic-walnut-slats' ||
    name === 'podcast-tag-wall' ||
    name === 'podcast-studio-sign-frame' ||
    name === 'podcast-studio-sign' ||
    name.startsWith('podcast-led-') ||
    name.startsWith('podcast-wall-shelf-') ||
    name === 'podcast-ceiling-led-strip' ||
    name === 'podcast-ceiling-wash' ||
    name === 'podcast-pink-wash' ||
    name === 'podcast-teal-wash';
  const decorations = root.children.filter((child) => isPodcastWallDecoration(child.name));
  const floor = root.getObjectByName('room-floor');
  const wallSegments = root.children.filter((child) => child.name.startsWith('room-left-wall-segment-'));
  if (decorations.length === 0 || !floor || wallSegments.length === 0) return;

  root.updateMatrixWorld(true);
  const roomBounds = new THREE.Box3().setFromObject(floor);
  const sourceBounds = new THREE.Box3();
  for (const decoration of decorations) sourceBounds.union(new THREE.Box3().setFromObject(decoration));

  const podcastWall = new THREE.Group();
  podcastWall.name = 'podcastWall';
  podcastWall.position.copy(sourceBounds.getCenter(new THREE.Vector3()));
  root.add(podcastWall);
  root.updateMatrixWorld(true);
  for (const decoration of decorations) podcastWall.attach(decoration);

  // The back wall is the original placement; restore the cluster there without rotating it.
  if (TARGET_WALL === 'back') {
    podcastWall.position.copy(sourceBounds.getCenter(new THREE.Vector3()));
    podcastWall.rotation.y = 0;
    root.updateMatrixWorld(true);
    return;
  }

  // The left wall's inward-facing surface is the maximum X of its measured wall boxes.
  podcastWall.position.set(0, 0, 0);
  podcastWall.rotation.y = TARGET_WALL === 'left' ? Math.PI / 2 : TARGET_WALL === 'right' ? -Math.PI / 2 : TARGET_WALL === 'back' ? 0 : Math.PI;
  root.updateMatrixWorld(true);
  const rotatedBounds = new THREE.Box3().setFromObject(podcastWall);
  const segmentBounds = wallSegments.map((segment) => new THREE.Box3().setFromObject(segment));
  const leftWallThickness = Math.max(...segmentBounds.map((bounds) => bounds.max.x - bounds.min.x));
  const wallSurfaceX = roomBounds.min.x + leftWallThickness / 2;
  const groupWidthOnWall = rotatedBounds.max.z - rotatedBounds.min.z;
  const clearance = 0.08;
  const freeWallMin = Math.max(roomBounds.min.z, Math.min(...segmentBounds.map((bounds) => bounds.min.z))) + clearance;
  const creatorMural = root.getObjectByName('creator-neon-mural-backing');
  const muralBounds = creatorMural ? new THREE.Box3().setFromObject(creatorMural) : null;
  const freeWallMax = Math.min(
    ...segmentBounds.map((bounds) => bounds.max.z),
    (muralBounds?.min.z ?? Infinity) - clearance
  );

  // The free interval before the creator mural keeps the group clear of the mural, door, and corners.
  const groupCenterZ = freeWallMax - groupWidthOnWall / 2;
  podcastWall.position.set(
    wallSurfaceX + 0.03 - rotatedBounds.min.x,
    sourceBounds.getCenter(new THREE.Vector3()).y,
    groupCenterZ - (rotatedBounds.min.z + rotatedBounds.max.z) / 2
  );
  root.updateMatrixWorld(true);
}

export function buildExecutiveDeskDetails(
  root: THREE.Group,
  track: Tracker,
  walnutMat: THREE.Material,
  darkSteelMat: THREE.Material,
  brassMat: THREE.Material,
  floorY: number
) {
  // 1. Architectural Steel Trestle Frame + Leveling Pads (floorY .. -0.155)
  const legHeight = -0.155 - floorY;
  const legCenterY = floorY + legHeight / 2;
  const postGeo = track.geo(new THREE.BoxGeometry(0.072, legHeight, 0.072));
  const footPadGeo = track.geo(new THREE.CylinderGeometry(0.048, 0.054, 0.024, 16));

  for (const lx of [-2.24, 2.32]) {
    for (const lz of [-0.98, 1.08]) {
      const post = new THREE.Mesh(postGeo, darkSteelMat);
      post.position.set(lx, legCenterY, lz);
      post.castShadow = true;
      root.add(post);

      const pad = new THREE.Mesh(footPadGeo, brassMat);
      pad.position.set(lx, floorY + 0.012, lz);
      root.add(pad);
    }
    // Lower horizontal stretcher connecting front & back leg on each side
    const sideStretcher = new THREE.Mesh(
      track.geo(new THREE.BoxGeometry(0.056, 0.056, 2.06)),
      darkSteelMat
    );
    sideStretcher.position.set(lx, floorY + 0.14, 0.05);
    root.add(sideStretcher);
  }
  // Rear cross-beam stiffening the steel frame
  const rearBeam = new THREE.Mesh(
    track.geo(new THREE.BoxGeometry(4.56, 0.065, 0.055)),
    darkSteelMat
  );
  rearBeam.position.set(0.04, -0.24, -0.98);
  root.add(rearBeam);

  // 2. Under-Desk 3-Drawer Walnut Pedestal Cabinet (left-inner side, grounded on floorY)
  const cabGroup = new THREE.Group();
  cabGroup.position.set(-1.72, floorY, -0.02);
  root.add(cabGroup);

  const cabW = 1.08;
  const cabD = 1.62;
  const cabH = -0.175 - floorY;
  const cabPlinthH = 0.04;
  const cabBodyH = cabH - cabPlinthH;

  const cabPlinth = new THREE.Mesh(
    track.geo(new THREE.BoxGeometry(cabW - 0.08, cabPlinthH, cabD - 0.08)),
    darkSteelMat
  );
  cabPlinth.position.y = cabPlinthH / 2;
  cabGroup.add(cabPlinth);

  const cabBody = new THREE.Mesh(
    track.geo(new THREE.BoxGeometry(cabW, cabBodyH, cabD)),
    walnutMat
  );
  cabBody.position.y = cabPlinthH + cabBodyH / 2;
  cabBody.castShadow = true;
  cabBody.receiveShadow = true;
  cabGroup.add(cabBody);

  const drawerH = (cabBodyH - 0.09) / 3;
  const drawerFaceGeo = track.geo(new THREE.BoxGeometry(cabW - 0.08, drawerH - 0.028, 0.028));
  const pullGeo = track.geo(new THREE.BoxGeometry(0.30, 0.018, 0.032));
  for (let d = 0; d < 3; d++) {
    const dy = cabPlinthH + 0.045 + (d + 0.5) * drawerH;
    const face = new THREE.Mesh(drawerFaceGeo, walnutMat);
    face.position.set(0, dy, cabD / 2 + 0.012);
    cabGroup.add(face);

    const pull = new THREE.Mesh(pullGeo, brassMat);
    pull.position.set(0, dy + drawerH * 0.24, cabD / 2 + 0.034);
    cabGroup.add(pull);
  }
  const rightCabinet = cabGroup.clone(true);
  rightCabinet.name = 'desk-right-cabinet';
  rightCabinet.position.x = 1.72;
  root.add(rightCabinet);

  // 3. Flush Desk Cable Grommet Ring (back-left where USB-C cable drops)
  const grommetRing = new THREE.Mesh(
    track.geo(new THREE.CylinderGeometry(0.082, 0.082, 0.012, 24)),
    darkSteelMat
  );
  grommetRing.position.set(-1.58, -0.013, -1.04);
  root.add(grommetRing);

  const grommetCore = new THREE.Mesh(
    track.geo(new THREE.CylinderGeometry(0.056, 0.056, 0.014, 24)),
    track.mat(new THREE.MeshStandardMaterial({ color: 0x090b0a, roughness: 0.9 }))
  );
  grommetCore.position.set(-1.58, -0.012, -1.04);
  root.add(grommetCore);

  // 4. Articulated Architect Studio Desk Lamp (back-left of walnut desktop, y = -0.016)
  const lampGroup = new THREE.Group();
  lampGroup.name = 'desk-lamp';
  lampGroup.visible = false;
  lampGroup.scale.setScalar(0.7);
  lampGroup.position.set(-1.98, -0.016, -1.04);
  lampGroup.rotation.y = 0.42;
  root.add(lampGroup);

  const lampEnamelMat = track.mat(
    new THREE.MeshPhysicalMaterial({
      color: 0x163f2e,
      roughness: 0.28,
      metalness: 0.15,
      clearcoat: 0.7,
    })
  );
  const lampBase = new THREE.Mesh(
    track.geo(new THREE.CylinderGeometry(0.20, 0.22, 0.048, 28)),
    darkSteelMat
  );
  lampBase.position.y = 0.024;
  lampBase.castShadow = true;
  lampGroup.add(lampBase);

  const lampStem = new THREE.Mesh(
    track.geo(new THREE.CylinderGeometry(0.024, 0.024, 0.07, 16)),
    brassMat
  );
  lampStem.position.y = 0.072;
  lampGroup.add(lampStem);

  const lowerArm = new THREE.Mesh(
    track.geo(new THREE.CylinderGeometry(0.015, 0.015, 0.64, 12)),
    darkSteelMat
  );
  lowerArm.rotation.z = 0.34;
  lowerArm.position.set(-0.10, 0.38, 0);
  lowerArm.castShadow = true;
  lampGroup.add(lowerArm);

  const elbowJoint = new THREE.Mesh(
    track.geo(new THREE.SphereGeometry(0.026, 16, 12)),
    brassMat
  );
  elbowJoint.position.set(-0.20, 0.67, 0);
  lampGroup.add(elbowJoint);

  const upperArm = new THREE.Mesh(
    track.geo(new THREE.CylinderGeometry(0.013, 0.013, 0.62, 12)),
    darkSteelMat
  );
  upperArm.rotation.z = -0.86;
  upperArm.position.set(0.03, 0.88, 0);
  upperArm.castShadow = true;
  lampGroup.add(upperArm);

  const headPivot = new THREE.Mesh(
    track.geo(new THREE.CylinderGeometry(0.02, 0.02, 0.048, 16)),
    brassMat
  );
  headPivot.rotation.x = Math.PI / 2;
  headPivot.position.set(0.26, 1.08, 0);
  lampGroup.add(headPivot);

  const shadePoints = [
    new THREE.Vector2(0.01, 0.16),
    new THREE.Vector2(0.05, 0.15),
    new THREE.Vector2(0.14, 0.07),
    new THREE.Vector2(0.19, 0.0),
    new THREE.Vector2(0.175, 0.0),
    new THREE.Vector2(0.125, 0.065),
    new THREE.Vector2(0.01, 0.14),
  ];
  const shadeMesh = new THREE.Mesh(
    track.geo(new THREE.LatheGeometry(shadePoints, 28)),
    lampEnamelMat
  );
  shadeMesh.position.set(0.31, 0.94, 0);
  shadeMesh.rotation.z = -0.35;
  shadeMesh.castShadow = true;
  lampGroup.add(shadeMesh);

  const bulbMesh = new THREE.Mesh(
    track.geo(new THREE.SphereGeometry(0.052, 16, 12)),
    track.mat(new THREE.MeshBasicMaterial({ color: 0xffe6ba }))
  );
  bulbMesh.position.set(0.32, 0.96, 0);
  lampGroup.add(bulbMesh);

  // 5. Fluted Ceramic Planter & Sculpted Studio Foliage (back-right of walnut desktop, y = -0.016)
  const plantGroup = new THREE.Group();
  plantGroup.position.set(2.04, -0.016, -1.0);
  root.add(plantGroup);

  const potProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.15, 0.0),
    new THREE.Vector2(0.20, 0.24),
    new THREE.Vector2(0.21, 0.36),
    new THREE.Vector2(0.19, 0.36),
    new THREE.Vector2(0.17, 0.28),
    new THREE.Vector2(0.0, 0.28),
  ];
  const potMat = track.mat(
    new THREE.MeshStandardMaterial({ color: 0xe7dfd1, roughness: 0.72, metalness: 0.02 })
  );
  const potMesh = new THREE.Mesh(track.geo(new THREE.LatheGeometry(potProfile, 28)), potMat);
  potMesh.castShadow = true;
  potMesh.receiveShadow = true;
  plantGroup.add(potMesh);

  const soilMesh = new THREE.Mesh(
    track.geo(new THREE.CircleGeometry(0.175, 24)),
    track.mat(new THREE.MeshStandardMaterial({ color: 0x261a12, roughness: 0.96 }))
  );
  soilMesh.rotation.x = -Math.PI / 2;
  soilMesh.position.y = 0.295;
  plantGroup.add(soilMesh);

  // Sculpted organic foliage leaves
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(0.11, 0.08, 0.12, 0.25, 0, 0.34);
  leafShape.bezierCurveTo(-0.12, 0.25, -0.11, 0.08, 0, 0);
  const leafGeo = track.geo(
    new THREE.ExtrudeGeometry(leafShape, {
      depth: 0.008,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelSegments: 1,
    })
  );
  const leafMat = track.mat(
    new THREE.MeshStandardMaterial({ color: 0x23593e, roughness: 0.44, metalness: 0.04 })
  );
  const leafSpecs = [
    { rotY: 0.2, tiltX: -0.58, scale: 1.0, y: 0.34 },
    { rotY: 1.45, tiltX: -0.72, scale: 0.92, y: 0.32 },
    { rotY: 2.65, tiltX: -0.52, scale: 1.08, y: 0.36 },
    { rotY: 3.9, tiltX: -0.68, scale: 0.88, y: 0.31 },
    { rotY: 5.1, tiltX: -0.46, scale: 0.96, y: 0.35 },
    { rotY: 0.85, tiltX: -0.24, scale: 0.82, y: 0.42 },
  ];
  for (const lf of leafSpecs) {
    const stem = new THREE.Mesh(
      track.geo(new THREE.CylinderGeometry(0.012, 0.015, 0.22, 8)),
      leafMat
    );
    stem.position.set(Math.sin(lf.rotY) * 0.04, 0.34, Math.cos(lf.rotY) * 0.04);
    stem.rotation.y = lf.rotY;
    stem.rotation.x = -0.35;
    plantGroup.add(stem);

    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(Math.sin(lf.rotY) * 0.07, lf.y, Math.cos(lf.rotY) * 0.07);
    leaf.rotation.order = 'YXZ';
    leaf.rotation.y = lf.rotY;
    leaf.rotation.x = lf.tiltX;
    leaf.scale.setScalar(lf.scale);
    leaf.castShadow = true;
    plantGroup.add(leaf);
  }
}

/**
 * Builds a 10-part sculpted executive/ergonomic studio office chair ("chaise améliorée")
 * grounded bottom-center at floorY = 0 in local space: 5-star caster base, pneumatic cylinder,
 * molded walnut shells, ribbed dark emerald-charcoal leather cushions, armrests, and lumbar headrest.
 */
export function buildErgonomicChair(
  root: THREE.Group,
  track: Tracker,
  walnutMat: THREE.Material,
  darkSteelMat: THREE.Material,
  brassMat: THREE.Material,
  floorY: number
) {
  const chair = new THREE.Group();
  chair.name = 'office-chair';
  chair.position.set(0, floorY, 0.82);
  chair.rotation.y = Math.PI;
  chair.scale.set(
    SCALE.officeChair.seatWidth / (0.92 * SCALE.desk.transform.x),
    SCALE.officeChair.totalHeight / (2.02 * SCALE.desk.transform.y),
    SCALE.officeChair.seatDepth / (0.84 * SCALE.desk.transform.z)
  );
  root.add(chair);

  const leatherMat = track.mat(
    new THREE.MeshPhysicalMaterial({
      color: 0x1a2621,
      roughness: 0.56,
      metalness: 0.02,
      clearcoat: 0.14,
      clearcoatRoughness: 0.52,
    })
  );
  const chromeMat = track.mat(
    new THREE.MeshStandardMaterial({
      color: 0xcfd6d2,
      metalness: 0.94,
      roughness: 0.18,
      envMapIntensity: 1.35,
    })
  );

  // 1. 5-Star Cast Aluminum Spider Base + Dual-Wheel Casters (y = 0 .. 0.16)
  const hubMesh = new THREE.Mesh(
    track.geo(new THREE.CylinderGeometry(0.11, 0.13, 0.10, 24)),
    chromeMat
  );
  hubMesh.position.y = 0.14;
  hubMesh.castShadow = true;
  chair.add(hubMesh);

  const starArmGeo = track.geo(new THREE.BoxGeometry(0.068, 0.042, 0.58));
  const casterWheelGeo = track.geo(new THREE.CylinderGeometry(0.048, 0.048, 0.056, 18));
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5;
    const armPivot = new THREE.Group();
    armPivot.rotation.y = angle;
    chair.add(armPivot);

    const arm = new THREE.Mesh(starArmGeo, chromeMat);
    arm.position.set(0, 0.115, 0.29);
    arm.rotation.x = 0.08;
    arm.castShadow = true;
    armPivot.add(arm);

    const stem = new THREE.Mesh(
      track.geo(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 12)),
      darkSteelMat
    );
    stem.position.set(0, 0.072, 0.55);
    armPivot.add(stem);

    const wheel = new THREE.Mesh(casterWheelGeo, darkSteelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, 0.048, 0.55);
    wheel.castShadow = true;
    armPivot.add(wheel);
  }

  // Snap the scaled caster assembly to the room floor in world space.
  root.updateMatrixWorld(true);
  const chairBounds = new THREE.Box3().setFromObject(chair);
  chair.position.y += (floorY - chairBounds.min.y) / root.scale.y;

  // 2. Pneumatic Gas-Lift Cylinder & Tilt Mechanism (y = 0.18 .. 0.88)
  const pistonOuter = new THREE.Mesh(
    track.geo(new THREE.CylinderGeometry(0.054, 0.064, 0.42, 20)),
    darkSteelMat
  );
  pistonOuter.position.y = 0.39;
  chair.add(pistonOuter);

  const pistonChrome = new THREE.Mesh(
    track.geo(new THREE.CylinderGeometry(0.036, 0.036, 0.34, 20)),
    chromeMat
  );
  pistonChrome.position.y = 0.72;
  chair.add(pistonChrome);

  const tiltHousing = new THREE.Mesh(
    track.geo(new THREE.BoxGeometry(0.32, 0.08, 0.34)),
    darkSteelMat
  );
  tiltHousing.position.set(0, 0.89, -0.02);
  chair.add(tiltHousing);

  // 3. Molded Walnut Seat Shell + Contoured Ribbed Leather Cushion (seat top y ≈ 1.00 above floor = -0.42 world)
  const seatW = 0.92;
  const seatD = 0.84;
  const seatShellGeo = track.geo(
    new THREE.ExtrudeGeometry(createRoundedShape(seatW, seatD, 0.16), {
      depth: 0.035,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.02,
      bevelSegments: 4,
    })
  );
  seatShellGeo.rotateX(-Math.PI / 2);
  const seatShell = new THREE.Mesh(seatShellGeo, walnutMat);
  seatShell.position.set(0, 0.92, 0.02);
  seatShell.castShadow = true;
  seatShell.receiveShadow = true;
  chair.add(seatShell);

  const seatCushionGeo = track.geo(
    new THREE.ExtrudeGeometry(createRoundedShape(seatW - 0.08, seatD - 0.08, 0.14), {
      depth: 0.068,
      bevelEnabled: true,
      bevelThickness: 0.024,
      bevelSize: 0.024,
      bevelSegments: 5,
    })
  );
  seatCushionGeo.rotateX(-Math.PI / 2);
  const seatCushion = new THREE.Mesh(seatCushionGeo, leatherMat);
  seatCushion.position.set(0, 0.97, 0.03);
  seatCushion.castShadow = true;
  seatCushion.receiveShadow = true;
  chair.add(seatCushion);

  // 4. Swept Brushed-Aluminum Spine Uprights connecting Seat to Backrest
  const spineGeo = track.geo(new THREE.BoxGeometry(0.065, 0.62, 0.045));
  for (const sx of [-0.16, 0.16]) {
    const spine = new THREE.Mesh(spineGeo, chromeMat);
    spine.position.set(sx, 1.18, -0.44);
    spine.rotation.x = -0.18;
    spine.castShadow = true;
    chair.add(spine);
  }

  // 5. Bent-Walnut Backrest Outer Shell + Ribbed Leather Back Pads + Headrest (y = 1.08 .. 1.98)
  const backGroup = new THREE.Group();
  backGroup.position.set(0, 1.46, -0.42);
  backGroup.rotation.x = -0.14;
  chair.add(backGroup);

  const backShellGeo = track.geo(
    new THREE.ExtrudeGeometry(createRoundedShape(0.84, 0.82, 0.16), {
      depth: 0.032,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.018,
      bevelSegments: 4,
    })
  );
  const backShell = new THREE.Mesh(backShellGeo, walnutMat);
  backShell.position.z = -0.032;
  backShell.castShadow = true;
  backShell.receiveShadow = true;
  backGroup.add(backShell);

  // Sculpted horizontally-ribbed leather cushions on backrest
  const ribGeo = track.geo(
    new THREE.ExtrudeGeometry(createRoundedShape(0.74, 0.15, 0.06), {
      depth: 0.044,
      bevelEnabled: true,
      bevelThickness: 0.016,
      bevelSize: 0.014,
      bevelSegments: 4,
    })
  );
  for (let r = 0; r < 4; r++) {
    const rib = new THREE.Mesh(ribGeo, leatherMat);
    rib.position.set(0, -0.26 + r * 0.175, 0.005);
    rib.castShadow = true;
    backGroup.add(rib);
  }

  // Sculpted upper headrest cushion
  const headRest = new THREE.Mesh(
    track.geo(
      new THREE.ExtrudeGeometry(createRoundedShape(0.46, 0.22, 0.09), {
        depth: 0.048,
        bevelEnabled: true,
        bevelThickness: 0.016,
        bevelSize: 0.014,
        bevelSegments: 4,
      })
    ),
    leatherMat
  );
  headRest.position.set(0, 0.54, 0.015);
  headRest.castShadow = true;
  backGroup.add(headRest);

  const headNeck = new THREE.Mesh(
    track.geo(new THREE.BoxGeometry(0.14, 0.14, 0.032)),
    brassMat
  );
  headNeck.position.set(0, 0.42, -0.015);
  backGroup.add(headNeck);

  // 6. Sculpted Aluminum + Soft-Touch Armrests (left & right)
  const armPostGeo = track.geo(new THREE.BoxGeometry(0.042, 0.30, 0.048));
  const armPadGeo = track.geo(
    new THREE.ExtrudeGeometry(createRoundedShape(0.12, 0.52, 0.05), {
      depth: 0.035,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 3,
    })
  );
  armPadGeo.rotateX(-Math.PI / 2);
  for (const ax of [-0.52, 0.52]) {
    const post = new THREE.Mesh(armPostGeo, chromeMat);
    post.position.set(ax, 1.07, 0.02);
    post.castShadow = true;
    chair.add(post);

    const bracket = new THREE.Mesh(
      track.geo(new THREE.BoxGeometry(0.12, 0.036, 0.05)),
      chromeMat
    );
    bracket.position.set(ax * 0.88, 0.93, 0.02);
    chair.add(bracket);

    const pad = new THREE.Mesh(armPadGeo, leatherMat);
    pad.position.set(ax, 1.23, 0.06);
    pad.castShadow = true;
    chair.add(pad);
  }
}

/** Lightweight black mesh task chair matching the replacement workstation reference. */
export function buildMeshOfficeChair(
  root: THREE.Group,
  track: Tracker,
  floorY: number,
  x = 0,
  z = 0.82,
  name = 'office-chair',
  size = 1,
  rotationY = 0
) {
  const chair = new THREE.Group();
  chair.name = name;
  chair.position.set(x, floorY, z);
  chair.rotation.y = rotationY;
  chair.scale.setScalar(size);
  root.add(chair);

  const frame = track.mat(new THREE.MeshStandardMaterial({ color: 0x171b1a, metalness: 0.42, roughness: 0.38 }));
  const meshMaterial = track.mat(new THREE.MeshStandardMaterial({ color: 0x252b29, metalness: 0.02, roughness: 0.92, side: THREE.DoubleSide, wireframe: true }));
  const cushion = track.mat(new THREE.MeshStandardMaterial({ color: 0x202523, roughness: 0.94 }));
  const softAccent = track.mat(new THREE.MeshStandardMaterial({ color: 0x34473e, roughness: 0.9 }));

  const seat = new THREE.Mesh(track.geo(new RoundedBoxGeometry(0.54, 0.075, 0.5, 4, 0.055)), cushion);
  seat.name = 'office-chair-seat';
  seat.position.set(0, 0.465, 0);
  seat.castShadow = true; seat.receiveShadow = true; chair.add(seat);
  const seatPad = new THREE.Mesh(track.geo(new RoundedBoxGeometry(0.5, 0.055, 0.46, 4, 0.045)), softAccent);
  seatPad.position.set(0, 0.515, -0.012);
  seatPad.castShadow = true; chair.add(seatPad);

  // Thin perimeter rails and a breathable grid replace the old solid, oversized back.
  const backMesh = new THREE.Mesh(track.geo(new THREE.PlaneGeometry(0.47, 0.46, 10, 12)), meshMaterial);
  backMesh.name = 'office-chair-mesh-back';
  backMesh.position.set(0, 0.8, 0.245);
  chair.add(backMesh);
  const backRails = [
    [[0.04, 0.48, 0.045], [-0.255, 0.8, 0.25]],
    [[0.04, 0.48, 0.045], [0.255, 0.8, 0.25]],
    [[0.52, 0.04, 0.045], [0, 1.04, 0.25]],
    [[0.52, 0.04, 0.045], [0, 0.55, 0.25]],
  ] as const;
  for (const [size, position] of backRails) {
    const rail = new THREE.Mesh(track.geo(new RoundedBoxGeometry(size[0], size[1], size[2], 3, 0.018)), frame);
    rail.position.set(position[0], position[1], position[2]);
    rail.castShadow = true; chair.add(rail);
  }
  const lumbar = new THREE.Mesh(track.geo(new RoundedBoxGeometry(0.36, 0.12, 0.075, 3, 0.035)), softAccent);
  lumbar.name = 'office-chair-lumbar';
  lumbar.position.set(0, 0.73, 0.205);
  chair.add(lumbar);

  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(track.geo(new THREE.BoxGeometry(0.035, 0.24, 0.035)), frame);
    post.position.set(side * 0.29, 0.57, 0.005);
    chair.add(post);
    const armrest = new THREE.Mesh(track.geo(new RoundedBoxGeometry(0.095, 0.045, 0.38, 3, 0.02)), cushion);
    armrest.position.set(side * 0.31, 0.69, -0.015);
    armrest.castShadow = true; chair.add(armrest);
  }

  const piston = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.042, 0.055, 0.34, 18)), frame);
  piston.position.y = 0.255;
  chair.add(piston);
  const hub = new THREE.Mesh(track.geo(new THREE.CylinderGeometry(0.085, 0.1, 0.06, 20)), frame);
  hub.position.y = 0.105;
  chair.add(hub);
  for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI * 2 / 5;
    const spoke = new THREE.Mesh(track.geo(new THREE.BoxGeometry(0.035, 0.035, 0.46)), frame);
    spoke.position.set(Math.sin(angle) * 0.13, 0.055, Math.cos(angle) * 0.13);
    spoke.rotation.y = angle;
    chair.add(spoke);
    const wheel = new THREE.Mesh(track.geo(new THREE.SphereGeometry(0.047, 14, 10)), frame);
    wheel.scale.set(1.25, 0.72, 0.8);
    wheel.position.set(Math.sin(angle) * 0.29, 0.036, Math.cos(angle) * 0.29);
    chair.add(wheel);
  }
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(chair);
  chair.position.y += floorY - bounds.min.y;
}

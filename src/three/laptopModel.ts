import * as THREE from 'three';
import { SCALE, WORLD_SCALE } from '../config/scale';
import type { ChassisFinish } from '../data/portfolio';
import {
  createBrushedMetalMaps,
  createContactShadowTexture,
  createDeskMatMaps,
  createKeyboardLegendsTexture,
  createSpeakerGrilleTexture,
  createWalnutWoodMaps,
} from './screenPainter';
import {
  buildMeshOfficeChair,
  buildExecutiveDeskDetails,
  buildBedroomCorner,
  buildGamingCorner,
  buildPodcastWall,
  buildStudioRoomAndArt,
} from './studioProps';
import { buildCeilingV2, type CeilingRig } from './ceilingV2';

function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
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

function createHollowRoundedRectShape(
  outerW: number,
  outerH: number,
  outerR: number,
  innerW: number,
  innerH: number,
  innerR: number,
  innerOffsetY = 0
): THREE.Shape {
  const shape = createRoundedRectShape(outerW, outerH, outerR);
  const hole = new THREE.Path();
  const hw = innerW / 2;
  const hh = innerH / 2;
  const r = Math.min(innerR, hw, hh);
  const cy = innerOffsetY;

  hole.moveTo(-hw + r, cy - hh);
  hole.lineTo(hw - r, cy - hh);
  hole.quadraticCurveTo(hw, cy - hh, hw, cy - hh + r);
  hole.lineTo(hw, cy + hh - r);
  hole.quadraticCurveTo(hw, cy + hh, hw - r, cy + hh);
  hole.lineTo(-hw + r, cy + hh);
  hole.quadraticCurveTo(-hw, cy + hh, -hw, cy + hh - r);
  hole.lineTo(-hw, cy - hh + r);
  hole.quadraticCurveTo(-hw, cy - hh, -hw + r, cy - hh);
  shape.holes.push(hole);
  return shape;
}

function normalizePlanarUVs(geo: THREE.BufferGeometry, width: number, depth: number) {
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    const ny = norm ? Math.abs(norm.getY(i)) : 1;
    if (ny >= 0.5) {
      uv.setXY(i, (px + width / 2) / width, 1 - (pz + depth / 2) / depth);
    } else {
      // Side edges & bevels get clean horizontal edge-grain UVs without vertical stretching
      uv.setXY(i, (px + pz) / (width * 0.65), py * 4.5 + 0.5);
    }
  }
  uv.needsUpdate = true;
}

export interface StudioLaptopAssembly {
  root: THREE.Group;
  laptopGroup: THREE.Group;
  lidPivot: THREE.Group;
  screenMesh: THREE.Mesh;
  screenMaterial: THREE.MeshBasicMaterial;
  screenDimensions: { width: number; height: number };
  ceilingRig: CeilingRig | null;
  setFinish: (finish: ChassisFinish) => void;
  setLidAngle: (radians: number) => void;
  dispose: () => void;
}

/**
 * Builds a photorealistic multi-part developer desk + precision CNC laptop showcase.
 * Felt mat top rests at y = 0; walnut tabletop rests at y = -0.016.
 */
export function buildStudioShowcase(
  initialFinish: ChassisFinish,
  screenTexture: THREE.Texture,
  maxAnisotropy: number
): StudioLaptopAssembly {
  const root = new THREE.Group();

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    textures.push(t);
    return t;
  };

  // Procedural PBR Texture Maps
  const brushedMaps = createBrushedMetalMaps(maxAnisotropy);
  trackTex(brushedMaps.roughnessMap);
  trackTex(brushedMaps.bumpMap);

  const walnutMaps = createWalnutWoodMaps(maxAnisotropy);
  trackTex(walnutMaps.map);
  trackTex(walnutMaps.roughnessMap);
  trackTex(walnutMaps.bumpMap);

  const deskMatMaps = createDeskMatMaps(maxAnisotropy);
  trackTex(deskMatMaps.map);
  trackTex(deskMatMaps.bumpMap);

  const speakerTex = trackTex(createSpeakerGrilleTexture(maxAnisotropy));
  const keyboardLegendsTex = trackTex(createKeyboardLegendsTexture(maxAnisotropy));

  const shadowTex = trackTex(createContactShadowTexture());
  const snapToDesktop = (object: THREE.Object3D) => {
    root.updateMatrixWorld(true);
    const desktop = root.getObjectByName('desk');
    if (!desktop) return;
    const desktopBounds = new THREE.Box3().setFromObject(desktop);
    const objectBounds = new THREE.Box3().setFromObject(object);
    object.position.y += desktopBounds.max.y - objectBounds.min.y;
  };

  // Core Materials (authentic CNC anodized metallic body + chamfer specular edge + matte accents)
  const chassisMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: initialFinish.chassisHex,
      metalness: initialFinish.metalness,
      roughness: initialFinish.roughness,
      roughnessMap: brushedMaps.roughnessMap,
      bumpMap: brushedMaps.bumpMap,
      bumpScale: 0.0007,
      clearcoat: 0.16,
      clearcoatRoughness: 0.28,
      envMapIntensity: 1.45,
    })
  );

  const chamferMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: initialFinish.accentHex,
      metalness: 0.96,
      roughness: 0.14,
      envMapIntensity: 1.55,
    })
  );

  const trimAccentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: initialFinish.accentHex,
      metalness: 0.94,
      roughness: 0.18,
      envMapIntensity: 1.4,
    })
  );

  const rubberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x141716,
      metalness: 0.0,
      roughness: 0.92,
    })
  );

  const keycapMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x121514,
      metalness: 0.03,
      roughness: 0.54,
    })
  );

  const keyWellMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0b0e0d,
      metalness: 0.08,
      roughness: 0.84,
    })
  );

  const trackpadMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xbac2be,
      metalness: 0.12,
      roughness: 0.16,
      clearcoat: 0.65,
      clearcoatRoughness: 0.12,
    })
  );

  const bezelGlassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x050706,
      metalness: 0.05,
      roughness: 0.08,
      clearcoat: 0.95,
      clearcoatRoughness: 0.06,
    })
  );

  // Self-lit un-toned OLED panel so deep dark blacks never wash out to grey under studio lights
  const screenMaterial = trackMat(
    new THREE.MeshBasicMaterial({
      map: screenTexture,
      toneMapped: false,
    })
  );

  // =========================================================================
  // 1. Real Studio Room (Oak Floor, Backlit Skills Tablets + Floating Shelves) + Walnut Executive Desk
  // =========================================================================
  const floorY = WORLD_SCALE.floorY;
  const deskOffsetZ = -1.8;
  const workZone = new THREE.Group();
  workZone.name = 'work-zone';
  workZone.scale.set(SCALE.desk.transform.x, SCALE.desk.transform.y, SCALE.desk.transform.z);
  workZone.position.y = floorY * (1 - SCALE.desk.transform.y);
  workZone.position.z = deskOffsetZ;
  root.add(workZone);

  // Real Oiled American Walnut Desk Tabletop (top surface sits at y = -0.016)
  const deskW = 4.95;
  const deskD = 2.65;
  const deskShape = createRoundedRectShape(deskW, deskD, 0.12);
  const deskGeo = trackGeo(
    new THREE.ExtrudeGeometry(deskShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.016,
      bevelSize: 0.016,
      bevelSegments: 4,
    })
  );
  deskGeo.rotateX(-Math.PI / 2);
  normalizePlanarUVs(deskGeo, deskW, deskD);
  const walnutMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: walnutMaps.map,
      roughnessMap: walnutMaps.roughnessMap,
      bumpMap: walnutMaps.bumpMap,
      bumpScale: 0.0025,
      roughness: 0.72,
      metalness: 0.0,
      envMapIntensity: 0.48,
    })
  );
  const walnutDesk = new THREE.Mesh(deskGeo, walnutMat);
  walnutDesk.position.set(0.05, -0.152, 0.05);
  walnutDesk.receiveShadow = true;
  walnutDesk.castShadow = true;
  walnutDesk.name = 'desk';
  workZone.add(walnutDesk);

  const darkSteelMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x1a201e, metalness: 0.84, roughness: 0.32 })
  );
  const brushedBrassMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xc9a86b, metalness: 0.9, roughness: 0.24 })
  );
  const tracker = { geo: trackGeo, mat: trackMat, tex: trackTex };
  buildStudioRoomAndArt(
    root,
    tracker,
    walnutMat,
    darkSteelMat,
    brushedBrassMat,
    maxAnisotropy,
    floorY
  );
  buildBedroomCorner(root, tracker, walnutMat, darkSteelMat, brushedBrassMat, floorY);
  buildGamingCorner(root, tracker, walnutMat, darkSteelMat, brushedBrassMat, floorY);
  buildPodcastWall(root);
  buildExecutiveDeskDetails(
    workZone,
    tracker,
    walnutMat,
    darkSteelMat,
    brushedBrassMat,
    floorY
  );
  buildMeshOfficeChair(root, tracker, floorY, 0, -0.62, 'office-chair', 1, 0);
  const ceilingRig = buildCeilingV2(root, tracker, floorY);

  // Charcoal Merino Wool-Felt Desk Mat (flush on walnut desk, top at y = 0)
  const matW = 3.45;
  const matD = 1.72;
  const matShape = createRoundedRectShape(matW, matD, 0.09);
  const matGeo = trackGeo(
    new THREE.ExtrudeGeometry(matShape, {
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.004,
      bevelSegments: 2,
    })
  );
  matGeo.rotateX(-Math.PI / 2);
  normalizePlanarUVs(matGeo, matW, matD);
  const deskMatMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: deskMatMaps.map,
      bumpMap: deskMatMaps.bumpMap,
      bumpScale: 0.0025,
      roughness: 0.95,
      metalness: 0.0,
      envMapIntensity: 0.35,
    })
  );
  const deskMat = new THREE.Mesh(matGeo, deskMatMat);
  deskMat.name = 'desk-mat';
  deskMat.position.set(0.08, -0.014, 0.08);
  deskMat.receiveShadow = true;
  workZone.add(deskMat);

  // =========================================================================
  // 2. Precision CNC Unibody Laptop (Bottom-center grounded at y = 0)
  // =========================================================================
  const laptopGroup = new THREE.Group();
  laptopGroup.name = 'laptop';
  laptopGroup.scale.set(SCALE.laptop.transform.x, SCALE.laptop.transform.y, SCALE.laptop.transform.z);
  workZone.add(laptopGroup);

  const contactMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    })
  );
  const laptopShadow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(2.38, 1.64)), contactMat);
  laptopShadow.rotation.x = -Math.PI / 2;
  laptopShadow.position.set(0, 0.001, 0.02);
  laptopGroup.add(laptopShadow);

  // 4 Elastomer Rubber Feet (y = 0 .. 0.012)
  const footGeo = trackGeo(new THREE.CylinderGeometry(0.056, 0.062, 0.012, 20));
  for (const [fx, fz] of [
    [-1.02, -0.66],
    [1.02, -0.66],
    [-1.02, 0.66],
    [1.02, 0.66],
  ]) {
    const foot = new THREE.Mesh(footGeo, rubberMat);
    foot.position.set(fx, 0.006, fz);
    foot.castShadow = true;
    laptopGroup.add(foot);
  }

  // Sleek Unibody CNC Aluminum Lower Chassis + Multi-Segment Bevels + Belly Pan Seam (y = 0.012 .. 0.066)
  const deckW = 2.38;
  const deckD = 1.64;
  const deckShape = createRoundedRectShape(deckW, deckD, 0.078);
  const deckGeo = trackGeo(
    new THREE.ExtrudeGeometry(deckShape, {
      depth: 0.032,
      bevelEnabled: true,
      bevelThickness: 0.011,
      bevelSize: 0.014,
      bevelSegments: 6,
      curveSegments: 24,
    })
  );
  deckGeo.rotateX(-Math.PI / 2);
  normalizePlanarUVs(deckGeo, deckW, deckD);
  const lowerDeck = new THREE.Mesh(deckGeo, chassisMat);
  lowerDeck.position.set(0, 0.022, 0);
  lowerDeck.castShadow = true;
  lowerDeck.receiveShadow = true;
  laptopGroup.add(lowerDeck);

  // Subtle Underside Anodized Belly Pan Seam (creates multi-part CNC split line along side walls)
  const bellyShape = createRoundedRectShape(deckW - 0.04, deckD - 0.04, 0.068);
  const bellyGeo = trackGeo(
    new THREE.ExtrudeGeometry(bellyShape, {
      depth: 0.006,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.005,
      bevelSegments: 3,
    })
  );
  bellyGeo.rotateX(-Math.PI / 2);
  const lowerBelly = new THREE.Mesh(bellyGeo, keyWellMat);
  lowerBelly.position.set(0, 0.012, 0);
  laptopGroup.add(lowerBelly);

  // Diamond-Cut Metallic Chamfer Rim Framing the Top Deck Perimeter
  const deckRimShape = createHollowRoundedRectShape(
    deckW + 0.006,
    deckD + 0.006,
    0.076,
    deckW - 0.022,
    deckD - 0.022,
    0.068
  );
  const deckRimGeo = trackGeo(
    new THREE.ExtrudeGeometry(deckRimShape, {
      depth: 0.0025,
      bevelEnabled: true,
      bevelThickness: 0.0012,
      bevelSize: 0.002,
      bevelSegments: 2,
    })
  );
  deckRimGeo.rotateX(-Math.PI / 2);
  const deckRim = new THREE.Mesh(deckRimGeo, chamferMat);
  deckRim.position.set(0, 0.0635, 0);
  laptopGroup.add(deckRim);

  // Thunderbolt / USB-C Ports + Inner Metallic Tongues + Audio Jack
  const portHousingGeo = trackGeo(new THREE.BoxGeometry(0.016, 0.014, 0.064));
  const portTongueGeo = trackGeo(new THREE.BoxGeometry(0.01, 0.004, 0.044));
  const copperMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xc29b61, metalness: 0.9, roughness: 0.25 })
  );
  for (const px of [-deckW / 2 - 0.006, deckW / 2 + 0.006]) {
    for (const pz of [-0.42, -0.30]) {
      const port = new THREE.Mesh(portHousingGeo, keyWellMat);
      port.position.set(px, 0.038, pz);
      laptopGroup.add(port);

      const tongue = new THREE.Mesh(portTongueGeo, copperMat);
      tongue.position.set(px * 0.996, 0.038, pz);
      laptopGroup.add(tongue);
    }
  }
  // 3.5mm Audio Jack on left side
  const audioJack = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.01, 0.01, 0.014, 16)),
    keyWellMat
  );
  audioJack.rotation.z = Math.PI / 2;
  audioJack.position.set(-deckW / 2 - 0.005, 0.038, -0.18);
  laptopGroup.add(audioJack);

  // Front ergonomic thumb-scoop bevel recess (flush inside front edge)
  const thumbNotch = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.42, 0.009, 0.032)),
    keyWellMat
  );
  thumbNotch.position.set(0, 0.058, deckD / 2 - 0.006);
  laptopGroup.add(thumbNotch);

  // CNC Micro-Perforated Stereo Speaker Grilles
  const speakerMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: speakerTex,
      roughness: 0.65,
      metalness: 0.35,
    })
  );
  const grilleGeo = trackGeo(new THREE.PlaneGeometry(0.145, 0.66));
  for (const sx of [-1.045, 1.045]) {
    const grille = new THREE.Mesh(grilleGeo, speakerMat);
    grille.rotation.x = -Math.PI / 2;
    grille.position.set(sx, 0.0645, -0.22);
    laptopGroup.add(grille);
  }

  // Recessed Dark Anodized Keyboard Well + Subtle Warm-White Keyboard Backlight Plate
  const wellW = 1.84;
  const wellD = 0.69;
  const wellMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(wellW, 0.008, wellD)),
    keyWellMat
  );
  wellMesh.position.set(0, 0.0615, -0.22);
  wellMesh.receiveShadow = true;
  laptopGroup.add(wellMesh);

  const backlightMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xdbe7e1,
      transparent: true,
      opacity: 0.24,
    })
  );
  const backlightPlate = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(wellW - 0.025, wellD - 0.025)),
    backlightMat
  );
  backlightPlate.rotation.x = -Math.PI / 2;
  backlightPlate.position.set(0, 0.066, -0.22);
  laptopGroup.add(backlightPlate);

  // 77-Key Sculpted QWERTY InstancedMesh matching exact 6-row layout
  const rowSpecs: Array<number[]> = [
    [1.4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Function row (14 keys)
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.4], // Number row (14 keys)
    [1.4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // QWERTY row (14 keys)
    [1.7, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.7], // ASDF row (13 keys)
    [2.2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.2], // ZXCV row (12 keys)
    [1, 1, 1, 1.3, 5.1, 1.3, 1, 0.9, 0.9, 0.9], // Bottom row (10 keys)
  ];
  const totalKeys = rowSpecs.reduce((sum, r) => sum + r.length, 0); // 77 keys
  const baseKeyGeo = trackGeo(new THREE.BoxGeometry(1, 0.011, 1));
  const keyInstances = new THREE.InstancedMesh(baseKeyGeo, keycapMat, totalKeys);
  keyInstances.castShadow = true;
  keyInstances.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const usableW = wellW - 0.04;
  const usableD = wellD - 0.04;
  const rowPitch = usableD / rowSpecs.length;
  const keyGap = 0.014;
  let kIdx = 0;

  rowSpecs.forEach((row, rIdx) => {
    const sumUnits = row.reduce((a, b) => a + b, 0);
    const unitW = usableW / sumUnits;
    const zCenter = -0.22 - usableD / 2 + (rIdx + 0.5) * rowPitch;
    let curX = -usableW / 2;

    row.forEach((units) => {
      const cellW = units * unitW;
      const xCenter = curX + cellW / 2;
      dummy.position.set(xCenter, 0.0685, zCenter);
      dummy.scale.set(Math.max(0.02, cellW - keyGap), 1, rowPitch - keyGap);
      dummy.updateMatrix();
      keyInstances.setMatrixAt(kIdx++, dummy.matrix);
      curX += cellW;
    });
  });
  keyInstances.instanceMatrix.needsUpdate = true;
  laptopGroup.add(keyInstances);

  // Backlit Keycap Legends Overlay directly flush atop keycaps
  const legendMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: keyboardLegendsTex,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
    })
  );
  const legendPlane = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(usableW, usableD)),
    legendMat
  );
  legendPlane.rotation.x = -Math.PI / 2;
  legendPlane.position.set(0, 0.0746, -0.22);
  laptopGroup.add(legendPlane);

  // Force-Touch Glass Trackpad with subtle perimeter bezel
  const trackpadBezel = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.92, 0.004, 0.56)),
    keyWellMat
  );
  trackpadBezel.position.set(0, 0.063, 0.44);
  laptopGroup.add(trackpadBezel);

  const trackpadMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.905, 0.006, 0.545)),
    trackpadMat
  );
  trackpadMesh.position.set(0, 0.0638, 0.44);
  trackpadMesh.receiveShadow = true;
  laptopGroup.add(trackpadMesh);

  // Dual-Knuckle Machined Hinge Barrel + Rear Cooling Vent Recess + End-Caps
  const hingeZ = -deckD / 2 + 0.04;
  const hingeY = 0.070;
  const hingeBarrel = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.024, 0.024, 1.76, 24)),
    rubberMat
  );
  hingeBarrel.rotation.z = Math.PI / 2;
  hingeBarrel.position.set(0, hingeY, hingeZ);
  hingeBarrel.castShadow = true;
  laptopGroup.add(hingeBarrel);

  const hingeCapGeo = trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 20));
  for (const hx of [-0.90, 0.90]) {
    const cap = new THREE.Mesh(hingeCapGeo, trimAccentMat);
    cap.rotation.z = Math.PI / 2;
    cap.position.set(hx, hingeY, hingeZ);
    laptopGroup.add(cap);
  }

  // Rear Thermal Exhaust Vent Slot Behind Keyboard
  const rearVentSlot = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.56, 0.006, 0.038)),
    keyWellMat
  );
  rearVentSlot.position.set(0, 0.062, -deckD / 2 + 0.076);
  laptopGroup.add(rearVentSlot);

  // =========================================================================
  // 3. Defined Multi-Layer Display Lid (CNC Shell + Elastomer Gasket + Obsidian Glass + Inner Screen Frame)
  // =========================================================================
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, hingeY, hingeZ);
  laptopGroup.add(lidPivot);

  const lidW = deckW;
  const lidH = 1.58;
  const lidShape = createRoundedRectShape(lidW, lidH, 0.072);
  const lidGeo = trackGeo(
    new THREE.ExtrudeGeometry(lidShape, {
      depth: 0.016,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.009,
      bevelSegments: 6,
      curveSegments: 24,
    })
  );

  const lidBack = new THREE.Mesh(lidGeo, chassisMat);
  lidBack.position.set(0, lidH / 2 + 0.01, -0.017);
  lidBack.castShadow = true;
  lidBack.receiveShadow = true;
  lidPivot.add(lidBack);

  // Subtle Machined Metallic Display Outer Rim Chamfer
  const lidRimShape = createHollowRoundedRectShape(
    lidW + 0.012,
    lidH + 0.012,
    0.074,
    lidW - 0.026,
    lidH - 0.026,
    0.062
  );
  const lidRimGeo = trackGeo(
    new THREE.ExtrudeGeometry(lidRimShape, {
      depth: 0.004,
      bevelEnabled: true,
      bevelThickness: 0.0015,
      bevelSize: 0.002,
      bevelSegments: 2,
    })
  );
  const lidOuterRim = new THREE.Mesh(lidRimGeo, chamferMat);
  lidOuterRim.position.set(0, lidH / 2 + 0.01, 0.005);
  lidPivot.add(lidOuterRim);

  // Matte Elastomer Display Perimeter Gasket (authentic shock-seal bezel lip)
  const gasketShape = createHollowRoundedRectShape(
    lidW - 0.018,
    lidH - 0.018,
    0.062,
    lidW - 0.052,
    lidH - 0.052,
    0.048
  );
  const gasketGeo = trackGeo(
    new THREE.ExtrudeGeometry(gasketShape, {
      depth: 0.006,
      bevelEnabled: false,
    })
  );
  const gasketMesh = new THREE.Mesh(gasketGeo, rubberMat);
  gasketMesh.position.set(0, lidH / 2 + 0.01, 0.008);
  lidPivot.add(gasketMesh);

  // Edge-to-Edge Glossy Black Obsidian Display Glass Panel
  const bezelShape = createRoundedRectShape(lidW - 0.046, lidH - 0.046, 0.048);
  const bezelGeo = trackGeo(
    new THREE.ExtrudeGeometry(bezelShape, {
      depth: 0.005,
      bevelEnabled: true,
      bevelThickness: 0.001,
      bevelSize: 0.0015,
      bevelSegments: 2,
    })
  );
  const bezelMesh = new THREE.Mesh(bezelGeo, bezelGlassMat);
  bezelMesh.position.set(0, lidH / 2 + 0.01, 0.0085);
  lidPivot.add(bezelMesh);

  // OLED Screen Dimensions (1440:960 = 3:2)
  const screenW = lidW - 0.115;
  const screenH = screenW * (960 / 1440);
  const screenCenterY = lidH / 2 + 0.003;

  // Defined Recessed Inner Screen Frame (crisp machined step surrounding active OLED viewport)
  const screenFrameShape = createHollowRoundedRectShape(
    screenW + 0.022,
    screenH + 0.022,
    0.016,
    screenW + 0.002,
    screenH + 0.002,
    0.008
  );
  const screenFrameGeo = trackGeo(
    new THREE.ExtrudeGeometry(screenFrameShape, {
      depth: 0.003,
      bevelEnabled: true,
      bevelThickness: 0.0008,
      bevelSize: 0.001,
      bevelSegments: 2,
    })
  );
  const innerScreenFrame = new THREE.Mesh(
    screenFrameGeo,
    trackMat(new THREE.MeshStandardMaterial({ color: 0x101412, metalness: 0.65, roughness: 0.34 }))
  );
  innerScreenFrame.position.set(0, screenCenterY, 0.0138);
  lidPivot.add(innerScreenFrame);

  // Centered Camera Notch / Sensor Island Pill + Multi-Element Lens + Active Emerald LED
  const cameraPill = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.24, 0.042, 0.004)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x070908, roughness: 0.25, metalness: 0.15 }))
  );
  cameraPill.position.set(0, lidH - 0.036, 0.0145);
  lidPivot.add(cameraPill);

  const camRing = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.010, 0.010, 0.004, 16)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x16221e, metalness: 0.9, roughness: 0.15 }))
  );
  camRing.rotation.x = Math.PI / 2;
  camRing.position.set(0, lidH - 0.036, 0.0162);
  lidPivot.add(camRing);

  const camLed = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.0032, 12)),
    trackMat(new THREE.MeshBasicMaterial({ color: 0x34d399 }))
  );
  camLed.position.set(0.026, lidH - 0.036, 0.0175);
  lidPivot.add(camLed);

  // Active OLED Screen Plane (1440:960 = 3:2)
  const screenMesh = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(screenW, screenH)),
    screenMaterial
  );
  screenMesh.position.set(0, screenCenterY, 0.0165);
  screenMesh.name = 'project-screen';
  lidPivot.add(screenMesh);

  // =========================================================================
  // 4. Real Braided USB-C Cable + Anodized Connector Plug Seated in Left Port
  // =========================================================================
  const usbcHousing = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.082, 0.022, 0.044)),
    trimAccentMat
  );
  usbcHousing.position.set(-deckW / 2 - 0.042, 0.038, -0.42);
  usbcHousing.castShadow = true;
  laptopGroup.add(usbcHousing);

  const usbcLed = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.0035, 8, 8)),
    trackMat(new THREE.MeshBasicMaterial({ color: 0x34d399 }))
  );
  usbcLed.position.set(-deckW / 2 - 0.042, 0.0495, -0.42);
  laptopGroup.add(usbcLed);

  const usbcBoot = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.012, 0.015, 0.04, 12)),
    rubberMat
  );
  usbcBoot.rotation.z = Math.PI / 2;
  usbcBoot.position.set(-deckW / 2 - 0.1, 0.038, -0.42);
  laptopGroup.add(usbcBoot);

  root.updateMatrixWorld(true);
  const cableDesk = root.getObjectByName('desk');
  const cableDeskBounds = cableDesk ? new THREE.Box3().setFromObject(cableDesk) : null;
  const cableDeskTop = cableDeskBounds?.max.y ?? floorY + SCALE.desk.height;
  const cableDeskZ = cableDeskBounds?.getCenter(new THREE.Vector3()).z ?? deskOffsetZ;
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.16, cableDeskTop + 0.03, cableDeskZ - 0.07),
    new THREE.Vector3(-0.38, cableDeskTop + 0.02, cableDeskZ - 0.08),
    new THREE.Vector3(-0.76, cableDeskTop - 0.02, cableDeskZ + 0.02),
    new THREE.Vector3(-1.25, cableDeskTop - 0.08, cableDeskZ + 0.18),
    new THREE.Vector3(-1.32, floorY + 0.48, cableDeskZ + 0.2),
    new THREE.Vector3(-1.32, floorY + 0.08, cableDeskZ + 0.24),
  ]);
  const cableMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x262c29, roughness: 0.86, metalness: 0.05 })
  );
  const cableMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(cableCurve, 44, 0.014, 10, false)),
    cableMat
  );
  cableMesh.castShadow = true;
  root.add(cableMesh);

  // =========================================================================
  // 5. Real Developer Desk Props: Sculpted Wireless Mouse, Notebook + Pen, Espresso Cup
  // =========================================================================
  // 5a. Sculpted Organic Ergonomic Wireless Mouse (resting flush at y = 0 on felt mat)
  const mouseGroup = new THREE.Group();
  mouseGroup.name = 'desk-mouse';
  mouseGroup.scale.setScalar(0.28);
  mouseGroup.position.set(0.42, 0, 0.16 + deskOffsetZ);
  mouseGroup.rotation.y = -0.18;
  root.add(mouseGroup);

  const mouseShadow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.3, 0.46)), contactMat);
  mouseShadow.rotation.x = -Math.PI / 2;
  mouseShadow.position.y = 0.001;
  mouseGroup.add(mouseShadow);

  const mouseShellMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x262b29, roughness: 0.38, metalness: 0.12 })
  );
  // Flat matte mouse skate base plate
  const mouseBaseGeo = trackGeo(new THREE.CylinderGeometry(0.142, 0.136, 0.014, 32));
  mouseBaseGeo.scale(0.86, 1, 1.52);
  const mouseBase = new THREE.Mesh(mouseBaseGeo, rubberMat);
  mouseBase.position.y = 0.007;
  mouseBase.castShadow = true;
  mouseGroup.add(mouseBase);

  // Smooth curved ergonomic dome shell
  const mouseDomeGeo = trackGeo(
    new THREE.SphereGeometry(0.145, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.5)
  );
  mouseDomeGeo.scale(0.86, 0.56, 1.52);
  const mouseDome = new THREE.Mesh(mouseDomeGeo, mouseShellMat);
  mouseDome.position.y = 0.013;
  mouseDome.castShadow = true;
  mouseDome.receiveShadow = true;
  mouseGroup.add(mouseDome);

  // Subtle recessed center click seam + Machined Aluminum Scroll Wheel
  const wheelSlot = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.026, 0.012, 0.088)),
    keyWellMat
  );
  wheelSlot.position.set(0, 0.072, -0.105);
  wheelSlot.rotation.x = 0.24;
  mouseGroup.add(wheelSlot);

  const scrollWheel = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.021, 0.021, 0.018, 24)),
    trimAccentMat
  );
  scrollWheel.rotation.z = Math.PI / 2;
  scrollWheel.position.set(0, 0.080, -0.105);
  scrollWheel.castShadow = true;
  mouseGroup.add(scrollWheel);
  snapToDesktop(mouseGroup);

  // 5b. Hardcover Field Notebook + Machined Aluminum Pen (left side of felt mat, flush at y = 0)
  const noteGroup = new THREE.Group();
  noteGroup.name = 'desk-book';
  noteGroup.scale.setScalar(0.28);
  noteGroup.position.set(-0.43, 0, 0.12 + deskOffsetZ);
  noteGroup.rotation.y = 0.22;
  root.add(noteGroup);

  const noteShadow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.58, 0.82)), contactMat);
  noteShadow.rotation.x = -Math.PI / 2;
  noteShadow.position.y = 0.001;
  noteGroup.add(noteShadow);

  const coverMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x183d2d, roughness: 0.86, metalness: 0.02 })
  );
  const pagesMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf0eadb, roughness: 0.9, metalness: 0.0 })
  );
  const noteBottomCover = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.52, 0.01, 0.72)),
    coverMat
  );
  noteBottomCover.position.y = 0.005;
  noteBottomCover.castShadow = true;
  noteGroup.add(noteBottomCover);

  const notePages = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.49, 0.044, 0.695)),
    pagesMat
  );
  notePages.position.set(0.008, 0.032, 0);
  notePages.castShadow = true;
  noteGroup.add(notePages);

  const noteTopCover = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.52, 0.011, 0.72)),
    coverMat
  );
  noteTopCover.position.y = 0.0595;
  noteTopCover.castShadow = true;
  noteTopCover.receiveShadow = true;
  noteGroup.add(noteTopCover);

  // Elastic strap around notebook
  const strap = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.026, 0.068, 0.724)),
    rubberMat
  );
  strap.position.set(0.18, 0.034, 0);
  noteGroup.add(strap);

  // Machined Pen resting atop notebook
  const stylusProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.009, 0.035),
    new THREE.Vector2(0.018, 0.085),
    new THREE.Vector2(0.018, 0.56),
    new THREE.Vector2(0.014, 0.59),
    new THREE.Vector2(0.0, 0.59),
  ];
  const penMesh = new THREE.Mesh(
    trackGeo(new THREE.LatheGeometry(stylusProfile, 20)),
    trimAccentMat
  );
  penMesh.rotation.x = Math.PI / 2;
  penMesh.rotation.z = -0.18;
  penMesh.position.set(-0.08, 0.083, -0.28);
  penMesh.castShadow = true;
  noteGroup.add(penMesh);
  snapToDesktop(noteGroup);

  // 5c. Glazed Ceramic Espresso Cup & Cork Coaster (flush on Walnut Desk at y = -0.016)
  const cupGroup = new THREE.Group();
  cupGroup.name = 'desk-mug';
  cupGroup.scale.setScalar(0.34);
  cupGroup.position.set(-0.62, 0, -0.05 + deskOffsetZ);
  root.add(cupGroup);

  const cupShadow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.52, 0.52)), contactMat);
  cupShadow.rotation.x = -Math.PI / 2;
  cupShadow.position.y = 0.002;
  cupGroup.add(cupShadow);

  const corkMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5c4330, roughness: 0.92, metalness: 0.0 })
  );
  const coaster = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.22, 0.23, 0.02, 32)),
    corkMat
  );
  coaster.position.y = 0.01;
  coaster.castShadow = true;
  coaster.receiveShadow = true;
  cupGroup.add(coaster);

  const cupProfile = [
    new THREE.Vector2(0.0, 0.02),
    new THREE.Vector2(0.115, 0.02),
    new THREE.Vector2(0.142, 0.095),
    new THREE.Vector2(0.154, 0.245),
    new THREE.Vector2(0.140, 0.25),
    new THREE.Vector2(0.130, 0.065),
    new THREE.Vector2(0.0, 0.055),
  ];
  const cupMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xeef3f0,
      roughness: 0.16,
      metalness: 0.02,
      clearcoat: 0.95,
      clearcoatRoughness: 0.06,
    })
  );
  const cupMesh = new THREE.Mesh(trackGeo(new THREE.LatheGeometry(cupProfile, 32)), cupMat);
  cupMesh.castShadow = true;
  cupMesh.receiveShadow = true;
  cupGroup.add(cupMesh);

  const coffeeDisc = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.136, 28)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x26140c, roughness: 0.22, metalness: 0.0 }))
  );
  coffeeDisc.rotation.x = -Math.PI / 2;
  coffeeDisc.position.y = 0.215;
  cupGroup.add(coffeeDisc);

  const cremaRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.068, 0.134, 28)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x6e4326, roughness: 0.65, metalness: 0.0 }))
  );
  cremaRing.rotation.x = -Math.PI / 2;
  cremaRing.position.y = 0.216;
  cupGroup.add(cremaRing);

  const handleMesh = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.065, 0.015, 12, 24, Math.PI * 1.15)),
    cupMat
  );
  handleMesh.rotation.z = -Math.PI * 0.56;
  handleMesh.position.set(0.152, 0.148, 0);
  handleMesh.castShadow = true;
  cupGroup.add(handleMesh);

  // Snap the smaller mug's bounding-box bottom to the actual desktop surface.
  root.updateMatrixWorld(true);
  const desktop = root.getObjectByName('desk');
  if (desktop) {
    const desktopBounds = new THREE.Box3().setFromObject(desktop);
    const mugBounds = new THREE.Box3().setFromObject(cupGroup);
    cupGroup.position.y += desktopBounds.max.y - mugBounds.min.y;
  }

  const setFinish = (finish: ChassisFinish) => {
    chassisMat.color.setHex(finish.chassisHex);
    chassisMat.metalness = finish.metalness;
    chassisMat.roughness = finish.roughness;
    trimAccentMat.color.setHex(finish.accentHex);
    chamferMat.color.setHex(finish.accentHex);

    const trackpadHex =
      finish.id === 'silver'
        ? 0xbec6c2
        : finish.id === 'emerald'
          ? 0x1c4a36
          : 0x1a1f1d;
    trackpadMat.color.setHex(trackpadHex);
  };
  setFinish(initialFinish);

  const setLidAngle = (openRadians: number) => {
    lidPivot.rotation.x = Math.PI / 2 - openRadians;
  };
  setLidAngle(1.86);

  const dispose = () => {
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    for (const t of textures) t.dispose();
  };

  return {
    root,
    laptopGroup,
    lidPivot,
    screenMesh,
    screenMaterial,
    screenDimensions: { width: screenW, height: screenH },
    ceilingRig,
    setFinish,
    setLidAngle,
    dispose,
  };
}

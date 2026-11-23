import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CeilingLightHud } from '../components/CeilingLightHud';
import { SCALE, WORLD_SCALE } from '../config/scale';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  CASES,
  type CameraPreset,
  type CaseStudy,
  type ChassisFinish,
} from '../data/portfolio';
import { PERF, FEATURE_FLAGS } from '../config/perf';
import { COPY, type Language } from '../config/copy';
import { CAMERA_LIMITS, COLLISION, ROOM_COLLIDERS } from '../config/colliders';
import { PROJECT_GALLERY } from '../config/projectGallery';
import { CEILING, ENABLE_CEILING_V2 } from '../config/ceiling';
import { ENABLE_PC_VIEW, PC_VIEW } from '../config/pc';
import { getCeilingLightingState, setCeilingPreset, toggleCeilingLighting } from '../lib/ceilingLighting';
import { resolvePlanarMove, pushOutOfColliders } from '../lib/collision';
import { InteractionMachine, type InteractionState, type SeatZone } from '../lib/interactionState';
import { FpsGuard, prefersReducedMotion } from '../lib/perf';
import {
  computeQuadMatrix3d,
  dampValue,
  isSoftwareRendererString,
  type Point2D,
} from '../lib/poseMath';
import { buildStudioShowcase } from './laptopModel';
import { paintCaseScreen, paintPortfolioScreen, type PortfolioScreenView, type ScreenCourse, type ScreenGithubProfile, type ScreenRepository } from './screenPainter';

const GAME_KEYS = new Set(['w', 'a', 's', 'd', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
type RoomAction = 'desk' | 'gaming' | 'sofa' | 'podcast' | 'gym' | 'lamp' | 'bed' | 'tv' | 'door' | null;

function createPlayerAvatar() {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const geo = <T extends THREE.BufferGeometry>(geometry: T) => (geometries.push(geometry), geometry);
  const mat = <T extends THREE.Material>(material: T) => (materials.push(material), material);
  const tex = <T extends THREE.Texture>(texture: T) => (textures.push(texture), texture);
  const skin = mat(new THREE.MeshStandardMaterial({ color: 0xb98261, roughness: 0.82 }));
  const skinLight = mat(new THREE.MeshStandardMaterial({ color: 0xc89370, roughness: 0.76 }));
  const hair = mat(new THREE.MeshStandardMaterial({ color: 0x241b17, roughness: 0.94 }));
  const beardMaterial = mat(new THREE.MeshStandardMaterial({ color: 0x33241e, roughness: 0.96 }));
  const eyeWhite = mat(new THREE.MeshStandardMaterial({ color: 0xe9e1d5, roughness: 0.58 }));
  const eyeGlint = mat(new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
  const mouthMaterial = mat(new THREE.MeshStandardMaterial({ color: 0x211614, roughness: 0.7 }));
  const hoodie = mat(new THREE.MeshStandardMaterial({ color: 0x101211, roughness: 0.9 }));
  const hoodieDetail = mat(new THREE.MeshStandardMaterial({ color: 0x292d2b, roughness: 0.84 }));
  const hoodieStitch = mat(new THREE.MeshStandardMaterial({ color: 0x555a56, roughness: 0.82 }));
  const cord = mat(new THREE.MeshStandardMaterial({ color: 0xb6a48b, roughness: 0.85 }));
  const glasses = mat(new THREE.MeshStandardMaterial({ color: 0xb5b9b3, metalness: 0.86, roughness: 0.22 }));
  const lens = mat(new THREE.MeshPhysicalMaterial({ color: 0xc7d9df, transparent: true, opacity: 0.13, roughness: 0.08, metalness: 0.08, depthWrite: false }));
  const trousers = mat(new THREE.MeshStandardMaterial({ color: 0x20272b, roughness: 0.91 }));
  const denimSeam = mat(new THREE.MeshStandardMaterial({ color: 0x39454b, roughness: 0.86 }));
  const shoes = mat(new THREE.MeshStandardMaterial({ color: 0x101211, roughness: 0.82 }));
  const shoeSole = mat(new THREE.MeshStandardMaterial({ color: 0x292d2f, roughness: 0.76 }));
  const shoeDetail = mat(new THREE.MeshStandardMaterial({ color: 0x6e7472, roughness: 0.65 }));
  const eye = mat(new THREE.MeshStandardMaterial({ color: 0x211a16, roughness: 0.48 }));
  const sphere = geo(new THREE.SphereGeometry(1, 20, 16));

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext('2d');
  if (shadowContext) {
    const gradient = shadowContext.createRadialGradient(64, 64, 4, 64, 64, 60);
    gradient.addColorStop(0, 'rgba(0,0,0,.25)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    shadowContext.fillStyle = gradient;
    shadowContext.fillRect(0, 0, 128, 128);
  }
  const shadowTexture = tex(new THREE.CanvasTexture(shadowCanvas));
  shadowTexture.colorSpace = THREE.SRGBColorSpace;
  const contactShadow = new THREE.Mesh(geo(new THREE.PlaneGeometry(0.85, 1.05)), mat(new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false })));
  contactShadow.name = 'avatar-contact-shadow';
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.012;
  root.add(contactShadow);

  const torso = new THREE.Mesh(geo(new THREE.CapsuleGeometry(0.22, 0.42, 5, 14)), hoodie);
  torso.name = 'avatar-hoodie';
  const spine = new THREE.Group();
  spine.name = 'avatar-spine';
  spine.position.y = 0.72;
  root.add(spine);
  torso.position.y = 0.21;
  torso.castShadow = true;
  spine.add(torso);
  const hood = new THREE.Mesh(sphere, hoodie);
  hood.scale.set(0.235, 0.205, 0.17);
  hood.position.set(0, 0.58, 0.085);
  spine.add(hood);
  const neck = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.075, 0.09, 0.13, 14)), skin);
  neck.position.y = 0.62;
  spine.add(neck);
  const head = new THREE.Group();
  head.name = 'avatar-head';
  head.position.set(0, 0.69, 0);
  spine.add(head);
  const face = new THREE.Mesh(sphere, skin);
  face.scale.set(0.14, 0.16, 0.13);
  face.position.set(0, 0.14, 0);
  face.castShadow = true;
  head.add(face);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(sphere, skin);
    ear.scale.set(0.035, 0.052, 0.035); ear.position.set(side * 0.137, 0.12, -0.002); head.add(ear);
    const earInner = new THREE.Mesh(sphere, skinLight);
    earInner.scale.set(0.012, 0.027, 0.014); earInner.position.set(side * 0.155, 0.12, -0.014); head.add(earInner);
  }
  const nose = new THREE.Mesh(sphere, skinLight);
  nose.name = 'avatar-nose'; nose.scale.set(0.028, 0.036, 0.039); nose.position.set(0, 0.119, -0.12); nose.castShadow = true; head.add(nose);
  const beard = new THREE.Mesh(sphere, beardMaterial);
  beard.scale.set(0.125, 0.09, 0.105);
  beard.position.set(0, 0.045, -0.066);
  head.add(beard);
  const moustache = new THREE.Mesh(sphere, beardMaterial);
  moustache.scale.set(0.073, 0.026, 0.052);
  moustache.position.set(0, 0.102, -0.108);
  head.add(moustache);
  const mouth = new THREE.Mesh(geo(new THREE.SphereGeometry(0.026, 16, 10)), mouthMaterial);
  mouth.name = 'avatar-expressive-mouth';
  mouth.scale.set(1, 0.22, 0.2); mouth.position.set(0, 0.034, -0.168); head.add(mouth);
  const hairCap = new THREE.Mesh(sphere, hair);
  hairCap.scale.set(0.147, 0.075, 0.137);
  hairCap.position.set(0, 0.27, 0.006);
  head.add(hairCap);
  const curlGeo = geo(new THREE.SphereGeometry(0.022, 10, 8));
  for (let ix = -4; ix <= 4; ix++) {
    for (let iz = -3; iz <= 2; iz++) {
      const x = ix * 0.029;
      const z = iz * 0.032 - 0.005;
      const normalized = (x * x) / 0.019 + (z * z) / 0.016;
      if (normalized > 1) continue;
      const curl = new THREE.Mesh(curlGeo, hair);
      curl.scale.set(0.92 + ((ix - iz + 12) % 4) * 0.06, 0.82 + ((ix + iz + 12) % 3) * 0.11, 0.92);
      curl.position.set(x, 0.282 + 0.03 * Math.sqrt(1 - normalized), z);
      head.add(curl);
    }
  }
  // Tight, short fade at the temples.
  for (const side of [-1, 1]) {
    const fade = new THREE.Mesh(sphere, hair);
    fade.scale.set(0.024, 0.075, 0.095);
    fade.position.set(side * 0.129, 0.205, 0.005);
    head.add(fade);
  }
  const eyes: THREE.Mesh[] = [];
  for (const x of [-0.072, 0.072]) {
    const sclera = new THREE.Mesh(geo(new THREE.SphereGeometry(0.026, 16, 12)), eyeWhite);
    sclera.scale.set(1, 0.58, 0.4); sclera.position.set(x, 0.16, -0.13); head.add(sclera);
    const eyeMesh = new THREE.Mesh(geo(new THREE.SphereGeometry(0.012, 12, 8)), eye);
    eyeMesh.scale.y = 1.4;
    eyeMesh.position.set(x, 0.16, -0.14);
    eyes.push(eyeMesh);
    head.add(eyeMesh);
    const glint = new THREE.Mesh(geo(new THREE.SphereGeometry(0.004, 8, 8)), eyeGlint);
    glint.position.set(x - 0.003, 0.165, -0.151); head.add(glint);
    const lensMesh = new THREE.Mesh(geo(new THREE.CircleGeometry(0.074, 24)), lens);
    lensMesh.rotation.y = Math.PI;
    lensMesh.position.set(x, 0.16, -0.131);
    head.add(lensMesh);
    const frame = new THREE.Mesh(geo(new THREE.TorusGeometry(0.078, 0.006, 8, 28)), glasses);
    frame.rotation.y = Math.PI;
    frame.position.set(x, 0.16, -0.139);
    head.add(frame);
  }
  const bridge = new THREE.Mesh(geo(new THREE.BoxGeometry(0.045, 0.009, 0.009)), glasses);
  bridge.position.set(0, 0.16, -0.139);
  head.add(bridge);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 8)), glasses);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(side * 0.17, 0.16, -0.105);
    head.add(arm);
  }
  for (const x of [-0.055, 0.055]) {
    const brow = new THREE.Mesh(geo(new THREE.BoxGeometry(0.067, 0.012, 0.014)), beardMaterial);
    brow.position.set(x, 0.19, -0.12);
    head.add(brow);
  }

  const armPivots: THREE.Group[] = [];
  const elbowPivots: THREE.Group[] = [];
  const kneePivots: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.25, 1.22, 0);
    arm.rotation.z = side * 0.16;
    const upper = new THREE.Mesh(geo(new THREE.CapsuleGeometry(0.073, 0.2, 5, 14)), hoodie);
    upper.position.y = -0.135;
    upper.castShadow = true;
    arm.add(upper);
    const shoulderSeam = new THREE.Mesh(geo(new THREE.TorusGeometry(0.073, 0.003, 5, 18)), hoodieStitch);
    shoulderSeam.position.y = -0.035; shoulderSeam.rotation.x = Math.PI / 2; arm.add(shoulderSeam);
    const elbow = new THREE.Group(); elbow.name = `avatar-elbow-${side}`; elbow.position.y = -0.27; arm.add(elbow); elbowPivots.push(elbow);
    const forearm = new THREE.Mesh(geo(new THREE.CapsuleGeometry(0.063, 0.19, 5, 12)), hoodie);
    forearm.position.y = -0.11; forearm.castShadow = true; elbow.add(forearm);
    const cuff = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.064, 0.061, 0.06, 16)), hoodieDetail);
    cuff.position.y = -0.205; cuff.castShadow = true; elbow.add(cuff);
    const cuffStitch = new THREE.Mesh(geo(new THREE.TorusGeometry(0.063, 0.0025, 5, 18)), hoodieStitch);
    cuffStitch.position.y = -0.18; elbow.add(cuffStitch);
    const hand = new THREE.Mesh(sphere, skin);
    hand.scale.set(0.067, 0.07, 0.061); hand.position.y = -0.275; hand.castShadow = true; elbow.add(hand);
    const thumb = new THREE.Mesh(sphere, skin);
    thumb.scale.set(0.026, 0.043, 0.032); thumb.position.set(side * -0.047, -0.258, -0.016); elbow.add(thumb);
    armPivots.push(arm);
    root.add(arm);

    const leg = new THREE.Group();
    leg.position.set(side * 0.115, 0.73, 0);
    const trouserLeg = new THREE.Mesh(geo(new THREE.CapsuleGeometry(0.098, 0.34, 5, 14)), trousers);
    trouserLeg.position.y = -0.255;
    trouserLeg.castShadow = true;
    leg.add(trouserLeg);
    const knee = new THREE.Group(); knee.name = `avatar-knee-${side}`; knee.position.y = -0.42; leg.add(knee); kneePivots.push(knee);
    const calf = new THREE.Mesh(geo(new THREE.CapsuleGeometry(0.076, 0.25, 5, 12)), trousers);
    calf.position.y = -0.11; calf.castShadow = true; knee.add(calf);
    const shinSeam = new THREE.Mesh(geo(new THREE.BoxGeometry(0.004, 0.22, 0.006)), denimSeam);
    shinSeam.position.set(side * 0.025, -0.12, -0.071); knee.add(shinSeam);
    const foot = new THREE.Group(); foot.name = `avatar-shoe-${side}`; foot.position.set(0, -0.285, -0.018); knee.add(foot);
    const sole = new THREE.Mesh(geo(new RoundedBoxGeometry(0.205, 0.035, 0.31, 4, 0.012)), shoeSole);
    sole.position.set(0, 0, -0.025); sole.castShadow = true; foot.add(sole);
    const shoe = new THREE.Mesh(geo(new RoundedBoxGeometry(0.181, 0.095, 0.258, 5, 0.032)), shoes);
    shoe.position.set(0, 0.052, -0.025); shoe.castShadow = true; foot.add(shoe);
    const toeCap = new THREE.Mesh(geo(new THREE.SphereGeometry(0.075, 16, 10)), shoeDetail);
    toeCap.scale.set(1.1, 0.26, 0.42); toeCap.position.set(0, 0.069, -0.119); foot.add(toeCap);
    for (let lace = 0; lace < 3; lace++) {
      const laceBar = new THREE.Mesh(geo(new THREE.BoxGeometry(0.067, 0.004, 0.008)), shoeDetail);
      laceBar.position.set(0, 0.099, -0.065 + lace * 0.028); foot.add(laceBar);
    }
    const backPull = new THREE.Mesh(geo(new THREE.BoxGeometry(0.07, 0.06, 0.012)), shoeDetail);
    backPull.position.set(0, 0.08, 0.085); foot.add(backPull);
    (root.userData.legs ??= []).push(leg);
    root.add(leg);
  }

  const drawstringGeo = geo(new THREE.CylinderGeometry(0.008, 0.008, 0.25, 8));
  for (const x of [-0.055, 0.055]) {
    const drawstring = new THREE.Mesh(drawstringGeo, cord);
    drawstring.position.set(x, 0.31, -0.203);
    spine.add(drawstring);
    const knot = new THREE.Mesh(geo(new THREE.SphereGeometry(0.012, 8, 8)), cord);
    knot.position.set(x, 0.18, -0.203);
    spine.add(knot);
    const eyelet = new THREE.Mesh(geo(new THREE.TorusGeometry(0.018, 0.004, 6, 16)), hoodieStitch);
    eyelet.position.set(x, 0.385, -0.207); spine.add(eyelet);
  }
  const hoodieCollar = new THREE.Mesh(geo(new THREE.TorusGeometry(0.105, 0.014, 8, 24)), hoodieDetail);
  hoodieCollar.name = 'avatar-hoodie-collar'; hoodieCollar.rotation.x = Math.PI / 2; hoodieCollar.position.set(0, 0.55, 0.07); spine.add(hoodieCollar);
  const hoodiePocket = new THREE.Mesh(geo(new RoundedBoxGeometry(0.24, 0.12, 0.026, 5, 0.018)), hoodieDetail);
  hoodiePocket.name = 'avatar-hoodie-kangaroo-pocket'; hoodiePocket.position.set(0, 0.085, -0.211); hoodiePocket.castShadow = true; spine.add(hoodiePocket);
  const hoodieZip = new THREE.Mesh(geo(new THREE.BoxGeometry(0.008, 0.29, 0.009)), hoodieStitch);
  hoodieZip.position.set(0, 0.34, -0.208); spine.add(hoodieZip);
  const hoodieZipPull = new THREE.Mesh(geo(new THREE.BoxGeometry(0.018, 0.035, 0.012)), cord);
  hoodieZipPull.position.set(0, 0.19, -0.218); spine.add(hoodieZipPull);
  const makeSeam = (name: string, points: THREE.Vector3[], radius: number, material: THREE.Material, parent: THREE.Object3D) => {
    const curve = new THREE.CatmullRomCurve3(points);
    const seam = new THREE.Mesh(geo(new THREE.TubeGeometry(curve, 16, radius, 6, false)), material);
    seam.name = name; parent.add(seam); return seam;
  };
  makeSeam('hoodie-pocket-stitch', [new THREE.Vector3(-0.105, 0.135, -0.229), new THREE.Vector3(-0.09, 0.035, -0.231), new THREE.Vector3(0, 0.018, -0.232), new THREE.Vector3(0.09, 0.035, -0.231), new THREE.Vector3(0.105, 0.135, -0.229)], 0.0022, hoodieStitch, spine);
  root.scale.setScalar(SCALE.characterHeight / 1.75);
  return {
    root,
    arms: armPivots,
    elbows: elbowPivots,
    legs: root.userData.legs as THREE.Group[],
    knees: kneePivots,
    head,
    torso,
    spine,
    eyes,
    mouth,
    dispose: () => {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
    },
  };
}

function logRoomScaleAudit(roomRoot: THREE.Object3D) {
  const targets = new Set([
    'laptop', 'desk', 'office-chair', 'bed', 'bedroom-television-screen',
    'gaming-pc-monitor', 'rug', 'bed-rug', 'door',
  ]);
  const rows: Array<{ object: string; width_m: number; height_m: number; depth_m: number }> = [];
  roomRoot.updateMatrixWorld(true);
  roomRoot.traverse((object) => {
    if (!targets.has(object.name)) return;
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    rows.push({
      object: object.name,
      width_m: Number(size.x.toFixed(3)),
      height_m: Number(size.y.toFixed(3)),
      depth_m: Number(size.z.toFixed(3)),
    });
  });
  console.groupCollapsed('3D room scale audit (metres)');
  console.table(rows);
  console.groupEnd();
}

interface StudioSceneProps {
  lang: Language;
  active: boolean;
  caseStudy: CaseStudy;
  finish: ChassisFinish;
  preset: CameraPreset;
  presetTick: number;
  swapTick: number;
  youtubeVideoId: string | null;
  portfolioView?: PortfolioScreenView | null;
  portfolioPage?: number;
  repositories?: ScreenRepository[];
  githubProfile?: ScreenGithubProfile | null;
  githubLoading?: boolean;
  githubError?: string;
  courses?: ScreenCourse[];
  onCloseYoutube?: () => void;
  onScreenClick: () => void;
  onLowPerformance?: () => void;
  onContextLost?: () => void;
}

function getResponsivePreset(p: CameraPreset, aspect: number) {
  if (aspect >= 1) {
    return {
      position: [...p.position] as [number, number, number],
      target: [...p.target] as [number, number, number],
    };
  }
  const isFront = p.id === 'front';
  const zBoost = isFront ? 1.56 : p.id === 'top' ? 0.78 : p.id === 'wall' ? 1.25 : 0.85;
  const yLift = isFront ? 0.42 : 0.30;
  const targetLift = isFront ? 0.62 : p.id === 'top' ? 0.38 : 0.44;
  return {
    position: [p.position[0], p.position[1] + yLift, p.position[2] + zBoost] as [
      number,
      number,
      number,
    ],
    target: [p.target[0], p.target[1] + targetLift, p.target[2]] as [number, number, number],
  };
}

export function StudioScene({
  lang,
  active,
  caseStudy,
  finish,
  preset,
  presetTick,
  swapTick,
  youtubeVideoId,
  portfolioView = null,
  portfolioPage = 0,
  repositories = [],
  githubProfile = null,
  githubLoading = false,
  githubError = '',
  courses = [],
  onCloseYoutube,
  onScreenClick,
  onLowPerformance,
  onContextLost,
}: StudioSceneProps) {
  const copy = COPY[lang];
  const hostRef = useRef<HTMLDivElement | null>(null);
  const videoOverlayRef = useRef<HTMLDivElement | null>(null);
  const [walking, setWalkingState] = useState(false);
  const [interactionState, setInteractionState] = useState<InteractionState>('idle');
  const [gamePrompt, setGamePrompt] = useState<RoomAction>(null);
  const [gameToast, setGameToast] = useState('');
  const [resting, setResting] = useState(false);
  const [gettingUp, setGettingUp] = useState(false);
  const [sitting, setSitting] = useState(false);
  const [tvOn, setTvOn] = useState(true);
  const [consolePlaying, setConsolePlayingState] = useState(false);
  const [roomProjectsView, setRoomProjectsView] = useState(false);
  const [consoleGameOver, setConsoleGameOver] = useState(false);
  const [consoleScore, setConsoleScore] = useState(0);
  const [consoleBestScore, setConsoleBestScore] = useState(0);
  const [deskMode, setDeskMode] = useState<'talk' | 'write' | 'code' | null>(null);
  const [deskDraft, setDeskDraft] = useState('');
  const [deskMessage, setDeskMessage] = useState('');
  const [deskNotes, setDeskNotes] = useState<string[]>([]);
  const [deskCode, setDeskCode] = useState("const greeting = 'Salam!';\n\nfunction startCoding() {\n  console.log(greeting);\n}\n\nstartCoding();");
  const [usingPC, setUsingPC] = useState(false);
  const [pcProjectIndex, setPcProjectIndex] = useState(0);
  const pcPauseUntilRef = useRef(0);
  const pcTouchStartX = useRef<number | null>(null);
  const deskModeRef = useRef<'talk' | 'write' | 'code' | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const walkingRef = useRef(false);
  const onLowPerformanceRef = useRef(onLowPerformance);
  const onContextLostRef = useRef(onContextLost);
  const reducedMotionRef = useRef(prefersReducedMotion());
  onLowPerformanceRef.current = onLowPerformance;
  onContextLostRef.current = onContextLost;

  // Refs for imperatively syncing React props into the persistent WebGL scene
  const activeRef = useRef(active);
  const caseRef = useRef(caseStudy);
  const finishRef = useRef(finish);
  const presetRef = useRef(preset);
  const youtubeIdRef = useRef<string | null>(youtubeVideoId);
  const portfolioViewRef = useRef<PortfolioScreenView | null>(portfolioView);
  const portfolioPageRef = useRef(portfolioPage);
  const repositoriesRef = useRef(repositories);
  const githubProfileRef = useRef(githubProfile);
  const githubLoadingRef = useRef(githubLoading);
  const githubErrorRef = useRef(githubError);
  const coursesRef = useRef(courses);
  const onScreenClickRef = useRef(onScreenClick);

  const typingStartRef = useRef<number>(performance.now());
  const flashAlphaRef = useRef<number>(0);
  const cameraAnimatingRef = useRef<boolean>(false);
  const lidTargetRef = useRef<number>(preset.lidAngle);
  const lidCurrentRef = useRef<number>(preset.lidAngle);
  const camTargetPosRef = useRef(new THREE.Vector3(...preset.position));
  const camTargetLookRef = useRef(new THREE.Vector3(...preset.target));

  const apiRef = useRef<{
    applyFinish: (f: ChassisFinish) => void;
    applyPreset: (p: CameraPreset) => void;
    applyCase: (c: CaseStudy, flash: boolean) => void;
    repaint: () => void;
    wake: () => void;
    syncOverlay: () => void;
    setWalking: (enabled: boolean) => void;
    moveKey: (key: string, pressed: boolean) => void;
    jump: () => void;
    interact: () => void;
    playConsole: () => void;
    consoleAction: () => void;
    viewProjects: () => void;
    returnToRoom: () => void;
    restartConsoleGame: () => void;
    setDeskCode: (code: string | null) => void;
    animateSpeech: (duration: number) => void;
    updateGithubDashboard: (profile: ScreenGithubProfile | null, repos: ScreenRepository[], loading: boolean, error: string, page?: number) => void;
    enterPC: () => void;
    exitPC: () => void;
    selectPCProject: (index: number) => void;
    openPCLink: (kind: 'code' | 'live') => void;
      requestRender: () => void;
  } | null>(null);

  activeRef.current = active;
  caseRef.current = caseStudy;
  finishRef.current = finish;
  presetRef.current = preset;
  youtubeIdRef.current = youtubeVideoId;
  portfolioViewRef.current = portfolioView;
  portfolioPageRef.current = portfolioPage;
  repositoriesRef.current = repositories;
  githubProfileRef.current = githubProfile;
  githubLoadingRef.current = githubLoading;
  githubErrorRef.current = githubError;
  coursesRef.current = courses;
  onScreenClickRef.current = onScreenClick;
  deskModeRef.current = deskMode;

  const presentCharacter = () => {
    if (!("speechSynthesis" in window)) {
      setGameToast(lang === 'fr' ? 'La synth\u00e8se vocale est indisponible dans ce navigateur.' : 'Speech is unavailable in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(copy.presentationSpeech);
    speech.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
    speech.rate = 0.94;
    speech.pitch = 1;
    const languagePrefix = lang === 'fr' ? 'fr' : 'en';
    const voice = window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith(languagePrefix));
    if (voice) speech.voice = voice;
    apiRef.current?.animateSpeech(Math.max(6000, copy.presentationSpeech.length * 58));
    window.speechSynthesis.speak(speech);
  };

  const chooseDeskMode = (mode: 'talk' | 'write' | 'code') => {
    deskModeRef.current = mode;
    setDeskMode(mode);
    apiRef.current?.setDeskCode(mode === 'code' ? deskCode : null);
    setDeskMessage('');
  };
  const submitDeskText = () => {
    const text = deskDraft.trim();
    if (!text) return;
    if (deskMode === 'talk') {
      setDeskMessage(text);
      apiRef.current?.animateSpeech(Math.min(9000, Math.max(1800, text.length * 55)));
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = /[\u0600-\u06FF]/.test(text) ? 'ar-MA' : 'fr-FR'; speech.rate = 0.94;
        window.speechSynthesis.speak(speech);
      }
    } else if (deskMode === 'write') {
      setDeskNotes((notes) => [text, ...notes].slice(0, 4));
      setDeskMessage('Note enregistrÃ©e dans ton carnet.');
      setDeskDraft('');
    }
  };

  // Mount WebGL scene once inside isolated hostRef
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;

    const width = Math.max(1, host.clientWidth || window.innerWidth);
    const height = Math.max(1, host.clientHeight || window.innerHeight);

    // Probe context for software WebGL renderer before locking antialias
    const probeCanvas = document.createElement('canvas');
    const probeGl =
      probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    let rendererStr = '';
    if (probeGl) {
      const dbg = probeGl.getExtension('WEBGL_debug_renderer_info');
      rendererStr = String(
        dbg
          ? probeGl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)
          : probeGl.getParameter(probeGl.RENDERER)
      );
    }
    const isSoftwareGl = isSoftwareRendererString(rendererStr);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
      preserveDrawingBuffer: isSoftwareGl,
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, PERF.maxDpr));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x163829);
    scene.fog = new THREE.FogExp2(0x163829, 0.028);

    // Studio IBL on every device (RoomEnvironment + PMREMGenerator)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmrem.dispose();

    const aspect = width / height;
    const baseFov = aspect < 1 ? Math.min(56, 36 / Math.pow(Math.max(0.4, aspect), 0.48)) : 36;
    const camera = new THREE.PerspectiveCamera(baseFov, aspect, 0.1, 45);
    const initialPose = getResponsivePreset(presetRef.current, aspect);
    camera.position.set(...initialPose.position);
    camTargetPosRef.current.set(...initialPose.position);
    camTargetLookRef.current.set(...initialPose.target);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...initialPose.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    // Keep vertical wheel reserved for portfolio Hero <-> Case scrolling
    controls.enableZoom = false;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = SCALE.thirdPersonCamera.minDistance;
    controls.maxDistance = SCALE.thirdPersonCamera.maxDistance;
    controls.update();

    // Warm Studio Key + Cool Emerald Fill + Soft Rim + Desk Lamp Warmth
    const hemiLight = new THREE.HemisphereLight(0xe0f5ea, 0x241911, 1.05);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff0dc, 2.35);
    keyLight.position.set(3.4, 5.1, 3.8);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(PERF.shadowMapSize, PERF.shadowMapSize);
      keyLight.shadow.camera.near = 1.0;
      keyLight.shadow.camera.far = 16.0;
      keyLight.shadow.camera.left = -4.5;
      keyLight.shadow.camera.right = 4.5;
      keyLight.shadow.camera.top = 4.2;
      keyLight.shadow.camera.bottom = -4.2;
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x9fd8bf, 1.18);
    rimLight.position.set(-3.6, 2.8, -3.4);
    scene.add(rimLight);

    const galleryWarmFill = new THREE.PointLight(0xffdfb0, 2.2, 8.5, 1.6);
    galleryWarmFill.position.set(-1.95, 1.45, -0.78);
    scene.add(galleryWarmFill);

    const wallWash = new THREE.PointLight(0x69c98c, 1.1, 8.2, 1.8);
    wallWash.position.set(0, 3.15, -1.72);
    scene.add(wallWash);

    const shelfWarmth = new THREE.PointLight(0xffc67e, 0.9, 5.2, 2.0);
    shelfWarmth.position.set(4.1, 2.0, -1.45);
    scene.add(shelfWarmth);

    const deskPractical = new THREE.PointLight(0xffd39a, 0.75, 3.6, 2.0);
    deskPractical.position.set(-1.85, 1.1, -0.55);
    scene.add(deskPractical);

    // Preload real project photos for immediate crisp OLED rendering
    const photoCache = new Map<string, HTMLImageElement>();
    const texW = isSoftwareGl ? 960 : 1440;
    const texH = isSoftwareGl ? 640 : 960;
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = texW;
    screenCanvas.height = texH;
    const screenCtx = screenCanvas.getContext('2d')!;
    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    screenTexture.colorSpace = THREE.SRGBColorSpace;
    screenTexture.anisotropy = isSoftwareGl
      ? PERF.maxAnisotropyLow
      : Math.min(renderer.capabilities.getMaxAnisotropy(), PERF.maxAnisotropy);

    const drawCase = (elapsed: number, flash: number) => {
      screenCtx.save();
      if (isSoftwareGl) {
        screenCtx.scale(texW / 1440, texH / 960);
      }
      if (portfolioViewRef.current) {
        paintPortfolioScreen(
          screenCtx,
          1440,
          960,
          portfolioViewRef.current,
          portfolioPageRef.current,
          repositoriesRef.current,
          coursesRef.current,
          photoCache,
          githubProfileRef.current,
          githubLoadingRef.current,
          githubErrorRef.current,
          portfolioViewRef.current === 'github' ? githubDashboardPage : 0
        );
      } else {
        const photoImg = photoCache.get(caseRef.current.photo) ?? null;
        paintCaseScreen(screenCtx, 1440, 960, caseRef.current, elapsed, flash, photoImg);
      }
      screenCtx.restore();
    };

    for (const c of CASES) {
      if (!c.photo || photoCache.has(c.photo)) continue;
      const img = new Image();
      img.onload = () => {
        if (disposed) return;
        if (caseRef.current.photo === c.photo && !caseRef.current.video) {
          drawCase(isSoftwareGl ? 10 : Math.max(2.5, (performance.now() - typingStartRef.current) / 1000), 0);
          screenTexture.needsUpdate = true;
          requestRender();
        }
      };
      img.src = c.photo;
      photoCache.set(c.photo, img);
    }

    drawCase(isSoftwareGl ? 10 : 2.5, 0);
    screenTexture.needsUpdate = true;

    // Optional video texture if case.video URL is configured
    let activeVideo: HTMLVideoElement | null = null;
    let activeVideoTex: THREE.VideoTexture | null = null;
    const handlePageVisibility = () => {
      if (activeVideo) {
        if (document.hidden) activeVideo.pause();
        else activeVideo.play().catch(() => {});
      }
      if (!document.hidden) {
        lastTime = performance.now();
        if (activeRef.current) requestRender();
      }
    };
    document.addEventListener('visibilitychange', handlePageVisibility);

    const maxAnisotropy = isSoftwareGl
      ? PERF.maxAnisotropyLow
      : Math.min(renderer.capabilities.getMaxAnisotropy(), PERF.maxAnisotropy);
    const assembly = buildStudioShowcase(finishRef.current, screenTexture, maxAnisotropy);
    scene.add(assembly.root);
    const ceilingRoomLights = {
      hemisphere: hemiLight, key: keyLight, rim: rimLight, intensityScale: 1,
      accents: [galleryWarmFill, wallWash, shelfWarmth, deskPractical],
    };
    let pcLightFactor = 1;
    let ceilingContinuous = false;
    const ceilingSwitchPanel = assembly.root.getObjectByName('ceiling-switch-panel');
    const ceilingSwitchButton = assembly.root.getObjectByName('ceiling-switch-button') as THREE.Mesh | undefined;
    let ceilingSwitchHovered = false;
    logRoomScaleAudit(assembly.root);
    const tabletScreens: THREE.Mesh[] = [];
    assembly.root.traverse((object) => {
      if (object instanceof THREE.Mesh && object.name === 'wall-tablet-screen') tabletScreens.push(object);
    });
    const githubDashboardScreen = assembly.root.getObjectByName('github-wall-dashboard-screen') as THREE.Mesh | undefined;
    let githubDashboardPage = 0;
    const updateGithubDashboard = (profile: ScreenGithubProfile | null, repos: ScreenRepository[], loading: boolean, error: string, page = githubDashboardPage) => {
      githubDashboardPage = (page % 3 + 3) % 3;
      const update = githubDashboardScreen?.userData.setGithubDashboard as ((p: ScreenGithubProfile | null, r: ScreenRepository[], l: boolean, e: string, page: number) => void) | undefined;
      update?.(profile, repos, loading, error, githubDashboardPage);
    };
    updateGithubDashboard(githubProfileRef.current, repositoriesRef.current, githubLoadingRef.current, githubErrorRef.current);
    const tvScreenMesh = assembly.root.getObjectByName('bedroom-television-screen') as THREE.Mesh | undefined;
    const tvGlowLight = assembly.root.getObjectByName('bedroom-tv-glow') as THREE.PointLight | undefined;
    const bedsideLampLight = assembly.root.getObjectByName('bedside-lamp-light') as THREE.PointLight | undefined;
    const bedsideLampBulb = assembly.root.getObjectByName('bedside-lamp-bulb') as THREE.Mesh | undefined;

    const player = createPlayerAvatar();
    const avatarContactShadow = player.root.getObjectByName('avatar-contact-shadow') as THREE.Mesh | undefined;
    const floorY = WORLD_SCALE.floorY;
    player.root.position.set(0, floorY, 6.5);
    player.root.visible = false;
    scene.add(player.root);
    const gltfLoader = new GLTFLoader();
    let loadedAvatar: THREE.Group | null = null;
    let avatarMixer: THREE.AnimationMixer | null = null;
    let activeAvatarAction: THREE.AnimationAction | null = null;
    const avatarActions = new Map<string, THREE.AnimationAction>();
    const animationAliases: Array<[RegExp, 'idle' | 'walk' | 'run' | 'sit']> = [
      [/idle|stand/i, 'idle'], [/walk/i, 'walk'], [/run|jog/i, 'run'], [/sit|chair/i, 'sit'],
    ];
    const normalizeBoneName = (name: string) => name.split(':').pop()!.replace(/^mixamorig/i, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const retargetClip = (clip: THREE.AnimationClip, model: THREE.Object3D) => {
      const targetNames = new Map<string, string>();
      model.traverse((object) => { targetNames.set(normalizeBoneName(object.name), object.name); });
      const copy = clip.clone();
      copy.tracks = copy.tracks.map((track) => {
        const dot = track.name.indexOf('.');
        if (dot < 0) return track;
        const originalNode = track.name.slice(0, dot);
        const mappedNode = targetNames.get(normalizeBoneName(originalNode));
        if (mappedNode) track.name = `${mappedNode}${track.name.slice(dot)}`;
        return track;
      });
      return copy;
    };
    const registerAnimation = (clip: THREE.AnimationClip, nameHint?: string) => {
      if (!avatarMixer || !loadedAvatar) return;
      const alias = animationAliases.find(([pattern]) => pattern.test(nameHint ?? clip.name))?.[1];
      if (!alias) return;
      const action = avatarMixer.clipAction(retargetClip(clip, loadedAvatar));
      action.enabled = true;
      action.setEffectiveWeight(1);
      avatarActions.set(alias, action);
    };
    const playAvatarAction = (name: 'idle' | 'walk' | 'run' | 'sit', speed = 1) => {
      const nextAction = avatarActions.get(name);
      if (!nextAction || nextAction === activeAvatarAction) {
        if (nextAction) nextAction.timeScale = speed;
        return;
      }
      nextAction.reset().setEffectiveTimeScale(speed).setEffectiveWeight(1).play();
      if (activeAvatarAction) nextAction.crossFadeFrom(activeAvatarAction, 0.25, true);
      activeAvatarAction = nextAction;
    };
    void (async () => {
      try {
        const modelCheck = await fetch('/models/taha.glb', { method: 'HEAD' });
        if (!modelCheck.ok || modelCheck.headers.get('content-type')?.includes('text/html')) return;
        setAvatarLoading(true);
        const gltf = await gltfLoader.loadAsync('/models/taha.glb');
        if (disposed) return;
        loadedAvatar = gltf.scene;
        const avatarBounds = new THREE.Box3().setFromObject(loadedAvatar);
        const avatarHeight = Math.max(0.01, avatarBounds.max.y - avatarBounds.min.y);
        const avatarScale = SCALE.characterHeight / avatarHeight;
        loadedAvatar.scale.setScalar(avatarScale);
        loadedAvatar.position.y -= avatarBounds.min.y * avatarScale;
        loadedAvatar.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = true;
          object.receiveShadow = true;
          const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of meshMaterials) {
            const materialWithMaps = material as THREE.MeshStandardMaterial;
            for (const map of [materialWithMaps.map, materialWithMaps.normalMap, materialWithMaps.roughnessMap, materialWithMaps.metalnessMap]) {
              if (map) map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), PERF.maxAnisotropy);
            }
            if (materialWithMaps.map) materialWithMaps.map.colorSpace = THREE.SRGBColorSpace;
          }
        });
        for (const child of player.root.children) child.visible = false;
        player.root.add(loadedAvatar);
        avatarMixer = new THREE.AnimationMixer(loadedAvatar);
        gltf.animations.forEach((clip) => registerAnimation(clip));
        playAvatarAction('idle');
        const optionalAnimations = ['idle', 'walk', 'run', 'sit'];
        await Promise.all(optionalAnimations.map(async (name) => {
          try {
            const url = `/models/${name}.glb`;
            const response = await fetch(url, { method: 'HEAD' });
            if (!response.ok || response.headers.get('content-type')?.includes('text/html')) return;
            const animationGltf = await gltfLoader.loadAsync(url);
            animationGltf.animations.forEach((clip) => registerAnimation(clip, name));
          } catch {
            // The procedural avatar remains active when optional animation files are absent.
          }
        }));
        playAvatarAction('idle');
      } catch {
        // No model is bundled yet; keep the detailed procedural look-alike as the working fallback.
      } finally {
        if (!disposed) setAvatarLoading(false);
      }
    })();
    const pressedKeys = new Set<string>();
    const movementVelocity = new THREE.Vector2();
    const sleepingPosition = new THREE.Vector3(7.6, floorY + SCALE.bed.mattressTop + 0.22, 7.65);
    const sleepingQuaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, -1, 0)
    ));
    const standingQuaternion = new THREE.Quaternion();
    const wakePosition = new THREE.Vector3(6.35, floorY, 8.45);
    const sittingPosition = new THREE.Vector3(0, floorY, 0.55);
    let walkClock = 0;
    let lastGamePrompt: RoomAction = null;
    let lampEnabled = true;
    let tvEnabled = true;
    let isResting = false;
    let isGettingUp = false;
    let isSitting = false;
    let isUsingPC = false;
    const pcReturnPosition = new THREE.Vector3();
    const pcReturnTarget = new THREE.Vector3();
    let pcReturnFov = 52;
    const pcCameraNormal = new THREE.Vector3();
    const pcCameraCenter = new THREE.Vector3();
    const pcBounds = new THREE.Box3();
    const lidWorldQuaternion = new THREE.Quaternion();
    let isConsolePlaying = false;
    let isRoomProjectsView = false;
    let consoleGameOverActive = false;
    let sittingOn: 'desk' | 'gaming' | 'sofa' | 'podcast' = 'desk';
    let podcastSeatX = -7.27;
    let verticalVelocity = 0;
    let isGrounded = true;
    let workoutUntil = 0;
    let cameraYaw = 0.34;
    let cameraPitch = 0.025;
    let cameraDistance: number = SCALE.thirdPersonCamera.distance;
    let safeCameraRange = cameraDistance;
    let orbitPointer: { id: number; x: number; y: number } | null = null;
    let lastCameraCollisionCheck = 0;
    let nextBlinkAt = performance.now() + 3200 + Math.random() * 2600;
    let blinkStartedAt = 0;
    const cameraRay = new THREE.Raycaster();
    const cameraDirection = new THREE.Vector3();
    const cameraTarget = new THREE.Vector3();
    const cameraDesired = new THREE.Vector3();
    const headDirection = new THREE.Vector3();
    const interactableTargets = [
      new THREE.Vector3(0, floorY + SCALE.desk.height, -1.8),
      new THREE.Vector3(8.15, floorY + SCALE.television.centerHeight, 3.55),
      new THREE.Vector3(7.6, floorY + SCALE.bed.mattressTop, 7.2),
      new THREE.Vector3(6.53, floorY + 1.0, 6.54),
    ];
    const gazeTargets: Partial<Record<Exclude<RoomAction, null>, THREE.Vector3>> = {
      desk: interactableTargets[0], tv: interactableTargets[1], bed: interactableTargets[2], gaming: interactableTargets[3],
    };
    const focusBounds = new THREE.Box3();
    const measuredFocus = (name: string) => {
      const object = assembly.root.getObjectByName(name);
      if (!object) return null;
      focusBounds.setFromObject(object);
      const target = focusBounds.getCenter(new THREE.Vector3());
      target.y = Math.max(target.y, floorY + 1.15);
      return target;
    };
    gazeTargets.sofa = measuredFocus('gaming-sofa') ?? undefined;
    gazeTargets.podcast = measuredFocus('podcast-armchair-1') ?? measuredFocus('podcast-armchair-2') ?? undefined;
    gazeTargets.gym = measuredFocus('mini-gym-barbell') ?? undefined;
    gazeTargets.lamp = measuredFocus('bedside-lamp-bulb') ?? undefined;
    const gazeTarget = new THREE.Vector3();
    let toastTimer = 0;
    let deskSpeechUntil = 0;
    const interaction = new InteractionMachine();
    const enterPC = () => {
      if (!ENABLE_PC_VIEW || isUsingPC || !walkingRef.current || !isSitting || sittingOn !== 'desk') return;
      isUsingPC = true;
      const initialIndex = Math.max(0, CASES.findIndex((item) => item.id === caseRef.current.id));
      setPcProjectIndex(initialIndex);
      if (CASES[initialIndex]?.id !== caseRef.current.id) apiRef.current?.applyCase(CASES[initialIndex], false);
      interaction.enterPC(); syncInteraction();
      pressedKeys.clear(); movementVelocity.set(0, 0);
      pcReturnPosition.copy(camera.position); pcReturnTarget.copy(controls.target); pcReturnFov = camera.fov;
      assembly.screenMesh.updateWorldMatrix(true, false);
      pcBounds.setFromObject(assembly.screenMesh);
      pcBounds.getCenter(pcCameraCenter);
      assembly.screenMesh.getWorldQuaternion(lidWorldQuaternion);
      pcCameraNormal.set(0, 0, 1).applyQuaternion(lidWorldQuaternion).normalize();
      const width = pcBounds.max.x - pcBounds.min.x;
      const fitDistance = width / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.max(0.5, camera.aspect) * 0.82);
      const distance = THREE.MathUtils.clamp(fitDistance, PC_VIEW.minCameraDistance, PC_VIEW.maxCameraDistance);
      camTargetPosRef.current.copy(pcCameraCenter).addScaledVector(pcCameraNormal, distance);
      camTargetPosRef.current.y = THREE.MathUtils.clamp(camTargetPosRef.current.y, CAMERA_LIMITS.minY, CAMERA_LIMITS.maxY);
      camTargetLookRef.current.copy(pcCameraCenter);
      camera.fov = Math.max(28, pcReturnFov + PC_VIEW.fovOffset); camera.updateProjectionMatrix();
      cameraAnimatingRef.current = true;
      controls.enabled = false;
      player.root.visible = false;
      setUsingPC(true); pcPauseUntilRef.current = performance.now();
      console.debug('pc_entered'); requestRender();
    };
    const exitPC = () => {
      if (!isUsingPC) return;
      isUsingPC = false; interaction.exitPC(); syncInteraction();
      player.root.visible = true; camera.fov = pcReturnFov; camera.updateProjectionMatrix();
      camTargetPosRef.current.copy(pcReturnPosition); camTargetLookRef.current.copy(pcReturnTarget);
      cameraAnimatingRef.current = true; controls.enabled = false;
      setUsingPC(false); console.debug('pc_exited'); requestRender();
    };
    const selectPCProject = (index: number) => {
      const next = (index + CASES.length) % CASES.length;
      setPcProjectIndex(next); pcPauseUntilRef.current = performance.now() + PC_VIEW.interactionPauseMs;
      apiRef.current?.applyCase(CASES[next], true); console.debug('project_selected', CASES[next].id);
    };
    const openPCLink = (kind: 'code' | 'live') => {
      const project = CASES[pcProjectIndex];
      const url = kind === 'code' ? project.repo : project.liveUrl;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      console.debug(kind === 'code' ? 'code_clicked' : 'live_app_clicked', project.id);
      pcPauseUntilRef.current = performance.now() + PC_VIEW.interactionPauseMs;
    };
    const syncInteraction = () => {
      if (disposed || !FEATURE_FLAGS.ENABLE_DEBUG_STATE_OVERLAY) return;
      setInteractionState(interaction.state);
    };
    const pushOutSpawn = (x: number, z: number) =>
      pushOutOfColliders({ x, z }, COLLISION.radius * COLLISION.radiusScale, ROOM_COLLIDERS).point;
    const forceResetInteraction = () => {
      if (isSitting) {
        isSitting = false;
        setSitting(false);
        player.spine.position.y = 0.72;
        for (const arm of player.arms) { arm.position.y = 1.22; arm.rotation.x = 0; arm.rotation.z = 0; }
        for (const leg of player.legs) leg.rotation.x = 0;
        for (const elbow of player.elbows) elbow.rotation.x = 0;
        for (const knee of player.knees) knee.rotation.x = 0;
      }
      if (isResting) {
        isResting = false;
        setResting(false);
        player.root.rotation.x = 0;
      }
      if (isGettingUp) { isGettingUp = false; setGettingUp(false); }
      if (isConsolePlaying) setConsoleGame(false);
      movementVelocity.set(0, 0);
      pressedKeys.clear();
      interaction.forceWalk();
      syncInteraction();
      requestRender();
    };
    const updateDeskCode = (code: string | null) => {
      for (const name of ['wall-tablet-screen', 'gaming-pc-monitor']) {
        const screen = assembly.root.getObjectByName(name) as THREE.Mesh | undefined;
        const setCode = screen?.userData.setDeskCode as ((value: string | null) => void) | undefined;
        setCode?.(code);
      }
      requestRender();
    };
    const animateSpeech = (duration: number) => { deskSpeechUntil = performance.now() + duration; requestRender(); };
    const setConsoleGame = (enabled: boolean) => {
      isConsolePlaying = enabled;
      consoleGameOverActive = false;
      setConsolePlayingState(enabled);
      setConsoleGameOver(false);
      if (enabled) { setConsoleScore(0); }
      tvEnabled = true;
      setTvOn(true);
      const screen = tvScreenMesh;
      const screenApi = screen?.userData;
      const setMode = screenApi?.setConsolePlaying as ((active: boolean) => void) | undefined;
      setMode?.(enabled);
      if (screen) screen.visible = true;
      if (tvGlowLight) tvGlowLight.intensity = 0.8;
      setGameToast(enabled ? 'Partie lancÃ©e ! FlÃ¨ches ou A/D pour esquiver, E pour arrÃªter.' : 'Console en pause. E pour te relever.');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => setGameToast(''), enabled ? 2800 : 1800);
      requestRender();
    };
    const moveConsolePlayer = (key: string) => {
      if (!isConsolePlaying) return;
      const normalized = key.toLowerCase();
      const dx = normalized === 'a' || normalized === 'arrowleft' ? -1 : normalized === 'd' || normalized === 'arrowright' ? 1 : 0;
      const dy = normalized === 'w' || normalized === 'arrowup' ? -1 : normalized === 's' || normalized === 'arrowdown' ? 1 : 0;
      if (!dx && !dy) return;
      const screen = tvScreenMesh;
      const move = screen?.userData.moveConsolePlayer as ((x: number, y: number) => void) | undefined;
      move?.(dx, dy);
      requestRender();
    };
    const consoleAction = () => {
      if (consoleGameOverActive) {
        const screen = tvScreenMesh;
        const restart = screen?.userData.setConsolePlaying as ((active: boolean) => void) | undefined;
        restart?.(true);
        consoleGameOverActive = false;
        setConsoleGameOver(false);
        setConsoleScore(0);
        requestRender();
        return;
      }
      const screen = tvScreenMesh;
      const action = screen?.userData.activateConsoleShield as (() => void) | undefined;
      action?.();
      requestRender();
    };
    const moveKey = (key: string, pressed: boolean) => {
      const normalized = key.toLowerCase();
      if (!GAME_KEYS.has(normalized) || isGettingUp) return;
      if (isConsolePlaying) {
        if (pressed) moveConsolePlayer(normalized);
        return;
      }
      if (pressed) pressedKeys.add(normalized);
      else pressedKeys.delete(normalized);
    };
    const setWalking = (enabled: boolean) => {
      if (!enabled && isUsingPC) exitPC();
      if (!enabled && isConsolePlaying) setConsoleGame(false);
      isRoomProjectsView = false;
      setRoomProjectsView(false);
      if (!enabled) {
        updateDeskCode(null);
        deskModeRef.current = null;
        setDeskMode(null);
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      }
      walkingRef.current = enabled;
      setWalkingState(enabled);
      pressedKeys.clear();
      movementVelocity.set(0, 0);
      verticalVelocity = 0;
      isGrounded = true;
      isResting = false;
      setResting(false);
      isGettingUp = false;
      setGettingUp(false);
      isSitting = false;
      sittingOn = 'desk';
      setSitting(false);
      player.spine.position.y = 0.72;
      for (const arm of player.arms) arm.position.y = 1.22;
      for (const leg of player.legs) leg.rotation.x = 0;
      for (const elbow of player.elbows) elbow.rotation.x = 0;
      for (const knee of player.knees) knee.rotation.x = 0;
      cameraAnimatingRef.current = false;
      player.root.visible = enabled;
      document.body.classList.toggle('room-walking', enabled);
      if (!enabled) {
        lastGamePrompt = null;
        setGamePrompt(null);
      }
      controls.enabled = !enabled;
      if (enabled) {
        const spawn = pushOutSpawn(0, 6.5);
        player.root.position.set(spawn.x, floorY, spawn.z);
        player.root.rotation.y = 0;
        camera.fov = 52;
        cameraTarget.set(0, floorY + SCALE.thirdPersonCamera.height, 6.5);
        cameraDirection.set(Math.sin(cameraYaw), Math.sin(cameraPitch), Math.cos(cameraYaw)).normalize();
        cameraDesired.copy(cameraTarget).addScaledVector(cameraDirection, cameraDistance);
        controls.target.copy(cameraTarget);
        camera.position.copy(cameraDesired);
        player.root.rotation.set(0, 0, 0);
        interaction.startWalking();
      } else {
        const resp = getResponsivePreset(presetRef.current, camera.aspect);
        camera.fov = camera.aspect < 1 ? Math.min(56, 36 / Math.pow(Math.max(0.4, camera.aspect), 0.48)) : 36;
        camTargetPosRef.current.set(...resp.position);
        camTargetLookRef.current.set(...resp.target);
        cameraAnimatingRef.current = true;
        lidTargetRef.current = presetRef.current.lidAngle;
        interaction.stopWalking();
      }
      syncInteraction();
      camera.updateProjectionMatrix();
      controls.update();
      requestRender();
    };
    const viewProjects = () => {
      if (!walkingRef.current) return;
      isRoomProjectsView = true;
      setRoomProjectsView(true);
      pressedKeys.clear(); movementVelocity.set(0, 0);
      player.root.visible = false;
      controls.enabled = false;
      camera.fov = camera.aspect < 1 ? Math.min(70, 42 / Math.max(0.45, camera.aspect)) : 52;
      camera.updateProjectionMatrix();
      const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
      const distance = Math.max(
        PROJECT_GALLERY.panelWidth / (2 * Math.tan(halfFov) * Math.max(0.4, camera.aspect)),
        PROJECT_GALLERY.panelHeight / (2 * Math.tan(halfFov))
      ) + 1.15;
      const wallZ = PROJECT_GALLERY.wallZ;
      camTargetPosRef.current.set(0, floorY + PROJECT_GALLERY.cameraHeightAboveFloor, wallZ - distance);
      camTargetLookRef.current.set(0, floorY + PROJECT_GALLERY.cameraTargetHeightAboveFloor, wallZ);
      cameraAnimatingRef.current = true;
      requestRender();
    };
    const returnToRoom = () => {
      if (!isRoomProjectsView) return;
      isRoomProjectsView = false;
      setRoomProjectsView(false);
      player.root.visible = true;
      controls.enabled = false;
      camera.fov = camera.aspect < 1 ? Math.min(70, 52 / Math.max(0.45, camera.aspect)) : 52;
      camera.updateProjectionMatrix();
      cameraYaw = player.root.rotation.y;
      safeCameraRange = cameraDistance;
      lastCameraCollisionCheck = 0;
      cameraAnimatingRef.current = false;
      requestRender();
    };
    const interact = () => {
      if (isRoomProjectsView) { returnToRoom(); return; }
      if (isGettingUp) return;
      if (!walkingRef.current) return;
      if (isConsolePlaying) {
        setConsoleGame(false);
        interaction.exitGame();
        syncInteraction();
        return;
      }
      if (lastGamePrompt === 'gym') {
        workoutUntil = performance.now() + 5200;
        setGameToast('SÃ©ance lancÃ©e : ton personnage enchaÃ®ne des rÃ©pÃ©titions.');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => setGameToast(''), 3000);
        requestRender();
        return;
      }
      if (lastGamePrompt === 'door') { setWalking(false); return; }
      if (lastGamePrompt === 'desk' || lastGamePrompt === 'gaming' || lastGamePrompt === 'sofa' || lastGamePrompt === 'podcast') {
        if (isSitting) {
          interaction.standUp();
        } else {
          const zone: SeatZone = lastGamePrompt === 'gaming' ? 'gaming' : lastGamePrompt;
          interaction.requestSeat(zone, performance.now());
        }
        if (!isSitting) {
          sittingOn = lastGamePrompt === 'gaming' ? 'gaming' : lastGamePrompt;
          if (lastGamePrompt === 'podcast') podcastSeatX = player.root.position.x < -8.5 ? -8.83 : -7.27;
        }
        isSitting = !isSitting;
        isGrounded = true; verticalVelocity = 0;
        setSitting(isSitting);
        movementVelocity.set(0, 0);
        pressedKeys.clear();
        if (isSitting) {
          if (sittingOn === 'sofa') {
            sittingPosition.set(6.33, floorY + 0.14, 3.5);
            player.root.position.copy(sittingPosition);
            player.root.rotation.y = -Math.PI / 2;
            player.spine.position.y = 0.55;
            for (const arm of player.arms) arm.position.y = 1.05;
            for (const elbow of player.elbows) elbow.rotation.x = 0.18;
            setGameToast('Tu es assis sur le canapÃ©. Appuie sur E pour te relever.');
          } else if (sittingOn === 'podcast') {
            sittingPosition.set(podcastSeatX, floorY + 0.12, 0.34);
            player.root.position.copy(sittingPosition);
            player.root.rotation.y = podcastSeatX < -8.05 ? Math.PI + 0.38 : Math.PI - 0.38;
            player.spine.position.y = 0.55;
            for (const arm of player.arms) arm.position.y = 1.05;
            for (const elbow of player.elbows) elbow.rotation.x = 0.22;
            setGameToast('Tu es assis au coin podcast. Appuie sur E pour te relever.');
          } else if (sittingOn === 'gaming') {
            sittingPosition.set(6.15, floorY, 0.82);
            player.root.position.copy(sittingPosition);
            player.root.rotation.y = 0;
            player.spine.position.y = 0.4;
            for (const arm of player.arms) { arm.position.y = 1.08; arm.rotation.x = 0.52; }
            for (const elbow of player.elbows) elbow.rotation.x = 0.42;
            setGameToast('Setup gaming activÃ©. Tu peux coder et utiliser les trois Ã©crans.');
          } else {
            sittingPosition.set(0, floorY, -0.87);
            player.root.position.copy(sittingPosition);
            player.root.rotation.y = 0;
            player.spine.position.y = 0.38;
            for (const arm of player.arms) { arm.position.y = 1.08; arm.rotation.x = 0.52; }
            for (const elbow of player.elbows) elbow.rotation.x = 0.42;
            setGameToast('Tu es assis au bureau. Appuie sur E pour te relever.');
          }
          for (const leg of player.legs) leg.rotation.x = 0.92;
          for (const knee of player.knees) knee.rotation.x = 0.72;
        } else {
          player.spine.position.y = 0.72;
          for (const arm of player.arms) arm.position.y = 1.22;
          for (const leg of player.legs) leg.rotation.x = 0;
          for (const knee of player.knees) knee.rotation.x = 0;
          for (const elbow of player.elbows) elbow.rotation.x = 0;
          if (sittingOn === 'sofa') {
            player.root.position.set(5.1, floorY, 3.5);
            player.root.rotation.y = 0;
          } else if (sittingOn === 'podcast') {
            player.root.position.set(-7.05, floorY, 2.3);
            player.root.rotation.y = 0;
          } else if (sittingOn === 'gaming') {
            updateDeskCode(null);
            deskModeRef.current = null;
            setDeskMode(null);
            player.root.position.set(6.15, floorY, 1.62);
            player.root.rotation.y = 0;
          } else {
            updateDeskCode(null);
            deskModeRef.current = null;
            setDeskMode(null);
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            player.root.position.set(0, floorY, 0.02);
            player.root.rotation.y = 0;
          }
          setGameToast('Tu es debout.');
        }
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => setGameToast(''), 2200);
        interaction.confirm();
        syncInteraction();
      } else if (lastGamePrompt === 'lamp') {
        lampEnabled = !lampEnabled;
        const lamp = bedsideLampLight;
        const bulb = bedsideLampBulb;
        if (lamp) lamp.intensity = lampEnabled ? 0.72 : 0;
        const bulbMaterial = bulb?.material as THREE.MeshStandardMaterial | undefined;
        if (bulbMaterial?.emissiveIntensity !== undefined) bulbMaterial.emissiveIntensity = lampEnabled ? 1.5 : 0;
        setGameToast(lampEnabled ? 'La lampe est allumÃ©e.' : 'La lampe est Ã©teinte.');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => setGameToast(''), 1800);
      } else if (lastGamePrompt === 'bed') {
        isResting = !isResting;
        setResting(isResting);
        pressedKeys.clear();
        movementVelocity.set(0, 0);
        verticalVelocity = 0;
        isGrounded = true;
        if (isResting) {
          isGettingUp = false;
          setGettingUp(false);
          cameraYaw = 0.45; cameraPitch = 0.3; cameraDistance = 2.8;
          safeCameraRange = cameraDistance;
          setGameToast('Bonne pause !');
        } else {
          isGettingUp = true;
          setGettingUp(true);
          cameraYaw = 0.34; cameraPitch = 0.025; cameraDistance = SCALE.thirdPersonCamera.distance;
          safeCameraRange = cameraDistance;
          setGameToast(lang === 'fr' ? 'Tu te r?veilles...' : 'Getting up...');
        }
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => setGameToast(''), 1600);
      } else if (lastGamePrompt === 'tv') {
        tvEnabled = !tvEnabled;
        setTvOn(tvEnabled);
        const screen = tvScreenMesh;
        const tvLight = tvGlowLight;
        if (screen) screen.visible = tvEnabled;
        if (tvLight) tvLight.intensity = tvEnabled ? 0.8 : 0;
        setGameToast(tvEnabled ? 'La tÃ©lÃ©vision est allumÃ©e.' : 'La tÃ©lÃ©vision est Ã©teinte.');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => setGameToast(''), 1800);
      }
      requestRender();
    };
    const handleGameKeyDown = (event: KeyboardEvent) => {
      if (!walkingRef.current) return;
      if (isUsingPC) {
        const target = event.target;
        if (target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
        const key = event.key.toLowerCase();
        if (key === 'escape' || key === 'e') exitPC();
        else if (key === 'arrowleft' || key === 'a') selectPCProject(pcProjectIndex - 1);
        else if (key === 'arrowright' || key === 'd') selectPCProject(pcProjectIndex + 1);
        else if (key === 'enter') openPCLink('live');
        else if (key === 'c') openPCLink('code');
        else return;
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      if (isRoomProjectsView) {
        if (event.key.toLowerCase() === 'e' || event.key === 'Escape') {
          event.preventDefault(); event.stopImmediatePropagation(); returnToRoom();
        }
        return;
      }
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (isConsolePlaying) {
        const key = event.key.toLowerCase();
        const gameKey = ['a', 'd', 'arrowleft', 'arrowright', 'e', 'enter'].includes(key) || event.code === 'Space';
        if (!gameKey && !GAME_KEYS.has(key)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (key === 'e') interact();
        else if (consoleGameOverActive && (event.code === 'Space' || key === 'enter')) consoleAction();
        else if (event.code === 'Space') consoleAction();
        else if (!consoleGameOverActive && ['a', 'd', 'arrowleft', 'arrowright'].includes(key) && !event.repeat) moveConsolePlayer(key);
        return;
      }
      if (event.key.toLowerCase() === 'e') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (ENABLE_PC_VIEW && isSitting && sittingOn === 'desk') enterPC();
        else interact();
        return;
      }
      if (isConsolePlaying && event.code === 'Space') {
        event.preventDefault(); event.stopImmediatePropagation(); consoleAction(); return;
      }
      if (event.code === 'Space' && !event.repeat && isGrounded && !isSitting && !isResting) {
        event.preventDefault(); event.stopImmediatePropagation();
        verticalVelocity = 4.3; isGrounded = false; requestRender(); return;
      }
      if (isConsolePlaying && GAME_KEYS.has(event.key.toLowerCase())) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (!event.repeat) moveConsolePlayer(event.key);
        return;
      }
      if (!GAME_KEYS.has(event.key.toLowerCase())) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      moveKey(event.key, true);
      requestRender();
    };
    const handleGameKeyUp = (event: KeyboardEvent) => {
      if (!walkingRef.current || isRoomProjectsView || !GAME_KEYS.has(event.key.toLowerCase())) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      moveKey(event.key, false);
    };
    window.addEventListener('keydown', handleGameKeyDown, true);
    window.addEventListener('keyup', handleGameKeyUp, true);
    const handleCeilingKeys = (event: KeyboardEvent) => {
      if (!activeRef.current || isConsolePlaying || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      const key = event.key.toLowerCase();
      if (key === 'l') toggleCeilingLighting();
      else if (key === '1') setCeilingPreset('work');
      else if (key === '2') setCeilingPreset('gaming');
      else if (key === '3') setCeilingPreset('creative');
      else if (key === '4') setCeilingPreset('chill');
      else return;
      event.preventDefault(); event.stopImmediatePropagation(); requestRender();
    };
    if (ENABLE_CEILING_V2) window.addEventListener('keydown', handleCeilingKeys, true);

    // Pre-allocate scratch math objects for animation loop & 3D screen quad projection
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let pointerDownXY: [number, number, boolean] | null = null;
    const cornerScratch = [
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ];

    const syncYoutubeOverlay = () => {
      const overlay = videoOverlayRef.current;
      if (!overlay) return;
      if (!activeRef.current || !youtubeIdRef.current) {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        return;
      }

      const vw = host.clientWidth || window.innerWidth;
      const vh = host.clientHeight || window.innerHeight;
      assembly.root.updateMatrixWorld(true);
      camera.updateMatrixWorld();

      const hw = assembly.screenDimensions.width / 2;
      const hh = assembly.screenDimensions.height / 2;
      // Local quad corners on PlaneGeometry(screenW, screenH): TL, TR, BR, BL
      cornerScratch[0].set(-hw, hh, 0);
      cornerScratch[1].set(hw, hh, 0);
      cornerScratch[2].set(hw, -hh, 0);
      cornerScratch[3].set(-hw, -hh, 0);

      const quad: [Point2D, Point2D, Point2D, Point2D] = [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ];
      for (let i = 0; i < 4; i++) {
        cornerScratch[i].applyMatrix4(assembly.screenMesh.matrixWorld);
        cornerScratch[i].project(camera);
        quad[i].x = (cornerScratch[i].x * 0.5 + 0.5) * vw;
        quad[i].y = (-cornerScratch[i].y * 0.5 + 0.5) * vh;
      }

      const matrixStr = computeQuadMatrix3d(960, 640, quad);
      if (!matrixStr) {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        return;
      }
      overlay.style.transform = matrixStr;
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'auto';
    };

    let rafId = 0;
    let lastTime = performance.now();
    let lastScreenPaint = 0;
    let renderQueued = false;
    let contextLost = false;
    let rendererInfoLogged = false;
    const fpsGuard = new FpsGuard();

    const gl = renderer.getContext();
    const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;

    const afterDraw = (next: () => void) => {
      if (disposed) return;
      if (!isSoftwareGl) {
        if (ceilingContinuous) window.setTimeout(next, 1000 / CEILING.animation.normalHz);
        else rafId = requestAnimationFrame(next);
        return;
      }
      if (isWebGL2) {
        const sync = (gl as WebGL2RenderingContext).fenceSync(
          (gl as WebGL2RenderingContext).SYNC_GPU_COMMANDS_COMPLETE,
          0
        );
        if (sync) {
          (gl as WebGL2RenderingContext).flush();
          setTimeout(() => {
            try {
              (gl as WebGL2RenderingContext).deleteSync(sync);
            } catch {
              // ignore cleanup on context loss
            }
            if (!disposed) next();
          }, 80);
          return;
        }
      }
      setTimeout(() => {
        if (!disposed) next();
      }, walkingRef.current ? 36 : 80);
    };

    const tick = () => {
      if (disposed || contextLost) return;
      renderQueued = false;
      if (!activeRef.current) return;

      const now = performance.now();
      if (interaction.tickFailsafe(now)) {
        forceResetInteraction();
      }
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const reducedMotion = reducedMotionRef.current;

      let needsMoreFrames = false;
      pcLightFactor = dampValue(pcLightFactor, isUsingPC ? 0.75 : 1, 4.5, dt);
      ceilingRoomLights.intensityScale = pcLightFactor;
      const ceilingAnimating = assembly.ceilingRig?.tick(dt, now, getCeilingLightingState(), isSoftwareGl, reducedMotion, ceilingRoomLights) ?? false;
      ceilingContinuous = ceilingAnimating && !reducedMotion && !isSoftwareGl;
      needsMoreFrames = ceilingAnimating;
      if (Math.abs(pcLightFactor - (isUsingPC ? 0.75 : 1)) > 0.008) needsMoreFrames = true;

      if (walkingRef.current && !isRoomProjectsView && !isUsingPC) {
        const inputX = Number(pressedKeys.has('d') || pressedKeys.has('arrowright')) - Number(pressedKeys.has('a') || pressedKeys.has('arrowleft'));
        const inputY = Number(pressedKeys.has('w') || pressedKeys.has('arrowup')) - Number(pressedKeys.has('s') || pressedKeys.has('arrowdown'));
        const inputMagnitude = Math.hypot(inputX, inputY);
        const forwardX = controls.target.x - camera.position.x;
        const forwardZ = controls.target.z - camera.position.z;
        const forwardLength = Math.hypot(forwardX, forwardZ) || 1;
        const forwardWorldX = forwardX / forwardLength;
        const forwardWorldZ = forwardZ / forwardLength;
        const rightWorldX = -forwardWorldZ;
        const rightWorldZ = forwardWorldX;
        const targetSpeed = pressedKeys.has('shift') ? SCALE.movement.runSpeed : SCALE.movement.walkSpeed;
        const desiredX = isResting || isGettingUp || isSitting || inputMagnitude === 0 ? 0 : ((rightWorldX * inputX + forwardWorldX * inputY) / inputMagnitude) * targetSpeed;
        const desiredZ = isResting || isGettingUp || isSitting || inputMagnitude === 0 ? 0 : ((rightWorldZ * inputX + forwardWorldZ * inputY) / inputMagnitude) * targetSpeed;
        const velocityBlend = 1 - Math.exp(-SCALE.movement.acceleration * dt);
        movementVelocity.x += (desiredX - movementVelocity.x) * velocityBlend;
        movementVelocity.y += (desiredZ - movementVelocity.y) * velocityBlend;
        if (isResting) {
          player.root.position.lerp(sleepingPosition, 1 - Math.exp(-5.5 * dt));
          player.root.quaternion.slerp(sleepingQuaternion, 1 - Math.exp(-5.5 * dt));
        } else if (isGettingUp) {
          player.root.position.lerp(wakePosition, 1 - Math.exp(-5.5 * dt));
          player.root.quaternion.slerp(standingQuaternion, 1 - Math.exp(-5.5 * dt));
          if (player.root.position.distanceToSquared(wakePosition) < 0.0016 && player.root.quaternion.angleTo(standingQuaternion) < 0.025) {
            player.root.position.copy(wakePosition);
            player.root.quaternion.copy(standingQuaternion);
            isGettingUp = false;
            setGettingUp(false);
          }
        } else if (isSitting) {
          player.root.position.lerp(sittingPosition, Math.min(1, dt * 8));
          player.root.rotation.x = THREE.MathUtils.damp(player.root.rotation.x, 0, 7, dt);
        } else {
          player.root.rotation.x = THREE.MathUtils.damp(player.root.rotation.x, 0, 7, dt);
        }
        const isMoving = movementVelocity.length() > 0.08 && !isResting && !isSitting;
        const animationState = isResting ? 'idle' : isSitting ? 'sit' : isMoving ? (pressedKeys.has('shift') ? 'run' : 'walk') : 'idle';
        const animationSpeed = animationState === 'walk'
          ? Math.max(0.25, movementVelocity.length() / SCALE.movement.walkSpeed)
          : animationState === 'run'
            ? Math.max(0.25, movementVelocity.length() / SCALE.movement.runSpeed)
            : 1;
        playAvatarAction(animationState, animationSpeed);
        avatarMixer?.update(dt);
        if (!isResting && !isSitting && movementVelocity.lengthSq() > 0.0001) {
          const speed = dt;
          const px = player.root.position.x;
          const pz = player.root.position.z;
          const move = resolvePlanarMove(
            { x: px, z: pz },
            { x: movementVelocity.x * speed, z: movementVelocity.y * speed },
            COLLISION.radius * COLLISION.radiusScale,
            ROOM_COLLIDERS
          );
          player.root.position.x = move.x;
          player.root.position.z = move.z;
          if (move.blockedX) movementVelocity.x = 0;
          if (move.blockedZ) movementVelocity.y = 0;
          if (isMoving) {
            const desiredYaw = Math.atan2(movementVelocity.x, -movementVelocity.y);
            const yawDelta = THREE.MathUtils.euclideanModulo(desiredYaw - player.root.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
            player.root.rotation.y += yawDelta * (1 - Math.exp(-SCALE.movement.turnRate * dt));
            if (Math.abs(inputY) >= Math.abs(inputX) && inputY !== 0) {
              const cameraFollowDelta = THREE.MathUtils.euclideanModulo(player.root.rotation.y - cameraYaw + Math.PI, Math.PI * 2) - Math.PI;
              cameraYaw += cameraFollowDelta * (1 - Math.exp(-SCALE.movement.turnRate * dt));
            }
          }
          walkClock += dt * (7.2 + movementVelocity.length() * 1.9);
        }
        if (!isResting && !isGettingUp && !isSitting) {
          if (!isGrounded || verticalVelocity > 0) {
            verticalVelocity -= 12.5 * dt;
            player.root.position.y += verticalVelocity * dt;
            if (player.root.position.y <= floorY) {
              player.root.position.y = floorY;
              verticalVelocity = 0;
              isGrounded = true;
            }
          } else player.root.position.y = floorY;
        }
        const playerPosition = player.root.position;
        const nextPrompt: typeof lastGamePrompt = isResting
          ? 'bed'
          : isGettingUp
            ? null
            : isSitting
            ? sittingOn
          : Math.abs(playerPosition.x) < 1.4 && playerPosition.z > -0.25 && playerPosition.z < 0.48
          ? 'desk'
          : playerPosition.x > 5.15 && playerPosition.x < 6.98 && playerPosition.z > 1.65 && playerPosition.z < 2.15
            ? 'gaming'
          : playerPosition.x > -8.55 && playerPosition.x < -6.05 && playerPosition.z > 4.96 && playerPosition.z < 5.55
            ? 'gym'
          : playerPosition.x > 5.0 && playerPosition.x < 5.62 && playerPosition.z > 2.15 && playerPosition.z < 4.85
            ? 'sofa'
          : playerPosition.z > 1.24 && playerPosition.z < 1.96 && ((playerPosition.x > -7.25 && playerPosition.x < -6.68) || (playerPosition.x > -9.15 && playerPosition.x < -8.86))
            ? 'podcast'
          : playerPosition.x > 5.9 && playerPosition.x < 6.2 && playerPosition.z > 6.25 && playerPosition.z < 6.85
            ? 'lamp'
            : playerPosition.x > 7.88 && playerPosition.x < 8.7 && playerPosition.z > 2.35 && playerPosition.z < 4.82
              ? 'tv'
              : playerPosition.x > 6.1 && playerPosition.x < 6.76 && playerPosition.z > 6.9 && playerPosition.z < 8.12
              ? 'bed'
              : null;
        if (nextPrompt !== lastGamePrompt) {
          lastGamePrompt = nextPrompt;
          setGamePrompt(nextPrompt);
        }
        if (isSitting) {
          if (isConsolePlaying) {
            cameraTarget.set(7.15, floorY + 1.18, 3.55);
            cameraYaw = -1.25; cameraPitch = 0.3; cameraDistance = 5.2;
          } else {
            cameraTarget.set(
              sittingOn === 'podcast' ? -8.05 : sittingOn === 'gaming' ? 6.15 : playerPosition.x,
              floorY + (sittingOn === 'desk' || sittingOn === 'gaming' ? 0.99 : 1.2),
              sittingOn === 'podcast' ? 0.4 : sittingOn === 'gaming' ? -0.12 : playerPosition.z
            );
            cameraYaw = sittingOn === 'sofa' ? 1.18 : sittingOn === 'podcast' ? 0.55 : sittingOn === 'gaming' ? 0.12 : 0.12;
            cameraPitch = sittingOn === 'gaming' ? 0.23 : 0.16;
            cameraDistance = sittingOn === 'podcast' ? 5.2 : sittingOn === 'sofa' ? 2.8 : sittingOn === 'gaming' ? 3.6 : 1.8;
          }
        } else if (isResting) {
          cameraTarget.set(playerPosition.x, playerPosition.y + 0.18, playerPosition.z - 0.6);
        } else {
          cameraTarget.set(playerPosition.x, playerPosition.y + SCALE.thirdPersonCamera.height, playerPosition.z);
        }
        cameraDirection.set(
          Math.sin(cameraYaw) * Math.cos(cameraPitch),
          Math.sin(cameraPitch),
          Math.cos(cameraYaw) * Math.cos(cameraPitch)
        ).normalize();
        const cameraRange = cameraDistance;
        safeCameraRange = Math.min(safeCameraRange, cameraRange);
        if (!isConsolePlaying && !isResting && !isGettingUp && now - lastCameraCollisionCheck > 80) {
          cameraTarget.set(
            THREE.MathUtils.clamp(cameraTarget.x, CAMERA_LIMITS.minX, CAMERA_LIMITS.maxX),
            THREE.MathUtils.clamp(cameraTarget.y, CAMERA_LIMITS.minY, CAMERA_LIMITS.maxY),
            THREE.MathUtils.clamp(cameraTarget.z, CAMERA_LIMITS.minZ, CAMERA_LIMITS.maxZ)
          );
          headDirection.set(playerPosition.x, playerPosition.y + CAMERA_LIMITS.headOffset, playerPosition.z);
          cameraRay.set(headDirection, cameraDirection);
          cameraRay.far = cameraRange;
          const obstruction = cameraRay.intersectObject(assembly.root, true).find((hit) => hit.distance > 0.25);
          safeCameraRange = obstruction
            ? Math.max(CAMERA_LIMITS.minObstructedDistance, obstruction.distance - CAMERA_LIMITS.obstructionMargin)
            : cameraRange;
          lastCameraCollisionCheck = now;
        }
        cameraDesired.copy(cameraTarget).addScaledVector(cameraDirection, safeCameraRange);
        cameraDesired.x = THREE.MathUtils.clamp(cameraDesired.x, CAMERA_LIMITS.minX, CAMERA_LIMITS.maxX);
        cameraDesired.y = THREE.MathUtils.clamp(cameraDesired.y, CAMERA_LIMITS.minY, CAMERA_LIMITS.maxY);
        cameraDesired.z = THREE.MathUtils.clamp(cameraDesired.z, CAMERA_LIMITS.minZ, CAMERA_LIMITS.maxZ);
        controls.target.lerp(cameraTarget, Math.min(1, dt * 9));
        camera.position.lerp(cameraDesired, Math.min(1, dt * 8));
        if (isMoving && !isSitting && !isResting) {
          gazeTarget.set(
            playerPosition.x + movementVelocity.x * 0.55,
            playerPosition.y + 1.2,
            playerPosition.z + movementVelocity.y * 0.55
          );
          headDirection.copy(gazeTarget).sub(playerPosition);
        } else {
          const zoneTarget = lastGamePrompt ? gazeTargets[lastGamePrompt] : undefined;
          if (zoneTarget) headDirection.copy(zoneTarget).sub(playerPosition);
          else cameraDirection.copy(camera.position).sub(playerPosition);
        }
        const cosYaw = Math.cos(player.root.rotation.y);
        const sinYaw = Math.sin(player.root.rotation.y);
        const localX = headDirection.x * cosYaw + headDirection.z * sinYaw;
        const localZ = -headDirection.x * sinYaw + headDirection.z * cosYaw;
        const headYaw = THREE.MathUtils.clamp(Math.atan2(localX, -localZ), -1.22, 1.22);
        const headPitch = THREE.MathUtils.clamp(Math.atan2(headDirection.y, Math.hypot(localX, localZ)), -0.61, 0.61);
        player.spine.rotation.y = dampValue(player.spine.rotation.y, headYaw * 0.3, 5, dt);
        player.spine.rotation.x = dampValue(player.spine.rotation.x, headPitch * 0.3, 5, dt);
        player.head.rotation.y = dampValue(player.head.rotation.y, headYaw * 0.7, 5, dt);
        player.head.rotation.x = dampValue(player.head.rotation.x, headPitch * 0.7, 5, dt);
        player.torso.scale.y = reducedMotion ? 1 : 1 + Math.sin(now / (isResting ? 1450 : 620)) * (isResting ? 0.012 : 0.004);
        if (now >= nextBlinkAt) {
          blinkStartedAt = now;
          nextBlinkAt = now + 3200 + Math.random() * 2600;
        }
        const blinkProgress = blinkStartedAt ? (now - blinkStartedAt) / 155 : -1;
        const eyeOpen = isResting ? 0.12 : blinkProgress >= 0 && blinkProgress <= 1 ? 1 - 0.94 * Math.sin(blinkProgress * Math.PI) : 1;
        for (const [index, eye] of player.eyes.entries()) {
          eye.scale.y = 1.4 * eyeOpen;
          eye.position.x = (index === 0 ? -0.072 : 0.072) + headYaw * 0.018;
          eye.position.y = 0.16 - headPitch * 0.012;
        }
        if (avatarContactShadow) {
          avatarContactShadow.visible = !isResting && !isSitting;
          const jumpHeight = Math.max(0, player.root.position.y - floorY);
          avatarContactShadow.position.y = floorY - player.root.position.y + 0.012;
          avatarContactShadow.scale.setScalar(1 + jumpHeight * 0.28);
          const shadowMaterial = avatarContactShadow.material as THREE.MeshBasicMaterial;
          shadowMaterial.opacity = THREE.MathUtils.clamp(1 - jumpHeight * 0.65, 0.25, 1);
        }
        const stride = isMoving ? Math.sin(walkClock) * (pressedKeys.has('shift') ? 0.57 : 0.42) : 0;
        if (!isResting && !isSitting) {
          player.legs[0].rotation.x = stride;
          player.legs[1].rotation.x = -stride;
          player.arms[0].rotation.x = -stride * 0.72;
          player.arms[1].rotation.x = stride * 0.72;
          player.elbows[0].rotation.x = Math.max(0, -stride) * 0.9;
          player.elbows[1].rotation.x = Math.max(0, stride) * 0.9;
          player.knees[0].rotation.x = Math.max(0, -stride) * 0.68;
          player.knees[1].rotation.x = Math.max(0, stride) * 0.68;
      } else if (!isResting && isSitting && (sittingOn === 'desk' || sittingOn === 'gaming')) {
        const coding = deskModeRef.current === 'code' || deskModeRef.current === 'write';
        const typing = coding ? Math.sin(now * 0.024) * 0.13 : Math.sin(now * 0.006) * 0.08;
        for (const [index, arm] of player.arms.entries()) {
          arm.position.y = 1.08;
          arm.rotation.x = 0.48 + typing * (index === 0 ? 1 : -1);
          arm.rotation.z = (index === 0 ? -1 : 1) * (0.13 + (coding ? 0 : Math.sin(now * 0.004) * 0.09));
          player.elbows[index].rotation.x = 0.35 + Math.abs(typing) * 0.7;
        }
        }
      if (deskSpeechUntil > now) {
        player.head.rotation.x += Math.sin(now * 0.018) * 0.035;
        player.mouth.scale.y = 0.22 + Math.abs(Math.sin(now * 0.026)) * 0.65;
      } else player.mouth.scale.y = 0.22;
        needsMoreFrames = true;
      }

        if (isConsolePlaying) {
        const tvScreen = tvScreenMesh;
        const updateGame = tvScreen?.userData.updateConsoleGame as ((delta: number) => boolean) | undefined;
        if (updateGame?.(dt)) {
          consoleGameOverActive = true;
          const getScore = tvScreen?.userData.getConsoleScore as (() => number) | undefined;
          const getBest = tvScreen?.userData.getConsoleBestScore as (() => number) | undefined;
          setConsoleScore(getScore?.() ?? 0);
          setConsoleBestScore(getBest?.() ?? 0);
          setConsoleGameOver(true);
        }
        needsMoreFrames = true;
      }

      // Damped camera preset glide (smooth 60fps on GPU; direct settle on software WebGL / reduced motion)
      if (cameraAnimatingRef.current) {
        if (isSoftwareGl || reducedMotion) {
          camera.position.copy(camTargetPosRef.current);
          controls.target.copy(camTargetLookRef.current);
          cameraAnimatingRef.current = false;
        } else {
          camera.position.x = dampValue(camera.position.x, camTargetPosRef.current.x, 7.5, dt);
          camera.position.y = dampValue(camera.position.y, camTargetPosRef.current.y, 7.5, dt);
          camera.position.z = dampValue(camera.position.z, camTargetPosRef.current.z, 7.5, dt);

          controls.target.x = dampValue(controls.target.x, camTargetLookRef.current.x, 7.5, dt);
          controls.target.y = dampValue(controls.target.y, camTargetLookRef.current.y, 7.5, dt);
          controls.target.z = dampValue(controls.target.z, camTargetLookRef.current.z, 7.5, dt);

          const posDist = camera.position.distanceTo(camTargetPosRef.current);
          const tgtDist = controls.target.distanceTo(camTargetLookRef.current);
          if (posDist < 0.008 && tgtDist < 0.008) {
            camera.position.copy(camTargetPosRef.current);
            controls.target.copy(camTargetLookRef.current);
            cameraAnimatingRef.current = false;
          } else {
            needsMoreFrames = true;
          }
        }
      }
      const workingOut = workoutUntil > now && !isSitting && !isResting;
      if (workingOut) {
        const rep = Math.sin(now * 0.012);
        player.arms[0].rotation.x = -0.72 + rep * 0.55;
        player.arms[1].rotation.x = -0.72 + rep * 0.55;
        player.elbows[0].rotation.x = 0.3 + Math.max(0, rep) * 0.8;
        player.elbows[1].rotation.x = 0.3 + Math.max(0, rep) * 0.8;
        player.root.rotation.x = Math.sin(now * 0.012 + 0.3) * 0.035;
      } else if (!isGrounded && !isSitting && !isResting) {
        player.legs[0].rotation.x = -0.42; player.legs[1].rotation.x = -0.42;
        player.arms[0].rotation.x = -0.45; player.arms[1].rotation.x = -0.45;
        player.elbows[0].rotation.x = 0.72; player.elbows[1].rotation.x = 0.72;
        player.knees[0].rotation.x = 0.65; player.knees[1].rotation.x = 0.65;
      }

      // Damped lid hinge angle
      if (Math.abs(lidCurrentRef.current - lidTargetRef.current) > 0.002) {
        if (isSoftwareGl) {
          lidCurrentRef.current = lidTargetRef.current;
          assembly.setLidAngle(lidCurrentRef.current);
        } else {
          lidCurrentRef.current = dampValue(
            lidCurrentRef.current,
            lidTargetRef.current,
            8.5,
            dt
          );
          assembly.setLidAngle(lidCurrentRef.current);
          needsMoreFrames = true;
        }
      }

      // Flash decay on case swap
      if (flashAlphaRef.current > 0.005) {
        if (isSoftwareGl) {
          flashAlphaRef.current = 0;
        } else {
          flashAlphaRef.current = dampValue(flashAlphaRef.current, 0, 9.0, dt);
          needsMoreFrames = true;
        }
      }

      // Repaint OLED screen during typing or flash decay (or immediately complete on software GL)
      const elapsedCaseSec = (now - typingStartRef.current) / 1000;
      const typingActive = !portfolioViewRef.current && !isSoftwareGl && elapsedCaseSec < 4.0;
      const paintInterval = isSoftwareGl ? 140 : 55;
      if (
        !caseRef.current.video &&
        (typingActive || flashAlphaRef.current > 0.005) &&
        now - lastScreenPaint >= paintInterval
      ) {
        drawCase(isSoftwareGl ? 10 : elapsedCaseSec, flashAlphaRef.current);
        screenTexture.needsUpdate = true;
        lastScreenPaint = now;
      }
      if (typingActive) {
        needsMoreFrames = true;
      }

      const controlsChanged = controls.update();
      if (controlsChanged && controls.enableDamping) {
        needsMoreFrames = true;
      }
      renderer.render(scene, camera);
      if (import.meta.env.DEV && FEATURE_FLAGS.ENABLE_RENDERER_INFO_LOG && !rendererInfoLogged) {
        rendererInfoLogged = true;
        console.info('[portfolio:renderer.info]', {
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          points: renderer.info.render.points,
          lines: renderer.info.render.lines,
          geometries: renderer.info.memory.geometries,
          textures: renderer.info.memory.textures,
        });
      }
      syncYoutubeOverlay();

      if (needsMoreFrames) {
        if (!renderQueued) {
          renderQueued = true;
          afterDraw(tick);
        }
        if (
          FEATURE_FLAGS.ENABLE_AUTO_FAST_MODE &&
          !isSoftwareGl &&
          (walkingRef.current || isConsolePlaying) &&
          fpsGuard.sample(now)
        ) {
          onLowPerformanceRef.current?.();
        }
      }
    };

    const requestRender = () => {
      if (disposed || !activeRef.current || renderQueued) return;
      renderQueued = true;
      lastTime = performance.now();
      rafId = requestAnimationFrame(tick);
    };

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      renderQueued = false;
      cancelAnimationFrame(rafId);
      onContextLostRef.current?.();
    };
    const handleContextRestored = () => {
      contextLost = false;
      fpsGuard.reset();
      renderer.shadowMap.needsUpdate = true;
      if (activeRef.current) {
        handleResize();
        requestRender();
      }
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const handleControlStart = () => {
      cameraAnimatingRef.current = false;
      requestRender();
    };
    const handleControlChange = () => {
      requestRender();
    };
    controls.addEventListener('start', handleControlStart);
    controls.addEventListener('change', handleControlChange);

    // Click-vs-drag detection on 3D screen
    const handlePointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const onGithubBoard = githubDashboardScreen ? raycaster.intersectObject(githubDashboardScreen, false).length > 0 : false;
      pointerDownXY = [e.clientX, e.clientY, onGithubBoard];
    };
    const handlePointerMove = (e: PointerEvent) => {
      if (!activeRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const githubHit = githubDashboardScreen ? raycaster.intersectObject(githubDashboardScreen, false).length > 0 : false;
      const switchHit = ceilingSwitchPanel ? raycaster.intersectObject(ceilingSwitchPanel, true).length > 0 : false;
      if (switchHit !== ceilingSwitchHovered) {
        ceilingSwitchHovered = switchHit;
        if (ceilingSwitchButton) ceilingSwitchButton.userData.hovered = switchHit;
        if (ceilingSwitchButton?.material instanceof THREE.MeshStandardMaterial) ceilingSwitchButton.material.emissiveIntensity = switchHit ? 1.4 : getCeilingLightingState().enabled ? 0.85 : 0.1;
        setGameToast(switchHit ? copy.lightHotkey : '');
        requestRender();
      }
      renderer.domElement.style.cursor = githubHit || switchHit || raycaster.intersectObjects(tabletScreens, false).length ? 'pointer' : '';
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (!pointerDownXY || !activeRef.current) return;
      const dx = e.clientX - pointerDownXY[0];
      const dy = e.clientY - pointerDownXY[1];
      const startedOnGithubBoard = pointerDownXY[2];
      pointerDownXY = null;
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const ceilingSwitchHit = ceilingSwitchPanel ? raycaster.intersectObject(ceilingSwitchPanel, true)[0] : undefined;
      if (ceilingSwitchHit) {
        toggleCeilingLighting(); setGameToast(''); requestRender(); return;
      }
      const githubDashboardHit = githubDashboardScreen ? raycaster.intersectObject(githubDashboardScreen, false)[0] : undefined;
      if (githubDashboardHit || startedOnGithubBoard) {
        if (Math.abs(dy) > 8) {
          updateGithubDashboard(githubProfileRef.current, repositoriesRef.current, githubLoadingRef.current, githubErrorRef.current, githubDashboardPage + (dy < 0 ? 1 : -1));
        } else if (Math.hypot(dx, dy) <= 6) {
          updateGithubDashboard(githubProfileRef.current, repositoriesRef.current, githubLoadingRef.current, githubErrorRef.current, githubDashboardPage + 1);
        }
        requestRender();
        return;
      }
      if (Math.hypot(dx, dy) > 6) return;
      const pcScreenHit = raycaster.intersectObject(assembly.screenMesh, false)[0];
      if (ENABLE_PC_VIEW && pcScreenHit && walkingRef.current) {
        if (isSitting && sittingOn === 'desk') enterPC();
        else if (!isSitting && Math.hypot(player.root.position.x, player.root.position.z + 0.87) < 3.5) {
          lastGamePrompt = 'desk'; setGamePrompt('desk'); interact();
        }
        return;
      }
      const tabletHit = raycaster.intersectObjects(tabletScreens, false)[0];
      if (tabletHit) {
        const screen = tabletHit.object as THREE.Mesh;
        const setTabletPage = screen.userData.setTabletPage as ((page: number) => void) | undefined;
        if (setTabletPage) {
          const currentPage = Number(screen.userData.tabletPage || 0);
          const direction = (tabletHit.uv?.x ?? 0.75) < 0.5 ? -1 : 1;
          setTabletPage(currentPage + direction);
          requestRender();
        }
        return;
      }
      if (walkingRef.current) {
        const roomHits = raycaster.intersectObject(assembly.root, true);
        const actionForObject = (object: THREE.Object3D): RoomAction => {
          let current: THREE.Object3D | null = object;
          while (current && current !== assembly.root) {
            const name = current.name.toLowerCase();
            if (name.startsWith('sofa-') || name === 'gaming-sofa') return 'sofa';
            if (name.startsWith('podcast-')) return 'podcast';
            if (name.startsWith('mini-gym-')) return 'gym';
            if (name.includes('door')) return 'door';
            if (name.includes('bed') || name.includes('mattress')) return 'bed';
            if (name.includes('television') || name.includes('tv-') || name.includes('game-console') || name.includes('dual-sense')) return 'tv';
            if (name.startsWith('gaming-')) return 'gaming';
            if (name === 'desk' || name.startsWith('desk-') || name.startsWith('office-chair') || name === 'setup-monitor' || name === 'wall-tablet-screen' || name === 'laptop') return 'desk';
            current = current.parent;
          }
          return null;
        };
        const interactiveHit = roomHits.find((hit) => actionForObject(hit.object) !== null);
        const action = interactiveHit ? actionForObject(interactiveHit.object) : null;
        if (action) {
          lastGamePrompt = action; setGamePrompt(action); interact();
        }
        return;
      }
      const hits = raycaster.intersectObject(assembly.screenMesh, false);
      if (hits.length > 0) {
        onScreenClickRef.current();
      }
    };
    const handleOrbitPointerDown = (event: PointerEvent) => {
      if (!walkingRef.current || isRoomProjectsView || event.button !== 0) return;
      orbitPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      renderer.domElement.setPointerCapture(event.pointerId);
      event.preventDefault();
    };
    const handleOrbitPointerMove = (event: PointerEvent) => {
      if (!walkingRef.current || !orbitPointer || event.pointerId !== orbitPointer.id) return;
      const dx = event.clientX - orbitPointer.x;
      const dy = event.clientY - orbitPointer.y;
      orbitPointer.x = event.clientX;
      orbitPointer.y = event.clientY;
      cameraYaw -= dx * 0.006;
      cameraPitch = THREE.MathUtils.clamp(cameraPitch + dy * 0.0045, -0.24, 0.48);
      requestRender();
    };
    const handleOrbitPointerUp = (event: PointerEvent) => {
      if (orbitPointer?.id === event.pointerId) orbitPointer = null;
    };
    const handleGameWheel = (event: WheelEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const dashboardHit = githubDashboardScreen ? raycaster.intersectObject(githubDashboardScreen, false).length > 0 : false;
      if (dashboardHit) {
        event.preventDefault();
        if (Math.abs(event.deltaY) > 2) {
          updateGithubDashboard(githubProfileRef.current, repositoriesRef.current, githubLoadingRef.current, githubErrorRef.current, githubDashboardPage + (event.deltaY > 0 ? 1 : -1));
          requestRender();
        }
        return;
      }
      if (!walkingRef.current || isSitting || isRoomProjectsView) return;
      event.preventDefault();
      cameraDistance = Math.max(
        SCALE.thirdPersonCamera.minDistance,
        Math.min(SCALE.thirdPersonCamera.maxDistance, cameraDistance + event.deltaY * 0.003)
      );
      requestRender();
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointerdown', handleOrbitPointerDown);
    renderer.domElement.addEventListener('pointermove', handleOrbitPointerMove);
    renderer.domElement.addEventListener('pointerup', handleOrbitPointerUp);
    renderer.domElement.addEventListener('pointercancel', handleOrbitPointerUp);
    renderer.domElement.addEventListener('wheel', handleGameWheel, { passive: false });

    let lastAspect = aspect;
    const handleResize = () => {
      if (!host) return;
      const w = Math.max(1, host.clientWidth || window.innerWidth);
      const h = Math.max(1, host.clientHeight || window.innerHeight);
      const asp = w / h;
      camera.fov = asp < 1 ? Math.min(56, 36 / Math.pow(Math.max(0.4, asp), 0.48)) : 36;
      camera.aspect = asp;
      camera.updateProjectionMatrix();
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, PERF.maxDpr));
      renderer.setSize(w, h);
      if (Math.abs(asp - lastAspect) > 0.12 && !walkingRef.current) {
        const resp = getResponsivePreset(presetRef.current, asp);
        camTargetPosRef.current.set(...resp.position);
        camTargetLookRef.current.set(...resp.target);
        camera.position.copy(camTargetPosRef.current);
        controls.target.copy(camTargetLookRef.current);
        controls.update();
        cameraAnimatingRef.current = false;
      }
      lastAspect = asp;
      if (isUsingPC) {
        assembly.screenMesh.updateWorldMatrix(true, false);
        pcBounds.setFromObject(assembly.screenMesh); pcBounds.getCenter(pcCameraCenter);
        const width = pcBounds.max.x - pcBounds.min.x;
        const fitDistance = width / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.max(0.5, asp) * 0.82);
        camTargetPosRef.current.copy(pcCameraCenter).addScaledVector(pcCameraNormal, THREE.MathUtils.clamp(fitDistance, PC_VIEW.minCameraDistance, PC_VIEW.maxCameraDistance));
        camTargetLookRef.current.copy(pcCameraCenter); cameraAnimatingRef.current = true;
      }
      requestRender();
    };
    window.addEventListener('resize', handleResize);

    const cleanupVideo = () => {
      if (activeVideo) {
        activeVideo.pause();
        activeVideo.removeAttribute('src');
        activeVideo.load();
        activeVideo = null;
      }
      if (activeVideoTex) {
        activeVideoTex.dispose();
        activeVideoTex = null;
      }
    };

    apiRef.current = {
      enterPC, exitPC, selectPCProject, openPCLink,
      repaint: () => {
        drawCase(isSoftwareGl ? 10 : 0.2, 0);
        screenTexture.needsUpdate = true;
        requestRender();
      },
      applyFinish: (f) => {
        assembly.setFinish(f);
        requestRender();
      },
      applyPreset: (p) => {
        const w = Math.max(1, host.clientWidth || window.innerWidth);
        const h = Math.max(1, host.clientHeight || window.innerHeight);
        const resp = getResponsivePreset(p, w / h);
        camTargetPosRef.current.set(...resp.position);
        camTargetLookRef.current.set(...resp.target);
        lidTargetRef.current = p.lidAngle;
        cameraAnimatingRef.current = true;
        requestRender();
      },
      applyCase: (c, flash) => {
        typingStartRef.current = performance.now();
        flashAlphaRef.current = flash && !isSoftwareGl ? 0.55 : 0;
        cleanupVideo();
        if (c.video) {
          const vid = document.createElement('video');
          vid.crossOrigin = 'anonymous';
          vid.muted = true;
          vid.loop = true;
          vid.playsInline = true;
          vid.src = c.video;
          vid.play().catch(() => {});
          const vTex = new THREE.VideoTexture(vid);
          vTex.colorSpace = THREE.SRGBColorSpace;
          activeVideo = vid;
          activeVideoTex = vTex;
          assembly.screenMaterial.map = vTex;
          assembly.screenMaterial.needsUpdate = true;
        } else {
          assembly.screenMaterial.map = screenTexture;
          assembly.screenMaterial.needsUpdate = true;
          drawCase(isSoftwareGl ? 10 : 0.2, flashAlphaRef.current);
          screenTexture.needsUpdate = true;
        }
        requestRender();
      },
      wake: () => {
        if (!caseRef.current.video) {
          drawCase(isSoftwareGl ? 10 : 0.2, 0);
          screenTexture.needsUpdate = true;
        }
        handleResize();
        syncYoutubeOverlay();
      },
      syncOverlay: () => {
        syncYoutubeOverlay();
      },
      setWalking,
      viewProjects,
      returnToRoom,
      moveKey,
      jump: () => {
        if (!walkingRef.current || !isGrounded || isSitting || isResting || isGettingUp || isConsolePlaying) return;
        verticalVelocity = 4.3; isGrounded = false; requestRender();
      },
      interact,
      playConsole: () => {
        if (walkingRef.current && isSitting && sittingOn === 'sofa') {
          interaction.requestPlay(performance.now());
          setConsoleGame(true);
          interaction.confirm();
          syncInteraction();
        }
        else setGameToast('Assieds-toi sur le canapÃ© pour jouer Ã  la console.');
      },
      consoleAction,
      restartConsoleGame: () => { setConsoleGame(true); },
      setDeskCode: updateDeskCode,
      animateSpeech,
      updateGithubDashboard,
      requestRender,
    };

    if (activeRef.current) {
      requestRender();
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handlePageVisibility);
      window.removeEventListener('keydown', handleGameKeyDown, true);
      window.removeEventListener('keydown', handleCeilingKeys, true);
      window.removeEventListener('keyup', handleGameKeyUp, true);
      window.clearTimeout(toastTimer);
      setGameToast('');
      document.body.classList.remove('room-walking');
      controls.removeEventListener('start', handleControlStart);
      controls.removeEventListener('change', handleControlChange);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointerdown', handleOrbitPointerDown);
      renderer.domElement.removeEventListener('pointermove', handleOrbitPointerMove);
      renderer.domElement.removeEventListener('pointerup', handleOrbitPointerUp);
      renderer.domElement.removeEventListener('pointercancel', handleOrbitPointerUp);
      renderer.domElement.removeEventListener('wheel', handleGameWheel);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      cleanupVideo();
      screenTexture.dispose();
      envRT.dispose();
      assembly.dispose();
      scene.remove(player.root);
      player.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
      apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (active) {
      typingStartRef.current = performance.now();
      apiRef.current?.wake();
    } else if (walkingRef.current) {
      apiRef.current?.setWalking(false);
    }
  }, [active]);

  useEffect(() => {
    apiRef.current?.setWalking(walking);
  }, [walking]);

  useEffect(() => {
    apiRef.current?.applyFinish(finish);
  }, [finish]);

  useEffect(() => {
    apiRef.current?.applyPreset(preset);
  }, [preset, presetTick]);

  useEffect(() => {
    apiRef.current?.applyCase(caseStudy, swapTick > 0);
  }, [caseStudy, swapTick]);

  useEffect(() => {
    apiRef.current?.repaint();
  }, [portfolioView, portfolioPage, repositories, courses, githubProfile, githubLoading, githubError]);

  useEffect(() => {
    apiRef.current?.updateGithubDashboard(githubProfile, repositories, githubLoading, githubError);
  }, [githubProfile, repositories, githubLoading, githubError]);

  useEffect(() => {
    apiRef.current?.syncOverlay();
  }, [youtubeVideoId, active]);

  useEffect(() => {
    if (!usingPC || !ENABLE_PC_VIEW) return;
    const timer = window.setInterval(() => {
      if (document.hidden || performance.now() < pcPauseUntilRef.current) return;
      setPcProjectIndex((current) => {
        const next = (current + 1) % CASES.length;
        apiRef.current?.applyCase(CASES[next], true);
        return next;
      });
    }, PC_VIEW.autoAdvanceMs);
    return () => window.clearInterval(timer);
  }, [usingPC]);

  return (
    <div className="three-stage-wrapper">
      <div
        ref={hostRef}
        data-testid="three-studio-canvas"
        className="three-canvas-host"
        aria-label="Interactive 3D laptop case study showcase â€” drag to orbit, click screen for next case"
      />
      <div
        ref={videoOverlayRef}
        className="three-screen-video-overlay"
        data-testid="three-youtube-overlay"
      >
        {youtubeVideoId && (
          <div className="three-video-shell">
            <div className="three-video-topbar">
              {onCloseYoutube && (
                <button
                  type="button"
                  className="three-video-close"
                  onClick={onCloseYoutube}
                >
                  â† Photo Mode
                </button>
              )}
              <span className="three-video-title">YouTube Â· @tahaboulhak1172</span>
              <a
                className="three-video-ext"
                href={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Watch â†—
              </a>
            </div>
            <iframe
              key={youtubeVideoId}
              className="three-video-iframe"
              src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&rel=0&modestbranding=1`}
              title="Taha Boulhak YouTube Project Demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>
      {active && ENABLE_CEILING_V2 && <CeilingLightHud lang={lang} onChange={() => apiRef.current?.requestRender()} />}
      {active && <div className={`room-game-ui ${walking ? 'is-walking' : ''}`}>
        <button
          type="button"
          className="room-game-toggle"
          onClick={() => apiRef.current?.setWalking(!walking)}
          aria-pressed={walking}
        >
          <span aria-hidden="true">{walking ? 'â†©' : 'â–¶'}</span>
          {walking ? copy.leaveRoom : copy.exploreRoom}
        </button>
        {walking && !roomProjectsView && !usingPC && <>
          {!resting && <div className="room-game-hint"><strong>{consolePlaying ? 'NEON DODGE' : copy.exploreRoom}</strong><span>{consolePlaying ? copy.gameControls : copy.controls}</span></div>}
          {FEATURE_FLAGS.ENABLE_DEBUG_STATE_OVERLAY && <output className="room-state-debug" aria-live="polite">{interactionState}</output>}
          {gamePrompt && !resting && <button type="button" className="room-game-action" onClick={() => apiRef.current?.interact()}>
            <kbd>E</kbd>{gamePrompt === 'desk'
            ? sitting ? copy.stand : copy.sitDesk
              : gamePrompt === 'gaming'
                ? sitting ? 'Se relever' : 'Sâ€™asseoir au setup gaming'
              : gamePrompt === 'sofa'
                ? sitting ? consolePlaying ? copy.stand : copy.stand : copy.sitCouch
                : gamePrompt === 'podcast'
                  ? sitting ? copy.stand : copy.sitPodcast
                : gamePrompt === 'gym'
                  ? copy.startWorkout
                : gamePrompt === 'lamp'
                ? copy.toggleLamp
                : gamePrompt === 'door'
                  ? copy.leaveRoom
                : gamePrompt === 'tv'
                  ? tvOn ? copy.turnOff : copy.turnOn
                  : resting ? copy.wake : copy.lieDown}
          </button>}
          {sitting && (gamePrompt === 'desk' || gamePrompt === 'gaming' || gamePrompt === 'podcast') && <section className="room-desk-workspace" aria-label="Espace de travail du personnage">
            <div className="room-desk-workspace-head"><span className="room-desk-live-dot" />STUDIO PERSONNEL <small>SESSION ACTIVE</small></div>
            {gamePrompt === 'podcast' && <div className="room-desk-panel-content">
              <p className="room-desk-intro">{lang === 'fr' ? 'Le personnage te pr\u00e9sente son parcours dans la langue choisie.' : 'The character will introduce himself in your selected language.'}</p>
              <button type="button" className="room-desk-submit" onClick={presentCharacter}>{copy.presentMe} ({lang.toUpperCase()})</button>
            </div>}
            <div className="room-desk-tabs" role="tablist" aria-label="ActivitÃ©s du personnage">
              {([['talk', 'Parler'], ['write', 'Ã‰crire'], ['code', 'Coder']] as const).map(([mode, label]) => <button
                key={mode} type="button" role="tab" aria-selected={deskMode === mode}
                className={deskMode === mode ? 'is-active' : ''} onClick={() => chooseDeskMode(mode)}
              >{label}</button>)}
            </div>
            {!deskMode && <p className="room-desk-intro">Choisis une activitÃ© : le personnage te rÃ©pondra, Ã©crira une note ou tapera du code sur son Ã©cran.</p>}
            {deskMode === 'talk' && <div className="room-desk-panel-content">
              <label htmlFor="room-character-message">Message du personnage</label>
              <textarea id="room-character-message" value={deskDraft} onChange={(event) => setDeskDraft(event.target.value)} placeholder="Ã‰cris ce que le personnage doit direâ€¦" rows={3} maxLength={220} />
              <button type="button" className="room-desk-submit" onClick={submitDeskText}>Faire parler le personnage</button>
              {deskMessage && <p className="room-desk-feedback">Â« {deskMessage} Â»</p>}
            </div>}
            {deskMode === 'write' && <div className="room-desk-panel-content">
              <label htmlFor="room-character-note">Carnet de notes</label>
              <textarea id="room-character-note" value={deskDraft} onChange={(event) => setDeskDraft(event.target.value)} placeholder="Ã‰cris une idÃ©e ou une noteâ€¦" rows={3} maxLength={500} />
              <button type="button" className="room-desk-submit" onClick={submitDeskText}>Enregistrer la note</button>
              {deskNotes.map((note, index) => <p className="room-desk-note" key={`${index}-${note}`}>{note}</p>)}
            </div>}
            {deskMode === 'code' && <div className="room-desk-panel-content">
              <label htmlFor="room-character-code">mon-projet.ts <span>TypeScript Â· VS Code</span></label>
              <textarea id="room-character-code" className="room-desk-code" spellCheck={false} value={deskCode} onChange={(event) => {
                setDeskCode(event.target.value); apiRef.current?.setDeskCode(event.target.value);
              }} rows={8} aria-label="Ã‰diteur de code du personnage" />
              <div className="room-desk-code-status"><span>â—</span> Le code apparaÃ®t sur lâ€™Ã©cran du bureau Â· {deskCode.split('\n').length} lignes</div>
            </div>}
          </section>}
          {sitting && gamePrompt === 'sofa' && !consolePlaying && <button type="button" className="room-game-secondary" onClick={() => apiRef.current?.playConsole()}>{copy.playConsole}</button>}
          {sitting && !consolePlaying && gamePrompt !== 'sofa' && !((gamePrompt === 'desk' || gamePrompt === 'gaming' || gamePrompt === 'podcast') && deskMode) && <button type="button" className="room-game-secondary" onClick={() => apiRef.current?.viewProjects()}>{copy.viewProjects}</button>}
          {consolePlaying && <>
            {consoleGameOver && <section className="room-console-game-over" role="status">
              <strong>{copy.gameOverTitle}</strong>
              <span>{copy.score} {consoleScore} Â· {copy.best} {consoleBestScore}</span>
              <span>{copy.restartKeys}</span>
              <button type="button" onClick={() => apiRef.current?.restartConsoleGame()}>{copy.restart}</button>
              <button type="button" onClick={() => apiRef.current?.interact()}>{copy.exitGame}</button>
            </section>}
            {!consoleGameOver && <div className="room-game-console-controls" aria-label="NEON DODGE touch controls">
              <button type="button" aria-label="Move left" onPointerDown={(event) => { event.preventDefault(); apiRef.current?.moveKey('a', true); }}>â†</button>
              <button type="button" aria-label="Move right" onPointerDown={(event) => { event.preventDefault(); apiRef.current?.moveKey('d', true); }}>â†’</button>
              <button type="button" aria-label={copy.shield} onClick={() => apiRef.current?.consoleAction()}>Dash</button>
              <button type="button" aria-label="Exit game" onClick={() => apiRef.current?.interact()}>Exit</button>
            </div>}
          </>}
          {gameToast && <div className="room-game-toast" role="status">{gameToast}</div>}
          {!resting && !sitting && !gettingUp && <div className="room-game-pad" aria-label="Commandes de dÃ©placement">
            {[
              ['ArrowUp', 'â†‘', 'Avancer'],
              ['ArrowLeft', 'â†', 'Aller Ã  gauche'],
              ['ArrowDown', 'â†“', 'Reculer'],
              ['ArrowRight', 'â†’', 'Aller Ã  droite'],
            ].map(([key, icon, label]) => <button
              key={key}
              type="button"
              aria-label={label}
              onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); apiRef.current?.moveKey(key, true); }}
              onPointerUp={() => apiRef.current?.moveKey(key, false)}
              onPointerCancel={() => apiRef.current?.moveKey(key, false)}
              onLostPointerCapture={() => apiRef.current?.moveKey(key, false)}
            >{icon}</button>)}
            <button type="button" aria-label="Sauter" onPointerDown={(event) => { event.preventDefault(); apiRef.current?.jump(); }}>â†¥</button>
          </div>}
        </>}
        {walking && resting && <section className="room-rest-card" aria-live="polite">
          <span className="room-rest-moon" aria-hidden="true">ZZZ</span>
          <strong>{copy.sleepingTitle}</strong>
          <small>{copy.sleepingHint}</small>
          <button type="button" onClick={() => apiRef.current?.interact()}>{copy.wake}</button>
        </section>}
        {walking && roomProjectsView && <section className="room-project-gallery-ui" aria-live="polite">
          <span>{copy.galleryTitle}</span><small>Projets complets \u00b7 mur arri\u00e8re</small>
          <button type="button" onClick={() => apiRef.current?.returnToRoom()}><kbd>ESC</kbd>{copy.returnToRoom}</button>
        </section>}
        {walking && !usingPC && sitting && gamePrompt === 'desk' && ENABLE_PC_VIEW && <button type="button" className="pc-use-prompt" onClick={() => apiRef.current?.enterPC()}>
          <kbd>E</kbd>{lang === 'fr' ? 'Utiliser le PC' : 'Use PC'}
        </button>}
      </div>}
      {active && usingPC && ENABLE_PC_VIEW && <section className="pc-view" aria-label={lang === 'fr' ? 'Vue du PC' : 'PC view'} onTouchStart={(event) => { pcTouchStartX.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => {
        const startX = pcTouchStartX.current; pcTouchStartX.current = null;
        if (startX === null) return;
        const delta = event.changedTouches[0]?.clientX - startX;
        if (Math.abs(delta) > 48) apiRef.current?.selectPCProject(pcProjectIndex + (delta < 0 ? 1 : -1));
      }}>
        <div className="pc-vignette" aria-hidden="true" />
        <button type="button" className="pc-back" onClick={() => apiRef.current?.exitPC()}>{lang === 'fr' ? '← Retour à la pièce' : '← Back to room'} <kbd>Esc</kbd></button>
        <div className="pc-workspace">
          <nav className="pc-project-list" aria-label={lang === 'fr' ? 'Projets' : 'Projects'}>
            <div className="pc-panel-heading"><span className="pc-live-dot" />TAHA / PROJECTS <small>{String(pcProjectIndex + 1).padStart(2, '0')} / {String(CASES.length).padStart(2, '0')}</small></div>
            {CASES.map((project, index) => <button type="button" key={project.id} className={`pc-project-row ${index === pcProjectIndex ? 'is-active' : ''}`} onClick={() => apiRef.current?.selectPCProject(index)}>
              <span className="pc-row-status" /><strong>{project.title}</strong><small>{project.chips.slice(0, 3).join(' · ')}</small>
            </button>)}
            <div className="pc-progress"><span style={{ width: `${((pcProjectIndex + 1) / CASES.length) * 100}%` }} /></div>
          </nav>
          <article className="pc-preview">
            <div className="pc-preview-screen"><img src={CASES[pcProjectIndex].photo || `/projects/${CASES[pcProjectIndex].id}.jpg`} alt={`${CASES[pcProjectIndex].title} preview`} /><span className="pc-screen-label">LIVE PREVIEW / {CASES[pcProjectIndex].id.toUpperCase()}</span></div>
            <div className="pc-preview-copy"><span className="pc-eyebrow">SELECTED BUILD / {String(pcProjectIndex + 1).padStart(2, '0')}</span><h1>{CASES[pcProjectIndex].title}</h1><p>{CASES[pcProjectIndex].text.replace(/^—\s*/, '')}</p><div className="pc-chips">{CASES[pcProjectIndex].chips.slice(0, 4).map((chip) => <span key={chip}>{chip}</span>)}</div>
              <div className="pc-actions"><button type="button" onClick={() => apiRef.current?.openPCLink('code')}>{lang === 'fr' ? 'Voir le code' : 'View code'} <kbd>C</kbd></button>{CASES[pcProjectIndex].liveUrl && <button type="button" className="is-primary" onClick={() => apiRef.current?.openPCLink('live')}>{lang === 'fr' ? 'Application' : 'Live app'} <kbd>↵</kbd></button>}</div>
            </div>
          </article>
          <footer className="pc-controls"><button type="button" onClick={() => apiRef.current?.selectPCProject(pcProjectIndex - 1)}>← {lang === 'fr' ? 'Précédent' : 'Previous'}</button><div className="pc-dots">{CASES.map((project, index) => <button aria-label={project.title} aria-current={index === pcProjectIndex} key={project.id} onClick={() => apiRef.current?.selectPCProject(index)} />)}</div><span>{String(pcProjectIndex + 1).padStart(2, '0')} / {String(CASES.length).padStart(2, '0')}</span><button type="button" onClick={() => apiRef.current?.selectPCProject(pcProjectIndex + 1)}>{lang === 'fr' ? 'Suivant' : 'Next'} →</button></footer>
        </div>
      </section>}
      {active && avatarLoading && <div className="avatar-loading" role="status">Chargement du personnageâ€¦</div>}
    </div>
  );
}

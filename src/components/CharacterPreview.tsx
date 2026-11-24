import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createPlayerAvatarV2, type PlayerAvatar } from '../three/characterV2';
import { SEAT_ANCHORS, CHARACTER_PREVIEW } from '../config/character';

type Motion = 'idle' | 'walk' | 'run' | 'desk' | 'gaming' | 'sofa' | 'podcast';
type Pose = 'none' | 'wave' | 'shrug' | 'thumbs';
type Expression = 'neutral' | 'smile' | 'talk';
type ViewName = 'front' | 'threeQuarter' | 'side' | 'back';

const VIEWS: Record<ViewName, [number, number, number]> = {
  front: [0, 1.02, -2.55],
  threeQuarter: [1.75, 1.12, -1.9],
  side: [2.6, 1.05, 0],
  back: [0, 1.05, 2.6],
};

const MOTIONS: { id: Motion; label: string }[] = [
  { id: 'idle', label: 'Idle' },
  { id: 'walk', label: 'Walk' },
  { id: 'run', label: 'Run' },
  { id: 'desk', label: 'Sit · desk' },
  { id: 'gaming', label: 'Sit · gaming' },
  { id: 'sofa', label: 'Sit · sofa' },
  { id: 'podcast', label: 'Sit · podcast' },
];

const POSES: { id: Pose; label: string }[] = [
  { id: 'none', label: 'Rest' },
  { id: 'wave', label: 'Wave' },
  { id: 'shrug', label: 'Shrug' },
  { id: 'thumbs', label: 'Thumbs' },
];

const EXPRESSIONS: { id: Expression; label: string }[] = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'smile', label: 'Smile' },
  { id: 'talk', label: 'Talk' },
];

const VIEW_OPTIONS: { id: ViewName; label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'threeQuarter', label: '3/4' },
  { id: 'side', label: 'Side' },
  { id: 'back', label: 'Back' },
];

const SEAT_KEYS = new Set<Motion>(['desk', 'gaming', 'sofa', 'podcast']);

const panelStyle: CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 16,
  width: 248,
  padding: '14px 14px 16px',
  borderRadius: 12,
  background: 'rgba(12, 15, 18, 0.82)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#e8ecef',
  font: '12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
  backdropFilter: 'blur(8px)',
  maxHeight: 'calc(100vh - 32px)',
  overflowY: 'auto',
};

const groupLabel: CSSProperties = {
  margin: '12px 0 6px',
  fontSize: 10,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#8d99a3',
};

function rowStyle(): CSSProperties {
  return { display: 'flex', flexWrap: 'wrap', gap: 6 };
}

function buttonStyle(active: boolean): CSSProperties {
  return {
    padding: '5px 8px',
    borderRadius: 6,
    border: `1px solid ${active ? '#6f9f8c' : 'rgba(255,255,255,0.16)'}`,
    background: active ? 'rgba(111,159,140,0.28)' : 'rgba(255,255,255,0.04)',
    color: active ? '#d9f2e8' : '#c7d0d6',
    font: 'inherit',
    cursor: 'pointer',
  };
}

export function CharacterPreview() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [motion, setMotion] = useState<Motion>('idle');
  const [pose, setPose] = useState<Pose>('none');
  const [expression, setExpression] = useState<Expression>('neutral');
  const [view, setView] = useState<ViewName>('front');
  const [turntable, setTurntable] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [stats, setStats] = useState({ height: 0, tris: 0 });

  const motionRef = useRef(motion);
  const poseRef = useRef(pose);
  const expressionRef = useRef(expression);
  const turntableRef = useRef(turntable);
  const applyViewRef = useRef<((name: ViewName) => void) | null>(null);
  const wireframeApplyRef = useRef<((on: boolean) => void) | null>(null);

  motionRef.current = motion;
  poseRef.current = pose;
  expressionRef.current = expression;
  turntableRef.current = turntable;

  useEffect(() => {
    applyViewRef.current?.(view);
  }, [view]);

  useEffect(() => {
    wireframeApplyRef.current?.(wireframe);
  }, [wireframe]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b0e11');
    scene.fog = new THREE.Fog('#0b0e11', 6, 14);

    const camera = new THREE.PerspectiveCamera(34, host.clientWidth / host.clientHeight, 0.05, 100);
    camera.position.set(...VIEWS.front);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.92, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 1.2;
    controls.maxDistance = 6;
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.update();

    applyViewRef.current = (name) => {
      camera.position.set(...VIEWS[name]);
      controls.target.set(0, 0.92, 0);
      controls.update();
    };

    scene.add(new THREE.HemisphereLight('#dfe7ef', '#161a1d', 0.55));

    const key = new THREE.DirectionalLight('#fff3e2', 2.3);
    key.position.set(3.2, 5.4, -4.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 16;
    key.shadow.camera.left = -3;
    key.shadow.camera.right = 3;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -1;
    key.shadow.bias = -0.0008;
    scene.add(key);

    const fill = new THREE.DirectionalLight('#8aa6ff', 0.7);
    fill.position.set(-4, 3.2, 3.5);
    scene.add(fill);

    const rim = new THREE.DirectionalLight('#ffe0c2', 1.1);
    rim.position.set(-1.5, 3, -3.5);
    scene.add(rim);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(7, 64),
      new THREE.MeshStandardMaterial({ color: '#15181b', roughness: 0.95, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(12, 24, '#2c3439', '#20262b');
    grid.position.y = 0.002;
    scene.add(grid);

    const avatar: PlayerAvatar = createPlayerAvatarV2({ lowQuality: false });
    scene.add(avatar.root);

    const measureBox = new THREE.Box3().setFromObject(avatar.root);
    const size = measureBox.getSize(new THREE.Vector3());
    setStats({ height: size.y, tris: renderer.info.render.triangles });

    const uniqueMaterials = new Set<THREE.Material>();
    avatar.root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const list = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of list) uniqueMaterials.add(material);
      }
    });
    wireframeApplyRef.current = (on) => {
      uniqueMaterials.forEach((material) => {
        const record = material as THREE.Material & { wireframe?: boolean };
        if ('wireframe' in record) record.wireframe = on;
      });
    };

    const clock = new THREE.Clock();
    let walkClock = 0;
    let blinkStart = 0;
    let nextBlink = performance.now() + 1200;
    let raf = 0;

    const damp = THREE.MathUtils.damp;
    const rightArm = 1;
    const leftArm = 0;

    const tick = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const now = performance.now();
      const activeMotion = motionRef.current;
      const sitting = SEAT_KEYS.has(activeMotion);
      const moving = activeMotion === 'walk' || activeMotion === 'run';

      let leg0 = 0;
      let leg1 = 0;
      let knee0 = 0;
      let knee1 = 0;
      let arm0x = 0;
      let arm1x = 0;
      let arm0z = -0.08;
      let arm1z = 0.08;
      let elbow0 = 0;
      let elbow1 = 0;
      let spineY = avatar.anchors.standSpineY;
      let armY = avatar.anchors.standArmY;
      let lean = 0;

      if (moving) {
        walkClock += dt * (activeMotion === 'run' ? 11 : 7.6);
        const stride = Math.sin(walkClock) * (activeMotion === 'run' ? 0.57 : 0.42);
        leg0 = stride;
        leg1 = -stride;
        arm0x = -stride * 0.72;
        arm1x = stride * 0.72;
        elbow0 = Math.max(0, -stride) * 0.9;
        elbow1 = Math.max(0, stride) * 0.9;
        knee0 = Math.max(0, -stride) * 0.68;
        knee1 = Math.max(0, stride) * 0.68;
        lean = activeMotion === 'run' ? 0.12 : 0.02;
      } else if (sitting) {
        const seat = SEAT_ANCHORS[activeMotion as 'desk' | 'gaming' | 'sofa' | 'podcast'];
        leg0 = Math.PI / 2;
        leg1 = Math.PI / 2;
        knee0 = -Math.PI / 2;
        knee1 = -Math.PI / 2;
        spineY = seat.spineY;
        armY = seat.armY;
        arm0x = 0.48;
        arm1x = 0.48;
        arm0z = -0.13;
        arm1z = 0.13;
        elbow0 = 0.35;
        elbow1 = 0.35;
        lean = seat.lean;
      }

      const activePose = poseRef.current;
      if (activePose === 'wave') {
        arm1x = 2.5;
        arm1z = 0.35 + Math.sin(now * 0.008) * 0.32;
        elbow1 = -0.5;
      } else if (activePose === 'shrug') {
        arm0z = -0.6;
        arm1z = 0.6;
        arm0x = -0.15;
        arm1x = -0.15;
        elbow0 = 0.95;
        elbow1 = 0.95;
      } else if (activePose === 'thumbs') {
        arm1x = 0.25;
        arm1z = 0.1;
        elbow1 = 1.65;
      }

      const lambda = moving ? 20 : 11;
      const poseLambda = activePose === 'none' ? 8 : 16;

      avatar.legs[0].rotation.x = damp(avatar.legs[0].rotation.x, leg0, lambda, dt);
      avatar.legs[1].rotation.x = damp(avatar.legs[1].rotation.x, leg1, lambda, dt);
      avatar.knees[0].rotation.x = damp(avatar.knees[0].rotation.x, knee0, lambda, dt);
      avatar.knees[1].rotation.x = damp(avatar.knees[1].rotation.x, knee1, lambda, dt);
      avatar.arms[leftArm].rotation.x = damp(avatar.arms[leftArm].rotation.x, arm0x, poseLambda, dt);
      avatar.arms[rightArm].rotation.x = damp(avatar.arms[rightArm].rotation.x, arm1x, poseLambda, dt);
      avatar.arms[leftArm].rotation.z = damp(avatar.arms[leftArm].rotation.z, arm0z, poseLambda, dt);
      avatar.arms[rightArm].rotation.z = damp(avatar.arms[rightArm].rotation.z, arm1z, poseLambda, dt);
      avatar.elbows[leftArm].rotation.x = damp(avatar.elbows[leftArm].rotation.x, elbow0, poseLambda, dt);
      avatar.elbows[rightArm].rotation.x = damp(avatar.elbows[rightArm].rotation.x, elbow1, poseLambda, dt);
      avatar.spine.position.y = damp(avatar.spine.position.y, spineY, 9, dt);
      avatar.spine.rotation.x = damp(avatar.spine.rotation.x, lean, 7, dt);
      avatar.arms[leftArm].position.y = damp(avatar.arms[leftArm].position.y, armY, 9, dt);
      avatar.arms[rightArm].position.y = damp(avatar.arms[rightArm].position.y, armY, 9, dt);

      avatar.torso.scale.y = 1 + Math.sin(now / 900) * 0.006;
      avatar.head.rotation.x = damp(avatar.head.rotation.x, Math.sin(now / 1400) * 0.03, 6, dt);
      avatar.head.rotation.y = damp(avatar.head.rotation.y, Math.sin(now / 2600) * 0.12, 4, dt);

      const activeExpression = expressionRef.current;
      let mouthY = avatar.anchors.mouthClosedScaleY;
      let mouthX = 1;
      if (activeExpression === 'smile') {
        mouthX = 1.55;
        mouthY = 0.55;
      } else if (activeExpression === 'talk') {
        mouthX = 1.15;
        mouthY = 0.22 + Math.abs(Math.sin(now * 0.02)) * 0.7;
      }
      avatar.mouth.scale.x = damp(avatar.mouth.scale.x, mouthX, 14, dt);
      avatar.mouth.scale.y = damp(avatar.mouth.scale.y, mouthY, 22, dt);

      if (now >= nextBlink) {
        blinkStart = now;
        nextBlink = now + 3000 + Math.random() * 2600;
      }
      const blinkProgress = (now - blinkStart) / 150;
      const eyeOpen = blinkProgress >= 0 && blinkProgress <= 1
        ? 1 - 0.94 * Math.sin(blinkProgress * Math.PI)
        : 1;
      for (const [index, eye] of avatar.eyes.entries()) {
        eye.scale.y = 1.4 * eyeOpen;
        eye.position.x = index === 0 ? -avatar.anchors.eyeBaseX : avatar.anchors.eyeBaseX;
        eye.position.y = avatar.anchors.eyeBaseY;
      }

      if (turntableRef.current) avatar.root.rotation.y += dt * CHARACTER_PREVIEW.turntableSpeed;

      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      applyViewRef.current = null;
      wireframeApplyRef.current = null;
      controls.dispose();
      avatar.dispose();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      grid.geometry.dispose();
      const gridMaterial = grid.material;
      if (Array.isArray(gridMaterial)) gridMaterial.forEach((material) => material.dispose());
      else gridMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0b0e11' }}>
      <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
      <div style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <strong style={{ letterSpacing: '0.08em', fontSize: 12 }}>CHARACTER V2</strong>
          <a href="/" style={{ color: '#8d99a3', textDecoration: 'none', fontSize: 11 }}>exit</a>
        </div>
        <div style={{ marginTop: 4, color: '#7f8b94', fontSize: 11 }}>
          height {stats.height.toFixed(3)} · tris {stats.tris}
        </div>

        <div style={groupLabel}>Motion</div>
        <div style={rowStyle()}>
          {MOTIONS.map((option) => (
            <button key={option.id} type="button" style={buttonStyle(motion === option.id)} onClick={() => setMotion(option.id)}>
              {option.label}
            </button>
          ))}
        </div>

        <div style={groupLabel}>Pose</div>
        <div style={rowStyle()}>
          {POSES.map((option) => (
            <button key={option.id} type="button" style={buttonStyle(pose === option.id)} onClick={() => setPose(option.id)}>
              {option.label}
            </button>
          ))}
        </div>

        <div style={groupLabel}>Expression</div>
        <div style={rowStyle()}>
          {EXPRESSIONS.map((option) => (
            <button key={option.id} type="button" style={buttonStyle(expression === option.id)} onClick={() => setExpression(option.id)}>
              {option.label}
            </button>
          ))}
        </div>

        <div style={groupLabel}>Camera</div>
        <div style={rowStyle()}>
          {VIEW_OPTIONS.map((option) => (
            <button key={option.id} type="button" style={buttonStyle(view === option.id)} onClick={() => setView(option.id)}>
              {option.label}
            </button>
          ))}
        </div>

        <div style={groupLabel}>Debug</div>
        <div style={rowStyle()}>
          <button type="button" style={buttonStyle(turntable)} onClick={() => setTurntable((value) => !value)}>
            Turntable
          </button>
          <button type="button" style={buttonStyle(wireframe)} onClick={() => setWireframe((value) => !value)}>
            Wireframe
          </button>
        </div>
      </div>
    </div>
  );
}

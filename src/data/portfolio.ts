export interface CaseStudy {
  id: string;
  video: string;
  photo: string;
  title: string;
  rows: [string, string, string];
  key: string;
  text: string;
  repo: string;
  liveUrl?: string;
  youtubeId?: string;
  youtubeTitle?: string;
  chips: string[];
  code: string[];
  accentHex: string;
}

export interface YoutubeVideo {
  id: string;
  title: string;
  shortLabel: string;
  caseId: string;
  thumb: string;
  url: string;
}

export interface ChassisFinish {
  id: 'silver' | 'emerald' | 'obsidian';
  label: string;
  swatch: string;
  chassisHex: number;
  accentHex: number;
  metalness: number;
  roughness: number;
}

export interface CameraPreset {
  id: 'studio' | 'front' | 'top' | 'detail' | 'wall';
  label: string;
  position: [number, number, number];
  target: [number, number, number];
  lidAngle: number; // radians open from closed (0 = flat, ~1.92 = 110 deg)
}

export const CFG = {
  plate: '/assets/hero-plate.jpg',
  cut: '/assets/hero-cutout.webp',
  casePlate: '',
  badge: '',
  trans: '',
};

export const PROFILE = {
  name: 'Taha Boulhak',
  wordmark: 'BOULHAK',
  script: 'full-stack dev',
  email: 'tahaboulhak202@gmail.com',
  github: 'https://github.com/tahabk02',
  repositoriesUrl: 'https://github.com/tahabk02?tab=repositories',
  linkedin: 'https://www.linkedin.com/in/taha-boulhak/',
  instagram: 'https://www.instagram.com/taha_bk01/',
  youtube: 'https://www.youtube.com/@tahaboulhak1172',
} as const;

export const YOUTUBE_VIDEOS: YoutubeVideo[] = [
  {
    id: 'ZIbjAkTay00',
    title: 'SmartLabo MERN-Stack',
    shortLabel: 'SmartLabo',
    caseId: 'smartlabo',
    thumb: '/assets/projects/yt-smartlabo.jpg',
    url: 'https://www.youtube.com/watch?v=ZIbjAkTay00',
  },
  {
    id: 'J08yPY041Vk',
    title: 'Building a Smart Medical System · MediSaaS',
    shortLabel: 'MediSaaS',
    caseId: 'medisaas',
    thumb: '/assets/projects/yt-medical.jpg',
    url: 'https://www.youtube.com/watch?v=J08yPY041Vk',
  },
  {
    id: '-WSLToVrXAo',
    title: 'Task Management System · Flask CRUD + Pomodoro',
    shortLabel: 'Flask Tasks',
    caseId: 'flask-tasks',
    thumb: '/assets/projects/yt-flask.jpg',
    url: 'https://www.youtube.com/watch?v=-WSLToVrXAo',
  },
];

export const CASES: CaseStudy[] = [
  {
    id: 'smartlabo',
    video: '',
    photo: '/assets/projects/yt-smartlabo.jpg',
    title: 'SMARTLABO',
    rows: ['SMARTLABO', 'MEDICAL LAB APP', 'REACT / NODE / AI'],
    key: '// smartlabo',
    text: '— a medical lab app with appointments, test results, AI analysis and an analytics dashboard.',
    repo: 'https://github.com/tahabk02/smartLabo',
    youtubeId: 'ZIbjAkTay00',
    youtubeTitle: 'SmartLabo MERN-Stack',
    chips: ['React', 'Node.js', 'MongoDB', 'AI Lab'],
    code: [
      'const { data } = await api.get("/analyses");',
      '<Dashboard patients={stats} />',
      'await analyzeDocument(reportPdf);',
      'export type LabReport = { id: string };',
    ],
    accentHex: '#9fd8bf',
  },
  {
    id: 'zinara',
    video: '',
    photo: '/assets/projects/zinara-live.png',
    title: 'ZINARA',
    rows: ['ZINARA JEWELRY', 'E-COMMERCE', 'REACT / NODE / STRIPE'],
    key: '// zinara',
    text: '— a full e-commerce platform with payments, product management and a dynamic cart.',
    repo: 'https://github.com/tahabk02/ZINARA-JEWELRY',
    liveUrl: 'https://zinara-jewelry.vercel.app',
    chips: ['React', 'Node.js', 'Express', 'MongoDB', 'Stripe'],
    code: [
      'const cart = useCart();',
      "app.post('/checkout', pay);",
      'await Stripe.charge(order);',
      'db.products.find({ stock: { $gt: 0 } });',
    ],
    accentHex: '#7fe0b0',
  },
  {
    id: 'nucleus-2bac',
    video: '',
    photo: '/assets/projects/nucleus-live.png',
    title: 'NUCLEUS 2BAC',
    rows: ['NUCLEUS 2BAC', 'INTERACTIVE 3D PHYSICS', 'REACT / THREE.JS / TS'],
    key: '// nucleus 2bac',
    text: '— an interactive 3D nuclear physics learning studio with isotope explorer and quizzes.',
    repo: 'https://github.com/tahabk02/Nucleus-2BAC-',
    liveUrl: 'https://nucleus2bac.vercel.app',
    chips: ['React', 'Three.js', 'TypeScript', 'Tailwind'],
    code: [
      'const decay = N0 * Math.exp(-lambda * t);',
      '<NucleusScene isotope="12C" />',
      'computeMassDefect(protons, neutrons);',
      'export type Isotope = { Z: number; A: number };',
    ],
    accentHex: '#7fe0b0',
  },
  {
    id: 'medisaas',
    video: '',
    photo: '/assets/projects/yt-medical.jpg',
    title: 'MEDISAAS',
    rows: ['SMART MEDICAL SYSTEM', 'MULTI-CLINIC SAAS', 'MERN STACK / AUTH'],
    key: '// medisaas',
    text: '— a multi-clinic medical cabinet platform with role-based auth, patients and scheduling.',
    repo: 'https://github.com/tahabk02/project-gestion-du-cabinet',
    youtubeId: 'J08yPY041Vk',
    youtubeTitle: 'Building a Smart Medical System · MediSaaS',
    chips: ['MongoDB', 'Express', 'React', 'Node.js'],
    code: [
      "router.post('/appointments', auth, book);",
      'const clinic = await Clinic.findById(id);',
      '<PatientRecords clinicId={clinic.id} />',
      'res.json({ status: "confirmed" });',
    ],
    accentHex: '#cfeee0',
  },
  {
    id: 'flask-tasks',
    video: '',
    photo: '/assets/projects/yt-flask.jpg',
    title: 'TASK MANAGER',
    rows: ['FLASK CRUD + POMODORO', 'PRODUCTIVITY APP', 'PYTHON / FLASK / SQL'],
    key: '// task manager',
    text: '— a Python Flask task management system with priority filtering and a built-in Pomodoro timer.',
    repo: 'https://github.com/tahabk02/flask_crud_project',
    youtubeId: '-WSLToVrXAo',
    youtubeTitle: 'Task Management System · Flask CRUD + Pomodoro',
    chips: ['Python', 'Flask', 'SQLite', 'Pomodoro'],
    code: [
      '@app.route("/tasks/new", methods=["POST"])',
      'task = Task(title=title, priority=prio)',
      'db.session.add(task); db.session.commit()',
      'return render_template("dashboard.html")',
    ],
    accentHex: '#9fd8bf',
  },
  {
    id: 'ai-trading',
    video: '',
    photo: '/assets/projects/gh-aitrading.png',
    title: 'AI TRADING',
    rows: ['AI TRADING PLATFORM', 'SIGNAL ENGINE + API', 'PYTHON / NODE / TS'],
    key: '// ai trading',
    text: '— an automated trading platform combining FastAPI XGBoost signals with a TypeScript dashboard.',
    repo: 'https://github.com/tahabk02/ai-trading',
    chips: ['Python', 'FastAPI', 'TypeScript', 'Node.js'],
    code: [
      'signal = xgboost_model.predict(features)',
      'const order = await engine.execute(signal);',
      'streamTicker(symbol, (tick) => update(tick));',
      'export interface Signal { side: "BUY" | "SELL"; }',
    ],
    accentHex: '#7fe0b0',
  },
];

export const FINISHES: ChassisFinish[] = [
  {
    id: 'silver',
    label: 'Silver',
    swatch: '#d8dedb',
    chassisHex: 0xd8dedb,
    accentHex: 0xa5b0ab,
    metalness: 0.92,
    roughness: 0.22,
  },
  {
    id: 'emerald',
    label: 'Emerald',
    swatch: '#2a6b4f',
    chassisHex: 0x265e46,
    accentHex: 0x6ec09a,
    metalness: 0.88,
    roughness: 0.24,
  },
  {
    id: 'obsidian',
    label: 'Obsidian',
    swatch: '#222725',
    chassisHex: 0x222725,
    accentHex: 0x67726d,
    metalness: 0.86,
    roughness: 0.26,
  },
];

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'front',
    label: 'Front',
    position: [0.1, 0.68, 3.5],
    target: [0, -0.19, -0.2],
    lidAngle: 1.76,
  },
  {
    id: 'studio',
    label: '3/4 Studio',
    position: [1.1, 0.68, 3.4],
    target: [0, -0.19, -0.2],
    lidAngle: 1.88,
  },
  {
    id: 'top',
    label: 'Desk Top',
    position: [0.22, 1.24, 0.72],
    target: [0.04, -0.54, 0.02],
    lidAngle: 1.98,
  },
  {
    id: 'detail',
    label: 'Hinge Detail',
    position: [-0.82, 0.12, 1.08],
    target: [-0.06, -0.55, -0.08],
    lidAngle: 2.04,
  },
  {
    id: 'wall',
    label: 'Wall Tablets',
    position: [0.1, 0.84, 1.25],
    target: [0, -0.42, -2.45],
    lidAngle: 1.88,
  },
];

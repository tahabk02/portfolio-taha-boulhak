import * as THREE from 'three';
import { CASES, PROFILE, YOUTUBE_VIDEOS, type CaseStudy } from '../data/portfolio';

export type PortfolioScreenView = 'projects' | 'repositories' | 'courses' | 'about' | 'skills' | 'contact';
export interface ScreenRepository { name: string; description: string | null; language: string | null; stargazers_count: number; }
export interface ScreenCourse { title?: string; video_description?: string; }

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Draws the live interactive developer workstation + real project photo + YouTube preview
 * onto a 2D canvas used by the 3D laptop's OLED screen CanvasTexture.
 */
export function paintCaseScreen(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cs: CaseStudy,
  elapsedSec: number,
  flashAlpha: number,
  projectPhoto?: HTMLImageElement | null
) {
  // Deep OLED studio wallpaper base
  const bg = ctx.createLinearGradient(0, 0, w * 0.9, h);
  bg.addColorStop(0, '#050d0a');
  bg.addColorStop(0.55, '#091f17');
  bg.addColorStop(1, '#0f3023');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle architectural grid
  ctx.strokeStyle = 'rgba(159, 216, 191, 0.04)';
  ctx.lineWidth = 1;
  const gridStep = 64;
  for (let gx = gridStep; gx < w; gx += gridStep) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = gridStep; gy < h; gy += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }

  // Top OS Menu Bar
  ctx.fillStyle = 'rgba(4, 12, 9, 0.88)';
  ctx.fillRect(0, 0, w, 40);
  ctx.fillStyle = 'rgba(207, 238, 224, 0.14)';
  ctx.fillRect(0, 39, w, 1);

  ctx.fillStyle = '#cfeee0';
  ctx.font = '700 17px "Inter Tight", system-ui, sans-serif';
  ctx.fillText('BOULHAK · STUDIO', 28, 26);

  ctx.fillStyle = 'rgba(207, 238, 224, 0.65)';
  ctx.font = '600 16px "Inter Tight", system-ui, sans-serif';
  ctx.fillText('GitHub   Live App   YouTube 3D', 216, 26);

  ctx.textAlign = 'right';
  ctx.fillText('@tahabk02 · @tahaboulhak1172', w - 28, 26);
  ctx.textAlign = 'left';

  // Main Studio Browser/IDE Window Frame
  const winX = 40;
  const winY = 60;
  const winW = w - 80;
  const winH = h - 94;

  ctx.fillStyle = 'rgba(7, 20, 15, 0.96)';
  ctx.strokeStyle = 'rgba(159, 216, 191, 0.24)';
  ctx.lineWidth = 2;
  roundRectPath(ctx, winX, winY, winW, winH, 16);
  ctx.fill();
  ctx.stroke();

  // Window Titlebar
  ctx.fillStyle = 'rgba(12, 34, 26, 0.94)';
  roundRectPath(ctx, winX + 1, winY + 1, winW - 2, 48, 15);
  ctx.fill();

  const dotColors = ['#ef6f6c', '#f5c26b', '#5bd198'];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = dotColors[i];
    ctx.beginPath();
    ctx.arc(winX + 28 + i * 26, winY + 25, 7.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Address / Repo Bar
  const repoLabel = cs.liveUrl
    ? `${cs.liveUrl.replace('https://', '')}  ·  ${cs.repo.replace('https://', '')}`
    : cs.repo.replace('https://', '');
  ctx.fillStyle = 'rgba(207, 238, 224, 0.72)';
  ctx.font = '600 17px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(repoLabel, w / 2, winY + 31);
  ctx.textAlign = 'left';

  const padX = winX + 42;
  const contentTop = winY + 84;

  // Ambient glow behind project preview
  const glow = ctx.createRadialGradient(w * 0.72, h * 0.56, 30, w * 0.72, h * 0.56, 460);
  glow.addColorStop(0, 'rgba(127, 224, 176, 0.14)');
  glow.addColorStop(1, 'rgba(127, 224, 176, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(winX, winY, winW, winH);

  // Project Title in Anton
  ctx.fillStyle = '#ffffff';
  ctx.font = '400 104px "Anton", Impact, sans-serif';
  ctx.fillText(cs.title, padX, contentTop + 92);

  // Stack chips
  let chipX = padX;
  const chipY = contentTop + 120;
  ctx.font = '600 20px "Inter Tight", system-ui, sans-serif';
  for (const chip of cs.chips) {
    const metrics = ctx.measureText(chip);
    const chipW = metrics.width + 30;
    const chipH = 36;
    ctx.strokeStyle = 'rgba(127, 224, 176, 0.52)';
    ctx.fillStyle = 'rgba(18, 56, 42, 0.8)';
    ctx.lineWidth = 1.6;
    roundRectPath(ctx, chipX, chipY, chipW, chipH, 7);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#cfeee0';
    ctx.fillText(chip, chipX + 15, chipY + 24);
    chipX += chipW + 10;
  }

  // Real Project Photo / Screenshot Card (Right Showcase Column)
  const photoW = 630;
  const photoH = 420;
  const photoX = winX + winW - 36 - photoW;
  const photoY = contentTop + 178;

  ctx.save();
  roundRectPath(ctx, photoX, photoY, photoW, photoH, 14);
  ctx.fillStyle = '#091912';
  ctx.fill();
  ctx.clip();

  if (projectPhoto && projectPhoto.complete && projectPhoto.naturalWidth > 0) {
    const imgAsp = projectPhoto.naturalWidth / projectPhoto.naturalHeight;
    const boxAsp = photoW / photoH;
    let drawW = photoW;
    let drawH = photoH;
    let drawX = photoX;
    let drawY = photoY;
    if (imgAsp > boxAsp) {
      drawW = photoH * imgAsp;
      drawX = photoX - (drawW - photoW) / 2;
    } else {
      drawH = photoW / imgAsp;
      drawY = photoY - (drawH - photoH) / 2;
    }
    ctx.drawImage(projectPhoto, drawX, drawY, drawW, drawH);

    // Subtle bottom legibility scrim on photo card
    const scrim = ctx.createLinearGradient(0, photoY + photoH - 110, 0, photoY + photoH);
    scrim.addColorStop(0, 'rgba(5, 14, 10, 0)');
    scrim.addColorStop(1, 'rgba(5, 14, 10, 0.88)');
    ctx.fillStyle = scrim;
    ctx.fillRect(photoX, photoY + photoH - 110, photoW, 110);
  } else {
    ctx.fillStyle = 'rgba(127, 224, 176, 0.08)';
    ctx.fillRect(photoX, photoY, photoW, photoH);
    ctx.fillStyle = '#cfeee0';
    ctx.font = '700 22px "Inter Tight", system-ui, sans-serif';
    ctx.fillText(cs.rows[0], photoX + 28, photoY + 52);
  }

  // Bottom caption / YouTube badge inside the project photo card
  if (cs.youtubeId) {
    ctx.fillStyle = 'rgba(220, 38, 38, 0.94)';
    roundRectPath(ctx, photoX + 20, photoY + photoH - 58, 224, 38, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 17px "Inter Tight", system-ui, sans-serif';
    ctx.fillText('▶  YOUTUBE DEMO READY', photoX + 34, photoY + photoH - 33);
  } else {
    ctx.fillStyle = 'rgba(15, 64, 44, 0.92)';
    roundRectPath(ctx, photoX + 20, photoY + photoH - 58, 240, 38, 6);
    ctx.fill();
    ctx.fillStyle = '#cfeee0';
    ctx.font = '700 17px "Inter Tight", system-ui, sans-serif';
    ctx.fillText(cs.liveUrl ? '●  LIVE DEPLOYED APP' : '●  GITHUB REPOSITORY', photoX + 34, photoY + photoH - 33);
  }
  ctx.restore();

  // Crisp photo border outline
  ctx.strokeStyle = 'rgba(159, 216, 191, 0.42)';
  ctx.lineWidth = 2;
  roundRectPath(ctx, photoX, photoY, photoW, photoH, 14);
  ctx.stroke();

  // Animated code lines (Left Column below title/chips)
  const codeStartY = contentTop + 236;
  const lineH = 54;
  ctx.font = '500 20px ui-monospace, Menlo, Consolas, monospace';

  const charsPerSec = 42;
  let lastLineEndX = padX;
  let lastLineY = codeStartY;

  cs.code.forEach((line, idx) => {
    const delay = idx * 0.55;
    const activeTime = Math.max(0, elapsedSec - delay);
    const visibleChars = Math.min(line.length, Math.floor(activeTime * charsPerSec));
    const slice = line.slice(0, visibleChars);

    const ly = codeStartY + idx * lineH;
    ctx.fillStyle = 'rgba(159, 216, 191, 0.34)';
    ctx.fillText(`0${idx + 1}`, padX, ly);

    ctx.fillStyle = idx % 2 === 0 ? '#7fe0b0' : '#cfeee0';
    ctx.fillText(slice, padX + 40, ly);

    if (visibleChars > 0 || idx === 0) {
      lastLineEndX = padX + 40 + ctx.measureText(slice).width + 6;
      lastLineY = ly;
    }
  });

  // Blinking terminal block cursor
  if (Math.floor(elapsedSec * 2.2) % 2 === 0) {
    ctx.fillStyle = '#9fd8bf';
    ctx.fillRect(lastLineEndX, lastLineY - 18, 12, 24);
  }

  // Architectural module spec summary below code
  const specY = codeStartY + 258;
  ctx.fillStyle = 'rgba(207, 238, 224, 0.14)';
  ctx.fillRect(padX, specY - 26, 540, 1.5);
  ctx.fillStyle = 'rgba(207, 238, 224, 0.72)';
  ctx.font = '600 17px ui-monospace, Menlo, monospace';
  ctx.fillText(`${cs.rows[0]}  //  ${cs.rows[1]}`, padX, specY + 4);
  ctx.fillStyle = cs.accentHex;
  ctx.fillText(`github.com/tahabk02  →  click screen for next case`, padX, specY + 34);

  if (flashAlpha > 0.005) {
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, flashAlpha)})`;
    ctx.fillRect(0, 0, w, h);
  }
}

/** Paints portfolio sections onto the OLED surface so every section is presented inside the 3D workstation. */
export function paintPortfolioScreen(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  view: PortfolioScreenView,
  page: number,
  repositories: ScreenRepository[],
  courses: ScreenCourse[],
  photos: Map<string, HTMLImageElement>
) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#071711');
  bg.addColorStop(0.6, '#103b29');
  bg.addColorStop(1, '#07130e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(159,216,191,.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 48) { ctx.beginPath(); ctx.moveTo(x, 42); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 42; y < h; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.fillStyle = '#04100a';
  ctx.fillRect(0, 0, w, 42);
  ctx.fillStyle = '#cfeee0';
  ctx.font = '700 16px "Inter Tight", system-ui, sans-serif';
  ctx.fillText('BOULHAK  /  3D PORTFOLIO', 28, 27);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(207,238,224,.72)';
  ctx.font = '600 14px "Inter Tight", system-ui, sans-serif';
  ctx.fillText(`${view.toUpperCase()}     ${String(page + 1).padStart(2, '0')}   ·   CLICK SCREEN TO TURN PAGE`, w - 28, 27);
  ctx.textAlign = 'left';

  const heading: Record<PortfolioScreenView, [string, string]> = {
    projects: ['Selected projects', 'REAL BUILDS  /  LIVE LINKS AND REPOSITORIES'],
    repositories: ['GitHub repositories', `${repositories.length} PUBLIC REPOSITORIES  /  SORTED BY RECENT ACTIVITY`],
    courses: ['Courses & videos', 'LEARN BY BUILDING  /  PROJECT WALKTHROUGHS'],
    about: ['Taha Boulhak', 'FULL STACK DEVELOPER  /  BUILDING USEFUL DIGITAL EXPERIENCES'],
    skills: ['Tools & skills', 'A PRACTICAL TOOLKIT USED ACROSS THE PORTFOLIO'],
    contact: ['Let’s build something', 'AVAILABLE FOR COLLABORATION AND NEW PROJECTS'],
  };
  ctx.fillStyle = '#fff';
  ctx.font = '800 58px "Inter Tight", system-ui, sans-serif';
  ctx.fillText(heading[view][0], 54, 128);
  ctx.fillStyle = '#9fd8bf';
  ctx.font = '700 14px ui-monospace, monospace';
  ctx.fillText(heading[view][1], 58, 160);

  const card = (x: number, y: number, cw: number, ch: number, title: string, detail: string, imageUrl?: string) => {
    ctx.fillStyle = 'rgba(2,14,9,.82)';
    ctx.strokeStyle = 'rgba(159,216,191,.34)';
    ctx.lineWidth = 2;
    roundRectPath(ctx, x, y, cw, ch, 13);
    ctx.fill(); ctx.stroke();
    const image = imageUrl ? photos.get(imageUrl) : null;
    const imageH = Math.min(178, Math.round(ch * 0.48));
    if (image?.complete && image.naturalWidth > 0) {
      ctx.save(); roundRectPath(ctx, x + 9, y + 9, cw - 18, imageH, 8); ctx.clip();
      const scale = Math.max((cw - 18) / image.naturalWidth, imageH / image.naturalHeight);
      const iw = image.naturalWidth * scale; const ih = image.naturalHeight * scale;
      ctx.drawImage(image, x + (cw - iw) / 2, y + 9 + (imageH - ih) / 2, iw, ih); ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(91,183,128,.12)';
      roundRectPath(ctx, x + 9, y + 9, cw - 18, imageH, 8); ctx.fill();
      ctx.fillStyle = '#9fd8bf'; ctx.font = '700 12px ui-monospace,monospace';
      ctx.fillText('TAHA BOULHAK  /  PROJECT', x + 24, y + 42);
    }
    ctx.fillStyle = '#fff'; ctx.font = '800 23px "Inter Tight",system-ui,sans-serif';
    ctx.fillText(title.slice(0, 34), x + 20, y + imageH + 42);
    ctx.fillStyle = 'rgba(207,238,224,.76)'; ctx.font = '500 15px "Inter Tight",system-ui,sans-serif';
    ctx.fillText(detail.slice(0, 66), x + 20, y + imageH + 70);
  };

  if (view === 'projects') {
    const start = (page % Math.ceil(CASES.length / 4)) * 4;
    CASES.slice(start, start + 4).forEach((project, i) => {
      const x = 54 + (i % 2) * 670; const y = 192 + Math.floor(i / 2) * 330;
      card(x, y, 620, 300, project.title, `${project.rows[1]}  ·  ${project.chips.slice(0, 3).join(' / ')}`, project.photo);
    });
    ctx.fillStyle = '#9fd8bf'; ctx.font = '600 15px ui-monospace,monospace';
    ctx.fillText(`GITHUB  ${PROFILE.github.replace('https://', '')}     ·     USE NEXT / PREVIOUS TO EXPLORE`, 58, 884);
  } else if (view === 'repositories') {
    const pageSize = 9; const start = (page % Math.max(1, Math.ceil(repositories.length / pageSize))) * pageSize;
    repositories.slice(start, start + pageSize).forEach((repo, i) => {
      const x = 54 + (i % 3) * 450; const y = 194 + Math.floor(i / 3) * 218;
      card(x, y, 410, 190, repo.name, `${repo.language || 'Repository'}  ·  ${repo.stargazers_count} stars`, undefined);
      ctx.fillStyle = 'rgba(207,238,224,.66)'; ctx.font = '500 12px "Inter Tight",system-ui,sans-serif';
      ctx.fillText((repo.description || 'Source code on GitHub').slice(0, 48), x + 20, y + 161);
    });
    if (!repositories.length) {
      ctx.fillStyle = '#d8eee1'; ctx.font = '600 24px "Inter Tight",system-ui,sans-serif';
      ctx.fillText('Open the full GitHub archive to load the live repository list.', 58, 248);
    }
  } else if (view === 'courses') {
    YOUTUBE_VIDEOS.forEach((video, i) => {
      const x = 54 + i * 445;
      card(x, 205, 410, 430, video.title, 'PROJECT WALKTHROUGH  ·  TAP TO WATCH', video.thumb);
      ctx.fillStyle = '#9fd8bf'; ctx.font = '700 14px ui-monospace,monospace';
      ctx.fillText('YOUTUBE  /  VIDEO', x + 20, 610);
    });
    const courseNames = courses.length ? courses.slice(0, 5).map((course) => course.title || course.video_description || 'TikTok course') : ['Visit @tahaboulhak on TikTok for course videos'];
    ctx.fillStyle = '#fff'; ctx.font = '700 20px "Inter Tight",system-ui,sans-serif'; ctx.fillText('LATEST TIKTOK COURSES', 58, 710);
    courseNames.forEach((name, i) => {
      ctx.fillStyle = i % 2 ? '#cfeee0' : '#9fd8bf'; ctx.font = '600 16px "Inter Tight",system-ui,sans-serif';
      ctx.fillText(`▶  ${name.slice(0, 78)}`, 72, 754 + i * 33);
    });
  } else if (view === 'about') {
    ctx.fillStyle = '#9fd8bf'; ctx.font = '800 26px "Inter Tight",system-ui,sans-serif';
    ctx.fillText('FULL STACK DEVELOPER', 60, 246);
    ctx.fillStyle = '#edf8f1'; ctx.font = '500 24px "Inter Tight",system-ui,sans-serif';
    ctx.fillText('I build complete web applications, from clear interfaces', 60, 300);
    ctx.fillText('and reliable APIs to interactive 3D experiences.', 60, 336);
    card(60, 430, 380, 280, 'Web apps', 'Product interfaces and data-driven tools');
    card(470, 430, 380, 280, 'Full stack', 'Frontend, APIs, databases and integrations');
    card(880, 430, 380, 280, 'Interactive 3D', 'Experiments with Three.js and WebGL');
    ctx.fillStyle = '#9fd8bf'; ctx.font = '700 19px ui-monospace,monospace'; ctx.fillText(PROFILE.email, 60, 806);
  } else if (view === 'skills') {
    const skillRows = [
      ['FRONTEND', 'React  ·  TypeScript  ·  JavaScript  ·  Tailwind CSS'],
      ['BACKEND', 'Node.js  ·  Express  ·  Python  ·  Flask  ·  FastAPI'],
      ['DATA', 'MongoDB  ·  SQLite'],
      ['INTERACTIVE', 'Three.js  ·  WebGL'],
      ['INTEGRATIONS', 'Stripe  ·  XGBoost  ·  AI analysis'],
    ];
    skillRows.forEach(([label, value], i) => {
      const y = 218 + i * 126;
      ctx.fillStyle = 'rgba(2,14,9,.74)'; ctx.strokeStyle = 'rgba(159,216,191,.28)'; ctx.lineWidth = 1.5;
      roundRectPath(ctx, 58, y, 1300, 96, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9fd8bf'; ctx.font = '800 16px ui-monospace,monospace'; ctx.fillText(label, 84, y + 38);
      ctx.fillStyle = '#fff'; ctx.font = '600 22px "Inter Tight",system-ui,sans-serif'; ctx.fillText(value, 320, y + 54);
    });
  } else {
    ctx.fillStyle = '#9fd8bf'; ctx.font = '600 22px "Inter Tight",system-ui,sans-serif';
    ctx.fillText('Have a project in mind? Let’s make something useful.', 62, 242);
    card(62, 315, 620, 185, 'Email', PROFILE.email);
    card(736, 315, 620, 185, 'GitHub', '@tahabk02  ·  github.com/tahabk02');
    card(62, 548, 620, 185, 'LinkedIn', 'Connect with Taha Boulhak');
    card(736, 548, 620, 185, 'TikTok & YouTube', 'Courses, lessons and project walkthroughs');
  }
}

/**
 * Generates realistic dark American walnut architectural wood desk textures (1024x1024 sRGB albedo + linear roughness/bump).
 */
export function createWalnutWoodMaps(maxAnisotropy: number) {
  const size = 1024;
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const ctx = albedoCanvas.getContext('2d')!;

  // Warm satin walnut with broad, irregular grain that stays calm at a distance.
  const base = ctx.createLinearGradient(0, 0, size, size);
  base.addColorStop(0, '#49301f');
  base.addColorStop(0.48, '#62432b');
  base.addColorStop(1, '#3b2619');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  let seed = 18473;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 210; i++) {
    const y = random() * size;
    const amplitude = 2 + random() * 11;
    const phase = random() * Math.PI * 2;
    const frequency = 0.004 + random() * 0.014;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 128; x <= size; x += 128) {
      const wave = Math.sin(x * frequency + phase) * amplitude + Math.sin(x * 0.026 + phase) * amplitude * 0.18;
      ctx.lineTo(x, y + wave);
    }
    ctx.strokeStyle = random() > 0.52 ? `rgba(28, 15, 9, ${0.025 + random() * 0.07})` : `rgba(210, 157, 104, ${0.025 + random() * 0.055})`;
    ctx.lineWidth = 0.5 + random() * 2.2;
    ctx.stroke();
  }
  // Short pores and occasional soft cathedral marks add detail without repeated stripes.
  for (let i = 0; i < 1200; i++) {
    const x = random() * size;
    const y = random() * size;
    const length = 8 + random() * 110;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + length * 0.5, y + (random() - 0.5) * 5, x + length, y + (random() - 0.5) * 8);
    ctx.strokeStyle = random() > 0.5 ? 'rgba(24, 13, 8, 0.075)' : 'rgba(220, 169, 116, 0.055)';
    ctx.lineWidth = 0.45 + random() * 0.8;
    ctx.stroke();
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1.6, 1.15);
  map.anisotropy = maxAnisotropy;

  const mapSize = 512;
  const roughData = new Uint8Array(mapSize * mapSize * 4);
  const bumpData = new Uint8Array(mapSize * mapSize * 4);
  for (let y = 0; y < mapSize; y++) {
    const fiber = Math.sin(y * 0.14) * 3 + Math.cos(y * 0.39) * 2;
    for (let x = 0; x < mapSize; x++) {
      const idx = (y * mapSize + x) * 4;
      const pore = Math.sin(x * 0.06 + y * 0.12) * 2.5;
      const roughVal = THREE.MathUtils.clamp(Math.round(188 + fiber + pore), 174, 204);
      const bumpVal = THREE.MathUtils.clamp(Math.round(128 + fiber * 1.1 - pore), 118, 138);
      roughData[idx] = roughVal;
      roughData[idx + 1] = roughVal;
      roughData[idx + 2] = roughVal;
      roughData[idx + 3] = 255;

      bumpData[idx] = bumpVal;
      bumpData[idx + 1] = bumpVal;
      bumpData[idx + 2] = bumpVal;
      bumpData[idx + 3] = 255;
    }
  }
  const roughnessMap = new THREE.DataTexture(roughData, mapSize, mapSize);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(1.6, 1.15);
  roughnessMap.anisotropy = maxAnisotropy;
  roughnessMap.needsUpdate = true;

  const bumpMap = new THREE.DataTexture(bumpData, mapSize, mapSize);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(1.6, 1.15);
  bumpMap.anisotropy = maxAnisotropy;
  bumpMap.needsUpdate = true;

  return { map, roughnessMap, bumpMap };
}

/**
 * Generates tactile dark charcoal merino wool-felt desk mat texture with clean organic fiber weave.
 */
export function createDeskMatMaps(maxAnisotropy: number) {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1b201e';
  ctx.fillRect(0, 0, w, h);

  // Subtle multi-tone merino wool felt micro-fibers (deterministic, zero giant blocks)
  for (let i = 0; i < 28000; i++) {
    const px = (i * 197 + (i % 11) * 13) % w;
    const py = (i * 103 + (i % 17) * 7) % h;
    const len = 1 + (i % 3);
    ctx.fillStyle =
      i % 3 === 0
        ? 'rgba(225, 238, 231, 0.032)'
        : i % 3 === 1
          ? 'rgba(0, 0, 0, 0.14)'
          : 'rgba(130, 152, 142, 0.024)';
    ctx.fillRect(px, py, len, 1);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 1);
  map.anisotropy = maxAnisotropy;

  const bumpData = new Uint8Array(256 * 256 * 4);
  for (let i = 0; i < 256 * 256; i++) {
    const val = 110 + ((i * 59 + Math.floor(i / 256) * 37) % 44);
    bumpData[i * 4] = val;
    bumpData[i * 4 + 1] = val;
    bumpData[i * 4 + 2] = val;
    bumpData[i * 4 + 3] = 255;
  }
  const bumpMap = new THREE.DataTexture(bumpData, 256, 256);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(10, 5);
  bumpMap.needsUpdate = true;

  return { map, bumpMap };
}

/**
 * Generates CNC micro-perforated stereo speaker grille texture.
 */
export function createSpeakerGrilleTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 128;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#363c39';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#090b0a';
  const stepX = 8;
  const stepY = 8;
  for (let row = 0; row < h / stepY; row++) {
    const offset = (row % 2) * 4;
    for (let col = 1; col < w / stepX - 1; col++) {
      ctx.beginPath();
      ctx.arc(col * stepX + offset, row * stepY + 4, 2.0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates a realistic QWERTY keycap legend overlay (transparent key faces + white backlit legends).
 */
export function createKeyboardLegendsTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 384;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  const rows: Array<Array<{ label: string; w: number }>> = [
    [
      { label: 'esc', w: 1.4 },
      { label: 'F1', w: 1 },
      { label: 'F2', w: 1 },
      { label: 'F3', w: 1 },
      { label: 'F4', w: 1 },
      { label: 'F5', w: 1 },
      { label: 'F6', w: 1 },
      { label: 'F7', w: 1 },
      { label: 'F8', w: 1 },
      { label: 'F9', w: 1 },
      { label: 'F10', w: 1 },
      { label: 'F11', w: 1 },
      { label: 'F12', w: 1 },
      { label: '⏻', w: 1 },
    ],
    [
      { label: '`', w: 1 },
      { label: '1', w: 1 },
      { label: '2', w: 1 },
      { label: '3', w: 1 },
      { label: '4', w: 1 },
      { label: '5', w: 1 },
      { label: '6', w: 1 },
      { label: '7', w: 1 },
      { label: '8', w: 1 },
      { label: '9', w: 1 },
      { label: '0', w: 1 },
      { label: '-', w: 1 },
      { label: '=', w: 1 },
      { label: 'delete', w: 1.4 },
    ],
    [
      { label: 'tab', w: 1.4 },
      { label: 'Q', w: 1 },
      { label: 'W', w: 1 },
      { label: 'E', w: 1 },
      { label: 'R', w: 1 },
      { label: 'T', w: 1 },
      { label: 'Y', w: 1 },
      { label: 'U', w: 1 },
      { label: 'I', w: 1 },
      { label: 'O', w: 1 },
      { label: 'P', w: 1 },
      { label: '[', w: 1 },
      { label: ']', w: 1 },
      { label: '\\', w: 1 },
    ],
    [
      { label: 'caps', w: 1.7 },
      { label: 'A', w: 1 },
      { label: 'S', w: 1 },
      { label: 'D', w: 1 },
      { label: 'F', w: 1 },
      { label: 'G', w: 1 },
      { label: 'H', w: 1 },
      { label: 'J', w: 1 },
      { label: 'K', w: 1 },
      { label: 'L', w: 1 },
      { label: ';', w: 1 },
      { label: "'", w: 1 },
      { label: 'return', w: 1.7 },
    ],
    [
      { label: 'shift', w: 2.2 },
      { label: 'Z', w: 1 },
      { label: 'X', w: 1 },
      { label: 'C', w: 1 },
      { label: 'V', w: 1 },
      { label: 'B', w: 1 },
      { label: 'N', w: 1 },
      { label: 'M', w: 1 },
      { label: ',', w: 1 },
      { label: '.', w: 1 },
      { label: '/', w: 1 },
      { label: 'shift', w: 2.2 },
    ],
    [
      { label: 'fn', w: 1 },
      { label: 'ctrl', w: 1 },
      { label: 'opt', w: 1 },
      { label: 'cmd', w: 1.3 },
      { label: '', w: 5.1 },
      { label: 'cmd', w: 1.3 },
      { label: 'opt', w: 1 },
      { label: '◀', w: 0.9 },
      { label: '▲▼', w: 0.9 },
      { label: '▶', w: 0.9 },
    ],
  ];

  const rowH = h / rows.length;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  rows.forEach((row, rIdx) => {
    const totalUnits = row.reduce((acc, k) => acc + k.w, 0);
    let curX = 0;
    row.forEach((k) => {
      const kw = (k.w / totalUnits) * w;
      const cx = curX + kw / 2;
      const cy = rIdx * rowH + rowH / 2;
      if (k.label) {
        ctx.fillStyle = 'rgba(248, 252, 250, 0.95)';
        const isSmall = k.label.length > 1;
        ctx.font = isSmall
          ? '600 13px "Inter Tight", system-ui, sans-serif'
          : '600 17px "Inter Tight", system-ui, sans-serif';
        ctx.fillText(k.label, cx, cy);
      }
      curX += kw;
    });
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates ultra-fine bead-blasted anodized aluminum roughness & bump DataTextures (moire-free).
 */
export function createBrushedMetalMaps(maxAnisotropy: number) {
  const size = 256;
  const roughData = new Uint8Array(size * size * 4);
  const bumpData = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Pseudo-random bead-blasted grain hash to avoid periodic moire lines
      const hash = (((x * 374761393 + y * 668265263) ^ 0x5bd1e995) >>> 0) % 29;
      const roughVal = THREE.MathUtils.clamp(146 + hash - 14, 120, 180);
      const bumpVal = THREE.MathUtils.clamp(128 + hash - 14, 108, 152);

      roughData[idx] = roughVal;
      roughData[idx + 1] = roughVal;
      roughData[idx + 2] = roughVal;
      roughData[idx + 3] = 255;

      bumpData[idx] = bumpVal;
      bumpData[idx + 1] = bumpVal;
      bumpData[idx + 2] = bumpVal;
      bumpData[idx + 3] = 255;
    }
  }

  const roughnessMap = new THREE.DataTexture(roughData, size, size);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(4, 4);
  roughnessMap.anisotropy = maxAnisotropy;
  roughnessMap.needsUpdate = true;

  const bumpMap = new THREE.DataTexture(bumpData, size, size);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(4, 4);
  bumpMap.anisotropy = maxAnisotropy;
  bumpMap.needsUpdate = true;

  return { roughnessMap, bumpMap };
}

/**
 * Generates procedural studio cyclorama floor textures (sRGB albedo + linear roughness).
 */
export function createStudioDeskMaps(maxAnisotropy: number) {
  const size = 512;
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const ctx = albedoCanvas.getContext('2d')!;

  ctx.fillStyle = '#153b2a';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 3600; i++) {
    const px = ((i * 73) % size) + ((i * 17) % 5) * 0.2;
    const py = ((i * 139) % size) + ((i * 29) % 5) * 0.2;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(159, 216, 191, 0.03)' : 'rgba(6, 22, 15, 0.08)';
    ctx.fillRect(px, py, 1.5, 1.5);
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(6, 6);
  map.anisotropy = maxAnisotropy;

  const roughData = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const val = 190 + ((i * 31) % 30);
    roughData[i * 4] = val;
    roughData[i * 4 + 1] = val;
    roughData[i * 4 + 2] = val;
    roughData[i * 4 + 3] = 255;
  }
  const roughnessMap = new THREE.DataTexture(roughData, size, size);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(6, 6);
  roughnessMap.anisotropy = maxAnisotropy;
  roughnessMap.needsUpdate = true;

  return { map, roughnessMap };
}

/**
 * Soft radial contact shadow texture for grounding every prop flush with its supporting surface.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.08,
    size / 2,
    size / 2,
    size * 0.5
  );
  grad.addColorStop(0, 'rgba(5, 12, 8, 0.68)');
  grad.addColorStop(0.52, 'rgba(5, 12, 8, 0.28)');
  grad.addColorStop(1, 'rgba(5, 12, 8, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export type TabletScreenType = 'frontend' | 'concepts' | 'backend';

/** Creates a high contrast skills/concepts screen for the wall-mounted studio tablets. */
export function createSkillTabletTexture(type: TabletScreenType, anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = type === 'concepts' ? 1200 : 900;
  canvas.height = type === 'concepts' ? 650 : 1000;
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width; const h = canvas.height;
  const paint = (page: number) => {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#07150f'); bg.addColorStop(0.55, '#0e3323'); bg.addColorStop(1, '#07110d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(159,216,191,.08)'; ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 36) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  ctx.fillStyle = '#9fd8bf'; ctx.font = '700 19px Arial,sans-serif'; ctx.fillText('BOULHAK  /  SKILLS LAB', 32, 42);
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(223,245,232,.6)'; ctx.font = '600 13px Arial,sans-serif';
  ctx.fillText('FULL STACK  ·  2026', w - 30, 42); ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(207,238,224,.16)'; ctx.fillRect(28, 58, w - 56, 1);

  const data = {
    frontend: {
      title: 'FRONTEND', subtitle: 'Interfaces & visual systems',
      items: [['R', 'React', '#61dafb'], ['TS', 'TypeScript', '#3178c6'], ['TW', 'Tailwind CSS', '#38bdf8'], ['3D', 'Three.js', '#a6f2c1']],
    },
    backend: {
      title: 'BACKEND + DATA', subtitle: 'Services, APIs & persistence',
      items: [['N', 'Node.js', '#83cd29'], ['EX', 'Express', '#dce8e0'], ['M', 'MongoDB', '#47a248'], ['PY', 'Python', '#ffd343'], ['FL', 'Flask', '#e9f4ec'], ['SQL', 'SQLite', '#73aaca']],
    },
    concepts: { title: 'PRODUCT CONCEPTS', subtitle: 'From user flow to reliable product', items: [] },
  }[type];

  ctx.fillStyle = '#f5fff8'; ctx.font = type === 'concepts' ? '800 48px Arial,sans-serif' : '800 47px Arial,sans-serif';
  ctx.fillText(data.title, 34, 132);
  ctx.fillStyle = '#9fd8bf'; ctx.font = '500 21px Arial,sans-serif'; ctx.fillText(data.subtitle, 36, 169);

  if (type !== 'concepts' && page % 2 === 0) {
    const cols = 2; const gap = 17; const left = 30; const top = 205;
    const cellW = (w - left * 2 - gap) / cols; const cellH = type === 'frontend' ? 170 : 144;
    data.items.forEach(([mark, label, color], i) => {
      const x = left + (i % cols) * (cellW + gap); const y = top + Math.floor(i / cols) * (cellH + gap);
      ctx.fillStyle = 'rgba(4,18,11,.72)'; ctx.strokeStyle = 'rgba(159,216,191,.25)'; ctx.lineWidth = 2;
      roundRectPath(ctx, x, y, cellW, cellH, 16); ctx.fill(); ctx.stroke();
      const size = Math.min(74, cellH * 0.53);
      ctx.fillStyle = color; roundRectPath(ctx, x + 18, y + (cellH - size) / 2, size, size, 15); ctx.fill();
      ctx.fillStyle = ['#07150f', '#fff', '#06151b', '#09251a', '#08120c', '#fff'][i % 6];
      ctx.font = `800 ${mark.length > 2 ? 17 : 25}px Arial,sans-serif`; ctx.textAlign = 'center';
      ctx.fillText(mark, x + 18 + size / 2, y + cellH / 2 + 8); ctx.textAlign = 'left';
      ctx.fillStyle = '#effaf2'; ctx.font = '700 20px Arial,sans-serif'; ctx.fillText(label, x + size + 34, y + cellH / 2 + 7);
      ctx.fillStyle = 'rgba(159,216,191,.48)'; ctx.fillRect(x + 18, y + cellH - 13, cellW - 36, 2);
    });
  } else if (type !== 'concepts') {
    const steps = type === 'frontend'
      ? [['01', 'COMPONENTS', 'Reusable interface blocks'], ['02', 'STATE', 'Keep data and UI in sync'], ['03', 'RESPONSIVE', 'Adapt layouts to every screen'], ['04', 'ACCESSIBLE', 'Make interactions clear']]
      : [['01', 'ROUTES', 'Receive a clean request'], ['02', 'AUTH', 'Protect user data'], ['03', 'SERVICES', 'Apply business logic'], ['04', 'DATA', 'Store and return results']];
    steps.forEach(([num, title, detail], i) => {
      const cols = 2; const gap = 18; const x = 30 + (i % cols) * ((w - 78) / 2 + gap); const y = 220 + Math.floor(i / cols) * 260;
      const cw = (w - 78) / 2; const ch = 220;
      ctx.fillStyle = 'rgba(4,18,11,.78)'; ctx.strokeStyle = 'rgba(159,216,191,.35)'; ctx.lineWidth = 2;
      roundRectPath(ctx, x, y, cw, ch, 16); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7fe0b0'; ctx.font = '800 25px Arial,sans-serif'; ctx.fillText(num, x + 22, y + 42);
      ctx.fillStyle = '#f5fff8'; ctx.font = '800 24px Arial,sans-serif'; ctx.fillText(title, x + 22, y + 98);
      ctx.fillStyle = 'rgba(223,245,232,.72)'; ctx.font = '500 17px Arial,sans-serif'; ctx.fillText(detail, x + 22, y + 143);
      ctx.fillStyle = '#9fd8bf'; ctx.fillRect(x + 22, y + 176, cw - 44, 3);
    });
  } else if (page % 2 === 0) {
    const nodes = [
      { x: 78, label: 'CLIENT', name: 'React UI', color: '#61dafb' },
      { x: 366, label: 'SERVICE', name: 'Node / API', color: '#83cd29' },
      { x: 654, label: 'DATA', name: 'MongoDB', color: '#47a248' },
      { x: 942, label: 'INTELLIGENCE', name: 'AI / analytics', color: '#b79cff' },
    ];
    const nodeW = 205; const nodeY = 247; const nodeH = 156;
    nodes.forEach((node, i) => {
      ctx.fillStyle = 'rgba(3,17,10,.86)'; ctx.strokeStyle = node.color; ctx.lineWidth = 3;
      roundRectPath(ctx, node.x, nodeY, nodeW, nodeH, 18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = node.color; ctx.beginPath(); ctx.arc(node.x + nodeW / 2, nodeY + 45, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(223,245,232,.66)'; ctx.font = '700 13px Arial,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x + nodeW / 2, nodeY + 91);
      ctx.fillStyle = '#fff'; ctx.font = '700 19px Arial,sans-serif'; ctx.fillText(node.name, node.x + nodeW / 2, nodeY + 127); ctx.textAlign = 'left';
      if (i < nodes.length - 1) {
        const ax = node.x + nodeW + 8; const ay = nodeY + nodeH / 2;
        ctx.strokeStyle = '#9fd8bf'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 68, ay); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax + 58, ay - 8); ctx.lineTo(ax + 68, ay); ctx.lineTo(ax + 58, ay + 8); ctx.stroke();
      }
    });
    const concepts = ['E-COMMERCE', 'MEDICAL SAAS', 'LEARNING 3D', 'SMART ANALYTICS'];
    concepts.forEach((item, i) => {
      const x = 78 + i * 275; const y = 475;
      ctx.fillStyle = 'rgba(159,216,191,.11)'; ctx.strokeStyle = 'rgba(159,216,191,.3)'; ctx.lineWidth = 1.5;
      roundRectPath(ctx, x, y, 238, 72, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d8f5e2'; ctx.font = '700 16px Arial,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(item, x + 119, y + 43); ctx.textAlign = 'left';
    });
  } else {
    const concepts = [
      ['E-COMMERCE', 'Catalog · cart · checkout'],
      ['MEDICAL SAAS', 'Clinics · patients · scheduling'],
      ['LEARNING 3D', 'Explore · simulate · quiz'],
      ['SMART ANALYTICS', 'Collect · analyze · visualize'],
    ];
    concepts.forEach(([title, detail], i) => {
      const x = 62 + (i % 2) * 550; const y = 214 + Math.floor(i / 2) * 168;
      ctx.fillStyle = 'rgba(4,18,11,.8)'; ctx.strokeStyle = 'rgba(159,216,191,.32)'; ctx.lineWidth = 2;
      roundRectPath(ctx, x, y, 490, 134, 16); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9fd8bf'; ctx.font = '800 17px Arial,sans-serif'; ctx.fillText(`0${i + 1}  /  CONCEPT`, x + 22, y + 38);
      ctx.fillStyle = '#f5fff8'; ctx.font = '800 24px Arial,sans-serif'; ctx.fillText(title, x + 22, y + 76);
      ctx.fillStyle = 'rgba(223,245,232,.76)'; ctx.font = '500 17px Arial,sans-serif'; ctx.fillText(detail, x + 22, y + 108);
    });
  }
  const footerY = h - 33;
  ctx.fillStyle = 'rgba(2,12,7,.78)'; ctx.fillRect(0, h - 58, w, 58);
  ctx.fillStyle = '#9fd8bf'; ctx.font = '800 27px Arial,sans-serif'; ctx.fillText('‹', 28, footerY + 5);
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(223,245,232,.72)'; ctx.font = '700 14px Arial,sans-serif';
  ctx.fillText(`CLICK LEFT / RIGHT SIDE TO EXPLORE  ·  PAGE ${page % 2 + 1} OF 2`, w / 2, footerY);
  ctx.textAlign = 'right'; ctx.fillStyle = '#9fd8bf'; ctx.font = '800 27px Arial,sans-serif'; ctx.fillText('›', w - 28, footerY + 5); ctx.textAlign = 'left';
  };
  paint(0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.userData.setPage = (page: number) => { paint(page); texture.needsUpdate = true; };
  return texture;
}

export function createStudioSignTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#08140e'); gradient.addColorStop(.52, '#173e2c'); gradient.addColorStop(1, '#08140e');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(159,216,191,.28)'; ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);
  ctx.fillStyle = '#9fd8bf'; ctx.font = '700 28px Arial,sans-serif'; ctx.fillText('TB  /  01', 46, 82);
  ctx.fillStyle = '#f2fff6'; ctx.font = '800 66px Arial,sans-serif'; ctx.fillText('BOULHAK', 46, 160);
  ctx.fillStyle = '#e4bf7b'; ctx.fillRect(530, 62, 2, 130);
  ctx.fillStyle = 'rgba(230,247,236,.8)'; ctx.font = '700 24px Arial,sans-serif'; ctx.fillText('DIGITAL WORKSHOP', 572, 114);
  ctx.fillStyle = '#9fd8bf'; ctx.font = '500 19px Arial,sans-serif'; ctx.fillText('DESIGN  ·  ENGINEERING  ·  IDEAS', 572, 156);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

export type GalleryArtVariant = 'casablanca' | 'bauhaus' | 'atlas';

/**
 * Generates gallery-quality textured canvas paintings ("tableaux") for the studio back wall.
 */
export function createGalleryArtworkTexture(
  variant: GalleryArtVariant,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const isWide = variant === 'bauhaus';
  const w = isWide ? 768 : 512;
  const h = isWide ? 320 : 680;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  if (variant === 'casablanca') {
    // Warm Moroccan limestone & terracotta geometric arch composition
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#efe5d2');
    sky.addColorStop(0.58, '#e3ceb0');
    sky.addColorStop(1, '#c89b74');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Warm sun circle
    ctx.fillStyle = '#c85a32';
    ctx.beginPath();
    ctx.arc(w * 0.68, h * 0.24, 62, 0, Math.PI * 2);
    ctx.fill();

    // Deep architectural emerald shadow band
    ctx.fillStyle = '#184230';
    ctx.fillRect(0, h * 0.72, w, h * 0.28);

    // Sculpted terracotta arch monument
    ctx.fillStyle = '#b4532f';
    ctx.beginPath();
    ctx.arc(w * 0.48, h * 0.50, 136, Math.PI, 0, false);
    ctx.lineTo(w * 0.48 + 136, h * 0.84);
    ctx.lineTo(w * 0.48 - 136, h * 0.84);
    ctx.closePath();
    ctx.fill();

    // Inner cream archway cutout
    ctx.fillStyle = '#f2eadc';
    ctx.beginPath();
    ctx.arc(w * 0.48, h * 0.54, 72, Math.PI, 0, false);
    ctx.lineTo(w * 0.48 + 72, h * 0.84);
    ctx.lineTo(w * 0.48 - 72, h * 0.84);
    ctx.closePath();
    ctx.fill();

    // Fine gold linework accent
    ctx.strokeStyle = '#d4af6a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.14, h * 0.72);
    ctx.lineTo(w * 0.86, h * 0.72);
    ctx.stroke();
  } else if (variant === 'bauhaus') {
    // Architectural emerald, warm ivory, walnut & brushed brass horizontal composition
    ctx.fillStyle = '#f2ece1';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#143d2c';
    ctx.fillRect(36, 34, 210, h - 68);

    ctx.fillStyle = '#c46038';
    ctx.beginPath();
    ctx.arc(384, h * 0.5, 108, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0e1915';
    ctx.beginPath();
    ctx.arc(384, h * 0.5, 50, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2a664c';
    ctx.fillRect(528, 34, 204, 118);

    ctx.fillStyle = '#d6b475';
    ctx.fillRect(528, 174, 204, h - 208);

    ctx.strokeStyle = '#1b1d1c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(268, 34);
    ctx.lineTo(268, h - 34);
    ctx.moveTo(504, 34);
    ctx.lineTo(504, h - 34);
    ctx.stroke();
  } else {
    // Atlas Emerald & Gold Horizon Minimalist Study
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#e8e4d8');
    grad.addColorStop(0.42, '#9ec2b0');
    grad.addColorStop(0.43, '#1f4f3b');
    grad.addColorStop(1, '#0d291d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Layered mountain silhouettes
    ctx.fillStyle = '#2d6a4f';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.54);
    ctx.lineTo(w * 0.32, h * 0.36);
    ctx.lineTo(w * 0.66, h * 0.48);
    ctx.lineTo(w, h * 0.38);
    ctx.lineTo(w, h * 0.65);
    ctx.lineTo(0, h * 0.65);
    ctx.closePath();
    ctx.fill();

    // Brushed gold moon & reflection line
    ctx.fillStyle = '#dfbe78';
    ctx.beginPath();
    ctx.arc(w * 0.34, h * 0.22, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(223, 190, 120, 0.65)';
    for (let i = 0; i < 6; i++) {
      const rw = 84 - i * 11;
      ctx.fillRect(w * 0.34 - rw / 2, h * 0.69 + i * 24, rw, 5);
    }
  }

  // Subtle linen canvas weave & tactile oil brushstroke grain
  for (let i = 0; i < 4200; i++) {
    const px = (i * 193) % w;
    const py = (i * 97) % h;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(12,18,15,0.04)';
    ctx.fillRect(px, py, (i % 5) + 2, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates warm architectural smoked-oak plank studio flooring textures.
 */
export function createStudioParquetMaps(maxAnisotropy: number) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#2d231c';
  ctx.fillRect(0, 0, size, size);

  const plankRows = 8;
  const plankH = size / plankRows;
  for (let r = 0; r < plankRows; r++) {
    const y0 = r * plankH;
    const offset = (r % 2) * (size * 0.35);
    for (let c = -1; c < 3; c++) {
      const x0 = c * (size * 0.5) + offset;
      const toneShift = ((r * 7 + c * 11) % 5) * 4;
      ctx.fillStyle = `rgb(${44 + toneShift}, ${34 + toneShift}, ${26 + Math.floor(toneShift * 0.6)})`;
      ctx.fillRect(x0 + 1, y0 + 1, size * 0.5 - 2, plankH - 2);

      // Fine wood grain lines along plank
      for (let g = 0; g < 16; g++) {
        ctx.fillStyle = g % 2 === 0 ? 'rgba(18, 12, 8, 0.22)' : 'rgba(92, 70, 52, 0.10)';
        ctx.fillRect(x0 + 4, y0 + 3 + g * (plankH / 17), size * 0.5 - 10, 1);
      }
    }
    ctx.fillStyle = 'rgba(12, 9, 7, 0.55)';
    ctx.fillRect(0, y0, size, 1.5);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(9, 9);
  map.anisotropy = maxAnisotropy;

  return { map };
}

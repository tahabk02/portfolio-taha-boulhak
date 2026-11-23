import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  CAMERA_PRESETS,
  CASES,
  CFG,
  FINISHES,
  PROFILE,
  YOUTUBE_VIDEOS,
} from '../src/data/portfolio.ts';
import {
  computePose,
  computeQuadMatrix3d,
  dampValue,
  isSoftwareRendererString,
} from '../src/lib/poseMath.ts';

test('PROFILE, CFG, CASES, and YOUTUBE_VIDEOS match required portfolio copy and local assets', () => {
  assert.equal(PROFILE.name, 'Taha Boulhak');
  assert.equal(PROFILE.wordmark, 'BOULHAK');
  assert.equal(PROFILE.script, 'full-stack dev');
  assert.equal(PROFILE.email, 'tahaboulhak202@gmail.com');
  assert.equal(PROFILE.repositoriesUrl, 'https://github.com/tahabk02?tab=repositories');
  assert.equal(PROFILE.youtube, 'https://www.youtube.com/@tahaboulhak1172');

  assert.equal(CFG.plate, '/assets/hero-plate.jpg');
  assert.equal(CFG.cut, '/assets/hero-cutout.webp');

  assert.ok(CASES.length >= 6);
  for (const c of CASES) {
    assert.ok(c.text.startsWith('— '), `Case ${c.title} text must start with em dash and space`);
    assert.equal(c.rows.length, 3);
    assert.ok(c.repo.startsWith('https://github.com/tahabk02/'));
    assert.ok(c.photo.startsWith('/assets/projects/'));
    const diskPath = path.resolve(process.cwd(), 'public', c.photo.replace(/^\//, ''));
    assert.ok(fs.existsSync(diskPath), `Project photo missing on disk: ${diskPath}`);
    assert.ok(c.chips.length >= 4);
    assert.ok(c.code.length >= 4);
  }

  assert.equal(YOUTUBE_VIDEOS.length, 3);
  for (const v of YOUTUBE_VIDEOS) {
    assert.ok(v.id.length === 11);
    const thumbPath = path.resolve(process.cwd(), 'public', v.thumb.replace(/^\//, ''));
    assert.ok(fs.existsSync(thumbPath), `YouTube thumb missing on disk: ${thumbPath}`);
    assert.ok(v.url.includes(v.id));
  }

  assert.ok(FINISHES.length >= 3);
  assert.ok(CAMERA_PRESETS.length >= 4);
});

test('Zero localStorage usage across src/ and index.html', () => {
  const files = [
    path.resolve(process.cwd(), 'index.html'),
    path.resolve(process.cwd(), 'src/App.tsx'),
    path.resolve(process.cwd(), 'src/data/portfolio.ts'),
    path.resolve(process.cwd(), 'src/lib/poseMath.ts'),
    path.resolve(process.cwd(), 'src/three/StudioScene.tsx'),
    path.resolve(process.cwd(), 'src/three/laptopModel.ts'),
    path.resolve(process.cwd(), 'src/three/screenPainter.ts'),
    path.resolve(process.cwd(), 'src/components/ControlDock.tsx'),
  ];
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    assert.ok(!content.includes('localStorage'), `${f} must not reference localStorage`);
  }
});

test('Desktop hero pose fits viewport and keeps badge inside bounds', () => {
  for (const [W, H] of [
    [1440, 900],
    [2560, 1440],
  ]) {
    const p = computePose('hero', W, H, 182, 140);
    assert.equal(p.mobile, false);
    assert.ok(p.heroLayout !== null);
    assert.ok(p.s >= Math.max(W / 1440, H / 810) - 1e-9);
    const vr = Math.min(1440, (W - p.x) / p.s);
    const pad = 18 / p.s;
    assert.ok(p.heroLayout.badgeLeft + 417 <= vr - pad + 1e-6);
    assert.ok(p.heroLayout.wmWidth > 0);
  }
});

test('Mobile pose at 390x844 fits laptop between UI and bottom nav without overflow', () => {
  const hero = computePose('hero', 390, 844, 150, 120);
  assert.equal(hero.mobile, true);
  assert.ok(hero.s > 0);
  assert.ok(hero.heroLayout !== null);
  assert.equal(hero.heroLayout.scriptFontSize, 64);

  const th = 150;
  const dh = 120;
  const c = computePose('case', 390, 844, th, dh);
  assert.equal(c.mobile, true);
  assert.equal(c.heroLayout, null);
  const navH = 0.022 * 844 + 42 + 22;
  const laptopBottom = c.y + 762 * c.s;
  assert.ok(Math.abs(laptopBottom - (844 - navH)) < 1);
});

test('Exponential damping converges monotonically toward target', () => {
  let val = 0;
  for (let i = 0; i < 60; i++) {
    const next = dampValue(val, 10, 8, 1 / 60);
    assert.ok(next > val && next <= 10);
    val = next;
  }
  assert.ok(val > 9.99);
});

test('Software GL renderer string detector identifies CPU fallback renderers', () => {
  assert.equal(isSoftwareRendererString('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))'), true);
  assert.equal(isSoftwareRendererString('llvmpipe (LLVM 15.0.7, 256 bits)'), true);
  assert.equal(isSoftwareRendererString('Microsoft Basic Render Driver'), true);
  assert.equal(isSoftwareRendererString('ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro)'), false);
});

test('computeQuadMatrix3d maps screen corners cleanly and rejects back-facing quads', () => {
  const identityLike = computeQuadMatrix3d(960, 640, [
    { x: 100, y: 50 },
    { x: 1060, y: 50 },
    { x: 1060, y: 690 },
    { x: 100, y: 690 },
  ]);
  assert.ok(identityLike !== null);
  assert.ok(identityLike.startsWith('matrix3d('));

  // Tilted 3/4 perspective quad
  const tilted = computeQuadMatrix3d(960, 640, [
    { x: 320, y: 120 },
    { x: 1120, y: 165 },
    { x: 1080, y: 610 },
    { x: 345, y: 580 },
  ]);
  assert.ok(tilted !== null);
  assert.ok(tilted.startsWith('matrix3d('));

  // Back-facing quad (reversed horizontal corners) must return null
  const backFacing = computeQuadMatrix3d(960, 640, [
    { x: 1060, y: 50 },
    { x: 100, y: 50 },
    { x: 100, y: 690 },
    { x: 1060, y: 690 },
  ]);
  assert.equal(backFacing, null);
});

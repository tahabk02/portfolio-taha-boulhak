export type PortfolioMode = 'hero' | 'case';

export interface HeroLayoutMetrics {
  wmLeft: number;
  wmWidth: number;
  badgeLeft: number;
  badgeTop: number;
  scriptLeft: number;
  scriptFontSize: number;
}

export interface PoseResult {
  mobile: boolean;
  s: number;
  x: number;
  y: number;
  n: number;
  heroLayout: HeroLayoutMetrics | null;
}

/**
 * Computes the exact transform for the 1440x810 reference scene frame
 * and responsive hero element offsets (wordmark, script, lanyard badge).
 */
export function computePose(
  mode: PortfolioMode,
  W: number,
  H: number,
  ticketHeight: number,
  descHeight: number
): PoseResult {
  const mobile = W <= 820;
  const u = mobile ? 0 : Math.min(W / 1440, H / 900);
  const cover = Math.max(W / 1440, H / 810);
  const n = mobile ? W / 430 : Math.min(W / 1440, H / 900);

  let s: number;
  let x: number;
  let y: number;

  if (!mobile) {
    if (mode === 'hero') {
      s = cover;
      y = 0;
    } else {
      const top = 66 * u;
      const fit = (H - top - 28 * u) / 683;
      if (fit >= cover) {
        s = cover;
        y = Math.min(0, Math.max(H - 810 * s, top - 79 * s));
      } else {
        s = fit;
        y = top - 79 * fit;
      }
    }
    x = (W - 1440 * s) / 2;
  } else if (mode === 'hero') {
    s = Math.min(W / 650, (0.62 * H) / 810);
    x = W / 2 - 700 * s;
    y = H - 800 * s;
  } else {
    const navH = 0.022 * H + 42 + 22;
    const ub = 62 + ticketHeight + 18 + Math.max(60, descHeight) + 14;
    s = Math.min((W - 28) / 905, Math.max(0.2, (H - navH - ub) / 667));
    x = W / 2 - 720 * s;
    y = H - navH - 762 * s;
  }

  let heroLayout: HeroLayoutMetrics | null = null;
  if (mode === 'hero') {
    const vl = Math.max(0, -x / s);
    const vr = Math.min(1440, (W - x) / s);
    const pad = 18 / s;
    const sb = mobile ? 0.55 : 1;
    const vb = Math.min(810, (H - y) / s);

    heroLayout = {
      wmLeft: vl + 0.6 * pad,
      wmWidth: Math.max(120, vr - vl - 1.2 * pad),
      badgeLeft: Math.min(986, vr - pad - 288 - 129 * sb),
      badgeTop: mobile ? -165 : Math.min(-165, vb - 56 / s - 935),
      scriptLeft: vl + pad + (mobile ? 10 : 70),
      scriptFontSize: mobile ? 64 : 82,
    };
  }

  return { mobile, s, x, y, n, heroLayout };
}

/**
 * Exponential framerate-independent damping helper.
 */
export function dampValue(current: number, target: number, lambda: number, dt: number): number {
  const factor = 1 - Math.exp(-lambda * Math.max(0, dt));
  return current + (target - current) * factor;
}

/**
 * Detects CPU/software WebGL renderers (SwiftShader, llvmpipe, etc.)
 * so Three.js can disable expensive GPU features while keeping lighting intact.
 */
export function isSoftwareRendererString(rendererString: string): boolean {
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererString);
}

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Solves an 8-DOF perspective homography mapping (0,0)->p0, (w,0)->p1, (w,h)->p2, (0,h)->p3
 * into a CSS `matrix3d(...)` string for locking HTML/YouTube embeds onto a 3D mesh plane.
 * Returns null if the quad is degenerate or back-facing.
 */
export function computeQuadMatrix3d(
  srcW: number,
  srcH: number,
  quad: [Point2D, Point2D, Point2D, Point2D]
): string | null {
  if (srcW <= 0 || srcH <= 0) return null;
  const [p0, p1, p2, p3] = quad;

  // Check signed area (positive = front-facing in screen Y-down coordinates)
  const cross1 = (p1.x - p0.x) * (p3.y - p0.y) - (p1.y - p0.y) * (p3.x - p0.x);
  const cross2 = (p3.x - p2.x) * (p1.y - p2.y) - (p3.y - p2.y) * (p1.x - p2.x);
  if (cross1 <= 250 || cross2 <= 250) return null;

  const src: [Point2D, Point2D, Point2D, Point2D] = [
    { x: 0, y: 0 },
    { x: srcW, y: 0 },
    { x: srcW, y: srcH },
    { x: 0, y: srcH },
  ];

  // Build 8x9 augmented matrix for [a, b, c, d, e, f, g, h | rhs]
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const sx = src[i].x;
    const sy = src[i].y;
    const dx = quad[i].x;
    const dy = quad[i].y;
    A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx, dx]);
    A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy, dy]);
  }

  // Gaussian elimination with partial pivoting
  for (let col = 0; col < 8; col++) {
    let maxRow = col;
    let maxVal = Math.abs(A[col][col]);
    for (let row = col + 1; row < 8; row++) {
      const v = Math.abs(A[row][col]);
      if (v > maxVal) {
        maxVal = v;
        maxRow = row;
      }
    }
    if (maxVal < 1e-9) return null;
    if (maxRow !== col) {
      const tmp = A[col];
      A[col] = A[maxRow];
      A[maxRow] = tmp;
    }

    const pivot = A[col][col];
    for (let j = col; j < 9; j++) A[col][j] /= pivot;

    for (let row = 0; row < 8; row++) {
      if (row === col) continue;
      const factor = A[row][col];
      if (Math.abs(factor) < 1e-12) continue;
      for (let j = col; j < 9; j++) {
        A[row][j] -= factor * A[col][j];
      }
    }
  }

  const a = A[0][8];
  const b = A[1][8];
  const c = A[2][8];
  const d = A[3][8];
  const e = A[4][8];
  const f = A[5][8];
  const g = A[6][8];
  const h = A[7][8];

  if (![a, b, c, d, e, f, g, h].every(Number.isFinite)) return null;

  return `matrix3d(${a.toFixed(7)},${d.toFixed(7)},0,${g.toFixed(9)},${b.toFixed(7)},${e.toFixed(7)},0,${h.toFixed(9)},0,0,1,0,${c.toFixed(4)},${f.toFixed(4)},0,1)`;
}

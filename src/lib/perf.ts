import { FEATURE_FLAGS, PERF, type DeviceTier } from '../config/perf';
import { isSoftwareRendererString } from './poseMath';

let cachedTier: DeviceTier | null = null;

function probeWebGL(): { webgl: boolean; webgl2: boolean; softwareRenderer: boolean } {
  if (typeof document === 'undefined') return { webgl: false, webgl2: false, softwareRenderer: false };
  let webgl = false;
  let webgl2 = false;
  let softwareRenderer = false;
  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    const gl = gl2 ?? canvas.getContext('webgl');
    if (gl) {
      webgl = true;
      webgl2 = Boolean(gl2);
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = String(
        debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
      );
      softwareRenderer = isSoftwareRendererString(renderer);
    }
    const lose = gl?.getExtension('WEBGL_lose_context');
    lose?.loseContext();
  } catch {
    webgl = false;
  }
  return { webgl, webgl2, softwareRenderer };
}

/** One-shot device capability probe (safe to call repeatedly). */
export function detectDeviceTier(): DeviceTier {
  if (cachedTier) return cachedTier;
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const cores = nav?.hardwareConcurrency ?? 8;
  const memoryGb = (nav as (Navigator & { deviceMemory?: number }) | undefined)?.deviceMemory ?? 8;
  const gl = probeWebGL();
  const lowEnd = cores <= PERF.lowEndCores || memoryGb <= PERF.lowEndMemoryGb;
  const preferredFastMode =
    FEATURE_FLAGS.ENABLE_FAST_MODE &&
    FEATURE_FLAGS.ENABLE_AUTO_FAST_MODE &&
    (!gl.webgl || gl.softwareRenderer || lowEnd);
  cachedTier = {
    webgl: gl.webgl,
    webgl2: gl.webgl2,
    softwareRenderer: gl.softwareRenderer,
    lowEnd,
    cores,
    memoryGb,
    preferredFastMode,
  };
  return cachedTier;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Watches sustained low frame rates while the 3D scene is actively rendering.
 * Calls `onLow` at most once per session window.
 */
export class FpsGuard {
  private samples: number[] = [];
  private fired = false;
  private readonly threshold: number;
  private readonly windowMs: number;

  constructor(threshold = PERF.lowFpsThreshold, windowMs = PERF.lowFpsWindowMs) {
    this.threshold = threshold;
    this.windowMs = windowMs;
  }

  reset() {
    this.samples.length = 0;
  }

  /** Feed a RAF timestamp (ms). Returns true exactly once when sustained low FPS is detected. */
  sample(now: number): boolean {
    if (this.fired) return false;
    this.samples.push(now);
    while (this.samples.length > 2 && now - this.samples[0] > this.windowMs) this.samples.shift();
    if (this.samples.length < PERF.fpsSampleMinFrames) return false;
    const span = now - this.samples[0];
    if (span < this.windowMs * 0.9) return false;
    const fps = ((this.samples.length - 1) * 1000) / span;
    if (fps < this.threshold) {
      this.fired = true;
      return true;
    }
    return false;
  }

  markFired() {
    this.fired = true;
  }
}

# Baseline & Audit

Measured on the pre-change snapshot (`baseline: pre-audit snapshot`).

## Environment

- Node 22.17.0 / npm 11.7.0 / Windows 10 (win32)
- Vite 8.3.8 (rolldown), React 19.0.1, three 0.187.0
- Stack: React + raw three.js (no @react-three/fiber, no drei), TypeScript.
- No headless browser/WebGL harness is available in this environment, so GPU
  FPS / draw calls / GPU texture memory are **estimated from static scene
  structure** and marked as such. Bundle and timings are exact.

## Baseline metrics

| Metric | Baseline | How measured |
| --- | --- | --- |
| Production build (wall time) | 7.11 s (vite report 1.39 s) | `npm run build` |
| JS bundle | 1,085.80 kB (gzip 297.90 kB), 1 chunk | build report |
| CSS bundle | 41.72 kB (gzip 10.26 kB) | build report |
| Type-check | 4.08 s | `npm run lint` (tsc --noEmit) |
| Tests | 7/7 pass | `node --import tsx --test tests/portfolio.test.ts` |
| Draw calls (room) | ~250 mesh objects + 5 InstancedMesh + shadow pass (est. 300+) | static count `new THREE.Mesh(` = 252 |
| Triangles | Not captured (no GPU timer); scene is mostly low-poly primitives + RoundedBox | static |
| Texture sources | 23 CanvasTextures; screen 1440×960, murals/podcast 1280×800, arcade 960×540, slats/duvet 256–1024 | static |
| Lights | 13 (1 shadow-casting directional + hemi + 2 dir + 6 point) | static |
| Event listeners | 19 `addEventListener` sites (window + canvas) | static |
| FPS desktop | Not measurable headlessly (expected 60 on GPU; on-demand render loop) | — |
| Load time | Not measurable headlessly | — |
| WebGL fallback | None (crash / blank canvas if context fails) | code audit |
| Code splitting | None (three.js shipped in the single entry chunk) | build report |

## Audit

| File | Issue | Severity | Planned fix |
| --- | --- | --- | --- |
| `src/three/StudioScene.tsx` | three.js + GLTFLoader loaded eagerly in the single 1.09 MB chunk | high | Lazy-load `StudioScene` + Suspense progress screen (phase 1) |
| `src/three/StudioScene.tsx` | No `webglcontextlost/restored` handling, no ErrorBoundary | high | Add handlers + ErrorBoundary + Fast/2D fallback (phase 1) |
| `src/three/StudioScene.tsx` | `getObjectByName` for contact shadow + TV screen inside the frame loop | medium | Cache object refs after build (phase 1) |
| `src/three/StudioScene.tsx` | Camera obstruction raycast allocates intersections every 80 ms over the whole room | medium | Keep throttle, reuse scratch; clamp camera to room (phase 1/2) |
| `src/three/StudioScene.tsx` | `setGamePrompt` etc. from tick (throttled by change only) | low | Keep; move state machine into refs + debug overlay (phase 2) |
| `src/three/StudioScene.tsx` | Two `pointerdown/pointermove/pointerup` sets on the canvas | low | Keep (orbit + click) but guard with state machine (phase 4) |
| `src/three/StudioScene.tsx` | Window keydown capture + App window keydown (relies on stopImmediatePropagation) | medium | Single in-game key path, explicit active gate, text-input guard (phase 4) |
| `src/three/StudioScene.tsx` | Avatar/props cast shadows (81 `castShadow = true` sites) | low | Keep visual parity; keep single 2048 shadow light (already), flag for fast mode |
| `src/three/StudioScene.tsx` | `anisotropy = getMaxAnisotropy()` (may be 16) | low | Cap to 8 (phase 1 constant) |
| `src/three/studioProps.ts` | NEON DODGE runs with variable `dt`, no fixed timestep, no visibility pause, no score/game-over/restart UI, no touch dash | high | Fixed 60 Hz accumulator, pause, HUD, touch controls (phase 4) |
| `src/three/studioProps.ts` | Room builder allocates many individual static meshes | low | Slats already instanced; further merge skipped (visual risk) |
| `src/three/laptopModel.ts` | Geometry/material/texture tracker + dispose exists | — | OK |
| `src/three/StudioScene.tsx` | Dispose on unmount exists for tracked resources | — | OK; keep |
| `src/three/StudioScene.tsx` | Collision is ad-hoc AABBs, velocity zeroed on block, no push-out; possible spawn trap | medium | Capsule vs AABB + slide + push-out constants (phase 2) |
| `src/three/StudioScene.tsx` | Camera not clamped to room bounds; only object raycast | medium | Room clamp + head-origin ray + damped look-at (phase 2) |
| `src/three/StudioScene.tsx` | Boolean soup (`isSitting/isResting/isConsolePlaying`) with no exit failsafe | medium | Typed interaction state machine + 2 s failsafe + dev overlay (phase 2) |
| `src/three/StudioScene.tsx`, UI | Room UI + desk messages in French while the rest is English | medium | Single copy dictionary + EN/FR toggle (phase 3) |
| `src/App.tsx` | No analytics hooks; hire is a mailto with no overlay from all states | medium | Pluggable analytics + sticky Hire me → contact sheet (phase 3) |
| `src/App.tsx` | No loading progress, no `noscript`, no OG image | low | Progress screen + noscript + og:image (phase 1/3) |
| `src/index.css` | `prefers-reduced-motion` only disables CSS animation | low | Also calm 3D idle/camera motion (phase 1) |
| `src/App.tsx` | No device-tier detection / fast-mode toggle | high | `detectDeviceTier`, FPS guard, toggle, 2D fallback (phase 1) |

## Notes

- No `useFrame` exists (raw three.js), so the "zero allocations in useFrame"
  requirement is applied to the `tick()` render loop.
- Scene units are room-local; all new tunables are relative/clamped constants in
  `src/config/`.
- Project names (`NUCLEUS 2BAC`, `MEDISAAS`, `TASK MANAGER`, `AI TRADING`, …)
  and technical terms stay untranslated by design.

## AFTER (2026-11-23)

Measured after phases 1–5. Build output is exact; browser and GPU values remain
unavailable in this environment.

| Metric | After | Change / notes |
| --- | --- | --- |
| Production build (Vite report) | 0.53 s | Baseline 1.39 s; wall time varies by host |
| Initial JS (lazy studio not yet downloaded) | 275.44 kB (gzip 85.27 kB) | Split from the former single entry chunk |
| Total JS after entering the 3D studio | 1,110.84 kB (gzip 306.58 kB) | Baseline 1,085.80 kB (gzip 297.90 kB); +25.04 kB raw / +8.68 kB gzip |
| CSS bundle | 52.21 kB (gzip 12.50 kB) | Baseline 41.72 kB (gzip 10.26 kB) |
| Draw calls / triangles | Not captured | `renderer.info` first-frame logging is available behind `FEATURE_FLAGS.ENABLE_RENDERER_INFO_LOG` |
| Texture memory | Not captured | Renderer reports texture count only; GPU byte usage needs browser tooling |
| FPS / load time | Not measurable here | Requires a browser session on target hardware and a throttled network profile |
| Manual desktop/mobile/WebGL/game interaction checks | Not run | No browser/WebGL harness is available in this environment |

### Remaining targets

- The 3D scene still has many individual meshes; the under-200 draw-call target
  was not demonstrated or optimized because merging room props risks changing
  the existing composition and material behavior.
- Stable 60 FPS and under-4-second fast-4G load time need measurement on the
  target laptop and a browser network profile; the JavaScript is now split so
  the 3D chunk is deferred until needed.
- Zone glow highlights, full site-wide extraction of every string into
  `copy.ts`, mobile viewport checks, WebGL loss/restore, and sit/game spam
  checks remain for a browser validation pass.

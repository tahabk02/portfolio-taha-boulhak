import { CEILING, type CeilingColorTheme, type CeilingPreset } from '../config/ceiling';

export interface CeilingZones { cove: boolean; hexPanels: boolean; trackSpots: boolean; pendantRing: boolean; }
export interface CeilingLightingState {
  enabled: boolean;
  brightness: number;
  preset: Exclude<CeilingPreset, 'off'>;
  colorTheme: CeilingColorTheme;
  zones: CeilingZones;
}

const STORAGE_KEY = 'taha-studio-ceiling-v2';
const presetThemes: Record<Exclude<CeilingPreset, 'off'>, CeilingColorTheme> = { work: 'warm', gaming: 'ice', creative: 'warm', chill: 'emerald' };
const defaults: CeilingLightingState = {
  enabled: true, brightness: 1, preset: 'work', colorTheme: presetThemes.work,
  zones: { cove: true, hexPanels: true, trackSpots: true, pendantRing: true },
};

function readStoredState(): CeilingLightingState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as Partial<CeilingLightingState>;
    const preset = saved.preset && saved.preset in CEILING.lights ? saved.preset : defaults.preset;
    const theme = saved.colorTheme && saved.colorTheme in CEILING.colors ? saved.colorTheme : defaults.colorTheme;
    return {
      enabled: typeof saved.enabled === 'boolean' ? saved.enabled : defaults.enabled,
      brightness: typeof saved.brightness === 'number' ? Math.min(1, Math.max(0, saved.brightness)) : defaults.brightness,
      preset: preset as CeilingLightingState['preset'], colorTheme: theme as CeilingColorTheme,
      zones: { ...defaults.zones, ...(saved.zones ?? {}) },
    };
  } catch { return defaults; }
}

let state = typeof window === 'undefined' ? defaults : readStoredState();
const listeners = new Set<() => void>();
function publish(next: CeilingLightingState) {
  state = next;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage may be blocked */ }
  listeners.forEach((listener) => listener());
}

export const getCeilingLightingState = () => state;
export const subscribeCeilingLighting = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
export function setCeilingPreset(preset: CeilingPreset) {
  if (preset === 'off') { publish({ ...state, enabled: false }); return; }
  publish({ ...state, enabled: true, preset, colorTheme: presetThemes[preset] });
}
export function toggleCeilingLighting() { publish({ ...state, enabled: !state.enabled }); }
export function setCeilingBrightness(brightness: number) { publish({ ...state, brightness: Math.min(1, Math.max(0, brightness)) }); }
export function setCeilingZone(zone: keyof CeilingZones, enabled: boolean) { publish({ ...state, zones: { ...state.zones, [zone]: enabled } }); }
export function setCeilingColorTheme(colorTheme: CeilingColorTheme) { publish({ ...state, colorTheme }); }

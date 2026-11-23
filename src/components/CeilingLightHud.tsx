import { useState, useSyncExternalStore } from 'react';
import './CeilingLightHud.css';
import type { Language } from '../config/copy';
import { COPY } from '../config/copy';
import type { CeilingColorTheme, CeilingPreset } from '../config/ceiling';
import {
  getCeilingLightingState, setCeilingBrightness, setCeilingColorTheme,
  setCeilingPreset, setCeilingZone, subscribeCeilingLighting, toggleCeilingLighting,
  type CeilingZones,
} from '../lib/ceilingLighting';

const presets: Array<[CeilingPreset, keyof typeof COPY.en]> = [
  ['work', 'lightWork'], ['gaming', 'lightGaming'], ['creative', 'lightCreative'], ['chill', 'lightChill'], ['off', 'lightsOff'],
];
const zones: Array<[keyof CeilingZones, keyof typeof COPY.en]> = [
  ['cove', 'lightCove'], ['hexPanels', 'lightHex'], ['trackSpots', 'lightSpots'], ['pendantRing', 'lightPendant'],
];
const themes: Array<[CeilingColorTheme, keyof typeof COPY.en]> = [
  ['emerald', 'themeEmerald'], ['warm', 'themeWarm'], ['ice', 'themeIce'],
];

export function CeilingLightHud({ lang, onChange }: { lang: Language; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const state = useSyncExternalStore(subscribeCeilingLighting, getCeilingLightingState, getCeilingLightingState);
  const copy = COPY[lang];
  const update = (action: () => void) => { action(); onChange(); };

  return <div className={`ceiling-hud ${open ? 'is-open' : ''}`} onPointerDown={(event) => event.stopPropagation()}>
    <button type="button" className="ceiling-hud-trigger" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span aria-hidden="true">✦</span> {copy.lights}
      <span className={`ceiling-hud-status ${state.enabled ? 'is-on' : ''}`}>{state.enabled ? copy.lightsOn : copy.lightsOff}</span>
    </button>
    {open && <section className="ceiling-hud-panel" aria-label={copy.lights}>
      <header><strong>{copy.lights}</strong><button type="button" aria-label={copy.dismiss} onClick={() => setOpen(false)}>×</button></header>
      <button type="button" className="ceiling-master-toggle" aria-pressed={state.enabled} onClick={() => update(toggleCeilingLighting)}>
        <span>{state.enabled ? copy.lightsOn : copy.lightsOff}</span><span className="ceiling-toggle-track"><i /></span>
      </button>
      <label className="ceiling-range-label" htmlFor="ceiling-brightness"><span>{copy.lightBrightness}</span><output>{Math.round(state.brightness * 100)}%</output></label>
      <input id="ceiling-brightness" className="ceiling-range" type="range" min="0" max="1" step="0.01" value={state.brightness} onChange={(event) => update(() => setCeilingBrightness(Number(event.target.value)))} />
      <p className="ceiling-section-label">{copy.lightPresets}</p>
      <div className="ceiling-preset-grid">{presets.map(([preset, label]) => {
        const active = preset === 'off' ? !state.enabled : state.enabled && state.preset === preset;
        return <button key={preset} type="button" className={active ? 'is-active' : ''} aria-pressed={active} onClick={() => update(() => setCeilingPreset(preset))}>{copy[label]}</button>;
      })}</div>
      <p className="ceiling-section-label">{copy.lightZones}</p>
      <div className="ceiling-zone-grid">{zones.map(([zone, label]) => <button key={zone} type="button" aria-pressed={state.zones[zone]} className={state.zones[zone] ? 'is-active' : ''} onClick={() => update(() => setCeilingZone(zone, !state.zones[zone]))}><span>{state.zones[zone] ? '●' : '○'}</span>{copy[label]}</button>)}</div>
      <label className="ceiling-section-label" htmlFor="ceiling-theme">{copy.lightTheme}</label>
      <select id="ceiling-theme" value={state.colorTheme} onChange={(event) => update(() => setCeilingColorTheme(event.target.value as CeilingColorTheme))}>{themes.map(([theme, label]) => <option value={theme} key={theme}>{copy[label]}</option>)}</select>
      <small>{copy.lightHotkey}</small>
    </section>}
  </div>;
}

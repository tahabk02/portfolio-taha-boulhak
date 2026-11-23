import {
  CAMERA_PRESETS,
  FINISHES,
  YOUTUBE_VIDEOS,
  type CameraPreset,
  type ChassisFinish,
} from '../data/portfolio';
import { UIButton } from './UIButton';
import { COPY, type Language } from '../config/copy';

interface ControlDockProps {
  lang: Language;
  visible: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activePreset: CameraPreset;
  onSelectPreset: (preset: CameraPreset) => void;
  activeFinish: ChassisFinish;
  onSelectFinish: (finish: ChassisFinish) => void;
  activeYoutubeId: string | null;
  onSelectYoutube: (videoId: string | null) => void;
  onPreviousProject: () => void;
  onNextProject: () => void;
}

export function ControlDock({
  lang,
  visible,
  collapsed,
  onToggleCollapse,
  activePreset,
  onSelectPreset,
  activeFinish,
  onSelectFinish,
  activeYoutubeId,
  onSelectYoutube,
  onPreviousProject,
  onNextProject,
}: ControlDockProps) {
  const copy = COPY[lang];
  if (!visible) return null;

  if (collapsed) {
    return (
      <div className="studio-dock-collapsed" data-testid="control-dock" data-ui="bottom-dock">
        <UIButton
          variant="ghost"
          name="dock-toggle"
          type="button"
          className="dock-toggle-btn"
          onClick={onToggleCollapse}
          aria-expanded="false"
          title={`${copy.showControls} (H)`}
        >
          <span>{copy.showControls}</span>
          <kbd>H</kbd>
        </UIButton>
      </div>
    );
  }

  return (
    <aside
      className="studio-dock"
      data-testid="control-dock"
      aria-label="3D Studio Camera, Finish, and YouTube 3D Video Controls"
      data-ui="bottom-dock"
    >
      <UIButton variant="icon" name="dock-previous-project" className="dock-btn dock-project-nav" aria-label={copy.previousProject} onClick={onPreviousProject}>←</UIButton>
      <div className="dock-group" role="group" aria-label={copy.dockAngle}>
        <span className="dock-label">{copy.dockAngle}</span>
        <div className="dock-buttons">
          {CAMERA_PRESETS.map((p) => {
            const selected = p.id === activePreset.id;
            return (
              <UIButton
                variant="ghost"
                name={`camera-${p.id}`}
                key={p.id}
                type="button"
                className={`dock-btn ${selected ? 'is-active' : ''}`}
                onClick={() => onSelectPreset(p)}
                aria-pressed={selected}
                aria-label={p.label}
              >
                <span className="dock-preset-icon" aria-hidden="true">{{ front: '◉', studio: '◇', top: '↓', detail: '⌁', wall: '▤' }[p.id]}</span><span className="dock-button-label">{p.label}</span>
              </UIButton>
            );
          })}
        </div>
      </div>

      <span className="dock-divider" aria-hidden="true" />

      <div className="dock-group" role="group" aria-label={copy.dockChassis}>
        <span className="dock-label">{copy.dockChassis}</span>
        <div className="dock-swatches">
          {FINISHES.map((f) => {
            const selected = f.id === activeFinish.id;
            return (
              <UIButton
                variant="ghost"
                name={`finish-${f.id}`}
                key={f.id}
                type="button"
                className={`dock-swatch-btn ${selected ? 'is-active' : ''}`}
                onClick={() => onSelectFinish(f)}
                aria-pressed={selected}
                title={`${f.label} metallic finish`}
                aria-label={`${f.label} metallic finish`}
              >
                <span
                  className="dock-swatch"
                  style={{ backgroundColor: f.swatch }}
                  aria-hidden="true"
                />
                <span>{f.label}</span>
              </UIButton>
            );
          })}
        </div>
      </div>

      <span className="dock-divider" aria-hidden="true" />

      <div className="dock-group" role="group" aria-label={copy.dockVideos}>
        <span className="dock-label">{copy.dockVideos}</span>
        <div className="dock-buttons">
          {YOUTUBE_VIDEOS.map((vid) => {
            const selected = activeYoutubeId === vid.id;
            return (
              <UIButton
                variant="ghost"
                name={`video-${vid.id}`}
                key={vid.id}
                type="button"
                className={`dock-btn dock-yt-btn ${selected ? 'is-active' : ''}`}
                onClick={() => onSelectYoutube(selected ? null : vid.id)}
                aria-pressed={selected}
                aria-label={vid.title}
                title={`Play "${vid.title}" on the 3D laptop screen`}
              >
                <span>▶ {vid.shortLabel}</span>
              </UIButton>
            );
          })}
        </div>
      </div>

      <UIButton
        variant="accent"
        name="dock-hide"
        type="button"
        className="dock-collapse-btn"
        onClick={onToggleCollapse}
        aria-expanded="true"
        title={`${copy.hideControls} 3D controls (H)`}
      >
        {copy.hideControls} <kbd>H</kbd>
      </UIButton>
      <UIButton variant="icon" name="dock-next-project" className="dock-btn dock-project-nav dock-project-next" aria-label={copy.nextProject} onClick={onNextProject}>→</UIButton>
    </aside>
  );
}

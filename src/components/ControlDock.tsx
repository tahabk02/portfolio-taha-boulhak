import {
  CAMERA_PRESETS,
  FINISHES,
  YOUTUBE_VIDEOS,
  type CameraPreset,
  type ChassisFinish,
} from '../data/portfolio';

interface ControlDockProps {
  visible: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activePreset: CameraPreset;
  onSelectPreset: (preset: CameraPreset) => void;
  activeFinish: ChassisFinish;
  onSelectFinish: (finish: ChassisFinish) => void;
  activeYoutubeId: string | null;
  onSelectYoutube: (videoId: string | null) => void;
}

export function ControlDock({
  visible,
  collapsed,
  onToggleCollapse,
  activePreset,
  onSelectPreset,
  activeFinish,
  onSelectFinish,
  activeYoutubeId,
  onSelectYoutube,
}: ControlDockProps) {
  if (!visible) return null;

  if (collapsed) {
    return (
      <div className="studio-dock-collapsed" data-testid="control-dock">
        <button
          type="button"
          className="dock-toggle-btn"
          onClick={onToggleCollapse}
          aria-expanded="false"
          title="Expand 3D Studio Controls (H)"
        >
          <span>3D Studio</span>
          <kbd>H</kbd>
        </button>
      </div>
    );
  }

  return (
    <aside
      className="studio-dock"
      data-testid="control-dock"
      aria-label="3D Studio Camera, Finish, and YouTube 3D Video Controls"
    >
      <div className="dock-group" role="group" aria-label="Camera Presets">
        <span className="dock-label">Angle</span>
        <div className="dock-buttons">
          {CAMERA_PRESETS.map((p) => {
            const selected = p.id === activePreset.id;
            return (
              <button
                key={p.id}
                type="button"
                className={`dock-btn ${selected ? 'is-active' : ''}`}
                onClick={() => onSelectPreset(p)}
                aria-pressed={selected}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <span className="dock-divider" aria-hidden="true" />

      <div className="dock-group" role="group" aria-label="Chassis Finish">
        <span className="dock-label">Chassis</span>
        <div className="dock-swatches">
          {FINISHES.map((f) => {
            const selected = f.id === activeFinish.id;
            return (
              <button
                key={f.id}
                type="button"
                className={`dock-swatch-btn ${selected ? 'is-active' : ''}`}
                onClick={() => onSelectFinish(f)}
                aria-pressed={selected}
                title={`${f.label} metallic finish`}
              >
                <span
                  className="dock-swatch"
                  style={{ backgroundColor: f.swatch }}
                  aria-hidden="true"
                />
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <span className="dock-divider" aria-hidden="true" />

      <div className="dock-group" role="group" aria-label="3D Screen YouTube Videos">
        <span className="dock-label">YouTube 3D</span>
        <div className="dock-buttons">
          {YOUTUBE_VIDEOS.map((vid) => {
            const selected = activeYoutubeId === vid.id;
            return (
              <button
                key={vid.id}
                type="button"
                className={`dock-btn dock-yt-btn ${selected ? 'is-active' : ''}`}
                onClick={() => onSelectYoutube(selected ? null : vid.id)}
                aria-pressed={selected}
                title={`Play "${vid.title}" on the 3D laptop screen`}
              >
                <span>▶ {vid.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        className="dock-collapse-btn"
        onClick={onToggleCollapse}
        aria-expanded="true"
        title="Hide 3D Controls (H)"
      >
        Hide <kbd>H</kbd>
      </button>
    </aside>
  );
}

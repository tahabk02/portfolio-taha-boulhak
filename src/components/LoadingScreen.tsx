import { useEffect, useState } from 'react';
import { PROFILE } from '../data/portfolio';

interface LoadingScreenProps {
  progress: number;
  done: boolean;
}

/** Branded boot progress screen (hero assets + fonts + lazy 3D chunk). */
export function LoadingScreen({ progress, done }: LoadingScreenProps) {
  const [mounted, setMounted] = useState(true);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!done) return;
    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 380);
    return () => window.clearTimeout(timer);
  }, [done]);

  if (!mounted) return null;
  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div
      className={`loading-screen ${visible ? '' : 'is-done'}`}
      role="status"
      aria-live="polite"
      aria-label={`Loading portfolio ${pct}%`}
    >
      <div className="loading-inner">
        <div className="loading-wordmark">{PROFILE.wordmark}</div>
        <p className="loading-script">{PROFILE.script}</p>
        <div className="loading-track" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className="loading-meta">
          <span>{done ? 'Ready' : 'Preparing the studio'}</span>
          <span>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

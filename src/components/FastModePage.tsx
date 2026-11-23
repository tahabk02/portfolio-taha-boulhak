import { useState } from 'react';
import { CASES, CFG, PROFILE, YOUTUBE_VIDEOS } from '../data/portfolio';
import { COPY, type Language } from '../config/copy';

interface FastModePageProps {
  canEnter3D: boolean;
  onEnter3D: () => void;
  onTrack?: (event: string, meta?: Record<string, unknown>) => void;
  lang: Language;
  onToggleLanguage: () => void;
}

/**
 * Lightweight 2D portfolio used when WebGL is unavailable, the device is
 * low-end, FPS stays low, or the visitor explicitly picks Fast mode.
 * No three.js is imported here.
 */
export function FastModePage({ canEnter3D, onEnter3D, onTrack, lang, onToggleLanguage }: FastModePageProps) {
  const [contactOpen, setContactOpen] = useState(false);
  const track = (event: string, meta?: Record<string, unknown>) => onTrack?.(event, meta);
  const copy = COPY[lang];

  return (
    <div className="fast-page">
      <button className="fast-hire-sticky" type="button" onClick={() => { track('hire_me_clicked', { source: 'fast-sticky' }); setContactOpen(true); }}>{copy.hire}</button>
      <header className="fast-topbar">
        <a className="fast-logo" href="#top" aria-label={`${PROFILE.wordmark} home`}>
          {PROFILE.wordmark}
        </a>
        <nav className="fast-nav" aria-label="Portfolio sections">
          <a href="#projects">{copy.projects}</a>
          <a href="#about">{copy.about}</a>
          <a href="#contact">{copy.contact}</a>
          <button type="button" className="fast-lang-toggle" onClick={onToggleLanguage} aria-label={copy.language}>{lang.toUpperCase()}</button>
          {canEnter3D && (
            <button type="button" className="fast-cta-small" onClick={onEnter3D}>
              {copy.enter3d}
            </button>
          )}
        </nav>
      </header>

      <main className="fast-scroll" id="top">
        <section className="fast-hero" aria-label="Introduction">
          <div className="fast-hero-copy">
            <span className="fast-kicker">{copy.intro}</span>
            <h1>
              Taha
              <br />
              Boulhak
            </h1>
            <p>
              {copy.introBody}
            </p>
            <div className="fast-hero-actions">
              <a className="fast-cta" href="#projects">
                {copy.explore}
              </a>
              <button className="fast-cta ghost" type="button" onClick={() => { track('hire_me_clicked', { source: 'fast-hero' }); setContactOpen(true); }}>
                {copy.hire}
              </button>
            </div>
          </div>
          <div className="fast-hero-visual" aria-hidden="true">
            <img src={CFG.plate} alt="" />
            <img className="fast-cutout" src={CFG.cut} alt="" />
          </div>
        </section>

        <section className="fast-section" id="projects" aria-labelledby="fast-projects-title">
          <div className="fast-section-head">
            <span className="fast-kicker">{copy.selectedWork}</span>
            <h2 id="fast-projects-title">{copy.projects}</h2>
          </div>
          <div className="fast-grid">
            {CASES.map((project) => (
              <article className="fast-card" key={project.id}>
                <button
                  type="button"
                  className="fast-card-media"
                  onClick={() => track('project_opened', { project: project.id })}
                >
                  <img src={project.photo} alt={`${project.title} preview`} loading="lazy" />
                </button>
                <div className="fast-card-body">
                  <span className="fast-card-key">{project.key}</span>
                  <h3>{project.title}</h3>
                  <p>{project.rows[1]}</p>
                  <div className="fast-chips">
                    {project.chips.map((chip) => (
                      <span key={chip}>{chip}</span>
                    ))}
                  </div>
                  <div className="fast-card-actions">
                    <a
                      href={project.repo}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => track('view_code_clicked', { project: project.id })}
                    >
                      {copy.viewCode}
                    </a>
                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => track('live_app_clicked', { project: project.id })}
                      >
                        {copy.liveApp}
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="fast-section fast-about" id="about" aria-labelledby="fast-about-title">
          <div>
            <span className="fast-kicker">About</span>
            <h2 id="fast-about-title">{copy.aboutTitle}</h2>
          </div>
          <div>
            <p>{copy.aboutBody}</p>
            <div className="fast-stats">
              <div><strong>{CASES.length.toString().padStart(2, '0')}</strong><span>{copy.featuredBuilds}</span></div>
              <div><strong>{new Set(CASES.flatMap((item) => item.chips)).size.toString().padStart(2, '0')}</strong><span>{copy.toolsStack}</span></div>
              <div><strong>{YOUTUBE_VIDEOS.length.toString().padStart(2, '0')}</strong><span>{copy.projectVideos}</span></div>
            </div>
          </div>
        </section>

        <section className="fast-section fast-contact" id="contact" aria-labelledby="fast-contact-title">
          <div>
            <span className="fast-kicker">{copy.contactPrompt}</span>
            <h2 id="fast-contact-title">{copy.contactTitle}</h2>
            <p>{copy.available}</p>
          </div>
          <div className="fast-contact-links">
            <a href={`mailto:${PROFILE.email}`} onClick={() => track('hire_me_clicked', { source: 'fast-contact' })}>
              <span>Email</span><b>{PROFILE.email}</b>
            </a>
            <a href={PROFILE.github} target="_blank" rel="noopener noreferrer"><span>GitHub</span><b>@tahabk02</b></a>
            <a href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer"><span>LinkedIn</span><b>Taha Boulhak</b></a>
          </div>
        </section>

        <footer className="fast-footer">
          <span>{PROFILE.name} · {PROFILE.script} · 2026</span>
          {canEnter3D && (
            <button type="button" onClick={onEnter3D}>
              {copy.enter3d}
            </button>
          )}
        </footer>
      </main>
      {contactOpen && <div className="fast-contact-modal" role="dialog" aria-modal="true" aria-label={copy.contact}>
        <section><button type="button" className="fast-contact-close" aria-label={copy.closeContact} onClick={() => setContactOpen(false)}>×</button>
          <h2>{copy.contact}</h2>
          <a href={`mailto:${PROFILE.email}`}>Email · {PROFILE.email}</a>
          <a href={PROFILE.github} target="_blank" rel="noopener noreferrer">GitHub · @tahabk02</a>
          <a href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn · Taha Boulhak</a>
        </section>
      </div>}
    </div>
  );
}

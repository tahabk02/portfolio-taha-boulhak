import { useEffect, useState } from 'react';
import { CASES, CFG, PROFILE, YOUTUBE_VIDEOS } from '../data/portfolio';
import { COPY, type Language } from '../config/copy';

interface FastModePageProps {
  canEnter3D: boolean;
  onEnter3D: () => void;
  onTrack?: (event: string, meta?: Record<string, unknown>) => void;
  lang: Language;
  onToggleLanguage: () => void;
}

const TECHNOLOGIES = [
  { name: 'React', mark: 'react', group: 'Interface' },
  { name: 'TypeScript', mark: 'ts', group: 'Language' },
  { name: 'Node.js', mark: 'node', group: 'Runtime' },
  { name: 'Python', mark: 'python', group: 'Language' },
  { name: 'Three.js', mark: 'three', group: '3D' },
  { name: 'MongoDB', mark: 'mongo', group: 'Database' },
  { name: 'Express', mark: 'express', group: 'API' },
  { name: 'FastAPI', mark: 'fastapi', group: 'API' },
  { name: 'Tailwind CSS', mark: 'tailwind', group: 'Interface' },
  { name: 'Stripe', mark: 'stripe', group: 'Payments' },
  { name: 'Flask', mark: 'flask', group: 'API' },
  { name: 'SQLite', mark: 'sqlite', group: 'Database' },
] as const;

type TechMarkName = (typeof TECHNOLOGIES)[number]['mark'];

function TechLogo({ mark }: { mark: TechMarkName }) {
  const letters: Partial<Record<TechMarkName, string>> = {
    ts: 'TS', express: 'ex', fastapi: 'API', stripe: 'S', flask: 'Py', sqlite: 'SQL',
  };
  return (
    <svg className={`fast-tech-logo mark-${mark}`} viewBox="0 0 56 56" aria-hidden="true">
      {mark === 'react' && <g fill="none" stroke="currentColor" strokeWidth="2.2">
        <ellipse cx="28" cy="28" rx="23" ry="9" />
        <ellipse cx="28" cy="28" rx="23" ry="9" transform="rotate(60 28 28)" />
        <ellipse cx="28" cy="28" rx="23" ry="9" transform="rotate(120 28 28)" />
        <circle cx="28" cy="28" r="3.5" fill="currentColor" />
      </g>}
      {(mark === 'ts' || mark === 'stripe' || mark === 'express' || mark === 'fastapi' || mark === 'flask' || mark === 'sqlite') && <>
        <rect x="4" y="4" width="48" height="48" rx="3" fill="currentColor" />
        <text x="28" y="36" textAnchor="middle" fill="#11150f" fontSize={mark === 'fastapi' ? 16 : 21} fontWeight="900" fontFamily="Arial, sans-serif">{letters[mark]}</text>
      </>}
      {mark === 'node' && <>
        <polygon points="28,3 50,15.5 50,40.5 28,53 6,40.5 6,15.5" fill="none" stroke="currentColor" strokeWidth="3" />
        <text x="28" y="32" textAnchor="middle" fill="currentColor" fontSize="9" fontWeight="900" fontFamily="Arial, sans-serif">NODE</text>
        <text x="28" y="41" textAnchor="middle" fill="currentColor" fontSize="7" fontWeight="700" fontFamily="Arial, sans-serif">.JS</text>
      </>}
      {mark === 'python' && <g fill="currentColor">
        <path d="M27 5c-12 0-13 5-13 12v7h18v3H8C2 27 1 32 1 39s4 11 12 11h6v-9c0-6 4-10 10-10h12c6 0 9-4 9-10V17C50 8 44 5 27 5Zm-6 7a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" />
        <path d="M29 51c12 0 13-5 13-12v-7H24v-3h24c6 0 7-5 7-12S51 6 43 6h-6v9c0 6-4 10-10 10H15c-6 0-9 4-9 10v4c0 9 6 12 23 12Zm6-7a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" opacity=".72" />
      </g>}
      {mark === 'three' && <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round">
        <path d="m28 4 21 12v24L28 52 7 40V16L28 4Z" />
        <path d="M7 16 28 28l21-12M28 28v24M17 10l22 13v12L17 23V10Z" />
      </g>}
      {mark === 'mongo' && <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M28 5c-2 9-13 15-13 27 0 9 5 15 13 19 8-4 13-10 13-19C41 20 30 14 28 5Z" />
        <path d="M28 16v34" />
      </g>}
      {mark === 'tailwind' && <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
        <path d="M8 23c4-8 10-12 18-12 12 0 13 9 22 9 3 0 5-1 7-3-4 8-10 12-18 12-12 0-13-9-22-9-3 0-5 1-7 3ZM3 41c4-8 10-12 18-12 12 0 13 9 22 9 3 0 5-1 7-3-4 8-10 12-18 12-12 0-13-9-22-9-3 0-5 1-7 3Z" />
      </g>}
    </svg>
  );
}

/**
 * Lightweight 2D portfolio used when WebGL is unavailable, the device is
 * low-end, FPS stays low, or the visitor explicitly picks Fast mode.
 * No three.js is imported here.
 */
export function FastModePage({ canEnter3D, onEnter3D, onTrack, lang, onToggleLanguage }: FastModePageProps) {
  const [contactOpen, setContactOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const track = (event: string, meta?: Record<string, unknown>) => onTrack?.(event, meta);
  const copy = COPY[lang];

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  return (
    <div className="fast-page" data-ui="fast-mode-page">
      <button className="fast-hire-sticky" type="button" data-ui="fast-hire" onClick={() => { track('hire_me_clicked', { source: 'fast-sticky' }); setContactOpen(true); }}>{copy.hire}</button>
      <header className="fast-topbar" data-ui="fast-topbar">
        <a className="fast-logo" data-ui="fast-home" href="#top" aria-label={`${PROFILE.wordmark} home`}>
          {PROFILE.wordmark}
        </a>
        <button type="button" className="fast-menu-toggle" data-ui="fast-menu" aria-expanded={menuOpen} aria-label={menuOpen ? copy.closeMenu : copy.menu} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? '×' : '☰'}</button>
        <nav className={`fast-nav ${menuOpen ? 'is-open' : ''}`} aria-label={copy.projects} data-ui="fast-navigation">
          <a data-ui="fast-projects" href="#projects">{copy.projects}</a>
          <a data-ui="fast-expertise" href="#expertise">{copy.expertise}</a>
          <a data-ui="fast-stack" href="#stack">{copy.stack}</a>
          <a data-ui="fast-about" href="#about">{copy.about}</a>
          <a data-ui="fast-contact" href="#contact">{copy.contact}</a>
          <button type="button" className="fast-lang-toggle" data-ui="fast-language" onClick={onToggleLanguage} aria-label={copy.language}>{lang.toUpperCase()}</button>
          {canEnter3D && (
            <button type="button" className="fast-cta-small" data-ui="fast-exit" onClick={onEnter3D}>
              {copy.enter3d}
            </button>
          )}
        </nav>
      </header>

      <main className="fast-scroll" id="top">
        <section className="fast-hero" aria-label="Introduction">
          <div className="fast-hero-copy">
            <span className="fast-kicker">{copy.intro}</span>
            <h1><span>Taha</span><span>Boulhak</span></h1>
            <div className="fast-hero-discipline">FULL STACK <i /> PRODUCT <i /> WEBGL</div>
            <p>
              {copy.introBody}
            </p>
            <div className="fast-hero-actions">
              <a className="fast-cta" data-ui="fast-explore" href="#projects">
                {copy.explore}
              </a>
              <button className="fast-cta ghost" data-ui="fast-hero-hire" type="button" onClick={() => { track('hire_me_clicked', { source: 'fast-hero' }); setContactOpen(true); }}>
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
            {CASES.map((project, index) => (
              <article className="fast-card" key={project.id}>
                <button
                  type="button"
                  className="fast-card-media"
                  data-ui={`fast-project-${project.id}`}
                  onClick={() => track('project_opened', { project: project.id })}
                >
                  <img src={project.photo} alt={`${project.title} preview`} loading="lazy" />
                  <span className="fast-card-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="fast-card-open">{copy.openCase} ↗</span>
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

        <section className="fast-section fast-expertise" id="expertise" aria-labelledby="fast-expertise-title">
          <div className="fast-section-head">
            <span className="fast-kicker">{copy.expertiseEyebrow}</span>
            <h2 id="fast-expertise-title">{copy.expertiseTitle}</h2>
          </div>
          <div className="fast-capability-grid">
            {[
              [copy.capabilityOne, copy.capabilityOneBody],
              [copy.capabilityTwo, copy.capabilityTwoBody],
              [copy.capabilityThree, copy.capabilityThreeBody],
            ].map(([title, body], index) => (
              <article className="fast-capability" key={title}>
                <span className="fast-capability-index">0{index + 1} / 03</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="fast-section fast-stack" id="stack" aria-labelledby="fast-stack-title">
          <div className="fast-section-head">
            <span className="fast-kicker">{copy.stackEyebrow}</span>
            <h2 id="fast-stack-title">{copy.stackTitle}</h2>
            <p>{copy.stackBody}</p>
          </div>
          <div className="fast-tech-grid">
            {TECHNOLOGIES.map((tech) => (
              <article className="fast-tech-card" key={tech.name}>
                <div className="fast-tech-mark"><TechLogo mark={tech.mark} /></div>
                <div><h3>{tech.name}</h3><span>{tech.group}</span></div>
                <span className="fast-tech-arrow" aria-hidden="true">↗</span>
              </article>
            ))}
          </div>
        </section>

        <section className="fast-section fast-about" id="about" aria-labelledby="fast-about-title">
          <div>
            <span className="fast-kicker">{copy.about}</span>
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

        <section className="fast-section fast-process" aria-labelledby="fast-process-title">
          <div className="fast-section-head">
            <span className="fast-kicker">{copy.processEyebrow}</span>
            <h2 id="fast-process-title">{copy.processTitle}</h2>
          </div>
          <div className="fast-process-grid">
            {[
              [copy.processOne, copy.processOneBody],
              [copy.processTwo, copy.processTwoBody],
              [copy.processThree, copy.processThreeBody],
            ].map(([title, body], index) => (
              <article className="fast-process-step" key={title}>
                <span>0{index + 1}</span><h3>{title}</h3><p>{body}</p>
              </article>
            ))}
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

        <footer className="fast-footer" data-ui="fast-footer">
          <span>{PROFILE.name} · {PROFILE.script} · 2026</span>
          {canEnter3D && (
            <button type="button" data-ui="fast-exit-footer" onClick={onEnter3D}>
              {copy.enter3d}
            </button>
          )}
        </footer>
      </main>
      {contactOpen && <div className="fast-contact-modal" role="dialog" aria-modal="true" aria-label={copy.contact} data-ui="fast-contact-modal">
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

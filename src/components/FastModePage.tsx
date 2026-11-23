import { CASES, CFG, PROFILE, YOUTUBE_VIDEOS } from '../data/portfolio';

interface FastModePageProps {
  canEnter3D: boolean;
  onEnter3D: () => void;
  onTrack?: (event: string, meta?: Record<string, unknown>) => void;
}

/**
 * Lightweight 2D portfolio used when WebGL is unavailable, the device is
 * low-end, FPS stays low, or the visitor explicitly picks Fast mode.
 * No three.js is imported here.
 */
export function FastModePage({ canEnter3D, onEnter3D, onTrack }: FastModePageProps) {
  const track = (event: string, meta?: Record<string, unknown>) => onTrack?.(event, meta);

  return (
    <div className="fast-page">
      <header className="fast-topbar">
        <a className="fast-logo" href="#top" aria-label={`${PROFILE.wordmark} home`}>
          {PROFILE.wordmark}
        </a>
        <nav className="fast-nav" aria-label="Portfolio sections">
          <a href="#projects">Projects</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          {canEnter3D && (
            <button type="button" className="fast-cta-small" onClick={onEnter3D}>
              Enter 3D studio
            </button>
          )}
        </nav>
      </header>

      <main className="fast-scroll" id="top">
        <section className="fast-hero" aria-label="Introduction">
          <div className="fast-hero-copy">
            <span className="fast-kicker">Full-stack developer · Casablanca, Morocco</span>
            <h1>
              Taha
              <br />
              Boulhak
            </h1>
            <p>
              I build complete web applications — clear interfaces, reliable APIs and
              interactive 3D experiences.
            </p>
            <div className="fast-hero-actions">
              <a className="fast-cta" href="#projects">
                Explore the work
              </a>
              <a className="fast-cta ghost" href={`mailto:${PROFILE.email}`} onClick={() => track('hire_me_clicked', { source: 'fast-hero' })}>
                Hire me
              </a>
            </div>
          </div>
          <div className="fast-hero-visual" aria-hidden="true">
            <img src={CFG.plate} alt="" />
            <img className="fast-cutout" src={CFG.cut} alt="" />
          </div>
        </section>

        <section className="fast-section" id="projects" aria-labelledby="fast-projects-title">
          <div className="fast-section-head">
            <span className="fast-kicker">Selected work</span>
            <h2 id="fast-projects-title">Projects</h2>
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
                      View code
                    </a>
                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => track('live_app_clicked', { project: project.id })}
                      >
                        Live app
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
            <h2 id="fast-about-title">Ideas into useful experiences.</h2>
          </div>
          <div>
            <p>
              I&apos;m {PROFILE.name}. I build complete web applications, from clear interfaces
              and reliable APIs to interactive 3D experiences.
            </p>
            <div className="fast-stats">
              <div><strong>{CASES.length.toString().padStart(2, '0')}</strong><span>featured builds</span></div>
              <div><strong>{new Set(CASES.flatMap((item) => item.chips)).size.toString().padStart(2, '0')}</strong><span>tools in my stack</span></div>
              <div><strong>{YOUTUBE_VIDEOS.length.toString().padStart(2, '0')}</strong><span>project videos</span></div>
            </div>
          </div>
        </section>

        <section className="fast-section fast-contact" id="contact" aria-labelledby="fast-contact-title">
          <div>
            <span className="fast-kicker">Have a project in mind?</span>
            <h2 id="fast-contact-title">Let&apos;s make something useful.</h2>
            <p>Available for collaboration, freelance projects and new opportunities.</p>
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
              Enter the 3D studio
            </button>
          )}
        </footer>
      </main>
    </div>
  );
}

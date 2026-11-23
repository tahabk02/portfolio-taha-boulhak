import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ControlDock } from './components/ControlDock';
import {
  CAMERA_PRESETS,
  CASES,
  CFG,
  FINISHES,
  PROFILE,
  YOUTUBE_VIDEOS,
  type CameraPreset,
  type ChassisFinish,
} from './data/portfolio';
import { computePose, type PortfolioMode, type PoseResult } from './lib/poseMath';
import { StudioScene } from './three/StudioScene';
import type { PortfolioScreenView } from './three/screenPainter';

interface GithubRepo {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  homepage: string | null;
  fork: boolean;
}

interface TikTokVideo {
  id: string;
  title?: string;
  video_description?: string;
  duration?: number;
  cover_image_url: string;
  share_url?: string;
  create_time?: number;
}

interface TikTokPage {
  videos: TikTokVideo[];
  has_more: boolean;
  cursor?: number;
}

export default function App() {
  const [mode, setMode] = useState<PortfolioMode>('hero');
  const [diving, setDiving] = useState(false);
  const [caseIndex, setCaseIndex] = useState(0);
  const [swapTick, setSwapTick] = useState(0);
  const [caseVisible, setCaseVisible] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tiktok') === 'connected');
  const [catalogTab, setCatalogTab] = useState<'projects' | 'repositories' | 'courses' | 'about' | 'skills' | 'contact'>(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tiktok') === 'connected' ? 'courses' : 'projects');
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState('');
  const [tiktokConfigured, setTiktokConfigured] = useState(false);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [tiktokVideos, setTiktokVideos] = useState<TikTokVideo[]>([]);
  const [tiktokLoading, setTiktokLoading] = useState(false);
  const [tiktokError, setTiktokError] = useState('');
  const [tiktokHasMore, setTiktokHasMore] = useState(false);
  const [tiktokCursor, setTiktokCursor] = useState<number | null>(null);
  const [activeTikTokVideo, setActiveTikTokVideo] = useState<TikTokVideo | null>(null);
  const [tiktokRefresh, setTiktokRefresh] = useState(0);
  const [badgeKicked, setBadgeKicked] = useState(false);

  const [preset, setPreset] = useState<CameraPreset>(CAMERA_PRESETS[0]);
  const [presetTick, setPresetTick] = useState(0);
  const [finish, setFinish] = useState<ChassisFinish>(FINISHES[0]);
  const [activeYoutubeId, setActiveYoutubeId] = useState<string | null>(null);
  const [immersivePortfolio, setImmersivePortfolio] = useState(false);
  const [portfolioPage, setPortfolioPage] = useState(0);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 640 : false
  );

  const [pose, setPose] = useState<PoseResult>(() =>
    computePose(
      'hero',
      typeof window !== 'undefined' ? window.innerWidth : 1440,
      typeof window !== 'undefined' ? window.innerHeight : 900,
      182,
      140
    )
  );

  const ticketRef = useRef<HTMLDivElement | null>(null);
  const descRef = useRef<HTMLDivElement | null>(null);
  const busyRef = useRef(false);
  const lastWheelRef = useRef(0);
  const touchStartRef = useRef<[number, number, boolean] | null>(null);
  const modeRef = useRef<PortfolioMode>(mode);
  const caseIdxRef = useRef(caseIndex);

  modeRef.current = mode;
  caseIdxRef.current = caseIndex;

  const updateLayout = useCallback((targetMode: PortfolioMode) => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const mobile = W <= 820;
    document.body.classList.toggle('mob', mobile);
    const roughN = mobile ? 1 : Math.max(0.56, Math.min(W / 1440, H / 900));
    document.documentElement.style.setProperty('--n', `${roughN}px`);

    const th = ticketRef.current?.offsetHeight || (mobile ? 124 : 182);
    const dh = descRef.current?.offsetHeight || (mobile ? 95 : 140);
    const nextPose = computePose(targetMode, W, H, th, dh);

    document.body.classList.toggle('mob', nextPose.mobile);
    document.documentElement.style.setProperty('--n', `${nextPose.n}px`);
    document.documentElement.style.setProperty('--th', `${th}px`);
    setPose(nextPose);
  }, []);

  useLayoutEffect(() => {
    updateLayout(mode);
    const onResize = () => updateLayout(modeRef.current);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [mode, caseIndex, updateLayout]);

  useLayoutEffect(() => {
    const th = ticketRef.current?.offsetHeight;
    if (th) {
      document.documentElement.style.setProperty('--th', `${th}px`);
    }
  }, [pose.mobile, mode, caseIndex]);

  useEffect(() => {
    document.body.classList.toggle('is-case', mode === 'case');
  }, [mode]);

  useEffect(() => {
    document.body.classList.toggle('busy', diving);
  }, [diving]);

  useEffect(() => {
    document.body.classList.toggle('immersive-portfolio', immersivePortfolio);
  }, [immersivePortfolio]);

  useEffect(() => {
    if (!(projectsOpen || immersivePortfolio) || catalogTab !== 'repositories' || githubRepos.length) return;
    const controller = new AbortController();
    setReposLoading(true);
    setReposError('');
    (async () => {
      try {
        const allRepos: GithubRepo[] = [];
        for (let page = 1; ; page += 1) {
          const response = await fetch(`https://api.github.com/users/tahabk02/repos?per_page=100&page=${page}&sort=updated`, {
            headers: { Accept: 'application/vnd.github+json' },
            signal: controller.signal,
          });
          if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
          const pageRepos = await response.json() as GithubRepo[];
          allRepos.push(...pageRepos);
          if (pageRepos.length < 100) break;
        }
        if (!controller.signal.aborted) setGithubRepos(allRepos);
      } catch (error) {
        if (!controller.signal.aborted) setReposError(error instanceof Error ? error.message : 'Could not load repositories.');
      } finally {
        if (!controller.signal.aborted) setReposLoading(false);
      }
    })()
    return () => controller.abort();
  }, [projectsOpen, immersivePortfolio, catalogTab, githubRepos.length]);

  useEffect(() => {
    if (!(projectsOpen || immersivePortfolio) || catalogTab !== 'courses') return;
    const existingEmbedScript = document.querySelector('script[data-tiktok-profile-embed]');
    if (existingEmbedScript) existingEmbedScript.remove();
    const embedScript = document.createElement('script');
    embedScript.src = 'https://www.tiktok.com/embed.js';
    embedScript.async = true;
    embedScript.dataset.tiktokProfileEmbed = 'true';
    if (projectsOpen) document.body.appendChild(embedScript);
    const controller = new AbortController();
    setTiktokLoading(true);
    setTiktokError('');
    fetch('/api/tiktok/status', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('The TikTok API server is unavailable. Start it with `bun run dev:tiktok-api`.');
        return response.json() as Promise<{ configured: boolean; connected: boolean }>;
      })
      .then(async (status) => {
        setTiktokConfigured(status.configured);
        setTiktokConnected(status.connected);
        if (!status.connected) {
          setTiktokVideos([]);
          setTiktokLoading(false);
          return;
        }
        const response = await fetch('/api/tiktok/videos', { signal: controller.signal });
        const page = await response.json() as TikTokPage & { error?: string };
        if (!response.ok) throw new Error(page.error || 'Could not load TikTok videos.');
        setTiktokVideos(page.videos || []);
        setTiktokHasMore(Boolean(page.has_more));
        setTiktokCursor(page.cursor ?? null);
        setTiktokLoading(false);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setTiktokError(error instanceof Error ? error.message : 'Could not load TikTok videos.');
          setTiktokLoading(false);
        }
      });
    return () => {
      controller.abort();
      embedScript.remove();
    };
  }, [projectsOpen, immersivePortfolio, catalogTab, tiktokRefresh]);

  const toCase = useCallback(() => {
    if (busyRef.current || modeRef.current === 'case') return;
    busyRef.current = true;
    setDiving(true);
    setMode('case');
    updateLayout('case');

    setTimeout(() => {
      setCaseVisible(true);
      setDiving(false);
      busyRef.current = false;
    }, 420);
  }, [updateLayout]);

  const enter3DView = useCallback((view: PortfolioScreenView) => {
    setCatalogTab(view);
    setPortfolioPage(0);
    setProjectsOpen(false);
    setImmersivePortfolio(true);
    if (modeRef.current !== 'case') toCase();
  }, [toCase]);

  const toHero = useCallback(() => {
    if (busyRef.current || modeRef.current === 'hero') return;
    busyRef.current = true;
    setCaseVisible(false);
    setDiving(false);
    setImmersivePortfolio(false);

    setTimeout(() => {
      setMode('hero');
      setActiveYoutubeId(null);
      updateLayout('hero');
      setTimeout(() => {
        busyRef.current = false;
      }, 450);
    }, 260);
  }, [updateLayout]);

  const swapTo = useCallback((nextIdx: number) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setCaseVisible(false);

    setTimeout(() => {
      setCaseIndex(nextIdx);
      setActiveYoutubeId((prev) => (prev ? CASES[nextIdx].youtubeId ?? null : null));
      setSwapTick((t) => t + 1);
      setCaseVisible(true);
      setTimeout(() => {
        busyRef.current = false;
      }, 360);
    }, 240);
  }, []);

  const nextCase = useCallback(() => {
    if (modeRef.current !== 'case') return;
    swapTo((caseIdxRef.current + 1) % CASES.length);
  }, [swapTo]);

  const prevCase = useCallback(() => {
    if (modeRef.current !== 'case') return;
    if (caseIdxRef.current === 0) {
      toHero();
    } else {
      swapTo(caseIdxRef.current - 1);
    }
  }, [swapTo, toHero]);

  // Global Wheel, Touch, and Keyboard navigation (never scrolls page)
  useEffect(() => {
    const fwd = () => {
      if (modeRef.current === 'hero') toCase();
      else if (immersivePortfolio) setPortfolioPage((page) => page + 1);
      else nextCase();
    };
    const back = () => {
      if (modeRef.current !== 'case') return;
      if (immersivePortfolio) setPortfolioPage((page) => Math.max(0, page - 1));
      else prevCase();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (document.body.classList.contains('room-walking')) return;
      if (busyRef.current || Math.abs(e.deltaY) < 18 || Date.now() - lastWheelRef.current < 750) {
        return;
      }
      lastWheelRef.current = Date.now();
      if (e.deltaY > 0) fwd();
      else back();
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const target = e.target as HTMLElement | null;
      const insideCanvas = Boolean(target?.closest('.three-canvas-host, .room-game-ui'));
      touchStartRef.current = [e.touches[0].clientX, e.touches[0].clientY, insideCanvas];
    };

    const onTouchEnd = (e: TouchEvent) => {
      const ts = touchStartRef.current;
      touchStartRef.current = null;
      if (!ts || busyRef.current) return;
      // Allow OrbitControls touch dragging directly on the 3D viewport in case mode
      if (modeRef.current === 'case' && ts[2]) return;

      const dx = e.changedTouches[0].clientX - ts[0];
      const dy = e.changedTouches[0].clientY - ts[1];
      if (Math.abs(dy) >= Math.abs(dx)) {
        if (dy < -40) fwd();
        else if (dy > 40) back();
      } else if (modeRef.current === 'case') {
        if (immersivePortfolio) {
          if (Math.abs(dx) > 40) setPortfolioPage((page) => Math.max(0, page + (dx < 0 ? 1 : -1)));
        } else if (dx < -40) nextCase();
        else if (dx > 40) prevCase();
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (modeRef.current === 'case' && target?.closest('.three-canvas-host')) {
        return;
      }
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContactOpen(false);
        if (immersivePortfolio) toHero();
        return;
      }
      if ((e.key === 'h' || e.key === 'H') && modeRef.current === 'case') {
        setDockCollapsed((prev) => !prev);
        return;
      }
      if (busyRef.current) return;
      if (['ArrowDown', 'PageDown', ' ', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        fwd();
      } else if (['ArrowUp', 'PageUp', 'ArrowLeft'].includes(e.key)) {
        e.preventDefault();
        back();
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [nextCase, prevCase, toCase, immersivePortfolio, toHero]);

  const activeCase = CASES[caseIndex];
  const heroLayout = pose.heroLayout;

  return (
    <>
      <div className={`stage ${pose.mobile ? 'mob' : ''} ${mode === 'case' ? 'm-case' : ''}`}>
        {/* 3D Interactive Studio Case Stage */}
        <div className={`studio-layer ${mode === 'case' ? 'is-visible' : ''}`}>
          <StudioScene
            active={mode === 'case'}
            caseStudy={activeCase}
            finish={finish}
            preset={preset}
            presetTick={presetTick}
            swapTick={swapTick}
            youtubeVideoId={activeYoutubeId}
            portfolioView={immersivePortfolio ? catalogTab : null}
            portfolioPage={portfolioPage}
            repositories={githubRepos}
            courses={tiktokVideos}
            onCloseYoutube={() => setActiveYoutubeId(null)}
            onGameInteract={() => enter3DView('projects')}
            onScreenClick={() => immersivePortfolio ? setPortfolioPage((page) => page + 1) : nextCase()}
          />
        </div>

        {/* Hero 1440x810 Frame */}
        <div
          className={`frame ${pose.mobile ? 'mob' : ''} ${diving ? 'is-diving' : ''} ${
            mode === 'case' && !diving ? 'is-hidden' : ''
          }`}
          style={{
            transform: `translate(${pose.x}px, ${pose.y}px) scale(${pose.s})`,
          }}
        >
          <img className="plate" src={CFG.plate} alt={PROFILE.name} />

          <svg
            className="wm"
            viewBox="0 0 1440 260"
            preserveAspectRatio="none"
            style={
              heroLayout
                ? { left: `${heroLayout.wmLeft}px`, width: `${heroLayout.wmWidth}px` }
                : undefined
            }
          >
            <defs>
              <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#0f5a3e" />
                <stop offset="0.5" stopColor="#14674a" stopOpacity="0.92" />
                <stop offset="1" stopColor="#1a7a58" stopOpacity="0.25" />
              </linearGradient>
            </defs>
            <text
              x="14"
              y="214"
              textLength="1412"
              lengthAdjust="spacingAndGlyphs"
              fill="url(#wg)"
            >
              {PROFILE.wordmark}
            </text>
          </svg>

          <img className="cut" src={CFG.cut} alt="" />

          {/* Hanging Lanyard Developer Card */}
          <div
            className={`badge ${badgeKicked ? 'is-kicked' : ''}`}
            style={
              heroLayout
                ? { left: `${heroLayout.badgeLeft}px`, top: `${heroLayout.badgeTop}px` }
                : undefined
            }
          >
            <svg viewBox="0 0 582 1030" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="sv" x1="0" x2="1">
                  <stop offset="0" stopColor="#e6ebe9" />
                  <stop offset="1" stopColor="#9aa5a0" />
                </linearGradient>
              </defs>
              <path
                d="M262 -1600h52l-12 2050h-28z"
                fill="#f4f4f2"
                stroke="rgba(0,0,0,.12)"
              />
              <rect
                x="270"
                y="440"
                width="36"
                height="58"
                rx="8"
                fill="url(#sv)"
                stroke="#7d8883"
              />
              <circle cx="288" cy="470" r="7" fill="#5f6a65" />
              <rect
                x="152"
                y="498"
                width="278"
                height="452"
                rx="20"
                fill="rgba(255,255,255,.4)"
                stroke="rgba(0,0,0,.25)"
                strokeWidth="3"
              />
              <rect x="164" y="520" width="254" height="410" rx="10" fill="#fff" />
            </svg>
            <div className="card">
              <h4>
                DEVELOPER
                <br />
                CARD
              </h4>
              <div className="yr">2026</div>
              <div className="role">FULL STACK // DEVELOPER</div>
              <div
                className="ph"
                style={{ backgroundImage: `url(${CFG.plate})` }}
              />
              <div className="row">
                <span>NAME</span>
                <b>T. BOULHAK</b>
              </div>
              <div className="row">
                <span>FOCUS</span>
                <b>MERN + REACT</b>
              </div>
              <div className="row">
                <span>GH</span>
                <b>@TAHABK02</b>
              </div>
              <div className="row">
                <span>EMAIL</span>
                <b style={{ fontSize: '7.5px' }}>TAHABOULHAK202@GMAIL.COM</b>
              </div>
            </div>
            <div
              className="hit"
              onPointerEnter={() => {
                if (mode === 'hero') {
                  setBadgeKicked(false);
                  requestAnimationFrame(() => setBadgeKicked(true));
                }
              }}
              onAnimationEnd={() => setBadgeKicked(false)}
            />
          </div>

          <div
            className="script"
            style={
              heroLayout
                ? {
                    left: `${heroLayout.scriptLeft}px`,
                    fontSize: `${heroLayout.scriptFontSize}px`,
                  }
                : undefined
            }
          >
            {PROFILE.script}
          </div>
        </div>
      </div>

      {/* Fixed UI Layer */}
      <div className={`ui ${pose.mobile ? 'mob' : ''}`}>
        <button type="button" className="tag t1" id="b1" onClick={toHero}>
          home
        </button>
        <button type="button" className="tag t2" id="b2" onClick={() => enter3DView('projects')}>
          projects
        </button>
        <a
          className="tag t3"
          id="b3"
          href="#contact"
          onClick={(e) => {
            e.preventDefault();
            enter3DView('contact');
          }}
        >
          contact
        </a>
        <button type="button" className="tag all-projects-tag" onClick={() => enter3DView('projects')}>
          all projects
        </button>
        <button type="button" className="tag about-tag" onClick={() => enter3DView('about')}>
          about
        </button>
        <a className="tag t4" href={`mailto:${PROFILE.email}`}>
          hire me
        </a>

        <button type="button" className="logo" id="lg2" onClick={toHero}>
          {PROFILE.wordmark}
        </button>

        {immersivePortfolio && mode === 'case' && <nav className="immersive-nav" aria-label="3D portfolio sections">
          <span className="immersive-nav-label">3D PORTFOLIO</span>
          {(['projects', 'repositories', 'courses', 'about', 'skills', 'contact'] as PortfolioScreenView[]).map((view) => <button type="button" key={view} className={catalogTab === view ? 'is-active' : ''} onClick={() => enter3DView(view)}>{view === 'repositories' ? 'Repos' : view === 'courses' ? 'Courses' : view}</button>)}
          <span className="immersive-nav-divider" />
          <button type="button" aria-label="Previous 3D screen page" onClick={() => setPortfolioPage((page) => Math.max(0, page - 1))}>←</button>
          <button type="button" aria-label="Next 3D screen page" onClick={() => setPortfolioPage((page) => page + 1)}>→</button>
        </nav>}

        <div className="hint" id="hn">
          <span>scroll into the work</span>
          <i />
        </div>

        <div
          ref={ticketRef}
          className={`ticket ${mode === 'case' && caseVisible ? 'is-in' : ''}`}
          id="tk"
        >
          <i />
          <i />
          <i />
          <i />
          <h2 id="tt">{activeCase.title}</h2>
          <div className="rows" id="tr">
            {activeCase.rows.map((row) => (
              <div key={row}>{row}</div>
            ))}
          </div>
        </div>

        <div
          ref={descRef}
          className={`desc ${mode === 'case' && caseVisible ? 'is-in' : ''}`}
          id="ds"
        >
          <div className="k" id="dk">
            {activeCase.key}
          </div>
          <p id="dp">{activeCase.text}</p>
          <div className="num" id="dn">
            0{caseIndex + 1} / 0{CASES.length}
          </div>
          <div className="desc-links">
            <a id="dl" href={activeCase.repo} target="_blank" rel="noopener noreferrer">
              view code →
            </a>
            {activeCase.liveUrl && (
              <a href={activeCase.liveUrl} target="_blank" rel="noopener noreferrer">
                live app ↗
              </a>
            )}
            {activeCase.youtubeId && (
              <button
                type="button"
                className="desc-yt-trigger"
                onClick={() =>
                  setActiveYoutubeId((cur) =>
                    cur === activeCase.youtubeId ? null : activeCase.youtubeId ?? null
                  )
                }
              >
                {activeYoutubeId === activeCase.youtubeId ? 'photo preview' : '▶ watch 3D video'}
              </button>
            )}
            <a href={PROFILE.repositoriesUrl} target="_blank" rel="noopener noreferrer">
              all repos ↗
            </a>
          </div>
        </div>

        <button
          type="button"
          className={`nc prev ${caseIndex === 0 ? 'dim' : ''}`}
          id="pv"
          onClick={prevCase}
        >
          <div className="c">
            <svg viewBox="0 0 24 24">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
          </div>
          <span>
            previous <br />
            case
          </span>
        </button>

        <button type="button" className="nc next" id="nx" onClick={nextCase}>
          <div className="c">
            <svg viewBox="0 0 24 24">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>
          <span>
            next <br />
            case
          </span>
        </button>

        <ControlDock
          visible={mode === 'case'}
          collapsed={dockCollapsed}
          onToggleCollapse={() => setDockCollapsed((c) => !c)}
          activePreset={preset}
          onSelectPreset={(p) => {
            setPreset(p);
            setPresetTick((t) => t + 1);
          }}
          activeFinish={finish}
          onSelectFinish={setFinish}
          activeYoutubeId={activeYoutubeId}
          onSelectYoutube={(vidId) => {
            setActiveYoutubeId(vidId);
            if (vidId) {
              const matchingIdx = CASES.findIndex((c) => c.youtubeId === vidId);
              if (matchingIdx >= 0 && matchingIdx !== caseIndex) {
                setCaseIndex(matchingIdx);
                setSwapTick((t) => t + 1);
              }
            }
          }}
        />
      </div>

      {/* Contact Overlay */}
      <div className={`projects-overlay ${projectsOpen ? 'on' : ''}`} id="projects-overlay" onClick={(e) => {
        if ((e.target as HTMLElement).id === 'projects-overlay') setProjectsOpen(false);
      }}>
        <section className="projects-panel" aria-label="Project catalogue">
          <div className="projects-heading">
            <div><span className="projects-eyebrow">PORTFOLIO / {catalogTab.toUpperCase()}</span><h2>{{ projects: 'Project archive', repositories: 'All repositories', courses: 'Courses & videos', about: 'About me', skills: 'Skills & tools', contact: 'Get in touch' }[catalogTab]}</h2></div>
            <button type="button" className="ov-close" aria-label="Close project archive" onClick={() => setProjectsOpen(false)}>×</button>
          </div>
          <nav className="catalog-tabs" aria-label="Portfolio sections">
            <button type="button" className={catalogTab === 'projects' ? 'is-active' : ''} onClick={() => setCatalogTab('projects')}>Projects ({CASES.length})</button>
            <button type="button" className={catalogTab === 'repositories' ? 'is-active' : ''} onClick={() => setCatalogTab('repositories')}>GitHub repositories</button>
            <button type="button" className={catalogTab === 'courses' ? 'is-active' : ''} onClick={() => setCatalogTab('courses')}>Courses & videos</button>
            <button type="button" className={catalogTab === 'about' ? 'is-active' : ''} onClick={() => setCatalogTab('about')}>About</button>
            <button type="button" className={catalogTab === 'skills' ? 'is-active' : ''} onClick={() => setCatalogTab('skills')}>Skills</button>
            <button type="button" className={catalogTab === 'contact' ? 'is-active' : ''} onClick={() => setCatalogTab('contact')}>Contact</button>
          </nav>
          {catalogTab === 'projects' && <>
          <div className="projects-table-wrap">
            <table className="projects-table">
              <thead><tr><th>Project</th><th>Details</th><th>Stack</th><th>Links</th></tr></thead>
              <tbody>{CASES.map((project, index) => (
                <tr key={project.id}>
                  <td><button className="project-name-cell" type="button" onClick={() => { setProjectsOpen(false); if (modeRef.current !== 'case') { setCaseIndex(index); toCase(); } else swapTo(index); }}><img src={project.photo} alt={`${project.title} project preview`} /><span>{project.title}<small>{project.rows[1]}</small></span></button></td>
                  <td className="project-summary">{project.text.replace(/^—\s*/, '')}</td>
                  <td><div className="project-chips">{project.chips.map((chip) => <span key={chip}>{chip}</span>)}</div></td>
                  <td><div className="project-actions"><a href={project.repo} target="_blank" rel="noopener noreferrer">Repository ↗</a>{project.liveUrl && <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">Live demo ↗</a>}{project.youtubeId && <a href={`https://www.youtube.com/watch?v=${project.youtubeId}`} target="_blank" rel="noopener noreferrer">Project video ▶</a>}</div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          </>}
          {catalogTab === 'repositories' && <>
            {reposLoading && <p className="catalog-state">Loading public repositories from GitHub…</p>}
            {reposError && <p className="catalog-state">{reposError} <a href={PROFILE.repositoriesUrl} target="_blank" rel="noopener noreferrer">Open GitHub repositories ↗</a></p>}
            {!reposLoading && !reposError && githubRepos.length > 0 && <div className="projects-table-wrap"><table className="projects-table repo-table"><thead><tr><th>Repository</th><th>Description</th><th>Language</th><th>Stars / Forks</th><th>Updated</th><th>Links</th></tr></thead><tbody>{githubRepos.map((repo) => <tr key={repo.html_url}><td><a className="repo-title" href={repo.html_url} target="_blank" rel="noopener noreferrer">{repo.name} ↗</a>{repo.fork && <small className="fork-label"> fork</small>}</td><td className="project-summary">{repo.description || 'No description provided.'}</td><td>{repo.language || '—'}</td><td>{repo.stargazers_count} ★ / {repo.forks_count} ⑂</td><td>{new Date(repo.updated_at).toLocaleDateString()}</td><td className="project-actions"><a href={repo.html_url} target="_blank" rel="noopener noreferrer">Source ↗</a>{repo.homepage && <a href={repo.homepage} target="_blank" rel="noopener noreferrer">Live ↗</a>}</td></tr>)}</tbody></table></div>}
            {!reposLoading && !reposError && githubRepos.length === 0 && <p className="catalog-state">No public repositories were returned.</p>}
            <footer className="projects-footer"><span>All public repositories, including forks · loaded live from GitHub</span><a href={PROFILE.repositoriesUrl} target="_blank" rel="noopener noreferrer">Open GitHub ↗</a></footer>
          </>}
          {catalogTab === 'courses' && <div className="courses-panel">
            <p>Photos de couverture et vidéos de cours publiées sur TikTok.</p>
            <h3>Mes cours sur TikTok</h3>
            <blockquote className="tiktok-embed tiktok-profile-embed" cite="https://www.tiktok.com/@tahaboulhak" data-unique-id="tahaboulhak" data-embed-type="creator" style={{ maxWidth: '780px', minWidth: '288px' }}><section><a target="_blank" rel="noreferrer" href="https://www.tiktok.com/@tahaboulhak">@tahaboulhak sur TikTok</a></section></blockquote>
            {!tiktokConnected && <div className="tiktok-connect-card">
              <strong>{tiktokConfigured ? 'Connecte ton compte TikTok pour afficher automatiquement tes publications.' : 'Configure les identifiants TikTok côté serveur pour activer les vidéos.'}</strong>
              {tiktokConfigured && <a className="tiktok-connect-button" href="/api/tiktok/auth">Connecter TikTok et autoriser l’accès aux vidéos</a>}
              <a href="https://www.tiktok.com/@tahaboulhak" target="_blank" rel="noopener noreferrer">Ouvrir le profil TikTok ↗</a>
            </div>}
            {tiktokError && <div className="catalog-state tiktok-error">{tiktokError}{tiktokConnected && <a href="/api/tiktok/auth">Reconnecter TikTok ↗</a>}</div>}
            {tiktokLoading && <p className="catalog-state">Chargement des vidéos TikTok…</p>}
            {activeTikTokVideo && <div className="tiktok-player" onClick={() => setActiveTikTokVideo(null)}>
              <div className="tiktok-player-card" onClick={(event) => event.stopPropagation()}>
                <button type="button" className="tiktok-player-close" onClick={() => setActiveTikTokVideo(null)} aria-label="Fermer la vidéo">×</button>
                <iframe title={activeTikTokVideo.title || activeTikTokVideo.video_description || 'TikTok course video'} src={`https://www.tiktok.com/player/v1/${activeTikTokVideo.id}?controls=1&description=1`} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen />
              </div>
            </div>}
            {tiktokConnected && tiktokVideos.length > 0 && <div className="video-gallery tiktok-gallery">{tiktokVideos.map((video) => <article className="video-card tiktok-video-card" key={video.id}>
              <button type="button" className="tiktok-thumb" onClick={() => setActiveTikTokVideo(video)}><img src={video.cover_image_url} alt={video.title || video.video_description || 'TikTok course video cover'} /><span>▶ Regarder</span></button>
              <strong>{video.title || video.video_description || 'Cours vidéo'}</strong>
              {video.create_time && <small>{new Date(video.create_time * 1000).toLocaleDateString('fr-FR')}</small>}
              {video.share_url && <a href={video.share_url} target="_blank" rel="noopener noreferrer">Voir sur TikTok ↗</a>}
            </article>)}</div>}
            {tiktokConnected && tiktokVideos.length === 0 && !tiktokLoading && !tiktokError && <p className="catalog-state">Aucune vidéo publique trouvée sur ce compte TikTok.</p>}
            {tiktokConnected && tiktokHasMore && <button type="button" className="tiktok-load-more" disabled={tiktokLoading} onClick={async () => {
              if (tiktokCursor === null) return;
              setTiktokLoading(true);
              try {
                const response = await fetch(`/api/tiktok/videos?cursor=${encodeURIComponent(String(tiktokCursor))}`);
                const page = await response.json() as TikTokPage & { error?: string };
                if (!response.ok) throw new Error(page.error || 'Impossible de charger plus de vidéos.');
                setTiktokVideos((videos) => [...videos, ...(page.videos || [])]);
                setTiktokHasMore(Boolean(page.has_more));
                setTiktokCursor(page.cursor ?? null);
                setTiktokError('');
              } catch (error) {
                setTiktokError(error instanceof Error ? error.message : 'Impossible de charger plus de vidéos.');
              } finally { setTiktokLoading(false); }
            }}>{tiktokLoading ? 'Chargement…' : 'Charger les vidéos suivantes'}</button>}
            <h3>Project walkthroughs</h3>
            <div className="video-gallery">{YOUTUBE_VIDEOS.map((video) => <a href={video.url} target="_blank" rel="noopener noreferrer" key={video.id} className="video-card"><img src={video.thumb} alt={`${video.title} video thumbnail`} /><span>▶ Watch video</span><strong>{video.title}</strong></a>)}</div>
            <footer className="projects-footer"><a href="https://www.tiktok.com/@tahaboulhak" target="_blank" rel="noopener noreferrer">Open TikTok profile ↗</a><a href={PROFILE.youtube} target="_blank" rel="noopener noreferrer">More videos on YouTube ↗</a></footer>
          </div>}
          {catalogTab === 'about' && <div className="about-section">
            <section className="about-hero">
              <div className="about-copy">
                <span className="about-kicker">FULL STACK DEVELOPER · MOROCCO</span>
                <h3>Ideas into<br /><em>useful experiences.</em></h3>
                <p>I’m {PROFILE.name}. I build complete web applications, from clear interfaces and reliable APIs to interactive 3D experiences.</p>
                <a className="about-cta" href={`mailto:${PROFILE.email}`}>Let’s work together <span>↗</span></a>
              </div>
              <div className="about-visual"><img src={CFG.cut} alt="Portrait of Taha Boulhak" /><span className="about-stamp">DESIGN<br />·<br />CODE</span><span className="about-visual-caption">TAHA BOULHAK / 2026</span></div>
            </section>
            <section className="about-stats" aria-label="Portfolio numbers">
              <div><strong>{CASES.length.toString().padStart(2, '0')}</strong><span>featured builds</span></div>
              <div><strong>{new Set(CASES.flatMap((item) => item.chips)).size.toString().padStart(2, '0')}</strong><span>tools in my stack</span></div>
              <div><strong>{YOUTUBE_VIDEOS.length.toString().padStart(2, '0')}</strong><span>project videos</span></div>
            </section>
            <section className="about-focus">
              <div><span className="section-index">01 / WHAT I DO</span><h4>Thoughtful software,<br />built end to end.</h4></div>
              <div className="focus-cards">
                <article><span>01</span><h5>Web applications</h5><p>Frontend and backend work for useful, data-driven products.</p></article>
                <article><span>02</span><h5>Interactive interfaces</h5><p>Dashboards, learning tools, and responsive user experiences.</p></article>
                <article><span>03</span><h5>Experiments in 3D</h5><p>Three.js scenes that make technical ideas easier to explore.</p></article>
              </div>
            </section>
          </div>}
          {catalogTab === 'skills' && <section className="skills-section">
            <div className="skills-intro"><span className="about-kicker">TOOLS I BUILD WITH</span><h3>A practical, growing toolkit.</h3><p>Technologies represented across the projects in this portfolio.</p></div>
            <div className="projects-table-wrap"><table className="projects-table skills-table"><thead><tr><th>Area</th><th>Technologies</th><th>Used in</th></tr></thead><tbody>
              <tr><td>Frontend</td><td><div className="project-chips">{['React', 'TypeScript', 'JavaScript', 'Tailwind CSS'].map((x) => <span key={x}>{x}</span>)}</div></td><td>SmartLabo, Nucleus 2BAC, AI Trading</td></tr>
              <tr><td>Backend</td><td><div className="project-chips">{['Node.js', 'Express', 'Python', 'Flask', 'FastAPI'].map((x) => <span key={x}>{x}</span>)}</div></td><td>MediSaaS, Task Manager, AI Trading</td></tr>
              <tr><td>Data</td><td><div className="project-chips">{['MongoDB', 'SQLite'].map((x) => <span key={x}>{x}</span>)}</div></td><td>SmartLabo, MediSaaS, Task Manager</td></tr>
              <tr><td>Interactive</td><td><div className="project-chips">{['Three.js', 'WebGL'].map((x) => <span key={x}>{x}</span>)}</div></td><td>Nucleus 2BAC, 3D portfolio</td></tr>
              <tr><td>Integrations</td><td><div className="project-chips">{['Stripe', 'XGBoost', 'AI analysis'].map((x) => <span key={x}>{x}</span>)}</div></td><td>Zinara, AI Trading, SmartLabo</td></tr>
            </tbody></table></div>
            <a className="about-cta skills-cta" href="#projects" onClick={(event) => { event.preventDefault(); setCatalogTab('projects'); }}>Explore the work <span>↗</span></a>
          </section>}
          {catalogTab === 'contact' && <section className="contact-section">
            <div className="contact-main"><span className="about-kicker">HAVE A PROJECT IN MIND?</span><h3>Let’s make<br /><em>something useful.</em></h3><p>Available for collaboration, freelance projects, and new opportunities.</p><a className="contact-email" href={`mailto:${PROFILE.email}`}>{PROFILE.email} <span>↗</span></a></div>
            <div className="contact-links"><a href={PROFILE.github} target="_blank" rel="noopener noreferrer"><span>GitHub</span><b>@tahabk02 ↗</b></a><a href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer"><span>LinkedIn</span><b>Connect ↗</b></a><a href="https://www.tiktok.com/@tahaboulhak" target="_blank" rel="noopener noreferrer"><span>TikTok</span><b>Courses & videos ↗</b></a><a href={PROFILE.youtube} target="_blank" rel="noopener noreferrer"><span>YouTube</span><b>Project walkthroughs ↗</b></a></div>
          </section>}
        </section>
      </div>

      {/* Contact Overlay */}
      <div
        className={`ov ${contactOpen ? 'on' : ''}`}
        id="ov"
        onClick={(e) => {
          if ((e.target as HTMLElement).id === 'ov') setContactOpen(false);
        }}
      >
        <div className="ov-card">
          <button
            type="button"
            className="ov-close"
            aria-label="Close contact dialog"
            onClick={() => setContactOpen(false)}
          >
            ×
          </button>
          <h5>contact</h5>
          <a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
          <a href={PROFILE.github} target="_blank" rel="noopener noreferrer">
            GitHub · tahabk02
          </a>
          <a href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer">
            LinkedIn · Taha Boulhak
          </a>
          <a href={PROFILE.instagram} target="_blank" rel="noopener noreferrer">
            Instagram · taha_bk01
          </a>
          <a href={PROFILE.youtube} target="_blank" rel="noopener noreferrer">
            YouTube · @tahaboulhak1172
          </a>
        </div>
      </div>
    </>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Plus, KeyRound, ArrowRight, X, Users, Shapes, FileDown,
  Clock, MessageCircle, Zap, Sparkles, Shield, Layers,
  Pencil, Type, StickyNote, Image, Share2, Smile,
  Copy, Check, ExternalLink, Trash2, MoreHorizontal,
  Star, Search, LayoutTemplate, Code, CheckCircle2,
  Terminal, Lock, Compass, Cpu, Rocket,
} from 'lucide-react';
import { startNewBoard, goToRoom, goToAccount, goToMessages, normalizeCode } from '../../utils/nav';
import { roomCode } from '../../utils/ids';
import { getRecentBoards, forgetBoard, rememberBoard } from '../../utils/recentBoards';
import { getBoardTheme } from '../../utils/boardTheme';
import Avatar from '../Avatar';
import BoardPreview from './BoardPreview';
import NotificationBell from '../Notifications/NotificationBell';
import CreateRoomModal from './CreateRoomModal';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import styles from './Home.module.css';

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return day === 1 ? 'yesterday' : `${day}d ago`;
}

// Derive a consistent color from the board code for visual variety
function boardColor(code) {
  const COLORS = [
    'linear-gradient(135deg, #3b82f6, #6366f1)',
    'linear-gradient(135deg, #8b5cf6, #a855f7)',
    'linear-gradient(135deg, #ec4899, #f43f5e)',
    'linear-gradient(135deg, #f59e0b, #ef4444)',
    'linear-gradient(135deg, #10b981, #06b6d4)',
    'linear-gradient(135deg, #6366f1, #ec4899)',
    'linear-gradient(135deg, #14b8a6, #3b82f6)',
    'linear-gradient(135deg, #f97316, #eab308)',
  ];
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

const TEMPLATES = [
  {
    slug: 'retrospective',
    name: 'Agile Sprint Retrospective',
    tag: 'Sprint · Teams',
    icon: Rocket,
    gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    desc: 'What went well, what can be improved, and action items with categorized sticky note columns.',
  },
  {
    slug: 'architecture',
    name: 'System Architecture Flowchart',
    tag: 'Engineering · Diagrams',
    icon: Cpu,
    gradient: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
    desc: 'Microservices, databases, API gateways, and cloud architecture wiring ready for discussion.',
  },
  {
    slug: 'wireframe',
    name: 'UI Wireframe & Design Critique',
    tag: 'Product · UX',
    icon: LayoutTemplate,
    gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)',
    desc: 'Mobile and desktop device frames with annotation tools for rapid wireframing and feedback.',
  },
  {
    slug: 'codereview',
    name: 'Real-Time Algorithm Review',
    tag: 'Code · Compiler',
    icon: Code,
    gradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
    desc: 'Collaborative code editor session with real-time execution across JavaScript, Python, and C++.',
  },
  {
    slug: 'brainstorm',
    name: 'Brainstorming & Ideas Matrix',
    tag: 'Strategy · Ideas',
    icon: Sparkles,
    gradient: 'linear-gradient(135deg, #f59e0b, #f97316)',
    desc: 'Infinite grid of vibrant sticky notes and clustering frames for high-velocity team ideation.',
  },
  {
    slug: 'blank',
    name: 'Blank Infinite Canvas',
    tag: 'Freehand · Clean',
    icon: Layers,
    gradient: 'linear-gradient(135deg, #6366f1, #3b82f6)',
    desc: 'An unbounded canvas with all 8+ professional drawing, text, shape, and image tools.',
  },
];

const SHOWCASE_TABS = [
  {
    id: 'sync',
    label: '⚡ Zero-Latency Cursors & Presence',
    title: 'Live multi-cursor engine with sub-15ms sync.',
    body: 'Every mouse movement, drawing stroke, and sticky note drag glides across all connected devices in real time using our optimized dual-transport WebSocket relay engine.',
    badge: '100% Real-Time Synchronized',
    codeSnippet: `// Instant peer cursor & object sync across all devices
socket.on('rt', ({ event, payload, sender }) => {
  if (event === 'room:cursor') updatePeerCursor(sender, payload);
  if (event === 'object:add') canvas.addRemoteObject(payload.json);
});`,
  },
  {
    id: 'code',
    label: '💻 Collaborative Live Compiler',
    title: 'Run real code together without leaving the board.',
    body: 'Switch from visual diagramming to live programming instantly. Write JavaScript, Python, C++, or Java collaboratively with real-time keystroke sync and terminal execution output.',
    badge: 'Multi-Language Runtime Included',
    codeSnippet: `// Collaborative real-time coding session
function solveNQueens(n) {
  const solutions = [];
  // Teammates can type, test & run algorithms live right here
  return solutions;
}
console.log("⚡ Executed cleanly across room nodes!");`,
  },
  {
    id: 'canvas',
    label: '🎨 Infinite Canvas & Smart Tools',
    title: 'Pressure-sensitive brushes, sticky notes & precision shapes.',
    body: 'Sketch freely with smooth bezier paths, drop color-coded sticky notes, insert structured shapes, and drag-and-drop screenshots directly from your clipboard onto the board.',
    badge: '8+ Professional Workspace Tools',
    codeSnippet: `// High-precision Fabric.js infinite viewport transform
canvas.zoomToPoint({ x: pointer.x, y: pointer.y }, nextZoom);
note.set({ left, top, id: uid('sticky'), pageId: currentPage });
canvas.renderAll();`,
  },
  {
    id: 'security',
    label: '🛡️ Admin-Protected Private Rooms',
    title: 'Lock rooms down with enterprise-grade room passwords.',
    body: 'Set a custom room name and require an admin password before anyone can join or view your whiteboard. No complicated sign-up or invite emails required.',
    badge: 'Zero-Knowledge Password Shield',
    codeSnippet: `// Room Security Enforcement
if (roomSettings.hasPassword && !verifyRoomToken(password)) {
  return { ok: false, error: 'PASSWORD_REQUIRED' };
}
socket.join(roomId); // Access granted to encrypted workspace`,
  },
];

const FEATURES = [
  {
    icon: Users,
    title: 'Real-time collaboration',
    body: 'See teammates draw, type, and move objects live — with presence avatars, cursors, and group chat.',
    gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
  },
  {
    icon: Pencil,
    title: 'Freehand drawing',
    body: 'Sketch freely with pressure-sensitive brushes, adjustable colors, and a precision eraser tool.',
    gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
  },
  {
    icon: StickyNote,
    title: 'Sticky notes & text',
    body: 'Drop colorful sticky notes, add rich text boxes, and organize ideas visually on the infinite canvas.',
    gradient: 'linear-gradient(135deg, #f59e0b, #f97316)',
  },
  {
    icon: Shapes,
    title: 'Shapes & connectors',
    body: 'Rectangles, circles, arrows, and lines — everything for diagrams, wireframes, and flowcharts.',
    gradient: 'linear-gradient(135deg, #10b981, #34d399)',
  },
  {
    icon: Image,
    title: 'Drag-and-drop images',
    body: 'Drop photos and screenshots right onto the canvas. Resize, rotate, and layer them freely.',
    gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
  },
  {
    icon: FileDown,
    title: 'Export to PDF & PNG',
    body: 'Download the full board or the entire chat transcript. One click, multiple formats, instant.',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  },
  {
    icon: Shield,
    title: 'Private rooms',
    body: 'Set an admin password to lock rooms down. You decide who enters — no sign-up required.',
    gradient: 'linear-gradient(135deg, #ef4444, #f59e0b)',
  },
  {
    icon: Smile,
    title: 'Live reactions',
    body: 'Send floating emoji reactions that burst across the board — a fun way to engage in real time.',
    gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)',
  },
];

const STATS = [
  { value: '∞', label: 'Canvas size' },
  { value: '<15ms', label: 'Sync latency' },
  { value: '100%', label: 'Free forever' },
  { value: '8+', label: 'Workspace tools' },
];

const USE_CASES = [
  {
    title: 'For Product Managers & Designers',
    desc: 'Map out user journeys, conduct live UI wireframe critiques, and organize sprint product roadmaps collaboratively.',
    items: ['Rapid User Story Mapping', 'Interactive Wireframe Annotations', 'Multi-Page Presentation Exports'],
    gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)',
  },
  {
    title: 'For Software Engineers & Architects',
    desc: 'Sketch microservice system architectures, debug algorithms live in the integrated code runner, and review ERD schemas.',
    items: ['Live Collaborative Compiler (JS/Python/C++)', 'System Architecture & Data Flow Diagrams', 'Instant Markdown & Code Snippet Sharing'],
    gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)',
  },
  {
    title: 'For Agile Scrum Masters & Teams',
    desc: 'Run engaging daily standup check-ins, sprint retrospectives with voting sticky notes, and brainstorming matrices.',
    items: ['Time-Boxed Sprint Retrospectives', 'Live Emoji Reactions & Group Chat', 'Zero-Install One-Click Invite Links'],
    gradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
  },
];

export default function Home() {
  const user = useSelector((s) => s.session.currentUser);
  const [code, setCode] = useState('');
  const [recent, setRecent] = useState(() => getRecentBoards());
  const [starredCodes, setStarredCodes] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('boardroom:starred_codes'));
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [searchFilter, setSearchFilter] = useState('');
  const [recentTab, setRecentTab] = useState('all'); // 'all' | 'starred'
  const [activeShowcase, setActiveShowcase] = useState(SHOWCASE_TABS[0]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);

  const clean = normalizeCode(code);

  useEffect(() => {
    const id = requestAnimationFrame(() => setHeroVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Close any open context menu when clicking elsewhere
  useEffect(() => {
    if (openMenu === null) return;
    const close = () => setOpenMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [openMenu]);

  const join = () => {
    if (clean) goToRoom(clean);
  };

  const launchTemplate = (templateSlug, templateName) => {
    const newCode = `${roomCode()}-${templateSlug}`;
    rememberBoard(newCode, `${templateName} Board`);
    goToRoom(newCode);
  };

  const toggleStar = useCallback((e, boardCode) => {
    e.stopPropagation();
    setStarredCodes((prev) => {
      const next = prev.includes(boardCode)
        ? prev.filter((c) => c !== boardCode)
        : [...prev, boardCode];
      try {
        localStorage.setItem('boardroom:starred_codes', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const drop = useCallback((e, c) => {
    e.stopPropagation();
    forgetBoard(c);
    setRecent(getRecentBoards());
    setOpenMenu(null);
  }, []);

  const copyBoardLink = useCallback(async (e, boardCode) => {
    e.stopPropagation();
    const link = `${window.location.origin}${window.location.pathname}#${boardCode}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt('Copy board link:', link);
    }
    setCopiedCode(boardCode);
    setOpenMenu(null);
    setTimeout(() => setCopiedCode(null), 1800);
  }, []);

  const toggleMenu = useCallback((e, boardCode) => {
    e.stopPropagation();
    setOpenMenu((prev) => (prev === boardCode ? null : boardCode));
  }, []);

  // Filtered recent boards based on search text and tab
  const filteredRecent = recent.filter((b) => {
    const matchesSearch = !searchFilter.trim() ||
      (b.name && b.name.toLowerCase().includes(searchFilter.toLowerCase())) ||
      b.code.toLowerCase().includes(searchFilter.toLowerCase());
    if (!matchesSearch) return false;
    if (recentTab === 'starred') return starredCodes.includes(b.code);
    return true;
  });

  return (
    <div className={styles.page}>
      {/* Ambient glow orbs */}
      <div className={styles.ambientOrb1} aria-hidden="true" />
      <div className={styles.ambientOrb2} aria-hidden="true" />
      <div className={styles.ambientOrb3} aria-hidden="true" />

      {/* Header with Global Cluster Status Pill */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>
            <img src="/board.svg" className={styles.brandMark} alt="" />
          </div>
          <span className={styles.brandText}>BOARDROOM</span>
          <span className={styles.proBadge}>PRO v2.4</span>
        </div>

        <div className={styles.clusterStatusPill} title="All realtime webSocket & sync engines are fully operational">
          <span className={styles.clusterDot} />
          <span className={styles.clusterText}>Live · Global Multi-Region Cluster (<span className={styles.clusterTime}>&lt;14ms</span>)</span>
        </div>

        {user ? (
          <div className={styles.headerActions}>
            <NotificationBell />
            <ThemeToggle />
            <button className={styles.msgBtn} onClick={goToMessages} title="Direct Messages" aria-label="Messages">
              <MessageCircle size={19} />
            </button>
            <button className={styles.userChip} onClick={goToAccount} title="Your account settings">
              <Avatar user={user} size={28} />
              <span className={styles.userName}>{user.name}</span>
            </button>
          </div>
        ) : (
          <div className={styles.headerActions}>
            <ThemeToggle />
            <button className={styles.newBtnSmall} onClick={() => setShowCreateModal(true)}>
              <Plus size={16} /> New Board
            </button>
          </div>
        )}
      </header>

      <main className={styles.main}>
        <section className={`${styles.hero} ${heroVisible ? styles.heroVisible : ''}`}>
          <div className={styles.badge}>
            <Zap size={13} />
            <span>Next-Gen Real-Time Collaborative Workspace</span>
          </div>

          <h1 className={styles.title}>
            Where teams sketch, code &amp; <span className={styles.titleGradient}>build together.</span>
          </h1>

          <p className={styles.subtitle}>
            Spin up an infinite canvas, drop sticky notes, run code in real time, and export professional
            PDF presentations — all from a single shareable link with zero-latency synchronization.
          </p>

          <div className={styles.actions}>
            <button className={styles.newBtn} onClick={() => setShowCreateModal(true)}>
              <div className={styles.newBtnGlow} />
              <Plus size={20} />
              <span>New instant board</span>
            </button>

            <div className={styles.joinGroup}>
              <KeyRound size={18} className={styles.joinIcon} />
              <input
                className={styles.joinInput}
                placeholder="Enter room code or link..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && join()}
                aria-label="Board code"
                spellCheck={false}
              />
              <button
                className={styles.joinBtn}
                onClick={join}
                disabled={!clean}
                aria-label="Join board"
              >
                Join <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className={styles.statsRow}>
            {STATS.map((s) => (
              <div key={s.label} className={styles.stat}>
                <span className={styles.statValue}>{s.value}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive Sandbox Right Panel */}
        <aside className={`${styles.previewWrap} ${heroVisible ? styles.previewVisible : ''}`}>
          <BoardPreview />
        </aside>
      </main>

      {/* ---- Quick-Start Templates Bar ---- */}
      <section className={styles.templatesSection}>
        <div className={styles.sectionContainer}>
          <div className={styles.sectionHeaderFlex}>
            <div>
              <div className={styles.sectionEyebrow}>
                <LayoutTemplate size={14} />
                <span>One-Click Templates</span>
              </div>
              <h2 className={styles.sectionHeading}>Launch a professional workspace in seconds.</h2>
            </div>
            <span className={styles.sectionHint}>Pre-formatted boards optimized for your workflow</span>
          </div>

          <div className={styles.templatesGrid}>
            {TEMPLATES.map((t, idx) => (
              <button
                key={t.slug}
                className={styles.templateCard}
                style={{ animationDelay: `${idx * 0.05}s` }}
                onClick={() => launchTemplate(t.slug, t.name)}
              >
                <div className={styles.templateHeader}>
                  <div className={styles.templateIconBox} style={{ background: t.gradient }}>
                    <t.icon size={19} />
                  </div>
                  <span className={styles.templateTag}>{t.tag}</span>
                </div>
                <h3 className={styles.templateTitle}>{t.name}</h3>
                <p className={styles.templateDesc}>{t.desc}</p>
                <div className={styles.templateLaunchFooter}>
                  <span>Launch Template</span>
                  <ArrowRight size={14} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Recent Boards Dashboard with Search, Star & Filter Tabs ---- */}
      {recent.length > 0 && (
        <section className={styles.recentSection}>
          <div className={styles.sectionContainer}>
            <div className={styles.recentHeaderBar}>
              <div>
                <div className={styles.sectionEyebrow}>
                  <Clock size={14} />
                  <span>Your Dashboard</span>
                </div>
                <h2 className={styles.sectionHeading}>Recent &amp; Starred Boards</h2>
              </div>

              <div className={styles.recentToolbar}>
                <div className={styles.recentSearchBox}>
                  <Search size={15} className={styles.recentSearchIcon} />
                  <input
                    type="text"
                    className={styles.recentSearchInput}
                    placeholder="Filter boards by name or #code..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                  />
                  {searchFilter && (
                    <button className={styles.clearSearchBtn} onClick={() => setSearchFilter('')} aria-label="Clear search">
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className={styles.recentFilterTabs}>
                  <button
                    className={`${styles.recentTabBtn} ${recentTab === 'all' ? styles.recentTabActive : ''}`}
                    onClick={() => setRecentTab('all')}
                  >
                    All ({recent.length})
                  </button>
                  <button
                    className={`${styles.recentTabBtn} ${recentTab === 'starred' ? styles.recentTabActive : ''}`}
                    onClick={() => setRecentTab('starred')}
                  >
                    <Star size={13} fill={recentTab === 'starred' ? '#f59e0b' : 'none'} color="#f59e0b" />
                    Starred ({starredCodes.length})
                  </button>
                </div>
              </div>
            </div>

            {filteredRecent.length === 0 ? (
              <div className={styles.recentEmptyBox}>
                <Layers size={36} className={styles.recentEmptyIcon} />
                <h3 className={styles.recentEmptyTitle}>No boards found</h3>
                <p className={styles.recentEmptyText}>
                  {searchFilter
                    ? `No recent boards match "${searchFilter}". Try clearing your search.`
                    : 'You haven’t starred any boards yet. Click the star icon on any card to pin it here.'}
                </p>
                {searchFilter && (
                  <button className={styles.clearSearchCta} onClick={() => setSearchFilter('')}>
                    Clear search filter
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.recentGrid}>
                {filteredRecent.map((b, i) => {
                  const isStarred = starredCodes.includes(b.code);
                  const title = b.name || `Board ${b.code.toUpperCase()}`;
                  const theme = getBoardTheme(title);
                  const IconComponent = theme.icon;
                  return (
                    <div
                      key={b.code}
                      className={`${styles.recentCard} ${isStarred ? styles.recentCardStarred : ''}`}
                      style={{ animationDelay: `${i * 0.04}s` }}
                    >
                      <button
                        className={styles.recentCardBody}
                        onClick={() => goToRoom(b.code)}
                        title={`Open board ${title}`}
                      >
                        <div className={styles.recentArt} style={{ background: theme.color }}>
                          <IconComponent size={22} />
                          <div className={styles.recentArtDots} />
                        </div>
                        <div className={styles.recentInfo}>
                          <div className={styles.recentNameRow}>
                            <span className={styles.recentName}>{title}</span>
                            {isStarred && <Star size={13} fill="#f59e0b" color="#f59e0b" title="Starred board" />}
                          </div>
                          <span className={styles.recentCode}>#{b.code}</span>
                          <span className={styles.recentTime}>
                            <Clock size={11} />
                            {relativeTime(b.ts)}
                          </span>
                        </div>
                      </button>

                      <div className={styles.recentActions}>
                        <button
                          className={`${styles.recentActionBtn} ${isStarred ? styles.starredBtnActive : ''}`}
                          onClick={(e) => toggleStar(e, b.code)}
                          title={isStarred ? 'Unstar board' : 'Star board'}
                          aria-label="Star board"
                        >
                          <Star size={14} fill={isStarred ? '#f59e0b' : 'none'} color={isStarred ? '#f59e0b' : 'currentColor'} />
                        </button>
                        {copiedCode === b.code ? (
                          <span className={styles.copiedBadge}>
                            <Check size={12} /> Copied
                          </span>
                        ) : (
                          <button
                            className={styles.recentActionBtn}
                            onClick={(e) => copyBoardLink(e, b.code)}
                            title="Copy board link"
                            aria-label="Copy board link"
                          >
                            <Copy size={14} />
                          </button>
                        )}
                        <button
                          className={styles.recentActionBtn}
                          onClick={() => goToRoom(b.code)}
                          title="Open in board"
                          aria-label="Open board"
                        >
                          <ExternalLink size={14} />
                        </button>
                        <button
                          className={styles.recentActionBtn}
                          onClick={(e) => toggleMenu(e, b.code)}
                          title="More"
                          aria-label="More options"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {openMenu === b.code && (
                          <div className={styles.recentMenu} onClick={(e) => e.stopPropagation()}>
                            <button className={styles.recentMenuDanger} onClick={(e) => drop(e, b.code)}>
                              <Trash2 size={14} />
                              <span>Remove from recent</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---- Interactive Tabbed Feature Showcase ---- */}
      <section className={styles.showcaseSection}>
        <div className={styles.sectionContainer}>
          <div className={styles.featuresHeader}>
            <span className={styles.featuresBadge}>
              <Sparkles size={13} />
              Interactive Technology Showcase
            </span>
            <h2 className={styles.featuresTitle}>Engineered for zero latency and absolute precision.</h2>
            <p className={styles.featuresSubtitle}>
              Explore how Boardroom combines visual canvas tools with real-time programming and high-security rooms.
            </p>
          </div>

          <div className={styles.showcaseTabsRow}>
            {SHOWCASE_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.showcaseTabBtn} ${activeShowcase.id === tab.id ? styles.showcaseTabActive : ''}`}
                onClick={() => setActiveShowcase(tab)}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className={styles.showcasePane}>
            <div className={styles.showcaseContent}>
              <span className={styles.showcaseBadge}>{activeShowcase.badge}</span>
              <h3 className={styles.showcaseTitle}>{activeShowcase.title}</h3>
              <p className={styles.showcaseBody}>{activeShowcase.body}</p>
              <div className={styles.showcaseFeatureChecks}>
                <div className={styles.checkItem}><CheckCircle2 size={16} className={styles.checkIcon} /> No server refresh needed</div>
                <div className={styles.checkItem}><CheckCircle2 size={16} className={styles.checkIcon} /> Works across mobile &amp; desktop</div>
                <div className={styles.checkItem}><CheckCircle2 size={16} className={styles.checkIcon} /> Instant state synchronization</div>
              </div>
            </div>
            <div className={styles.showcaseCodeBox}>
              <div className={styles.showcaseCodeHeader}>
                <span className={styles.codeDotRed} />
                <span className={styles.codeDotYellow} />
                <span className={styles.codeDotGreen} />
                <span className={styles.codeFilename}>boardroom-engine.{activeShowcase.id === 'code' ? 'js' : 'ts'}</span>
              </div>
              <pre className={styles.showcasePre}>
                <code>{activeShowcase.codeSnippet}</code>
              </pre>
            </div>
          </div>

          {/* Quick Feature Grid */}
          <div className={styles.featureGrid}>
            {FEATURES.map((f, i) => (
              <div className={styles.featureCard} key={f.title} style={{ animationDelay: `${i * 0.05}s` }}>
                <span className={styles.featureIcon} style={{ background: f.gradient }}>
                  <f.icon size={20} />
                </span>
                <div className={styles.featureTitle}>{f.title}</div>
                <div className={styles.featureBody}>{f.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- High-Velocity Team Use Cases ---- */}
      <section className={styles.useCasesSection}>
        <div className={styles.sectionContainer}>
          <div className={styles.featuresHeader}>
            <span className={styles.featuresBadge}>
              <Compass size={13} />
              Tailored for Your Workflow
            </span>
            <h2 className={styles.featuresTitle}>Built for teams who move fast.</h2>
            <p className={styles.featuresSubtitle}>
              Whether you're brainstorming UX flows, debugging algorithms live, or running daily Agile check-ins.
            </p>
          </div>

          <div className={styles.useCasesGrid}>
            {USE_CASES.map((uc, idx) => (
              <div key={uc.title} className={styles.useCaseCard} style={{ animationDelay: `${idx * 0.06}s` }}>
                <div className={styles.useCaseHeaderBar} style={{ background: uc.gradient }} />
                <div className={styles.useCaseBody}>
                  <h3 className={styles.useCaseTitle}>{uc.title}</h3>
                  <p className={styles.useCaseDesc}>{uc.desc}</p>
                  <ul className={styles.useCaseList}>
                    {uc.items.map((item) => (
                      <li key={item} className={styles.useCaseListItem}>
                        <CheckCircle2 size={15} className={styles.useCaseCheck} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section className={styles.howSection}>
        <div className={styles.howInner}>
          <div className={styles.featuresHeader}>
            <span className={styles.featuresBadge}>
              <Share2 size={13} />
              How it works
            </span>
            <h2 className={styles.featuresTitle}>Three steps. Zero friction.</h2>
          </div>
          <div className={styles.howGrid}>
            <div className={styles.howStep}>
              <div className={styles.howNum}>1</div>
              <h3 className={styles.howStepTitle}>Create or pick a template</h3>
              <p className={styles.howStepBody}>Click "New instant board" or launch a quick template. You get an encrypted, shareable room link immediately.</p>
            </div>
            <div className={styles.howDivider} />
            <div className={styles.howStep}>
              <div className={styles.howNum}>2</div>
              <h3 className={styles.howStepTitle}>Share the URL</h3>
              <p className={styles.howStepBody}>Send the link to your teammates. They enter in one click on desktop, tablet, or phone without installing anything.</p>
            </div>
            <div className={styles.howDivider} />
            <div className={styles.howStep}>
              <div className={styles.howNum}>3</div>
              <h3 className={styles.howStepTitle}>Collaborate &amp; Export</h3>
              <p className={styles.howStepBody}>Draw, drop sticky notes, run code, and chat live. Export high-resolution PDFs and PNGs anytime.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLeft}>
            <div className={styles.footerBrand}>
              <img src="/board.svg" alt="" width="20" height="20" />
              <span>BOARDROOM PRO</span>
            </div>
            <p>An infinite collaborative workspace with dual-transport websocket synchronization.</p>
          </div>
          <div className={styles.footerRight}>
            <div className={styles.footerStatus}>
              <span className={styles.clusterDot} />
              <span>Global WebSocket Engine Online · 100% Uptime</span>
            </div>
            <p className={styles.footerCopy}>© {new Date().getFullYear()} Boardroom · All rights reserved.</p>
          </div>
        </div>
      </footer>

      {showCreateModal && <CreateRoomModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}


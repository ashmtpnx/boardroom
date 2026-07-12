import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Plus, KeyRound, ArrowRight, X, Users, Shapes, FileDown,
  Clock, MessageCircle, Zap, Sparkles, Shield, Layers,
  Pencil, Type, StickyNote, Image, Share2, Smile,
  Copy, Check, ExternalLink, Trash2, MoreHorizontal,
} from 'lucide-react';
import { startNewBoard, goToRoom, goToAccount, goToMessages, normalizeCode } from '../../utils/nav';
import { getRecentBoards, forgetBoard } from '../../utils/recentBoards';
import Avatar from '../Avatar';
import BoardPreview from './BoardPreview';
import NotificationBell from '../Notifications/NotificationBell';
import CreateRoomModal from './CreateRoomModal';
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
  { value: '0s', label: 'Signup time' },
  { value: '100%', label: 'Free forever' },
  { value: '8+', label: 'Canvas tools' },
];

export default function Home() {
  const user = useSelector((s) => s.session.currentUser);
  const [code, setCode] = useState('');
  const [recent, setRecent] = useState(() => getRecentBoards());
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

  return (
    <div className={styles.page}>
      {/* Ambient glow orbs */}
      <div className={styles.ambientOrb1} aria-hidden="true" />
      <div className={styles.ambientOrb2} aria-hidden="true" />
      <div className={styles.ambientOrb3} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>
            <img src="/board.svg" className={styles.brandMark} alt="" />
          </div>
          <span className={styles.brandText}>BOARDROOM</span>
        </div>
        {user && (
          <div className={styles.headerActions}>
            <NotificationBell />
            <button className={styles.msgBtn} onClick={goToMessages} title="Messages" aria-label="Messages">
              <MessageCircle size={20} />
            </button>
            <button className={styles.userChip} onClick={goToAccount} title="Your account">
              <Avatar user={user} size={28} />
              <span className={styles.userName}>{user.name}</span>
            </button>
          </div>
        )}
      </header>

      <main className={styles.main}>
        <section className={`${styles.hero} ${heroVisible ? styles.heroVisible : ''}`}>
          <div className={styles.badge}>
            <Zap size={13} />
            <span>Real-time collaborative whiteboard</span>
          </div>

          <h1 className={styles.title}>
            Where teams sketch
            <br />
            <span className={styles.titleGradient}>ideas together.</span>
          </h1>

          <p className={styles.subtitle}>
            Spin up an infinite canvas, drop sticky notes and shapes, chat live with your team,
            and export to PDF — all from a single shareable link. No sign-up. No friction.
          </p>

          <div className={styles.actions}>
            <button className={styles.newBtn} onClick={() => setShowCreateModal(true)}>
              <div className={styles.newBtnGlow} />
              <Plus size={20} />
              <span>New board</span>
            </button>

            <div className={styles.joinGroup}>
              <KeyRound size={18} className={styles.joinIcon} />
              <input
                className={styles.joinInput}
                placeholder="Enter a board code"
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

        <aside className={`${styles.previewWrap} ${heroVisible ? styles.previewVisible : ''}`}>
          <BoardPreview />
        </aside>
      </main>

      {/* ---- Recent Boards — full-width section ---- */}
      {recent.length > 0 && (
        <section className={styles.recentSection}>
          <div className={styles.recentInner}>
            <div className={styles.recentHeader}>
              <div className={styles.recentLabel}>
                <Clock size={15} />
                <span>Recent boards</span>
              </div>
              <span className={styles.recentCount}>{recent.length} board{recent.length > 1 ? 's' : ''}</span>
            </div>
            <div className={styles.recentGrid}>
              {recent.map((b, i) => (
                <div
                  key={b.code}
                  className={styles.recentCard}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <button
                    className={styles.recentCardBody}
                    onClick={() => goToRoom(b.code)}
                    title={`Open board ${b.name || b.code}`}
                  >
                    <div className={styles.recentArt} style={{ background: boardColor(b.code) }}>
                      <Layers size={22} />
                      <div className={styles.recentArtDots} />
                    </div>
                    <div className={styles.recentInfo}>
                      <span className={styles.recentName}>{b.name || `Board ${b.code.toUpperCase()}`}</span>
                      <span className={styles.recentCode}>#{b.code}</span>
                      <span className={styles.recentTime}>
                        <Clock size={11} />
                        {relativeTime(b.ts)}
                      </span>
                    </div>
                  </button>

                  <div className={styles.recentActions}>
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
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---- Features — 2x4 grid ---- */}
      <section className={styles.features}>
        <div className={styles.featuresHeader}>
          <span className={styles.featuresBadge}>
            <Sparkles size={13} />
            Features
          </span>
          <h2 className={styles.featuresTitle}>Everything you need, nothing you don't.</h2>
          <p className={styles.featuresSubtitle}>
            A fast, focused toolkit for visual collaboration — designed to get out of your way.
          </p>
        </div>
        <div className={styles.featureGrid}>
          {FEATURES.map((f, i) => (
            <div className={styles.featureCard} key={f.title} style={{ animationDelay: `${i * 0.06}s` }}>
              <span className={styles.featureIcon} style={{ background: f.gradient }}>
                <f.icon size={20} />
              </span>
              <div className={styles.featureTitle}>{f.title}</div>
              <div className={styles.featureBody}>{f.body}</div>
            </div>
          ))}
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
              <h3 className={styles.howStepTitle}>Create a board</h3>
              <p className={styles.howStepBody}>Click "New board" — optionally name it and set a password. You get a unique link instantly.</p>
            </div>
            <div className={styles.howDivider} />
            <div className={styles.howStep}>
              <div className={styles.howNum}>2</div>
              <h3 className={styles.howStepTitle}>Share the link</h3>
              <p className={styles.howStepBody}>Send the board link or code to your team. They join in one click — no sign-up, no install.</p>
            </div>
            <div className={styles.howDivider} />
            <div className={styles.howStep}>
              <div className={styles.howNum}>3</div>
              <h3 className={styles.howStepTitle}>Collaborate live</h3>
              <p className={styles.howStepBody}>Draw, drop sticky notes, chat, react — everything syncs in real time across all devices.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <img src="/board.svg" alt="" width="18" height="18" />
          <span>BOARDROOM</span>
        </div>
        <p>An infinite collaborative canvas · no audio/video, just ideas · 100% free</p>
      </footer>

      {showCreateModal && <CreateRoomModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}

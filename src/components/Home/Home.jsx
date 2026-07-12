import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus, KeyRound, ArrowRight, X, Users, Shapes, FileDown, Clock, MessageCircle } from 'lucide-react';
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
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  return day === 1 ? 'yesterday' : `${day} days ago`;
}

const FEATURES = [
  { icon: Users, title: 'Real-time together', body: 'See teammates draw, type, and move objects live — with presence and chat.' },
  { icon: Shapes, title: 'Every tool you need', body: 'Freehand brushes, shapes, sticky notes, text, and drag-and-drop images.' },
  { icon: FileDown, title: 'Export anything', body: 'Save the board or the full chat transcript to PDF in one click.' },
];

export default function Home() {
  const user = useSelector((s) => s.session.currentUser);
  const [code, setCode] = useState('');
  const [recent, setRecent] = useState(() => getRecentBoards());
  const [showCreateModal, setShowCreateModal] = useState(false);

  const clean = normalizeCode(code);

  const join = () => {
    if (clean) goToRoom(clean);
  };

  const drop = (e, c) => {
    e.stopPropagation();
    forgetBoard(c);
    setRecent(getRecentBoards());
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <img src="/board.svg" className={styles.brandMark} alt="" />
          <span>BOARDROOM</span>
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
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Sync ideas · collaborative whiteboard</p>
          <h1 className={styles.title}>
            Sketch ideas together,<br />in real time.
          </h1>
          <p className={styles.subtitle}>
            Spin up an infinite canvas, drop sticky notes and shapes, chat with your team,
            and export to PDF — all from a single shareable link.
          </p>

          <div className={styles.actions}>
            <button className={styles.newBtn} onClick={() => setShowCreateModal(true)}>
              <Plus size={20} /> New board
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

          <p className={styles.hint}>No sign-up needed — share the board link to invite anyone.</p>

          {recent.length > 0 && (
            <div className={styles.recent}>
              <div className={styles.recentLabel}>
                <Clock size={14} /> Recent boards
              </div>
              <div className={styles.recentGrid}>
                {recent.map((b) => (
                  <button
                    key={b.code}
                    className={styles.recentCard}
                    onClick={() => goToRoom(b.code)}
                    title={`Rejoin board ${b.code}`}
                  >
                    <span className={styles.recentThumb}>
                      <img src="/board.svg" alt="" />
                    </span>
                    <span className={styles.recentMeta}>
                      <span className={styles.recentCode}>{b.code}</span>
                      <span className={styles.recentTime}>{relativeTime(b.ts)}</span>
                    </span>
                    <span
                      className={styles.recentDrop}
                      onClick={(e) => drop(e, b.code)}
                      role="button"
                      aria-label={`Remove ${b.code} from recent`}
                    >
                      <X size={14} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className={styles.previewWrap}>
          <BoardPreview />
        </aside>
      </main>

      <section className={styles.features}>
        {FEATURES.map((f) => (
          <div className={styles.featureCard} key={f.title}>
            <span className={styles.featureIcon}>
              <f.icon size={20} />
            </span>
            <div className={styles.featureTitle}>{f.title}</div>
            <div className={styles.featureBody}>{f.body}</div>
          </div>
        ))}
      </section>

      <footer className={styles.footer}>
        BOARDROOM · an infinite collaborative canvas · no audio/video, just ideas
      </footer>

      {showCreateModal && <CreateRoomModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ArrowLeft, UserPlus, MessageSquare, Search } from 'lucide-react';
import { getFriends } from '../../utils/friends';
import { listConversations } from '../../utils/dm';
import { goHome, goToFriendChat, goToAccount } from '../../utils/nav';
import Avatar from '../Avatar';
import styles from './Messages.module.css';

function relTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(hr / 24);
  return day === 1 ? '1d' : `${day}d`;
}

// The Messages inbox — an Instagram-style DM list on its own route (#messages).
// Lists friends as conversations with a last-message preview; tapping one opens
// the full chat (#dm/<tag>). Reads localStorage and refreshes on focus/storage.
export default function Messages() {
  const me = useSelector((s) => s.session.currentUser);
  const [rows, setRows] = useState(() => listConversations(getFriends()));
  const [query, setQuery] = useState('');

  useEffect(() => {
    const refresh = () => setRows(listConversations(getFriends()));
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const q = query.trim().toLowerCase();
  const shown = q
    ? rows.filter(
        (r) =>
          (r.friend.name || '').toLowerCase().includes(q) ||
          (r.tag || '').toLowerCase().includes(q),
      )
    : rows;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={goHome} aria-label="Back to home">
          <ArrowLeft size={18} /> <span>Home</span>
        </button>
        <h1 className={styles.title}>Messages</h1>
        <button className={styles.addBtn} onClick={goToAccount} title="Add a friend">
          <UserPlus size={18} />
        </button>
      </header>

      <main className={styles.body}>
        {rows.length > 0 && (
          <div className={styles.searchRow}>
            <Search size={16} className={styles.searchIcon} />
            <input
              className={styles.search}
              placeholder="Search messages"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search conversations"
            />
          </div>
        )}

        {rows.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}><MessageSquare size={30} /></div>
            <p className={styles.emptyTitle}>Your messages</p>
            <p className={styles.emptyBody}>
              Add a friend by their account ID to start a conversation. Messages sync across your devices.
            </p>
            <button className={styles.emptyCta} onClick={goToAccount}>
              <UserPlus size={16} /> Add a friend
            </button>
          </div>
        ) : shown.length === 0 ? (
          <p className={styles.noResults}>No conversations match “{query}”.</p>
        ) : (
          <ul className={styles.list}>
            {shown.map((r) => {
              const mine = r.lastUserId && me?.id && r.lastUserId === me.id;
              return (
                <li key={r.friend.id}>
                  <button
                    className={styles.row}
                    onClick={() => goToFriendChat(r.tag)}
                    title={`Message ${r.friend.name}`}
                  >
                    <Avatar user={r.friend} size={52} />
                    <div className={styles.meta}>
                      <div className={styles.metaTop}>
                        <span className={styles.name}>{r.friend.name}</span>
                        {r.lastTs > 0 && <span className={styles.time}>{relTime(r.lastTs)}</span>}
                      </div>
                      <div className={styles.preview}>
                        {r.lastText
                          ? <>{mine && <span className={styles.you}>You: </span>}{r.lastText}</>
                          : <span className={styles.dim}>Tap to start the conversation</span>}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { MessageSquare, UserPlus, ChevronRight } from 'lucide-react';
import { getFriends } from '../../utils/friends';
import { listConversations } from '../../utils/dm';
import { goToFriendChat, goToAccount } from '../../utils/nav';
import Avatar from '../Avatar';
import styles from './HomeMessages.module.css';

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

// A "Messages" section for the home page: lists your friends as conversations,
// each with a last-message preview, and opens a full chat on click. Reads from
// localStorage (friends + DM threads) and refreshes when the tab regains focus
// or another tab writes a message, so it stays current without a server.
export default function HomeMessages() {
  const me = useSelector((s) => s.session.currentUser);
  const [rows, setRows] = useState(() => listConversations(getFriends()));

  useEffect(() => {
    const refresh = () => setRows(listConversations(getFriends()));
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh); // another tab sent/received a DM
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return (
    <section className={styles.section} aria-label="Messages">
      <div className={styles.head}>
        <div className={styles.headTitle}>
          <MessageSquare size={18} />
          <span>Messages</span>
          {rows.length > 0 && <span className={styles.count}>{rows.length}</span>}
        </div>
        <button className={styles.addBtn} onClick={goToAccount}>
          <UserPlus size={15} /> <span>Add friend</span>
        </button>
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><MessageSquare size={26} /></div>
          <p className={styles.emptyTitle}>No conversations yet</p>
          <p className={styles.emptyBody}>
            Add a friend by their account ID, then start chatting — messages sync across your devices.
          </p>
          <button className={styles.emptyCta} onClick={goToAccount}>
            <UserPlus size={16} /> Add a friend
          </button>
        </div>
      ) : (
        <ul className={styles.list}>
          {rows.map((r) => {
            const mine = r.lastUserId && me?.id && r.lastUserId === me.id;
            return (
              <li key={r.friend.id}>
                <button
                  className={styles.row}
                  onClick={() => goToFriendChat(r.tag)}
                  title={`Message ${r.friend.name}`}
                >
                  <Avatar user={r.friend} size={44} />
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
                  <ChevronRight size={18} className={styles.chevron} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

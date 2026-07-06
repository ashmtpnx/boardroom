import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ArrowLeft, UserPlus, MessageSquare, Search, X, Copy, Check, Loader } from 'lucide-react';
import { getFriends, addFriend, removeFriend } from '../../utils/friends';
import { accountId, normalizeAccountId } from '../../utils/accountId';
import { lookupAccount } from '../../utils/directory';
import { listConversations } from '../../utils/dm';
import { goHome, goToFriendChat } from '../../utils/nav';
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
// It also owns friend management (moved here from the Account page): add someone
// by account ID, share your own ID, and remove a conversation. Reads localStorage
// and refreshes on focus/storage.
export default function Messages() {
  const me = useSelector((s) => s.session.currentUser);
  const [rows, setRows] = useState(() => listConversations(getFriends()));
  const [query, setQuery] = useState('');

  // add-friend panel
  const [showAdd, setShowAdd] = useState(false);
  const [friendAccount, setFriendAccount] = useState('');
  const [friendName, setFriendName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const myTag = accountId(me?.id || '');

  const refresh = () => setRows(listConversations(getFriends()));

  useEffect(() => {
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const onAddFriend = async () => {
    const normalized = normalizeAccountId(friendAccount);
    if (!normalized) {
      setError('That account ID doesn’t look right. Expected format: BR-4K7P-2QX9');
      return;
    }
    if (myTag && normalized === myTag) {
      setError('That’s your own account ID.');
      return;
    }
    if (getFriends().some((f) => f.account === normalized)) {
      setError('That person is already in your messages.');
      return;
    }

    setError('');
    setAdding(true);

    // Resolve the ID to a real profile from the directory; fall back to the typed
    // name (or the tag) when offline so adding never fails hard.
    let name = friendName.trim();
    let color;
    let photoURL = null;
    const result = await lookupAccount(normalized);
    if (result.ok) {
      const p = result.profile;
      if (!name) name = p.name || normalized;
      color = p.color;
      photoURL = p.photoURL || null;
    } else if (!name) {
      name = normalized;
    }

    addFriend({ name, color, photoURL, account: normalized });
    setFriendAccount('');
    setFriendName('');
    setAdding(false);
    setShowAdd(false);
    refresh();
  };

  const onRemove = (e, friend) => {
    e.stopPropagation();
    if (!window.confirm(`Remove ${friend.name} from your messages? Your chat history stays on this device.`)) return;
    removeFriend(friend.id);
    refresh();
  };

  const onCopyMyId = async () => {
    try {
      await navigator.clipboard.writeText(myTag);
    } catch {
      window.prompt('Copy your account ID:', myTag);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

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
        <button
          className={`${styles.addBtn} ${showAdd ? styles.addBtnOpen : ''}`}
          onClick={() => { setShowAdd((v) => !v); setError(''); }}
          title={showAdd ? 'Close' : 'Add a friend'}
          aria-label={showAdd ? 'Close add friend' : 'Add a friend'}
        >
          {showAdd ? <X size={18} /> : <UserPlus size={18} />}
        </button>
      </header>

      <main className={styles.body}>
        {showAdd && (
          <div className={styles.addPanel}>
            <div className={styles.yourId}>
              <div className={styles.yourIdMeta}>
                <span className={styles.yourIdLabel}>Your account ID</span>
                <span className={styles.mono}>{myTag}</span>
              </div>
              <button className={styles.copyBtn} onClick={onCopyMyId} title="Copy your account ID">
                {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}
              </button>
            </div>
            <p className={styles.addHint}>Share your ID so friends can add you — or enter theirs below.</p>

            <div className={styles.addRow}>
              <input
                className={`${styles.field} ${styles.mono}`}
                placeholder="Account ID — e.g. BR-4K7P-2QX9"
                value={friendAccount}
                maxLength={20}
                autoFocus
                onChange={(e) => setFriendAccount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onAddFriend()}
              />
              <input
                className={styles.field}
                placeholder="Name (optional)"
                value={friendName}
                maxLength={40}
                onChange={(e) => setFriendName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onAddFriend()}
              />
              <button
                className={styles.addConfirm}
                onClick={onAddFriend}
                disabled={!friendAccount.trim() || adding}
              >
                {adding ? <><Loader size={15} className={styles.spin} /> Adding…</> : <><UserPlus size={15} /> Add</>}
              </button>
            </div>
            {error && <p className={styles.error}>{error}</p>}
          </div>
        )}

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
            <button className={styles.emptyCta} onClick={() => { setShowAdd(true); setError(''); }}>
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
                <li key={r.friend.id} className={styles.rowWrap}>
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
                  <button
                    className={styles.rowRemove}
                    onClick={(e) => onRemove(e, r.friend)}
                    title="Remove"
                    aria-label={`Remove ${r.friend.name}`}
                  >
                    <X size={16} />
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

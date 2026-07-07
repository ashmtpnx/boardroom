import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ArrowLeft } from 'lucide-react';
import { normalizeAccountId } from '../../utils/accountId';
import { lookupAccount } from '../../utils/directory';
import { getFriendByTag } from '../../utils/friends';
import { goToMessages } from '../../utils/nav';
import Avatar from '../Avatar';
import ChatThread from './ChatThread';
import styles from './FriendChat.module.css';

// The full-page one-to-one chat route (#dm/BR-XXXX-YYYY). It owns only the page
// chrome — header, back button, peer identity — and delegates the entire
// conversation (realtime channel, cross-device history replay, typing indicator,
// composer, and away-notifications) to the shared <ChatThread>. Keeping the chat
// logic in one place means the embedded Messages pane and this page can't drift.
export default function FriendChat({ friendTag }) {
  const me = useSelector((s) => s.session.currentUser);
  const tag = normalizeAccountId(friendTag);

  const [friend, setFriend] = useState(() =>
    getFriendByTag(tag) || (tag ? { account: tag, name: tag } : null),
  );

  // Resolve a fresh profile for the header (name/photo) from the directory.
  useEffect(() => {
    if (!tag) return;
    let cancelled = false;
    (async () => {
      const res = await lookupAccount(tag);
      if (!cancelled && res.ok) setFriend((cur) => ({ ...cur, ...res.profile }));
    })();
    return () => { cancelled = true; };
  }, [tag]);

  if (!me) return null;

  if (!tag) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button className={styles.back} onClick={goToMessages}>
            <ArrowLeft size={18} /> <span>Messages</span>
          </button>
        </header>
        <div className={styles.missing}>That conversation link isn’t valid.</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={goToMessages}>
          <ArrowLeft size={18} /> <span>Messages</span>
        </button>
        <div className={styles.peer}>
          <Avatar user={friend} size={34} />
          <div className={styles.peerMeta}>
            <span className={styles.peerName}>{friend?.name || tag}</span>
            <span className={styles.peerTag}>{tag}</span>
          </div>
        </div>
      </header>

      <main className={styles.thread}>
        <ChatThread friendTag={tag} active />
      </main>
    </div>
  );
}

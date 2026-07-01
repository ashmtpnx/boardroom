import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { ArrowLeft, Send } from 'lucide-react';
import { createRealtime } from '../../realtime/RealtimeProvider';
import { EVENTS } from '../../realtime/events';
import { accountId, normalizeAccountId } from '../../utils/accountId';
import { lookupAccount } from '../../utils/directory';
import { getFriends } from '../../utils/friends';
import { dmRoomId, loadConversation, appendMessage } from '../../utils/dm';
import { goToAccount } from '../../utils/nav';
import { uid } from '../../utils/ids';
import Avatar from '../Avatar';
import ChatMessage from '../../features/chat/ChatMessage';
import styles from './FriendChat.module.css';

// A one-to-one chat with a single friend, addressed by their account tag in the
// URL hash (#dm/BR-XXXX-YYYY). Self-contained: it owns its realtime connection on
// a per-pair channel and persists the thread to localStorage — independent of the
// board's group chat and Redux flow.
export default function FriendChat({ friendTag }) {
  const me = useSelector((s) => s.session.currentUser);
  const tag = normalizeAccountId(friendTag);

  const myTag = useMemo(() => accountId(me?.id || ''), [me?.id]);
  const [friend, setFriend] = useState(() =>
    getFriends().find((f) => f.account === tag) || (tag ? { account: tag, name: tag } : null),
  );
  const [messages, setMessages] = useState(() => loadConversation(tag));
  const [text, setText] = useState('');
  const [peerTyping, setPeerTyping] = useState(false);
  const rtRef = useRef(null);
  const endRef = useRef(null);
  const lastTypingSentRef = useRef(0); // throttle outgoing "typing" pings
  const typingClearRef = useRef(null); // timer that hides the peer's indicator

  // Resolve a fresh profile for the friend (name/photo) from the directory.
  useEffect(() => {
    if (!tag) return;
    let cancelled = false;
    (async () => {
      const res = await lookupAccount(tag);
      if (!cancelled && res.ok) setFriend((cur) => ({ ...cur, ...res.profile }));
    })();
    return () => { cancelled = true; };
  }, [tag]);

  // Connect to the per-pair realtime channel and stream incoming DMs in.
  useEffect(() => {
    if (!tag || !myTag) return;
    const roomId = dmRoomId(myTag, tag);
    if (!roomId) return;

    let cancelled = false;
    const offs = [];

    (async () => {
      const rt = await createRealtime();
      if (cancelled) { rt.disconnect?.(); return; }
      rt.connect(roomId, me);
      rtRef.current = rt;

      offs.push(rt.on(EVENTS.DM_MESSAGE, (msg) => {
        if (!msg?.id) return;
        setMessages(appendMessage(tag, msg)); // persist + dedupe
        setPeerTyping(false); // a sent message means they stopped typing
      }));

      // Show "typing…" while pings arrive; hide it if none comes for ~3.5s.
      offs.push(rt.on(EVENTS.DM_TYPING, () => {
        setPeerTyping(true);
        clearTimeout(typingClearRef.current);
        typingClearRef.current = setTimeout(() => setPeerTyping(false), 3500);
      }));
    })();

    return () => {
      cancelled = true;
      offs.forEach((off) => off());
      clearTimeout(typingClearRef.current);
      rtRef.current?.disconnect();
      rtRef.current = null;
    };
  }, [tag, myTag, me]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, peerTyping]);

  // Update the field and let the friend know we're typing — at most one ping/sec.
  const onType = (value) => {
    setText(value);
    const now = Date.now();
    if (value.trim() && now - lastTypingSentRef.current > 1000) {
      lastTypingSentRef.current = now;
      rtRef.current?.emit(EVENTS.DM_TYPING, { userId: me.id, name: me.name });
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !me || !tag) return;
    const msg = {
      id: uid('dm'),
      userId: me.id,
      name: me.name,
      color: me.color,
      photoURL: me.photoURL || null,
      text: trimmed,
      ts: Date.now(),
    };
    setMessages(appendMessage(tag, msg)); // optimistic + persist
    rtRef.current?.emit(EVENTS.DM_MESSAGE, msg);
    setText('');
    lastTypingSentRef.current = 0; // allow an immediate typing ping next time
  };

  if (!me) return null;

  if (!tag) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button className={styles.back} onClick={goToAccount}>
            <ArrowLeft size={18} /> Friends
          </button>
        </header>
        <div className={styles.missing}>That conversation link isn’t valid.</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={goToAccount}>
          <ArrowLeft size={18} /> Friends
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
        <div className={styles.messages}>
          {messages.length === 0 && (
            <div className={styles.empty}>No messages yet. Say hello 👋</div>
          )}
          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} mine={m.userId === me.id} />
          ))}
          <div ref={endRef} />
        </div>

        {peerTyping && (
          <div className={styles.typing} aria-live="polite">
            <span className={styles.typingDots}><span /><span /><span /></span>
            {friend?.name || 'Friend'} is typing…
          </div>
        )}

        <form className={styles.composer} onSubmit={submit}>
          <input
            className={styles.input}
            placeholder={`Message ${friend?.name || 'your friend'}…`}
            value={text}
            onChange={(e) => onType(e.target.value)}
            maxLength={1000}
          />
          <button className={styles.send} type="submit" disabled={!text.trim()} aria-label="Send message">
            <Send size={18} />
          </button>
        </form>
      </main>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Send, Smile } from 'lucide-react';
import { sendMessage } from './chatSlice';
import { getRealtimeClient } from '../../realtime/client';
import { EVENTS } from '../../realtime/events';
import { uid } from '../../utils/ids';
import ChatMessage from './ChatMessage';
import styles from './ChatPanel.module.css';

const QUICK_REACTIONS = ['🎉', '❤️', '🔥', '👏', '💡', '👍'];

export default function ChatPanel() {
  const dispatch = useDispatch();
  const messages = useSelector((s) => s.chat.messages);
  const me = useSelector((s) => s.session.currentUser);
  const [text, setText] = useState('');
  const [typingName, setTypingName] = useState(null);
  const typingTimerRef = useRef(null);
  const lastEmitRef = useRef(0);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typingName]);

  useEffect(() => {
    const rt = getRealtimeClient();
    if (!rt) return undefined;

    const onTyping = ({ id, name }) => {
      if (!me || id === me.id) return;
      setTypingName(name);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        setTypingName(null);
      }, 3000);
    };

    const unsub = rt.on(EVENTS.ROOM_TYPING, onTyping);
    return () => {
      if (unsub) unsub();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [me]);

  const onInputChange = (e) => {
    const val = e.target.value;
    setText(val);
    if (!me) return;
    const now = Date.now();
    if (val.trim() && now - lastEmitRef.current > 1500) {
      lastEmitRef.current = now;
      const rt = getRealtimeClient();
      rt?.emit(EVENTS.ROOM_TYPING, { id: me.id, name: me.name });
    }
  };

  const sendReaction = (emoji) => {
    if (!me) return;
    const rt = getRealtimeClient();
    rt?.emit(EVENTS.ROOM_REACTION, { emoji, from: me.name });
  };

  const submit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !me) return;
    dispatch(
      sendMessage({
        id: uid('msg'),
        userId: me.id,
        name: me.name,
        color: me.color,
        photoURL: me.photoURL || null,
        text: trimmed,
        ts: Date.now(),
      }),
    );
    setText('');
  };

  return (
    <div className={styles.panel}>
      <div className={styles.quickReactions} aria-label="Quick board reactions">
        <span className={styles.reactionLabel}>React:</span>
        <div className={styles.reactionButtons}>
          {QUICK_REACTIONS.map((emoji) => (
            <button
              type="button"
              key={emoji}
              className={styles.rxBtn}
              onClick={() => sendReaction(emoji)}
              title={`Send ${emoji} across room`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.emptyCard}>
            <div className={styles.emptyIcon}>💬</div>
            <div className={styles.emptyTitle}>Group Chat is Ready</div>
            <div className={styles.emptyText}>
              Share ideas, notes, or links with everyone in this room. Click any emoji above to send live floating reactions across the board!
            </div>
          </div>
        )}
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} mine={!!me && m.userId === me.id} />
        ))}
        {typingName && (
          <div className={styles.typingIndicator}>
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
            <span className={styles.typingText}>{typingName} is typing…</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form className={styles.composer} onSubmit={submit}>
        <input
          className={styles.input}
          placeholder="Message everyone…"
          value={text}
          onChange={onInputChange}
          maxLength={1000}
        />
        <button className={styles.send} type="submit" disabled={!text.trim()} aria-label="Send message">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

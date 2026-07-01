import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Send } from 'lucide-react';
import { sendMessage } from './chatSlice';
import { uid } from '../../utils/ids';
import ChatMessage from './ChatMessage';
import styles from './ChatPanel.module.css';

export default function ChatPanel() {
  const dispatch = useDispatch();
  const messages = useSelector((s) => s.chat.messages);
  const me = useSelector((s) => s.session.currentUser);
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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
      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.empty}>No messages yet. Say hello 👋</div>
        )}
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} mine={!!me && m.userId === me.id} />
        ))}
        <div ref={endRef} />
      </div>

      <form className={styles.composer} onSubmit={submit}>
        <input
          className={styles.input}
          placeholder="Message everyone…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
        />
        <button className={styles.send} type="submit" disabled={!text.trim()} aria-label="Send message">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

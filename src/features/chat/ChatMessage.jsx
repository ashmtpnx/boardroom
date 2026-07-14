import { useState } from 'react';
import { Copy, Check, Sparkles, Code2 } from 'lucide-react';
import Avatar from '../../components/Avatar';
import styles from './ChatPanel.module.css';

export default function ChatMessage({ message, mine }) {
  const [copied, setCopied] = useState(false);
  const [reactions, setReactions] = useState([]);
  const time = new Date(message.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const onCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(message.text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const onQuickReact = (emoji, e) => {
    e.stopPropagation();
    setReactions((prev) => (prev.includes(emoji) ? prev : [...prev, emoji]));
    window.dispatchEvent(
      new CustomEvent('room:reaction:local', {
        detail: { emoji, from: message.name || 'someone' },
      }),
    );
  };

  // Check if message is a code snippet (starts with ``` or contains multi-line code)
  const isCode = (message.text || '').startsWith('```') || ((message.text || '').includes('\n') && (message.text || '').includes('function') || (message.text || '').includes('const ') || (message.text || '').includes('import '));
  const cleanText = (message.text || '').replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '');

  return (
    <div className={`${styles.msg} ${mine ? styles.msgMine : ''}`}>
      <Avatar
        user={{
          id: message.fromTag || message.id || message.name,
          account: message.fromTag || message.id || message.name,
          name: message.name,
          color: message.color,
          photoURL: message.photoURL,
        }}
        size={34}
        clickable={!mine}
        className={styles.avatar}
      />
      <div className={styles.bubbleWrap}>
        <div className={styles.meta}>
          <span className={styles.name}>{mine ? 'You' : message.name}</span>
          <span className={styles.time}>{time}</span>
          {isCode && (
            <span className={styles.codeBadge}>
              <Code2 size={11} /> Code Snippet
            </span>
          )}
        </div>

        <div className={styles.bubbleContainer}>
          {isCode ? (
            <div className={styles.codeBubble}>
              <div className={styles.codeHeader}>
                <span className={styles.codeDots}><span /><span /><span /></span>
                <span className={styles.codeLang}>Snippet</span>
                <button className={styles.codeCopyBtn} onClick={onCopy} title="Copy code">
                  {copied ? <Check size={12} className={styles.checkIcon} /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className={styles.codeContent}>{cleanText}</pre>
            </div>
          ) : (
            <div className={styles.bubble}>
              {message.text}
              <div className={styles.bubbleActions}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={onCopy}
                  title="Copy text"
                  aria-label="Copy message text"
                >
                  {copied ? <Check size={13} className={styles.checkIcon} /> : <Copy size={13} />}
                </button>
                <div className={styles.quickRxGroup}>
                  {['❤️', '🔥', '👍'].map((rx) => (
                    <button
                      key={rx}
                      type="button"
                      className={styles.actionRxBtn}
                      onClick={(e) => onQuickReact(rx, e)}
                      title={`React ${rx}`}
                    >
                      {rx}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {reactions.length > 0 && (
            <div className={styles.messageReactions}>
              {reactions.map((rx, idx) => (
                <span key={idx} className={styles.rxBadge}>{rx}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


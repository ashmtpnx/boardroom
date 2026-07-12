import Avatar from '../../components/Avatar';
import styles from './ChatPanel.module.css';

export default function ChatMessage({ message, mine }) {
  const time = new Date(message.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
        size={30}
        clickable={!mine}
        className={styles.avatar}
      />
      <div className={styles.bubbleWrap}>
        <div className={styles.meta}>
          <span className={styles.name}>{mine ? 'You' : message.name}</span>
          <span className={styles.time}>{time}</span>
        </div>
        <div className={styles.bubble}>{message.text}</div>
      </div>
    </div>
  );
}

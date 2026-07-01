import { useEffect, useState } from 'react';
import { initials } from '../utils/colors';
import styles from './Avatar.module.css';

// Renders a user's picture when set, otherwise their initials on their color.
// Used everywhere an avatar appears so the look stays consistent.
export default function Avatar({ user, size = 36, className = '' }) {
  const { name, color, photoURL } = user || {};
  const dim = { width: size, height: size };

  // Google profile images can intermittently fail to load; fall back to initials.
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [photoURL]);

  if (photoURL && !broken) {
    return (
      <img
        src={photoURL}
        alt={name || ''}
        className={`${styles.avatar} ${className}`}
        style={dim}
        draggable={false}
        // Google (lh3.googleusercontent.com) rejects requests that send a referrer,
        // which otherwise makes the picture silently fail to load.
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span
      className={`${styles.avatar} ${className}`}
      style={{ ...dim, background: color || '#9aa0a6', fontSize: Math.round(size * 0.4) }}
    >
      {initials(name || '?')}
    </span>
  );
}

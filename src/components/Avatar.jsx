import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { initials } from '../utils/colors';
import { viewUserProfile } from '../utils/profileView';
import styles from './Avatar.module.css';

// Renders a user's picture when set, otherwise their initials on their color.
// Used everywhere an avatar appears so the look stays consistent.
export default function Avatar({ user, size = 36, className = '', clickable, onClick }) {
  const me = useSelector((s) => s.session?.currentUser);
  const { name, color, photoURL } = user || {};
  const dim = { width: size, height: size };

  // Google profile images can intermittently fail to load; fall back to initials.
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [photoURL]);

  const isClickable = clickable !== false && (Boolean(onClick) || (user && user.id && user.id !== me?.id));

  const handleClick = (e) => {
    if (!isClickable) return;
    if (onClick) {
      onClick(e);
    } else if (user && user.id !== me?.id) {
      e.stopPropagation();
      viewUserProfile(user);
    }
  };

  if (photoURL && !broken) {
    return (
      <img
        src={photoURL}
        alt={name || ''}
        className={`${styles.avatar} ${isClickable ? styles.clickable : ''} ${className}`}
        style={dim}
        draggable={false}
        onClick={handleClick}
        // Google (lh3.googleusercontent.com) rejects requests that send a referrer,
        // which otherwise makes the picture silently fail to load.
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span
      className={`${styles.avatar} ${isClickable ? styles.clickable : ''} ${className}`}
      style={{ ...dim, background: color || '#9aa0a6', fontSize: Math.round(size * 0.4) }}
      onClick={handleClick}
    >
      {initials(name || '?')}
    </span>
  );
}

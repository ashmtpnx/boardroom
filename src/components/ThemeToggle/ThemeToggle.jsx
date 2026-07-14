import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem('boardroom_theme');
      if (stored === 'dark' || stored === 'light') return stored;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [spinning, setSpinning] = useState(false);

  // Sync with document element on initial load & state change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Listen for external theme changes across tabs or other toggle buttons
  useEffect(() => {
    const handleSync = (e) => {
      if (e.detail && (e.detail === 'dark' || e.detail === 'light')) {
        setTheme(e.detail);
        document.documentElement.setAttribute('data-theme', e.detail);
      }
    };

    const handleStorage = (e) => {
      if (e.key === 'boardroom_theme' && (e.newValue === 'dark' || e.newValue === 'light')) {
        setTheme(e.newValue);
        document.documentElement.setAttribute('data-theme', e.newValue);
      }
    };

    window.addEventListener('boardroom:theme-changed', handleSync);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('boardroom:theme-changed', handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    setSpinning(true);
    setTimeout(() => setSpinning(false), 460);

    try {
      localStorage.setItem('boardroom_theme', nextTheme);
    } catch {}

    document.documentElement.setAttribute('data-theme', nextTheme);
    window.dispatchEvent(new CustomEvent('boardroom:theme-changed', { detail: nextTheme }));
  };

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={styles.toggleBtn}
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div className={`${styles.iconWrap} ${spinning ? styles.spinning : ''}`}>
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </div>
    </button>
  );
}

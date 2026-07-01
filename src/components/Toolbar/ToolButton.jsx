import styles from './Toolbar.module.css';

export default function ToolButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      className={`${styles.tool} ${active ? styles.toolActive : ''}`}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={!!active}
    >
      <Icon size={20} strokeWidth={2} />
    </button>
  );
}

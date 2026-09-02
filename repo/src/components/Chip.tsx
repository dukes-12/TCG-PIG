export default function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className="pressable"
      onClick={onClick}
      aria-pressed={active}
      style={{
        cursor: 'pointer',
        border: 0,
        fontFamily: 'var(--font-body)',
        fontWeight: 700,
        fontSize: 11.5,
        padding: '6px 13px',
        borderRadius: 999,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        background: active ? 'var(--color-accent)' : 'var(--color-neutral-200)',
        color: active ? 'var(--color-bg)' : 'var(--color-text)',
        boxShadow: active ? 'var(--shadow-sm)' : 'inset 0 0 0 1px var(--color-divider)',
      }}
    >
      {label}
    </button>
  );
}

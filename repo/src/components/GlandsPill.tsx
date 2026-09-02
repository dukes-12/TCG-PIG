export default function GlandsPill({ glands }: { glands: number }) {
  return (
    <span
      style={{
        marginLeft: 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--color-accent-200)',
        color: 'var(--color-accent-800)',
        padding: '6px 12px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      <i style={{ width: 9, height: 11, borderRadius: '50% 50% 45% 45%', background: 'var(--color-accent-700)', display: 'block' }} />
      {glands}
    </span>
  );
}

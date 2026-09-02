import { useStore } from '../state/store';

export default function Toast() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="toast-layer">
      <div className="toast-pill">{toast}</div>
    </div>
  );
}

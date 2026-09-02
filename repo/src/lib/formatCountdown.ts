/** Formats a duration under an hour as "M:SS". Never used for spans that
 *  can exceed 59:59 — the free-booster timer's max wait is one hour. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

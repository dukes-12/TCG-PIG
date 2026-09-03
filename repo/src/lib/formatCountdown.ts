/** Formate une durée en "Xh YYm" au-delà d'une heure, en "M:SS" en dessous.
 *  Le compteur du versement quotidien va jusqu'à 24 h, l'ancienne version
 *  (limitée à 59:59) affichait donc "1439:59". */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours} h ${String(minutes).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

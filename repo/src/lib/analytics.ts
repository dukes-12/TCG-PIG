/**
 * Événements Google Analytics 4 — un wrapper mince autour de `gtag`,
 * jamais appelé directement ailleurs.
 *
 * Pourquoi des événements personnalisés plutôt que le suivi automatique :
 * les questions posées (cartes les plus tirées, glands/jour, packs ouverts
 * en moyenne) ne sont répondables qu'avec des événements métier — GA4 ne
 * connaît rien de « rareté » ou « recyclage » sans qu'on le lui dise.
 *
 * Chaque fonction est un no-op si `gtag` n'est pas encore chargé (bloqueur
 * de pub, script pas encore arrivé) — jamais d'erreur qui casse le jeu.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function send(name: string, params: Record<string, unknown> = {}) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, params);
  }
}

/** Un page_view par écran — nécessaire parce que react-router change l'URL
 *  sans recharger la page ; sans cet appel GA ne voit que le tout premier
 *  chargement. `index.html` désactive donc le page_view automatique
 *  (`send_page_view: false`) pour ne pas compter le premier écran deux fois. */
export function trackPageView(path: string, title: string) {
  send('page_view', { page_path: path, page_title: title });
}

/** Une carte révélée — la brique de base pour « cartes les plus tirées »,
 *  « répartition par rareté » et « répartition par type » dans GA. */
export function trackCardPulled(card: { id: number; name: string; type: string; rarity: number }, packKey: string) {
  send('card_pulled', {
    card_id: card.id,
    card_name: card.name,
    card_type: card.type,
    rarity: card.rarity,
    pack_key: packKey,
  });
}

/** Un sac ouvert — pour « packs ouverts en moyenne » (compte d'événements
 *  ÷ compte d'utilisateurs actifs, calculable directement dans GA/Looker). */
export function trackPackOpened(packKey: string, source: 'stock' | 'free_hourly') {
  send('pack_opened', { pack_key: packKey, source });
}

/** Glands gagnés — recyclage de doublons ou versement quotidien — et
 *  dépensés — achat de sac ou de dos. Séparer gain/dépense permet de suivre
 *  le solde net par jour dans GA (glands/jour = somme des `value` du jour). */
export function trackGlandsEarned(amount: number, source: 'recycle' | 'recycle_holo' | 'daily_grant') {
  send('glands_earned', { value: amount, source });
}
export function trackGlandsSpent(amount: number, item: 'pack' | 'card_back' | 'lottery', key: string) {
  send('glands_spent', { value: amount, item, key });
}

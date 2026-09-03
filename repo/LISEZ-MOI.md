# Google Analytics 4 branché

## Fichiers

| Fichier | Destination | Nature |
| --- | --- | --- |
| `index.html` | `repo/index.html` | remplace — balise gtag |
| `src/lib/analytics.ts` | `repo/src/lib/analytics.ts` | **nouveau** |
| `src/App.tsx` | `repo/src/App.tsx` | remplace — page_view par écran |
| `src/state/store.ts` | `repo/src/state/store.ts` | remplace — événements métier |

## Ce qui est suivi

| Événement GA4 | Quand | Paramètres |
| --- | --- | --- |
| `page_view` | à chaque changement d'écran (route) | `page_path`, `page_title` |
| `pack_opened` | chaque sac déchiré | `pack_key`, `source` (`stock` ou `free_hourly`) |
| `card_pulled` | chaque carte révélée (5 par sac) | `card_id`, `card_name`, `card_type`, `rarity`, `pack_key` |
| `glands_earned` | recyclage d'un doublon | `value`, `source: 'recycle'` |
| `glands_spent` | achat d'un sac ou d'un dos | `value`, `item`, `key` |

## Pourquoi le `page_view` automatique est désactivé

L'app est une SPA (react-router) : changer d'écran ne recharge jamais la
page, donc le tag `gtag.js` classique ne voit qu'un seul chargement pour
toute une session. `index.html` passe `send_page_view: false` à la config,
et `App.tsx` envoie l'événement lui-même à chaque changement de route —
sinon le premier écran serait compté deux fois.

## Répondre aux trois questions posées, dans GA

Une fois quelques jours de données accumulées (Rapports → Explorer, ou
Looker Studio connecté à la propriété) :

- **Cartes les plus tirées** — Exploration en table, dimension `card_name`
  (paramètre personnalisé de `card_pulled`), métrique « Nombre
  d'événements », trié décroissant. Ajoute `rarity` en deuxième dimension
  pour croiser avec la rareté.
- **Glands gagnés/dépensés par jour** — Exploration en série temporelle,
  dimension « Date », métrique « Valeur totale » sur `glands_earned` et
  `glands_spent` séparément (le paramètre `value` porte le montant).
- **Packs ouverts en moyenne** — nombre d'événements `pack_opened` ÷ nombre
  d'utilisateurs actifs sur la période, directement dans le rapport
  Engagement ou via une Exploration avec ces deux métriques côte à côte.

À savoir : GA4 exige de **déclarer les paramètres personnalisés comme
dimensions personnalisées** avant qu'ils n'apparaissent dans les rapports
(Admin → Définitions des données personnalisées → Créer une dimension
personnalisée, un par paramètre : `card_name`, `card_id`, `card_type`,
`rarity`, `pack_key`, `source`, `item`, `key`). Sans cette étape les
événements arrivent bien (visibles dans Rapports en temps réel /
DebugView) mais restent invisibles dans les rapports standards et les
Explorations.

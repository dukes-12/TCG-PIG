import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CARDS, PACKS, packByKey, rarityById } from '../data/catalog';
import { CARD_BACKS, DEFAULT_CARD_BACK, cardBackByKey } from '../data/cardBacks';
import { openPack } from '../lib/draw';
import { playSfx, revealSfx, setSfxEnabled } from '../lib/sfx';
import { trackCardPulled, trackGlandsEarned, trackGlandsSpent, trackPackOpened } from '../lib/analytics';
import type {
  AnimationPref,
  Card,
  CardBackKey,
  CardType,
  GridCols,
  Pack,
  PackKey,
  PackState,
  RarityId,
  SortKey,
} from '../types';

// Note: which screen is visible is owned by the router (see App.tsx), not
// this store — screens that need to switch tabs call `navigate()` alongside
// the relevant store action.

const PACK_SIZE = 5; // fixed in production (the prototype exposed 3–8 as a design-time tweak)
const TEAR_MS = 680;
const FLIP_TRANSITION_MS = 620; // matches OpenScreen's flipInner CSS transition duration
const TOAST_MS = 1700;
const SWIPE_THRESHOLD = 70;

/** Trois sachets offerts chaque jour, versés directement dans la poche.
 *
 *  L'horloge est un horodatage (`nextDailyGrantAt`), pas un compteur qui
 *  tourne : au lancement on rattrape tous les jours écoulés d'un coup, ce qui
 *  marche même si l'app est restée fermée une semaine. Le rattrapage est
 *  plafonné à `DAILY_GRANT_CATCHUP_MAX` jours — revenir après trois mois ne
 *  doit pas déverser 270 sachets. */
export const DAILY_GRANT_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const DAILY_GRANT_AMOUNT = 3;
export const DAILY_GRANT_CATCHUP_MAX = 7;
const DAILY_GRANT_PACK: PackKey = 'basic';

/** Sachets offerts au tout premier lancement. */
export const STARTER_PACKS = 5;

interface PersistedState {
  owned: Record<number, number>;
  glands: number;
  stock: Record<PackKey, number>;
  openedCount: number;
  /** Prochain versement quotidien. `null` = jamais initialisé (premier lancement). */
  nextDailyGrantAt: number | null;
  /** Dos de carte actif. */
  cardBack: CardBackKey;
  /** Dos débloqués — `sceau` l'est d'office. */
  unlockedBacks: CardBackKey[];
  /** Densité de la grille de collection. */
  gridCols: GridCols;
  /** Animations décoratives : auto (système) / on / off. */
  animPref: AnimationPref;
  /** Effets sonores (synthétisés, voir lib/sfx.ts). */
  soundOn: boolean;
}

interface UiState {
  sort: SortKey;
  rarityFilter: RarityId | 'all';
  typeFilter: CardType | 'all';
  query: string;
  ownedOnly: boolean;
  detail: number | null;
  activePack: PackKey;
  packState: PackState;
  pull: Card[];
  pullIndex: number;
  flipped: boolean;
  isNew: Record<number, true>;
  dragX: number;
  dragging: boolean;
  toast: string | null;
}

interface Actions {
  setSort: (sort: SortKey) => void;
  setRarityFilter: (r: RarityId | 'all') => void;
  setTypeFilter: (t: CardType | 'all') => void;
  setQuery: (q: string) => void;
  toggleOwnedOnly: () => void;
  openDetail: (id: number) => void;
  closeDetail: () => void;
  setCardBack: (key: CardBackKey) => void;
  setGridCols: (n: GridCols) => void;
  setAnimPref: (p: AnimationPref) => void;
  setSoundOn: (on: boolean) => void;
  buyCardBack: (key: CardBackKey) => void;

  buyPack: (key: PackKey) => void;
  selectPackForOpening: (key: PackKey) => void;
  startTear: () => void;
  backToIdle: () => void;
  reconcileDailyGrant: () => void;
  nextReveal: () => void;
  dragStart: (clientX: number) => void;
  dragMove: (clientX: number) => void;
  dragEnd: () => void;

  recycle: (cardId: number) => void;
  say: (msg: string) => void;
}

export type Store = PersistedState & UiState & Actions;

// Timer handles live outside the store (module singleton) — mirrors the
// prototype's `this._t` / `this._tt` instance fields.
let tearTimer: ReturnType<typeof setTimeout> | undefined;
let advanceTimer: ReturnType<typeof setTimeout> | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let revealTimer: ReturnType<typeof setTimeout> | undefined;
let dragStartX = 0;

/** Draws the pull, credits the collection, and kicks off the tear→reveal
 *  transition. Appelé par `startTear`, qui vérifie et décrémente la poche
 *  avant de déléguer ici. */
function beginTear(get: () => Store, set: (partial: Partial<Store>) => void, pack: Pack, source: 'stock' | 'free_hourly' = 'stock') {
  const s = get();
  const pull = openPack(pack, PACK_SIZE);
  const owned = { ...s.owned };
  const isNew: Record<number, true> = {};
  pull.forEach((c) => {
    if (!owned[c.id]) isNew[c.id] = true;
    owned[c.id] = (owned[c.id] || 0) + 1;
  });
  trackPackOpened(pack.key, source);
  pull.forEach((c) => trackCardPulled(c, pack.key));
  set({
    activePack: pack.key,
    packState: 'tearing',
    pull,
    pullIndex: 0,
    flipped: false,
    owned,
    isNew,
    openedCount: s.openedCount + 1,
    dragX: 0,
  });
  playSfx('tear');
  clearTimeout(tearTimer);
  clearTimeout(advanceTimer);
  // The first card lands face-down (flipped: false, set above) and stays
  // that way — no auto-flip. Revealing it is always an explicit tap/swipe,
  // handled by nextReveal.
  tearTimer = setTimeout(() => set({ packState: 'reveal' }), TEAR_MS);
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // ── persisted ──
      owned: {},
      glands: 0,
      stock: { basic: STARTER_PACKS, foire: 0, doree: 0 },
      openedCount: 0,
      nextDailyGrantAt: null,
      cardBack: DEFAULT_CARD_BACK,
      unlockedBacks: [DEFAULT_CARD_BACK],
      gridCols: 3,
      animPref: 'on',
      soundOn: true,

      // ── ui / session ──
      sort: 'rarete',
      rarityFilter: 'all',
      typeFilter: 'all',
      query: '',
      ownedOnly: false,
      detail: null,
      activePack: 'basic',
      packState: 'idle',
      pull: [],
      pullIndex: 0,
      flipped: false,
      isNew: {},
      dragX: 0,
      dragging: false,
      toast: null,

      // ── actions ──
      setSort: (sort) => set({ sort }),
      setRarityFilter: (rarityFilter) => set({ rarityFilter }),
      setTypeFilter: (typeFilter) => set({ typeFilter }),
      setQuery: (query) => set({ query }),
      toggleOwnedOnly: () => set((s) => ({ ownedOnly: !s.ownedOnly })),
      openDetail: (id) => set({ detail: id }),
      setGridCols: (gridCols) => set({ gridCols }),
      setAnimPref: (animPref) => set({ animPref }),
      setSoundOn: (soundOn) => {
        setSfxEnabled(soundOn);
        set({ soundOn });
      },
      closeDetail: () => set({ detail: null }),

      /** Ne change le dos que s'il est débloqué (garde-fou : un save trafiqué
       *  ou un skin retiré du catalogue ne doit pas casser la révélation). */
      setCardBack: (key) => {
        const s = get();
        if (!s.unlockedBacks.includes(key)) return;
        set({ cardBack: key });
      },

      buyCardBack: (key) => {
        const s = get();
        const skin = CARD_BACKS.find((b) => b.key === key);
        if (!skin) return;
        if (s.unlockedBacks.includes(key)) {
          set({ cardBack: key });
          return;
        }
        if (s.glands < skin.price) {
          s.say(`Pas assez de glands (${skin.price} requis).`);
          return;
        }
        set({
          glands: s.glands - skin.price,
          unlockedBacks: [...s.unlockedBacks, key],
          cardBack: key,
        });
        trackGlandsSpent(skin.price, 'card_back', key);
        playSfx('coin');
        s.say(`Dos « ${skin.name} » débloqué`);
      },

      buyPack: (key) => {
        const s = get();
        const p = packByKey(key);
        if (s.glands < p.price) {
          s.say(`Pas assez de glands (${p.price} requis).`);
          return;
        }
        set({
          glands: s.glands - p.price,
          stock: { ...s.stock, [key]: (s.stock[key] || 0) + 1 },
          activePack: key,
        });
        trackGlandsSpent(p.price, 'pack', key);
        playSfx('coin');
        s.say(`${p.name} ajouté·e`);
      },

      selectPackForOpening: (key) => set({ activePack: key, packState: 'idle' }),

      /** Retour au menu d'ouverture depuis la révélation ou le butin — sans
       *  ouvrir de nouveau sac. Coupe aussi les timers en vol (un flip ou
       *  une avance encore programmés) pour ne pas faire sauter l'état
       *  qu'on vient de quitter. */
      backToIdle: () => {
        clearTimeout(tearTimer);
        clearTimeout(advanceTimer);
        clearTimeout(revealTimer);
        set({ packState: 'idle', pull: [], pullIndex: 0, flipped: false, dragX: 0 });
      },

      startTear: () => {
        const s = get();
        const p = packByKey(s.activePack);
        if ((s.stock[p.key] || 0) <= 0) {
          s.say(`Plus de ${p.name} — passe en boutique.`);
          return;
        }
        set({ stock: { ...s.stock, [p.key]: s.stock[p.key] - 1 } });
        beginTear(get, set, p);
      },

      reconcileDailyGrant: () => {
        const s = get();
        const now = Date.now();

        // Premier lancement : la poche a déjà ses STARTER_PACKS, on amorce
        // simplement l'horloge sans rien verser.
        if (s.nextDailyGrantAt == null) {
          set({ nextDailyGrantAt: now + DAILY_GRANT_INTERVAL_MS });
          return;
        }
        if (now < s.nextDailyGrantAt) return;

        let days = 0;
        let nextAt = s.nextDailyGrantAt;
        while (now >= nextAt && days < DAILY_GRANT_CATCHUP_MAX) {
          days += 1;
          nextAt += DAILY_GRANT_INTERVAL_MS;
        }
        // Absence longue : on repart d'un cycle plein à partir de maintenant
        // plutôt que de traîner une dette de versements.
        if (now >= nextAt) nextAt = now + DAILY_GRANT_INTERVAL_MS;

        const granted = days * DAILY_GRANT_AMOUNT;
        set({
          stock: { ...s.stock, [DAILY_GRANT_PACK]: (s.stock[DAILY_GRANT_PACK] || 0) + granted },
          nextDailyGrantAt: nextAt,
        });
        s.say(`+${granted} sachet${granted > 1 ? 's' : ''} du jour`);
      },

      nextReveal: () => {
        const s = get();
        if (s.packState !== 'reveal') return;
        if (!s.flipped) {
          set({ flipped: true });
          playSfx('flip');
          // La fanfare arrive quand la carte est réellement face visible —
          // même décalage que le hook useRevealed, sinon elle annonce la
          // rareté pendant que le dos est encore face au joueur.
          clearTimeout(revealTimer);
          revealTimer = setTimeout(() => playSfx(revealSfx(s.pull[s.pullIndex]?.rarity ?? 1)), 520);
          return;
        }
        if (s.pullIndex < s.pull.length - 1) {
          // Flip the current card face-down first. Only swap in the next
          // card's art once it's fully hidden (after the flip transition),
          // so the next card is never visible before its own flip-up —
          // otherwise the new card's front face flashes for a frame while
          // still facing the viewer, spoiling the reveal. It then stays
          // face-down (no auto-flip) until tapped/swiped again.
          set({ flipped: false, dragX: 0 });
          playSfx('flip');
          clearTimeout(advanceTimer);
          advanceTimer = setTimeout(() => {
            set({ pullIndex: get().pullIndex + 1 });
          }, FLIP_TRANSITION_MS);
        } else {
          set({ packState: 'summary', dragX: 0 });
        }
      },

      dragStart: (clientX) => {
        dragStartX = clientX;
        set({ dragging: true });
      },
      dragMove: (clientX) => {
        if (!get().dragging) return;
        set({ dragX: clientX - dragStartX });
      },
      dragEnd: () => {
        const s = get();
        if (!s.dragging) return;
        set({ dragging: false });
        if (Math.abs(s.dragX) > SWIPE_THRESHOLD) {
          set({ dragX: 0 });
          get().nextReveal();
        } else {
          set({ dragX: 0 });
        }
      },

      recycle: (cardId) => {
        const s = get();
        const card = CARDS.find((c) => c.id === cardId);
        const count = s.owned[cardId] || 0;
        if (!card || count < 2) return;
        const gain = rarityById(card.rarity).recycleValue * (count - 1);
        set({ owned: { ...s.owned, [cardId]: 1 }, glands: s.glands + gain });
        trackGlandsEarned(gain, 'recycle');
        playSfx('recycle');
        s.say(`+${gain} glands`);
      },

      say: (msg) => {
        clearTimeout(toastTimer);
        set({ toast: msg });
        toastTimer = setTimeout(() => set({ toast: null }), TOAST_MS);
      },
    }),
    {
      name: 'grouin-save-v1',
      partialize: (s) => ({
        owned: s.owned,
        glands: s.glands,
        stock: s.stock,
        openedCount: s.openedCount,
        nextDailyGrantAt: s.nextDailyGrantAt,
        cardBack: s.cardBack,
        unlockedBacks: s.unlockedBacks,
        gridCols: s.gridCols,
        animPref: s.animPref,
        soundOn: s.soundOn,
      }),
      // Les saves antérieurs au système de dos n'ont ni `cardBack` ni
      // `unlockedBacks` : on les remet sur le dos par défaut plutôt que sur
      // `undefined`, sinon la face cachée ne rend plus rien.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedState>;
        const unlocked = p.unlockedBacks?.length ? p.unlockedBacks : [DEFAULT_CARD_BACK];
        const back = p.cardBack && unlocked.includes(p.cardBack) ? p.cardBack : DEFAULT_CARD_BACK;
        return { ...current, ...p, unlockedBacks: unlocked, cardBack: back, gridCols: p.gridCols ?? 3, animPref: p.animPref ?? 'on', soundOn: p.soundOn ?? true };
      },
    },
  ),
);

export function activePack(state: Pick<Store, 'activePack'>) {
  return packByKey(state.activePack);
}

export const PACK_LIST = PACKS;

/** Le skin de dos actif, résolu — pratique pour les écrans. */
export function activeCardBack(state: Pick<Store, 'cardBack'>) {
  return cardBackByKey(state.cardBack);
}

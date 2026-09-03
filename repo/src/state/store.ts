import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CARDS, PACKS, packByKey, rarityById } from '../data/catalog';
import { CARD_BACKS, DEFAULT_CARD_BACK, cardBackByKey } from '../data/cardBacks';
import { openPack } from '../lib/draw';
import type {
  Card,
  CardBackKey,
  CardType,
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

/** One free `basic` pack every hour, stacking up to 3 — the timer pauses
 *  once 3 are stacked and resumes as soon as one is opened. Timestamp-based
 *  (not a running counter) so it catches up correctly across app restarts,
 *  including several elapsed hours at once, capped at the max either way. */
export const FREE_BOOSTER_INTERVAL_MS = 60 * 60 * 1000;
export const FREE_BOOSTER_MAX = 3;
const FREE_BOOSTER_PACK: PackKey = 'basic';

interface PersistedState {
  owned: Record<number, number>;
  glands: number;
  stock: Record<PackKey, number>;
  openedCount: number;
  freeBoosters: number;
  nextFreeBoosterAt: number | null;
  /** Dos de carte actif. */
  cardBack: CardBackKey;
  /** Dos débloqués — `sceau` l'est d'office. */
  unlockedBacks: CardBackKey[];
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
  buyCardBack: (key: CardBackKey) => void;

  buyPack: (key: PackKey) => void;
  selectPackForOpening: (key: PackKey) => void;
  startTear: () => void;
  reconcileFreeBoosters: () => void;
  claimFreeBooster: () => void;
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
let dragStartX = 0;

/** Draws the pull, credits the collection, and kicks off the tear→reveal
 *  transition. Shared by `startTear` (stock-backed) and `claimFreeBooster`
 *  (free-boosters-pool-backed) — the only difference between the two is
 *  which counter they check and decrement before calling this. */
function beginTear(get: () => Store, set: (partial: Partial<Store>) => void, pack: Pack) {
  const s = get();
  const pull = openPack(pack, PACK_SIZE);
  const owned = { ...s.owned };
  const isNew: Record<number, true> = {};
  pull.forEach((c) => {
    if (!owned[c.id]) isNew[c.id] = true;
    owned[c.id] = (owned[c.id] || 0) + 1;
  });
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
      stock: { basic: 3, foire: 0, doree: 0 },
      openedCount: 0,
      freeBoosters: 0,
      nextFreeBoosterAt: null,
      cardBack: DEFAULT_CARD_BACK,
      unlockedBacks: [DEFAULT_CARD_BACK],

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
        s.say(`${p.name} ajouté·e`);
      },

      selectPackForOpening: (key) => set({ activePack: key, packState: 'idle' }),

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

      reconcileFreeBoosters: () => {
        const s = get();
        if (s.freeBoosters >= FREE_BOOSTER_MAX) {
          if (s.nextFreeBoosterAt !== null) set({ nextFreeBoosterAt: null });
          return;
        }
        const now = Date.now();
        if (s.nextFreeBoosterAt == null) {
          // Not running (fresh save, or just resumed after being capped) — start the clock.
          set({ nextFreeBoosterAt: now + FREE_BOOSTER_INTERVAL_MS });
          return;
        }
        if (now < s.nextFreeBoosterAt) return;
        let freeBoosters = s.freeBoosters;
        let nextAt = s.nextFreeBoosterAt;
        while (freeBoosters < FREE_BOOSTER_MAX && now >= nextAt) {
          freeBoosters += 1;
          nextAt += FREE_BOOSTER_INTERVAL_MS;
        }
        set({ freeBoosters, nextFreeBoosterAt: freeBoosters >= FREE_BOOSTER_MAX ? null : nextAt });
      },

      claimFreeBooster: () => {
        const s = get();
        if (s.freeBoosters <= 0) return;
        set({
          freeBoosters: s.freeBoosters - 1,
          // Resume the clock if it had stopped (we were sitting at the cap);
          // if it's still running, leave it exactly as-is.
          nextFreeBoosterAt: s.nextFreeBoosterAt ?? Date.now() + FREE_BOOSTER_INTERVAL_MS,
        });
        beginTear(get, set, packByKey(FREE_BOOSTER_PACK));
      },

      nextReveal: () => {
        const s = get();
        if (s.packState !== 'reveal') return;
        if (!s.flipped) {
          set({ flipped: true });
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
        freeBoosters: s.freeBoosters,
        nextFreeBoosterAt: s.nextFreeBoosterAt,
        cardBack: s.cardBack,
        unlockedBacks: s.unlockedBacks,
      }),
      // Les saves antérieurs au système de dos n'ont ni `cardBack` ni
      // `unlockedBacks` : on les remet sur le dos par défaut plutôt que sur
      // `undefined`, sinon la face cachée ne rend plus rien.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedState>;
        const unlocked = p.unlockedBacks?.length ? p.unlockedBacks : [DEFAULT_CARD_BACK];
        const back = p.cardBack && unlocked.includes(p.cardBack) ? p.cardBack : DEFAULT_CARD_BACK;
        return { ...current, ...p, unlockedBacks: unlocked, cardBack: back };
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

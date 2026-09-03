import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CARDS, PACKS, packByKey, rarityById } from '../data/catalog';
import { CARD_BACKS, DEFAULT_CARD_BACK, cardBackByKey } from '../data/cardBacks';
import { openPack, roll } from '../lib/draw';
import { playSfx, revealSfx, setSfxEnabled } from '../lib/sfx';
import { trackCardPulled, trackGlandsEarned, trackGlandsSpent, trackPackOpened } from '../lib/analytics';
import { apiFetchState, apiLogin, apiPushState, apiRegister, getToken, setToken } from '../lib/api';
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
const SYNC_DEBOUNCE_MS = 800;
const LEGACY_SAVE_KEY = 'grouin-save-v1';

/** Trois sachets offerts chaque jour, versés directement dans la poche. */
export const DAILY_GRANT_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const DAILY_GRANT_AMOUNT = 3;
export const DAILY_GRANT_CATCHUP_MAX = 7;
const DAILY_GRANT_PACK: PackKey = 'basic';

/** Un sac gratuit par heure, empilable jusqu'à 3 dans une réserve à part. */
export const FREE_BOOSTER_INTERVAL_MS = 60 * 60 * 1000;
export const FREE_BOOSTER_MAX = 3;
const FREE_BOOSTER_PACK: PackKey = 'basic';

/** Loterie de la boutique : une carte garantie Épique ou mieux, effet carte
 *  qui tourne pour le suspense (voir LotteryOverlay). */
export const LOTTERY_PRICE = 1000;
export const LOTTERY_FLOOR: RarityId = 4;
const LOTTERY_SPIN_MS = 1800;

/** Sachets offerts au tout premier lancement. */
export const STARTER_PACKS = 5;

interface PersistedState {
  owned: Record<number, number>;
  glands: number;
  stock: Record<PackKey, number>;
  openedCount: number;
  nextDailyGrantAt: number | null;
  freeBoosters: number;
  nextFreeBoosterAt: number | null;
  cardBack: CardBackKey;
  unlockedBacks: CardBackKey[];
  gridCols: GridCols;
  animPref: AnimationPref;
  soundOn: boolean;
}

interface UiState {
  account: string | null;
  authReady: boolean;
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
  lotteryState: 'idle' | 'spinning' | 'result';
  lotteryCard: Card | null;
  lotteryIsNew: boolean;
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
  reconcileFreeBoosters: () => void;
  claimFreeBooster: () => void;
  nextReveal: () => void;
  dragStart: (clientX: number) => void;
  dragMove: (clientX: number) => void;
  dragEnd: () => void;

  recycle: (cardId: number) => void;
  say: (msg: string) => void;

  buyLottery: () => void;
  closeLottery: () => void;

  login: (username: string, pin: string) => Promise<void>;
  register: (username: string, pin: string) => Promise<void>;
  logout: () => void;
  bootAuth: () => Promise<void>;
}

export type Store = PersistedState & UiState & Actions;

let tearTimer: ReturnType<typeof setTimeout> | undefined;
let advanceTimer: ReturnType<typeof setTimeout> | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let revealTimer: ReturnType<typeof setTimeout> | undefined;
let syncTimer: ReturnType<typeof setTimeout> | undefined;
let lotteryTimer: ReturnType<typeof setTimeout> | undefined;
let dragStartX = 0;

/** Les seuls champs qu'on synchronise avec le compte — la même forme que
 *  `partialize()` plus bas, réutilisée pour la sauvegarde serveur (voir le
 *  `subscribe` en bas de fichier) et pour amorcer un nouveau compte avec la
 *  collection déjà présente sur l'appareil. */
function persistedSlice(s: Store): PersistedState {
  return {
    owned: s.owned,
    glands: s.glands,
    stock: s.stock,
    openedCount: s.openedCount,
    nextDailyGrantAt: s.nextDailyGrantAt,
    freeBoosters: s.freeBoosters,
    nextFreeBoosterAt: s.nextFreeBoosterAt,
    cardBack: s.cardBack,
    unlockedBacks: s.unlockedBacks,
    gridCols: s.gridCols,
    animPref: s.animPref,
    soundOn: s.soundOn,
  };
}

/** Fusionne un état venu du serveur sur l'état courant — mêmes garde-fous que
 *  l'ancien `merge` de zustand/persist (dos par défaut si absent/invalide). */
function mergeServer(current: Store, incoming: Partial<PersistedState>): Partial<Store> {
  const unlocked = incoming.unlockedBacks?.length ? incoming.unlockedBacks : [DEFAULT_CARD_BACK];
  const back = incoming.cardBack && unlocked.includes(incoming.cardBack) ? incoming.cardBack : DEFAULT_CARD_BACK;
  return {
    ...incoming,
    unlockedBacks: unlocked,
    cardBack: back,
    gridCols: incoming.gridCols ?? current.gridCols,
    animPref: incoming.animPref ?? current.animPref,
    soundOn: incoming.soundOn ?? current.soundOn,
    stock: incoming.stock ?? current.stock,
    owned: incoming.owned ?? current.owned,
  };
}

/** La collection locale d'avant les comptes (`grouin-save-v1`, écrite par
 *  l'ancien zustand/persist) — lue une seule fois à l'inscription pour
 *  amorcer le compte avec ce qui existe déjà sur l'appareil. */
function readLegacyLocalSave(): Partial<PersistedState> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: Partial<PersistedState> };
    return parsed.state ?? null;
  } catch {
    return null;
  }
}

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
  tearTimer = setTimeout(() => set({ packState: 'reveal' }), TEAR_MS);
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // ── persisted (miroir local — la source de vérité est le compte) ──
      owned: {},
      glands: 0,
      stock: { basic: STARTER_PACKS, foire: 0, doree: 0 },
      openedCount: 0,
      nextDailyGrantAt: null,
      freeBoosters: 0,
      nextFreeBoosterAt: null,
      cardBack: DEFAULT_CARD_BACK,
      unlockedBacks: [DEFAULT_CARD_BACK],
      gridCols: 3,
      animPref: 'on',
      soundOn: true,

      // ── ui / session ──
      account: null,
      authReady: false,
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
      lotteryState: 'idle',
      lotteryCard: null,
      lotteryIsNew: false,

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
        set({ glands: s.glands - skin.price, unlockedBacks: [...s.unlockedBacks, key], cardBack: key });
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
        set({ glands: s.glands - p.price, stock: { ...s.stock, [key]: (s.stock[key] || 0) + 1 }, activePack: key });
        trackGlandsSpent(p.price, 'pack', key);
        playSfx('coin');
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

      backToIdle: () => {
        clearTimeout(tearTimer);
        clearTimeout(advanceTimer);
        clearTimeout(revealTimer);
        set({ packState: 'idle', pull: [], pullIndex: 0, flipped: false, dragX: 0 });
      },

      reconcileDailyGrant: () => {
        const s = get();
        const now = Date.now();
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
        if (now >= nextAt) nextAt = now + DAILY_GRANT_INTERVAL_MS;
        const granted = days * DAILY_GRANT_AMOUNT;
        set({ stock: { ...s.stock, [DAILY_GRANT_PACK]: (s.stock[DAILY_GRANT_PACK] || 0) + granted }, nextDailyGrantAt: nextAt });
        s.say(`+${granted} sachet${granted > 1 ? 's' : ''} du jour`);
      },

      reconcileFreeBoosters: () => {
        const s = get();
        if (s.freeBoosters >= FREE_BOOSTER_MAX) {
          if (s.nextFreeBoosterAt !== null) set({ nextFreeBoosterAt: null });
          return;
        }
        const now = Date.now();
        if (s.nextFreeBoosterAt == null) {
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
        set({ freeBoosters: s.freeBoosters - 1, nextFreeBoosterAt: s.nextFreeBoosterAt ?? Date.now() + FREE_BOOSTER_INTERVAL_MS });
        beginTear(get, set, packByKey(FREE_BOOSTER_PACK), 'free_hourly');
      },

      nextReveal: () => {
        const s = get();
        if (s.packState !== 'reveal') return;
        if (!s.flipped) {
          set({ flipped: true });
          playSfx('flip');
          clearTimeout(revealTimer);
          revealTimer = setTimeout(() => playSfx(revealSfx(s.pull[s.pullIndex]?.rarity ?? 1)), 520);
          return;
        }
        if (s.pullIndex < s.pull.length - 1) {
          set({ flipped: false, dragX: 0 });
          playSfx('flip');
          clearTimeout(advanceTimer);
          advanceTimer = setTimeout(() => set({ pullIndex: get().pullIndex + 1 }), FLIP_TRANSITION_MS);
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

      // ── loterie ──
      buyLottery: () => {
        const s = get();
        if (s.glands < LOTTERY_PRICE) {
          s.say(`Pas assez de glands (${LOTTERY_PRICE} requis).`);
          return;
        }
        set({ glands: s.glands - LOTTERY_PRICE, lotteryState: 'spinning', lotteryCard: null, lotteryIsNew: false });
        trackGlandsSpent(LOTTERY_PRICE, 'lottery', 'lottery');
        playSfx('coin');
        clearTimeout(lotteryTimer);
        lotteryTimer = setTimeout(() => {
          const s2 = get();
          const card = roll(LOTTERY_FLOOR);
          const wasOwned = !!s2.owned[card.id];
          const owned = { ...s2.owned, [card.id]: (s2.owned[card.id] || 0) + 1 };
          set({ owned, lotteryCard: card, lotteryIsNew: !wasOwned, lotteryState: 'result', openedCount: s2.openedCount + 1 });
          trackCardPulled(card, 'lottery');
          playSfx(revealSfx(card.rarity));
        }, LOTTERY_SPIN_MS);
      },

      closeLottery: () => {
        clearTimeout(lotteryTimer);
        set({ lotteryState: 'idle', lotteryCard: null, lotteryIsNew: false });
      },

      // ── compte ──
      bootAuth: async () => {
        const token = getToken();
        if (!token) {
          set({ authReady: true });
          return;
        }
        try {
          // On a besoin du pseudo pour l'affichage — la réponse de /state ne
          // le porte pas, donc on ne connaît le compte que par la présence
          // d'un jeton valide ; le pseudo réel arrive au prochain login. On
          // le retrouve simplement en le gardant côté client (voir login/
          // register qui l'écrivent) : s'il manque après un refresh (nouvel
          // onglet), on retombe sur "Éleveur" générique plutôt que de
          // bloquer l'app.
          const res = await apiFetchState();
          set({ ...mergeServer(get(), res.state), account: get().account ?? 'Éleveur', authReady: true });
        } catch {
          setToken(null);
          set({ authReady: true });
        }
      },

      login: async (username, pin) => {
        const res = await apiLogin(username, pin);
        setToken(res.token);
        set({ ...mergeServer(get(), res.state), account: res.username });
      },

      register: async (username, pin) => {
        const legacy = readLegacyLocalSave();
        const res = await apiRegister(username, pin, legacy ?? persistedSlice(get()));
        setToken(res.token);
        set({ ...mergeServer(get(), res.state), account: res.username });
      },

      logout: () => {
        setToken(null);
        set({ account: null });
      },
    }),
    {
      name: 'grouin-save-v1',
      partialize: (s) => ({ ...persistedSlice(s), account: s.account }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedState> & { account?: string | null };
        const merged = mergeServer(current, p);
        return { ...current, ...merged, account: p.account ?? null };
      },
    },
  ),
);

/** Pousse l'état persistable au compte, avec un léger débounce — évite un
 *  appel réseau à chaque frame pendant, par ex., le glissement d'une carte
 *  (`dragX` change à chaque pointermove, mais n'est pas un champ persisté :
 *  seul un changement de `persistedSlice` déclenche un envoi). */
let lastPushed = '';
useStore.subscribe((state) => {
  if (!state.account) return;
  const snap = JSON.stringify(persistedSlice(state));
  if (snap === lastPushed) return;
  lastPushed = snap;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    apiPushState(JSON.parse(snap)).catch(() => {});
  }, SYNC_DEBOUNCE_MS);
});

export function activePack(state: Pick<Store, 'activePack'>) {
  return packByKey(state.activePack);
}

export const PACK_LIST = PACKS;

export function activeCardBack(state: Pick<Store, 'cardBack'>) {
  return cardBackByKey(state.cardBack);
}

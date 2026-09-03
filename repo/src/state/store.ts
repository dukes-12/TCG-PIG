import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CARDS, PACKS, packByKey, rarityById } from '../data/catalog';
import { CARD_BACKS, DEFAULT_CARD_BACK, cardBackByKey } from '../data/cardBacks';
import { DEFAULT_AVATAR } from '../data/avatars';
import { openPack, roll } from '../lib/draw';
import { playSfx, revealSfx, setSfxEnabled } from '../lib/sfx';
import { trackCardPulled, trackGlandsEarned, trackGlandsSpent, trackPackOpened } from '../lib/analytics';
import {
  apiFetchMailbox,
  apiFetchState,
  apiFetchTrades,
  apiLogin,
  apiMarkMailboxRead,
  apiPushState,
  apiRegister,
  getToken,
  setToken,
  type MailboxMessage,
} from '../lib/api';
import type {
  AnimationPref,
  AvatarKey,
  Card,
  CardBackKey,
  CardType,
  GridCols,
  Pack,
  PackKey,
  PackState,
  RarityId,
  SortKey,
  WheelState,
} from '../types';

// Note: which screen is visible is owned by the router (see App.tsx), not
// this store — screens that need to switch tabs call `navigate()` alongside
// the relevant store action.

// Le nombre de cartes est désormais lu sur chaque pack (`pack.cards`) —
// jusqu'ici toujours 5 pour les trois, la rareté et le nombre de cartes
// garanties variaient sans que la taille du sac suive. Voir cards.json.
/** Ouverture groupée : jusqu'à MAX_OPEN_QTY sacs du même type d'un coup.
 *  Plafonné pour que la rangée de pastilles de progression pendant la
 *  révélation (une par carte, voir OpenScreen) reste lisible sur mobile. */
export const MAX_OPEN_QTY = 5;
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

/** Roue de la chance : 3 essais gratuits, rechargés toutes les 24 h. Une
 *  victoire (1 chance sur 3) ajoute un Sac de glands en poche ; une défaite
 *  n'affiche qu'un message pour la peine. */
export const WHEEL_SPINS_MAX = 3;
export const WHEEL_RESET_INTERVAL_MS = 24 * 60 * 60 * 1000;
const WHEEL_WIN_CHANCE = 1 / 3;
const WHEEL_SPIN_MS = 1800;
const WHEEL_PACK: PackKey = 'basic';

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
  avatar: AvatarKey;
  /** Photo de profil choisie dans la galerie de l'appareil — data URI JPEG
   *  déjà compressée (voir lib/photo.ts), prioritaire sur `avatar` quand
   *  elle est définie. `null` = pas de photo, on retombe sur le préréglage. */
  avatarPhoto: string | null;
  gridCols: GridCols;
  animPref: AnimationPref;
  soundOn: boolean;
  wheelSpins: number;
  nextWheelResetAt: number | null;
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
  openQty: number;
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
  wheelState: WheelState;
  wheelWon: boolean;
  mailbox: MailboxMessage[];
  mailboxUnread: number;
  /** Propositions d'échange entrantes en attente — voir TradesScreen et la
   *  pastille sur l'onglet Échanges de TabBar. */
  tradesUnread: number;
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
  setAvatar: (key: AvatarKey) => void;
  setAvatarPhoto: (dataUri: string | null) => void;
  setGridCols: (n: GridCols) => void;
  setAnimPref: (p: AnimationPref) => void;
  setSoundOn: (on: boolean) => void;
  buyCardBack: (key: CardBackKey) => void;

  buyPack: (key: PackKey) => void;
  selectPackForOpening: (key: PackKey) => void;
  setOpenQty: (n: number) => void;
  startTear: () => void;
  revealAll: () => void;
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

  spinWheel: () => void;
  closeWheel: () => void;
  reconcileWheel: () => void;

  fetchMailbox: () => Promise<void>;
  markMailboxRead: (ids: number[]) => Promise<void>;

  setTradesUnread: (n: number) => void;
  fetchTradesUnread: () => Promise<void>;

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
let wheelTimer: ReturnType<typeof setTimeout> | undefined;
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
    avatar: s.avatar,
    avatarPhoto: s.avatarPhoto,
    gridCols: s.gridCols,
    animPref: s.animPref,
    soundOn: s.soundOn,
    wheelSpins: s.wheelSpins,
    nextWheelResetAt: s.nextWheelResetAt,
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
    avatar: incoming.avatar ?? current.avatar,
    // `??` ne convient pas ici : `null` est une valeur légitime ("pas de
    // photo", volontairement effacée) à distinguer du champ simplement
    // absent (compte créé avant cet ajout) — d'où le test explicite sur la
    // présence de la clé plutôt qu'un `?? current...` qui écraserait un
    // retrait de photo volontaire par l'ancienne valeur locale.
    avatarPhoto: 'avatarPhoto' in incoming ? (incoming.avatarPhoto ?? null) : current.avatarPhoto,
    gridCols: incoming.gridCols ?? current.gridCols,
    animPref: incoming.animPref ?? current.animPref,
    soundOn: incoming.soundOn ?? current.soundOn,
    stock: incoming.stock ?? current.stock,
    owned: incoming.owned ?? current.owned,
    wheelSpins: incoming.wheelSpins ?? current.wheelSpins,
    nextWheelResetAt: incoming.nextWheelResetAt ?? current.nextWheelResetAt,
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

function beginTear(get: () => Store, set: (partial: Partial<Store>) => void, pack: Pack, source: 'stock' | 'free_hourly' = 'stock', qty = 1) {
  const s = get();
  // Chaque sac tire son propre `openPack()` — sa garantie éventuelle
  // (guaranteedFloor) s'applique donc à *chaque* sac du lot, pas une seule
  // fois pour tout le paquet groupé.
  const pull = Array.from({ length: qty }, () => openPack(pack, pack.cards)).flat();
  const owned = { ...s.owned };
  const isNew: Record<number, true> = {};
  pull.forEach((c) => {
    if (!owned[c.id]) isNew[c.id] = true;
    owned[c.id] = (owned[c.id] || 0) + 1;
  });
  for (let i = 0; i < qty; i++) trackPackOpened(pack.key, source);
  pull.forEach((c) => trackCardPulled(c, pack.key));
  set({
    activePack: pack.key,
    packState: 'tearing',
    pull,
    pullIndex: 0,
    flipped: false,
    owned,
    isNew,
    openedCount: s.openedCount + qty,
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
      avatar: DEFAULT_AVATAR,
      avatarPhoto: null,
      gridCols: 3,
      animPref: 'on',
      soundOn: true,
      wheelSpins: WHEEL_SPINS_MAX,
      nextWheelResetAt: null,

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
      openQty: 1,
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
      wheelState: 'idle',
      wheelWon: false,
      mailbox: [],
      mailboxUnread: 0,
      tradesUnread: 0,

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

      setAvatar: (avatar) => set({ avatar }),
      setAvatarPhoto: (avatarPhoto) => set({ avatarPhoto }),

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

      selectPackForOpening: (key) => set({ activePack: key, packState: 'idle', openQty: 1 }),

      setOpenQty: (n) => {
        const s = get();
        const inPocket = s.stock[s.activePack] || 0;
        set({ openQty: Math.max(1, Math.min(n, MAX_OPEN_QTY, inPocket || 1)) });
      },

      startTear: () => {
        const s = get();
        const p = packByKey(s.activePack);
        const inPocket = s.stock[p.key] || 0;
        if (inPocket <= 0) {
          s.say(`Plus de ${p.name} — passe en boutique.`);
          return;
        }
        const qty = Math.max(1, Math.min(s.openQty, MAX_OPEN_QTY, inPocket));
        set({ stock: { ...s.stock, [p.key]: inPocket - qty } });
        beginTear(get, set, p, 'stock', qty);
      },

      // Passe directement au butin, sans retourner les cartes une par une —
      // utile pour un gros lot groupé (voir startTear/openQty). Les cartes
      // sont déjà résolues (owned/isNew) au moment du tirage dans beginTear,
      // cet écran n'est qu'une mise en scène : la sauter ne change rien au
      // résultat, juste à la façon dont on le découvre.
      revealAll: () => {
        clearTimeout(tearTimer);
        clearTimeout(advanceTimer);
        clearTimeout(revealTimer);
        set({ packState: 'summary', dragX: 0 });
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

      // ── roue de la chance ──
      spinWheel: () => {
        const s = get();
        if (s.wheelSpins <= 0) {
          s.say('Plus d’essai — reviens demain.');
          return;
        }
        const remaining = s.wheelSpins - 1;
        set({
          wheelSpins: remaining,
          // Le compte à rebours ne démarre qu'au dernier essai consommé —
          // les essais suivants dans la même fenêtre ne le repoussent pas.
          nextWheelResetAt: remaining <= 0 ? Date.now() + WHEEL_RESET_INTERVAL_MS : s.nextWheelResetAt,
          wheelState: 'spinning',
        });
        playSfx('flip');
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => {
          const won = Math.random() < WHEEL_WIN_CHANCE;
          if (won) {
            const s2 = get();
            const p = packByKey(WHEEL_PACK);
            set({ stock: { ...s2.stock, [WHEEL_PACK]: (s2.stock[WHEEL_PACK] || 0) + 1 }, wheelWon: true, wheelState: 'result' });
            playSfx('coin');
            get().say(`${p.name} gagné·e !`);
          } else {
            set({ wheelWon: false, wheelState: 'result' });
            playSfx('recycle');
          }
        }, WHEEL_SPIN_MS);
      },

      closeWheel: () => {
        clearTimeout(wheelTimer);
        set({ wheelState: 'idle' });
      },

      reconcileWheel: () => {
        const s = get();
        if (s.nextWheelResetAt == null) return;
        if (Date.now() < s.nextWheelResetAt) return;
        set({ wheelSpins: WHEEL_SPINS_MAX, nextWheelResetAt: null });
      },

      // ── boîte aux lettres ──
      fetchMailbox: async () => {
        if (!get().account) return;
        try {
          const res = await apiFetchMailbox();
          set({ mailbox: res.messages, mailboxUnread: res.unread });
        } catch {
          // Silencieux — un échec de sondage périodique ne doit pas spammer de toast.
        }
      },

      markMailboxRead: async (ids) => {
        if (ids.length === 0) return;
        const s = get();
        const idSet = new Set(ids);
        set({
          mailbox: s.mailbox.map((m) => (idSet.has(m.id) ? { ...m, read_at: m.read_at ?? Date.now() } : m)),
          mailboxUnread: Math.max(0, s.mailboxUnread - ids.filter((id) => s.mailbox.find((m) => m.id === id)?.read_at == null).length),
        });
        try {
          await apiMarkMailboxRead(ids);
        } catch {
          // L'état local reste "lu" même si l'appel échoue — au pire on re-marque
          // au prochain fetchMailbox, jamais bloquant pour le joueur.
        }
      },

      // ── échanges (juste la pastille — le reste vit dans TradesScreen) ──
      setTradesUnread: (tradesUnread) => set({ tradesUnread }),

      fetchTradesUnread: async () => {
        if (!get().account) return;
        try {
          const res = await apiFetchTrades();
          set({ tradesUnread: res.trades.filter((t) => t.direction === 'incoming' && t.status === 'pending').length });
        } catch {
          // Sondage périodique — échec silencieux, comme fetchMailbox.
        }
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
        set({ account: null, mailbox: [], mailboxUnread: 0, tradesUnread: 0 });
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

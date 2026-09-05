import { CARD_META } from './cardMeta';

/** Système de combat — voir IDEES_AMIS_COMBAT.md pour la conception
 *  complète. Résumé : puissance dérivée de la rareté (échelle doublée par
 *  palier), +50% si la carte est en holo, bonus d'équipe si 3+ cartes
 *  partagent la même catégorie ; résolution en 5 duels slot à slot avec un
 *  peu de variance (±10%) tirée d'une graine dérivée de l'id du combat —
 *  reproductible, calculée ici (jamais côté client) pour ne pas pouvoir
 *  tricher sur le résultat. Deux mécaniques stratégiques s'ajoutent à la
 *  puissance brute (sinon "empiler ses meilleures cartes" suffit toujours à
 *  gagner) : le **triangle de camps** (contre-jeu par catégorie) et le
 *  **momentum** (récompense l'ordre des cartes dans l'équipe). */

const SECRET_RARITY_ID = 7;

const RARITY_POWER: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16, 6: 32 };

/** Triangle de camps — 3 regroupements thématiques des ~28 catégories de
 *  cartes, façon pierre-papier-ciseaux : Fiction bat Pouvoir bat Culture
 *  bat Fiction. "Mystère" (carte secrète) n'apparaît pas : elle est déjà
 *  exclue du combat par ailleurs.
 *  - Fiction : univers imaginaires / œuvres de fiction.
 *  - Pouvoir : figures d'autorité ou d'influence réelle.
 *  - Culture : savoir, matière, quotidien — ce qui reste. */
export type Camp = 'fiction' | 'pouvoir' | 'culture';

const TYPE_CAMP: Record<string, Camp> = {
  'Super-héros': 'fiction',
  'Harry Potter': 'fiction',
  YuGiOh: 'fiction',
  Fantastique: 'fiction',
  'One Piece': 'fiction',
  'Star Wars': 'fiction',
  'Jeux-vidéo': 'fiction',
  Mangas: 'fiction',
  BD: 'fiction',
  Mythologie: 'fiction',
  'Dragon Ball': 'fiction',
  Pokemon: 'fiction',
  Film: 'fiction',
  Série: 'fiction',
  Simpson: 'fiction',
  Politiques: 'pouvoir',
  Religion: 'pouvoir',
  Dictateurs: 'pouvoir',
  Métiers: 'pouvoir',
  Célébrités: 'pouvoir',
  Sapeurs: 'pouvoir',
  Humains: 'pouvoir',
  Art: 'culture',
  Fruits: 'culture',
  Meme: 'culture',
  Graille: 'culture',
  'Eléments chimique': 'culture',
  'Hors catégorie': 'culture',
};

/** `beats[a] === b` : le camp `a` a l'avantage sur le camp `b`. */
const CAMP_BEATS: Record<Camp, Camp> = { fiction: 'pouvoir', pouvoir: 'culture', culture: 'fiction' };

/** Multiplicateur de puissance pour la carte dont le camp a l'avantage sur
 *  celui de l'adversaire. Calibré (voir tests) pour qu'une carte avantagée
 *  gagne toujours à puissance égale ou inférieure, redevienne un vrai coup
 *  de dés face à une carte un palier de rareté au-dessus (Commune=1 …
 *  Mythique=32, x2 par palier), et perde quand même face à un écart de
 *  deux paliers ou plus — le contre-jeu compense un désavantage, il ne
 *  l'annule pas contre n'importe quoi. */
const CAMP_ADVANTAGE_MULTIPLIER = 2;

/** Bonus de "lancée" : gagner un duel donne ce bonus de puissance à la
 *  carte suivante de la même équipe (récompense l'ordre choisi, pas
 *  seulement la force brute des cartes). Ne s'accumule pas au-delà d'un
 *  duel : c'est bien la victoire du duel *précédent* qui compte, pas une
 *  série. */
const MOMENTUM_BONUS = 0.12;

export function campOf(cardId: number): Camp | null {
  const meta = CARD_META[cardId];
  if (!meta) return null;
  return TYPE_CAMP[meta.type] ?? null;
}

export interface TeamSlot {
  cardId: number;
  holo: boolean;
}

/** `null` si la carte n'existe pas ou est la carte secrète (exclue du
 *  combat — un seul exemplaire au monde, ça mettrait une pression écrasante
 *  sur qui l'a). */
export function cardPower(cardId: number, holo: boolean): number | null {
  const meta = CARD_META[cardId];
  if (!meta || meta.rarity === SECRET_RARITY_ID) return null;
  const base = RARITY_POWER[meta.rarity] ?? 0;
  return holo ? Math.round(base * 1.5) : base;
}

export interface TeamPower {
  base: number;
  synergyBonus: number;
  total: number;
}

export function teamPower(team: TeamSlot[]): TeamPower {
  const base = team.reduce((sum, s) => sum + (cardPower(s.cardId, s.holo) ?? 0), 0);
  const typeCounts = new Map<string, number>();
  for (const s of team) {
    const meta = CARD_META[s.cardId];
    if (!meta) continue;
    typeCounts.set(meta.type, (typeCounts.get(meta.type) ?? 0) + 1);
  }
  const maxSameType = Math.max(0, ...typeCounts.values());
  const synergyBonus = maxSameType >= 3 ? 0.15 : 0;
  return { base, synergyBonus, total: Math.round(base * (1 + synergyBonus)) };
}

// Mulberry32 — petit PRNG déterministe (même graine → même suite), pas
// besoin de plus pour un jitter de combat reproductible.
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DuelResult {
  slot: number;
  challengerCardId: number;
  opponentCardId: number;
  challengerPower: number;
  opponentPower: number;
  challengerCamp: Camp | null;
  opponentCamp: Camp | null;
  challengerCampAdvantage: boolean;
  opponentCampAdvantage: boolean;
  challengerMomentum: boolean;
  opponentMomentum: boolean;
  winner: 'challenger' | 'opponent' | 'tie';
}

export interface BattleResult {
  duels: DuelResult[];
  challengerRoundsWon: number;
  opponentRoundsWon: number;
  challengerTotalPower: number;
  opponentTotalPower: number;
  challengerSynergyBonus: number;
  opponentSynergyBonus: number;
  winner: 'challenger' | 'opponent' | 'tie';
}

/** `battleId` sert de graine — un combat rejoué (ex. affiché à nouveau plus
 *  tard) donne toujours le même résultat, sans avoir à le stocker en plus
 *  du texte des deux équipes (on le stocke quand même, voir schema.sql,
 *  pour ne pas dépendre d'une recomposition à l'identique de CARD_META si
 *  jamais une carte change de rareté après coup). */
export function resolveBattle(battleId: number, challengerTeam: TeamSlot[], opponentTeam: TeamSlot[]): BattleResult {
  const rand = mulberry32(battleId);
  const duels: DuelResult[] = [];
  let challengerRoundsWon = 0;
  let opponentRoundsWon = 0;
  let prevWinner: DuelResult['winner'] | null = null;

  for (let i = 0; i < Math.min(challengerTeam.length, opponentTeam.length); i++) {
    const c = challengerTeam[i];
    const o = opponentTeam[i];
    const cCamp = campOf(c.cardId);
    const oCamp = campOf(o.cardId);
    const cCampAdvantage = cCamp !== null && oCamp !== null && CAMP_BEATS[cCamp] === oCamp;
    const oCampAdvantage = oCamp !== null && cCamp !== null && CAMP_BEATS[oCamp] === cCamp;
    const cMomentum = prevWinner === 'challenger';
    const oMomentum = prevWinner === 'opponent';

    let cRoll = (cardPower(c.cardId, c.holo) ?? 0) * (0.9 + rand() * 0.2);
    let oRoll = (cardPower(o.cardId, o.holo) ?? 0) * (0.9 + rand() * 0.2);
    if (cCampAdvantage) cRoll *= CAMP_ADVANTAGE_MULTIPLIER;
    if (oCampAdvantage) oRoll *= CAMP_ADVANTAGE_MULTIPLIER;
    if (cMomentum) cRoll *= 1 + MOMENTUM_BONUS;
    if (oMomentum) oRoll *= 1 + MOMENTUM_BONUS;

    let winner: DuelResult['winner'] = 'tie';
    if (cRoll > oRoll) winner = 'challenger';
    else if (oRoll > cRoll) winner = 'opponent';
    if (winner === 'challenger') challengerRoundsWon++;
    if (winner === 'opponent') opponentRoundsWon++;
    duels.push({
      slot: i,
      challengerCardId: c.cardId,
      opponentCardId: o.cardId,
      challengerPower: Math.round(cRoll),
      opponentPower: Math.round(oRoll),
      challengerCamp: cCamp,
      opponentCamp: oCamp,
      challengerCampAdvantage: cCampAdvantage,
      opponentCampAdvantage: oCampAdvantage,
      challengerMomentum: cMomentum,
      opponentMomentum: oMomentum,
      winner,
    });
    prevWinner = winner;
  }

  const cTeam = teamPower(challengerTeam);
  const oTeam = teamPower(opponentTeam);
  let winner: BattleResult['winner'] = 'tie';
  if (challengerRoundsWon > opponentRoundsWon) winner = 'challenger';
  else if (opponentRoundsWon > challengerRoundsWon) winner = 'opponent';
  else if (cTeam.total > oTeam.total) winner = 'challenger';
  else if (oTeam.total > cTeam.total) winner = 'opponent';

  return {
    duels,
    challengerRoundsWon,
    opponentRoundsWon,
    challengerTotalPower: cTeam.total,
    opponentTotalPower: oTeam.total,
    challengerSynergyBonus: cTeam.synergyBonus,
    opponentSynergyBonus: oTeam.synergyBonus,
    winner,
  };
}

/** Juste la forme (5 entrées `{cardId: number, holo: boolean}`) — ne
 *  vérifie ni la possession ni les doublons, voir `teamError` pour ça. */
export function isTeamShape(team: unknown): team is TeamSlot[] {
  if (!Array.isArray(team) || team.length !== 5) return false;
  return team.every((s) => {
    if (typeof s !== 'object' || s === null) return false;
    const o = s as Record<string, unknown>;
    return typeof o.cardId === 'number' && typeof o.holo === 'boolean';
  });
}

/** Revérifie une équipe contre la vraie collection du joueur (jamais fait
 *  confiance au seul client) : 5 cartes distinctes, aucune n'est la carte
 *  secrète, et il possède bien chacune sous la forme demandée (classique ou
 *  holo — deux collections indépendantes, voir HOLO_CHANCE côté client).
 *  `null` si tout va bien, sinon un message d'erreur prêt à renvoyer. */
export function teamError(team: TeamSlot[], owned: Record<string, number>, ownedHolo: Record<string, number>): string | null {
  const seen = new Set<number>();
  for (const s of team) {
    if (seen.has(s.cardId)) return 'Une équipe ne peut pas avoir deux fois la même carte.';
    seen.add(s.cardId);
    const meta = CARD_META[s.cardId];
    if (!meta || meta.rarity === SECRET_RARITY_ID) return 'Carte invalide dans l\'équipe.';
    const count = (s.holo ? ownedHolo : owned)[String(s.cardId)] || 0;
    if (count <= 0) return `Tu ne possèdes pas cette carte${s.holo ? ' en holo' : ''}.`;
  }
  return null;
}

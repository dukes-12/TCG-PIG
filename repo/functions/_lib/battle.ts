import { CARD_META } from './cardMeta';

/** Système de combat — voir IDEES_AMIS_COMBAT.md pour la conception
 *  complète. Chaque carte a deux stats, ATTAQUE et DÉFENSE, dérivées
 *  indépendamment de sa rareté (échelle doublée par palier) et tirées une
 *  fois pour toutes via un hash déterministe de son id — pas stocké, jamais
 *  re-tiré, recalculé à la volée comme l'ancien `cardPower`. +50% (les
 *  deux stats) si la carte est en holo. Bonus d'équipe si 3+ cartes
 *  partagent la même catégorie ; résolution en 5 duels slot à slot avec un
 *  peu de variance (±10%, ATTAQUE seulement) tirée d'une graine dérivée de
 *  l'id du combat — reproductible, calculée ici (jamais côté client) pour
 *  ne pas pouvoir tricher sur le résultat. Deux mécaniques stratégiques
 *  s'ajoutent à la puissance brute (sinon "empiler ses meilleures cartes"
 *  suffit toujours à gagner) : le **triangle de camps** (contre-jeu par
 *  catégorie) et le **momentum** (récompense l'ordre des cartes dans
 *  l'équipe) — toutes deux appliquées à l'ATTAQUE uniquement (un avantage
 *  ou une lancée fait taper plus fort, pas devenir plus solide). */

const SECRET_RARITY_ID = 7;

const RARITY_POWER: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16, 6: 32 };

/** ATTAQUE et DÉFENSE d'une carte, tirées chacune INDÉPENDAMMENT (±35%
 *  autour de sa puissance de rareté) plutôt que de sommer à un total fixe.
 *  C'est délibéré et pas juste esthétique : si les deux stats étaient
 *  forcées à sommer à une valeur constante, le "profil" attaque/défense
 *  d'une carte n'aurait mathématiquement AUCUN effet sur qui gagne un duel
 *  entre deux cartes de même rareté — quelle que soit la formule de
 *  résolution symétrique utilisée (la différence ATTAQUE-DÉFENSE d'un côté
 *  moins l'autre se ramène toujours à comparer les totaux, qui sont égaux
 *  par construction). Des tirages indépendants, si : deux cartes de même
 *  rareté peuvent avoir des profils "attaque", "défense" ou "équilibré"
 *  qui s'affrontent différemment selon la résolution en "percée" plus bas.
 *  Vérifié par simulation : à rareté égale, le profil seul tranche ~47%
 *  des duels (contre ~0% avec l'ancien système à puissance unique). */
function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export interface CardStats {
  atk: number;
  def: number;
}

/** `null` si la carte n'existe pas ou est la carte secrète (exclue du
 *  combat — un seul exemplaire au monde, ça mettrait une pression écrasante
 *  sur qui l'a). */
export function cardStats(cardId: number, holo: boolean): CardStats | null {
  const meta = CARD_META[cardId];
  if (!meta || meta.rarity === SECRET_RARITY_ID) return null;
  const base = RARITY_POWER[meta.rarity] ?? 0;
  const P = holo ? base * 1.5 : base;
  const atk = Math.max(1, Math.round(P * (0.65 + hash01(`${cardId}:atk`) * 0.7)));
  const def = Math.max(1, Math.round(P * (0.65 + hash01(`${cardId}:def`) * 0.7)));
  return { atk, def };
}

/** Triangle de camps — 3 regroupements thématiques des ~28 catégories de
 *  cartes, façon pierre-papier-ciseaux. "Mystère" (carte secrète)
 *  n'apparaît pas : elle est déjà exclue du combat par ailleurs.
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

/** `beats[a] === b` : le camp `a` a l'avantage sur le camp `b`.
 *
 *  Rééquilibrage : Fiction est en moyenne le camp le plus fort (puissance
 *  moyenne 5,11 sur ses 107 cartes, contre 4,42 pour Culture et 3,61 pour
 *  Pouvoir, le plus faible) — le premier sens retenu (Fiction bat Pouvoir)
 *  cumulait l'écart de puissance ET l'avantage de camp sur le même camp
 *  déjà le plus faible. Sens inversé : c'est maintenant le plus faible
 *  (Pouvoir) qui a l'avantage sur le plus fort (Fiction), qui l'a sur le
 *  camp du milieu (Culture), qui l'a sur le plus faible — chaque camp
 *  n'encaisse plus qu'un seul écart de puissance "naturel" au lieu de deux
 *  qui se cumulent dans le même sens. */
const CAMP_BEATS: Record<Camp, Camp> = { fiction: 'culture', culture: 'pouvoir', pouvoir: 'fiction' };

/** Multiplicateur d'ATTAQUE pour la carte dont le camp a l'avantage sur
 *  celui de l'adversaire. Calibré par simulation sur le vrai catalogue
 *  (résolution en "percée", voir plus bas) pour qu'une carte avantagée
 *  gagne quasi systématiquement à rareté égale (~100%), redevienne un vrai
 *  coup de dés face à un palier de rareté au-dessus (~59% de victoires),
 *  et reste sans effet réel face à deux paliers ou plus (~0%) — le
 *  contre-jeu compense un désavantage, il ne l'annule pas contre
 *  n'importe quoi. */
const CAMP_ADVANTAGE_MULTIPLIER = 3.5;

/** Multiplicateur d'ATTAQUE pour la carte suivante de la même équipe après
 *  une victoire de duel (récompense l'ordre choisi, pas seulement la force
 *  brute des cartes) — ne s'accumule pas au-delà d'un duel, c'est bien la
 *  victoire du duel *précédent* qui compte, pas une série. Calibré pour
 *  ~67% de victoires à rareté égale, seul face à une adversaire sans
 *  aucun bonus — un vrai coup de pouce, pas un rouleau compresseur. */
const MOMENTUM_MULTIPLIER = 1.3;

export function campOf(cardId: number): Camp | null {
  const meta = CARD_META[cardId];
  if (!meta) return null;
  return TYPE_CAMP[meta.type] ?? null;
}

export interface TeamSlot {
  cardId: number;
  holo: boolean;
}

export interface TeamPower {
  base: number;
  synergyBonus: number;
  total: number;
}

/** Puissance d'équipe hors-duel (départage à manches égales, affichage) —
 *  somme d'ATTAQUE+DÉFENSE de chaque carte, jamais boostée par le camp ou
 *  le momentum (contextuels à un duel précis, pas à l'équipe entière). */
export function teamPower(team: TeamSlot[]): TeamPower {
  const base = team.reduce((sum, s) => {
    const stats = cardStats(s.cardId, s.holo);
    return sum + (stats ? stats.atk + stats.def : 0);
  }, 0);
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
  /** ATTAQUE finale utilisée pour ce duel (après jitter, camp, momentum). */
  challengerAtk: number;
  opponentAtk: number;
  /** DÉFENSE de base de la carte — pas de jitter ni de bonus dessus,
   *  c'est la garde fixe du profil de la carte. */
  challengerDef: number;
  opponentDef: number;
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

/** Résolution d'un duel façon "percée" (jeu de cartes classique) plutôt
 *  qu'une simple comparaison de puissance :
 *  - l'ATTAQUE du challenger perce si elle dépasse la DÉFENSE adverse ;
 *  - pareil pour l'ATTAQUE adverse contre la DÉFENSE du challenger ;
 *  - les deux percent → la plus grosse marge (ATTAQUE − DÉFENSE en face)
 *    l'emporte ;
 *  - une seule perce → elle gagne (sa garde a tenu, celle d'en face non) ;
 *  - aucune ne perce → égalité (les deux gardes tiennent). */
function resolveDuel(atkC: number, defC: number, atkO: number, defO: number): 'challenger' | 'opponent' | 'tie' {
  const cBreaks = atkC > defO;
  const oBreaks = atkO > defC;
  if (cBreaks && oBreaks) {
    const marginC = atkC - defO;
    const marginO = atkO - defC;
    if (marginC === marginO) return 'tie';
    return marginC > marginO ? 'challenger' : 'opponent';
  }
  if (cBreaks) return 'challenger';
  if (oBreaks) return 'opponent';
  return 'tie';
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
    const cStats = cardStats(c.cardId, c.holo) ?? { atk: 0, def: 0 };
    const oStats = cardStats(o.cardId, o.holo) ?? { atk: 0, def: 0 };
    const cCamp = campOf(c.cardId);
    const oCamp = campOf(o.cardId);
    const cCampAdvantage = cCamp !== null && oCamp !== null && CAMP_BEATS[cCamp] === oCamp;
    const oCampAdvantage = oCamp !== null && cCamp !== null && CAMP_BEATS[oCamp] === cCamp;
    const cMomentum = prevWinner === 'challenger';
    const oMomentum = prevWinner === 'opponent';

    let atkC = cStats.atk * (0.9 + rand() * 0.2);
    let atkO = oStats.atk * (0.9 + rand() * 0.2);
    if (cCampAdvantage) atkC *= CAMP_ADVANTAGE_MULTIPLIER;
    if (oCampAdvantage) atkO *= CAMP_ADVANTAGE_MULTIPLIER;
    if (cMomentum) atkC *= MOMENTUM_MULTIPLIER;
    if (oMomentum) atkO *= MOMENTUM_MULTIPLIER;

    const winner = resolveDuel(atkC, cStats.def, atkO, oStats.def);
    if (winner === 'challenger') challengerRoundsWon++;
    if (winner === 'opponent') opponentRoundsWon++;
    duels.push({
      slot: i,
      challengerCardId: c.cardId,
      opponentCardId: o.cardId,
      challengerAtk: Math.round(atkC),
      opponentAtk: Math.round(atkO),
      challengerDef: cStats.def,
      opponentDef: oStats.def,
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

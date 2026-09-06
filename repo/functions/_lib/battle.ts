import { CARD_META } from './cardMeta';

/** Système de combat — voir IDEES_AMIS_COMBAT.md pour la conception
 *  complète. Chaque carte a deux stats, ATTAQUE et DÉFENSE, dérivées
 *  indépendamment de sa rareté (échelle doublée par palier) et tirées une
 *  fois pour toutes via un hash déterministe de son id — pas stocké,
 *  recalculé à la volée. +50% (les deux stats) si la carte est en holo.
 *
 *  Combat à POINTS DE VIE : chaque équipe a une jauge de PV commune (somme
 *  de la DÉFENSE de base de ses 5 cartes ×HP_MULT, +15% si bonus de
 *  synergie). Le combat se déroule en PLUSIEURS TOURS (pas un résultat
 *  instantané) : les 5 duels tournent en boucle (carte 1 vs carte 1, carte
 *  2 vs carte 2, …, puis on reboucle sur la carte 1), chaque tour inflige
 *  des dégâts de part et d'autre, jusqu'à ce qu'une jauge de PV tombe à 0.
 *  Chaque carte est engagée dans une POSTURE choisie à la composition de
 *  l'équipe — Attaque (frappe plus fort, encaisse plus) ou Défense (frappe
 *  moins fort, encaisse moins) — un vrai choix, pas un dominant strict
 *  (vérifié par simulation : ~50/50 à profil de cartes égal par ailleurs).
 *  Triangle de camps et momentum s'appliquent à l'ATTAQUE, à chaque tour où
 *  le duel concerné agit (pas juste une fois). */

const SECRET_RARITY_ID = 7;

const RARITY_POWER: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16, 6: 32 };

/** ATTAQUE et DÉFENSE d'une carte, tirées chacune INDÉPENDAMMENT (±35%
 *  autour de sa puissance de rareté) plutôt que de sommer à un total fixe
 *  — voir IDEES_AMIS_COMBAT.md pour pourquoi (sinon le profil attaque/
 *  défense n'a mathématiquement aucun effet entre deux cartes de même
 *  rareté). */
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

/** Posture choisie pour une carte à la composition de l'équipe — voir
 *  STANCE_MULT plus bas pour les multiplicateurs. */
export type Stance = 'attaque' | 'defense';

const STANCE_MULT: Record<Stance, { atk: number; def: number }> = {
  attaque: { atk: 1.15, def: 0.85 },
  defense: { atk: 0.88, def: 1.18 },
};

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

/** `beats[a] === b` : le camp `a` a l'avantage sur le camp `b`. Pouvoir bat
 *  Fiction bat Culture bat Pouvoir — sens choisi pour compenser Fiction
 *  (107 cartes, puissance moyenne 5,11) qui est le camp le plus fort, et
 *  Pouvoir (70 cartes, 3,61) le plus faible. Voir IDEES_AMIS_COMBAT.md. */
const CAMP_BEATS: Record<Camp, Camp> = { fiction: 'culture', culture: 'pouvoir', pouvoir: 'fiction' };

/** Multiplicateur d'ATTAQUE par tour pour le duel dont le camp a
 *  l'avantage — plus faible qu'avant le passage au combat à PV (3,5 → 1,4)
 *  car il s'applique maintenant à CHAQUE tour où ce duel agit (une dizaine
 *  de fois dans un combat typique), pas une seule fois : un avantage
 *  modeste qui se répète pèse déjà lourd sur la durée. Calibré par
 *  simulation pour rester un vrai coup de pouce (~70% de victoires avec 1
 *  seul duel avantagé sur 5) sans devenir automatique. */
const CAMP_ADVANTAGE_MULTIPLIER = 1.4;

/** Multiplicateur d'ATTAQUE pour un duel qui a infligé plus de dégâts qu'il
 *  n'en a subi au tour précédent OÙ CE MÊME DUEL A AGI (le fil "carte i
 *  contre carte i" reste le même sur toute la durée du combat) — même
 *  logique de "lancée" qu'avant, adaptée aux dégâts au lieu d'une victoire
 *  de duel entier. */
const MOMENTUM_MULTIPLIER = 1.15;

/** PV d'équipe = somme de la DÉFENSE DE BASE (non ajustée par la posture)
 *  des 5 cartes ×HP_MULT. Volontairement basé sur la défense *de base* et
 *  pas la défense ajustée par la posture : sinon choisir "défense" gonfle
 *  À LA FOIS les PV et l'encaissement, ce qui la rend strictement
 *  dominante (vérifié par simulation : 68% de victoires sans ce
 *  découplage, ~50% avec). */
const HP_MULTIPLIER = 4;

/** Filet de sécurité — dans les faits jamais atteint (le pire cas observé
 *  en simulation tourne autour de 100 tours), mais un combat doit toujours
 *  se terminer. Départagé par PV restants si jamais atteint. */
const MAX_ROUNDS = 300;

export function campOf(cardId: number): Camp | null {
  const meta = CARD_META[cardId];
  if (!meta) return null;
  return TYPE_CAMP[meta.type] ?? null;
}

export interface TeamSlot {
  cardId: number;
  holo: boolean;
  stance: Stance;
}

/** Un tour de combat — le duel au `slot` indiqué agit, inflige des dégâts
 *  des deux côtés, PV mis à jour. */
export interface RoundEvent {
  round: number;
  slot: number;
  challengerCardId: number;
  opponentCardId: number;
  /** ATTAQUE finale utilisée ce tour (posture, jitter, camp, momentum). */
  challengerAtk: number;
  opponentAtk: number;
  /** DÉFENSE ajustée par la posture — pas de jitter dessus. */
  challengerDef: number;
  opponentDef: number;
  /** Dégâts infligés par chaque camp ce tour-ci. */
  challengerDamage: number;
  opponentDamage: number;
  /** PV restants de chaque équipe APRÈS ce tour (jamais négatif). */
  challengerHp: number;
  opponentHp: number;
  challengerCamp: Camp | null;
  opponentCamp: Camp | null;
  challengerCampAdvantage: boolean;
  opponentCampAdvantage: boolean;
  challengerMomentum: boolean;
  opponentMomentum: boolean;
}

export interface BattleResult {
  rounds: RoundEvent[];
  challengerMaxHp: number;
  opponentMaxHp: number;
  challengerSynergyBonus: number;
  opponentSynergyBonus: number;
  winner: 'challenger' | 'opponent' | 'tie';
}

interface SlotStats {
  atk: number;
  def: number;
  camp: Camp | null;
}

function slotStats(team: TeamSlot[]): SlotStats[] {
  return team.map((s) => {
    const base = cardStats(s.cardId, s.holo) ?? { atk: 0, def: 0 };
    const mult = STANCE_MULT[s.stance];
    return { atk: Math.round(base.atk * mult.atk), def: Math.round(base.def * mult.def), camp: campOf(s.cardId) };
  });
}

/** Bonus de synergie : 3+ cartes de la même catégorie dans l'équipe → +15%
 *  de PV max (une équipe "à thème" est plus résiliente, distinct du camp
 *  qui joue sur l'attaque — deux rôles séparés plutôt qu'un bonus générique
 *  qui ferait tout à la fois). */
function synergyBonus(team: TeamSlot[]): number {
  const typeCounts = new Map<string, number>();
  for (const s of team) {
    const meta = CARD_META[s.cardId];
    if (!meta) continue;
    typeCounts.set(meta.type, (typeCounts.get(meta.type) ?? 0) + 1);
  }
  const maxSameType = Math.max(0, ...typeCounts.values());
  return maxSameType >= 3 ? 0.15 : 0;
}

function baseHp(team: TeamSlot[], synergy: number): number {
  const raw = team.reduce((sum, s) => sum + (cardStats(s.cardId, s.holo)?.def ?? 0) * HP_MULTIPLIER, 0);
  return Math.round(raw * (1 + synergy));
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

/** `battleId` sert de graine — un combat rejoué (ex. affiché à nouveau plus
 *  tard) donne toujours le même résultat, sans avoir à stocker autre chose
 *  que le texte des deux équipes (stocké quand même dans schema.sql, pour
 *  ne pas dépendre d'une recomposition à l'identique de CARD_META si
 *  jamais une carte change de rareté après coup). */
export function resolveBattle(battleId: number, challengerTeam: TeamSlot[], opponentTeam: TeamSlot[]): BattleResult {
  const rand = mulberry32(battleId);
  const cStats = slotStats(challengerTeam);
  const oStats = slotStats(opponentTeam);
  const cSynergy = synergyBonus(challengerTeam);
  const oSynergy = synergyBonus(opponentTeam);
  const challengerMaxHp = baseHp(challengerTeam, cSynergy);
  const opponentMaxHp = baseHp(opponentTeam, oSynergy);

  let hpC = challengerMaxHp;
  let hpO = opponentMaxHp;
  const cMomentum: boolean[] = [false, false, false, false, false];
  const oMomentum: boolean[] = [false, false, false, false, false];
  const rounds: RoundEvent[] = [];

  const n = Math.min(challengerTeam.length, opponentTeam.length, 5);
  let round = 0;
  while (hpC > 0 && hpO > 0 && round < MAX_ROUNDS) {
    const i = round % n;
    const cAdv = cStats[i].camp !== null && oStats[i].camp !== null && CAMP_BEATS[cStats[i].camp!] === oStats[i].camp;
    const oAdv = oStats[i].camp !== null && cStats[i].camp !== null && CAMP_BEATS[oStats[i].camp!] === cStats[i].camp;
    // Capturés AVANT d'être écrasés plus bas par le résultat de CE tour —
    // ce sont ces valeurs (issues du tour précédent où ce duel a agi) qui
    // ont servi à booster l'attaque ci-dessous, et c'est bien elles qu'il
    // faut afficher pour ce tour.
    const cHadMomentum = cMomentum[i];
    const oHadMomentum = oMomentum[i];

    let atkC = cStats[i].atk * (0.9 + rand() * 0.2);
    let atkO = oStats[i].atk * (0.9 + rand() * 0.2);
    if (cAdv) atkC *= CAMP_ADVANTAGE_MULTIPLIER;
    if (oAdv) atkO *= CAMP_ADVANTAGE_MULTIPLIER;
    if (cHadMomentum) atkC *= MOMENTUM_MULTIPLIER;
    if (oHadMomentum) atkO *= MOMENTUM_MULTIPLIER;
    atkC = Math.round(atkC);
    atkO = Math.round(atkO);

    const dmgToO = Math.max(1, atkC - oStats[i].def);
    const dmgToC = Math.max(1, atkO - cStats[i].def);
    hpO = Math.max(0, hpO - dmgToO);
    hpC = Math.max(0, hpC - dmgToC);
    cMomentum[i] = dmgToO > dmgToC;
    oMomentum[i] = dmgToC > dmgToO;

    rounds.push({
      round,
      slot: i,
      challengerCardId: challengerTeam[i].cardId,
      opponentCardId: opponentTeam[i].cardId,
      challengerAtk: atkC,
      opponentAtk: atkO,
      challengerDef: cStats[i].def,
      opponentDef: oStats[i].def,
      challengerDamage: dmgToO,
      opponentDamage: dmgToC,
      challengerHp: hpC,
      opponentHp: hpO,
      challengerCamp: cStats[i].camp,
      opponentCamp: oStats[i].camp,
      challengerCampAdvantage: cAdv,
      opponentCampAdvantage: oAdv,
      challengerMomentum: cHadMomentum,
      opponentMomentum: oHadMomentum,
    });
    round++;
  }

  let winner: BattleResult['winner'] = 'tie';
  if (hpC > 0 && hpO <= 0) winner = 'challenger';
  else if (hpO > 0 && hpC <= 0) winner = 'opponent';
  else if (hpC !== hpO) winner = hpC > hpO ? 'challenger' : 'opponent';

  return {
    rounds,
    challengerMaxHp,
    opponentMaxHp,
    challengerSynergyBonus: cSynergy,
    opponentSynergyBonus: oSynergy,
    winner,
  };
}

/** Juste la forme (5 entrées `{cardId, holo, stance}`) — ne vérifie ni la
 *  possession ni les doublons, voir `teamError` pour ça. */
export function isTeamShape(team: unknown): team is TeamSlot[] {
  if (!Array.isArray(team) || team.length !== 5) return false;
  return team.every((s) => {
    if (typeof s !== 'object' || s === null) return false;
    const o = s as Record<string, unknown>;
    return typeof o.cardId === 'number' && typeof o.holo === 'boolean' && (o.stance === 'attaque' || o.stance === 'defense');
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

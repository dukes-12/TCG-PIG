import { CARDS, SECRET_RARITY_ID, cardById } from '../data/catalog';
import type { TeamSlot, BattleResult, DuelResult, Camp } from './api';

/** Port client de functions/_lib/battle.ts, pour le mode "Défier un bot"
 *  (BattlesScreen) — un combat contre un adversaire fictif n'a pas de
 *  raison de passer par le serveur (pas de compte, pas de collection à
 *  vérifier), donc la résolution se fait ici directement. Même barème,
 *  même algorithme que le serveur (voir ce fichier pour les vrais combats
 *  entre joueurs) — dupliqué plutôt que partagé car le serveur lit sa
 *  rareté/catégorie depuis CARD_META (généré, les Pages Functions
 *  n'important pas le catalogue front-end) alors qu'ici `CARDS` est déjà
 *  disponible directement. Si le barème change d'un côté, le changer de
 *  l'autre aussi — y compris le triangle de camps, les stats ATK/DEF et le
 *  momentum ci-dessous. */

const RARITY_POWER: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16, 6: 32 };

/** ATTAQUE et DÉFENSE d'une carte — voir functions/_lib/battle.ts pour
 *  l'explication complète de pourquoi ces deux stats sont tirées
 *  INDÉPENDAMMENT plutôt que de sommer à un total fixe (sinon le profil
 *  attaque/défense d'une carte n'aurait aucun effet sur qui gagne). */
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

export function cardStats(cardId: number, holo: boolean): CardStats | null {
  const card = cardById(cardId);
  if (!card || card.rarity === SECRET_RARITY_ID) return null;
  const base = RARITY_POWER[card.rarity] ?? 0;
  const P = holo ? base * 1.5 : base;
  const atk = Math.max(1, Math.round(P * (0.65 + hash01(`${cardId}:atk`) * 0.7)));
  const def = Math.max(1, Math.round(P * (0.65 + hash01(`${cardId}:def`) * 0.7)));
  return { atk, def };
}

/** Triangle de camps — voir functions/_lib/battle.ts pour l'explication
 *  complète. Doit rester identique côté serveur et côté client. */
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
// Rééquilibrage : Fiction (107 cartes, puissance moyenne 5,11) est le camp
// le plus fort, Pouvoir (70 cartes, 3,61) le plus faible — le premier sens
// (Fiction bat Pouvoir) cumulait l'écart de puissance et l'avantage de camp
// sur le même camp déjà en difficulté. Sens inversé : Pouvoir bat Fiction.
const CAMP_BEATS: Record<Camp, Camp> = { fiction: 'culture', culture: 'pouvoir', pouvoir: 'fiction' };
const CAMP_ADVANTAGE_MULTIPLIER = 3.5;
const MOMENTUM_MULTIPLIER = 1.3;

export function campOf(cardId: number): Camp | null {
  const card = cardById(cardId);
  if (!card) return null;
  return TYPE_CAMP[card.type] ?? null;
}

/** Icône + libellé par camp, pour l'affichage (composeur d'équipe,
 *  résultat de combat) — un seul endroit à mettre à jour côté UI. */
export const CAMP_INFO: Record<Camp, { icon: string; label: string }> = {
  fiction: { icon: '🎭', label: 'Fiction' },
  pouvoir: { icon: '👑', label: 'Pouvoir' },
  culture: { icon: '🌿', label: 'Culture' },
};

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
    const card = cardById(s.cardId);
    if (!card) continue;
    typeCounts.set(card.type, (typeCounts.get(card.type) ?? 0) + 1);
  }
  const maxSameType = Math.max(0, ...typeCounts.values());
  const synergyBonus = maxSameType >= 3 ? 0.15 : 0;
  return { base, synergyBonus, total: Math.round(base * (1 + synergyBonus)) };
}

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Résolution d'un duel façon "percée" — voir functions/_lib/battle.ts
 *  pour l'explication complète (et pourquoi une simple comparaison de
 *  puissance ne suffit plus). */
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

/** `seed` : un combat de test n'a pas d'id de ligne en base à réutiliser —
 *  n'importe quel entier fait l'affaire (voir botTeam ci-dessous, qui en
 *  tire un au hasard à chaque défi pour ne pas rejouer le même combat). */
export function resolveBattle(seed: number, challengerTeam: TeamSlot[], opponentTeam: TeamSlot[]): BattleResult {
  const rand = mulberry32(seed);
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

export type BotDifficulty = 'facile' | 'moyen' | 'difficile';

// Poids de tirage de rareté pour l'équipe du bot, par difficulté — pas les
// mêmes que le taux de tirage des sacs (RARITIES dans cards.json) : le bot
// "Facile" doit perdre plus souvent qu'il ne gagne pour un premier essai,
// donc tiré vers les raretés basses ; "Difficile" vers le haut, pour
// éprouver une équipe déjà bien montée.
const BOT_RARITY_WEIGHTS: Record<BotDifficulty, Record<number, number>> = {
  facile: { 1: 55, 2: 30, 3: 12, 4: 2.5, 5: 0.4, 6: 0.1 },
  moyen: { 1: 30, 2: 27, 3: 22, 4: 14, 5: 5, 6: 2 },
  difficile: { 1: 5, 2: 10, 3: 20, 4: 30, 5: 25, 6: 10 },
};
// Un peu de holo dans l'équipe du bot — sinon ce mode ne teste jamais le
// bonus holo côté adverse. Plus fréquent à mesure que la difficulté monte.
const BOT_HOLO_CHANCE: Record<BotDifficulty, number> = { facile: 0.05, moyen: 0.12, difficile: 0.25 };

function pickWeighted<T>(entries: [T, number][]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let x = Math.random() * total;
  for (const [value, w] of entries) {
    x -= w;
    if (x < 0) return value;
  }
  return entries[entries.length - 1][0];
}

/** Équipe aléatoire pour le bot — parmi TOUTES les cartes du jeu, pas
 *  seulement une collection possédée (un bot n'a pas de compte). Jamais la
 *  secrète, jamais deux fois la même carte (même contrainte que teamError
 *  côté serveur pour un vrai combat). */
export function randomBotTeam(difficulty: BotDifficulty): TeamSlot[] {
  const weights = BOT_RARITY_WEIGHTS[difficulty];
  const holoChance = BOT_HOLO_CHANCE[difficulty];
  const byRarity = new Map<number, number[]>();
  for (const c of CARDS) {
    if (c.rarity === SECRET_RARITY_ID) continue;
    if (!byRarity.has(c.rarity)) byRarity.set(c.rarity, []);
    byRarity.get(c.rarity)!.push(c.id);
  }

  const team: TeamSlot[] = [];
  const used = new Set<number>();
  let guard = 0;
  while (team.length < 5 && guard++ < 200) {
    const rarity = pickWeighted(Object.entries(weights).map(([r, w]) => [Number(r), w] as [number, number]));
    const pool = (byRarity.get(rarity) ?? []).filter((id) => !used.has(id));
    if (pool.length === 0) continue;
    const cardId = pool[Math.floor(Math.random() * pool.length)];
    used.add(cardId);
    team.push({ cardId, holo: Math.random() < holoChance });
  }
  return team;
}

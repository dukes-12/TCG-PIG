import { CARDS, SECRET_RARITY_ID, cardById } from '../data/catalog';
import type { TeamSlot, BattleResult, RoundEvent, Camp, Stance } from './api';

/** Port client de functions/_lib/battle.ts, pour le mode "Défier un bot"
 *  (BattlesScreen) — un combat contre un adversaire fictif n'a pas de
 *  raison de passer par le serveur (pas de compte, pas de collection à
 *  vérifier), donc la résolution se fait ici directement. Même barème,
 *  même algorithme que le serveur (voir ce fichier pour les vrais combats
 *  entre joueurs) — dupliqué plutôt que partagé car le serveur lit sa
 *  rareté/catégorie depuis CARD_META (généré, les Pages Functions
 *  n'important pas le catalogue front-end) alors qu'ici `CARDS` est déjà
 *  disponible directement. Si le barème change d'un côté, le changer de
 *  l'autre aussi — y compris le triangle de camps, les stats ATK/DEF, les
 *  PV/postures et le momentum ci-dessous. Entièrement déterministe (pas
 *  d'aléa par tour) depuis le passage aux bonus additifs. */

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

/** Multiplicateurs de posture — voir functions/_lib/battle.ts (STANCE_MULT)
 *  pour le calibrage (~50/50 entre "attaque" et "défense" à profil de
 *  cartes égal par ailleurs, vérifié par simulation). */
const STANCE_MULT: Record<Stance, { atk: number; def: number }> = {
  attaque: { atk: 1.15, def: 0.85 },
  defense: { atk: 0.88, def: 1.18 },
};

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
// Bonus additionnés (pas multipliés) — voir functions/_lib/battle.ts pour
// le détail et le calibrage.
const CAMP_ADVANTAGE_BONUS = 0.5;
const MOMENTUM_BONUS = 0.4;
const DESPERATION_BONUS = 0.3;
const DESPERATION_THRESHOLD = 0.25;
const CRIT_CHANCE = 0.15;
const BLOCK_CHANCE = 0.12;
const HP_MULTIPLIER = 4;
const MAX_ROUNDS = 300;

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

/** Icône + libellé par posture, pour l'affichage. */
export const STANCE_INFO: Record<Stance, { icon: string; label: string }> = {
  attaque: { icon: '⚔️', label: 'Attaque' },
  defense: { icon: '🛡️', label: 'Défense' },
};

/** ATTAQUE/DÉFENSE d'une carte APRÈS ajustement par sa posture — pour
 *  l'affichage dans le composeur (BattlesScreen), où on veut montrer les
 *  stats telles qu'elles compteront vraiment en combat, pas la valeur de
 *  base. */
export function cardStatsWithStance(cardId: number, holo: boolean, stance: Stance): CardStats | null {
  const base = cardStats(cardId, holo);
  if (!base) return null;
  const mult = STANCE_MULT[stance] ?? STANCE_MULT.attaque;
  return { atk: Math.round(base.atk * mult.atk), def: Math.round(base.def * mult.def) };
}

interface SlotStats {
  atk: number;
  def: number;
  camp: Camp | null;
}

function slotStats(team: TeamSlot[]): SlotStats[] {
  return team.map((s) => {
    const base = cardStats(s.cardId, s.holo) ?? { atk: 0, def: 0 };
    // Filet de sécurité — voir functions/_lib/battle.ts pour l'explication
    // (une équipe stockée avant l'ajout des postures n'a pas de `stance`).
    const mult = STANCE_MULT[s.stance] ?? STANCE_MULT.attaque;
    return { atk: Math.round(base.atk * mult.atk), def: Math.round(base.def * mult.def), camp: campOf(s.cardId) };
  });
}

function synergyBonus(team: TeamSlot[]): number {
  const typeCounts = new Map<string, number>();
  for (const s of team) {
    const card = cardById(s.cardId);
    if (!card) continue;
    typeCounts.set(card.type, (typeCounts.get(card.type) ?? 0) + 1);
  }
  const maxSameType = Math.max(0, ...typeCounts.values());
  return maxSameType >= 3 ? 0.15 : 0;
}

function baseHp(team: TeamSlot[], synergy: number): number {
  const raw = team.reduce((sum, s) => sum + (cardStats(s.cardId, s.holo)?.def ?? 0) * HP_MULTIPLIER, 0);
  return Math.round(raw * (1 + synergy));
}

/** Entièrement déterministe — voir functions/_lib/battle.ts. */
export function resolveBattle(challengerTeam: TeamSlot[], opponentTeam: TeamSlot[]): BattleResult {
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
    const cHadMomentum = cMomentum[i];
    const oHadMomentum = oMomentum[i];
    const cDesperate = hpC / challengerMaxHp < DESPERATION_THRESHOLD;
    const oDesperate = hpO / opponentMaxHp < DESPERATION_THRESHOLD;

    const cBonus = (cAdv ? CAMP_ADVANTAGE_BONUS : 0) + (cHadMomentum ? MOMENTUM_BONUS : 0) + (cDesperate ? DESPERATION_BONUS : 0);
    const oBonus = (oAdv ? CAMP_ADVANTAGE_BONUS : 0) + (oHadMomentum ? MOMENTUM_BONUS : 0) + (oDesperate ? DESPERATION_BONUS : 0);
    const atkC = Math.round(cStats[i].atk * (1 + cBonus));
    const atkO = Math.round(oStats[i].atk * (1 + oBonus));

    let dmgToO = Math.max(1, atkC - oStats[i].def);
    let cCrit = false;
    const cBlocked = Math.random() < BLOCK_CHANCE;
    if (cBlocked) dmgToO = 0;
    else if ((cCrit = Math.random() < CRIT_CHANCE)) dmgToO *= 2;

    let dmgToC = Math.max(1, atkO - cStats[i].def);
    let oCrit = false;
    const oBlocked = Math.random() < BLOCK_CHANCE;
    if (oBlocked) dmgToC = 0;
    else if ((oCrit = Math.random() < CRIT_CHANCE)) dmgToC *= 2;

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
      challengerDesperation: cDesperate,
      opponentDesperation: oDesperate,
      challengerCrit: cCrit,
      opponentCrit: oCrit,
      challengerBlocked: cBlocked,
      opponentBlocked: oBlocked,
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

export type BotDifficulty = 'facile' | 'moyen' | 'difficile';

// Poids de tirage de rareté pour l'équipe du bot, par difficulté — pas les
// mêmes que le taux de tirage des sacs (RARITIES dans cards.json) : le bot
// "Facile" doit perdre plus souvent qu'il ne gagne pour un premier essai,
// donc tiré vers les raretés basses ; "Difficile" vers le haut, pour
// éprouver une équipe déjà bien montée. Relevé un cran par rapport à la
// version précédente (combats à PV/postures : les parties durent plus
// longtemps maintenant, un bot trop mou devient vite ennuyeux plutôt que
// juste facile).
const BOT_RARITY_WEIGHTS: Record<BotDifficulty, Record<number, number>> = {
  facile: { 1: 50, 2: 30, 3: 15, 4: 4, 5: 0.8, 6: 0.2 },
  moyen: { 1: 20, 2: 22, 3: 25, 4: 20, 5: 9, 6: 4 },
  difficile: { 1: 2, 2: 5, 3: 13, 4: 25, 5: 30, 6: 25 },
};
// Un peu de holo dans l'équipe du bot — sinon ce mode ne teste jamais le
// bonus holo côté adverse. Plus fréquent à mesure que la difficulté monte.
const BOT_HOLO_CHANCE: Record<BotDifficulty, number> = { facile: 0.08, moyen: 0.18, difficile: 0.35 };

function pickWeighted<T>(entries: [T, number][]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let x = Math.random() * total;
  for (const [value, w] of entries) {
    x -= w;
    if (x < 0) return value;
  }
  return entries[entries.length - 1][0];
}

/** Posture du bot : simple heuristique — plutôt "attaque" si son ATTAQUE
 *  dépasse sa DÉFENSE de base, "défense" sinon, joue donc au profil
 *  naturel de chaque carte plutôt qu'un choix uniforme ou aléatoire. */
function botStance(cardId: number, holo: boolean): Stance {
  const stats = cardStats(cardId, holo);
  if (!stats) return 'attaque';
  return stats.atk >= stats.def ? 'attaque' : 'defense';
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
    const holo = Math.random() < holoChance;
    team.push({ cardId, holo, stance: botStance(cardId, holo) });
  }
  return team;
}

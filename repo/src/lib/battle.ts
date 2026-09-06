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
 *  l'autre aussi — y compris le triangle de camps, les stats ATK/DEF,
 *  l'écran de défenseurs et le momentum ci-dessous. */

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

/** Nombre de cartes en Attaque / en Défense imposé à chaque équipe. */
const ATTACKER_COUNT = 2;
const DEFENDER_COUNT = 3;

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
const BASE_PV = 500;
const DEFENDER_DURABILITY_MULT = 4;
const MAX_ROUNDS = 1000;

export function campOf(cardId: number): Camp | null {
  const card = cardById(cardId);
  if (!card) return null;
  return TYPE_CAMP[card.type] ?? null;
}

/** Nombre de cartes en Attaque / en Défense attendu dans une équipe —
 *  utilisé par le composeur (BattlesScreen) pour bloquer l'envoi tant que
 *  la répartition n'est pas EXACTEMENT ATTACKER_COUNT/DEFENDER_COUNT (voir
 *  functions/_lib/battle.ts, isTeamShape, pour la revérification serveur
 *  qui fait foi). */
export const TEAM_SHAPE = { attackers: ATTACKER_COUNT, defenders: DEFENDER_COUNT };

export function teamShapeOk(team: TeamSlot[]): boolean {
  if (team.length !== ATTACKER_COUNT + DEFENDER_COUNT) return false;
  const attackers = team.filter((s) => s.stance === 'attaque').length;
  const defenders = team.filter((s) => s.stance === 'defense').length;
  return attackers === ATTACKER_COUNT && defenders === DEFENDER_COUNT;
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
  cardId: number;
  atk: number;
  def: number;
  camp: Camp | null;
}

function slotStats(s: TeamSlot): SlotStats {
  const base = cardStats(s.cardId, s.holo) ?? { atk: 0, def: 0 };
  // Filet de sécurité — voir functions/_lib/battle.ts pour l'explication
  // (une équipe stockée avant l'ajout des postures n'a pas de `stance`).
  const mult = STANCE_MULT[s.stance] ?? STANCE_MULT.attaque;
  return { cardId: s.cardId, atk: Math.round(base.atk * mult.atk), def: Math.round(base.def * mult.def), camp: campOf(s.cardId) };
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

interface Side {
  attackers: SlotStats[];
  defenders: SlotStats[];
  maxHp: number;
  synergy: number;
}

function buildSide(team: TeamSlot[]): Side {
  const stats = team.map(slotStats);
  const attackers = team.map((s, i) => (s.stance === 'attaque' ? stats[i] : null)).filter((s): s is SlotStats => s !== null);
  const defenders = team.map((s, i) => (s.stance === 'defense' ? stats[i] : null)).filter((s): s is SlotStats => s !== null);
  // Filet de sécurité — voir functions/_lib/battle.ts pour l'explication.
  if (attackers.length === 0) attackers.push({ cardId: 0, atk: 0, def: 0, camp: null });
  const synergy = synergyBonus(team);
  return { attackers, defenders, maxHp: Math.round(BASE_PV * (1 + synergy)), synergy };
}

/** Entièrement déterministe pour l'ATTAQUE elle-même — voir
 *  functions/_lib/battle.ts. */
export function resolveBattle(challengerTeam: TeamSlot[], opponentTeam: TeamSlot[]): BattleResult {
  const c = buildSide(challengerTeam);
  const o = buildSide(opponentTeam);

  let hpC = c.maxHp;
  let hpO = o.maxHp;
  const defHpC = c.defenders.map((d) => d.def * DEFENDER_DURABILITY_MULT);
  const defHpO = o.defenders.map((d) => d.def * DEFENDER_DURABILITY_MULT);
  let frontC = 0;
  let frontO = 0;
  const momC = c.attackers.map(() => false);
  const momO = o.attackers.map(() => false);
  const rounds: RoundEvent[] = [];

  const nC = c.attackers.length || 1;
  const nO = o.attackers.length || 1;
  let round = 0;
  while (hpC > 0 && hpO > 0 && round < MAX_ROUNDS) {
    const ai = round % nC;
    const oi = round % nO;
    const attC = c.attackers[ai];
    const attO = o.attackers[oi];
    const cDesperate = hpC / c.maxHp < DESPERATION_THRESHOLD;
    const oDesperate = hpO / o.maxHp < DESPERATION_THRESHOLD;
    const cHadMomentum = momC[ai];
    const oHadMomentum = momO[oi];

    // ── Attaque du challenger, vise le camp adverse ──
    const targetO = frontO < o.defenders.length ? o.defenders[frontO] : null;
    const cAdv = !!targetO && attC.camp !== null && targetO.camp !== null && CAMP_BEATS[attC.camp] === targetO.camp;
    const cBonus = (cAdv ? CAMP_ADVANTAGE_BONUS : 0) + (cHadMomentum ? MOMENTUM_BONUS : 0) + (cDesperate ? DESPERATION_BONUS : 0);
    const atkC = Math.round(attC.atk * (1 + cBonus));
    let cDmg = Math.max(1, atkC - (targetO ? targetO.def : 0));
    let cCrit = false;
    const cBlocked = Math.random() < BLOCK_CHANCE;
    if (cBlocked) cDmg = 0;
    else if ((cCrit = Math.random() < CRIT_CHANCE)) cDmg *= 2;
    let cDestroyed = false;
    if (targetO) {
      defHpO[frontO] -= cDmg;
      if (defHpO[frontO] <= 0) {
        cDestroyed = true;
        frontO++;
      }
    } else {
      hpO = Math.max(0, hpO - cDmg);
    }
    momC[ai] = targetO === null;

    // ── Attaque de l'adversaire, vise le camp du challenger ──
    const targetC = frontC < c.defenders.length ? c.defenders[frontC] : null;
    const oAdv = !!targetC && attO.camp !== null && targetC.camp !== null && CAMP_BEATS[attO.camp] === targetC.camp;
    const oBonus = (oAdv ? CAMP_ADVANTAGE_BONUS : 0) + (oHadMomentum ? MOMENTUM_BONUS : 0) + (oDesperate ? DESPERATION_BONUS : 0);
    const atkO = Math.round(attO.atk * (1 + oBonus));
    let oDmg = Math.max(1, atkO - (targetC ? targetC.def : 0));
    let oCrit = false;
    const oBlocked = Math.random() < BLOCK_CHANCE;
    if (oBlocked) oDmg = 0;
    else if ((oCrit = Math.random() < CRIT_CHANCE)) oDmg *= 2;
    let oDestroyed = false;
    if (targetC) {
      defHpC[frontC] -= oDmg;
      if (defHpC[frontC] <= 0) {
        oDestroyed = true;
        frontC++;
      }
    } else {
      hpC = Math.max(0, hpC - oDmg);
    }
    momO[oi] = targetC === null;

    rounds.push({
      round,
      challengerAttackerId: attC.cardId,
      opponentAttackerId: attO.cardId,
      challengerAtk: atkC,
      opponentAtk: atkO,
      challengerTargetCardId: targetO ? targetO.cardId : null,
      opponentTargetCardId: targetC ? targetC.cardId : null,
      challengerTargetDestroyed: cDestroyed,
      opponentTargetDestroyed: oDestroyed,
      challengerDamage: cDmg,
      opponentDamage: oDmg,
      challengerHp: hpC,
      opponentHp: hpO,
      challengerCamp: attC.camp,
      opponentCamp: attO.camp,
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
    challengerMaxHp: c.maxHp,
    opponentMaxHp: o.maxHp,
    challengerSynergyBonus: c.synergy,
    opponentSynergyBonus: o.synergy,
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

/** Équipe aléatoire pour le bot — parmi TOUTES les cartes du jeu, pas
 *  seulement une collection possédée (un bot n'a pas de compte). Jamais la
 *  secrète, jamais deux fois la même carte (même contrainte que teamError
 *  côté serveur pour un vrai combat). EXACTEMENT ATTACKER_COUNT cartes en
 *  Attaque et DEFENDER_COUNT en Défense — le bot met en Attaque ses cartes
 *  dont l'ATTAQUE dépasse le plus la DÉFENSE (ses meilleures attaquantes),
 *  le reste en Défense, plutôt qu'un choix uniforme ou aléatoire. */
export function randomBotTeam(difficulty: BotDifficulty): TeamSlot[] {
  const weights = BOT_RARITY_WEIGHTS[difficulty];
  const holoChance = BOT_HOLO_CHANCE[difficulty];
  const byRarity = new Map<number, number[]>();
  for (const c of CARDS) {
    if (c.rarity === SECRET_RARITY_ID) continue;
    if (!byRarity.has(c.rarity)) byRarity.set(c.rarity, []);
    byRarity.get(c.rarity)!.push(c.id);
  }

  const picks: { cardId: number; holo: boolean }[] = [];
  const used = new Set<number>();
  let guard = 0;
  while (picks.length < 5 && guard++ < 200) {
    const rarity = pickWeighted(Object.entries(weights).map(([r, w]) => [Number(r), w] as [number, number]));
    const pool = (byRarity.get(rarity) ?? []).filter((id) => !used.has(id));
    if (pool.length === 0) continue;
    const cardId = pool[Math.floor(Math.random() * pool.length)];
    used.add(cardId);
    picks.push({ cardId, holo: Math.random() < holoChance });
  }

  const ranked = picks
    .map((p) => ({ ...p, stats: cardStats(p.cardId, p.holo) ?? { atk: 0, def: 0 } }))
    .sort((a, b) => b.stats.atk - b.stats.def - (a.stats.atk - a.stats.def));
  return ranked.map((p, i) => ({ cardId: p.cardId, holo: p.holo, stance: i < ATTACKER_COUNT ? 'attaque' : 'defense' }));
}

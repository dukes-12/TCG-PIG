import { CARD_META } from './cardMeta';

/** Système de combat — voir IDEES_AMIS_COMBAT.md pour la conception
 *  complète. Résumé : puissance dérivée de la rareté (échelle doublée par
 *  palier), +50% si la carte est en holo, bonus d'équipe si 3+ cartes
 *  partagent la même catégorie ; résolution en 5 duels slot à slot avec un
 *  peu de variance (±10%) tirée d'une graine dérivée de l'id du combat —
 *  reproductible, calculée ici (jamais côté client) pour ne pas pouvoir
 *  tricher sur le résultat. */

const SECRET_RARITY_ID = 7;

const RARITY_POWER: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16, 6: 32 };

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

  for (let i = 0; i < Math.min(challengerTeam.length, opponentTeam.length); i++) {
    const c = challengerTeam[i];
    const o = opponentTeam[i];
    const cRoll = (cardPower(c.cardId, c.holo) ?? 0) * (0.9 + rand() * 0.2);
    const oRoll = (cardPower(o.cardId, o.holo) ?? 0) * (0.9 + rand() * 0.2);
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
      winner,
    });
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

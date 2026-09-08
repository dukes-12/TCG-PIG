import { CARDS, SECRET_RARITY_ID, cardById } from '../data/catalog';
import { categoryAbilityFor, type ActiveAbility, type CategoryAbility } from './categoryAbilities';
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

/** ±10% autour de la puissance de rareté (0.9 à 1.1) — voir
 *  IDEES_AMIS_COMBAT.md, dix-neuvième passage. Volontairement une bande
 *  ÉTROITE : à ±35% (l'ancienne valeur), deux cartes de la MÊME rareté
 *  pouvaient s'écarter d'un facteur ~2 l'une de l'autre, au point qu'un
 *  côté qui piochait systématiquement les pires tirages perdait
 *  quasi-systématiquement (100% de défaites, mesuré par simulation) face
 *  au même roster avec les meilleurs tirages — une "inégalité invisible"
 *  entre deux cartes affichant pourtant la même rareté. Resserré à ±10% :
 *  chaque carte garde un profil ATTAQUE/DÉFENSE qui lui est propre (glass
 *  cannon ou increvable, selon le hash), mais l'écart ne peut plus, à lui
 *  seul, garantir une victoire — retombé à ~35-40% côté malchanceux dans
 *  la même simulation. L'écart ENTRE raretés (RARITY_POWER, doublement
 *  volontaire par palier) n'est pas concerné par ce passage : il reste le
 *  levier de progression légitime, gagné par la collection plutôt que par
 *  un tirage de stats caché. */
const RARITY_VARIANCE_LO = 0.9;
const RARITY_VARIANCE_SPAN = 0.2;

export function cardStats(cardId: number, holo: boolean): CardStats | null {
  const card = cardById(cardId);
  if (!card || card.rarity === SECRET_RARITY_ID) return null;
  const base = RARITY_POWER[card.rarity] ?? 0;
  const P = holo ? base * 1.5 : base;
  const atk = Math.max(1, Math.round(P * (RARITY_VARIANCE_LO + hash01(`${cardId}:atk`) * RARITY_VARIANCE_SPAN)));
  const def = Math.max(1, Math.round(P * (RARITY_VARIANCE_LO + hash01(`${cardId}:def`) * RARITY_VARIANCE_SPAN)));
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
export const CAMP_BEATS: Record<Camp, Camp> = { fiction: 'culture', culture: 'pouvoir', pouvoir: 'fiction' };
// Bonus additionnés (pas multipliés) — voir functions/_lib/battle.ts pour
// le détail et le calibrage.
const CAMP_ADVANTAGE_BONUS = 0.5;
const MOMENTUM_BONUS = 0.4;
const DESPERATION_BONUS = 0.3;
const DESPERATION_THRESHOLD = 0.25;
const CRIT_CHANCE = 0.15;
const BLOCK_CHANCE = 0.12;
// Rééquilibrage (onzième passage, IDEES_AMIS_COMBAT.md) : 500/4 donnait des
// combats à ~100 tours en moyenne, bien trop long pour un ciblage choisi en
// direct à chaque tour. Calibré par simulation pour ~10-20 tours (rareté
// égale) : le nombre de tours dépend surtout de la durabilité de l'écran
// (beaucoup plus que des PV eux-mêmes, l'ATTAQUE mitigée par la DÉFENSE
// adverse à chaque coup grignote lentement), donc les deux ont dû baisser
// ensemble, pas juste les PV.
const BASE_PV = 50;
/** Points d'écran d'une carte en Défense = sa DÉFENSE (posture comprise)
 *  × ce coefficient. Exporté pour pouvoir afficher le calcul au joueur
 *  (BattleCardStats) plutôt que de lui laisser deviner d'où sort le
 *  chiffre. */
export const DEFENDER_DURABILITY_MULT = 0.5;
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
 *  résultat de combat) — un seul endroit à mettre à jour côté UI.
 *
 *  Les icônes sont celles de PIERRE-FEUILLE-CISEAUX, et pas des symboles
 *  de thème (🎭/👑/🌿 avant) : le triangle qui se contre est la seule chose
 *  qu'on a besoin de lire d'un coup d'œil en plein combat, et personne n'a
 *  à mémoriser si un masque bat une couronne. Le mariage suit exactement
 *  CAMP_BEATS ci-dessus — Fiction ✊ bat Culture ✌️ bat Pouvoir ✋ bat
 *  Fiction ✊ — donc changer l'un oblige à changer l'autre. */
export const CAMP_INFO: Record<Camp, { icon: string; label: string; rps: string }> = {
  fiction: { icon: '✊', label: 'Fiction', rps: 'pierre' },
  culture: { icon: '✌️', label: 'Culture', rps: 'ciseaux' },
  pouvoir: { icon: '✋', label: 'Pouvoir', rps: 'feuille' },
};

/** Infobulle d'un camp, partout pareil : le nom, sa main de
 *  pierre-feuille-ciseaux, et surtout ce qu'il bat — la seule chose qui
 *  compte en combat (+50% d'ATTAQUE contre le camp dominé). */
export function campTooltip(camp: Camp): string {
  const me = CAMP_INFO[camp];
  const prey = CAMP_INFO[CAMP_BEATS[camp]];
  return `${me.label} (${me.rps}) — bat ${prey.label} (${prey.rps})`;
}

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
  /** Pouvoir de la CATÉGORIE de la carte (card.type — voir
   *  categoryAbilities.ts), pas de son camp : passif toujours actif,
   *  capacité active déclenchée automatiquement à la première action de
   *  cette carte (voir stepBattle, `usedActiveC`/`usedActiveO`). */
  ability: CategoryAbility;
}

function slotStats(s: TeamSlot): SlotStats {
  const base = cardStats(s.cardId, s.holo) ?? { atk: 0, def: 0 };
  // Filet de sécurité — voir functions/_lib/battle.ts pour l'explication
  // (une équipe stockée avant l'ajout des postures n'a pas de `stance`).
  const mult = STANCE_MULT[s.stance] ?? STANCE_MULT.attaque;
  const ability = categoryAbilityFor(cardById(s.cardId)?.type ?? 'Hors catégorie');
  // Les passifs `atk`/`def` sont pliés une fois pour toutes dans la stat,
  // comme la posture — mais seulement du côté où ils comptent : `atk` ne
  // sert que si la carte finit en Attaque, `def` que si elle finit en
  // Défense (une carte a les deux stats quelle que soit sa posture, seule
  // la moitié pertinente est jamais lue par la suite).
  const atkBonus = s.stance === 'attaque' && ability.passive.kind === 'atk' ? ability.passive.pct : 0;
  const defBonus = s.stance === 'defense' && ability.passive.kind === 'def' ? ability.passive.pct : 0;
  return {
    cardId: s.cardId,
    atk: Math.round(base.atk * mult.atk * (1 + atkBonus)),
    def: Math.round(base.def * mult.def * (1 + defBonus)),
    camp: campOf(s.cardId),
    ability,
  };
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
  /** Durabilité MAX de chaque défenseur (même ordre que `defenders`) — DEF
   *  × DEFENDER_DURABILITY_MULT, +bonus du passif `durability` de sa
   *  catégorie s'il y en a un. Calculée une fois ici plutôt que recalculée
   *  à la volée partout (defenderDurability, la capacité "fortify") : deux
   *  défenseurs de même DEF peuvent avoir des max différents. */
  defMax: number[];
}

function buildSide(team: TeamSlot[]): Side {
  const stats = team.map(slotStats);
  const attackers = team.map((s, i) => (s.stance === 'attaque' ? stats[i] : null)).filter((s): s is SlotStats => s !== null);
  const defenders = team.map((s, i) => (s.stance === 'defense' ? stats[i] : null)).filter((s): s is SlotStats => s !== null);
  // Filet de sécurité — voir functions/_lib/battle.ts pour l'explication.
  if (attackers.length === 0) attackers.push({ cardId: 0, atk: 0, def: 0, camp: null, ability: categoryAbilityFor('Hors catégorie') });
  const synergy = synergyBonus(team);
  const defMax = defenders.map((d) => {
    const bonus = d.ability.passive.kind === 'durability' ? d.ability.passive.pct : 0;
    return Math.round(d.def * DEFENDER_DURABILITY_MULT * (1 + bonus));
  });
  return { attackers, defenders, maxHp: Math.round(BASE_PV * (1 + synergy)), synergy, defMax };
}

/** Répare l'écran allié le plus abîmé (encore en vie) de `pct` % de SA
 *  durabilité max — capacité active `fortify`. Ne fait rien si tous les
 *  écrans de ce côté sont déjà détruits (rien à réparer). */
function fortifyWeakestDefender(defHp: number[], defMax: number[], pct: number): void {
  let idx = -1;
  let bestRatio = Infinity;
  for (let i = 0; i < defHp.length; i++) {
    if (defHp[i] <= 0) continue;
    const ratio = defMax[i] > 0 ? defHp[i] / defMax[i] : 1;
    if (ratio < bestRatio) {
      bestRatio = ratio;
      idx = i;
    }
  }
  if (idx === -1) return;
  defHp[idx] = Math.min(defMax[idx], defHp[idx] + Math.round(defMax[idx] * pct));
}

/** Y a-t-il au moins un défenseur encore vivant mais pas à sa durabilité
 *  max ? — c'est-à-dire un vrai destinataire pour `fortify` (qui ne
 *  répare jamais une carte déjà détruite, voir `fortifyWeakestDefender`).
 *  Toutes pleines ou toutes détruites = rien à réparer. */
function anyDefenderDamaged(defHp: number[], defMax: number[]): boolean {
  return defHp.some((hp, i) => hp > 0 && hp < defMax[i]);
}

/** Cette capacité active ferait-elle vraiment quelque chose SI elle se
 *  déclenchait maintenant ? `powerStrike`/`guardBreak`/`trueStrike`
 *  aident toujours (elles portent sur LE COUP en cours) — seules
 *  `heal`/`fortify` peuvent tomber à vide : avec 3 cartes-écran, aucun
 *  coup n'atteint les PV avant le 4e tour, donc un soin déclenché plus
 *  tôt rendrait 0 PV manquant. Un déclenchement à vide serait à la fois
 *  illogique (soigner alors que rien n'a encore été perdu) et un gâchis
 *  pur pour le joueur — reporté au premier tour où ça compte plutôt que
 *  brûlé pour rien à la première occasion. */
function isActiveUseful(active: ActiveAbility, hp: number, maxHp: number, defHp: number[], defMax: number[]): boolean {
  if (active.kind === 'heal') return hp < maxHp;
  if (active.kind === 'fortify') return anyDefenderDamaged(defHp, defMax);
  return true;
}

/** Index du défenseur adverse visé par un attaquant précis : son
 *  assignation explicite (voir `challengerTargets` sur `resolveBattle`) si
 *  elle existe ENCORE (la carte visée peut avoir été détruite entre
 *  temps), sinon le premier défenseur adverse encore vivant — comportement
 *  automatique, identique à avant l'ajout du ciblage. `null` seulement une
 *  fois TOUS les défenseurs adverses détruits (les PV sont alors visés
 *  directement, quelle que soit l'assignation). */
function pickTargetIndex(defHp: number[], defenders: SlotStats[], assignedCardId: number | undefined): number | null {
  if (assignedCardId !== undefined) {
    const idx = defenders.findIndex((d) => d.cardId === assignedCardId);
    if (idx !== -1 && defHp[idx] > 0) return idx;
  }
  const idx = defHp.findIndex((hp) => hp > 0);
  return idx === -1 ? null : idx;
}

/** État d'un combat EN COURS — voir `initBattle`/`stepBattle` ci-dessous.
 *  Muté en place à chaque tour (pas de copie : un combat peut durer une
 *  vingtaine de tours, inutile de réallouer les tableaux à chaque fois). */
export interface BattleState {
  c: Side;
  o: Side;
  hpC: number;
  hpO: number;
  defHpC: number[];
  defHpO: number[];
  momC: boolean[];
  momO: boolean[];
  /** Capacité active déjà déclenchée pour cet attaquant (même index que
   *  `c.attackers`/`o.attackers`) — au plus une fois par carte, à sa toute
   *  première action du combat (voir stepBattle). */
  usedActiveC: boolean[];
  usedActiveO: boolean[];
  round: number;
  finished: boolean;
  winner: BattleResult['winner'] | null;
  rounds: RoundEvent[];
}

/** Prépare un combat sans jouer le moindre tour — voir `stepBattle` pour
 *  avancer, ou `resolveBattle` pour tout résoudre d'un coup (mode
 *  automatique/PvP). */
export function initBattle(challengerTeam: TeamSlot[], opponentTeam: TeamSlot[]): BattleState {
  const c = buildSide(challengerTeam);
  const o = buildSide(opponentTeam);
  return {
    c,
    o,
    hpC: c.maxHp,
    hpO: o.maxHp,
    defHpC: c.defMax.slice(),
    defHpO: o.defMax.slice(),
    momC: c.attackers.map(() => false),
    momO: o.attackers.map(() => false),
    usedActiveC: c.attackers.map(() => false),
    usedActiveO: o.attackers.map(() => false),
    round: 0,
    finished: false,
    winner: null,
    rounds: [],
  };
}

/** cardId des défenseurs adverses ENCORE VIVANTS à l'instant présent — pour
 *  construire le sélecteur de cible avant de jouer le tour suivant (mode
 *  "en direct", voir BattlesScreen). `null` si l'écran est déjà percé (les
 *  PV sont visés directement, plus rien à choisir). */
export function aliveDefenderIds(state: BattleState, side: 'challenger' | 'opponent'): number[] {
  const defenders = side === 'challenger' ? state.o.defenders : state.c.defenders;
  const defHp = side === 'challenger' ? state.defHpO : state.defHpC;
  return defenders.filter((_, i) => defHp[i] > 0).map((d) => d.cardId);
}

/** Durabilité restante / maximale d'une carte-écran, pour l'afficher quand
 *  on touche une carte pendant le combat (voir BattleCardStats). `owner`
 *  est le camp qui POSSÈDE la carte, pas celui qui l'attaque. `null` si la
 *  carte n'est pas une carte-écran de ce camp (une carte en Attaque n'a pas
 *  de durabilité : elle n'est jamais ciblée). */
export function defenderDurability(state: BattleState, owner: 'challenger' | 'opponent', cardId: number): { current: number; max: number } | null {
  const defenders = owner === 'challenger' ? state.c.defenders : state.o.defenders;
  const defHp = owner === 'challenger' ? state.defHpC : state.defHpO;
  const i = defenders.findIndex((d) => d.cardId === cardId);
  if (i === -1) return null;
  const defMax = owner === 'challenger' ? state.c.defMax : state.o.defMax;
  return { current: Math.max(0, defHp[i]), max: defMax[i] };
}

/** Sa capacité active de catégorie s'est-elle déjà déclenchée ? (voir
 *  BattleCardStats.) `false` pour une carte en Défense : elle n'attaque
 *  jamais, sa capacité active ne se déclenche donc jamais — seul son
 *  passif compte pour elle. */
export function hasActiveFired(state: BattleState, owner: 'challenger' | 'opponent', cardId: number): boolean {
  const attackers = owner === 'challenger' ? state.c.attackers : state.o.attackers;
  const used = owner === 'challenger' ? state.usedActiveC : state.usedActiveO;
  const i = attackers.findIndex((a) => a.cardId === cardId);
  return i !== -1 && used[i];
}

/** Résout UN SEUL tour à partir de l'état courant (muté en place) et
 *  renvoie l'événement produit — `null` si le combat était déjà terminé.
 *  `challengerTargets` : cible choisie pour CE tour précis pour chaque
 *  carte en Attaque du challenger (clé = son cardId) — voir `resolveBattle`
 *  pour le détail du repli automatique. Recalculée à chaque appel, donc
 *  rien n'empêche de choisir une cible différente d'un tour à l'autre
 *  (ciblage "en direct") ; `resolveBattle` se contente de passer LE MÊME
 *  objet à chaque tour pour un ciblage figé à la composition. */
export function stepBattle(state: BattleState, challengerTargets?: Record<number, number>): RoundEvent | null {
  if (state.finished) return null;
  const { c, o } = state;
  const nC = c.attackers.length || 1;
  const nO = o.attackers.length || 1;
  const round = state.round;
  const ai = round % nC;
  const oi = round % nO;
  const attC = c.attackers[ai];
  const attO = o.attackers[oi];
  const cDesperate = state.hpC / c.maxHp < DESPERATION_THRESHOLD;
  const oDesperate = state.hpO / o.maxHp < DESPERATION_THRESHOLD;
  const cHadMomentum = state.momC[ai];
  const oHadMomentum = state.momO[oi];

  // Capacité active de catégorie : au plus une fois par carte, à sa
  // PREMIÈRE ACTION UTILE (voir usedActiveC/O dans BattleState) — pas
  // forcément sa toute première action. `heal`/`fortify` soignent des PV
  // ou réparent un écran qui n'ont peut-être encore RIEN encaissé : avec
  // 3 cartes-écran, aucun coup n'atteint les PV avant le 4e tour, donc un
  // soin déclenché au 1er tour serait un pur gâchis (0 PV manquant à
  // rendre) — reporté jusqu'au premier tour où l'effet fait vraiment
  // quelque chose. Les autres formes (powerStrike/guardBreak/trueStrike)
  // aident toujours, quel que soit l'état du combat : rien à reporter.
  const cActive = !state.usedActiveC[ai] && isActiveUseful(attC.ability.active, state.hpC, c.maxHp, state.defHpC, c.defMax) ? attC.ability.active : null;
  if (cActive) state.usedActiveC[ai] = true;
  const oActive = !state.usedActiveO[oi] && isActiveUseful(attO.ability.active, state.hpO, o.maxHp, state.defHpO, o.defMax) ? attO.ability.active : null;
  if (oActive) state.usedActiveO[oi] = true;

  // ── Attaque du challenger, vise le camp adverse ──
  const targetOIdx = pickTargetIndex(state.defHpO, o.defenders, challengerTargets?.[attC.cardId]);
  const targetO = targetOIdx !== null ? o.defenders[targetOIdx] : null;
  const cAdv = !!targetO && attC.camp !== null && targetO.camp !== null && CAMP_BEATS[attC.camp] === targetO.camp;
  const cBonus = (cAdv ? CAMP_ADVANTAGE_BONUS : 0) + (cHadMomentum ? MOMENTUM_BONUS : 0) + (cDesperate ? DESPERATION_BONUS : 0);
  const atkC = Math.round(attC.atk * (1 + cBonus));
  // `guardBreak` (actif) ignore la DÉFENSE de la cible ce tour — sans
  // effet si les PV sont déjà visés directement (pas de DÉFENSE à ignorer).
  let cDmg = Math.max(1, atkC - (cActive?.kind === 'guardBreak' || !targetO ? 0 : targetO.def));
  if (cActive?.kind === 'powerStrike') cDmg = Math.round(cDmg * (1 + cActive.pct));
  let cCrit = false;
  let cBlocked = false;
  if (cActive?.kind === 'trueStrike') {
    // Coup critique garanti, imblocable — les deux tirages sont sautés.
    cCrit = true;
    cDmg *= 2;
  } else {
    const blockBonus = targetO?.ability.passive.kind === 'block' ? targetO.ability.passive.pct : 0;
    // `blockReduction` (passif de l'ATTAQUANT) réduit MULTIPLICATIVEMENT la
    // chance de blocage de la cible — pas une immunité totale.
    const blockReduction = attC.ability.passive.kind === 'blockReduction' ? attC.ability.passive.pct : 0;
    cBlocked = Math.random() < (BLOCK_CHANCE + blockBonus) * (1 - blockReduction);
    if (cBlocked) cDmg = 0;
    else if ((cCrit = Math.random() < CRIT_CHANCE)) cDmg *= 2;
  }
  let cDestroyed = false;
  if (targetOIdx !== null) {
    state.defHpO[targetOIdx] -= cDmg;
    if (state.defHpO[targetOIdx] <= 0) cDestroyed = true;
  } else {
    state.hpO = Math.max(0, state.hpO - cDmg);
  }
  // Vol de vie (passif) : soigne SA PROPRE équipe d'une part des dégâts
  // infligés — rien sur un coup bloqué (0 dégât, rien à voler).
  if (cDmg > 0 && attC.ability.passive.kind === 'lifesteal') {
    state.hpC = Math.min(c.maxHp, state.hpC + Math.round(cDmg * attC.ability.passive.pct));
  }
  // Épines (passif de la carte-écran visée) : renvoie une part du coup
  // DIRECTEMENT en PV à l'équipe qui vient de frapper — traverse l'écran
  // adverse, contrairement aux dégâts normaux.
  if (cDmg > 0 && targetO?.ability.passive.kind === 'thorns') {
    state.hpC = Math.max(0, state.hpC - Math.round(cDmg * targetO.ability.passive.pct));
  }
  // Soin / réparation d'écran (actif) : effet ponctuel EN PLUS de
  // l'attaque normale de ce tour, pas à la place.
  if (cActive?.kind === 'heal') state.hpC = Math.min(c.maxHp, state.hpC + Math.round(c.maxHp * cActive.pct));
  else if (cActive?.kind === 'fortify') fortifyWeakestDefender(state.defHpC, c.defMax, cActive.pct);
  state.momC[ai] = targetOIdx === null;

  // ── Attaque de l'adversaire, vise le camp du challenger — toujours
  // automatique (premier défenseur encore vivant), pas d'assignation
  // côté bot. ──
  const targetCIdx = pickTargetIndex(state.defHpC, c.defenders, undefined);
  const targetC = targetCIdx !== null ? c.defenders[targetCIdx] : null;
  const oAdv = !!targetC && attO.camp !== null && targetC.camp !== null && CAMP_BEATS[attO.camp] === targetC.camp;
  const oBonus = (oAdv ? CAMP_ADVANTAGE_BONUS : 0) + (oHadMomentum ? MOMENTUM_BONUS : 0) + (oDesperate ? DESPERATION_BONUS : 0);
  const atkO = Math.round(attO.atk * (1 + oBonus));
  let oDmg = Math.max(1, atkO - (oActive?.kind === 'guardBreak' || !targetC ? 0 : targetC.def));
  if (oActive?.kind === 'powerStrike') oDmg = Math.round(oDmg * (1 + oActive.pct));
  let oCrit = false;
  let oBlocked = false;
  if (oActive?.kind === 'trueStrike') {
    oCrit = true;
    oDmg *= 2;
  } else {
    const blockBonus = targetC?.ability.passive.kind === 'block' ? targetC.ability.passive.pct : 0;
    const blockReduction = attO.ability.passive.kind === 'blockReduction' ? attO.ability.passive.pct : 0;
    oBlocked = Math.random() < (BLOCK_CHANCE + blockBonus) * (1 - blockReduction);
    if (oBlocked) oDmg = 0;
    else if ((oCrit = Math.random() < CRIT_CHANCE)) oDmg *= 2;
  }
  let oDestroyed = false;
  if (targetCIdx !== null) {
    state.defHpC[targetCIdx] -= oDmg;
    if (state.defHpC[targetCIdx] <= 0) oDestroyed = true;
  } else {
    state.hpC = Math.max(0, state.hpC - oDmg);
  }
  if (oDmg > 0 && attO.ability.passive.kind === 'lifesteal') {
    state.hpO = Math.min(o.maxHp, state.hpO + Math.round(oDmg * attO.ability.passive.pct));
  }
  if (oDmg > 0 && targetC?.ability.passive.kind === 'thorns') {
    state.hpO = Math.max(0, state.hpO - Math.round(oDmg * targetC.ability.passive.pct));
  }
  if (oActive?.kind === 'heal') state.hpO = Math.min(o.maxHp, state.hpO + Math.round(o.maxHp * oActive.pct));
  else if (oActive?.kind === 'fortify') fortifyWeakestDefender(state.defHpO, o.defMax, oActive.pct);
  state.momO[oi] = targetCIdx === null;

  const event: RoundEvent = {
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
    challengerHp: state.hpC,
    opponentHp: state.hpO,
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
    challengerActiveKind: cActive?.kind ?? null,
    opponentActiveKind: oActive?.kind ?? null,
  };
  state.rounds.push(event);
  state.round++;

  if (state.hpC <= 0 || state.hpO <= 0 || state.round >= MAX_ROUNDS) {
    state.finished = true;
    let winner: BattleResult['winner'] = 'tie';
    if (state.hpC > 0 && state.hpO <= 0) winner = 'challenger';
    else if (state.hpO > 0 && state.hpC <= 0) winner = 'opponent';
    else if (state.hpC !== state.hpO) winner = state.hpC > state.hpO ? 'challenger' : 'opponent';
    state.winner = winner;
  }

  return event;
}

/** Entièrement déterministe pour l'ATTAQUE elle-même — voir
 *  functions/_lib/battle.ts. Résout le combat ENTIER d'un coup (mode
 *  automatique, et seule façon de résoudre un vrai combat PvP — voir
 *  `initBattle`/`stepBattle` pour un déroulé tour par tour, mode "Défier un
 *  bot" uniquement).
 *
 *  `challengerTargets` : pour CHAQUE carte en Attaque du challenger (clé =
 *  son cardId), la carte-écran adverse qu'elle vise en priorité tant
 *  qu'elle est vivante — le MÊME objet est réutilisé à chaque tour ici
 *  (ciblage figé pour tout le combat), contrairement à `stepBattle` où
 *  rien n'empêche de le changer d'un tour à l'autre. Sans assignation (ou
 *  une fois la cible assignée détruite), retombe sur l'automatique
 *  (premier défenseur adverse encore vivant). Toujours absent côté
 *  adversaire (bot) : son ciblage reste entièrement automatique. */
export function resolveBattle(challengerTeam: TeamSlot[], opponentTeam: TeamSlot[], challengerTargets?: Record<number, number>): BattleResult {
  const state = initBattle(challengerTeam, opponentTeam);
  while (!state.finished) stepBattle(state, challengerTargets);
  return {
    rounds: state.rounds,
    challengerMaxHp: state.c.maxHp,
    opponentMaxHp: state.o.maxHp,
    challengerSynergyBonus: state.c.synergy,
    opponentSynergyBonus: state.o.synergy,
    winner: state.winner!,
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

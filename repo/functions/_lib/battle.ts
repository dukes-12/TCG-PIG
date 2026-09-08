import { CARD_META } from './cardMeta';
import { categoryAbilityFor, type ActiveAbility, type CategoryAbility } from './categoryAbilities';

/** Système de combat — voir IDEES_AMIS_COMBAT.md pour la conception
 *  complète. Chaque carte a deux stats, ATTAQUE et DÉFENSE, dérivées
 *  indépendamment de sa rareté (échelle doublée par palier) et tirées une
 *  fois pour toutes via un hash déterministe de son id — pas stocké,
 *  recalculé à la volée. +50% (les deux stats) si la carte est en holo.
 *
 *  Combat à PV FIXES avec ÉCRAN DE DÉFENSEURS (façon "position défense" —
 *  Yu-Gi-Oh) : chaque équipe est composée d'EXACTEMENT 2 cartes en posture
 *  Attaque et 3 en posture Défense (plus de répartition libre). Chaque
 *  camp a une jauge de PV FIXE (500, +15% si bonus de synergie) — mais on
 *  ne peut PAS taper dedans directement : les 3 cartes en Défense de
 *  l'adversaire forment un écran, dans l'ordre où elles ont été alignées
 *  (la première ajoutée à l'équipe est la première visée). Une attaque
 *  cible toujours la première carte-écran adverse ENCORE DEBOUT ; une fois
 *  celle-ci détruite (durabilité — dérivée de sa DÉFENSE — tombée à 0),
 *  les coups suivants visent la suivante, et seulement quand LES TROIS
 *  sont détruites les attaques atteignent enfin les PV. Les 2 cartes en
 *  Attaque de chaque équipe cyclent chacune leur tour (comme avant), et ne
 *  sont jamais elles-mêmes une cible (l'écran, ce sont les défenseurs).
 *
 *  Camp, momentum, sursaut du désespoir s'ADDITIONNENT en un seul bonus
 *  d'ATTAQUE (pas de multiplicateurs enchaînés). Camp ne s'applique QUE
 *  face à un défenseur précis (l'attaquant a-t-il l'avantage sur CETTE
 *  carte-écran ?) — sans objet une fois qu'on tape directement dans les PV
 *  (qui n'ont pas de camp). Coup critique et bouclier restent des
 *  événements ponctuels aléatoires mais toujours VISIBLES dans le
 *  résultat, jamais fondus dans un chiffre. */

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

/** ±10% autour de la puissance de rareté (0.9 à 1.1) — voir
 *  src/lib/battle.ts pour l'explication complète (resserré depuis ±35%,
 *  qui laissait deux cartes de la MÊME rareté s'écarter d'un facteur ~2
 *  au point de garantir la victoire au meilleur tirage). */
const RARITY_VARIANCE_LO = 0.9;
const RARITY_VARIANCE_SPAN = 0.2;

/** `null` si la carte n'existe pas ou est la carte secrète (exclue du
 *  combat — un seul exemplaire au monde, ça mettrait une pression écrasante
 *  sur qui l'a). */
export function cardStats(cardId: number, holo: boolean): CardStats | null {
  const meta = CARD_META[cardId];
  if (!meta || meta.rarity === SECRET_RARITY_ID) return null;
  const base = RARITY_POWER[meta.rarity] ?? 0;
  const P = holo ? base * 1.5 : base;
  const atk = Math.max(1, Math.round(P * (RARITY_VARIANCE_LO + hash01(`${cardId}:atk`) * RARITY_VARIANCE_SPAN)));
  const def = Math.max(1, Math.round(P * (RARITY_VARIANCE_LO + hash01(`${cardId}:def`) * RARITY_VARIANCE_SPAN)));
  return { atk, def };
}

/** Posture choisie pour une carte à la composition de l'équipe — voir
 *  STANCE_MULT plus bas pour les multiplicateurs. Contrainte : EXACTEMENT
 *  2 "attaque" et 3 "defense" par équipe (voir isTeamShape). */
export type Stance = 'attaque' | 'defense';

const STANCE_MULT: Record<Stance, { atk: number; def: number }> = {
  attaque: { atk: 1.15, def: 0.85 },
  defense: { atk: 0.88, def: 1.18 },
};

/** Nombre de cartes en Attaque / en Défense imposé à chaque équipe. */
const ATTACKER_COUNT = 2;
const DEFENDER_COUNT = 3;

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

/** Bonus d'ATTAQUE (additif) pour un attaquant qui a l'avantage de camp
 *  sur le DÉFENSEUR qu'il vise précisément ce tour-ci — sans objet une
 *  fois les PV visés directement (ils n'ont pas de camp). */
const CAMP_ADVANTAGE_BONUS = 0.5;

/** Bonus d'ATTAQUE (additif) pour un attaquant dont le tour précédent a
 *  atteint les PV adverses directement (écran déjà percé) — récompense la
 *  percée plutôt qu'une simple comparaison de dégâts (qui n'a plus de sens
 *  ici : les défenseurs ne ripostent jamais). */
const MOMENTUM_BONUS = 0.4;

/** Bonus d'ATTAQUE (additif) pour une équipe tombée sous
 *  DESPERATION_THRESHOLD de ses PV max — permet de vrais retournements de
 *  situation en fin de combat. Évalué au début de chaque tour sur les PV
 *  du moment. */
const DESPERATION_BONUS = 0.3;
const DESPERATION_THRESHOLD = 0.25;

/** Coup critique : chance de doubler les dégâts d'une attaque. Bouclier :
 *  chance de les annuler complètement (0, pas même le minimum de 1
 *  garanti d'habitude) — vérifiée en premier, un coup bloqué ne peut pas
 *  aussi être critique. */
const CRIT_CHANCE = 0.15;
const BLOCK_CHANCE = 0.12;

/** PV fixes (pas dérivés des cartes) — 50, +15% si bonus de synergie. */
const BASE_PV = 50;

/** Durabilité d'une carte-écran = sa DÉFENSE (ajustée par la posture) ×
 *  DEFENDER_DURABILITY_MULT. Rééquilibrage (onzième passage,
 *  IDEES_AMIS_COMBAT.md) : la version précédente (PV=500, MULT=4) donnait
 *  des combats à ~100 tours en moyenne, bien trop long pour suivre tour par
 *  tour (et pour le ciblage choisi en direct ajouté à ce passage). Calibré
 *  par simulation pour ~10-20 tours à rareté égale — le nombre de tours
 *  dépend surtout de la durabilité de l'écran (l'ATTAQUE mitigée par la
 *  DÉFENSE adverse grignote lentement), donc PV et durabilité ont baissé
 *  ensemble, pas juste les PV. */
const DEFENDER_DURABILITY_MULT = 0.5;

/** Filet de sécurité — un combat doit toujours se terminer. Départagé par
 *  PV restants si jamais atteint. */
const MAX_ROUNDS = 1000;

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

/** Un tour de combat : l'attaquant en cycle de chaque équipe agit
 *  simultanément — le challenger vise le camp adverse, l'adversaire vise
 *  le camp du challenger. La cible est soit une carte-écran précise
 *  (`*TargetCardId`), soit `null` si l'écran adverse est déjà percé (les
 *  PV sont visés directement). */
export interface RoundEvent {
  round: number;
  /** Carte "Attaque" qui agit ce tour, de chaque côté. */
  challengerAttackerId: number;
  opponentAttackerId: number;
  /** ATTAQUE finale utilisée ce tour (posture, camp, momentum, désespoir —
   *  aucun aléa caché dedans). */
  challengerAtk: number;
  opponentAtk: number;
  /** Carte-écran visée par CETTE attaque, ou `null` si l'écran adverse est
   *  déjà percé et que les PV sont visés directement. */
  challengerTargetCardId: number | null;
  opponentTargetCardId: number | null;
  /** true si cette attaque vient de détruire la carte-écran visée. */
  challengerTargetDestroyed: boolean;
  opponentTargetDestroyed: boolean;
  /** Dégâts infligés par chaque attaquant ce tour-ci (après coup critique
   *  et bouclier éventuels) — à la carte-écran visée, ou aux PV si l'écran
   *  est percé. */
  challengerDamage: number;
  opponentDamage: number;
  /** PV restants de chaque équipe APRÈS ce tour (jamais négatif). */
  challengerHp: number;
  opponentHp: number;
  challengerCamp: Camp | null;
  opponentCamp: Camp | null;
  /** true si l'attaquant a l'avantage de camp sur SA cible précise
   *  (toujours false si les PV sont visés directement — déjà pris en
   *  compte dans *Atk ci-dessus). */
  challengerCampAdvantage: boolean;
  opponentCampAdvantage: boolean;
  /** true si le tour précédent DE CET ATTAQUANT a atteint les PV adverses
   *  directement (déjà pris en compte dans *Atk ci-dessus). */
  challengerMomentum: boolean;
  opponentMomentum: boolean;
  /** true si l'équipe était sous DESPERATION_THRESHOLD de ses PV max au
   *  début de ce tour (déjà pris en compte dans *Atk ci-dessus). */
  challengerDesperation: boolean;
  opponentDesperation: boolean;
  /** true si cette attaque était un coup critique (déjà pris en compte
   *  dans *Damage ci-dessus). */
  challengerCrit: boolean;
  opponentCrit: boolean;
  /** true si cette attaque a été bloquée par l'adversaire (0 dégâts, déjà
   *  pris en compte dans *Damage ci-dessus). */
  challengerBlocked: boolean;
  opponentBlocked: boolean;
  /** Capacité active de catégorie déclenchée CE tour par cet attaquant
   *  (`'heal'`, `'powerStrike'`...), ou `null` si aucune — voir
   *  categoryAbilities.ts. */
  challengerActiveKind: string | null;
  opponentActiveKind: string | null;
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
  cardId: number;
  atk: number;
  def: number;
  camp: Camp | null;
  /** Pouvoir de la CATÉGORIE de la carte (meta.type — voir
   *  categoryAbilities.ts), pas de son camp : passif toujours actif,
   *  capacité active déclenchée automatiquement à la première action de
   *  cette carte (voir resolveBattle, `usedActiveC`/`usedActiveO`). */
  ability: CategoryAbility;
}

function slotStats(s: TeamSlot): SlotStats {
  const base = cardStats(s.cardId, s.holo) ?? { atk: 0, def: 0 };
  // `?? STANCE_MULT.attaque` : un défi créé avant l'ajout des postures a
  // une équipe stockée sans `stance` — sans ce filet, ce combat plante à
  // la résolution. Repli sur "Attaque" plutôt qu'un plantage.
  const mult = STANCE_MULT[s.stance] ?? STANCE_MULT.attaque;
  const ability = categoryAbilityFor(CARD_META[s.cardId]?.type ?? 'Hors catégorie');
  // Les passifs `atk`/`def` sont pliés une fois pour toutes dans la stat,
  // comme la posture — mais seulement du côté où ils comptent (voir
  // src/lib/battle.ts pour le détail).
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

/** Bonus de synergie : 3+ cartes de la même catégorie dans l'équipe → +15%
 *  de PV max. */
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

interface Side {
  attackers: SlotStats[];
  defenders: SlotStats[];
  maxHp: number;
  synergy: number;
  /** Durabilité MAX de chaque défenseur (même ordre que `defenders`) — DEF
   *  × DEFENDER_DURABILITY_MULT, +bonus du passif `durability` de sa
   *  catégorie s'il y en a un (voir src/lib/battle.ts). */
  defMax: number[];
}

function buildSide(team: TeamSlot[]): Side {
  const stats = team.map(slotStats);
  const attackers = team.map((s, i) => (s.stance === 'attaque' ? stats[i] : null)).filter((s): s is SlotStats => s !== null);
  const defenders = team.map((s, i) => (s.stance === 'defense' ? stats[i] : null)).filter((s): s is SlotStats => s !== null);
  // Filet de sécurité : une équipe stockée avant l'ajout de la contrainte
  // 2 attaque / 3 défense (isTeamShape) pourrait n'avoir aucune carte en
  // Attaque — sans ce filet, `attackers[round % 0]` planterait la
  // résolution. Un combat qui tombe dans ce cas légitime dégrade
  // proprement (attaquant fantôme à 0 ATK) plutôt que de ne pas s'afficher.
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
 *  écrans de ce côté sont déjà détruits (rien à réparer). Voir
 *  src/lib/battle.ts pour la même fonction côté client. */
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
 *  répare jamais une carte déjà détruite). Toutes pleines ou toutes
 *  détruites = rien à réparer. Voir src/lib/battle.ts pour la même
 *  fonction côté client. */
function anyDefenderDamaged(defHp: number[], defMax: number[]): boolean {
  return defHp.some((hp, i) => hp > 0 && hp < defMax[i]);
}

/** Cette capacité active ferait-elle vraiment quelque chose SI elle se
 *  déclenchait maintenant ? `powerStrike`/`guardBreak`/`trueStrike`
 *  aident toujours — seules `heal`/`fortify` peuvent tomber à vide : avec
 *  3 cartes-écran, aucun coup n'atteint les PV avant le 4e tour, donc un
 *  soin déclenché plus tôt rendrait 0 PV manquant. Voir src/lib/battle.ts
 *  pour la même fonction côté client. */
function isActiveUseful(active: ActiveAbility, hp: number, maxHp: number, defHp: number[], defMax: number[]): boolean {
  if (active.kind === 'heal') return hp < maxHp;
  if (active.kind === 'fortify') return anyDefenderDamaged(defHp, defMax);
  return true;
}

/** Entièrement déterministe pour l'ATTAQUE elle-même (pas d'aléa caché
 *  dedans) ; coup critique et bouclier restent des tirages au sort, mais
 *  toujours VISIBLES dans le résultat (icônes dédiées côté client), jamais
 *  fondus dans un chiffre. */
export function resolveBattle(challengerTeam: TeamSlot[], opponentTeam: TeamSlot[]): BattleResult {
  const c = buildSide(challengerTeam);
  const o = buildSide(opponentTeam);

  let hpC = c.maxHp;
  let hpO = o.maxHp;
  // Durabilité restante de chaque carte-écran, dans l'ordre où elles ont
  // été alignées (front[0] = première visée).
  const defHpC = c.defMax.slice();
  const defHpO = o.defMax.slice();
  let frontC = 0; // index de la prochaine carte-écran du CHALLENGER encore debout (visée par l'adversaire)
  let frontO = 0;
  const momC = c.attackers.map(() => false);
  const momO = o.attackers.map(() => false);
  // Capacité active déjà déclenchée pour cet attaquant (même index que
  // c.attackers/o.attackers) — au plus une fois par carte, à sa toute
  // première action du combat.
  const usedActiveC = c.attackers.map(() => false);
  const usedActiveO = o.attackers.map(() => false);
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

    // Capturés AVANT d'être écrasés plus bas par le résultat de CE tour —
    // ce sont ces valeurs (issues du tour précédent de CET attaquant) qui
    // ont servi à booster l'attaque ci-dessous, et c'est bien elles qu'il
    // faut afficher pour ce tour.
    const cHadMomentum = momC[ai];
    const oHadMomentum = momO[oi];

    // Capacité active de catégorie : au plus une fois par carte, à sa
    // PREMIÈRE ACTION UTILE — voir isActiveUseful (src/lib/battle.ts pour
    // l'explication complète : un soin/une réparation déclenché avant que
    // quoi que ce soit soit endommagé serait un pur gâchis).
    const cActive = !usedActiveC[ai] && isActiveUseful(attC.ability.active, hpC, c.maxHp, defHpC, c.defMax) ? attC.ability.active : null;
    if (cActive) usedActiveC[ai] = true;
    const oActive = !usedActiveO[oi] && isActiveUseful(attO.ability.active, hpO, o.maxHp, defHpO, o.defMax) ? attO.ability.active : null;
    if (oActive) usedActiveO[oi] = true;

    // ── Attaque du challenger, vise le camp adverse ──
    const targetO = frontO < o.defenders.length ? o.defenders[frontO] : null;
    const cAdv = !!targetO && attC.camp !== null && targetO.camp !== null && CAMP_BEATS[attC.camp] === targetO.camp;
    const cBonus = (cAdv ? CAMP_ADVANTAGE_BONUS : 0) + (cHadMomentum ? MOMENTUM_BONUS : 0) + (cDesperate ? DESPERATION_BONUS : 0);
    const atkC = Math.round(attC.atk * (1 + cBonus));
    // `guardBreak` (actif) ignore la DÉFENSE de la cible ce tour — sans
    // effet si les PV sont déjà visés directement.
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
    if (targetO) {
      defHpO[frontO] -= cDmg;
      if (defHpO[frontO] <= 0) {
        cDestroyed = true;
        frontO++;
      }
    } else {
      hpO = Math.max(0, hpO - cDmg);
    }
    // Vol de vie (passif) : soigne SA PROPRE équipe d'une part des dégâts
    // infligés — rien sur un coup bloqué (0 dégât, rien à voler).
    if (cDmg > 0 && attC.ability.passive.kind === 'lifesteal') {
      hpC = Math.min(c.maxHp, hpC + Math.round(cDmg * attC.ability.passive.pct));
    }
    // Épines (passif de la carte-écran visée) : renvoie une part du coup
    // DIRECTEMENT en PV à l'équipe qui vient de frapper.
    if (cDmg > 0 && targetO?.ability.passive.kind === 'thorns') {
      hpC = Math.max(0, hpC - Math.round(cDmg * targetO.ability.passive.pct));
    }
    // Soin / réparation d'écran (actif) : effet ponctuel EN PLUS de
    // l'attaque normale de ce tour, pas à la place.
    if (cActive?.kind === 'heal') hpC = Math.min(c.maxHp, hpC + Math.round(c.maxHp * cActive.pct));
    else if (cActive?.kind === 'fortify') fortifyWeakestDefender(defHpC, c.defMax, cActive.pct);
    momC[ai] = targetO === null; // a atteint les PV directement ce tour

    // ── Attaque de l'adversaire, vise le camp du challenger ──
    const targetC = frontC < c.defenders.length ? c.defenders[frontC] : null;
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
    if (targetC) {
      defHpC[frontC] -= oDmg;
      if (defHpC[frontC] <= 0) {
        oDestroyed = true;
        frontC++;
      }
    } else {
      hpC = Math.max(0, hpC - oDmg);
    }
    if (oDmg > 0 && attO.ability.passive.kind === 'lifesteal') {
      hpO = Math.min(o.maxHp, hpO + Math.round(oDmg * attO.ability.passive.pct));
    }
    if (oDmg > 0 && targetC?.ability.passive.kind === 'thorns') {
      hpO = Math.max(0, hpO - Math.round(oDmg * targetC.ability.passive.pct));
    }
    if (oActive?.kind === 'heal') hpO = Math.min(o.maxHp, hpO + Math.round(o.maxHp * oActive.pct));
    else if (oActive?.kind === 'fortify') fortifyWeakestDefender(defHpO, o.defMax, oActive.pct);
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
      challengerActiveKind: cActive?.kind ?? null,
      opponentActiveKind: oActive?.kind ?? null,
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

/** Juste la forme (5 entrées `{cardId, holo, stance}`, EXACTEMENT
 *  ATTACKER_COUNT en "attaque" et DEFENDER_COUNT en "defense") — ne
 *  vérifie ni la possession ni les doublons, voir `teamError` pour ça. */
export function isTeamShape(team: unknown): team is TeamSlot[] {
  if (!Array.isArray(team) || team.length !== 5) return false;
  const ok = team.every((s) => {
    if (typeof s !== 'object' || s === null) return false;
    const o = s as Record<string, unknown>;
    return typeof o.cardId === 'number' && typeof o.holo === 'boolean' && (o.stance === 'attaque' || o.stance === 'defense');
  });
  if (!ok) return false;
  const t = team as TeamSlot[];
  const attackers = t.filter((s) => s.stance === 'attaque').length;
  const defenders = t.filter((s) => s.stance === 'defense').length;
  return attackers === ATTACKER_COUNT && defenders === DEFENDER_COUNT;
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

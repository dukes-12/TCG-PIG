#!/usr/bin/env node
// Régénère functions/_lib/cardMeta.ts depuis src/data/cards.json — les Pages
// Functions n'importent pas le catalogue front-end (voir le commentaire en
// tête du fichier généré), donc la table id → {rarity, type} qui sert au
// calcul de puissance de combat côté serveur (functions/_lib/battle.ts) doit
// être régénérée à la main à chaque ajout/retrait de carte ou changement de
// rareté/catégorie.
//
// Usage : node scripts/gen-card-meta.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const cardsPath = join(root, 'src/data/cards.json');
const outPath = join(root, 'functions/_lib/cardMeta.ts');

const data = JSON.parse(readFileSync(cardsPath, 'utf8'));

const lines = [
  "/** Table id → {rarity, type}, générée depuis src/data/cards.json par",
  " *  scripts/gen-card-meta.mjs — ne pas éditer à la main. Les Pages",
  " *  Functions n'importent pas le catalogue front-end (voir SECRET_CARD_ID",
  " *  dans functions/api/profile/[username].ts) — même logique ici, à",
  " *  l'échelle de tout le catalogue : la puissance de combat dépend de la",
  " *  rareté (functions/_lib/battle.ts), calculée côté serveur — jamais fait",
  " *  confiance à ce que le client prétend, donc il lui faut sa propre",
  " *  source de vérité. Relancer ce script après tout ajout/retrait de",
  " *  carte ou changement de rareté/catégorie dans cards.json. */",
  '',
  'export interface CardMeta {',
  '  rarity: number;',
  '  type: string;',
  '}',
  '',
  'export const CARD_META: Record<number, CardMeta> = {',
  ...data.cards.map((c) => `  ${c.id}: { rarity: ${c.rarity}, type: ${JSON.stringify(c.type)} },`),
  '};',
];

writeFileSync(outPath, lines.join('\n') + '\n');
console.log(`Généré ${outPath} (${data.cards.length} cartes).`);

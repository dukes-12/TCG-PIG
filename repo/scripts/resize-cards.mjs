#!/usr/bin/env node
/**
 * Normalise les visuels de cartes : 800 × 800, JPEG qualité 88, nom en
 * minuscules.
 *
 *   npm i -D sharp
 *   node scripts/resize-cards.mjs            # écrit sur place
 *   node scripts/resize-cards.mjs --dry-run  # liste sans rien toucher
 *
 * Deux choses corrigées d'un coup :
 *
 * 1. **La taille.** Les 141 visuels sont déjà carrés mais vont de 800 à
 *    1408 px (jusqu'à 440 ko l'unité). En 800 × 800 la carte est rendue au
 *    plus à ~330 px de large en grand format — le reste est du poids pur.
 *
 * 2. **La casse de l'extension.** 22 fichiers sont en `.JPG` majuscule
 *    (060 → 078, 104 → 106) alors que `cards.json` référence `.jpg`. En
 *    local sur macOS/Windows (systèmes insensibles à la casse) ça passe ;
 *    sur un hébergement Linux — GitHub Pages, Vercel, Netlify — c'est un
 *    404 et la carte tombe sur le placeholder. Le script renomme tout en
 *    minuscules.
 */

import { readdir, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const DIR = path.resolve('public/assets/cards');
const SIZE = 800;
const QUALITY = 88;
const dryRun = process.argv.includes('--dry-run');

const files = (await readdir(DIR)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();

let resized = 0;
let renamed = 0;
let skipped = 0;
let before = 0;
let after = 0;

for (const file of files) {
  const src = path.join(DIR, file);
  const target = path.join(DIR, file.replace(/\.(jpe?g|JPE?G)$/i, '.jpg').toLowerCase());
  const meta = await sharp(src).metadata();
  const size = (await stat(src)).size;
  before += size;

  const needsResize = (meta.width ?? 0) > SIZE || (meta.height ?? 0) > SIZE;
  const needsRename = src !== target;

  if (!needsResize && !needsRename) {
    skipped += 1;
    after += size;
    continue;
  }

  if (dryRun) {
    console.log(
      `${file} — ${meta.width}×${meta.height}` +
        (needsResize ? ` → ${SIZE}×${SIZE}` : '') +
        (needsRename ? ` → ${path.basename(target)}` : ''),
    );
    continue;
  }

  if (needsResize) {
    // On passe par un buffer : sharp ne peut pas écrire dans le fichier
    // qu'il est en train de lire.
    const buf = await sharp(src)
      .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();
    await sharp(buf).toFile(target);
    if (needsRename) await rm(src);
    resized += 1;
  } else if (needsRename) {
    await rename(src, target);
    renamed += 1;
  }
  after += (await stat(target)).size;
}

async function rm(p) {
  const { unlink } = await import('node:fs/promises');
  await unlink(p);
}

const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' Mo';
console.log(
  dryRun
    ? `\n${files.length} fichiers inspectés (aucune écriture).`
    : `\n${files.length} fichiers : ${resized} redimensionnés, ${renamed} renommés, ${skipped} déjà conformes.\n` +
      `Poids total : ${mb(before)} → ${mb(after)}.`,
);

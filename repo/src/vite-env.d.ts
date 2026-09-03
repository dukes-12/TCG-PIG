/// <reference types="vite/client" />

// Déclare `import.meta.env` (BASE_URL, MODE, DEV, PROD…). Sans ce fichier,
// TypeScript signale « La propriété 'env' n'existe pas sur le type
// 'ImportMeta' » — ts(2339) — dès qu'un composant lit `import.meta.env`,
// ce que fait `components/CardArt.tsx` pour construire le chemin des visuels.

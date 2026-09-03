import type { AvatarKey } from '../types';

/** Les avatars de profil — un museau de cochon décliné en plusieurs
 *  couleurs, dessiné en CSS via `Snout` (pas de nouvel asset). Tous
 *  débloqués d'office : c'est une identité visuelle, pas une rareté à
 *  collectionner comme les dos de carte (voir `cardBacks.ts`). */
export interface AvatarSkin {
  key: AvatarKey;
  name: string;
  bg: string;
  nostrilColor: string;
}

export const AVATARS: AvatarSkin[] = [
  { key: 'classique', name: 'Classique', bg: '#ffd2b4', nostrilColor: '#8c491a' },
  { key: 'truffe-rose', name: 'Truffe rose', bg: 'linear-gradient(160deg,#ffd2b4,#f6a06b)', nostrilColor: '#8c491a' },
  { key: 'sanglier', name: 'Sanglier', bg: 'linear-gradient(160deg,#b2622d,#643312)', nostrilColor: '#2b1608' },
  { key: 'dore', name: 'Doré', bg: 'linear-gradient(160deg,#ffe9b0,#c99a3a)', nostrilColor: '#4a3410' },
  { key: 'nuit-violette', name: 'Nuit violette', bg: 'linear-gradient(160deg,#a678d8,#43206d)', nostrilColor: '#160a24' },
  { key: 'prairie', name: 'Prairie', bg: 'linear-gradient(160deg,#c3dba3,#5b7a3a)', nostrilColor: '#2f4a1a' },
  { key: 'givre-bleu', name: 'Givre bleu', bg: 'linear-gradient(150deg,#a9cdf5,#2f5c9e)', nostrilColor: '#e8f2ff' },
  { key: 'onyx', name: 'Onyx', bg: '#201e1d', nostrilColor: '#ffe9b0' },
];

export const DEFAULT_AVATAR: AvatarKey = 'truffe-rose';

export const avatarByKey = (key: AvatarKey): AvatarSkin => AVATARS.find((a) => a.key === key) ?? AVATARS[0];

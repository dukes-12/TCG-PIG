import type { CSSProperties } from 'react';
import { avatarByKey } from '../data/avatars';
import type { AvatarKey } from '../types';
import Snout from './Snout';

/** La photo de profil — un museau `Snout` dans les couleurs de l'avatar
 *  choisi. Utilisé dans Profil (le sien), Amis et la fiche d'un joueur
 *  (celui d'un autre, renvoyé par `/api/profile/:username`). */
export default function Avatar({ avatar, size = 74, boxShadow = 'var(--shadow-md)', style }: { avatar: AvatarKey; size?: number; boxShadow?: string; style?: CSSProperties }) {
  const a = avatarByKey(avatar);
  return (
    <Snout
      width={size}
      height={size}
      nostrilWidth={Math.round(size * 0.16)}
      nostrilHeight={Math.round(size * 0.26)}
      gap={Math.round(size * 0.15)}
      bg={a.bg}
      nostrilColor={a.nostrilColor}
      boxShadow={boxShadow}
      style={style}
    />
  );
}

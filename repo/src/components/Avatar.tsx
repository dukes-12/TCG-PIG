import type { CSSProperties } from 'react';
import { avatarByKey } from '../data/avatars';
import type { AvatarKey } from '../types';
import Snout from './Snout';

/** La photo de profil. Deux sources : une photo choisie dans la galerie de
 *  l'appareil (`photo`, une data URI — voir lib/photo.ts), sinon un museau
 *  `Snout` dans les couleurs de l'avatar préréglé (`avatar`). `photo` gagne
 *  quand les deux sont fournis. Utilisé dans Profil (le sien), Amis et la
 *  fiche d'un joueur (celui d'un autre, renvoyé par `/api/profile/:username`
 *  et `/api/friends`). */
export default function Avatar({
  avatar,
  photo,
  size = 74,
  boxShadow = 'var(--shadow-md)',
  style,
}: {
  avatar: AvatarKey;
  photo?: string | null;
  size?: number;
  boxShadow?: string;
  style?: CSSProperties;
}) {
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flex: 'none', boxShadow, ...style }}
      />
    );
  }

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

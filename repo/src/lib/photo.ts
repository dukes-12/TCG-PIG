/** Lit un fichier image choisi dans la galerie de l'appareil, le recadre en
 *  carré (centré, pour ne pas déformer un portrait rectangulaire) et le
 *  redimensionne/compresse en JPEG — le résultat (une data URI) est ce qui
 *  finit dans `avatarPhoto`, stocké et synchronisé comme le reste de l'état
 *  persistant. Volontairement petit (128 px, qualité 0.75 → quelques Ko) :
 *  cette data URI voyage dans `state_json` à chaque sync et dans les
 *  réponses `/api/friends` et `/api/profile/:username` pour tout le monde —
 *  pas d'upload/stockage de fichier séparé à gérer côté serveur. */

const MAX_SIDE = 128;
const JPEG_QUALITY = 0.75;
/** Garde-fou : au-delà, quelque chose s'est mal passé (image bizarre, très
 *  bruitée) — mieux vaut refuser que de gonfler chaque sync. */
const MAX_DATA_URI_LENGTH = 120_000;

export async function readAndCompressPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choisis une image.');

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onerror = () => reject(new Error('Image illisible.'));
    el.onload = () => resolve(el);
    el.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = MAX_SIDE;
  canvas.height = MAX_SIDE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible.');

  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, MAX_SIDE, MAX_SIDE);

  const out = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  if (out.length > MAX_DATA_URI_LENGTH) throw new Error('Image trop lourde, essaie une autre photo.');
  return out;
}

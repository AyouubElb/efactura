import { FILE_TYPES, MAX_FILE_BYTES, type FileType } from './purchases.types';

// A 6 MB phone photo becomes ~1 MB: faster to send, cheaper to read, still sharp
const MAX_WIDTH = 2000;
const JPEG_QUALITY = 0.85;

export type Prepared =
  | { ok: true; blob: Blob; type: FileType; sha256: string }
  | { ok: false; error: string };

const WRONG_TYPE = 'Fichier refusé : un PDF ou une photo JPEG, PNG ou WebP.';
const UNREADABLE_PHOTO =
  "Ce format de photo n'est pas lu : envoyez une photo JPEG ou un PDF.";
const TOO_HEAVY = 'Fichier trop lourd : 10 Mo au plus.';

function isFileType(type: string): type is FileType {
  return (FILE_TYPES as readonly string[]).includes(type);
}

// The fingerprint is the sent bytes': the worker checks it again on the stored file
export async function prepareFile(file: File): Promise<Prepared> {
  if (file.type === 'application/pdf') {
    return finish(file, 'application/pdf');
  }
  const photo =
    file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name);
  if (!photo) {
    return { ok: false, error: WRONG_TYPE };
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return isFileType(file.type)
      ? finish(file, file.type)
      : { ok: false, error: UNREADABLE_PHOTO };
  }
  if (isFileType(file.type) && bitmap.width <= MAX_WIDTH) {
    bitmap.close();
    return finish(file, file.type);
  }
  const jpeg = await toJpeg(bitmap);
  return jpeg
    ? finish(jpeg, 'image/jpeg')
    : { ok: false, error: UNREADABLE_PHOTO };
}

// The photo the browser drew, at most 2 000 px wide, on white for a see-through PNG
async function toJpeg(bitmap: ImageBitmap): Promise<Blob | null> {
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return null;
  }
  context.fillStyle = 'white';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
}

async function finish(blob: Blob, type: FileType): Promise<Prepared> {
  if (blob.size > MAX_FILE_BYTES) {
    return { ok: false, error: TOO_HEAVY };
  }
  const digest = await crypto.subtle.digest(
    'SHA-256',
    await blob.arrayBuffer(),
  );
  const sha256 = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return { ok: true, blob, type, sha256 };
}

// Straight to storage with its 5-minute link; the percentage comes from the browser
export function sendFile(
  url: string,
  blob: Blob,
  type: FileType,
  onProgress: (percent: number) => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url);
    request.setRequestHeader('Content-Type', type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () =>
      resolve(request.status >= 200 && request.status < 300);
    request.onerror = () => resolve(false);
    request.send(blob);
  });
}

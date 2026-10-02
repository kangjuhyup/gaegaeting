import { publicConfig } from '../runtime-config.js';

const MAX_BYTES = 5 * 1024 * 1024;

export async function prepareProfileImage(file: File): Promise<Blob> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !file.size || file.size > MAX_BYTES) {
    throw new Error('PNG, JPG, WebP 형식의 5MB 이하 사진을 선택해 주세요.');
  }
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error('사진을 읽을 수 없습니다. 다른 사진을 선택해 주세요.'); }
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width > 4096 || bitmap.height > 4096) {
      throw new Error('가로·세로 4096px 이하 사진을 선택해 주세요.');
    }
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('사진 변환을 사용할 수 없습니다.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    // Re-encode decoded pixels, excluding EXIF location and other original metadata.
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob || blob.size > MAX_BYTES) throw new Error('사진 용량이 큽니다. 더 작은 사진을 선택해 주세요.');
    return blob;
  } finally { bitmap.close(); }
}

export async function uploadProfileImage(url: string, body: Blob): Promise<void> {
  const allowed = publicConfig.imageStorageOrigin;
  if (!allowed || new URL(url).origin !== new URL(allowed).origin) {
    throw new Error('사진 업로드를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.');
  }
  const response = await fetch(url, { method: 'PUT', body, headers: { 'content-type': 'image/png' }, credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error('사진 업로드에 실패했습니다. 다시 시도해 주세요.');
}

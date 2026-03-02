import { offlineDb } from './db';

const MAX_WIDTH = 1920;
const QUALITY = 0.8;
const MAX_PHOTOS_PER_INTERVENTION = 30;
const PHOTO_WARNING_THRESHOLD = 25;

export async function compressPhoto(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > MAX_WIDTH) {
        height = (height * MAX_WIDTH) / width;
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        'image/jpeg',
        QUALITY,
      );
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Image load failed'));
    };
    img.src = URL.createObjectURL(file);
  });
}

export async function checkPhotoLimit(
  jobId: string,
): Promise<{ allowed: boolean; count: number; warning: boolean }> {
  const count = await offlineDb.mutations
    .where({ type: 'photo', jobId })
    .filter((m) => m.status !== 'done')
    .count();
  return {
    allowed: count < MAX_PHOTOS_PER_INTERVENTION,
    count,
    warning: count >= PHOTO_WARNING_THRESHOLD,
  };
}

export async function checkStorageQuota(): Promise<{
  percentUsed: number;
  warning: boolean;
}> {
  if (!navigator.storage?.estimate) return { percentUsed: 0, warning: false };
  const est = await navigator.storage.estimate();
  const pct = est.quota ? ((est.usage ?? 0) / est.quota) * 100 : 0;
  return { percentUsed: Math.round(pct), warning: pct > 80 };
}

export async function preparePhotoForUpload(file, { maxEdge = 1800, quality = 0.86 } = {}) {
  if (!(file instanceof Blob) || !/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Choose a JPEG, PNG, or WebP image.');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height); context.drawImage(bitmap, 0, 0, width, height); bitmap.close();
  const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('The photo could not be compressed.')), 'image/jpeg', quality));
  const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
  return { dataUrl, mimeType: 'image/jpeg', width, height, byteSize: blob.size };
}

export function requestId(prefix = 'upload') {
  return `${prefix}-${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

/**
 * Downscales and compresses an image file on the client before uploading,
 * reducing weight (and upload/download time) without losing too much quality.
 * Returns the original file if compression isn't possible or doesn't help.
 */
export async function compressImage(
  file: File,
  maxSize = 1280,
  quality = 0.82,
): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

  try {
    const dataUrl = await readAsDataUrl(file);
    const img = await loadImage(dataUrl);

    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    // Fill an opaque white background first so transparent (PNG) areas don't
    // turn black when encoded as JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      // Ensure pixels are fully decoded before the caller draws to canvas,
      // otherwise some browsers paint a blank/black frame.
      try {
        if (img.decode) await img.decode();
      } catch {
        /* ignore: fall back to the loaded image */
      }
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

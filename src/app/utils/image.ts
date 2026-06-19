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
    // createImageBitmap decodes the file fully (and applies EXIF orientation)
    // before returning, which avoids the "solid black" frame produced when the
    // canvas is drawn from a not-yet-decoded <img>. We fall back to <img> only
    // if the browser lacks createImageBitmap.
    const source = await loadSource(file);
    if (!source) return file;

    const { width: srcW, height: srcH } = source;
    const scale = Math.min(1, maxSize / Math.max(srcW, srcH));
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    // Fill an opaque white background first so transparent (PNG) areas don't
    // turn black when encoded as JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(source.image as CanvasImageSource, 0, 0, width, height);
    if ('close' in source.image) (source.image as ImageBitmap).close();

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

type DecodedSource = { image: CanvasImageSource; width: number; height: number };

async function loadSource(file: File): Promise<DecodedSource | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return { image: bitmap, width: bitmap.width, height: bitmap.height };
    } catch {
      /* fall back to <img> below */
    }
  }
  try {
    const dataUrl = await readAsDataUrl(file);
    const img = await loadImage(dataUrl);
    return { image: img, width: img.naturalWidth, height: img.naturalHeight };
  } catch {
    return null;
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

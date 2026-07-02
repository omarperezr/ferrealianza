interface ShareableProduct {
  code: string;
  name: string;
  category?: string;
  amountPerPackage?: string;
  price: number;
  imageUrl?: string;
}

export type ShareResult = 'shared' | 'copied';

function buildProductText(product: ShareableProduct): string {
  const lines = [
    `*${product.name}*`,
    `Código: ${product.code}`,
    product.category ? `Categoría: ${product.category}` : '',
    product.amountPerPackage ? `Paquete: ${product.amountPerPackage}` : '',
    `Precio: $${Number(product.price).toFixed(2)}`,
    '',
    'FerreAlianza Import, C.A.',
  ];
  return lines.filter(Boolean).join('\n');
}

/**
 * Shares a product's basic data (and its photo when available) using the
 * native share sheet on mobile, so the user can send it to WhatsApp and other
 * apps. Falls back to copying the data to the clipboard on unsupported
 * browsers (e.g. desktop).
 *
 * Throws `AbortError` if the user dismisses the native share sheet; callers
 * should ignore that case.
 */
export async function shareProduct(product: ShareableProduct): Promise<ShareResult> {
  const text = buildProductText(product);
  const title = product.name;
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };

  // 1) Try sharing with the product image attached.
  if (product.imageUrl && typeof nav.share === 'function' && typeof nav.canShare === 'function') {
    try {
      const response = await fetch(product.imageUrl);
      const blob = await response.blob();
      const extension = (blob.type.split('/')[1] || 'jpg').split('+')[0];
      const file = new File([blob], `${product.code || 'producto'}.${extension}`, {
        type: blob.type || 'image/jpeg',
      });

      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title, text });
        return 'shared';
      }
    } catch (error: any) {
      // If the user cancelled, surface it so the caller can stay silent.
      if (error?.name === 'AbortError') throw error;
      // Otherwise fall through to text-only sharing.
    }
  }

  // 2) Text-only native share (image not supported or unavailable).
  if (typeof nav.share === 'function') {
    const shareData: ShareData = { title, text };
    if (product.imageUrl) shareData.url = product.imageUrl;
    await nav.share(shareData);
    return 'shared';
  }

  // 3) Clipboard fallback for desktop browsers without the Share API.
  const clipboardText = product.imageUrl ? `${text}\n${product.imageUrl}` : text;
  await navigator.clipboard.writeText(clipboardText);
  return 'copied';
}

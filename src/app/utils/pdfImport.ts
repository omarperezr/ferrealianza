// Extracts products (and their images) from a price-list PDF (the "LISTA DE …"
// format).
//
// The PDF is a table with fixed columns identified by their horizontal (x)
// position: category, code, product name, packaging unit (EMP), an image
// column and the price (Ref). Rows are reconstructed by grouping text
// fragments that share a similar vertical (y) position.
//
// Each product row carries a small product image in the "Imagen" column. We
// render the page and crop that cell per row to recover the image. Cells that
// are blank yield no image, so the caller can leave the existing image intact.
//
// Pages that are full-page images, and promotional images placed between
// products, contain no text in the code/price columns, so they yield no rows
// and are skipped automatically.
import * as pdfjsLib from 'pdfjs-dist';
// Vite resolves this to a URL string for the worker bundle.
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc as string;

export interface ExtractedImage {
  hash: string; // content hash so identical images are uploaded only once
  blob: Blob;
}

export interface PdfProduct {
  code: string;
  name: string;
  category: string;
  amountPerPackage: string;
  price: number;
  image?: ExtractedImage;
}

interface Frag {
  s: string;
  x: number;
  y: number;
}

// Image cell geometry (PDF points). The product images sit in the "Imagen"
// column at roughly x∈[375,485] and are ~73pt tall, vertically centered on the
// product's text row.
const IMG_X_LEFT = 372;
const IMG_X_RIGHT = 488;
const IMG_HALF_ABOVE = 46; // PDF points above the row anchor
const IMG_HALF_BELOW = 40; // PDF points below the row anchor

// Column boundaries (left edge in PDF points), derived from the list layout.
// The thresholds sit in the empty gaps between columns so a fragment is
// classified by where it starts: category ≈48, code ≈63-80, product name
// ≈135-270, EMP ≈300-330, image ≈407, price ≈519. Earlier thresholds of
// 140 (code/name) and 305 (name/emp) were too tight — a name starting at
// x≈139 fell into the code column and an EMP value at x≈304 fell into the
// name — so they're widened into the actual gaps (110 and 290).
function columnOf(x: number): 'cat' | 'code' | 'name' | 'emp' | 'img' | 'price' {
  if (x < 65) return 'cat';
  if (x < 110) return 'code';
  if (x < 290) return 'name';
  if (x < 405) return 'emp';
  if (x < 500) return 'img';
  return 'price';
}

// Parses prices like "2,70" or "10,47" (comma decimal). Returns null if not a
// number, which is how header rows ("Ref") and image rows get filtered out.
function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.,]/g, '');
  if (!cleaned) return null;
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const n = parseFloat(normalized);
  return isNaN(n) ? null : n;
}

interface ParsedRow extends Omit<PdfProduct, 'image'> {
  anchorY: number; // y of the code fragment, used to crop the image cell
}

function rowsFromFragments(frags: Frag[]): ParsedRow[] {
  // Group fragments into rows by their y position (tolerance ~ half a row).
  const sorted = [...frags].sort((a, b) => b.y - a.y);
  const rows: { y: number; items: Frag[] }[] = [];
  for (const f of sorted) {
    let row = rows.find((r) => Math.abs(r.y - f.y) <= 40);
    if (!row) {
      row = { y: f.y, items: [] };
      rows.push(row);
    }
    row.items.push(f);
  }

  const products: ParsedRow[] = [];
  for (const row of rows) {
    const cols: Record<string, Frag[]> = { cat: [], code: [], name: [], emp: [], price: [] };
    for (const it of row.items) {
      const c = columnOf(it.x);
      if (c === 'img') continue;
      cols[c].push(it);
    }

    const codeFrags = cols.code;
    const code = codeFrags.map((i) => i.s).join(' ').trim();
    const price = parsePrice(cols.price.map((i) => i.s).join(' '));

    // A valid product row needs a code and a numeric price. This skips the
    // header row ("Codigo"/"Ref"), the title and any image-only rows.
    if (!code || /^c[oó]digo$/i.test(code) || price === null) continue;

    const nameItems = [...cols.name].sort((a, b) =>
      Math.abs(a.y - b.y) > 5 ? b.y - a.y : a.x - b.x,
    );

    products.push({
      category: cols.cat.map((i) => i.s).join(' ').replace(/\s+/g, ' ').trim(),
      code,
      name: nameItems.map((i) => i.s).join(' ').replace(/\s+/g, ' ').trim(),
      amountPerPackage: cols.emp.map((i) => i.s).join(' ').replace(/\s+/g, ' ').trim(),
      price,
      anchorY: codeFrags[0]?.y ?? row.y,
    });
  }
  return products;
}

// Fast content hash (FNV-1a) over a ~40x30 grid of sampled pixels, used to
// detect blank cells and to deduplicate identical images across rows/pages.
// Also reports how much of the sample is transparent: a fully transparent
// readback means the page canvas lost its backing store (memory pressure on
// mobile), i.e. the pixels are garbage, not a real image.
function hashImageData(img: ImageData): {
  hash: string;
  nonWhiteRatio: number;
  transparentRatio: number;
} {
  const { data, width, height } = img;
  const stepX = Math.max(1, Math.floor(width / 40));
  const stepY = Math.max(1, Math.floor(height / 30));
  let h = 0x811c9dc5;
  let nonWhite = 0;
  let transparent = 0;
  let total = 0;
  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Quantize to keep the hash stable against tiny rendering differences.
      h = (h ^ (r & 0xf0)) >>> 0;
      h = Math.imul(h, 0x01000193) >>> 0;
      h = (h ^ (g & 0xf0)) >>> 0;
      h = Math.imul(h, 0x01000193) >>> 0;
      h = (h ^ (b & 0xf0)) >>> 0;
      h = Math.imul(h, 0x01000193) >>> 0;
      if (r < 245 || g < 245 || b < 245) nonWhite++;
      if (data[i + 3] < 16) transparent++;
      total++;
    }
  }
  return {
    hash: h.toString(16),
    nonWhiteRatio: total ? nonWhite / total : 0,
    transparentRatio: total ? transparent / total : 0,
  };
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.82));
}

/**
 * Parses every page of the PDF and returns the products found, each with its
 * cropped image when the cell is not blank. `onProgress` (optional) is called
 * as pages are processed so the UI can show progress on large files.
 */
export async function parseProductsFromPdf(
  file: File,
  onProgress?: (page: number, totalPages: number) => void,
): Promise<PdfProduct[]> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data }).promise;

  const all: PdfProduct[] = [];
  const seenCodes = new Set<string>();
  const RENDER_SCALE = 2;

  // A single page canvas and a single crop canvas are reused for the whole
  // document. Creating thousands of canvases (327 pages × several per row)
  // pressures GPU/heap memory on mobile devices; when the browser evicts a
  // canvas backing store its contents silently become blank, which is how
  // blank product images used to get uploaded.
  const pageCanvas = document.createElement('canvas');
  const cropCanvas = document.createElement('canvas');

  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const frags: Frag[] = tc.items
        .map((it: any) => ({
          s: (it.str || '').trim(),
          x: it.transform[4],
          y: it.transform[5],
        }))
        .filter((f) => f.s !== '');

      const rows = rowsFromFragments(frags);
      if (rows.length === 0) {
        onProgress?.(p, doc.numPages);
        page.cleanup();
        continue; // image-only / promo page: nothing to extract
      }

      // Render the page once; crop each product's image cell from it.
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      pageCanvas.width = Math.ceil(viewport.width);
      pageCanvas.height = Math.ceil(viewport.height);
      // willReadFrequently keeps the bitmap CPU-side, which both speeds up the
      // per-row getImageData calls and avoids GPU-memory eviction blanking.
      const pageCtx = pageCanvas.getContext('2d', { willReadFrequently: true });
      if (pageCtx) {
        await page.render({ canvasContext: pageCtx, viewport }).promise;
      }

      for (const row of rows) {
        if (seenCodes.has(row.code)) continue;
        seenCodes.add(row.code);

        let image: ExtractedImage | undefined;
        if (pageCtx) {
          image = await cropImageCell(pageCtx, cropCanvas, viewport, row.anchorY);
        }

        const { anchorY, ...product } = row;
        all.push({ ...product, image });
      }

      onProgress?.(p, doc.numPages);
      page.cleanup();
    }
  } finally {
    // Release the bitmaps promptly instead of waiting for GC.
    pageCanvas.width = pageCanvas.height = 0;
    cropCanvas.width = cropCanvas.height = 0;
    doc.destroy().catch(() => {});
  }

  return all;
}

// Crops the image cell for a row from the rendered page canvas. Returns
// undefined when the cell is effectively blank (so the existing image is kept)
// or when the pixels could not be read back reliably.
//
// The pixels are read once with getImageData and that exact buffer is both
// hashed and encoded (via putImageData right before toBlob). Hashing one
// bitmap and encoding another — the previous approach — allowed the encode to
// happen after the canvas was evicted under memory pressure, uploading blank
// images that had passed the blank-cell check.
async function cropImageCell(
  pageCtx: CanvasRenderingContext2D,
  cropCanvas: HTMLCanvasElement,
  viewport: any,
  anchorY: number,
): Promise<ExtractedImage | undefined> {
  // Convert the PDF-space cell rectangle to device pixels.
  const [px0, py0] = viewport.convertToViewportPoint(IMG_X_LEFT, anchorY + IMG_HALF_ABOVE);
  const [px1, py1] = viewport.convertToViewportPoint(IMG_X_RIGHT, anchorY - IMG_HALF_BELOW);
  const pageW = pageCtx.canvas.width;
  const pageH = pageCtx.canvas.height;
  const sx = Math.max(0, Math.round(Math.min(px0, px1)));
  const sy = Math.max(0, Math.round(Math.min(py0, py1)));
  const sw = Math.min(pageW - sx, Math.round(Math.abs(px1 - px0)));
  const sh = Math.min(pageH - sy, Math.round(Math.abs(py1 - py0)));
  if (sw < 4 || sh < 4) return undefined;

  let imgData: ImageData;
  try {
    imgData = pageCtx.getImageData(sx, sy, sw, sh);
  } catch {
    return undefined;
  }

  const { hash, nonWhiteRatio, transparentRatio } = hashImageData(imgData);

  // A (nearly) fully transparent readback means the rendered page was lost
  // (evicted canvas): the data is garbage, not a picture. Skip the image so
  // the product still imports and any existing image is preserved.
  if (transparentRatio > 0.95) return undefined;

  // Mostly white => treat as an empty cell (no image to import).
  if (nonWhiteRatio < 0.02) return undefined;

  // Force full opacity so JPEG encoding can't darken semi-transparent pixels.
  const px = imgData.data;
  for (let i = 3; i < px.length; i += 4) px[i] = 255;

  cropCanvas.width = sw;
  cropCanvas.height = sh;
  const ctx = cropCanvas.getContext('2d');
  if (!ctx) return undefined;
  ctx.putImageData(imgData, 0, 0);

  let blob = await canvasToBlob(cropCanvas);
  if (!blob || blob.size < 100) {
    // The encode raced a canvas eviction; restore the pixels and retry once.
    ctx.putImageData(imgData, 0, 0);
    blob = await canvasToBlob(cropCanvas);
  }
  if (!blob || blob.size < 100) return undefined;
  return { hash, blob };
}

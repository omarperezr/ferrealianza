// Extracts products from a price-list PDF (the "LISTA DE …" format).
//
// The PDF is a table with fixed columns identified by their horizontal (x)
// position: category, code, product name, packaging unit (EMP), an image
// column (ignored) and the price (Ref). Rows are reconstructed by grouping
// text fragments that share a similar vertical (y) position.
//
// Pages that are full-page images, and promotional images placed between
// products, contain no text in the code/price columns, so they yield no rows
// and are skipped automatically.
import * as pdfjsLib from 'pdfjs-dist';
// Vite resolves this to a URL string for the worker bundle.
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc as string;

export interface PdfProduct {
  code: string;
  name: string;
  category: string;
  amountPerPackage: string;
  price: number;
}

interface Frag {
  s: string;
  x: number;
  y: number;
}

// Column boundaries (left edge in PDF points), derived from the list layout.
function columnOf(x: number): 'cat' | 'code' | 'name' | 'emp' | 'img' | 'price' {
  if (x < 65) return 'cat';
  if (x < 140) return 'code';
  if (x < 305) return 'name';
  if (x < 405) return 'emp';
  if (x < 500) return 'img';
  return 'price';
}

// Parses prices like "2,70" or "10,47" (comma decimal). Returns null if not a
// number, which is how header rows ("Ref") and image rows get filtered out.
function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.,]/g, '');
  if (!cleaned) return null;
  // Treat comma as the decimal separator; drop thousands separators.
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const n = parseFloat(normalized);
  return isNaN(n) ? null : n;
}

function rowsFromFragments(frags: Frag[]): PdfProduct[] {
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

  const products: PdfProduct[] = [];
  for (const row of rows) {
    const cols: Record<string, Frag[]> = { cat: [], code: [], name: [], emp: [], price: [] };
    for (const it of row.items) {
      const c = columnOf(it.x);
      if (c === 'img') continue;
      cols[c].push(it);
    }

    const code = cols.code
      .map((i) => i.s)
      .join(' ')
      .trim();
    const price = parsePrice(cols.price.map((i) => i.s).join(' '));

    // A valid product row needs a code and a numeric price. This skips the
    // header row ("Codigo"/"Ref"), the title and any image-only rows.
    if (!code || /^c[oó]digo$/i.test(code) || price === null) continue;

    // Name can wrap onto several lines: order top-to-bottom, then left-to-right.
    const nameItems = [...cols.name].sort((a, b) =>
      Math.abs(a.y - b.y) > 5 ? b.y - a.y : a.x - b.x,
    );

    products.push({
      category: cols.cat.map((i) => i.s).join(' ').replace(/\s+/g, ' ').trim(),
      code,
      name: nameItems.map((i) => i.s).join(' ').replace(/\s+/g, ' ').trim(),
      amountPerPackage: cols.emp.map((i) => i.s).join(' ').replace(/\s+/g, ' ').trim(),
      price,
    });
  }
  return products;
}

/**
 * Parses every page of the PDF and returns the products found. `onProgress`
 * (optional) is called as pages are processed so the UI can show progress on
 * large files (hundreds of products / many pages).
 */
export async function parseProductsFromPdf(
  file: File,
  onProgress?: (page: number, totalPages: number) => void,
): Promise<PdfProduct[]> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data }).promise;

  const all: PdfProduct[] = [];
  const seen = new Set<string>();

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

    for (const product of rowsFromFragments(frags)) {
      // De-duplicate by code in case a code repeats across pages.
      if (seen.has(product.code)) continue;
      seen.add(product.code);
      all.push(product);
    }

    onProgress?.(p, doc.numPages);
  }

  return all;
}

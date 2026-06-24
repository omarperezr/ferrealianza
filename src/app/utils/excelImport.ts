// Parses the "LDP" price-list Excel format used by the supplier.
//
// The sheet has a blank first row, then a header row with (at least) the
// columns Cat, Codigo, Producto, EMP, Imagen, Ref, plus a bunch of pricing
// helper columns we ignore. Product photos are not text — they're pictures
// floating over the "Imagen" cell of each row — so they're recovered via
// `extractXlsxImages`, which maps each embedded picture to its 0-based sheet
// row (the same indexing `sheet_to_json(..., { header: 1 })` rows use).
import { extractXlsxImages, XlsxImage } from './xlsxImages';

export interface ExcelProduct {
  code: string;
  name: string;
  category: string;
  amountPerPackage: string;
  price: number;
  image?: XlsxImage;
}

// Column keys we recognize in the header row, after normalizing (trim, lower,
// strip accents).
const HEADER_ALIASES: Record<string, keyof ColumnMap> = {
  cat: 'category',
  categoria: 'category',
  codigo: 'code',
  producto: 'name',
  emp: 'amountPerPackage',
  imagen: 'image',
  ref: 'price',
};

interface ColumnMap {
  category?: number;
  code?: number;
  name?: number;
  amountPerPackage?: number;
  image?: number;
  price?: number;
}

function normalize(s: any): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isEmptyCell(v: any): boolean {
  return v === undefined || v === null || String(v).trim() === '';
}

// Finds the header row (within the first 10 rows) by matching column names
// against HEADER_ALIASES, and returns its column index map.
function detectHeader(rawRows: any[][]): { headerRow: number; columns: ColumnMap } | null {
  const limit = Math.min(rawRows.length, 10);
  for (let r = 0; r < limit; r++) {
    const row = rawRows[r] || [];
    const columns: ColumnMap = {};
    let matches = 0;
    row.forEach((cell, i) => {
      const key = HEADER_ALIASES[normalize(cell)];
      if (key && columns[key] === undefined) {
        columns[key] = i;
        matches++;
      }
    });
    if (matches >= 3) return { headerRow: r, columns };
  }
  return null;
}

/**
 * Extracts products from an LDP-format .xlsx, ignoring blank rows and rows
 * where more than 3 of the 5 labeled fields (Cat, Producto, EMP, Imagen, Ref)
 * are missing — those are noise (section dividers, spacer rows, etc.).
 */
export async function parseProductsFromExcel(file: File): Promise<ExcelProduct[]> {
  const XLSX = await import('xlsx');
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  // `!ref` can claim the sheet spans to the spreadsheet's maximum row (e.g.
  // "A1:U1048576") even when only ~1500 rows hold data — some editors write
  // that as a leftover from a print area or filter range. Reading the real
  // last populated row from the cell addresses avoids materializing a
  // million-row array on every import.
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  let lastRow = 0;
  for (const key of Object.keys(worksheet)) {
    if (key[0] === '!') continue;
    const cell = XLSX.utils.decode_cell(key);
    if (cell.r > lastRow) lastRow = cell.r;
  }
  range.e.r = lastRow;

  const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '', range });

  const detected = detectHeader(rawRows);
  if (!detected) return [];
  const { headerRow, columns } = detected;

  let rowImages = new Map<number, XlsxImage>();
  try {
    rowImages = await extractXlsxImages(data);
  } catch {
    // Continue without images if extraction fails.
  }

  const products: ExcelProduct[] = [];

  for (let r = headerRow + 1; r < rawRows.length; r++) {
    const row = rawRows[r] || [];
    const cat = columns.category !== undefined ? row[columns.category] : undefined;
    const name = columns.name !== undefined ? row[columns.name] : undefined;
    const emp = columns.amountPerPackage !== undefined ? row[columns.amountPerPackage] : undefined;
    const ref = columns.price !== undefined ? row[columns.price] : undefined;
    const code = columns.code !== undefined ? row[columns.code] : undefined;
    const image = rowImages.get(r);

    // Noise filter: skip rows where more than 3 of the 5 labeled fields
    // (Cat, Producto, EMP, Imagen, Ref) are missing. This also catches fully
    // blank rows, since those are missing all 5.
    const missing = [isEmptyCell(cat), isEmptyCell(name), isEmptyCell(emp), !image, isEmptyCell(ref)];
    const missingCount = missing.filter(Boolean).length;
    if (missingCount > 3) continue;

    // A row needs a code (the product's primary key) and a valid price to
    // be importable, regardless of the noise filter above.
    const codeStr = String(code ?? '').trim();
    const priceNum = typeof ref === 'number' ? ref : parseFloat(String(ref).replace(',', '.'));
    if (!codeStr || !name || isNaN(priceNum)) continue;

    products.push({
      code: codeStr,
      name: String(name).trim(),
      category: String(cat ?? '').trim(),
      amountPerPackage: String(emp ?? '').trim(),
      price: priceNum,
      image,
    });
  }

  return products;
}

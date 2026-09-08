// Parse clients out of an Excel/CSV export. Layout is flexible: any sheet,
// header row anywhere in the first 30 rows (must contain a RIF column),
// columns found by keyword in any order, extra columns (Cod, Vendedor, Ciudad,
// Contacto...) ignored, rows repeating a RIF merged into one client.
export interface ImportedClient {
  name: string;
  rif: string;
  address: string;
  phone: string;
  email: string;
}

type Field = keyof ImportedClient;

// Regexes tried in order per field so "Empresa" beats "Nombre del contacto".
const COLS: Record<Field, RegExp[]> = {
  rif: [/(^|[^a-z])r\.?i\.?f\.?([^a-z]|$)/],
  name: [/empresa|razon|denominaci/, /nombre|cliente/],
  address: [/direcci|domicilio/],
  phone: [/tel/, /celular|movil|whatsapp/],
  email: [/correo|mail/],
};

const norm = (v: unknown) =>
  String(v ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

// "J-31762898-5" and "J317628985" are the same client.
export const rifKeyOf = (rif: unknown) =>
  String(rif ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const findCol = (headers: string[], patterns: RegExp[]) => {
  for (const re of patterns) {
    const i = headers.findIndex((h) => re.test(h));
    if (i >= 0) return i;
  }
  return -1;
};

export interface ParsedClients {
  clients: ImportedClient[];
  skipped: number; // rows without name or RIF
  merged: number; // rows folded into an earlier row with the same RIF
  sheet?: string;
  error?: string;
}

export function parseClientRows(
  sheets: { name: string; rows: unknown[][] }[],
): ParsedClients {
  const none = { clients: [], skipped: 0, merged: 0 };
  for (const { name: sheet, rows } of sheets) {
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const headers = (rows[i] || []).map(norm);
      if (findCol(headers, COLS.rif) < 0) continue;

      const idx = {} as Record<Field, number>;
      for (const f of Object.keys(COLS) as Field[]) idx[f] = findCol(headers, COLS[f]);
      if (idx.name < 0) {
        return {
          ...none,
          sheet,
          error: `Hoja "${sheet}", fila ${i + 1}: hay columna RIF pero ninguna de nombre/empresa. Encabezados: ${headers.filter(Boolean).join(', ')}`,
        };
      }

      const cell = (row: unknown[], f: Field) =>
        idx[f] >= 0 ? String(row[idx[f]] ?? '').trim() : '';

      const byRif = new Map<string, ImportedClient>();
      let skipped = 0;
      let merged = 0;
      for (const row of rows.slice(i + 1)) {
        if (!row || row.every((v) => !String(v ?? '').trim())) continue;
        const c: ImportedClient = {
          name: cell(row, 'name'),
          rif: cell(row, 'rif'),
          address: cell(row, 'address'),
          phone: cell(row, 'phone'),
          email: cell(row, 'email'),
        };
        const key = rifKeyOf(c.rif);
        if (!c.name || !key) { skipped++; continue; }
        const prev = byRif.get(key);
        if (prev) merged++;
        // Same RIF again: keep the first row, fill its blanks from this one.
        byRif.set(
          key,
          prev ? { ...c, ...Object.fromEntries(Object.entries(prev).filter(([, v]) => v)) } : c,
        );
      }
      return { clients: [...byRif.values()], skipped, merged, sheet };
    }
  }
  return {
    ...none,
    error: `No se encontró una fila de encabezados con columna RIF en las primeras 30 filas de: ${sheets.map((s) => `"${s.name}"`).join(', ')}`,
  };
}

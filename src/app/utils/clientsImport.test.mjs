// Run: node src/app/utils/clientsImport.test.mjs
// Synthetic workbook mirroring the real "Clientes" export: title row, header
// row with extra columns, dashed/undashed RIF repeats, blank rows, numeric cells.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { transformSync } from 'esbuild';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const src = transformSync(readFileSync(new URL('./clientsImport.ts', import.meta.url), 'utf8'), {
  loader: 'ts',
  format: 'cjs',
}).code;
const mod = { exports: {} };
new Function('module', 'exports', src)(mod, mod.exports);
const { parseClientRows, rifKeyOf } = mod.exports;

const toSheets = (wb) =>
  wb.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' }),
  }));

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Notas']]), 'Portada');
XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet([
    ['Clientes'],
    [],
    ['Cod', 'Empresa o Razon Social', 'Rif', 'Direccion Fiscal', 'Teléfono', 'Correo', 'Vendedor', 'CIUDAD', 'Contacto'],
    ['01-001', 'AGREGADOS LOS LLANOS', 'J500258186', 'Av Los Llanos 131', '0424-3288086', '', 'VEND A', 'SAN JUAN'],
    ['01-002', 'CASA CASTILLO, C.A', 'J-06006163', 'Av. Bolívar 61', '', 'castillo@x.com', 'VEND A', 'SAN JUAN', 'Pedro'],
    [],
    ['01-003', 'CASA CASTILLO C.A.', 'J06006163', '', '0246-4314290', '', 'VEND B'],
    ['01-004', '', 'J999999999', 'sin nombre', '', ''],
    ['01-005', 'SIN RIF', '', 'x', '', ''],
    ['01-006', 'NUMERICO', 123456789, 'y', 4141234567, ''],
  ]),
  'Clientes',
);

const { clients, skipped, merged, sheet, error } = parseClientRows(toSheets(wb));
assert.equal(error, undefined);
assert.equal(sheet, 'Clientes');
assert.equal(skipped, 2); // no name, no RIF
assert.equal(merged, 1); // CASA CASTILLO twice
assert.deepEqual(
  clients.map((c) => c.rif),
  ['J500258186', 'J-06006163', '123456789'],
);
// Repeated RIF merged: first row kept, blanks filled from the later row.
const castillo = clients[1];
assert.equal(castillo.name, 'CASA CASTILLO, C.A');
assert.equal(castillo.email, 'castillo@x.com');
assert.equal(castillo.phone, '0246-4314290');
assert.equal(clients[2].phone, '4141234567');
assert.equal(rifKeyOf(' j-31762898-5 '), 'J317628985');

// Header keywords in a different order / wording still map.
const alt = parseClientRows([{ name: 'Hoja1', rows: [
  ['NOMBRE', 'TELEFONO', 'R.I.F.', 'EMAIL', 'DOMICILIO'],
  ['Tienda', '0412-1', 'V-1', 'a@b.c', 'Calle 1'],
] }]);
assert.deepEqual(alt.clients, [
  { name: 'Tienda', rif: 'V-1', address: 'Calle 1', phone: '0412-1', email: 'a@b.c' },
]);

assert.match(parseClientRows([{ name: 'X', rows: [['a', 'b'], ['c', 'd']] }]).error, /RIF.*"X"/);
assert.match(parseClientRows([{ name: 'Y', rows: [['rif', 'zona'], ['J-1', 'a']] }]).error, /"Y", fila 1.*nombre.*Encabezados: rif, zona/);
console.log('clientsImport ok:', clients.length, 'clients');

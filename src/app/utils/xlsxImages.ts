// Extracts images embedded inside an .xlsx file and maps each one to its row.
//
// SheetJS (the `xlsx` package) does not expose embedded images, so we read the
// raw .xlsx — which is just a ZIP — ourselves. We parse the ZIP central
// directory, inflate the entries with the browser's DecompressionStream, then
// walk the drawing XML to learn which spreadsheet row each picture sits on.
//
// Row numbers returned are 0-based spreadsheet rows (matching the drawing's
// <xdr:from><xdr:row>), so a header row is row 0 and the first data row is 1.

export interface XlsxImage {
  blob: Blob;
  // Media path inside the archive (e.g. "xl/media/image1.png"), used to upload
  // each distinct picture only once.
  mediaPath: string;
}

// Only formats browsers can actually render. EMF/WMF (Windows metafiles), WDP
// (JPEG XR) and TIFF pictures do exist inside supplier spreadsheets, but if we
// upload them they show up as blank images in the app — so they're skipped and
// the product keeps its existing image instead.
const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
};

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// Minimal ZIP reader (no ZIP64) — enough for spreadsheet files.
async function unzip(buf: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  const files = new Map<string, Uint8Array>();

  // Locate the End Of Central Directory record (search from the end).
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Archivo no es un ZIP válido');

  const count = view.getUint16(eocd + 10, true);
  let off = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();

  for (let n = 0; n < count; n++) {
    if (view.getUint32(off, true) !== 0x02014b50) break;
    const method = view.getUint16(off + 10, true);
    const compSize = view.getUint32(off + 20, true);
    const nameLen = view.getUint16(off + 28, true);
    const extraLen = view.getUint16(off + 30, true);
    const commentLen = view.getUint16(off + 32, true);
    const localOff = view.getUint32(off + 42, true);
    const name = decoder.decode(bytes.subarray(off + 46, off + 46 + nameLen));

    const lNameLen = view.getUint16(localOff + 26, true);
    const lExtraLen = view.getUint16(localOff + 28, true);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const comp = bytes.subarray(dataStart, dataStart + compSize);

    if (method === 0) files.set(name, comp);
    else if (method === 8) files.set(name, await inflateRaw(comp));
    // Other methods are skipped.

    off += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

function findAll(root: Element | Document, local: string): Element[] {
  return Array.from(root.getElementsByTagName('*')).filter((e) => e.localName === local);
}

function getAttrLocal(el: Element, local: string): string | null {
  for (const a of Array.from(el.attributes)) {
    if (a.localName === local) return a.value;
  }
  return null;
}

// Resolves a relative path like "../media/image1.png" from a base file.
function resolvePath(baseFile: string, relTarget: string): string {
  const baseDir = baseFile.split('/').slice(0, -1);
  const parts = relTarget.split('/');
  for (const p of parts) {
    if (p === '..') baseDir.pop();
    else if (p !== '.') baseDir.push(p);
  }
  return baseDir.join('/');
}

function parseXml(bytes: Uint8Array | undefined): Document | null {
  if (!bytes) return null;
  const text = new TextDecoder().decode(bytes);
  return new DOMParser().parseFromString(text, 'application/xml');
}

function relTargets(files: Map<string, Uint8Array>, relsPath: string): Map<string, string> {
  const map = new Map<string, string>();
  const doc = parseXml(files.get(relsPath));
  if (!doc) return map;
  for (const r of findAll(doc, 'Relationship')) {
    const id = r.getAttribute('Id');
    const target = r.getAttribute('Target');
    if (id && target) map.set(id, target);
  }
  return map;
}

// Returns the worksheet XML path of the workbook's first sheet, or null.
function firstSheetPath(files: Map<string, Uint8Array>): string | null {
  const wb = parseXml(files.get('xl/workbook.xml'));
  if (!wb) return null;
  const sheet = findAll(wb, 'sheet')[0];
  if (!sheet) return null;
  const rid = getAttrLocal(sheet, 'id'); // r:id
  if (!rid) return null;
  const target = relTargets(files, 'xl/_rels/workbook.xml.rels').get(rid);
  if (!target) return null;
  return resolvePath('xl/workbook.xml', target);
}

/**
 * Extracts embedded images from an .xlsx, keyed by 0-based spreadsheet row.
 * Returns an empty map if the file has no images or can't be parsed.
 */
export async function extractXlsxImages(buf: ArrayBuffer): Promise<Map<number, XlsxImage>> {
  const result = new Map<number, XlsxImage>();
  let files: Map<string, Uint8Array>;
  try {
    files = await unzip(buf);
  } catch {
    return result;
  }

  const sheetPath = firstSheetPath(files);
  if (!sheetPath) return result;

  // sheet -> drawing
  const sheetName = sheetPath.split('/').pop();
  const sheetRels = relTargets(files, `xl/worksheets/_rels/${sheetName}.rels`);
  const drawingRel = [...sheetRels.values()].find((t) => t.includes('drawing'));
  if (!drawingRel) return result;
  const drawingPath = resolvePath(sheetPath, drawingRel);

  const drawingDoc = parseXml(files.get(drawingPath));
  if (!drawingDoc) return result;

  const drawingName = drawingPath.split('/').pop();
  const drawingRels = relTargets(files, `xl/drawings/_rels/${drawingName}.rels`);

  const anchors = [
    ...findAll(drawingDoc, 'twoCellAnchor'),
    ...findAll(drawingDoc, 'oneCellAnchor'),
  ];

  for (const anchor of anchors) {
    const from = findAll(anchor, 'from')[0];
    const rowEl = from ? findAll(from, 'row')[0] : null;
    const blip = findAll(anchor, 'blip')[0];
    if (!rowEl || !blip) continue;

    const row = parseInt(rowEl.textContent || '', 10);
    const embed = getAttrLocal(blip, 'embed'); // r:embed
    if (isNaN(row) || !embed) continue;

    const target = drawingRels.get(embed);
    if (!target) continue;
    const mediaPath = resolvePath(drawingPath, target);
    const mediaBytes = files.get(mediaPath);
    if (!mediaBytes) continue;

    const ext = (mediaPath.split('.').pop() || '').toLowerCase();
    const mime = MIME_BY_EXT[ext];
    if (!mime) continue; // non-renderable format (emf/wdp/tiff…): skip
    result.set(row, { blob: new Blob([mediaBytes], { type: mime }), mediaPath });
  }

  return result;
}

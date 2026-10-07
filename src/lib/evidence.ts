// DOC-AGENT en navegador: SHA-256 (Web Crypto), metadatos PDF (Info/XMP,
// actualizaciones incrementales), EXIF/GPS de imágenes y extracción de texto PDF.
// La evidencia no se envía a ningún servidor.
import type { Evidence } from '../../shared/case';

export async function sha256(buf: ArrayBuffer): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function latin1(buf: ArrayBuffer, max = 8_000_000) {
  const u = new Uint8Array(buf, 0, Math.min(buf.byteLength, max));
  let s = '';
  for (let i = 0; i < u.length; i += 65536) s += String.fromCharCode(...u.subarray(i, i + 65536));
  return s;
}

const pdfDate = (s: string) => {
  const m = s.match(/D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?([Z+\-])?(\d{2})?'?(\d{2})?/);
  if (!m) return s;
  const [, y, mo = '01', d = '01', h = '00', mi = '00', se = '00', z, oh, om] = m;
  const tz = !z || z === 'Z' ? 'Z' : `${z}${oh ?? '00'}:${om ?? '00'}`;
  return `${y}-${mo}-${d}T${h}:${mi}:${se}${tz}`;
};

export function pdfMetadata(buf: ArrayBuffer): Record<string, string> {
  const s = latin1(buf);
  const meta: Record<string, string> = {};
  const head = s.slice(0, 16).match(/%PDF-(\d\.\d)/);
  if (head) meta['PDF versión'] = head[1];
  for (const k of ['Title', 'Author', 'Subject', 'Keywords', 'Creator', 'Producer', 'CreationDate', 'ModDate']) {
    const m = s.match(new RegExp(`/${k}\\s*\\(((?:\\\\.|[^\\\\)])*)\\)`)) ?? s.match(new RegExp(`/${k}\\s*<([0-9A-Fa-f]+)>`));
    if (!m) continue;
    let v = m[1];
    if (/^[0-9A-Fa-f]+$/.test(v) && v.length % 2 === 0 && m[0].includes('<')) {
      const bytes = v.match(/../g)!.map((h) => parseInt(h, 16));
      v = bytes[0] === 0xfe && bytes[1] === 0xff ? String.fromCharCode(...bytes.slice(2).reduce<number[]>((a, b, i, arr) => (i % 2 ? a : [...a, (b << 8) | arr[i + 1]]), [])) : String.fromCharCode(...bytes);
    }
    v = v.replace(/\\([()\\])/g, '$1');
    meta[k] = /Date$/.test(k) ? pdfDate(v) : v;
  }
  const xmp = (tag: string) => s.match(new RegExp(`<${tag}>([^<]{1,200})</${tag}>`))?.[1];
  for (const [tag, label] of [['xmp:CreatorTool', 'XMP CreatorTool'], ['pdf:Producer', 'XMP Producer'], ['xmp:CreateDate', 'XMP CreateDate'], ['xmp:ModifyDate', 'XMP ModifyDate'], ['xmpMM:DocumentID', 'XMP DocumentID'], ['xmpMM:InstanceID', 'XMP InstanceID']] as const) {
    const v = xmp(tag); if (v) meta[label] = v;
  }
  const eofs = (s.match(/%%EOF/g) ?? []).length;
  meta['Secciones %%EOF (revisiones)'] = String(eofs);
  meta['Objetos'] = String((s.match(/\d+\s+\d+\s+obj\b/g) ?? []).length);
  if (/\/JavaScript|\/JS\s/.test(s)) meta['JavaScript embebido'] = 'sí';
  if (/\/EmbeddedFile/.test(s)) meta['Archivos embebidos'] = 'sí';
  if (/\/AcroForm/.test(s)) meta['Formularios (AcroForm)'] = 'sí';
  if (/\/Sig\b|\/ByteRange/.test(s)) meta['Firma digital'] = 'presente (estructura /ByteRange)';
  const fonts = [...new Set([...s.matchAll(/\/BaseFont\s*\/([A-Za-z0-9+\-_,]+)/g)].map((m) => m[1].replace(/^[A-Z]{6}\+/, '')))];
  if (fonts.length) meta['Fuentes tipográficas'] = fonts.slice(0, 20).join(', ');
  return meta;
}

export async function imageMetadata(file: File): Promise<Record<string, string>> {
  const exifr = (await import('exifr')).default;
  const out: Record<string, string> = {};
  try {
    const d = await exifr.parse(file, { tiff: true, exif: true, gps: true, xmp: true, iptc: true });
    if (d) for (const [k, v] of Object.entries(d)) {
      if (v == null || typeof v === 'object' && !(v instanceof Date)) continue;
      out[k] = v instanceof Date ? v.toISOString() : String(v).slice(0, 200);
    }
    const gps = await exifr.gps(file).catch(() => null);
    if (gps?.latitude) out['GPS'] = `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}`;
  } catch { out['EXIF'] = 'sin metadatos legibles'; }
  return out;
}

export async function pdfText(buf: ArrayBuffer): Promise<{ text: string; pages: number; fonts: string[] }> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
  let text = '';
  const fonts = new Set<string>();
  for (let p = 1; p <= Math.min(doc.numPages, 200); p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    for (const it of tc.items as any[]) { if (it.fontName) fonts.add(it.fontName); }
    text += (tc.items as any[]).map((i) => ('str' in i ? i.str + (i.hasEOL ? '\n' : ' ') : '')).join('') + '\n\n';
  }
  return { text, pages: doc.numPages, fonts: [...fonts] };
}

export async function ingestFile(file: File): Promise<{ evidence: Evidence; text: string }> {
  const buf = await file.arrayBuffer();
  const hash = await sha256(buf);
  let metadata: Record<string, string> = {};
  let text = '';
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (isPdf) {
    metadata = pdfMetadata(buf);
    try {
      const t = await pdfText(buf);
      text = t.text;
      metadata['Páginas'] = String(t.pages);
      if (!text.trim()) metadata['Capa de texto'] = 'ausente (documento escaneado/imagen; requiere OCR)';
    } catch (e: any) { metadata['Extracción de texto'] = `error: ${e?.message ?? e}`; }
  } else if (file.type.startsWith('image/')) {
    metadata = await imageMetadata(file);
  } else if (file.type.startsWith('text/') || /\.(txt|log|csv|eml|json|xml|md|html?)$/i.test(file.name)) {
    text = new TextDecoder().decode(buf);
  }
  return {
    evidence: {
      name: file.name, size: file.size, type: file.type, sha256: hash,
      lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : null,
      received_at: new Date().toISOString(), metadata, text_chars: text.length,
    },
    text,
  };
}

// 856-FFCI v3.1 — Capa operativa de datos (§2.6.1): descarga de archivos
// oficiales → SHA-256 + timestamp (cadena de custodia §6.3) → parseo →
// índice local en memoria/`/tmp` → refresco periódico (cron Vercel).
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { parseEU, parseFBI, parseInterpol, parseOfac, parseUN } from '../../shared/parsers.js';
import { WatchlistIndex } from '../../shared/screening.js';
import type { DatasetMeta, ListEntity } from '../../shared/types.js';

const OFAC = 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports';
const TTL_MS = Number(process.env.FFCI_CACHE_TTL_HOURS ?? 12) * 3600_000;
const UA = '856-FFCI/3.1 (+compliance screening; contacto: admin)';

interface BulkSource {
  code: string; name: string; authority: string; format: string; parser: string; refresh: string;
  urls: string[];
  parse: (texts: string[]) => { entities: ListEntity[]; version: string | null };
}

export const BULK: BulkSource[] = [
  {
    code: 'OFAC_SDN', name: 'OFAC SDN List', authority: 'U.S. Treasury — OFAC', format: 'CSV',
    parser: 'parseOfac(SDN.CSV, ALT.CSV)', refresh: `cada ${TTL_MS / 3600_000} h + cron diario`,
    urls: [process.env.OFAC_SDN_URL ?? `${OFAC}/SDN.CSV`, process.env.OFAC_ALT_URL ?? `${OFAC}/ALT.CSV`],
    parse: ([p, a]) => ({ entities: parseOfac(p, a, 'OFAC_SDN'), version: null }),
  },
  {
    code: 'OFAC_CONS', name: 'OFAC Consolidated (Non-SDN)', authority: 'U.S. Treasury — OFAC', format: 'CSV',
    parser: 'parseOfac(CONS_PRIM.CSV, CONS_ALT.CSV)', refresh: `cada ${TTL_MS / 3600_000} h + cron diario`,
    urls: [process.env.OFAC_CONS_URL ?? `${OFAC}/CONS_PRIM.CSV`, process.env.OFAC_CONS_ALT_URL ?? `${OFAC}/CONS_ALT.CSV`],
    parse: ([p, a]) => ({ entities: parseOfac(p, a, 'OFAC_CONS'), version: null }),
  },
  {
    code: 'UN', name: 'UN Security Council Consolidated List', authority: 'Consejo de Seguridad ONU', format: 'XML',
    parser: 'parseUN(consolidated.xml)', refresh: `cada ${TTL_MS / 3600_000} h + cron diario`,
    urls: [process.env.UN_LIST_URL ?? 'https://scsanctions.un.org/resources/xml/en/consolidated.xml'],
    parse: ([x]) => parseUN(x),
  },
  {
    code: 'EU', name: 'EU Consolidated Financial Sanctions List', authority: 'Unión Europea (DG FISMA)', format: 'CSV',
    parser: 'parseEU(csvFullSanctionsList_1_1)', refresh: `cada ${TTL_MS / 3600_000} h + cron diario`,
    urls: [process.env.EU_LIST_URL ?? 'https://webgate.ec.europa.eu/fsd/fsf/public/files/csvFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw'],
    parse: ([c]) => parseEU(c),
  },
];

export const LIVE = [
  { code: 'FBI', name: 'FBI Most Wanted', authority: 'FBI', format: 'JSON (API)', url: 'https://api.fbi.gov/wanted/v1/list' },
  { code: 'INTERPOL_RED', name: 'Interpol Red Notices (público)', authority: 'Interpol', format: 'JSON (ws-public)', url: 'https://ws-public.interpol.int/notices/v1/red' },
];

export const DECLARED_NOT_INTEGRATED = [
  'SHCP/UIF México — Lista de Personas Bloqueadas: no se publica en formato descargable; acceso restringido a sujetos obligados.',
  'UK Sanctions List (FCDO/OFSI), DFAT (Australia), OSFI (Canadá): no integradas en esta versión.',
  'Europol EU Most Wanted, PEP, SEC, CFTC, FCA, CNBV: no integradas en esta versión (sin bulk data o sin API pública).',
];

interface Loaded { meta: DatasetMeta; index: WatchlistIndex | null; at: number }
const memory = new Map<string, Loaded>();
const inflight = new Map<string, Promise<Loaded>>();

async function fetchText(url: string, timeoutMs = 90_000): Promise<{ text: string; sha256: string; bytes: number }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': UA, accept: '*/*' }, redirect: 'follow' });
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText} — ${url}`);
    const buf = Buffer.from(await r.arrayBuffer());
    return { text: buf.toString('utf8'), sha256: createHash('sha256').update(buf).digest('hex'), bytes: buf.length };
  } finally {
    clearTimeout(t);
  }
}

const cachePath = (code: string) => `/tmp/ffci-${code}.json`;

function baseMeta(s: BulkSource): DatasetMeta {
  return {
    code: s.code, name: s.name, authority: s.authority, url: s.urls[0], format: s.format, parser: s.parser,
    refresh: s.refresh, downloaded_at: null, sha256: null, source_version: null, entities: 0, errors: [], status: 'pending',
  };
}

async function loadSource(s: BulkSource, force = false): Promise<Loaded> {
  const now = Date.now();
  const mem = memory.get(s.code);
  if (!force && mem && mem.index && now - mem.at < TTL_MS) return mem;
  if (!force) {
    try {
      const disk = JSON.parse(await fs.readFile(cachePath(s.code), 'utf8')) as { meta: DatasetMeta; entities: ListEntity[]; at: number };
      if (now - disk.at < TTL_MS) {
        const l = { meta: disk.meta, index: new WatchlistIndex(disk.entities), at: disk.at };
        memory.set(s.code, l);
        return l;
      }
    } catch { /* sin caché en disco */ }
  }
  const meta = baseMeta(s);
  try {
    const files = await Promise.all(s.urls.map((u) => fetchText(u)));
    const t0 = Date.now();
    const { entities, version } = s.parse(files.map((f) => f.text));
    meta.parse_ms = Date.now() - t0;
    if (!entities.length) throw new Error('El parseo no produjo entidades (¿cambio de formato en la fuente?)');
    meta.downloaded_at = new Date().toISOString();
    meta.files = files.map((f, i) => ({ url: s.urls[i], sha256: f.sha256, bytes: f.bytes }));
    meta.sha256 = files.length === 1 ? files[0].sha256 : createHash('sha256').update(files.map((f) => f.sha256).join('')).digest('hex');
    meta.source_version = version;
    meta.entities = entities.length;
    meta.status = 'ok';
    const l = { meta, index: new WatchlistIndex(entities), at: Date.now() };
    memory.set(s.code, l);
    fs.writeFile(cachePath(s.code), JSON.stringify({ meta, entities, at: l.at })).catch(() => {});
    return l;
  } catch (e: any) {
    meta.status = 'error';
    meta.errors.push(String(e?.message ?? e));
    if (mem?.index) return { ...mem, meta: { ...mem.meta, errors: [...mem.meta.errors, `Refresco fallido: ${meta.errors[0]} — se usa caché previa`] } };
    return { meta, index: null, at: now };
  }
}

export function getSource(code: string, force = false): Promise<Loaded> {
  const s = BULK.find((b) => b.code === code);
  if (!s) throw new Error(`Lista desconocida: ${code}`);
  const key = code + (force ? ':f' : '');
  let p = inflight.get(key);
  if (!p) {
    p = loadSource(s, force).finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

export function cachedMeta(): DatasetMeta[] {
  return BULK.map((s) => memory.get(s.code)?.meta ?? baseMeta(s));
}

// ----------------------------------------------------------- consultas en vivo
export async function liveFBI(name: string): Promise<{ meta: DatasetMeta; index: WatchlistIndex | null }> {
  const src = LIVE[0];
  const meta: DatasetMeta = { code: src.code, name: src.name, authority: src.authority, url: src.url, format: src.format,
    parser: 'parseFBI', refresh: 'consulta en vivo', downloaded_at: null, sha256: null, source_version: null, entities: 0, errors: [], status: 'live' };
  try {
    const url = `${src.url}?title=${encodeURIComponent(name)}&pageSize=50`;
    const f = await fetchText(url, 20_000);
    const ents = parseFBI(JSON.parse(f.text));
    Object.assign(meta, { url, downloaded_at: new Date().toISOString(), sha256: f.sha256, entities: ents.length, files: [{ url, sha256: f.sha256, bytes: f.bytes }] });
    return { meta, index: new WatchlistIndex(ents) };
  } catch (e: any) {
    meta.status = 'error'; meta.errors.push(String(e?.message ?? e));
    return { meta, index: null };
  }
}

export async function liveInterpol(name: string): Promise<{ meta: DatasetMeta; index: WatchlistIndex | null }> {
  const src = LIVE[1];
  const meta: DatasetMeta = { code: src.code, name: src.name, authority: src.authority, url: src.url, format: src.format,
    parser: 'parseInterpol', refresh: 'consulta en vivo (sujeta a rate limiting / bloqueo por IP)', downloaded_at: null, sha256: null,
    source_version: null, entities: 0, errors: [], status: 'live' };
  try {
    const parts = name.trim().split(/\s+/);
    const last = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    const urls = [`${src.url}?name=${encodeURIComponent(last)}&resultPerPage=160`];
    if (parts.length > 1) urls.push(`${src.url}?forename=${encodeURIComponent(parts[0])}&name=${encodeURIComponent(last)}&resultPerPage=160`);
    const res = await Promise.all(urls.map((u) => fetchText(u, 20_000)));
    const ents = res.flatMap((r) => parseInterpol(JSON.parse(r.text)));
    const uniq = [...new Map(ents.map((e) => [e.id, e])).values()];
    Object.assign(meta, { url: urls[0], downloaded_at: new Date().toISOString(),
      sha256: createHash('sha256').update(res.map((r) => r.sha256).join('')).digest('hex'), entities: uniq.length,
      files: res.map((r, i) => ({ url: urls[i], sha256: r.sha256, bytes: r.bytes })) });
    return { meta, index: new WatchlistIndex(uniq) };
  } catch (e: any) {
    meta.status = 'error'; meta.errors.push(String(e?.message ?? e));
    return { meta, index: null };
  }
}

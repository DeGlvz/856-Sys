// 856-FFCI v3.1 — CYBER-AGENT pasivo: extracción de IOCs de logs, timeline
// forense y análisis de encabezados de correo (SPF/DKIM/DMARC, cadena Received).

export interface IOCSet { ipv4: string[]; ipv6: string[]; domains: string[]; urls: string[]; emails: string[]; md5: string[]; sha1: string[]; sha256: string[] }
export interface TimelineEvent { ts: string; event: string; source: string }

const uniq = (a: string[]) => [...new Set(a)];
const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const IPV6 = /\b(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}\b|\b(?:[0-9a-f]{1,4}:){1,7}:(?:[0-9a-f]{1,4}:?){1,6}\b/gi;
const URLR = /\b(?:https?|hxxps?|ftp):\/\/[^\s<>"'`)\]]+/gi;
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const DOMAIN = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.|\[\.\]))+[a-z]{2,24}\b/gi;
const NOT_TLD = /\.(?:js|css|png|jpg|jpeg|gif|svg|php|html?|aspx?|json|xml|txt|log|exe|dll|zip|gz|tar|py|sh|conf|ini|tmp)$/i;

/** Desofusca notación defang común: hxxp, [.], (.), [@]. */
export const refang = (s: string) => s.replace(/hxxp/gi, 'http').replace(/\[\.\]|\(\.\)|\{\.\}/g, '.').replace(/\[@\]|\(at\)/gi, '@');

export function extractIOCs(text: string): IOCSet {
  const t = refang(text);
  const urls = uniq(t.match(URLR) ?? []);
  const emails = uniq((t.match(EMAIL) ?? []).map((e) => e.toLowerCase()));
  const ipv4 = uniq(t.match(IPV4) ?? []).filter((ip) => !/^0\.|^255\./.test(ip));
  const domains = uniq((t.match(DOMAIN) ?? []).map((d) => d.toLowerCase().replace(/\[\.\]/g, '.')))
    .filter((d) => !NOT_TLD.test(d) && !/^\d+(\.\d+)+$/.test(d) && d.includes('.'));
  return {
    ipv4, ipv6: uniq(t.match(IPV6) ?? []).filter((x) => x.includes(':') && x.length > 6),
    domains, urls, emails,
    md5: uniq(t.match(/\b[a-f0-9]{32}\b/gi) ?? []).map((h) => h.toLowerCase()),
    sha1: uniq(t.match(/\b[a-f0-9]{40}\b/gi) ?? []).map((h) => h.toLowerCase()),
    sha256: uniq(t.match(/\b[a-f0-9]{64}\b/gi) ?? []).map((h) => h.toLowerCase()),
  };
}

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** Timeline forense: detecta marcas de tiempo ISO8601, syslog, Apache/Nginx, epoch. */
export function buildTimeline(text: string, source = 'log'): TimelineEvent[] {
  const out: TimelineEvent[] = [];
  const year = new Date().getUTCFullYear();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let d: Date | null = null;
    let m: RegExpMatchArray | null;
    if ((m = line.match(/(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/))) d = new Date(m[1].replace(' ', 'T'));
    else if ((m = line.match(/\[(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})\]/))) {
      const off = m[7];
      d = new Date(`${m[3]}-${String(MONTHS[m[2].toLowerCase()] + 1).padStart(2, '0')}-${m[1]}T${m[4]}:${m[5]}:${m[6]}${off.slice(0, 3)}:${off.slice(3)}`);
    } else if ((m = line.match(/^(\w{3})\s+(\d{1,2}) (\d{2}):(\d{2}):(\d{2})/))) {
      const mo = MONTHS[m[1].toLowerCase()];
      if (mo != null) d = new Date(Date.UTC(year, mo, +m[2], +m[3], +m[4], +m[5]));
    } else if ((m = line.match(/\b(1[5-9]\d{8})(?:\.\d+)?\b/))) d = new Date(+m[1] * 1000);
    if (d && !isNaN(d.getTime())) out.push({ ts: d.toISOString(), event: line.trim().slice(0, 300), source });
  }
  return out.sort((a, b) => a.ts.localeCompare(b.ts));
}

export interface EmailHeaderAnalysis {
  from: string | null; return_path: string | null; reply_to: string | null; message_id: string | null; subject: string | null; date: string | null;
  spf: string | null; dkim: string | null; dmarc: string | null;
  received: { from: string; by: string; ip: string | null; date: string | null }[];
  origin_ip: string | null;
  observations: { field: string; observed: string; expected: string }[];
}

/** Análisis de encabezados de correo (SPF/DKIM/DMARC, alineación de dominios). */
export function analyzeEmailHeaders(raw: string): EmailHeaderAnalysis {
  const unfolded = raw.replace(/\r?\n[ \t]+/g, ' ');
  const lines = unfolded.split(/\r?\n/);
  const all = (name: string) => lines.filter((l) => l.toLowerCase().startsWith(name.toLowerCase() + ':')).map((l) => l.slice(name.length + 1).trim());
  const one = (name: string) => all(name)[0] ?? null;
  const auth = all('Authentication-Results').join(' ; ') + ' ' + all('ARC-Authentication-Results').join(' ; ');
  const res = (k: string) => auth.match(new RegExp(`\\b${k}=(\\w+)`, 'i'))?.[1]?.toLowerCase() ?? null;
  const received = all('Received').map((r) => ({
    from: r.match(/from\s+([^\s;()]+)/i)?.[1] ?? '',
    by: r.match(/by\s+([^\s;()]+)/i)?.[1] ?? '',
    ip: r.match(/\[((?:\d{1,3}\.){3}\d{1,3}|[0-9a-f:]{6,})\]/i)?.[1] ?? r.match(/\(((?:\d{1,3}\.){3}\d{1,3})\)/)?.[1] ?? null,
    date: r.split(';').pop()?.trim() ?? null,
  }));
  const priv = (ip: string) => /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
  const origin = [...received].reverse().find((r) => r.ip && !priv(r.ip))?.ip ?? null;
  const dom = (s: string | null) => s?.match(/@([A-Za-z0-9.-]+)/)?.[1]?.toLowerCase() ?? null;
  const from = one('From'), rp = one('Return-Path'), rt = one('Reply-To');
  const obs: EmailHeaderAnalysis['observations'] = [];
  const spf = res('spf'), dkim = res('dkim'), dmarc = res('dmarc');
  if (spf && spf !== 'pass') obs.push({ field: 'SPF', observed: spf, expected: 'pass (RFC 7208)' });
  if (dkim && dkim !== 'pass') obs.push({ field: 'DKIM', observed: dkim, expected: 'pass (RFC 6376)' });
  if (dmarc && dmarc !== 'pass') obs.push({ field: 'DMARC', observed: dmarc, expected: 'pass (RFC 7489)' });
  if (!auth.trim()) obs.push({ field: 'Authentication-Results', observed: 'ausente', expected: 'presente (RFC 8601)' });
  if (dom(from) && dom(rp) && dom(from) !== dom(rp)) obs.push({ field: 'Return-Path vs From', observed: `${dom(rp)} ≠ ${dom(from)}`, expected: 'dominios alineados' });
  if (dom(from) && dom(rt) && dom(from) !== dom(rt)) obs.push({ field: 'Reply-To vs From', observed: `${dom(rt)} ≠ ${dom(from)}`, expected: 'dominios alineados' });
  const mid = one('Message-ID');
  if (dom(from) && mid && dom(mid) && !dom(mid)!.endsWith(dom(from)!.split('.').slice(-2).join('.'))) obs.push({ field: 'Message-ID', observed: dom(mid)!, expected: `dominio de ${dom(from)}` });
  return {
    from, return_path: rp, reply_to: rt, message_id: mid, subject: one('Subject'), date: one('Date'),
    spf, dkim, dmarc, received, origin_ip: origin, observations: obs,
  };
}

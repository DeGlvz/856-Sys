// GET /api/net?target=<dominio|IP> — NET-AGENT + CYBER-AGENT (recon pasivo)
// DNS · SPF/DKIM/DMARC · RDAP/WHOIS · ASN · geolocalización · Tor · DNSBL ·
// certificados (CT logs + handshake TLS) · encabezados HTTP de seguridad.
// Solo consultas pasivas a fuentes públicas: no hay escaneo de puertos ni pruebas activas.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resolver } from 'node:dns/promises';
import { isIP } from 'node:net';
import tls from 'node:tls';
import { Socket } from 'node:net';
import { createHash } from 'node:crypto';
import { authorize } from './_lib/http.js';

export const config = { maxDuration: 60 };

const resolver = new Resolver({ timeout: 4000, tries: 2 });
resolver.setServers(['1.1.1.1', '8.8.8.8']);

type Src = { source: string; url?: string; consulted_at: string };
const now = () => new Date().toISOString();

async function j(url: string, ms = 12000): Promise<{ data: any; sha256: string; url: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json, application/rdap+json', 'user-agent': '856-FFCI/3.1' } });
    const text = await r.text();
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return { data: JSON.parse(text), sha256: createHash('sha256').update(text).digest('hex'), url: r.url || url };
  } finally { clearTimeout(t); }
}

const settle = async <T>(p: Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> => {
  try { return { ok: true, value: await p }; } catch (e: any) { return { ok: false, error: String(e?.code ?? e?.message ?? e) }; }
};

export function isPrivateIP(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const s = ip.toLowerCase();
  return s === '::1' || s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe80') || s === '::';
}

const reverse4 = (ip: string) => ip.split('.').reverse().join('.');

async function asnInfo(ip: string) {
  if (isIP(ip) !== 4) return null;
  const txt = (await resolver.resolveTxt(`${reverse4(ip)}.origin.asn.cymru.com`)).map((r) => r.join(''))[0];
  if (!txt) return null;
  const [asn, prefix, cc, registry, allocated] = txt.split('|').map((s) => s.trim());
  let as_name = '';
  try { as_name = (await resolver.resolveTxt(`AS${asn.split(' ')[0]}.asn.cymru.com`)).map((r) => r.join(''))[0]?.split('|')[4]?.trim() ?? ''; } catch { /* */ }
  return { asn: `AS${asn}`, prefix, country: cc, registry, allocated, as_name, source: 'Team Cymru IP-to-ASN (DNS)' };
}

let torCache: { at: number; set: Set<string>; sha256: string } | null = null;
async function torExit(ip: string) {
  if (!torCache || Date.now() - torCache.at > 3600_000) {
    const r = await fetch('https://check.torproject.org/torbulkexitlist', { headers: { 'user-agent': '856-FFCI/3.1' } });
    const text = await r.text();
    torCache = { at: Date.now(), set: new Set(text.split('\n').map((s) => s.trim()).filter(Boolean)), sha256: createHash('sha256').update(text).digest('hex') };
  }
  return { is_tor_exit: torCache.set.has(ip), list_size: torCache.set.size, sha256: torCache.sha256, source: 'https://check.torproject.org/torbulkexitlist' };
}

const HOSTING = /amazon|aws|google|microsoft|azure|digitalocean|ovh|hetzner|linode|akamai|vultr|choopa|contabo|leaseweb|m247|datacamp|cloudflare|oracle|alibaba|tencent|hostinger|godaddy|namecheap|ionos|scaleway|colocrossing|psychz|frantech|buyvm|nforce|worldstream|zenlayer/i;
const VPN = /vpn|proxy|nord|expressvpn|surfshark|mullvad|private internet|pia|cyberghost|hide\.?me|windscribe|protonvpn|tunnel/i;

async function dnsbl(ip: string) {
  if (isIP(ip) !== 4) return [];
  const zones = [
    { zone: 'zen.spamhaus.org', name: 'Spamhaus ZEN' },
    { zone: 'bl.spamcop.net', name: 'SpamCop' },
    { zone: 'dnsbl-1.uceprotect.net', name: 'UCEPROTECT L1' },
  ];
  return Promise.all(zones.map(async (z) => {
    try {
      const a = await resolver.resolve4(`${reverse4(ip)}.${z.zone}`);
      const blocked = a.some((x) => x.startsWith('127.255.255.'));
      return { list: z.name, listed: !blocked, response: a.join(','), note: blocked ? 'Consulta rechazada por la DNSBL (resolutor público): resultado no determinable' : 'Listado' };
    } catch (e: any) {
      return { list: z.name, listed: false, response: e?.code ?? 'NXDOMAIN', note: e?.code === 'ENOTFOUND' ? 'No listado' : 'Sin respuesta' };
    }
  }));
}

async function ipIntel(ip: string) {
  const [rdap, asn, geo, tor, bl, ptr] = await Promise.all([
    settle(j(`https://rdap.org/ip/${ip}`)),
    settle(asnInfo(ip)),
    settle(j(`https://ipwho.is/${ip}`)),
    settle(torExit(ip)),
    settle(dnsbl(ip)),
    settle(resolver.reverse(ip)),
  ]);
  const g = geo.ok ? geo.value.data : null;
  const asName = (asn.ok && asn.value?.as_name) || g?.connection?.org || g?.connection?.isp || '';
  return {
    ip,
    reverse_dns: ptr.ok ? ptr.value : [],
    rdap: rdap.ok ? {
      url: rdap.value.url, sha256: rdap.value.sha256,
      handle: rdap.value.data.handle, name: rdap.value.data.name, type: rdap.value.data.type,
      country: rdap.value.data.country, start: rdap.value.data.startAddress, end: rdap.value.data.endAddress,
      cidr: (rdap.value.data.cidr0_cidrs ?? []).map((c: any) => `${c.v4prefix ?? c.v6prefix}/${c.length}`),
      entities: (rdap.value.data.entities ?? []).map((e: any) => ({ handle: e.handle, roles: e.roles, name: vcardName(e) })),
      events: (rdap.value.data.events ?? []).map((e: any) => ({ action: e.eventAction, date: e.eventDate })),
    } : { error: rdap.error },
    asn: asn.ok ? asn.value : { error: asn.error },
    geolocation: g && g.success !== false ? {
      country: g.country, country_code: g.country_code, region: g.region, city: g.city, lat: g.latitude, lon: g.longitude,
      isp: g.connection?.isp, org: g.connection?.org, asn: g.connection?.asn, source: 'ipwho.is', accuracy: 'Nivel ciudad/ISP; no constituye ubicación del usuario final',
    } : { error: geo.ok ? g?.message ?? 'sin datos' : geo.error },
    anonymization: {
      tor: tor.ok ? tor.value : { error: tor.error },
      hosting_asn: HOSTING.test(asName),
      vpn_keyword_asn: VPN.test(asName),
      method: 'Lista oficial de nodos de salida Tor + heurística por nombre de ASN (hosting/VPN). La heurística no es determinante.',
    },
    reputation: bl.ok ? bl.value : { error: bl.error },
  };
}

function vcardName(e: any): string {
  const v = e?.vcardArray?.[1];
  if (!Array.isArray(v)) return '';
  const fn = v.find((x: any) => x[0] === 'fn');
  return fn ? String(fn[3]) : '';
}

async function tlsCert(host: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const sock = tls.connect({ host, port: 443, servername: host, rejectUnauthorized: false, timeout: 8000 }, () => {
      const c = sock.getPeerCertificate(true);
      const authorized = sock.authorized;
      const err = sock.authorizationError;
      const proto = sock.getProtocol();
      const cipher = sock.getCipher();
      sock.end();
      if (!c || !c.subject) return reject(new Error('Sin certificado'));
      const days = Math.round((new Date(c.valid_to).getTime() - Date.now()) / 864e5);
      resolve({
        subject: c.subject, issuer: c.issuer, valid_from: c.valid_from, valid_to: c.valid_to, days_to_expiry: days,
        san: c.subjectaltname, serial: c.serialNumber, fingerprint256: c.fingerprint256,
        chain_trusted: authorized, chain_error: err ? String(err) : null, protocol: proto, cipher: cipher?.name,
      });
    });
    sock.on('error', reject);
    sock.on('timeout', () => { sock.destroy(); reject(new Error('timeout TLS')); });
  });
}

async function httpHeaders(host: string) {
  const chain: { url: string; status: number }[] = [];
  let url = `https://${host}/`;
  let res: Response | null = null;
  for (let i = 0; i < 5; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    try { res = await fetch(url, { redirect: 'manual', signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0 (856-FFCI passive audit)' } }); }
    finally { clearTimeout(t); }
    chain.push({ url, status: res.status });
    const loc = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && loc) {
      const next = new URL(loc, url);
      if (isIP(next.hostname) && isPrivateIP(next.hostname)) break;
      url = next.toString();
    } else break;
  }
  if (!res) throw new Error('sin respuesta');
  const h = Object.fromEntries([...res.headers.entries()]);
  const sec = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];
  let generator = '';
  const tech: string[] = [];
  try {
    const html = (await res.text()).slice(0, 200_000);
    generator = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i)?.[1] ?? '';
    const sigs: [RegExp, string][] = [
      [/wp-content|wp-includes/i, 'WordPress'], [/cdn\.shopify|Shopify\./i, 'Shopify'], [/__NEXT_DATA__|\/_next\//i, 'Next.js'],
      [/wix\.com|wixstatic/i, 'Wix'], [/squarespace/i, 'Squarespace'], [/Joomla/i, 'Joomla'], [/drupal/i, 'Drupal'],
      [/react(-dom)?\.production|data-reactroot/i, 'React'], [/ng-version|angular/i, 'Angular'], [/vue(\.runtime)?\.(min\.)?js|data-v-/i, 'Vue'],
      [/googletagmanager|gtag\(/i, 'Google Tag Manager/Analytics'], [/cloudflare/i, 'Cloudflare'], [/tawk\.to|livechat|crisp\.chat|zendesk/i, 'Chat widget'],
    ];
    for (const [r, n] of sigs) if (r.test(html)) tech.push(n);
  } catch { /* cuerpo no legible */ }
  return {
    final_url: url, status: res.status, redirect_chain: chain,
    server: h['server'] ?? null, powered_by: h['x-powered-by'] ?? null, generator: generator || null, tech_stack: tech,
    security_headers: sec.map((k) => ({ header: k, present: k in h, value: h[k] ?? null })),
    raw: h,
  };
}

/** WHOIS (puerto 43) para TLD sin servicio RDAP (p. ej. .mx): IANA → servidor referido. */
function whoisQuery(server: string, q: string, ms = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    const sock = new Socket();
    let buf = '';
    const t = setTimeout(() => { sock.destroy(); reject(new Error('timeout WHOIS')); }, ms);
    sock.connect(43, server, () => sock.write(q + '\r\n'));
    sock.on('data', (d) => { buf += d.toString('utf8'); if (buf.length > 200_000) sock.destroy(); });
    sock.on('close', () => { clearTimeout(t); resolve(buf); });
    sock.on('error', (e) => { clearTimeout(t); reject(e); });
  });
}

async function whois(domain: string) {
  const tld = domain.split('.').pop()!;
  const iana = await whoisQuery('whois.iana.org', tld);
  const server = iana.match(/^whois:\s*(\S+)/im)?.[1];
  if (!server) throw new Error(`Sin servidor WHOIS para .${tld}`);
  const raw = await whoisQuery(server, domain);
  const f = (...keys: string[]) => {
    for (const k of keys) { const m = raw.match(new RegExp(`^\\s*${k}\\s*:\\s*(.+)$`, 'im')); if (m) return m[1].trim(); }
    return null;
  };
  const created = f('Creation Date', 'Created On', 'Created', 'Registered on', 'Registration Time', 'created');
  const toIso = (x: string | null) => { if (!x) return null; const d = new Date(x); return isNaN(d.getTime()) ? x : d.toISOString(); };
  const registered = toIso(created);
  return {
    url: `whois://${server}`, sha256: createHash('sha256').update(raw).digest('hex'), source: `WHOIS ${server} (TLD sin RDAP)`,
    registrar: f('Registrar', 'Sponsoring Registrar', 'registrar'), registrar_iana_id: f('Registrar IANA ID'),
    registered, expires: toIso(f('Expiration Date', 'Registry Expiry Date', 'Expires On', 'Expiry Date', 'expires')),
    last_changed: toIso(f('Last Updated On', 'Updated Date', 'Last Modified', 'changed')),
    age_days: registered && !isNaN(new Date(registered).getTime()) ? Math.floor((Date.now() - new Date(registered).getTime()) / 864e5) : null,
    status: [...raw.matchAll(/^\s*(?:Domain )?Status:\s*(\S+)/gim)].map((m) => m[1]),
    nameservers: [...raw.matchAll(/^\s*(?:Name Server|DNS|nserver)\s*:\s*(\S+)/gim)].map((m) => m[1].toLowerCase()),
    dnssec: f('DNSSEC'), registrant: [{ name: f('Registrant Organization', 'Registrant Name', 'Registrant') ?? '', handle: '' }].filter((r) => r.name),
  };
}

async function domainIntel(domain: string) {
  const r = <T>(p: Promise<T>) => settle(p);
  const [a, aaaa, mx, ns, txt, caa, soa, dmarc] = await Promise.all([
    r(resolver.resolve4(domain)), r(resolver.resolve6(domain)), r(resolver.resolveMx(domain)), r(resolver.resolveNs(domain)),
    r(resolver.resolveTxt(domain)), r(resolver.resolveCaa(domain)), r(resolver.resolveSoa(domain)), r(resolver.resolveTxt(`_dmarc.${domain}`)),
  ]);
  const txts = txt.ok ? txt.value.map((x) => x.join('')) : [];
  const spf = txts.filter((t) => /^v=spf1/i.test(t));
  const dmarcRec = dmarc.ok ? dmarc.value.map((x) => x.join('')).filter((t) => /^v=DMARC1/i.test(t)) : [];
  const selectors = ['default', 'google', 'selector1', 'selector2', 'k1', 'k2', 'mail', 'dkim', 's1', 's2', 'smtp', 'mxvault'];
  const dkim = (await Promise.all(selectors.map(async (s) => {
    try { const v = (await resolver.resolveTxt(`${s}._domainkey.${domain}`)).map((x) => x.join('')); return v.length ? { selector: s, record: v[0].slice(0, 200) } : null; }
    catch { return null; }
  }))).filter(Boolean);
  const dmarcPolicy = dmarcRec[0]?.match(/;\s*p=(\w+)/i)?.[1] ?? null;
  const spfAll = spf[0]?.match(/([~\-?+])all\b/)?.[1] ?? null;

  let webHost = domain;
  let webA = a.ok ? a.value : [];
  if (!webA.length) {
    try { const w = await resolver.resolve4(`www.${domain}`); if (w.length) { webHost = `www.${domain}`; webA = w; } } catch { /* sin www */ }
  }
  const hasPublic = webA.some((ip) => !isPrivateIP(ip));
  const [rdap, ct, cert, http] = await Promise.all([
    settle(j(`https://rdap.org/domain/${domain}`)),
    settle(j(`https://crt.sh/?q=${encodeURIComponent('%.' + domain)}&output=json`, 25000)),
    hasPublic ? settle(tlsCert(webHost)) : Promise.resolve({ ok: false as const, error: 'sin registro A público (apex ni www)' }),
    hasPublic ? settle(httpHeaders(webHost)) : Promise.resolve({ ok: false as const, error: 'sin registro A público (apex ni www)' }),
  ]);

  let rdapOut: any = { error: rdap.ok ? null : rdap.error };
  if (!rdap.ok) {
    const w = await settle(whois(domain));
    rdapOut = w.ok ? w.value : { error: `RDAP: ${rdap.error}; WHOIS: ${w.error}` };
  }
  if (rdap.ok) {
    const d = rdap.value.data;
    const ev = (n: string) => (d.events ?? []).find((e: any) => e.eventAction === n)?.eventDate ?? null;
    const registered = ev('registration');
    const registrar = (d.entities ?? []).find((e: any) => e.roles?.includes('registrar'));
    rdapOut = {
      url: rdap.value.url, sha256: rdap.value.sha256, handle: d.handle, ldh: d.ldhName,
      registrar: vcardName(registrar) || registrar?.handle || null,
      registrar_iana_id: registrar?.publicIds?.find((p: any) => /IANA/i.test(p.type))?.identifier ?? null,
      registered, expires: ev('expiration'), last_changed: ev('last changed'),
      age_days: registered ? Math.floor((Date.now() - new Date(registered).getTime()) / 864e5) : null,
      status: d.status ?? [], nameservers: (d.nameservers ?? []).map((n: any) => n.ldhName),
      dnssec: d.secureDNS?.delegationSigned ?? null,
      registrant: (d.entities ?? []).filter((e: any) => e.roles?.includes('registrant')).map((e: any) => ({ name: vcardName(e), handle: e.handle })),
    };
  }

  let ctOut: any = { error: ct.ok ? null : ct.error };
  if (ct.ok && Array.isArray(ct.value.data)) {
    const rows = ct.value.data as any[];
    const names = new Set<string>();
    for (const row of rows) for (const n of String(row.name_value ?? '').split('\n')) if (n.endsWith(domain)) names.add(n.toLowerCase());
    const issuers = new Map<string, number>();
    for (const row of rows) issuers.set(row.issuer_name, (issuers.get(row.issuer_name) ?? 0) + 1);
    const dates = rows.map((r) => r.not_before).filter(Boolean).sort();
    ctOut = {
      source: 'crt.sh (Certificate Transparency)', url: ct.value.url, sha256: ct.value.sha256,
      certificates: rows.length, first_seen: dates[0] ?? null, last_seen: dates[dates.length - 1] ?? null,
      subdomains: [...names].sort().slice(0, 200),
      issuers: [...issuers.entries()].sort((x, y) => y[1] - x[1]).slice(0, 10).map(([name, count]) => ({ name, count })),
    };
  }

  const ips = webA.filter((ip) => !isPrivateIP(ip)).slice(0, 3);
  const ipData = await Promise.all(ips.map((ip) => ipIntel(ip)));

  return {
    domain,
    web_host: webHost,
    dns: {
      A: a.ok ? a.value : [], AAAA: aaaa.ok ? aaaa.value : [], MX: mx.ok ? mx.value : [], NS: ns.ok ? ns.value : [],
      TXT: txts, CAA: caa.ok ? caa.value : [], SOA: soa.ok ? soa.value : null,
      errors: Object.fromEntries(Object.entries({ A: a, MX: mx, NS: ns }).filter(([, v]) => !v.ok).map(([k, v]) => [k, (v as any).error])),
    },
    email_auth: {
      spf: spf, spf_all_qualifier: spfAll, spf_multiple_records: spf.length > 1,
      dmarc: dmarcRec, dmarc_policy: dmarcPolicy,
      dkim_selectors_found: dkim, dkim_note: 'DKIM no es enumerable; se probaron selectores comunes.',
    },
    rdap: rdapOut,
    certificate_transparency: ctOut,
    tls: cert.ok ? cert.value : { error: cert.error },
    http: http.ok ? (({ raw, ...rest }) => rest)(http.value as any) : { error: http.error },
    ips: ipData,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authorize(req, res)) return;
  const raw = String(req.query.target ?? '').trim().toLowerCase();
  let target = raw.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
  if (target.includes('@')) target = target.split('@')[1];
  if (!target || target.length > 253) return res.status(400).json({ error: 'Parámetro "target" requerido (dominio o IP)' });
  const consulted_at = now();
  try {
    if (isIP(target)) {
      if (isPrivateIP(target)) return res.status(400).json({ error: 'Dirección privada/reservada: fuera de alcance de recon pasivo público' });
      const data = await ipIntel(target);
      return res.status(200).json({ kind: 'ip', target, consulted_at, data, scope: 'pasivo', sources: srcList() });
    }
    if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(target)) return res.status(400).json({ error: 'Dominio no válido' });
    const data = await domainIntel(target);
    res.setHeader('cache-control', 'no-store');
    return res.status(200).json({ kind: 'domain', target, consulted_at, data, scope: 'pasivo', sources: srcList() });
  } catch (e: any) {
    return res.status(500).json({ error: String(e?.message ?? e) });
  }
}

function srcList(): Src[] {
  const t = now();
  return [
    { source: 'DNS (Cloudflare 1.1.1.1 / Google 8.8.8.8)', consulted_at: t },
    { source: 'RDAP (IANA bootstrap vía rdap.org)', url: 'https://rdap.org', consulted_at: t },
    { source: 'Certificate Transparency (crt.sh)', url: 'https://crt.sh', consulted_at: t },
    { source: 'Team Cymru IP-to-ASN', url: 'https://www.team-cymru.com/ip-asn-mapping', consulted_at: t },
    { source: 'ipwho.is (geolocalización)', url: 'https://ipwho.is', consulted_at: t },
    { source: 'Tor Project bulk exit list', url: 'https://check.torproject.org/torbulkexitlist', consulted_at: t },
    { source: 'DNSBL: Spamhaus ZEN, SpamCop, UCEPROTECT', consulted_at: t },
  ];
}

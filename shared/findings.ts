// 856-FFCI v3.1 — Conversión de resultados técnicos a hallazgos numerables
// con tono pericial (§6.1): campo · observado · esperado · método · fuente · confianza.
import type { Finding, Severity } from './case.js';
import type { ParametricHit } from './extract.js';
import type { Validation } from './validators.js';
import type { ScreeningResult } from './types.js';
import type { EmailHeaderAnalysis } from './iocs.js';

let seq = 0;
const fid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function fromValidation(v: Validation, evidence?: string): Finding[] {
  const out: Finding[] = [];
  for (const c of v.checks.filter((c) => !c.ok)) {
    out.push({
      id: fid('DOC'), domain: 'DOC', severity: /control|MOD|Luhn|verificador/i.test(c.check) ? 'RELEVANTE' : 'RELEVANTE',
      field: `${v.standard} — ${v.value}`, observed: c.detail ? `No conforme (${c.detail})` : 'No conforme',
      expected: c.check, method: 'Validación algorítmica de estructura y dígito de control', source: v.standard, confidence: v.confidence, evidence,
    });
  }
  if (v.info.observación) {
    out.push({ id: fid('DOC'), domain: 'DOC', severity: 'RELEVANTE', field: `${v.standard} — ${v.value}`, observed: v.info.observación,
      expected: 'BIC operativo en red SWIFT', method: 'Análisis posicional ISO 9362', source: v.standard, confidence: 95, evidence });
  }
  return out;
}

export function fromParametric(h: ParametricHit, evidence?: string): Finding {
  return {
    id: fid('DOC'), domain: 'DOC', severity: 'RELEVANTE', field: `Terminología: ${h.pattern}`,
    observed: `${h.occurrences} ocurrencia(s): «${h.context[0]}»`, expected: 'Terminología reconocida por estándares SWIFT/ISO 20022 y normativa bancaria',
    method: 'Cotejo paramétrico contra catálogo FFCI §2.2', source: h.reference, confidence: 90, evidence,
  };
}

export function fromDateIssue(d: { value: string; issue: string }, evidence?: string): Finding {
  return { id: fid('DOC'), domain: 'DOC', severity: 'RELEVANTE', field: `Fecha ${d.value}`, observed: d.issue, expected: 'Fecha válida y consistente',
    method: 'Validación de calendario', source: 'ISO 8601', confidence: 97, evidence };
}

const SANCTIONS = ['OFAC_SDN', 'OFAC_CONS', 'UN', 'EU'];
const isTerror = (programs: string[], list: string) =>
  programs.some((p) => /SDGT|FTO|TERROR|Al-Qaida|ISIL|Da'esh|QDi|QDe|Taliban|TAi|TAe/i.test(p)) || (list === 'UN' && programs.some((p) => /^Q/i.test(p)));

export function fromScreening(r: ScreeningResult): Finding[] {
  const out: Finding[] = [];
  for (const m of r.matches) {
    let sev: Severity | null = null;
    const sanc = SANCTIONS.includes(m.list_matched);
    if (sanc && m.classification === 'CONFIRMED MATCH') sev = 'SUSTANCIAL';
    else if (sanc && m.classification === 'LIKELY MATCH') sev = 'RELEVANTE';
    else if (sanc && m.classification === 'POTENTIAL MATCH') sev = isTerror(m.programs, m.list_matched) ? 'RELEVANTE' : 'MENOR';
    else if (!sanc && (m.classification === 'CONFIRMED MATCH' || m.classification === 'LIKELY MATCH')) sev = 'RELEVANTE';
    else if (!sanc) sev = 'MENOR';
    if (!sev) continue;
    out.push({
      id: fid('ALIAS'), domain: 'ALIAS', severity: sev,
      field: `Sujeto «${m.subject_name}» (variante «${m.query_variant}»)`,
      observed: `${m.classification} con «${m.alias_detected}» [${m.alias_quality}] — registro ${m.list_entity_id} «${m.list_entity_name}»; programas: ${m.programs.join(', ') || 'N/D'}; score ${m.score}/100`,
      expected: `Ausencia de coincidencia ≥ ${r.thresholds.potential} en ${m.list_matched}`,
      method: `${m.match_type}; JW ${m.components.jaro_winkler} · Soundex ${m.components.soundex} · Lev ${m.components.levenshtein_norm} · Metaphone ${m.components.metaphone} · NYSIIS ${m.components.nysiis}${m.adjustments.length ? ' · ajustes: ' + m.adjustments.map((a) => `${a.reason} (${a.delta > 0 ? '+' : ''}${a.delta})`).join('; ') : ''}${m.corroboration.length ? ' · corroboración: ' + m.corroboration.join('; ') : ''}`,
      source: `${m.list_authority} — ${m.source_url} (SHA-256 ${m.dataset_sha256?.slice(0, 16) ?? 'N/D'}…)`,
      confidence: Math.round(m.score),
    });
  }
  return out;
}

export function fromEmail(a: EmailHeaderAnalysis): Finding[] {
  return a.observations.map((o) => ({
    id: fid('CYBER'), domain: 'CYBER' as const, severity: (/SPF|DKIM|DMARC/.test(o.field) ? 'RELEVANTE' : 'MENOR') as Severity,
    field: `Encabezado de correo: ${o.field}`, observed: o.observed, expected: o.expected,
    method: 'Análisis de encabezados RFC 5322 / Authentication-Results', source: 'Encabezados proporcionados', confidence: 95,
  }));
}

export function fromNet(target: string, d: any): Finding[] {
  const out: Finding[] = [];
  const add = (severity: Severity, field: string, observed: string, expected: string, method: string, source: string, confidence = 95) =>
    out.push({ id: fid('NET'), domain: 'NET', severity, field: `${target} — ${field}`, observed, expected, method, source, confidence });
  if (d.rdap && !d.rdap.error) {
    if (d.rdap.age_days != null && d.rdap.age_days < 180) add('RELEVANTE', 'Antigüedad de dominio', `${d.rdap.age_days} días (registro ${d.rdap.registered})`, '≥ 180 días para entidad financiera operativa', 'RDAP evento "registration"', d.rdap.url, 98);
    if ((d.rdap.status ?? []).some((s: string) => /hold|pending delete|redemption/i.test(s))) add('RELEVANTE', 'Estado EPP', d.rdap.status.join(', '), 'active / ok', 'RDAP status', d.rdap.url);
    if (d.rdap.registrant?.some((r: any) => /redacted|privacy|proxy|withheld/i.test(r.name))) add('MENOR', 'Titular de dominio', 'Datos del titular con servicio de privacidad/redactados', 'Titular identificable (entidad regulada)', 'RDAP entidad registrant', d.rdap.url, 90);
  }
  const ea = d.email_auth;
  if (ea) {
    if (!ea.spf?.length && d.dns?.MX?.length) add('MENOR', 'SPF', 'Registro SPF ausente', 'v=spf1 … -all/~all (RFC 7208)', 'DNS TXT', 'DNS público');
    if (ea.spf_multiple_records) add('MENOR', 'SPF', 'Múltiples registros SPF', 'Un solo registro (RFC 7208 §3.2)', 'DNS TXT', 'DNS público');
    if (ea.spf_all_qualifier === '+') add('RELEVANTE', 'SPF', '+all (autoriza cualquier emisor)', '-all o ~all', 'DNS TXT', 'DNS público');
    if (!ea.dmarc?.length && d.dns?.MX?.length) add('MENOR', 'DMARC', 'Registro DMARC ausente', 'v=DMARC1; p=quarantine|reject (RFC 7489)', 'DNS TXT _dmarc', 'DNS público');
    else if (ea.dmarc_policy === 'none') add('MENOR', 'DMARC', 'p=none (solo monitoreo)', 'p=quarantine o p=reject', 'DNS TXT _dmarc', 'DNS público');
  }
  if (d.tls && !d.tls.error) {
    if (d.tls.chain_trusted === false) add('MENOR', 'Certificado TLS', `Cadena no confiable (${d.tls.chain_error})`, 'Cadena válida hacia CA raíz confiable', 'Handshake TLS', 'Conexión directa :443');
    if (d.tls.days_to_expiry < 0) add('MENOR', 'Certificado TLS', `Expirado hace ${-d.tls.days_to_expiry} días`, 'Certificado vigente', 'Handshake TLS', 'Conexión directa :443');
  }
  if (d.http && !d.http.error) {
    const missing = (d.http.security_headers ?? []).filter((h: any) => !h.present).map((h: any) => h.header);
    if (missing.length >= 4) add('MENOR', 'Encabezados de seguridad HTTP', `Ausentes: ${missing.join(', ')}`, 'HSTS, CSP, X-Frame-Options, X-Content-Type-Options', 'Auditoría pasiva de encabezados', d.http.final_url, 95);
  }
  const ips = d.ips ?? (d.ip ? [d] : []);
  for (const ip of ips) {
    if (ip.anonymization?.tor?.is_tor_exit) add('RELEVANTE', `IP ${ip.ip}`, 'Nodo de salida Tor', 'Infraestructura no anonimizada', 'Lista oficial Tor Project', ip.anonymization.tor.source, 99);
    if (ip.anonymization?.vpn_keyword_asn) add('MENOR', `IP ${ip.ip}`, `ASN con denominación VPN/proxy (${ip.asn?.as_name ?? ''})`, 'ASN de operador/entidad', 'Heurística por nombre de ASN', 'Team Cymru', 70);
    for (const b of ip.reputation ?? []) if (b.listed) add('MENOR', `IP ${ip.ip}`, `Listada en ${b.list} (${b.response})`, 'No listada', 'Consulta DNSBL', b.list, 90);
  }
  return out;
}

const EDIT_TOOLS = /photoshop|gimp|canva|ilovepdf|smallpdf|sejda|pdfescape|pdf-xchange|foxit phantom|nitro|pdfelement|wondershare|inkscape|paint|word|libreoffice|openoffice|google docs|microsoft® word|pages|preview|quartz/i;

/** Hallazgos a partir de metadatos de evidencia (§2.2 Metadatos/EXIF). */
export function fromEvidence(e: { name: string; metadata: Record<string, string> }): Finding[] {
  const out: Finding[] = [];
  const m = e.metadata;
  const add = (severity: Severity, field: string, observed: string, expected: string, confidence = 95) =>
    out.push({ id: fid('DOC'), domain: 'DOC', severity, field, observed, expected, method: 'Análisis de metadatos (Info/XMP/EXIF) y estructura del archivo', source: e.name, confidence, evidence: e.name });
  const eof = Number(m['Secciones %%EOF (revisiones)'] ?? 0);
  if (eof > 1) add('MENOR', 'Estructura PDF', `${eof} secciones %%EOF (actualizaciones incrementales posteriores a la generación)`, '1 sección (documento sin modificaciones posteriores)', 97);
  if (m.CreationDate && m.ModDate && m.CreationDate.slice(0, 19) !== m.ModDate.slice(0, 19)) add('MENOR', 'Fechas de metadatos', `CreationDate ${m.CreationDate} ≠ ModDate ${m.ModDate}`, 'CreationDate = ModDate en documento emitido sin edición', 90);
  const tool = [m.Producer, m.Creator, m['XMP CreatorTool'], m.Software].filter(Boolean).join(' / ');
  if (tool && EDIT_TOOLS.test(tool)) add('MENOR', 'Software de generación', tool, 'Sistema de emisión de la institución (core bancario / generador documental institucional)', 85);
  if (m['JavaScript embebido']) add('MENOR', 'Contenido activo PDF', 'JavaScript embebido', 'Sin contenido activo en instrumento financiero', 95);
  if (m['Capa de texto']?.startsWith('ausente')) add('MENOR', 'Capa de texto', 'Documento sin capa de texto (imagen escaneada)', 'Documento nativo con texto extraíble o firma digital', 90);
  if (m.GPS) add('MENOR', 'EXIF GPS', m.GPS, 'Sin geolocalización embebida', 99);
  return out;
}

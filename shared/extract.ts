// 856-FFCI v3.1 — DOC-AGENT: extracción de entidades (NER por patrones),
// cotejo paramétrico y consistencia aritmética básica sobre texto.
import { ISO3166, VALIDATORS, type Validation, type ValidatorKind } from './validators.js';

export interface Extracted {
  kind: string;
  value: string;
  index: number;
  validation?: Validation;
}

export interface ParametricHit { pattern: string; occurrences: number; context: string[]; reference: string }

const RX: Record<string, RegExp> = {
  IBAN: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g,
  BIC: /\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/g,
  ISIN: /\b[A-Z]{2}[A-Z0-9]{9}\d\b/g,
  LEI: /\b[A-Z0-9]{18}\d{2}\b/g,
  CUSIP: /\b[0-9]{3}[A-Z0-9]{5}\d\b/g,
  FIGI: /\bBBG[A-Z0-9]{8}\d\b/g,
  CLABE: /\b\d{18}\b/g,
  CURP: /\b[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z\d]\d\b/g,
  RFC: /\b[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}\b/g,
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  URL: /\bhttps?:\/\/[^\s<>"')]+/gi,
  DOMAIN: /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|info|biz|io|co|mx|us|uk|ch|de|fr|es|it|nl|be|lu|li|hk|sg|ae|ru|cn|xyz|online|site|top|finance|bank|capital|global|group|ltd|eu|ca|au|br|ar|cl|pe)\b/gi,
  IPV4: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
  AMOUNT: /(?:(?:USD|EUR|MXN|GBP|CHF|US\$|€|\$|£)\s?\d{1,3}(?:[,.]\d{3})*(?:[.,]\d{1,2})?(?:\s?(?:M|MM|millones|million|billion|mil millones|B))?)|(?:\d{1,3}(?:[,.]\d{3})+(?:[.,]\d{2})?\s?(?:USD|EUR|MXN|GBP|CHF))/gi,
  DATE: /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{1,2}\s(?:de\s)?(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|apr|aug|dec)[a-z]*\.?\s(?:de\s)?\d{4})\b/gi,
  PHONE: /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{2,4}[\s.-]\d{3,4}[\s.-]\d{3,4}\b/g,
  SWIFT_MT: /\bMT\s?(?:103|199|202|299|542|543|700|707|760|767|799|999)\b/g,
};

const VALIDATED: ValidatorKind[] = ['IBAN', 'BIC', 'ISIN', 'LEI', 'CUSIP', 'FIGI', 'CLABE', 'CURP', 'RFC'];

/** Cotejo paramétrico (§2.2): terminología de referencia documentada en
 *  instrumentos no conformes. Se reporta como observación técnica. */
export const PARAMETRIC: { pattern: RegExp; label: string; reference: string }[] = [
  { pattern: /TVM[\s-]?LSM[\s-]?666/gi, label: 'TVM-LSM666', reference: 'Patrón paramétrico FFCI §2.2' },
  { pattern: /\bOITC\b|Office of International Treasury Control/gi, label: 'OITC', reference: 'Entidad sin existencia regulatoria verificable (avisos FinCEN/FBI)' },
  { pattern: /\bASBLP\b/gi, label: 'ASBLP', reference: 'Patrón paramétrico FFCI §2.2' },
  { pattern: /White\s+Spiritual\s+Boy/gi, label: '"White Spiritual Boy"', reference: 'Patrón paramétrico FFCI §2.2' },
  { pattern: /Global\s+Server/gi, label: '"Global Server"', reference: 'Patrón paramétrico FFCI §2.2 (terminología de transferencias server-to-server)' },
  { pattern: /Black\s+Screen/gi, label: '"Black Screen"', reference: 'Patrón paramétrico FFCI §2.2' },
  { pattern: /server[\s-]to[\s-]server|S2S\b|IP\s?\/\s?IP|IPIP\b/gi, label: 'Server-to-server / IP-IP', reference: 'Mecanismo no reconocido por SWIFT para transferencia de fondos' },
  { pattern: /\bKTT\b|key\s?tested\s?telex/gi, label: 'KTT / Key Tested Telex', reference: 'Telex autenticado: tecnología descontinuada en banca' },
  { pattern: /\bDTC\b.*\bscreen\b|Euroclear\s+screen|Bloomberg\s+screen/gi, label: 'Verificación por "screen"', reference: 'Concepto sin equivalente técnico en DTC/Euroclear' },
  { pattern: /\b(?:SBLC|BG|MTN|PPP)\b.*\b(?:lease|leasing|monetiz)/gi, label: 'Arrendamiento/monetización de instrumentos', reference: 'Avisos SEC/FINRA sobre programas de instrumentos bancarios' },
  { pattern: /private\s+placement\s+program|PPP\b|high[\s-]yield\s+investment\s+program|HYIP/gi, label: 'Private Placement / HYIP', reference: 'Avisos SEC "Prime Bank" / FINRA' },
  { pattern: /humanitarian\s+(?:project|fund)|proyecto\s+humanitario/gi, label: 'Proyecto humanitario vinculado a instrumento', reference: 'Patrón documentado en avisos regulatorios' },
];

export function extractEntities(text: string): Extracted[] {
  const out: Extracted[] = [];
  const seen = new Set<string>();
  for (const [kind, rx] of Object.entries(RX)) {
    for (const m of text.matchAll(rx)) {
      const value = m[0].trim();
      const key = kind + ':' + value.replace(/\s/g, '').toUpperCase();
      if (seen.has(key)) continue;
      let validation: Validation | undefined;
      if ((VALIDATED as string[]).includes(kind)) {
        validation = VALIDATORS[kind as ValidatorKind](value);
        // Filtrado de falsos positivos de patrón: BIC debe tener país ISO y contexto
        if (kind === 'BIC') {
          const ctx = text.slice(Math.max(0, (m.index ?? 0) - 60), (m.index ?? 0) + 20);
          if (!ISO3166.has(value.slice(4, 6)) || !/swift|bic|banco|bank|beneficiar|code|código/i.test(ctx)) continue;
        }
        if (kind === 'ISIN' && !ISO3166.has(value.slice(0, 2)) && !['XS', 'EU'].includes(value.slice(0, 2))) continue;
        if (kind === 'LEI' && !validation.valid && !/LEI/i.test(text.slice(Math.max(0, (m.index ?? 0) - 30), m.index))) continue;
        if (kind === 'CUSIP' && !validation.valid && !/CUSIP/i.test(text.slice(Math.max(0, (m.index ?? 0) - 30), m.index))) continue;
        if (kind === 'CLABE' && !/clabe|cuenta|account/i.test(text.slice(Math.max(0, (m.index ?? 0) - 60), m.index)) && !validation.valid) continue;
      }
      seen.add(key);
      out.push({ kind, value, index: m.index ?? 0, validation });
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

export function parametricScan(text: string): ParametricHit[] {
  const hits: ParametricHit[] = [];
  for (const p of PARAMETRIC) {
    const ms = [...text.matchAll(p.pattern)];
    if (!ms.length) continue;
    hits.push({
      pattern: p.label,
      occurrences: ms.length,
      reference: p.reference,
      context: ms.slice(0, 3).map((m) => text.slice(Math.max(0, (m.index ?? 0) - 50), (m.index ?? 0) + m[0].length + 50).replace(/\s+/g, ' ').trim()),
    });
  }
  return hits;
}

/** Normaliza un monto textual a número (heurística de separadores). */
export function parseAmount(s: string): { currency: string; value: number } | null {
  const cur = (s.match(/USD|EUR|MXN|GBP|CHF|US\$|€|\$|£/i)?.[0] ?? '').toUpperCase().replace('US$', 'USD').replace('€', 'EUR').replace('£', 'GBP').replace('$', 'USD/MXN');
  let num = s.replace(/[^\d.,]/g, '');
  if (!num) return null;
  const lastSep = Math.max(num.lastIndexOf('.'), num.lastIndexOf(','));
  if (lastSep >= 0 && num.length - lastSep - 1 === 2) num = num.slice(0, lastSep).replace(/[.,]/g, '') + '.' + num.slice(lastSep + 1);
  else num = num.replace(/[.,]/g, '');
  let value = Number(num);
  if (/\b(M|MM|millones|million)\b/i.test(s)) value *= 1e6;
  if (/\b(billion|B|mil millones)\b/i.test(s)) value *= 1e9;
  return Number.isFinite(value) ? { currency: cur, value } : null;
}

/** Consistencia temporal básica: fechas imposibles o futuras. */
export function dateChecks(text: string, now = new Date()): { value: string; issue: string }[] {
  const out: { value: string; issue: string }[] = [];
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b|\b(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})\b/g)) {
    const [y, mo, d] = m[1] ? [+m[1], +m[2], +m[3]] : [+m[6], +m[5], +m[4]];
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (mo < 1 || mo > 12 || dt.getUTCDate() !== d) {
      // formato MM/DD alternativo
      const alt = new Date(Date.UTC(y, d - 1, mo));
      if (!m[1] && d <= 12 && alt.getUTCDate() === mo) continue;
      out.push({ value: m[0], issue: 'Fecha inexistente en calendario gregoriano' });
    } else if (dt.getTime() > now.getTime() + 366 * 864e5) out.push({ value: m[0], issue: 'Fecha posterior a +1 año respecto de la fecha de análisis' });
  }
  return out;
}

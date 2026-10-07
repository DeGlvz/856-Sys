// 856-FFCI v3.1 — Modelo de caso y hallazgos (insumo del dictamen §5)
import type { ScreeningResult } from './types.js';
import type { IOCSet, TimelineEvent } from './iocs.js';

export type Severity = 'SUSTANCIAL' | 'RELEVANTE' | 'MENOR';
export type Domain = 'DOC' | 'OSINT' | 'NET' | 'CYBER' | 'ALIAS' | 'TIMELINE';

export interface Finding {
  id: string;
  domain: Domain;
  severity: Severity;
  field: string;     // campo/elemento
  observed: string;  // valor observado
  expected: string;  // valor/norma esperada
  method: string;    // método de verificación
  source: string;    // fuente
  confidence: number; // %
  evidence?: string;  // nombre de evidencia asociada
}

export interface Evidence {
  name: string;
  size: number;
  type: string;
  sha256: string;
  lastModified: string | null;
  received_at: string;
  metadata: Record<string, string>;
  text_chars?: number;
}

export interface NetRecord { target: string; kind: 'domain' | 'ip'; consulted_at: string; data: any; sources: { source: string; url?: string; consulted_at: string }[] }

export interface CaseState {
  id: string;
  created_at: string;
  mode: string;
  object: string;
  evidence: Evidence[];
  findings: Finding[];
  screenings: ScreeningResult[];
  net: NetRecord[];
  iocs: IOCSet;
  timeline: TimelineEvent[];
  sources: { ref: string; url?: string; consulted_at: string }[];
}

export const emptyIOCs = (): IOCSet => ({ ipv4: [], ipv6: [], domains: [], urls: [], emails: [], md5: [], sha1: [], sha256: [] });

export function newCase(): CaseState {
  const now = new Date();
  const id = `${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  return { id, created_at: now.toISOString(), mode: 'INTEGRADO', object: '', evidence: [], findings: [], screenings: [], net: [], iocs: emptyIOCs(), timeline: [], sources: [] };
}

export function mergeIOCs(a: IOCSet, b: Partial<IOCSet>): IOCSet {
  const out = { ...a };
  for (const k of Object.keys(out) as (keyof IOCSet)[]) out[k] = [...new Set([...(a[k] ?? []), ...(b[k] ?? [])])];
  return out;
}

const RANK: Record<Severity, number> = { MENOR: 1, RELEVANTE: 2, SUSTANCIAL: 3 };

/** Materialidad (§2.1, §2.6.9): escala técnica por volumen y gravedad. */
export function materiality(c: CaseState): { level: Severity | 'SIN NO-CONFORMIDADES'; rationale: string } {
  const all = c.findings;
  if (!all.length) return { level: 'SIN NO-CONFORMIDADES', rationale: 'No se registraron no-conformidades en los dominios analizados.' };
  const n = (s: Severity) => all.filter((f) => f.severity === s).length;
  const s = n('SUSTANCIAL'), r = n('RELEVANTE'), m = n('MENOR');
  let level: Severity = 'MENOR';
  if (s > 0 || r >= 5) level = 'SUSTANCIAL';
  else if (r > 0 || m >= 6) level = 'RELEVANTE';
  return { level, rationale: `${s} sustancial(es) · ${r} relevante(s) · ${m} menor(es). Regla: ≥1 sustancial o ≥5 relevantes → SUSTANCIAL; ≥1 relevante o ≥6 menores → RELEVANTE.` };
}

export const sortFindings = (f: Finding[]) => [...f].sort((a, b) => RANK[b.severity] - RANK[a.severity]);

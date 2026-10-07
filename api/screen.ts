// POST /api/screen — Cotejo de alias contra listas restrictivas (ALIAS-AGENT)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BULK, DECLARED_NOT_INTEGRATED, getSource, liveFBI, liveInterpol } from './_lib/sources.js';
import { authorize, body } from './_lib/http.js';
import { buildVariants, classify, maxClass, NO_DETERMINATION } from '../shared/screening.js';
import { DEFAULT_THRESHOLDS, type MatchClass, type ScreeningQuery, type ScreeningResult, type Thresholds } from '../shared/types.js';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  if (!authorize(req, res)) return;
  let q: ScreeningQuery & { thresholds?: Partial<Thresholds> };
  try { q = body(req); } catch { return res.status(400).json({ error: 'JSON inválido' }); }
  if (!q?.name || typeof q.name !== 'string' || q.name.trim().length < 2) return res.status(400).json({ error: 'Se requiere "name" (≥ 2 caracteres)' });
  if (q.kind !== 'individual' && q.kind !== 'entity') q.kind = 'individual';
  q.aliases = (q.aliases ?? []).filter((a) => typeof a === 'string' && a.trim()).slice(0, 20);
  q.documents = (q.documents ?? []).filter((a) => typeof a === 'string' && a.trim()).slice(0, 10);
  const t: Thresholds = { ...DEFAULT_THRESHOLDS, ...(q.thresholds ?? {}) };
  const wanted = q.lists?.length ? q.lists : [...BULK.map((b) => b.code), 'FBI', 'INTERPOL_RED'];
  const consulted_at = new Date().toISOString();

  const tasks = wanted.map(async (code) => {
    if (code === 'FBI') return q.kind === 'individual' ? liveFBI(q.name) : null;
    if (code === 'INTERPOL_RED') return q.kind === 'individual' ? liveInterpol(q.name) : null;
    if (!BULK.some((b) => b.code === code)) return null;
    return getSource(code);
  });
  const loaded = (await Promise.all(tasks)).filter(Boolean) as Awaited<ReturnType<typeof getSource>>[];

  const result: ScreeningResult = {
    query: q,
    normalized: buildVariants(q).map((v) => ({ variant: v.label, normalized: v.normalized, canonical: v.canonical, transliteration: v.translit })),
    consulted_at,
    lists: [],
    matches: [],
    overall: 'CLEAR',
    thresholds: t,
    clause: '',
    limitations: [
      'No existe API pública en tiempo real para OFAC/ONU/UE: cotejo por descarga oficial + índice local + refresco periódico.',
      'Interpol no ofrece bulk data; la consulta pública está sujeta a rate limiting, bloqueo por IP y términos de uso.',
      'OFAC no clasifica calidad de alias en ALT.CSV; los "weak a.k.a." de Remarks se tratan como baja calidad. ONU sí clasifica.',
      `Umbrales ${t.potential}/${t.likely}/${t.confirmed} iniciales y calibrables; requieren test set etiquetado para producción.`,
      'Transliteración no latina aproximada (ISO 233 / ALA-LC / BGN-PCGN / Pinyin simplificados a ASCII).',
      ...DECLARED_NOT_INTEGRATED,
    ],
  };
  for (const l of loaded) {
    let best: number | null = null;
    let cls: MatchClass = 'CLEAR';
    if (l.index) {
      const ms = l.index.screen(q, { code: l.meta.code, authority: l.meta.authority, url: l.meta.url, version: l.meta.source_version, sha256: l.meta.sha256 }, t, consulted_at);
      result.matches.push(...ms);
      best = ms.length ? ms[0].score : null;
      cls = best != null ? classify(best, t) : 'CLEAR';
    }
    result.lists.push({ ...l.meta, result: l.index ? cls : 'CLEAR', best_score: best });
    if (l.index) result.overall = maxClass(result.overall, cls);
  }
  result.matches.sort((a, b) => b.score - a.score);
  result.clause = NO_DETERMINATION(result.lists.filter((l) => l.status !== 'error'));
  res.setHeader('cache-control', 'no-store');
  return res.status(200).json(result);
}

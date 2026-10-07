// 856-FFCI v3.1 — Pipeline §10.1 pasos [4]–[8]: variantes fonéticas, cotejo,
// scoring §2.6.7 (calibrable), ajuste por calidad de alias, clasificación §2.6.8.
import { jaroWinkler, levenshtein, metaphone, nysiis, soundex } from './matching.js';
import { canonical, canonToken, normalizeName, tokenize, transliterate } from './normalize.js';
import {
  AliasQuality, DEFAULT_THRESHOLDS, ListEntity, MatchClass, MatchDetail, ScreeningQuery, Thresholds,
} from './types.js';

export const SCORING = {
  weights: { jw: 0.5, soundex: 0.2, lev: 0.3 },
  alias: { good: 10, low: 5, unclassified: 0 } as Record<AliasQuality, number>,
  dobOutOfRange: -15,       // año de nacimiento fuera de ±5 años
  documentExact: 20,        // número de documento idéntico (+20, piso LIKELY)
  partialCoverageFloor: 0.85, // penalización por coincidencia parcial de tokens
  minBaseForAliasBonus: 50,
  tokenMatchJW: 0.88,       // umbral de token coincidente (o Soundex idéntico)
  tokenCoveragePenalty: 30, // −30 × fracción de tokens de la consulta sin correspondencia
};

/** Fracción de tokens de `a` con correspondencia en `b` (JW ≥ umbral o Soundex idéntico). */
export function tokenCoverage(a: string, b: string): { matched: number; total: number } {
  const ta = tokenize(a), tb = tokenize(b);
  let matched = 0;
  for (const x of ta) {
    if (tb.some((y) => y === x || jaroWinkler(x, y) >= SCORING.tokenMatchJW || (x.length > 2 && y.length > 2 && soundex(x) === soundex(y) && x[0] === y[0]))) matched++;
  }
  return { matched, total: ta.length };
}

export function classify(score: number, t: Thresholds = DEFAULT_THRESHOLDS): MatchClass {
  if (score >= t.confirmed) return 'CONFIRMED MATCH';
  if (score >= t.likely) return 'LIKELY MATCH';
  if (score >= t.potential) return 'POTENTIAL MATCH';
  return 'CLEAR';
}

const CLASS_RANK: Record<MatchClass, number> = {
  CLEAR: 0, 'POTENTIAL MATCH': 1, 'LIKELY MATCH': 2, 'CONFIRMED MATCH': 3,
};
export const maxClass = (a: MatchClass, b: MatchClass) => (CLASS_RANK[a] >= CLASS_RANK[b] ? a : b);

/** Fórmula §2.6.7 aplicada a dos cadenas canónicas. */
export function aliasScore(a: string, b: string) {
  const jw = jaroWinkler(a, b);
  const ta = tokenize(a), tb = tokenize(b);
  const sdxA = ta.map(soundex), sdxB = new Set(tb.map(soundex));
  const sdx = ta.length ? sdxA.filter((c) => sdxB.has(c)).length / Math.max(ta.length, tb.length) : 0;
  const maxLen = Math.max(a.length, b.length) || 1;
  const lev = 1 - levenshtein(a, b) / maxLen;
  const mA = ta.map(metaphone), mB = new Set(tb.map(metaphone));
  const met = ta.length ? mA.filter((c) => mB.has(c)).length / Math.max(ta.length, tb.length) : 0;
  const nA = ta.map(nysiis), nB = new Set(tb.map(nysiis));
  const ny = ta.length ? nA.filter((c) => nB.has(c)).length / Math.max(ta.length, tb.length) : 0;
  const w = SCORING.weights;
  const score = (jw * w.jw + sdx * w.soundex + lev * w.lev) * 100;
  return { score, jw, sdx, lev, met, ny };
}

/** Alineación por partes significativas (§2.6.4): cada token de la consulta
 *  contra su mejor token del candidato, en el orden de la consulta. */
function alignedScore(qCanon: string, cCanon: string) {
  const qt = tokenize(qCanon), ct = tokenize(cCanon);
  if (qt.length < 2 || ct.length <= qt.length) return null;
  const used = new Set<number>();
  const picked: string[] = [];
  for (const q of qt) {
    let best = -1, bi = -1;
    ct.forEach((c, i) => {
      if (used.has(i)) return;
      const s = jaroWinkler(q, c);
      if (s > best) { best = s; bi = i; }
    });
    if (bi < 0) return null;
    used.add(bi);
    picked.push(ct[bi]);
  }
  const r = aliasScore(qt.join(' '), picked.join(' '));
  const coverage = qt.length / ct.length;
  const f = SCORING.partialCoverageFloor + (1 - SCORING.partialCoverageFloor) * coverage;
  return { ...r, score: r.score * f };
}

function years(dobs: string[]): number[] {
  const ys: number[] = [];
  for (const d of dobs) for (const m of d.matchAll(/\b(1[89]\d\d|20\d\d)\b/g)) ys.push(+m[1]);
  return ys;
}

const normDoc = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

export interface Variant { label: string; normalized: string; canonical: string; translit: string[]; tokens: string[] }

export function buildVariants(q: ScreeningQuery): Variant[] {
  const raw = [q.name, ...(q.aliases ?? [])].map((s) => s.trim()).filter(Boolean);
  const out: Variant[] = [];
  const seen = new Set<string>();
  for (const label of raw) {
    const normalized = normalizeName(label, { entity: q.kind === 'entity' });
    const canon = canonical(normalized);
    if (!canon || seen.has(canon)) continue;
    seen.add(canon);
    out.push({ label, normalized, canonical: canon, translit: transliterate(label).standards, tokens: tokenize(canon) });
  }
  return out;
}

// ---------------------------------------------------------------- Índice local
interface IndexedName { entity: number; name: string; canon: string; quality: AliasQuality | 'primary' }

export class WatchlistIndex {
  readonly names: IndexedName[] = [];
  private postings = new Map<string, number[]>();

  constructor(readonly entities: ListEntity[]) {
    entities.forEach((e, ei) => {
      const isEntity = e.type !== 'individual';
      const all: { n: string; q: AliasQuality | 'primary' }[] = [
        { n: e.name, q: 'primary' }, ...e.aliases.map((a) => ({ n: a.name, q: a.quality })),
      ];
      const seen = new Set<string>();
      for (const { n, q } of all) {
        const canon = canonical(normalizeName(n, { entity: isEntity }));
        if (!canon || seen.has(canon)) continue;
        seen.add(canon);
        const idx = this.names.push({ entity: ei, name: n, canon, quality: q }) - 1;
        for (const t of new Set(tokenize(canon))) {
          if (t.length < 2) continue;
          for (const key of ['s:' + soundex(t), 'm:' + metaphone(t)]) {
            let p = this.postings.get(key);
            if (!p) this.postings.set(key, (p = []));
            p.push(idx);
          }
        }
      }
    });
  }

  candidates(v: Variant, limit = 4000): number[] {
    const counts = new Map<number, number>();
    const lists = v.tokens.filter((t) => t.length >= 2).map((t) => {
      const a = this.postings.get('s:' + soundex(t)) ?? [];
      const b = this.postings.get('m:' + metaphone(t)) ?? [];
      return [...new Set([...a, ...b])];
    }).sort((a, b) => a.length - b.length);
    // tokens muy frecuentes (p.ej. "muhammad") solo cuentan si son los únicos
    const useful = lists.filter((l, i) => i === 0 || l.length < 5000);
    for (const l of useful) for (const n of l) counts.set(n, (counts.get(n) ?? 0) + 1);
    const need = Math.min(2, useful.length);
    return [...counts.entries()].filter(([, c]) => c >= need).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([n]) => n);
  }

  screen(
    q: ScreeningQuery,
    meta: { code: string; authority: string; url: string; version: string | null; sha256: string | null },
    t: Thresholds = DEFAULT_THRESHOLDS,
    consulted_at = new Date().toISOString(),
  ): MatchDetail[] {
    const variants = buildVariants(q);
    const qYears = q.dob ? years([q.dob]) : [];
    const qDocs = (q.documents ?? []).map(normDoc).filter((d) => d.length >= 5);
    const qNat = q.nationality ? normalizeName(q.nationality) : '';
    const best = new Map<number, MatchDetail>();

    const consider = (ni: number, v: Variant) => {
      const n = this.names[ni];
      const e = this.entities[n.entity];
      if (q.kind === 'individual' && e.type !== 'individual' && e.type !== 'unknown') return;
      if (q.kind === 'entity' && e.type === 'individual') return;
      const full = aliasScore(v.canonical, n.canon);
      const al = alignedScore(v.canonical, n.canon);
      const r = al && al.score > full.score ? al : full;
      const base = r.score;
      if (base < t.potential - 15 && !qDocs.length) return;
      const adjustments: { reason: string; delta: number }[] = [];
      const corroboration: string[] = [];
      const cq = tokenCoverage(v.canonical, n.canon);
      const cc = tokenCoverage(n.canon, v.canonical);
      const fq = cq.matched / (cq.total || 1), fc = cc.matched / (cc.total || 1);
      const cov = tokenize(n.canon).length <= v.tokens.length ? Math.min(fq, fc) : fq;
      if (cov < 1) adjustments.push({ reason: `Cobertura de tokens de la consulta ${cq.matched}/${cq.total}`, delta: -Math.round(SCORING.tokenCoveragePenalty * (1 - cov) * 100) / 100 });
      else if (fc < 1) adjustments.push({ reason: `Coincidencia parcial: ${cc.matched}/${cc.total} tokens del registro`, delta: -Math.round(SCORING.tokenCoveragePenalty * 0.5 * (1 - fc) * 100) / 100 });
      if (n.quality !== 'primary' && base >= SCORING.minBaseForAliasBonus) {
        const d = SCORING.alias[n.quality];
        if (d) adjustments.push({ reason: `Alias ${n.quality === 'good' ? 'good quality' : 'low quality'} (estándar ONU)`, delta: d });
      }
      const eYears = years(e.dob);
      if (qYears.length && eYears.length) {
        const diff = Math.min(...qYears.flatMap((a) => eYears.map((b) => Math.abs(a - b))));
        if (diff <= 5) corroboration.push(`Fecha de nacimiento dentro de ±5 años (Δ=${diff})`);
        else adjustments.push({ reason: `Año de nacimiento fuera de ±5 años (Δ=${diff})`, delta: SCORING.dobOutOfRange });
      }
      if (qNat && e.nationality.some((x) => normalizeName(x).includes(qNat) || qNat.includes(normalizeName(x)))) {
        corroboration.push('Nacionalidad coincidente');
      }
      let docHit = false;
      if (qDocs.length) {
        const eDocs = e.documents.map(normDoc);
        const hit = qDocs.find((d) => eDocs.some((x) => x.includes(d) || (x.length >= 5 && d.includes(x))));
        if (hit) { docHit = true; adjustments.push({ reason: `Número de documento coincidente (${hit})`, delta: SCORING.documentExact }); }
      }
      if (base < t.potential - 15 && !docHit) return;
      let score = Math.max(0, Math.min(100, base + adjustments.reduce((s, a) => s + a.delta, 0)));
      if ((cov < 1 || fc < 1) && score >= t.confirmed && !docHit) {
        adjustments.push({ reason: 'Coincidencia parcial de nombre: tope por debajo de CONFIRMED', delta: Math.round((t.confirmed - 0.5 - score) * 100) / 100 });
        score = t.confirmed - 0.5;
      }
      if (docHit) score = Math.max(score, t.likely); // documento idéntico: piso LIKELY
      const prev = best.get(n.entity);
      if (prev && prev.score >= score) return;
      const exact = v.canonical === n.canon;
      const match_type: MatchDetail['match_type'] = docHit ? 'documento'
        : exact ? (v.translit.length ? 'transliteración' : 'exacto')
        : r.sdx >= 0.99 || r.met >= 0.99 ? 'fonético' : 'fuzzy';
      best.set(n.entity, {
        subject_name: q.name,
        query_variant: v.label,
        alias_detected: n.name,
        alias_quality: n.quality,
        list_matched: meta.code,
        list_authority: meta.authority,
        list_entity_id: e.id,
        list_entity_name: e.name,
        entity_type: e.type,
        match_type,
        score: Math.round(score * 100) / 100,
        score_base: Math.round(base * 100) / 100,
        components: {
          jaro_winkler: round4(r.jw), soundex: round4(r.sdx), levenshtein_norm: round4(r.lev),
          metaphone: round4(r.met), nysiis: round4(r.ny),
        },
        adjustments,
        classification: classify(score, t),
        corroboration,
        programs: e.programs,
        dob: e.dob,
        nationality: e.nationality,
        source_url: e.url ?? meta.url,
        source_version: meta.version,
        dataset_sha256: meta.sha256,
        consulted_at,
      });
    };

    for (const v of variants) for (const ni of this.candidates(v)) consider(ni, v);
    if (qDocs.length) {
      this.entities.forEach((e, ei) => {
        const eDocs = e.documents.map(normDoc);
        if (!qDocs.some((d) => eDocs.some((x) => x.includes(d)))) return;
        const ni = this.names.findIndex((n) => n.entity === ei);
        if (ni >= 0 && variants[0]) consider(ni, variants[0]);
      });
    }
    return [...best.values()].filter((m) => m.score >= t.potential).sort((a, b) => b.score - a.score).slice(0, 25);
  }
}

const round4 = (x: number) => Math.round(x * 10000) / 10000;

export { NO_DETERMINATION } from './clause.js';
export { canonToken };

// GET /api/registry?lei=XXXX | ?bic=XXXX | ?name=XXXX
// Verificación de existencia legal contra GLEIF (Global LEI Index, CC0).
// BIC↔LEI: mapeo oficial publicado por GLEIF y SWIFT.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
import { authorize } from './_lib/http.js';

export const config = { maxDuration: 30 };
const G = 'https://api.gleif.org/api/v1';

async function get(url: string) {
  const r = await fetch(url, { headers: { accept: 'application/vnd.api+json', 'user-agent': '856-FFCI/3.1' } });
  const text = await r.text();
  if (r.status === 404) return { data: null, sha256: createHash('sha256').update(text).digest('hex'), url };
  if (!r.ok) throw new Error(`GLEIF HTTP ${r.status}`);
  return { data: JSON.parse(text), sha256: createHash('sha256').update(text).digest('hex'), url };
}

const summarize = (rec: any) => {
  const a = rec?.attributes ?? {};
  const e = a.entity ?? {};
  return {
    lei: a.lei,
    legal_name: e.legalName?.name,
    other_names: (e.otherNames ?? []).map((n: any) => n.name),
    status: e.status,
    legal_form: e.legalForm?.id,
    jurisdiction: e.jurisdiction,
    legal_address: [e.legalAddress?.addressLines?.join(' '), e.legalAddress?.city, e.legalAddress?.region, e.legalAddress?.country].filter(Boolean).join(', '),
    hq_address: [e.headquartersAddress?.addressLines?.join(' '), e.headquartersAddress?.city, e.headquartersAddress?.country].filter(Boolean).join(', '),
    registered_as: e.registeredAs,
    registration_authority: e.registeredAt?.id,
    creation_date: e.creationDate,
    registration_status: a.registration?.status,
    initial_registration: a.registration?.initialRegistrationDate,
    last_update: a.registration?.lastUpdateDate,
    next_renewal: a.registration?.nextRenewalDate,
    managing_lou: a.registration?.managingLou,
    bic: a.bic ?? [],
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authorize(req, res)) return;
  const consulted_at = new Date().toISOString();
  try {
    const lei = String(req.query.lei ?? '').toUpperCase().replace(/\s/g, '');
    const bic = String(req.query.bic ?? '').toUpperCase().replace(/\s/g, '');
    const name = String(req.query.name ?? '').trim();
    if (lei) {
      const r = await get(`${G}/lei-records/${encodeURIComponent(lei)}`);
      return res.json({ query: { lei }, found: !!r.data?.data, record: r.data?.data ? summarize(r.data.data) : null, source: r.url, sha256: r.sha256, consulted_at });
    }
    if (bic) {
      const b8 = bic.slice(0, 8);
      const r = await get(`${G}/lei-records?filter[bic]=${encodeURIComponent(bic.length === 8 ? bic + 'XXX' : bic)}&page[size]=10`);
      let rows = r.data?.data ?? [];
      let note = 'Coincidencia exacta de BIC en mapeo GLEIF–SWIFT';
      if (!rows.length) {
        const r2 = await get(`${G}/lei-records?filter[bic]=${encodeURIComponent(b8)}&page[size]=10`);
        rows = r2.data?.data ?? [];
        note = rows.length ? 'Coincidencia por BIC8 (institución + país + localidad)' : 'El BIC no figura en el mapeo GLEIF–SWIFT. La ausencia no determina inexistencia en el directorio SWIFT.';
      }
      return res.json({ query: { bic }, found: rows.length > 0, records: rows.map(summarize), note, source: r.url, sha256: r.sha256, consulted_at });
    }
    if (name) {
      const r = await get(`${G}/fuzzycompletions?field=entity.legalName&q=${encodeURIComponent(name)}`);
      const items = (r.data?.data ?? []).slice(0, 10).map((d: any) => ({ name: d.attributes?.value, lei: d.relationships?.['lei-records']?.data?.id ?? null }));
      return res.json({ query: { name }, found: items.length > 0, candidates: items, source: r.url, sha256: r.sha256, consulted_at });
    }
    return res.status(400).json({ error: 'Use ?lei=, ?bic= o ?name=' });
  } catch (e: any) {
    return res.status(502).json({ error: String(e?.message ?? e), consulted_at });
  }
}

// GET  /api/sources            — estado de datasets (cadena de custodia)
// GET  /api/sources?load=1     — descarga/indexa las listas que no estén en caché
// GET  /api/sources?refresh=1  — fuerza refresco (cron diario / manual)
// GET  /api/sources?format=yaml — artefacto list_sources.yaml (§2.6.1)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BULK, DECLARED_NOT_INTEGRATED, LIVE, cachedMeta, getSource } from './_lib/sources.js';
import { authorize } from './_lib/http.js';
import type { DatasetMeta } from '../shared/types.js';

export const config = { maxDuration: 60 };

function yaml(metas: DatasetMeta[]): string {
  const esc = (v: unknown) => (v == null ? 'null' : JSON.stringify(v));
  let out = `# list_sources.yaml — 856-FFCI v3.1\n# generado: ${new Date().toISOString()}\nsources:\n`;
  for (const m of metas) {
    out += `  - code: ${m.code}\n    name: ${esc(m.name)}\n    authority: ${esc(m.authority)}\n    url: ${esc(m.url)}\n    format: ${m.format}\n    parser: ${esc(m.parser)}\n    refresh: ${esc(m.refresh)}\n    downloaded_at: ${esc(m.downloaded_at)}\n    sha256: ${esc(m.sha256)}\n    source_version: ${esc(m.source_version)}\n    entities: ${m.entities}\n    status: ${m.status}\n    errors: ${esc(m.errors)}\n`;
    if (m.files?.length) {
      out += `    files:\n`;
      for (const f of m.files) out += `      - { url: ${esc(f.url)}, sha256: ${f.sha256}, bytes: ${f.bytes} }\n`;
    }
  }
  for (const l of LIVE) out += `  - code: ${l.code}\n    name: ${esc(l.name)}\n    authority: ${esc(l.authority)}\n    url: ${esc(l.url)}\n    format: ${esc(l.format)}\n    refresh: "consulta en vivo por caso"\n`;
  out += `not_integrated:\n${DECLARED_NOT_INTEGRATED.map((d) => `  - ${esc(d)}`).join('\n')}\n`;
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authorize(req, res)) return;
  const refresh = req.query.refresh === '1';
  const load = refresh || req.query.load === '1';
  let metas = cachedMeta();
  if (load) metas = (await Promise.all(BULK.map((b) => getSource(b.code, refresh)))).map((l) => l.meta);
  res.setHeader('cache-control', 'no-store');
  if (req.query.format === 'yaml') {
    res.setHeader('content-type', 'text/yaml; charset=utf-8');
    res.setHeader('content-disposition', 'attachment; filename="list_sources.yaml"');
    return res.status(200).send(yaml(metas));
  }
  return res.status(200).json({ sources: metas, live: LIVE, not_integrated: DECLARED_NOT_INTEGRATED });
}

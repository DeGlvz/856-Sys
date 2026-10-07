// Cron diario (vercel.json): refresco de listas oficiales — §2.6.1 "refresco periódico"
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BULK, getSource } from './_lib/sources.js';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'no autorizado' });
  const out = await Promise.all(BULK.map((b) => getSource(b.code, true)));
  return res.status(200).json({ refreshed_at: new Date().toISOString(), sources: out.map((l) => ({ code: l.meta.code, status: l.meta.status, entities: l.meta.entities, sha256: l.meta.sha256, errors: l.meta.errors })) });
}

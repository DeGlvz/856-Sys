import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Control de acceso opcional: si FFCI_ACCESS_KEY está definida, se exige
 *  el encabezado `x-ffci-key`. Las ejecuciones de cron usan CRON_SECRET. */
export function authorize(req: VercelRequest, res: VercelResponse): boolean {
  const key = process.env.FFCI_ACCESS_KEY;
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.authorization === `Bearer ${cron}`) return true;
  if (!key) return true;
  if (req.headers['x-ffci-key'] === key) return true;
  res.status(401).json({ error: 'Acceso no autorizado: se requiere la clave de acceso FFCI (x-ffci-key).' });
  return false;
}

export function body<T>(req: VercelRequest): T {
  const b = req.body;
  if (typeof b === 'string') return JSON.parse(b) as T;
  return (b ?? {}) as T;
}

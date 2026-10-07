// Cliente de API del backend FFCI (funciones serverless /api/*)
const KEY = 'ffci.accessKey';

export function getAccessKey(): string {
  try { return localStorage.getItem(KEY) ?? ''; } catch { return ''; }
}
export function setAccessKey(v: string) {
  try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch { /* almacenamiento no disponible */ }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const k = getAccessKey();
  if (k) headers['x-ffci-key'] = k;
  const r = await fetch(path, { ...init, headers: { ...headers, ...(init?.headers as any) } });
  const text = await r.text();
  let data: any;
  try { data = JSON.parse(text); } catch { throw new Error(r.ok ? 'Respuesta no válida del servidor' : `HTTP ${r.status}: ${text.slice(0, 200)}`); }
  if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
  return data as T;
}

export const api = {
  screen: (body: unknown) => call<any>('/api/screen', { method: 'POST', body: JSON.stringify(body) }),
  sources: (mode?: 'load' | 'refresh') => call<any>(`/api/sources${mode ? `?${mode}=1` : ''}`),
  net: (target: string) => call<any>(`/api/net?target=${encodeURIComponent(target)}`),
  registry: (q: { lei?: string; bic?: string; name?: string }) =>
    call<any>(`/api/registry?${new URLSearchParams(q as Record<string, string>).toString()}`),
  yamlUrl: () => '/api/sources?format=yaml',
};

export function downloadText(filename: string, text: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

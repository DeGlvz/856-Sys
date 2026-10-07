import { useEffect, useState } from 'react';
import { api, getAccessKey, setAccessKey } from '../../lib/api';
import { Badge, Btn, ErrorBox, Field, inputCls, ModuleHeader, Panel, Spinner } from './ui';

export default function SourcesModule() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [key, setKey] = useState(getAccessKey());

  async function load(mode?: 'load' | 'refresh') {
    setBusy(mode ?? 'status'); setErr(null);
    try { setData(await api.sources(mode)); } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  useEffect(() => { load(); }, []);

  async function yaml() {
    try {
      const r = await fetch(api.yamlUrl(), { headers: key ? { 'x-ffci-key': key } : {} });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement('a'); a.href = url; a.download = 'list_sources.yaml'; a.click();
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="space-y-6">
      <ModuleHeader icon="fa-database" title="CAPA OPERATIVA DE DATOS" subtitle="Datasets oficiales · cadena de custodia SHA-256 (§2.6.1, §6.3)" />
      <Panel title="DATASETS" icon="fa-globe" right={
        <div className="flex gap-2 flex-wrap">
          <Btn kind="ghost" onClick={() => load()} disabled={!!busy}>{busy === 'status' ? <Spinner /> : 'ESTADO'}</Btn>
          <Btn onClick={() => load('load')} disabled={!!busy}>{busy === 'load' ? <><Spinner /> DESCARGANDO…</> : 'DESCARGAR / INDEXAR'}</Btn>
          <Btn kind="ghost" onClick={() => load('refresh')} disabled={!!busy}>{busy === 'refresh' ? <Spinner /> : 'FORZAR REFRESCO'}</Btn>
          <Btn kind="ghost" onClick={yaml}><i className="fas fa-file-code mr-2"></i>list_sources.yaml</Btn>
        </div>}>
        <ErrorBox msg={err} />
        {data && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 text-left border-b border-gray-800">
                <th className="py-2 pr-3">Lista</th><th className="pr-3">Estado</th><th className="pr-3">Registros</th><th className="pr-3">Descarga</th><th className="pr-3">Versión</th><th>Archivos (SHA-256)</th></tr></thead>
              <tbody>
                {data.sources.map((s: any) => (
                  <tr key={s.code} className="border-b border-gray-800/50 align-top">
                    <td className="py-2 pr-3"><div className="text-gray-200">{s.name}</div><div className="text-gray-600">{s.authority} · {s.format} · {s.refresh}</div></td>
                    <td className="pr-3"><Badge v={s.status} />{s.errors?.length > 0 && <div className="text-red-400 mt-1 max-w-xs">{s.errors.join('; ')}</div>}</td>
                    <td className="pr-3 text-gray-300">{s.entities?.toLocaleString()}</td>
                    <td className="pr-3 text-gray-400">{s.downloaded_at ?? '—'}</td>
                    <td className="pr-3 text-gray-400">{s.source_version ?? '—'}</td>
                    <td className="text-gray-500 font-mono">{(s.files ?? []).map((f: any) => <div key={f.url}>{f.sha256.slice(0, 24)}… · {(f.bytes / 1024).toFixed(0)} KB</div>)}</td>
                  </tr>
                ))}
                {data.live.map((l: any) => (
                  <tr key={l.code} className="border-b border-gray-800/50"><td className="py-2 pr-3 text-gray-200">{l.name}<div className="text-gray-600">{l.authority} · {l.format}</div></td>
                    <td className="pr-3"><Badge v="live" /></td><td colSpan={4} className="text-gray-500">Consulta en vivo por caso; SHA-256 de cada respuesta registrado en el resultado.</td></tr>
                ))}
              </tbody>
            </table>
            <ul className="mt-4 text-[11px] text-gray-500 list-disc pl-5 space-y-1">{data.not_integrated.map((n: string) => <li key={n}>{n}</li>)}</ul>
          </div>
        )}
      </Panel>
      <Panel title="CLAVE DE ACCESO" icon="fa-key">
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[240px]"><Field label="x-ffci-key" hint="Solo si el administrador definió FFCI_ACCESS_KEY en Vercel. Se guarda en este navegador.">
            <input type="password" className={inputCls} value={key} onChange={(e) => setKey(e.target.value)} />
          </Field></div>
          <Btn onClick={() => { setAccessKey(key); load(); }}>GUARDAR</Btn>
        </div>
      </Panel>
    </div>
  );
}

import { useState } from 'react';
import { api } from '../../lib/api';
import { useCase } from '../../lib/caseStore';
import { fromScreening } from '../../../shared/findings';
import type { ScreeningResult } from '../../../shared/types';
import { Badge, Btn, ErrorBox, Field, inputCls, ModuleHeader, Panel, Spinner } from './ui';

const LISTS = [
  { code: 'OFAC_SDN', label: 'OFAC SDN' },
  { code: 'OFAC_CONS', label: 'OFAC Consolidated' },
  { code: 'UN', label: 'ONU Consolidada' },
  { code: 'EU', label: 'UE Consolidada' },
  { code: 'FBI', label: 'FBI Most Wanted (vivo)' },
  { code: 'INTERPOL_RED', label: 'Interpol Red Notices (vivo)' },
];

export default function AliasModule() {
  const { dispatch } = useCase();
  const [kind, setKind] = useState<'individual' | 'entity'>('individual');
  const [name, setName] = useState('');
  const [aliases, setAliases] = useState('');
  const [dob, setDob] = useState('');
  const [nat, setNat] = useState('');
  const [docs, setDocs] = useState('');
  const [lists, setLists] = useState<string[]>(LISTS.map((l) => l.code));
  const [th, setTh] = useState({ potential: 60, likely: 80, confirmed: 95 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<ScreeningResult | null>(null);
  const [added, setAdded] = useState(false);

  const split = (s: string) => s.split(/[;\n]/).map((x) => x.trim()).filter(Boolean);

  async function run() {
    setBusy(true); setErr(null); setRes(null); setAdded(false);
    try {
      const r: ScreeningResult = await api.screen({
        kind, name, aliases: split(aliases), dob: dob || undefined, nationality: nat || undefined, documents: split(docs), lists, thresholds: th,
      });
      setRes(r);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  function addToCase() {
    if (!res) return;
    dispatch({ t: 'screening', r: res });
    dispatch({ t: 'findings', f: fromScreening(res) });
    setAdded(true);
  }

  return (
    <div className="space-y-6">
      <ModuleHeader icon="fa-fingerprint" title="ALIAS-AGENT · COTEJO DE LISTAS RESTRICTIVAS" subtitle="Descarga oficial + índice local + fuzzy matching (§2.6)" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Panel title="SUJETO A COTEJAR" icon="fa-user-secret">
            <div className="flex gap-2 mb-4">
              {(['individual', 'entity'] as const).map((k) => (
                <button key={k} onClick={() => setKind(k)}
                  className={`px-3 py-1.5 rounded text-xs border ${kind === k ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'border-gray-700 text-gray-400'}`}>
                  {k === 'individual' ? 'PERSONA FÍSICA' : 'PERSONA MORAL'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={kind === 'individual' ? 'Nombre completo *' : 'Razón social *'} hint="Se admite escritura no latina (árabe, cirílico, chino, hebreo, griego)">
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'individual' ? 'Ej. Viktor Bout' : 'Ej. Banco Ejemplo S.A.'} />
              </Field>
              <Field label={kind === 'individual' ? 'Alias conocidos' : 'Variantes / nombres anteriores'} hint="Separados por ; o salto de línea — se cotejan individualmente (§2.6.4)">
                <textarea className={inputCls} rows={2} value={aliases} onChange={(e) => setAliases(e.target.value)} />
              </Field>
              {kind === 'individual' && (
                <Field label="Fecha de nacimiento" hint="AAAA o AAAA-MM-DD · tolerancia ±5 años">
                  <input className={inputCls} value={dob} onChange={(e) => setDob(e.target.value)} placeholder="1967" />
                </Field>
              )}
              <Field label={kind === 'individual' ? 'Nacionalidad' : 'Jurisdicción'}>
                <input className={inputCls} value={nat} onChange={(e) => setNat(e.target.value)} />
              </Field>
              <Field label={kind === 'individual' ? 'Documentos (pasaporte, ID, RFC, CURP)' : 'Registro fiscal (RFC, EIN, VAT, LEI)'} hint="Separados por ;">
                <input className={inputCls} value={docs} onChange={(e) => setDocs(e.target.value)} />
              </Field>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <Btn onClick={run} disabled={busy || name.trim().length < 2}>{busy ? <><Spinner /> COTEJANDO…</> : <><i className="fas fa-magnifying-glass mr-2"></i>EJECUTAR COTEJO</>}</Btn>
              {busy && <span className="text-xs text-gray-500">La primera consulta descarga e indexa las listas oficiales (puede tardar 20–60 s).</span>}
            </div>
          </Panel>
        </div>

        <Panel title="PARÁMETROS" icon="fa-sliders">
          <p className="text-xs text-gray-500 mb-2">Listas a cotejar</p>
          <div className="space-y-1.5 mb-4">
            {LISTS.map((l) => (
              <label key={l.code} className="flex items-center gap-2 text-xs text-gray-300">
                <input type="checkbox" checked={lists.includes(l.code)} onChange={(e) => setLists(e.target.checked ? [...lists, l.code] : lists.filter((x) => x !== l.code))} />
                {l.label}
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mb-2">Umbrales (calibrables)</p>
          <div className="grid grid-cols-3 gap-2">
            {(['potential', 'likely', 'confirmed'] as const).map((k) => (
              <Field key={k} label={k.toUpperCase()}>
                <input type="number" min={0} max={100} className={inputCls} value={th[k]} onChange={(e) => setTh({ ...th, [k]: Number(e.target.value) })} />
              </Field>
            ))}
          </div>
          <p className="text-[10px] text-gray-600 mt-3">score = (JW·0.5 + Soundex·0.2 + Lev·0.3)·100 · alias good +10 / low +5</p>
        </Panel>
      </div>

      <ErrorBox msg={err} />

      {res && (
        <div className="space-y-6">
          <Panel title="RESULTADO" icon="fa-list-check" right={
            <div className="flex items-center gap-3"><Badge v={res.overall} />
              <Btn onClick={addToCase} disabled={added}>{added ? <><i className="fas fa-check mr-2"></i>AGREGADO</> : <><i className="fas fa-folder-plus mr-2"></i>AGREGAR AL CASO</>}</Btn></div>}>
            <div className="text-xs text-gray-400 mb-3">
              Variantes normalizadas: {res.normalized.map((n) => <code key={n.canonical} className="mx-1 text-cyan-300">{n.canonical}</code>)}
              {res.normalized.some((n) => n.transliteration.length) && <> · Transliteración: {[...new Set(res.normalized.flatMap((n) => n.transliteration))].join(', ')}</>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-gray-500 text-left border-b border-gray-800">
                  <th className="py-2 pr-3">Lista</th><th className="pr-3">Estado</th><th className="pr-3">Registros</th><th className="pr-3">Descarga</th><th className="pr-3">SHA-256</th><th>Resultado</th></tr></thead>
                <tbody>
                  {res.lists.map((l) => (
                    <tr key={l.code} className="border-b border-gray-800/50 align-top">
                      <td className="py-2 pr-3 text-gray-200">{l.name}<div className="text-gray-600">{l.authority}</div></td>
                      <td className="pr-3"><Badge v={l.status} />{l.errors.length > 0 && <div className="text-red-400 mt-1 max-w-xs">{l.errors.join('; ')}</div>}</td>
                      <td className="pr-3 text-gray-300">{l.entities.toLocaleString()}</td>
                      <td className="pr-3 text-gray-400">{l.downloaded_at ?? '—'}</td>
                      <td className="pr-3 text-gray-500 font-mono">{l.sha256 ? l.sha256.slice(0, 16) + '…' : '—'}</td>
                      <td><Badge v={l.status === 'error' ? 'error' : l.result} />{l.best_score != null && <span className="ml-2 text-gray-400">{l.best_score}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title={`COINCIDENCIAS (${res.matches.length})`} icon="fa-crosshairs">
            {!res.matches.length && <p className="text-sm text-gray-400">Sin coincidencias ≥ {res.thresholds.potential} en las listas consultadas.</p>}
            <div className="space-y-3">
              {res.matches.map((m, i) => (
                <div key={i} className="rounded border border-gray-800 bg-[#0a0e17] p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge v={m.classification} />
                    <span className="text-white font-bold text-sm">{m.list_entity_name}</span>
                    <span className="text-gray-500 text-xs">{m.list_matched} #{m.list_entity_id} · {m.entity_type}</span>
                    <span className="ml-auto text-cyan-300 font-bold">{m.score}<span className="text-gray-600">/100</span></span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-400">
                    <div>Alias coincidente: <span className="text-gray-200">{m.alias_detected}</span> [{m.alias_quality}]</div>
                    <div>Variante consultada: <span className="text-gray-200">{m.query_variant}</span> · tipo: {m.match_type}</div>
                    <div>JW {m.components.jaro_winkler} · Soundex {m.components.soundex} · Lev {m.components.levenshtein_norm}</div>
                    <div>Metaphone {m.components.metaphone} · NYSIIS {m.components.nysiis} · base {m.score_base}</div>
                    {m.adjustments.length > 0 && <div className="md:col-span-2">Ajustes: {m.adjustments.map((a) => `${a.reason} (${a.delta > 0 ? '+' : ''}${a.delta})`).join('; ')}</div>}
                    {m.corroboration.length > 0 && <div className="md:col-span-2 text-green-400">Corroboración: {m.corroboration.join('; ')}</div>}
                    {m.programs.length > 0 && <div className="md:col-span-2">Programas: {m.programs.join(', ')}</div>}
                    {(m.dob.length > 0 || m.nationality.length > 0) && <div className="md:col-span-2">DOB: {m.dob.join('; ') || '—'} · Nacionalidad: {m.nationality.join('; ') || '—'}</div>}
                    <div className="md:col-span-2"><a className="text-cyan-400 hover:underline break-all" href={m.source_url} target="_blank" rel="noreferrer">{m.source_url}</a></div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="CLÁUSULA OBLIGATORIA Y LIMITACIONES" icon="fa-scale-balanced">
            <pre className="text-xs text-amber-200/90 whitespace-pre-wrap bg-[#0a0e17] border border-amber-900/30 rounded p-3">{res.clause}</pre>
            <ul className="mt-3 space-y-1 text-[11px] text-gray-500 list-disc pl-5">{res.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
          </Panel>
        </div>
      )}
    </div>
  );
}

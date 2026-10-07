import { useState } from 'react';
import { ingestFile } from '../../lib/evidence';
import { api } from '../../lib/api';
import { useCase } from '../../lib/caseStore';
import { dateChecks, extractEntities, parametricScan, type Extracted, type ParametricHit } from '../../../shared/extract';
import { fromDateIssue, fromEvidence, fromParametric, fromValidation } from '../../../shared/findings';
import { extractIOCs } from '../../../shared/iocs';
import { VALIDATORS, type Validation, type ValidatorKind } from '../../../shared/validators';
import type { Evidence } from '../../../shared/case';
import { Badge, Btn, ErrorBox, inputCls, KV, ModuleHeader, Panel, Spinner } from './ui';

interface Analysis { evidence?: Evidence; source: string; entities: Extracted[]; parametric: ParametricHit[]; dates: { value: string; issue: string }[]; chars: number; text: string }

function ValidationCard({ v }: { v: Validation }) {
  const [reg, setReg] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const canRegistry = v.standard.startsWith('LEI') || v.standard.startsWith('SWIFT');
  async function check() {
    setBusy(true);
    try { setReg(await api.registry(v.standard.startsWith('LEI') ? { lei: v.value } : { bic: v.value })); }
    catch (e: any) { setReg({ error: e.message }); }
    finally { setBusy(false); }
  }
  return (
    <div className="rounded border border-gray-800 bg-[#0a0e17] p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge v={v.valid ? 'ok' : 'error'} />
        <span className="text-xs text-gray-400">{v.standard}</span>
        <code className="text-sm text-white">{v.value}</code>
        {canRegistry && <span className="ml-auto"><Btn kind="ghost" onClick={check} disabled={busy}>{busy ? <Spinner /> : 'VERIFICAR EN GLEIF'}</Btn></span>}
      </div>
      <ul className="mt-2 space-y-0.5">
        {v.checks.map((c) => (
          <li key={c.check} className={`text-[11px] ${c.ok ? 'text-gray-500' : 'text-amber-300'}`}>
            <i className={`fas ${c.ok ? 'fa-check text-green-500' : 'fa-xmark text-amber-400'} mr-2 w-3`}></i>{c.check}{c.detail ? ` — ${c.detail}` : ''}
          </li>
        ))}
      </ul>
      {Object.entries(v.info).length > 0 && <div className="mt-2 text-[11px] text-gray-500">{Object.entries(v.info).map(([k, x]) => <span key={k} className="mr-3">{k}: <span className="text-gray-300">{x}</span></span>)}</div>}
      {reg && (
        <div className="mt-2 text-[11px] border-t border-gray-800 pt-2">
          {reg.error ? <span className="text-red-400">{reg.error}</span> : reg.found ? (
            <div className="text-green-300">
              Registro GLEIF: {(reg.record ? [reg.record] : reg.records).map((r: any) => `${r.legal_name} · LEI ${r.lei} · ${r.status}/${r.registration_status} · ${r.jurisdiction} · ${r.legal_address}`).join(' | ')}
              {reg.note && <div className="text-gray-500">{reg.note}</div>}
            </div>
          ) : <span className="text-amber-300">{reg.note ?? 'Sin registro en GLEIF para el identificador consultado.'}</span>}
        </div>
      )}
    </div>
  );
}

export default function DocModule() {
  const { dispatch } = useCase();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<Analysis[]>([]);
  const [added, setAdded] = useState(false);
  const [qk, setQk] = useState<ValidatorKind>('IBAN');
  const [qv, setQv] = useState('');

  function analyzeText(t: string, source: string, evidence?: Evidence): Analysis {
    return { evidence, source, entities: extractEntities(t), parametric: parametricScan(t), dates: dateChecks(t), chars: t.length, text: t };
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setErr(null); setAdded(false);
    try {
      const out: Analysis[] = [];
      for (const f of Array.from(files)) {
        const { evidence, text: t } = await ingestFile(f);
        const a = analyzeText(t, f.name, evidence);
        out.push(a);
      }
      setResults((r) => [...out, ...r]);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  function onText() {
    if (!text.trim()) return;
    const a = analyzeText(text, 'Texto proporcionado');
    setResults((r) => [a, ...r]);
    setAdded(false);
  }

  function addToCase() {
    for (const a of results) {
      const ev = a.evidence?.name;
      if (a.evidence) { dispatch({ t: 'evidence', e: a.evidence }); dispatch({ t: 'findings', f: fromEvidence(a.evidence) }); }
      const f = [
        ...a.entities.filter((e) => e.validation).flatMap((e) => fromValidation(e.validation!, ev)),
        ...a.parametric.map((p) => fromParametric(p, ev)),
        ...a.dates.map((d) => fromDateIssue(d, ev)),
      ];
      dispatch({ t: 'findings', f });
      dispatch({ t: 'iocs', i: extractIOCs(a.text) });
    }
    dispatch({ t: 'meta', object: results.map((r) => r.source).join(', ') });
    setAdded(true);
  }

  const qr = qv.trim() ? VALIDATORS[qk](qv) : null;

  return (
    <div className="space-y-6">
      <ModuleHeader icon="fa-file-shield" title="DOC-AGENT · PERITAJE DOCUMENTAL" subtitle="Hash SHA-256 · metadatos · NER · validación normativa · cotejo paramétrico" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="EVIDENCIA (ARCHIVOS)" icon="fa-upload">
          <label className="block border-2 border-dashed border-gray-700 hover:border-cyan-600 rounded-lg p-8 text-center cursor-pointer transition-colors">
            <input type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.heic,.txt,.eml,.log,.csv,.json,.xml,.html" />
            {busy ? <Spinner /> : <i className="fas fa-file-arrow-up text-3xl text-gray-600"></i>}
            <p className="text-sm text-gray-300 mt-3">Arrastra o selecciona PDF, imágenes o texto</p>
            <p className="text-[11px] text-gray-600 mt-1">El análisis se ejecuta en tu navegador; los archivos no se envían a ningún servidor.</p>
          </label>
        </Panel>
        <Panel title="EVIDENCIA (TEXTO)" icon="fa-align-left">
          <textarea className={inputCls + ' font-mono text-xs'} rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder="Pega aquí el contenido del instrumento, contrato, comprobante o correo…" />
          <div className="mt-3"><Btn onClick={onText} disabled={!text.trim()}><i className="fas fa-microscope mr-2"></i>ANALIZAR TEXTO</Btn></div>
        </Panel>
      </div>

      <Panel title="VALIDADOR RÁPIDO" icon="fa-check-double">
        <div className="flex gap-2 flex-wrap">
          <select className={inputCls + ' w-32'} value={qk} onChange={(e) => setQk(e.target.value as ValidatorKind)}>
            {Object.keys(VALIDATORS).map((k) => <option key={k}>{k}</option>)}
          </select>
          <input className={inputCls + ' flex-1 min-w-[200px] font-mono'} value={qv} onChange={(e) => setQv(e.target.value)} placeholder="Identificador a validar" />
        </div>
        {qr && <div className="mt-3"><ValidationCard v={qr} /></div>}
      </Panel>

      <ErrorBox msg={err} />

      {results.length > 0 && (
        <div className="flex justify-end gap-3">
          <Btn kind="ghost" onClick={() => { setResults([]); setAdded(false); }}>LIMPIAR</Btn>
          <Btn onClick={addToCase} disabled={added}>{added ? <><i className="fas fa-check mr-2"></i>AGREGADO AL CASO</> : <><i className="fas fa-folder-plus mr-2"></i>AGREGAR HALLAZGOS AL CASO</>}</Btn>
        </div>
      )}

      {results.map((a, i) => (
        <Panel key={i} title={a.source.toUpperCase()} icon="fa-file-lines" right={<span className="text-xs text-gray-500">{a.chars.toLocaleString()} caracteres de texto</span>}>
          {a.evidence && (
            <div className="mb-4">
              <KV k="SHA-256" v={<code className="text-cyan-300">{a.evidence.sha256}</code>} />
              <KV k="Tamaño / tipo" v={`${a.evidence.size.toLocaleString()} bytes · ${a.evidence.type || 'N/D'}`} />
              <KV k="Recepción" v={a.evidence.received_at} />
              {Object.entries(a.evidence.metadata).map(([k, v]) => <KV key={k} k={k} v={v} />)}
            </div>
          )}
          {a.parametric.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-amber-300 mb-2">COTEJO PARAMÉTRICO ({a.parametric.length})</p>
              {a.parametric.map((p) => (
                <div key={p.pattern} className="text-xs text-gray-300 mb-2"><Badge v="RELEVANTE" /> <b>{p.pattern}</b> × {p.occurrences} — <span className="text-gray-500">{p.reference}</span>
                  <div className="text-gray-500 italic mt-0.5">«{p.context[0]}»</div></div>
              ))}
            </div>
          )}
          {a.dates.length > 0 && <div className="mb-4 text-xs">{a.dates.map((d) => <div key={d.value} className="text-amber-300">Fecha {d.value}: {d.issue}</div>)}</div>}
          <p className="text-xs font-bold text-gray-300 mb-2">ENTIDADES EXTRAÍDAS ({a.entities.length})</p>
          <div className="space-y-2">
            {a.entities.filter((e) => e.validation).map((e, j) => <ValidationCard key={j} v={e.validation!} />)}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {a.entities.filter((e) => !e.validation).map((e, j) => (
              <span key={j} className="text-[11px] px-2 py-1 rounded bg-white/5 border border-gray-800 text-gray-300"><span className="text-gray-500">{e.kind}</span> {e.value}</span>
            ))}
          </div>
        </Panel>
      ))}

      <p className="text-[11px] text-gray-600">Limitaciones: OCR no incluido (documentos escaneados sin capa de texto se reportan como tales); validación de sellos/firmas y tipografía fina requieren revisión pericial visual; la existencia de un BIC en el directorio SWIFT se verifica de forma indirecta por mapeo GLEIF BIC↔LEI.</p>
    </div>
  );
}

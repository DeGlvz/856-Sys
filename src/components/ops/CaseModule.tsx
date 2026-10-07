import { useCase } from '../../lib/caseStore';
import { materiality, sortFindings } from '../../../shared/case';
import { Badge, Btn, Field, inputCls, ModuleHeader, Panel } from './ui';

const MODES = ['INTEGRADO', 'DOC', 'OSINT', 'NET', 'CYBER', 'ALIAS', 'NARRATIVE', 'TIMELINE'];

export default function CaseModule({ go }: { go: (tab: string) => void }) {
  const { state: c, dispatch } = useCase();
  const mat = materiality(c);
  const stats = [
    { k: 'Evidencias', v: c.evidence.length, tab: 'doc', icon: 'fa-file-shield' },
    { k: 'Sujetos cotejados', v: c.screenings.length, tab: 'alias', icon: 'fa-fingerprint' },
    { k: 'Objetivos de red', v: c.net.length, tab: 'net', icon: 'fa-network-wired' },
    { k: 'IOCs', v: Object.values(c.iocs).reduce((s, a) => s + a.length, 0), tab: 'cyber', icon: 'fa-bug' },
    { k: 'Eventos timeline', v: c.timeline.length, tab: 'cyber', icon: 'fa-clock' },
    { k: 'Hallazgos', v: c.findings.length, tab: 'dictamen', icon: 'fa-list-check' },
  ];
  return (
    <div className="space-y-6">
      <ModuleHeader icon="fa-folder-open" title={`CASO ${c.id}`} subtitle={`Abierto ${c.created_at}`} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <button key={s.k} onClick={() => go(s.tab)} className="rounded-lg border border-gray-800 bg-[#0d1220] p-4 text-left hover:border-cyan-700 transition-colors">
            <i className={`fas ${s.icon} text-cyan-500`}></i>
            <div className="text-2xl font-bold text-white mt-2">{s.v}</div>
            <div className="text-[11px] text-gray-500">{s.k}</div>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel title="PARÁMETROS DEL CASO" icon="fa-gear">
          <div className="space-y-4">
            <Field label="Modo">
              <select className={inputCls} value={c.mode} onChange={(e) => dispatch({ t: 'meta', mode: e.target.value })}>{MODES.map((m) => <option key={m}>{m}</option>)}</select>
            </Field>
            <Field label="Objeto del análisis" hint="Aparece en la sección 1 del dictamen">
              <textarea className={inputCls} rows={4} value={c.object} onChange={(e) => dispatch({ t: 'meta', object: e.target.value })} placeholder="Qué se analiza y bajo qué parámetros" />
            </Field>
            <div className="flex gap-3">
              <Btn onClick={() => go('dictamen')}><i className="fas fa-file-lines mr-2"></i>VER DICTAMEN</Btn>
              <Btn kind="danger" onClick={() => { if (confirm('¿Cerrar este caso y abrir uno nuevo? Se perderán los datos no exportados.')) dispatch({ t: 'reset' }); }}>NUEVO CASO</Btn>
            </div>
            <p className="text-[10px] text-gray-600">El caso se guarda solo en este navegador. Exporta el dictamen para conservarlo.</p>
          </div>
        </Panel>
        <div className="lg:col-span-2">
          <Panel title="HALLAZGOS" icon="fa-list-check" right={<div className="flex items-center gap-2"><span className="text-xs text-gray-500">Materialidad</span><Badge v={mat.level} /></div>}>
            <p className="text-[11px] text-gray-500 mb-3">{mat.rationale}</p>
            {!c.findings.length && <p className="text-sm text-gray-400">Aún no hay hallazgos. Ejecuta análisis en DOC, ALIAS, NET o CYBER y usa «Agregar al caso».</p>}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {sortFindings(c.findings).map((f, i) => (
                <div key={f.id} className="rounded border border-gray-800 bg-[#0a0e17] p-3 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-600">H{String(i + 1).padStart(2, '0')}</span><Badge v={f.severity} />
                    <span className="text-cyan-500">[{f.domain}]</span><span className="text-gray-200">{f.field}</span>
                    <button className="ml-auto text-gray-600 hover:text-red-400" title="Descartar hallazgo" onClick={() => dispatch({ t: 'removeFinding', id: f.id })}><i className="fas fa-xmark"></i></button>
                  </div>
                  <div className="mt-1 text-gray-400">Observado: {f.observed}</div>
                  <div className="text-gray-500">Esperado: {f.expected} · Confianza {f.confidence}%</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

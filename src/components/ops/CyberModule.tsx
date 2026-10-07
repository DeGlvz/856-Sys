import { useState } from 'react';
import { useCase } from '../../lib/caseStore';
import { analyzeEmailHeaders, buildTimeline, extractIOCs, type EmailHeaderAnalysis, type IOCSet, type TimelineEvent } from '../../../shared/iocs';
import { fromEmail } from '../../../shared/findings';
import { Badge, Btn, inputCls, KV, ModuleHeader, Panel } from './ui';

export default function CyberModule() {
  const { dispatch } = useCase();
  const [logs, setLogs] = useState('');
  const [hdr, setHdr] = useState('');
  const [iocs, setIocs] = useState<IOCSet | null>(null);
  const [tl, setTl] = useState<TimelineEvent[]>([]);
  const [mail, setMail] = useState<EmailHeaderAnalysis | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  function runLogs() {
    setIocs(extractIOCs(logs));
    setTl(buildTimeline(logs, 'log'));
    setAdded(null);
  }
  function addLogs() {
    if (!iocs) return;
    dispatch({ t: 'iocs', i: iocs });
    dispatch({ t: 'timeline', e: tl });
    setAdded('logs');
  }
  function runMail() { setMail(analyzeEmailHeaders(hdr)); setAdded(null); }
  function addMail() {
    if (!mail) return;
    dispatch({ t: 'findings', f: fromEmail(mail) });
    const i = extractIOCs(hdr);
    dispatch({ t: 'iocs', i: { ...i, ipv4: [...new Set([...(mail.origin_ip ? [mail.origin_ip] : []), ...i.ipv4])] } });
    const ev = mail.received.map((r) => ({ ts: r.date ? new Date(r.date).toISOString() : '', event: `Received from ${r.from} by ${r.by}${r.ip ? ' [' + r.ip + ']' : ''}`, source: 'email' }))
      .filter((e) => e.ts && !e.ts.startsWith('Invalid'));
    dispatch({ t: 'timeline', e: ev });
    setAdded('mail');
  }

  return (
    <div className="space-y-6">
      <ModuleHeader icon="fa-user-shield" title="CYBER-AGENT · SEGURIDAD (PASIVO)" subtitle="IOCs · timeline forense · análisis de encabezados de correo" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="LOGS / TEXTO CON IOCs" icon="fa-terminal" right={iocs && <Btn onClick={addLogs} disabled={added === 'logs'}>{added === 'logs' ? 'AGREGADO' : 'AGREGAR AL CASO'}</Btn>}>
          <textarea className={inputCls + ' font-mono text-xs'} rows={10} value={logs} onChange={(e) => setLogs(e.target.value)} placeholder="Pega logs (syslog, Apache/Nginx, JSON, ISO8601), reportes o texto con IOCs. Se admite notación defang: hxxp, [.]" />
          <div className="mt-3"><Btn onClick={runLogs} disabled={!logs.trim()}><i className="fas fa-bug mr-2"></i>EXTRAER IOCs</Btn></div>
          {iocs && (
            <div className="mt-4">
              {(Object.entries(iocs) as [string, string[]][]).map(([k, v]) => <KV key={k} k={`${k} (${v.length})`} v={v.slice(0, 40).join(', ') || '—'} />)}
              <p className="text-xs font-bold text-gray-300 mt-4 mb-2">TIMELINE ({tl.length})</p>
              <div className="max-h-64 overflow-y-auto">
                {tl.slice(0, 200).map((t, i) => <div key={i} className="text-[11px] text-gray-400 py-0.5"><span className="text-cyan-400">{t.ts}</span> {t.event}</div>)}
              </div>
            </div>
          )}
        </Panel>
        <Panel title="ENCABEZADOS DE CORREO" icon="fa-envelope-open-text" right={mail && <Btn onClick={addMail} disabled={added === 'mail'}>{added === 'mail' ? 'AGREGADO' : 'AGREGAR AL CASO'}</Btn>}>
          <textarea className={inputCls + ' font-mono text-xs'} rows={10} value={hdr} onChange={(e) => setHdr(e.target.value)} placeholder="Pega los encabezados completos (Gmail: Mostrar original · Outlook: Ver origen del mensaje)" />
          <div className="mt-3"><Btn onClick={runMail} disabled={!hdr.trim()}><i className="fas fa-envelope-circle-check mr-2"></i>ANALIZAR ENCABEZADOS</Btn></div>
          {mail && (
            <div className="mt-4">
              <KV k="From" v={mail.from} /><KV k="Return-Path" v={mail.return_path} /><KV k="Reply-To" v={mail.reply_to} />
              <KV k="Message-ID" v={mail.message_id} /><KV k="Subject" v={mail.subject} /><KV k="Date" v={mail.date} />
              <KV k="SPF / DKIM / DMARC" v={`${mail.spf ?? 'N/D'} / ${mail.dkim ?? 'N/D'} / ${mail.dmarc ?? 'N/D'}`} />
              <KV k="IP de origen (primer salto público)" v={mail.origin_ip} />
              <p className="text-xs font-bold text-gray-300 mt-4 mb-2">CADENA RECEIVED ({mail.received.length})</p>
              {mail.received.map((r, i) => <div key={i} className="text-[11px] text-gray-400">{i + 1}. {r.from} → {r.by} {r.ip && <span className="text-cyan-400">[{r.ip}]</span>} <span className="text-gray-600">{r.date}</span></div>)}
              <p className="text-xs font-bold text-gray-300 mt-4 mb-2">OBSERVACIONES ({mail.observations.length})</p>
              {mail.observations.map((o, i) => <div key={i} className="text-xs py-1"><Badge v={/SPF|DKIM|DMARC/.test(o.field) ? 'RELEVANTE' : 'MENOR'} /> <span className="ml-2 text-gray-200">{o.field}</span>: {o.observed} <span className="text-gray-600">(esperado: {o.expected})</span></div>)}
              {mail.origin_ip && <p className="text-[11px] text-gray-500 mt-3">Analiza la IP de origen en la pestaña NET para ASN, geolocalización, Tor y listas negras.</p>}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

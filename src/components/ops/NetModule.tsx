import { useState } from 'react';
import { api } from '../../lib/api';
import { useCase } from '../../lib/caseStore';
import { fromNet } from '../../../shared/findings';
import { Badge, Btn, ErrorBox, inputCls, KV, ModuleHeader, Panel, Spinner } from './ui';

const J = ({ v }: { v: any }) => <span>{Array.isArray(v) ? (v.length ? v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ') : '—') : v == null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>;

function IpBlock({ d }: { d: any }) {
  return (
    <div className="rounded border border-gray-800 bg-[#0a0e17] p-3 mb-3">
      <p className="text-sm text-white font-bold mb-2">IP {d.ip}</p>
      <KV k="PTR" v={<J v={d.reverse_dns} />} />
      <KV k="ASN" v={d.asn?.error ? d.asn.error : `${d.asn?.asn ?? ''} ${d.asn?.as_name ?? ''} · ${d.asn?.prefix ?? ''} · ${d.asn?.country ?? ''} · ${d.asn?.registry ?? ''}`} />
      <KV k="RDAP red" v={d.rdap?.error ? d.rdap.error : `${d.rdap?.name ?? ''} · ${d.rdap?.handle ?? ''} · ${d.rdap?.country ?? ''} · ${(d.rdap?.cidr ?? []).join(', ')}`} />
      <KV k="Geolocalización" v={d.geolocation?.error ? d.geolocation.error : `${d.geolocation?.city ?? ''}, ${d.geolocation?.region ?? ''}, ${d.geolocation?.country ?? ''} · ISP ${d.geolocation?.isp ?? ''}`} />
      <KV k="Tor (nodo de salida)" v={d.anonymization?.tor?.error ?? (d.anonymization?.tor?.is_tor_exit ? 'SÍ' : 'No')} />
      <KV k="ASN hosting / VPN" v={`${d.anonymization?.hosting_asn ? 'hosting' : 'no hosting'} · ${d.anonymization?.vpn_keyword_asn ? 'denominación VPN/proxy' : 'sin denominación VPN'} (heurística)`} />
      <KV k="Listas negras (DNSBL)" v={Array.isArray(d.reputation) ? d.reputation.map((r: any) => `${r.list}: ${r.note}`).join(' · ') : d.reputation?.error} />
    </div>
  );
}

export default function NetModule() {
  const { dispatch } = useCase();
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<any>(null);
  const [added, setAdded] = useState(false);

  async function run() {
    setBusy(true); setErr(null); setRes(null); setAdded(false);
    try { setRes(await api.net(target.trim())); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  const findings = res ? fromNet(res.target, res.data) : [];

  function add() {
    dispatch({ t: 'net', n: { target: res.target, kind: res.kind, consulted_at: res.consulted_at, data: res.data, sources: res.sources } });
    dispatch({ t: 'findings', f: findings });
    const d = res.data;
    const ips = res.kind === 'ip' ? [res.target] : (d.dns?.A ?? []);
    dispatch({ t: 'iocs', i: { ipv4: ips, domains: res.kind === 'domain' ? [res.target, ...(d.certificate_transparency?.subdomains ?? []).slice(0, 50)] : [] } });
    const ev: { ts: string; event: string; source: string }[] = [];
    if (d.rdap?.registered) ev.push({ ts: new Date(d.rdap.registered).toISOString(), event: `Registro de dominio ${res.target} (${d.rdap.registrar ?? ''})`, source: 'RDAP' });
    if (d.rdap?.last_changed) ev.push({ ts: new Date(d.rdap.last_changed).toISOString(), event: `Última modificación de registro ${res.target}`, source: 'RDAP' });
    if (d.certificate_transparency?.first_seen) ev.push({ ts: new Date(d.certificate_transparency.first_seen + 'Z').toISOString(), event: `Primer certificado CT emitido para ${res.target}`, source: 'crt.sh' });
    if (d.tls?.valid_from) ev.push({ ts: new Date(d.tls.valid_from).toISOString(), event: `Inicio de vigencia de certificado TLS actual (${d.tls.issuer?.O ?? ''})`, source: 'TLS' });
    dispatch({ t: 'timeline', e: ev.filter((x) => !x.ts.startsWith('Invalid')) });
    setAdded(true);
  }

  const d = res?.data;
  return (
    <div className="space-y-6">
      <ModuleHeader icon="fa-network-wired" title="NET-AGENT · INTELIGENCIA DE RED (PASIVO)" subtitle="DNS · SPF/DKIM/DMARC · RDAP/WHOIS · CT logs · TLS · ASN · Tor · DNSBL" />
      <Panel title="OBJETIVO" icon="fa-crosshairs">
        <form className="flex gap-3 flex-wrap" onSubmit={(e) => { e.preventDefault(); run(); }}>
          <input className={inputCls + ' flex-1 min-w-[240px] font-mono'} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="dominio.com, https://sitio.com/ruta, usuario@dominio.com o IP" />
          <Btn type="submit" disabled={busy || !target.trim()}>{busy ? <><Spinner /> CONSULTANDO…</> : <><i className="fas fa-satellite-dish mr-2"></i>ANALIZAR</>}</Btn>
        </form>
        <p className="text-[11px] text-gray-600 mt-2">Solo reconocimiento pasivo sobre fuentes públicas. Escaneo de puertos, vulnerability scan y pruebas activas requieren autorización escrita (§2.5) y no se ejecutan.</p>
      </Panel>
      <ErrorBox msg={err} />
      {res && (
        <>
          <Panel title={`NO-CONFORMIDADES DETECTADAS (${findings.length})`} icon="fa-list-check" right={
            <Btn onClick={add} disabled={added}>{added ? <><i className="fas fa-check mr-2"></i>AGREGADO</> : <><i className="fas fa-folder-plus mr-2"></i>AGREGAR AL CASO</>}</Btn>}>
            {!findings.length && <p className="text-xs text-gray-400">Sin no-conformidades bajo las reglas declaradas.</p>}
            {findings.map((f) => (
              <div key={f.id} className="text-xs py-1.5 border-b border-gray-800/60"><Badge v={f.severity} /> <span className="text-gray-200 ml-2">{f.field}</span> — <span className="text-gray-400">{f.observed}</span> <span className="text-gray-600">(esperado: {f.expected})</span></div>
            ))}
          </Panel>

          {res.kind === 'ip' ? <Panel title="INTELIGENCIA DE IP" icon="fa-location-crosshairs"><IpBlock d={d} /></Panel> : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Panel title="DNS" icon="fa-sitemap">
                {['A', 'AAAA', 'MX', 'NS', 'TXT', 'CAA'].map((k) => <KV key={k} k={k} v={<J v={k === 'MX' ? (d.dns[k] ?? []).map((m: any) => `${m.priority} ${m.exchange}`) : d.dns[k]} />} />)}
                <KV k="SOA" v={d.dns.SOA ? `${d.dns.SOA.nsname} · ${d.dns.SOA.hostmaster} · serial ${d.dns.SOA.serial}` : '—'} />
              </Panel>
              <Panel title="AUTENTICACIÓN DE CORREO" icon="fa-envelope-circle-check">
                <KV k="SPF" v={<J v={d.email_auth.spf} />} />
                <KV k="Calificador all" v={d.email_auth.spf_all_qualifier ?? '—'} />
                <KV k="DMARC" v={<J v={d.email_auth.dmarc} />} />
                <KV k="Política DMARC" v={d.email_auth.dmarc_policy ?? '—'} />
                <KV k="DKIM (selectores)" v={d.email_auth.dkim_selectors_found.length ? d.email_auth.dkim_selectors_found.map((x: any) => x.selector).join(', ') : 'no encontrados en selectores comunes'} />
              </Panel>
              <Panel title="RDAP / WHOIS" icon="fa-id-card">
                {d.rdap.error ? <p className="text-xs text-red-400">{d.rdap.error}</p> : <>
                  <KV k="Registrador" v={`${d.rdap.registrar ?? '—'}${d.rdap.registrar_iana_id ? ' (IANA ' + d.rdap.registrar_iana_id + ')' : ''}`} />
                  <KV k="Registro" v={d.rdap.registered} /><KV k="Antigüedad" v={d.rdap.age_days != null ? `${d.rdap.age_days} días` : '—'} />
                  <KV k="Expiración" v={d.rdap.expires} /><KV k="Última modificación" v={d.rdap.last_changed} />
                  <KV k="Estado" v={<J v={d.rdap.status} />} /><KV k="Nameservers" v={<J v={d.rdap.nameservers} />} />
                  <KV k="DNSSEC" v={String(d.rdap.dnssec)} /><KV k="Titular" v={<J v={(d.rdap.registrant ?? []).map((r: any) => r.name || r.handle)} />} />
                  <KV k="Fuente" v={<a className="text-cyan-400" href={d.rdap.url} target="_blank" rel="noreferrer">{d.rdap.url}</a>} />
                </>}
              </Panel>
              <Panel title="CERTIFICADOS (TLS + CT LOGS)" icon="fa-certificate">
                {d.tls.error ? <KV k="TLS" v={d.tls.error} /> : <>
                  <KV k="Sujeto" v={d.tls.subject?.CN} /><KV k="Emisor" v={`${d.tls.issuer?.O ?? ''} ${d.tls.issuer?.CN ?? ''}`} />
                  <KV k="Vigencia" v={`${d.tls.valid_from} → ${d.tls.valid_to} (${d.tls.days_to_expiry} días)`} />
                  <KV k="Cadena confiable" v={d.tls.chain_trusted ? 'sí' : `no — ${d.tls.chain_error}`} />
                  <KV k="Protocolo / cifrado" v={`${d.tls.protocol} · ${d.tls.cipher}`} />
                  <KV k="SAN" v={d.tls.san} /><KV k="SHA-256" v={d.tls.fingerprint256} />
                </>}
                {d.certificate_transparency.error ? <KV k="CT logs" v={d.certificate_transparency.error} /> : <>
                  <KV k="Certificados en CT" v={d.certificate_transparency.certificates} />
                  <KV k="Primer / último" v={`${d.certificate_transparency.first_seen} / ${d.certificate_transparency.last_seen}`} />
                  <KV k="Subdominios" v={`${d.certificate_transparency.subdomains.length}: ${d.certificate_transparency.subdomains.slice(0, 30).join(', ')}`} />
                </>}
              </Panel>
              <Panel title="HTTP / TECH STACK" icon="fa-code">
                {d.http.error ? <p className="text-xs text-red-400">{d.http.error}</p> : <>
                  <KV k="URL final" v={d.http.final_url} /><KV k="Redirecciones" v={d.http.redirect_chain.map((r: any) => `${r.status} ${r.url}`).join(' → ')} />
                  <KV k="Server / X-Powered-By" v={`${d.http.server ?? '—'} / ${d.http.powered_by ?? '—'}`} />
                  <KV k="Generator" v={d.http.generator} /><KV k="Tecnologías" v={<J v={d.http.tech_stack} />} />
                  {d.http.security_headers.map((h: any) => <KV key={h.header} k={h.header} v={h.present ? <span className="text-green-400">{String(h.value).slice(0, 120)}</span> : <span className="text-amber-300">ausente</span>} />)}
                </>}
              </Panel>
              <Panel title="INFRAESTRUCTURA IP" icon="fa-server">
                {d.ips.length ? d.ips.map((ip: any) => <IpBlock key={ip.ip} d={ip} />) : <p className="text-xs text-gray-500">Sin direcciones A públicas.</p>}
              </Panel>
            </div>
          )}
          <p className="text-[11px] text-gray-600">Consulta: {res.consulted_at} · Fuentes: {res.sources.map((s: any) => s.source).join(' · ')}</p>
        </>
      )}
    </div>
  );
}

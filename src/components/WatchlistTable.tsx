const watchlists = [
  { name: 'OFAC SDN', authority: 'U.S. Treasury', coverage: 'Sanciones EE.UU.', alias: 'Fuzzy+Soundex+JW', format: 'XML, CSV' },
  { name: 'OFAC Consolidated', authority: 'U.S. Treasury', coverage: 'No-SDN', alias: 'Fuzzy+Soundex+JW', format: 'XML, CSV' },
  { name: 'UN Consolidated', authority: 'Consejo Seg. ONU', coverage: 'Sanciones global', alias: 'Alias buena/baja', format: 'XML, HTML' },
  { name: 'EU Consolidated', authority: 'Unión Europea', coverage: 'Sanciones UE', alias: 'Alias por país', format: 'XML, CSV' },
  { name: 'Interpol Red Notices', authority: 'Interpol', coverage: 'Búsqueda intl.', alias: 'Campo aliases', format: 'HTML*' },
  { name: 'Interpol-UN Special', authority: 'Interpol + ONU', coverage: 'Terrorismo/ONU', alias: '>700 notificaciones', format: 'HTML*' },
  { name: 'FBI Most Wanted', authority: 'FBI', coverage: 'EE.UU.', alias: 'Campo aliases', format: 'JSON' },
  { name: 'Europol Wanted', authority: 'Europol', coverage: 'UE', alias: '—', format: 'HTML*' },
  { name: 'Lista Personas Bloqueadas', authority: 'SHCP/UIF México', coverage: 'Sector fin. MX', alias: 'Art. 95 Bis LGOAAC', format: 'HTML/PDF' },
  { name: 'UK Sanctions (OFSI)', authority: 'UK Treasury', coverage: 'Reino Unido', alias: '—', format: 'CSV, XML' },
  { name: 'DFAT Consolidated', authority: 'Australia', coverage: 'Sanciones AU', alias: '—', format: 'HTML/CSV' },
  { name: 'OSFI', authority: 'Canadá', coverage: 'Sanciones CA', alias: '—', format: 'CSV, XML' },
];

const additionalLists = [
  { name: 'PEPs (Dow Jones, Refinitiv)', type: 'Exposición política' },
  { name: 'SEC Litigation Releases', type: 'Regulatoria EE.UU.' },
  { name: 'CFTC Enforcement Actions', type: 'Regulatoria EE.UU.' },
  { name: 'FCA Warning List', type: 'Regulatoria UK' },
  { name: 'CNBV Sanciones', type: 'Regulatoria MX' },
  { name: 'UIF México Alertas', type: 'Inteligencia financiera MX' },
];

export default function WatchlistTable() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <i className="fas fa-globe text-cyan-500"></i>
        <h2 className="text-lg font-bold text-white tracking-wider">LISTAS RESTRICTIVAS GLOBALES</h2>
        <span className="text-xs text-gray-500 ml-2">12+ listas · Cotejo por descarga + indexación local</span>
      </div>

      {/* Main Table */}
      <div className="rounded-lg border border-gray-800 bg-[#0d1220] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 bg-black/30">
                <th className="text-left p-3 text-cyan-400 font-bold uppercase tracking-wider">Lista</th>
                <th className="text-left p-3 text-cyan-400 font-bold uppercase tracking-wider">Autoridad</th>
                <th className="text-left p-3 text-cyan-400 font-bold uppercase tracking-wider">Cobertura</th>
                <th className="text-left p-3 text-cyan-400 font-bold uppercase tracking-wider">Soporte Alias</th>
                <th className="text-left p-3 text-cyan-400 font-bold uppercase tracking-wider">Formato</th>
              </tr>
            </thead>
            <tbody>
              {watchlists.map((list, idx) => (
                <tr key={idx} className="border-b border-gray-800/50 hover:bg-white/[0.02] transition-colors">
                  <td className="p-3 text-white font-medium">{list.name}</td>
                  <td className="p-3 text-gray-400">{list.authority}</td>
                  <td className="p-3 text-gray-400">{list.coverage}</td>
                  <td className="p-3 text-gray-400">{list.alias}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-[10px]">{list.format}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Additional Lists */}
      <div className="rounded-lg border border-amber-900/30 bg-[#0d1220] p-6">
        <h3 className="text-sm font-bold text-amber-400 mb-4 flex items-center gap-2">
          <i className="fas fa-plus-circle"></i>
          LISTAS ADICIONALES v3.1 — Fraude, PEP y Regulatorias
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {additionalLists.map((list, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded border border-gray-800 bg-black/20">
              <i className="fas fa-database text-amber-500/60 text-sm"></i>
              <div>
                <p className="text-xs text-white font-medium">{list.name}</p>
                <p className="text-[10px] text-gray-500">{list.type}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Layer Notice */}
      <div className="rounded-lg border border-red-900/30 bg-red-500/5 p-4">
        <div className="flex items-start gap-3">
          <i className="fas fa-exclamation-triangle text-red-400 mt-0.5"></i>
          <div>
            <p className="text-xs text-red-300 font-bold mb-1">CAPA OPERATIVA DE DATOS</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              NO existe API pública en tiempo real para OFAC, UN, EU ni Interpol. 
              El cotejo se ejecuta por descarga + indexación local + fuzzy matching + refresco periódico.
              Interpol y Europol no ofrecen bulk data; el acceso es por scraping, sujeto a rate limiting.
            </p>
          </div>
        </div>
      </div>

      {/* Match Attributes */}
      <div className="rounded-lg border border-gray-800 bg-[#0d1220] p-6">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <i className="fas fa-table text-cyan-400"></i>
          ATRIBUTOS POR MATCH
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {[
            ['subject_name', 'Nombre canónico analizado'],
            ['alias_detected', 'Alias que genera coincidencia'],
            ['alias_quality', 'Buena / baja / sin clasificar (ONU)'],
            ['list_matched', 'Lista restrictiva específica'],
            ['list_authority', 'Autoridad emisora'],
            ['match_type', 'Exacto / fonético / fuzzy / transliteración'],
            ['score', '0–100'],
            ['confidence', '% de confianza del analista'],
            ['source_url', 'URL o identificador de la lista'],
            ['source_version', 'Versión declarada por la autoridad'],
            ['dataset_sha256', 'SHA-256 del dataset descargado'],
            ['consulted_at', 'Timestamp ISO8601'],
          ].map(([field, desc], idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded bg-black/20">
              <code className="text-cyan-400 text-[10px] font-bold">{field}</code>
              <span className="text-gray-500">→</span>
              <span className="text-gray-400">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const workflows = [
  {
    trigger: 'Documento sospechoso',
    flow: ['DOC', 'ALIAS-AGENT', 'OSINT', 'NET'],
    icon: 'fa-file-invoice'
  },
  {
    trigger: 'Entidad/plataforma',
    flow: ['ALIAS-AGENT', 'OSINT', 'NET', 'CYBER(pasivo)'],
    icon: 'fa-building'
  },
  {
    trigger: 'Incidente',
    flow: ['CYBER(logs/IOCs)', 'NET(IPs)', 'OSINT', 'ALIAS-AGENT'],
    icon: 'fa-bug'
  },
  {
    trigger: 'Narrativa',
    flow: ['NARRATIVE', 'OSINT', 'ALIAS-AGENT', 'NET'],
    icon: 'fa-comments'
  },
  {
    trigger: 'Persona física/moral',
    flow: ['ALIAS-AGENT', 'OSINT', 'NET', 'CYBER(pasivo)'],
    icon: 'fa-user'
  },
  {
    trigger: 'Documento + entidad',
    flow: ['DOC', 'ALIAS-AGENT', 'OSINT', 'NET', 'CYBER(pasivo)'],
    icon: 'fa-layer-group'
  }
];

const agentColors: Record<string, string> = {
  'DOC': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'ALIAS-AGENT': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'OSINT': 'bg-green-500/20 text-green-400 border-green-500/30',
  'NET': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'CYBER(pasivo)': 'bg-red-500/20 text-red-400 border-red-500/30',
  'CYBER(logs/IOCs)': 'bg-red-500/20 text-red-400 border-red-500/30',
  'NET(IPs)': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'NARRATIVE': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

export default function WorkflowPanel() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <i className="fas fa-route text-cyan-500"></i>
        <h2 className="text-lg font-bold text-white tracking-wider">FLUJOS DE ORQUESTACIÓN</h2>
        <span className="text-xs text-gray-500 ml-2">Ejecución en un solo paso de razonamiento</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map((wf, idx) => (
          <div key={idx} className="rounded-lg border border-gray-800 bg-[#0d1220] p-4">
            <div className="flex items-center gap-2 mb-3">
              <i className={`fas ${wf.icon} text-amber-400 text-sm`}></i>
              <span className="text-xs font-bold text-white uppercase tracking-wider">{wf.trigger}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {wf.flow.map((step, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold border ${agentColors[step] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                    {step}
                  </span>
                  {i < wf.flow.length - 1 && (
                    <i className="fas fa-chevron-right text-gray-600 text-[8px]"></i>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

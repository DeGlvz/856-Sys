import { useState } from 'react';

interface Agent {
  id: string;
  name: string;
  role: string;
  icon: string;
  color: string;
  borderColor: string;
  description: string;
  capabilities: string[];
}

const agents: Agent[] = [
  {
    id: 'ffi-master',
    name: 'FFI-MASTER',
    role: 'Orquestador Central',
    icon: 'fa-crown',
    color: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-500/30',
    description: 'Coordina sub-agentes en un solo paso de razonamiento. Selecciona modos según evidencia de entrada. Sintetiza dictamen integrado con materialidad técnica.',
    capabilities: ['Coordinación multi-agente', 'Selección de modos', 'SHA-256 cadena de custodia', 'Materialidad: SUSTANCIAL/RELEVANTE/MENOR']
  },
  {
    id: 'doc-agent',
    name: 'DOC-AGENT',
    role: 'Peritaje Documental',
    icon: 'fa-file-invoice',
    color: 'from-blue-500 to-indigo-600',
    borderColor: 'border-blue-500/30',
    description: 'Metadatos/EXIF, OCR, NER, validación normativa (SWIFT, IBAN, ISIN, LEI), consistencia aritmética y cotejo paramétrico.',
    capabilities: ['EXIF/Metadatos', 'OCR + NER', 'ISO 9362/13616/6166/17442', 'TVM-LSM666, OITC, ASBLP']
  },
  {
    id: 'deep-agent',
    name: 'DEEP-AGENT',
    role: 'OSINT',
    icon: 'fa-magnifying-glass',
    color: 'from-green-500 to-emerald-600',
    borderColor: 'border-green-500/30',
    description: 'Verificación de existencia legal, UBO, licencias regulatorias (FCA, SEC, FINRA, CNBV), detección de shell companies.',
    capabilities: ['Registros mercantiles', 'UBO/Directores', 'Licencias regulatorias', 'Cross-referencing multi-fuente']
  },
  {
    id: 'net-agent',
    name: 'NET-AGENT',
    role: 'Inteligencia de Red',
    icon: 'fa-network-wired',
    color: 'from-purple-500 to-violet-600',
    borderColor: 'border-purple-500/30',
    description: 'Geolocalización IP, WHOIS/DNS, certificados SSL/TLS, tech stack, reputación y listas negras.',
    capabilities: ['Geolocalización IP/ASN', 'WHOIS/DNS/CT Logs', 'SPF/DKIM/DMARC', 'Spamhaus/AbuseIPDB']
  },
  {
    id: 'cyber-agent',
    name: 'CYBER-AGENT',
    role: 'Seguridad Ética',
    icon: 'fa-lock',
    color: 'from-red-500 to-rose-600',
    borderColor: 'border-red-500/30',
    description: 'Recon pasivo (siempre) y activo (con autorización). Extracción de IOCs, timeline forense, auditoría SSL.',
    capabilities: ['Shodan/Censys pasivo', 'Extracción IOCs', 'Timeline forense', 'Pentest con autorización']
  },
  {
    id: 'alias-agent',
    name: 'ALIAS-AGENT',
    role: 'Alias & Watchlist',
    icon: 'fa-fingerprint',
    color: 'from-cyan-500 to-teal-600',
    borderColor: 'border-cyan-500/30',
    description: 'Resolución de alias y cotejo contra listas restrictivas globales. Transliteración, fuzzy matching, scoring calibrable.',
    capabilities: ['Jaro-Winkler + Soundex', 'ISO 233/ALA-LC/BGN-PCGN', '12+ listas restrictivas', 'Score 0-100 calibrable']
  },
  {
    id: 'narrative-agent',
    name: 'NARRATIVE-AGENT',
    role: 'Análisis de Discurso',
    icon: 'fa-comments',
    color: 'from-pink-500 to-fuchsia-600',
    borderColor: 'border-pink-500/30',
    description: 'Evolución temporal de narrativas, detección de desinformación, correlación discurso público ↔ estructura societaria.',
    capabilities: ['Evolución narrativa', 'Detección desinformación', 'Correlación discurso-entidad', 'Redes de influencia']
  },
  {
    id: 'timeline-agent',
    name: 'TIMELINE-AGENT',
    role: 'Correlación Temporal',
    icon: 'fa-timeline',
    color: 'from-slate-400 to-gray-600',
    borderColor: 'border-slate-500/30',
    description: 'Línea de tiempo unificada (documento + red + OSINT + watchlist). Detección de inconsistencias temporales.',
    capabilities: ['Timeline unificada', 'Inconsistencias temporales', 'Ventanas de actividad', 'Patrones de periodicidad']
  }
];

export default function AgentGrid({ expanded = false }: { expanded?: boolean }) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <i className="fas fa-microchip text-cyan-500"></i>
        <h2 className="text-lg font-bold text-white tracking-wider">ARQUITECTURA DE AGENTES</h2>
        <span className="text-xs text-gray-500 ml-2">8 agentes · 1 hilo de razonamiento</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
            className={`relative rounded-lg border ${agent.borderColor} bg-[#0d1220] p-4 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${
              selectedAgent === agent.id ? 'ring-1 ring-cyan-500/50 shadow-lg' : ''
            }`}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center flex-shrink-0`}>
                <i className={`fas ${agent.icon} text-white text-sm`}></i>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{agent.name}</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{agent.role}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed mb-3">{agent.description}</p>
            {selectedAgent === agent.id && (
              <div className="border-t border-gray-800 pt-3 mt-3">
                <p className="text-[10px] text-cyan-400 uppercase tracking-wider mb-2 font-bold">Capacidades</p>
                <ul className="space-y-1">
                  {agent.capabilities.map((cap, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-center gap-2">
                      <i className="fas fa-check text-green-500 text-[8px]"></i>
                      {cap}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="absolute top-2 right-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';

export default function InvocationPanel() {
  const [formData, setFormData] = useState({
    mode: 'INTEGRADO',
    evidenceType: 'documento',
    subjectName: '',
    aliases: '',
    dob: '',
    nationality: '',
    documents: '',
    entityName: '',
    entityVariants: '',
    jurisdiction: '',
    taxId: ''
  });

  const modes = ['DOC', 'OSINT', 'NET', 'CYBER', 'ALIAS', 'NARRATIVE', 'TIMELINE', 'INTEGRADO'];
  const evidenceTypes = ['documento', 'entidad', 'IP/dominio', 'logs', 'persona física/moral'];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <i className="fas fa-terminal text-cyan-500"></i>
        <h2 className="text-lg font-bold text-white tracking-wider">INVOCACIÓN DEL SISTEMA</h2>
        <span className="text-xs text-gray-500 ml-2">856-FFCI v3.1 — Sistema listo</span>
      </div>

      {/* System Status */}
      <div className="rounded-lg border border-green-900/30 bg-green-500/5 p-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
          <p className="text-sm text-green-400 font-bold">856 - FFCI — Sistema listo. v3.1</p>
        </div>
        <p className="text-xs text-gray-400 mt-2 ml-6">
          Modo: [{formData.mode}] · Evidencia: [{formData.evidenceType}]
        </p>
      </div>

      {/* Invocation Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mode & Evidence */}
        <div className="rounded-lg border border-gray-800 bg-[#0d1220] p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <i className="fas fa-cog text-cyan-400"></i>
            CONFIGURACIÓN
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Modo</label>
              <div className="flex flex-wrap gap-2">
                {modes.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFormData({...formData, mode})}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                      formData.mode === mode
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                        : 'bg-gray-800/50 text-gray-500 border border-gray-700 hover:text-gray-300'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Tipo de Evidencia</label>
              <div className="flex flex-wrap gap-2">
                {evidenceTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setFormData({...formData, evidenceType: type})}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                      formData.evidenceType === type
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                        : 'bg-gray-800/50 text-gray-500 border border-gray-700 hover:text-gray-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Subject Info */}
        <div className="rounded-lg border border-gray-800 bg-[#0d1220] p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <i className="fas fa-user text-cyan-400"></i>
            SUJETO A COTEJAR
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Persona Física</label>
              <input
                type="text"
                placeholder="Nombre(s) completo(s)"
                value={formData.subjectName}
                onChange={(e) => setFormData({...formData, subjectName: e.target.value})}
                className="w-full bg-black/30 border border-gray-700 rounded px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none"
              />
            </div>
            <input
              type="text"
              placeholder="Alias conocidos (separados por coma)"
              value={formData.aliases}
              onChange={(e) => setFormData({...formData, aliases: e.target.value})}
              className="w-full bg-black/30 border border-gray-700 rounded px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Fecha nacimiento"
                value={formData.dob}
                onChange={(e) => setFormData({...formData, dob: e.target.value})}
                className="w-full bg-black/30 border border-gray-700 rounded px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Nacionalidad"
                value={formData.nationality}
                onChange={(e) => setFormData({...formData, nationality: e.target.value})}
                className="w-full bg-black/30 border border-gray-700 rounded px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none"
              />
            </div>
            <input
              type="text"
              placeholder="Documentos (pasaporte, ID, RFC, CURP)"
              value={formData.documents}
              onChange={(e) => setFormData({...formData, documents: e.target.value})}
              className="w-full bg-black/30 border border-gray-700 rounded px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Entity Info */}
        <div className="rounded-lg border border-gray-800 bg-[#0d1220] p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <i className="fas fa-building text-cyan-400"></i>
            PERSONA MORAL (opcional)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Razón social"
              value={formData.entityName}
              onChange={(e) => setFormData({...formData, entityName: e.target.value})}
              className="w-full bg-black/30 border border-gray-700 rounded px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Variantes / nombres anteriores"
              value={formData.entityVariants}
              onChange={(e) => setFormData({...formData, entityVariants: e.target.value})}
              className="w-full bg-black/30 border border-gray-700 rounded px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Jurisdicción"
              value={formData.jurisdiction}
              onChange={(e) => setFormData({...formData, jurisdiction: e.target.value})}
              className="w-full bg-black/30 border border-gray-700 rounded px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Registro fiscal (RFC, EIN, VAT, LEI)"
              value={formData.taxId}
              onChange={(e) => setFormData({...formData, taxId: e.target.value})}
              className="w-full bg-black/30 border border-gray-700 rounded px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Generated Invocation */}
      <div className="rounded-lg border border-cyan-900/30 bg-[#0d1220] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-gray-800">
          <span className="text-[10px] text-cyan-400 font-bold">INVOCACIÓN GENERADA</span>
          <span className="text-[10px] text-gray-500">texto plano</span>
        </div>
        <pre className="p-4 text-xs text-gray-300 font-mono overflow-x-auto">
{`856 - FFCI — Sistema listo. v3.1

Modo: [${formData.mode}]
Evidencia de entrada: [${formData.evidenceType}]

Sujeto(s) a cotejar en listas restrictivas:
  - Persona física:
      Nombre(s): ${formData.subjectName || '[pendiente]'}
      Alias conocidos: ${formData.aliases || '[pendiente]'}
      Fecha de nacimiento: ${formData.dob || '[pendiente]'}
      Nacionalidad: ${formData.nationality || '[pendiente]'}
      Documentos: ${formData.documents || '[pendiente]'}
  - Persona moral:
      Razón social: ${formData.entityName || '[pendiente]'}
      Variantes: ${formData.entityVariants || '[pendiente]'}
      Jurisdicción: ${formData.jurisdiction || '[pendiente]'}
      Registro fiscal: ${formData.taxId || '[pendiente]'}

¿Qué evidencia se analiza?`}
        </pre>
      </div>

      {/* Ethical Commitment */}
      <div className="rounded-lg border border-gray-800 bg-[#0d1220] p-5">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <i className="fas fa-gavel text-amber-400"></i>
          COMPROMISO ÉTICO Y LEGAL
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-400">
          <div className="flex items-start gap-2">
            <i className="fas fa-check text-green-500 text-[8px] mt-1"></i>
            <span>Actividades activas requieren autorización explícita documentada</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="fas fa-check text-green-500 text-[8px] mt-1"></i>
            <span>Diseñado para investigación legítima de fraudes</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="fas fa-check text-green-500 text-[8px] mt-1"></i>
            <span>Reconocimiento pasivo y análisis de logs: siempre permitidos</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="fas fa-check text-green-500 text-[8px] mt-1"></i>
            <span>Búsqueda de alias en listas públicas: siempre permitida</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="fas fa-check text-green-500 text-[8px] mt-1"></i>
            <span>Cadena de custodia digital: SHA-256 + timestamp ISO8601</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="fas fa-check text-green-500 text-[8px] mt-1"></i>
            <span>Calificación jurídica corresponde al receptor del dictamen</span>
          </div>
        </div>
      </div>
    </div>
  );
}

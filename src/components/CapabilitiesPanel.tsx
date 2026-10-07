const capabilities = [
  {
    category: 'Documental',
    icon: 'fa-file-invoice',
    color: 'text-blue-400',
    items: [
      'Detección de documentos financieros no conformes',
      'Validación normativa multi-estándar (ISO 9362/13616/6166/17442)',
      'Análisis EXIF/OCR/NER con extracción de alias',
      'Consistencia aritmética y cotejo paramétrico'
    ]
  },
  {
    category: 'Alias & Watchlist',
    icon: 'fa-fingerprint',
    color: 'text-cyan-400',
    items: [
      'Búsqueda sistemática en 12+ listas restrictivas globales',
      'Clasificación ONU: buena/baja calidad (+10/+5)',
      'Scoring: Jaro-Winkler + Soundex + Metaphone + NYSIIS + Levenshtein',
      'Transliteración: ISO 233, ALA-LC, BGN/PCGN, Pinyin'
    ]
  },
  {
    category: 'OSINT',
    icon: 'fa-magnifying-glass',
    color: 'text-green-400',
    items: [
      'Mapeo de redes de entidades y UBO',
      'Cross-referencing multi-fuente',
      'Licencias regulatorias (FCA, SEC, FINRA, CNBV, BaFin)',
      'Detección de shell companies y estructuras opacas'
    ]
  },
  {
    category: 'Red & Seguridad',
    icon: 'fa-network-wired',
    color: 'text-purple-400',
    items: [
      'Validación de infraestructura (DNS/WHOIS/SSL/ASN)',
      'Extracción de IOCs con cadena de custodia',
      'Recon pasivo siempre / activo con autorización',
      'Timeline forense unificado multi-fuente'
    ]
  },
  {
    category: 'Narrativa & Temporal',
    icon: 'fa-timeline',
    color: 'text-pink-400',
    items: [
      'Análisis de desinformación y evolución de narrativas',
      'Correlación discurso público ↔ estructura societaria',
      'Detección de inconsistencias temporales',
      'Ventanas de actividad y patrones de periodicidad'
    ]
  },
  {
    category: 'Ética & Custodia',
    icon: 'fa-shield-halved',
    color: 'text-amber-400',
    items: [
      'Cadena de custodia digital: SHA-256 + timestamp ISO8601',
      'Cláusula obligatoria de no-determinación',
      'Custodia del dataset: hash + timestamp + versión',
      'Calificación jurídica exclusivamente al receptor'
    ]
  }
];

export default function CapabilitiesPanel() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <i className="fas fa-bolt text-cyan-500"></i>
        <h2 className="text-lg font-bold text-white tracking-wider">CAPACIDADES CLAVE v3.1</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {capabilities.map((cap, idx) => (
          <div key={idx} className="rounded-lg border border-gray-800 bg-[#0d1220] p-5">
            <div className="flex items-center gap-2 mb-4">
              <i className={`fas ${cap.icon} ${cap.color}`}></i>
              <h3 className="text-sm font-bold text-white">{cap.category}</h3>
            </div>
            <ul className="space-y-2">
              {cap.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                  <i className="fas fa-chevron-right text-gray-600 text-[8px] mt-1 flex-shrink-0"></i>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Technical Limitations */}
      <div className="mt-8 rounded-lg border border-amber-900/30 bg-amber-500/5 p-6">
        <h3 className="text-sm font-bold text-amber-400 mb-4 flex items-center gap-2">
          <i className="fas fa-exclamation-triangle"></i>
          LIMITACIONES TÉCNICAS DECLARABLES
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            'No existe API pública en tiempo real para OFAC/UN/EU/Interpol',
            'Interpol Red Notices no ofrece bulk data; acceso por scraping sujeto a rate limiting',
            'OFAC no publica clasificación de calidad de alias; UN sí',
            'Umbrales 60/80/95 requieren calibración con test set etiquetado',
            'Transliteración no-latina requiere capa ISO 233/ALA-LC/BGN-PCGN/Pinyin',
            'Servicios comerciales (Dow Jones, Refinitiv) no forman parte de v3.1'
          ].map((limitation, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
              <span className="text-amber-500 font-bold">{i + 1}.</span>
              <span>{limitation}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const pipelineSteps = [
  {
    step: 1,
    title: 'Normalización',
    desc: 'Unicode NFC, lowercase, strip diacríticos, remoción de títulos',
    icon: 'fa-text-slash'
  },
  {
    step: 2,
    title: 'Tokenización',
    desc: 'Split por espacios, guiones, comas',
    icon: 'fa-scissors'
  },
  {
    step: 3,
    title: 'Transliteración',
    desc: 'ISO 233 (árabe), ALA-LC, BGN/PCGN, Pinyin (chino)',
    icon: 'fa-language'
  },
  {
    step: 4,
    title: 'Variantes',
    desc: 'Soundex, Metaphone, NYSIIS generation',
    icon: 'fa-code-branch'
  },
  {
    step: 5,
    title: 'Cotejo',
    desc: 'OFAC SDN, UN, EU, Interpol, FBI, LPB, OFSI, DFAT, OSFI, PEP, SEC, CFTC, FCA, CNBV, UIF',
    icon: 'fa-magnifying-glass-chart'
  },
  {
    step: 6,
    title: 'Scoring',
    desc: 'Jaro-Winkler + Soundex + Metaphone + NYSIIS + Levenshtein → 0–100',
    icon: 'fa-chart-line'
  },
  {
    step: 7,
    title: 'Ajuste Alias',
    desc: 'Good quality: +10 | Low quality: +5 | Sin clasificar: +0',
    icon: 'fa-sliders'
  },
  {
    step: 8,
    title: 'Clasificación',
    desc: 'CLEAR / POTENTIAL / LIKELY / CONFIRMED',
    icon: 'fa-tags'
  },
  {
    step: 9,
    title: 'Reporte',
    desc: 'Alias · Lista · Score · Fuente · Fecha descarga · SHA-256 dataset',
    icon: 'fa-file-export'
  }
];

const scoringFormula = `score = (JW * 0.5 + Soundex_match * 0.2 + Lev_norm * 0.3) * 100

donde:
  JW            = jaro_winkler_similarity(name_a, name_b)    [0-1]
  Soundex_match = 1.0 si soundex(a) == soundex(b), else 0.0
  Lev_norm      = 1.0 - (levenshtein_distance / max_len)`;

const classifications = [
  { label: 'CLEAR', range: 'Sin coincidencia', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
  { label: 'POTENTIAL MATCH', range: 'Score 60–79', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  { label: 'LIKELY MATCH', range: 'Score 80–94', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  { label: 'CONFIRMED MATCH', range: 'Score ≥95', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
];

export default function AliasPipeline() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <i className="fas fa-fingerprint text-cyan-500"></i>
        <h2 className="text-lg font-bold text-white tracking-wider">PIPELINE DE RESOLUCIÓN DE ALIAS</h2>
      </div>

      {/* Pipeline Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {pipelineSteps.map((step) => (
          <div key={step.step} className="relative rounded-lg border border-cyan-900/30 bg-[#0d1220] p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                <span className="text-xs font-bold text-cyan-400">{step.step}</span>
              </div>
              <div className="flex items-center gap-2">
                <i className={`fas ${step.icon} text-cyan-500 text-sm`}></i>
                <span className="text-sm font-bold text-white">{step.title}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
            {step.step < 9 && (
              <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                <i className="fas fa-chevron-right text-cyan-800 text-xs"></i>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Scoring Formula */}
      <div className="rounded-lg border border-purple-900/30 bg-[#0d1220] p-6">
        <h3 className="text-sm font-bold text-purple-400 mb-4 flex items-center gap-2">
          <i className="fas fa-calculator"></i>
          FÓRMULA DE SCORING (calibrable)
        </h3>
        <pre className="text-xs text-gray-300 bg-black/30 rounded p-4 overflow-x-auto font-mono">
          {scoringFormula}
        </pre>
      </div>

      {/* Classifications */}
      <div className="rounded-lg border border-gray-800 bg-[#0d1220] p-6">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <i className="fas fa-tags text-amber-400"></i>
          CLASIFICACIÓN DE RESULTADO
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {classifications.map((cls) => (
            <div key={cls.label} className={`rounded-lg border ${cls.bg} p-3 text-center`}>
              <p className={`text-sm font-bold ${cls.color}`}>{cls.label}</p>
              <p className="text-[10px] text-gray-500 mt-1">{cls.range}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-600 mt-4 italic">
          * Umbrales 60/80/95 son INICIALES y CALIBRABLES. Requieren test set etiquetado para producción.
        </p>
      </div>

      {/* Reference Implementation */}
      <div className="rounded-lg border border-green-900/30 bg-[#0d1220] p-6">
        <h3 className="text-sm font-bold text-green-400 mb-4 flex items-center gap-2">
          <i className="fab fa-python"></i>
          IMPLEMENTACIÓN DE REFERENCIA (Python + jellyfish)
        </h3>
        <pre className="text-xs text-gray-300 bg-black/30 rounded p-4 overflow-x-auto font-mono">
{`import jellyfish

def alias_score(name_a, name_b):
    jw = jellyfish.jaro_winkler_similarity(name_a, name_b)
    sdx_match = 1.0 if jellyfish.soundex(name_a) == jellyfish.soundex(name_b) else 0.0
    lev_dist = jellyfish.levenshtein_distance(name_a, name_b)
    max_len = max(len(name_a), len(name_b)) or 1
    lev_score = 1.0 - (lev_dist / max_len)
    score = (jw * 0.5 + sdx_match * 0.2 + lev_score * 0.3) * 100
    return round(score, 2)`}
        </pre>
      </div>
    </div>
  );
}

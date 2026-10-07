const sampleOutput = `856-FFCI_CASO-2024-0847_2024-12-15.txt

DICTAMEN TÉCNICO — CASO 2024-0847  ·  2024-12-15T14:32:07Z

1. OBJETO
   Análisis pericial de instrumento financiero (orden de transferencia 
   internacional) y verificación de entidad receptora.
   Evidencia: documento PDF (SHA-256: a3f7...c912), fuente: remitente.

2. MATERIALIDAD DE HALLAZGOS: SUSTANCIAL
   Se identifican 4 no-conformidades técnicas de gravedad sustancial
   y 2 hallazgos relevantes.

3. HALLAZGOS
   H1: Código SWIFT TVMUS33XXX
       Valor observado: TVMUS33XXX
       Valor esperado: Institución registrada en directorio BIC (ISO 9362)
       Método: Consulta directorio SWIFT/BIC
       Fuente: swift.com/bic
       Confianza: 98%

   H2: IBAN GB29 NWBK 6016 1331 9268 19
       Valor observado: GB29NWBK60161331926819
       Verificación: Algoritmo ISO 13616 (módulo 97)
       Resultado: Dígito de verificación NO conforme
       Confianza: 99%

   H3: Fecha de valor vs. fecha de emisión
       Valor observado: Valor 2024-12-10, Emisión 2024-12-14
       Anomalía: Fecha de valor anterior a emisión en 4 días
       Confianza: 100%

   H4: Tipografía — inconsistencia de fuente
       Campo "Beneficiario" utiliza fuente diferente al resto del documento
       Método: Análisis de metadatos tipográficos
       Confianza: 95%

4. COTEJO DE ALIAS Y LISTAS RESTRICTIVAS
   Sujeto: [Nombre redactado]
   Alias detectados: 3 variantes ortográficas, 1 transliteración
   
   Listas cotejadas: OFAC SDN, UN Consolidated, EU Consolidated,
   Interpol Red Notices, UK OFSI, LPB México
   
   Resultado: POTENTIAL MATCH
   - Alias "Xyy" vs entrada OFAC SDN ref. 12847
   - Score Jaro-Winkler: 0.82
   - Score Soundex: match
   - Score compuesto: 78/100
   - Clasificación: POTENTIAL MATCH (rango 60-79)
   - Fuente: OFAC SDN, treasury.gov/ofac/downloads
   - Dataset SHA-256: b7e2...f401
   - Fecha descarga: 2024-12-14T03:00:00Z

   >> Cláusula obligatoria: La ausencia de coincidencia en las listas
   >> consultadas no constituye una determinación de ausencia de riesgo.

5. DETERMINACIÓN TÉCNICA
   El documento analizado presenta no-conformidades técnicas sustanciales
   con estándares ISO 9362 (SWIFT) e ISO 13616 (IBAN). La entidad
   receptora presenta coincidencia parcial en listas restrictivas.
   La calificación jurídica corresponde al receptor del dictamen.

6. IOCs / ANEXOS
   - Dominios: transfer-global[.]xyz (resolución negativa)
   - IP: 185.XX.XX.42 (ASN: AS62240, hosting offshore)
   - Hash documento: a3f7c891...c912
   - Timeline: 3 eventos correlacionados (ver anexo temporal)
   - Fuentes: 7 referencias con URL y fecha de consulta`;

export default function OutputPreview() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <i className="fas fa-file-lines text-cyan-500"></i>
        <h2 className="text-lg font-bold text-white tracking-wider">FORMATO DE SALIDA OBLIGATORIO</h2>
        <span className="text-xs text-gray-500 ml-2">Texto plano · Sin tablas ni markdown interno</span>
      </div>

      {/* Output Example */}
      <div className="rounded-lg border border-cyan-900/30 bg-[#0d1220] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500/60"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500/60"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/60"></div>
            </div>
            <span className="text-[10px] text-gray-500 ml-2">856-FFCI_CASO-2024-0847_2024-12-15.txt</span>
          </div>
          <span className="text-[10px] text-cyan-400">DICTAMEN TÉCNICO</span>
        </div>
        <pre className="p-4 text-xs text-gray-300 overflow-x-auto font-mono leading-relaxed max-h-[600px] overflow-y-auto">
          {sampleOutput}
        </pre>
      </div>

      {/* Structure Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-800 bg-[#0d1220] p-4">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <i className="fas fa-list-ol text-cyan-400"></i>
            ESTRUCTURA DEL DICTAMEN
          </h3>
          <ul className="space-y-2 text-xs text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-cyan-500 font-bold">1.</span>
              OBJETO — Qué se analizó, evidencia, hash SHA-256
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500 font-bold">2.</span>
              MATERIALIDAD — SUSTANCIAL / RELEVANTE / MENOR
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500 font-bold">3.</span>
              HALLAZGOS — Numerados con campo, valor, método, fuente, confianza
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500 font-bold">4.</span>
              COTEJO DE ALIAS — Listas, scores, clasificación, cláusula
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500 font-bold">5.</span>
              DETERMINACIÓN TÉCNICA — Conformidad/no-conformidad
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500 font-bold">6.</span>
              IOCs / ANEXOS — IPs, hashes, timeline, fuentes
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-gray-800 bg-[#0d1220] p-4">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <i className="fas fa-scale-balanced text-amber-400"></i>
            REGLAS DE TONO
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-2 rounded bg-green-500/5 border border-green-500/20">
              <p className="text-green-400 font-bold mb-1">✓ CORRECTO</p>
              <p className="text-gray-400 italic">"El código SWIFT TVMUS33XXX no resuelve a institución registrada en el directorio BIC (ISO 9362). Confianza: 98%."</p>
            </div>
            <div className="p-2 rounded bg-red-500/5 border border-red-500/20">
              <p className="text-red-400 font-bold mb-1">✗ INCORRECTO</p>
              <p className="text-gray-400 italic">"¡Es un SWIFT falso!"</p>
            </div>
            <div className="mt-3 p-2 rounded bg-amber-500/5 border border-amber-500/20">
              <p className="text-amber-400 font-bold mb-1">⚠ CLÁUSULA OBLIGATORIA</p>
              <p className="text-gray-400 italic">"La ausencia de coincidencia en las listas consultadas no constituye una determinación de ausencia de riesgo."</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

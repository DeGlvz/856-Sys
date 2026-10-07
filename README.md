# 856-FFCI — Financial Forensic & Cyber Intelligence v3.1

Aplicación pericial que produce **dictámenes técnicos verificables** (formato §5 de la especificación v3.1). Motor determinístico; sin LLM en esta versión. La integración de un modelo de IA queda para una actualización posterior.

## Módulos operativos

| Pestaña | Agente | Qué hace realmente |
|---|---|---|
| **ALIAS / LISTAS** | ALIAS-AGENT | Descarga los archivos oficiales **OFAC SDN + Consolidated (CSV), ONU (XML) y UE (CSV)**. Calcula su SHA-256, los indexa y coteja el nombre y los alias del sujeto. Algoritmos: Jaro-Winkler, Soundex, Metaphone, NYSIIS y Levenshtein. Transliteración ISO 233 / ALA-LC / BGN-PCGN / Pinyin, ponderación ONU de alias (+10 / +5) y umbrales calibrables 60/80/95. **FBI Most Wanted** e **Interpol Red Notices** se consultan en vivo. |
| **DOCUMENTAL** | DOC-AGENT | Calcula el SHA-256 de cada archivo y extrae metadatos PDF (Info/XMP, revisiones `%%EOF`, JavaScript, firmas, fuentes) y EXIF/GPS de imágenes. También extrae el texto del PDF y reconoce entidades. Valida **IBAN, SWIFT/BIC, ISIN, LEI, CUSIP, FIGI, CLABE, CURP y RFC** con sus algoritmos de control. Coteja terminología paramétrica (TVM-LSM666, OITC, Global Server…) y verifica LEI y BIC contra **GLEIF**. |
| **RED** | NET-AGENT | DNS, SPF/DKIM/DMARC, RDAP/WHOIS (antigüedad, registrador, estado), Certificate Transparency (crt.sh), handshake TLS, encabezados HTTP de seguridad, tech stack, ASN (Team Cymru), geolocalización, nodos Tor y DNSBL. Solo modo pasivo. |
| **SEGURIDAD** | CYBER-AGENT | Extracción de IOCs (IPs, dominios, URLs, hashes; admite defang), timeline forense de logs y análisis de encabezados de correo (Authentication-Results, alineación From/Reply-To/Return-Path, cadena Received). |
| **CASO** | FFI-MASTER | Consolida evidencias, hallazgos, cotejos, IOCs y timeline, y calcula la materialidad (SUSTANCIAL / RELEVANTE / MENOR). |
| **DICTAMEN** | — | Genera el dictamen en texto plano `856-FFCI_[ID]_[YYYY-MM-DD].txt` con la cláusula obligatoria de no-determinación. |
| **FUENTES** | — | Muestra el estado de los datasets: fecha de descarga, SHA-256 por archivo, versión y número de registros. También exporta `list_sources.yaml`. |

Los archivos de evidencia se procesan **en el navegador** y no se suben a ningún servidor. El caso se guarda en el navegador (localStorage).

## Arquitectura

```
shared/      Motor puro TypeScript (usado por frontend y backend)
  matching.ts      Jaro-Winkler, Levenshtein, Damerau, Soundex, Metaphone, NYSIIS
  normalize.ts     Normalización, transliteración, sufijos societarios, familias de nombres
  screening.ts     Índice local, scoring §2.6.7, clasificación §2.6.8
  parsers.ts       OFAC / ONU / UE / FBI / Interpol
  validators.ts    IBAN, BIC, ISIN, LEI, CUSIP, FIGI, CLABE, CURP, RFC
  extract.ts       NER por patrones, cotejo paramétrico, fechas
  iocs.ts          IOCs, timeline, encabezados de correo
  findings.ts      Resultados → hallazgos con tono pericial (§6.1)
  dictamen.ts      Generador del dictamen (§5)
api/         Funciones serverless de Vercel
  screen.ts        POST /api/screen      cotejo de listas
  sources.ts       GET  /api/sources     estado de datasets · ?load=1 · ?refresh=1 · ?format=yaml
  net.ts           GET  /api/net?target= recon pasivo de dominio o IP
  registry.ts      GET  /api/registry?lei=|bic=|name=  GLEIF
  cron.ts          refresco diario de listas (vercel.json → crons)
src/         Interfaz React + Tailwind
tests/       Pruebas unitarias (vitest)
```

**Capa de datos (§2.6.1):** no existe API pública en tiempo real para OFAC, ONU ni UE. La primera consulta descarga los archivos oficiales, calcula su SHA-256, los parsea y deja el índice en memoria y en `/tmp` (vigencia `FFCI_CACHE_TTL_HOURS`, 12 h por defecto). El cron diario fuerza el refresco.

## Despliegue (Vercel)

El repositorio ya está conectado a Vercel: cada merge a `main` se despliega solo. Variables opcionales en `.env.example`:

- `FFCI_ACCESS_KEY`: si se define, la API exige el encabezado `x-ffci-key`, que se captura en FUENTES → Clave de acceso. **Recomendado**, porque la URL es pública.
- `CRON_SECRET`: protege `/api/cron`.

## Desarrollo local

```bash
npm install
npm test            # pruebas unitarias
npm run typecheck
npx vercel dev      # frontend + API en http://localhost:3000
```

`npm run dev` levanta solo el frontend; las pestañas que consultan la API necesitan `vercel dev`.

## Limitaciones declaradas (§10.4)

1. Cotejo OFAC/ONU/UE por descarga e índice local, no en tiempo real.
2. Interpol no ofrece bulk data. La consulta pública puede bloquearse por IP o rate limiting y, si falla, se declara como «NO CONSULTADA».
3. ALT.CSV de OFAC no clasifica la calidad de los alias; los «weak a.k.a.» de Remarks se tratan como baja calidad. La ONU sí clasifica.
4. Los umbrales 60/80/95 son iniciales y requieren calibración con un test set etiquetado.
5. La transliteración no latina es aproximada (ASCII).
6. No integradas: Lista de Personas Bloqueadas UIF (no pública), UK/OFSI, DFAT, OSFI, Europol, PEP, SEC, CFTC, FCA y CNBV. No hay OCR.
7. La existencia de un BIC en el directorio SWIFT (licenciado) se verifica de forma indirecta mediante el mapeo GLEIF BIC↔LEI.

## Licencia

Uso interno — Sistema pericial técnico.

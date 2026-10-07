# 856-FFCI — Financial Forensic & Cyber Intelligence v3.1

Sistema Multi-Agente de Grado Pericial — Dashboard de arquitectura e invocación.

## Descripción

Panel técnico para el sistema pericial 856-FFCI que produce dictámenes técnicos verificables en cinco dominios:

1. **Documental** — instrumentos financieros, contratos, comprobantes
2. **OSINT** — entidades físicas y morales, UBO, licencias, sanciones
3. **Red** — infraestructura técnica, DNS, WHOIS, SSL, ASN
4. **Seguridad** — logs, IOCs, timeline de incidentes
5. **Alias & Watchlist** — resolución de alias y cotejo contra listas restrictivas globales

## Características

- 8 agentes especializados (FFI-MASTER, DOC, DEEP, NET, CYBER, ALIAS, NARRATIVE, TIMELINE)
- Pipeline de 9 pasos para resolución de alias
- Cotejo contra 12+ listas restrictivas (OFAC, UN, EU, Interpol, FBI, etc.)
- Scoring: Jaro-Winkler + Soundex + Metaphone + NYSIIS + Levenshtein
- Transliteración: ISO 233, ALA-LC, BGN/PCGN, Pinyin
- Cadena de custodia digital: SHA-256 + timestamp ISO8601
- Cláusula obligatoria de no-determinación

## Stack

- React 18 + TypeScript
- Vite 6
- Tailwind CSS 4
- Font Awesome 6

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Estructura

```
src/
├── App.tsx                    # Entry point + navegación
├── components/
│   ├── Header.tsx             # Cabecera del sistema
│   ├── AgentGrid.tsx          # 8 agentes especializados
│   ├── WorkflowPanel.tsx      # Flujos de orquestación
│   ├── AliasPipeline.tsx      # Pipeline de resolución
│   ├── WatchlistTable.tsx     # Listas restrictivas globales
│   ├── OutputPreview.tsx      # Formato de dictamen
│   ├── CapabilitiesPanel.tsx  # Capacidades + limitaciones
│   └── InvocationPanel.tsx    # Formulario de invocación
```

## Aviso

Este dashboard es una **interfaz de presentación** de la especificación técnica 856-FFCI v3.1. No ejecuta cotejos reales contra listas gubernamentales; la capa operativa de datos requiere descarga + indexación local + fuzzy matching.

## Licencia

Uso interno — Sistema pericial técnico.

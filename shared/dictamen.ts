// 856-FFCI v3.1 — Generador del dictamen técnico (formato obligatorio §5)
import { materiality, sortFindings, type CaseState } from './case.js';
import { NO_DETERMINATION } from './clause.js';

const W = 80;
const rule = (c = '-') => c.repeat(W);
const wrap = (text: string, indent = '   ') => {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = indent;
  for (const w of words) {
    if ((line + w).length > W && line.trim()) { lines.push(line.trimEnd()); line = indent; }
    line += w + ' ';
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines.join('\n');
};

export function dictamenFilename(c: CaseState, at = new Date()) {
  return `856-FFCI_${c.id}_${at.toISOString().slice(0, 10)}.txt`;
}

export function buildDictamen(c: CaseState, at = new Date()): string {
  const ts = at.toISOString();
  const mat = materiality(c);
  const fs = sortFindings(c.findings);
  const L: string[] = [];
  L.push(rule('='), `DICTAMEN TÉCNICO — CASO ${c.id} · ${ts}`, `856-FFCI v3.1 · Modo: ${c.mode}`, rule('='), '');

  // 1. OBJETO
  L.push('1. OBJETO', '');
  L.push(wrap(c.object || 'Análisis técnico de la evidencia de entrada registrada en el caso.'));
  if (c.evidence.length) {
    L.push('', '   Evidencia de entrada:');
    c.evidence.forEach((e, i) => {
      L.push(`   E${i + 1}. ${e.name} · ${e.size} bytes · ${e.type || 'tipo N/D'}`);
      L.push(`       SHA-256: ${e.sha256}`);
      L.push(`       Recepción: ${e.received_at}${e.lastModified ? ' · Última modificación (sistema de archivos): ' + e.lastModified : ''}`);
    });
  }
  const subjects = c.screenings.map((s) => `${s.query.name} (${s.query.kind === 'entity' ? 'persona moral' : 'persona física'})`);
  if (subjects.length) L.push('', wrap(`Sujetos cotejados: ${[...new Set(subjects)].join('; ')}.`));
  if (c.net.length) L.push(wrap(`Infraestructura analizada: ${c.net.map((n) => n.target).join(', ')}.`));
  L.push('');

  // 2. MATERIALIDAD
  L.push(`2. MATERIALIDAD DE HALLAZGOS: ${mat.level}`, '');
  L.push(wrap(`${mat.rationale} Escala técnica por volumen y gravedad de no-conformidades; no constituye alerta de riesgo.`), '');

  // 3. HALLAZGOS
  L.push('3. HALLAZGOS', '');
  if (!fs.length) L.push('   No se determinaron no-conformidades en los elementos verificados.');
  fs.forEach((f, i) => {
    L.push(`   H${String(i + 1).padStart(2, '0')}. [${f.severity}] [${f.domain}] ${f.field}`);
    L.push(wrap(`Valor observado: ${f.observed}`, '        '));
    L.push(wrap(`Valor/norma esperada: ${f.expected}`, '        '));
    L.push(wrap(`Método de verificación: ${f.method}`, '        '));
    L.push(wrap(`Fuente: ${f.source}${f.evidence ? ' · Evidencia: ' + f.evidence : ''}`, '        '));
    L.push(`        Confianza: ${f.confidence}%`, '');
  });

  // 4. COTEJO
  L.push('4. COTEJO DE ALIAS Y LISTAS RESTRICTIVAS', '');
  if (!c.screenings.length) L.push('   No se ejecutó cotejo de listas restrictivas en este caso.', '');
  for (const s of c.screenings) {
    L.push(`   Nombre principal: ${s.query.name}`);
    L.push(`   Tipo: ${s.query.kind === 'entity' ? 'Persona moral' : 'Persona física'}${s.query.dob ? ' · Fecha de nacimiento: ' + s.query.dob : ''}${s.query.nationality ? ' · Nacionalidad: ' + s.query.nationality : ''}`);
    L.push(`   Alias declarados: ${s.query.aliases?.length ? s.query.aliases.join('; ') : 'ninguno'}`);
    L.push(`   Variantes normalizadas: ${s.normalized.map((n) => n.canonical).join(' | ')}`);
    const tr = [...new Set(s.normalized.flatMap((n) => n.transliteration))];
    L.push(`   Transliteraciones evaluadas: ${tr.length ? tr.join(', ') : 'no aplica (escritura latina)'}`);
    L.push(`   Consulta: ${s.consulted_at} · Umbrales: POTENTIAL ${s.thresholds.potential} / LIKELY ${s.thresholds.likely} / CONFIRMED ${s.thresholds.confirmed} (calibrables)`);
    L.push('   Listas cotejadas:');
    for (const l of s.lists) {
      L.push(`     - ${l.name} (${l.authority}): ${l.status === 'error' ? 'NO CONSULTADA — ' + l.errors.join('; ') : `${l.result}${l.best_score != null ? ' · score máx. ' + l.best_score : ''} · ${l.entities} registros`}`);
    }
    if (s.matches.length) {
      L.push('   Coincidencias:');
      for (const m of s.matches.slice(0, 15)) {
        L.push(`     * ${m.classification} · ${m.list_matched} #${m.list_entity_id} «${m.list_entity_name}»`);
        L.push(`       alias: «${m.alias_detected}» [${m.alias_quality}] · tipo: ${m.match_type} · score ${m.score}/100 (base ${m.score_base})`);
        L.push(`       JW ${m.components.jaro_winkler} · Soundex ${m.components.soundex} · Levenshtein ${m.components.levenshtein_norm} · Metaphone ${m.components.metaphone} · NYSIIS ${m.components.nysiis}`);
        if (m.programs.length) L.push(wrap(`programas: ${m.programs.join(', ')}`, '       '));
        if (m.corroboration.length) L.push(wrap(`corroboración: ${m.corroboration.join('; ')}`, '       '));
        L.push(wrap(`fuente: ${m.source_url}`, '       '));
      }
    } else L.push('   Coincidencias: ninguna ≥ umbral POTENTIAL.');
    L.push(`   Resultado global: ${s.overall}`, '');
    L.push(...NO_DETERMINATION(s.lists.filter((l) => l.status !== 'error')).split('\n').map((x) => wrap(x)), '');
  }

  // 5. DETERMINACIÓN
  L.push('5. DETERMINACIÓN TÉCNICA', '');
  const bySev = (s: string) => fs.filter((f) => f.severity === s).length;
  const det = !fs.length
    ? 'Se determina conformidad técnica de los elementos verificados con los estándares y fuentes consultados, dentro del alcance declarado.'
    : `Se determina no-conformidad técnica en ${fs.length} elemento(s): ${bySev('SUSTANCIAL')} sustancial(es), ${bySev('RELEVANTE')} relevante(s), ${bySev('MENOR')} menor(es). ` +
      `Los dominios con no-conformidades son: ${[...new Set(fs.map((f) => f.domain))].join(', ')}. La calificación jurídica corresponde exclusivamente al receptor del dictamen.`;
  L.push(wrap(det), '');

  // 6. IOCs / ANEXOS
  L.push('6. IOCs / ANEXOS', '');
  const io = c.iocs;
  const iocLine = (k: string, v: string[]) => v.length && L.push(wrap(`${k}: ${v.slice(0, 60).join(', ')}${v.length > 60 ? ` … (+${v.length - 60})` : ''}`));
  iocLine('IPs v4', io.ipv4); iocLine('IPs v6', io.ipv6); iocLine('Dominios', io.domains); iocLine('URLs', io.urls);
  iocLine('Emails', io.emails); iocLine('MD5', io.md5); iocLine('SHA-1', io.sha1); iocLine('SHA-256', io.sha256);
  if (!Object.values(io).some((v) => v.length)) L.push('   IOCs: no se registraron.');
  L.push('', '   Timeline:');
  if (!c.timeline.length) L.push('   (sin eventos correlacionados)');
  for (const t of c.timeline.slice(0, 80)) L.push(wrap(`${t.ts} · [${t.source}] ${t.event}`, '   '));
  L.push('', '   Hashes SHA-256 de evidencia:');
  if (!c.evidence.length) L.push('   (sin archivos de evidencia)');
  c.evidence.forEach((e, i) => L.push(`   E${i + 1} ${e.sha256}  ${e.name}`));
  L.push('', '   Fuentes:');
  const src = new Map<string, string>();
  for (const s of c.screenings) for (const l of s.lists) src.set(`${l.name} — ${l.url}`, l.downloaded_at ?? s.consulted_at);
  for (const n of c.net) for (const s of n.sources) src.set(`${s.source}${s.url ? ' — ' + s.url : ''}`, s.consulted_at);
  for (const s of c.sources) src.set(`${s.ref}${s.url ? ' — ' + s.url : ''}`, s.consulted_at);
  if (!src.size) L.push('   (sin fuentes externas consultadas)');
  for (const [k, v] of src) L.push(wrap(`- ${k} · consulta: ${v}`, '   '));
  L.push('', rule('-'), wrap('Dictamen técnico. Los hallazgos se entregan como hechos técnicos verificables; la calificación jurídica y las acciones derivadas corresponden al receptor.', ''), rule('='));
  return L.join('\n');
}

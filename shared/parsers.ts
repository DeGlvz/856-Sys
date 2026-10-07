// 856-FFCI v3.1 — Parsers de listas oficiales (§2.6.1). Funciones puras:
// texto del archivo oficial → ListEntity[]. Sin red; probadas con fixtures.
import { XMLParser } from 'fast-xml-parser';
import { parseCSV } from './csv.js';
import type { AliasQuality, ListAlias, ListEntity } from './types.js';

const nil = (s?: string) => {
  const t = (s ?? '').trim();
  return t === '-0-' || t === '' ? '' : t;
};
const arr = <T>(x: T | T[] | undefined | null): T[] => (x == null ? [] : Array.isArray(x) ? x : [x]);
const str = (x: unknown) => (x == null ? '' : String(x).trim());

// ------------------------------------------------------------------ OFAC
const DOC_RE = /\b(Passport|alt\. Passport|National ID No\.|Cedula No\.|Identification Number|R\.F\.C\.|RFC|C\.U\.R\.P\.|CURP|Tax ID No\.|Registration Number|Registration ID|D\.N\.I\.|NIT #|Driver's License No\.|SSN|Personal ID Card|Residency Number|Business Registration Number|Vessel Registration Identification IMO|Aircraft Manufacturer's Serial Number \(MSN\)|Legal Entity Number|SWIFT\/BIC)\s+([A-Z0-9][A-Z0-9\-\/\.]{3,})/gi;

export function parseOfacRemarks(remarks: string) {
  const dob: string[] = [], nationality: string[] = [], documents: string[] = [], weakAka: string[] = [];
  for (const part of remarks.split(';').map((p) => p.trim())) {
    let m: RegExpMatchArray | null;
    if ((m = part.match(/^DOB\s+(.+)$/i))) dob.push(m[1].trim());
    else if ((m = part.match(/^(?:nationality|citizen)\s+(.+)$/i))) nationality.push(m[1].replace(/\.$/, '').trim());
  }
  for (const m of remarks.matchAll(DOC_RE)) documents.push(`${m[1]} ${m[2].replace(/[.;,]$/, '')}`);
  for (const m of remarks.matchAll(/a\.k\.a\.\s+'([^']+)'/gi)) weakAka.push(m[1].trim());
  return { dob, nationality, documents, weakAka };
}

/** OFAC SDN.CSV / CONS_PRIM.CSV + ALT.CSV / CONS_ALT.CSV (sin encabezado). */
export function parseOfac(primCsv: string, altCsv: string, source: string): ListEntity[] {
  const alts = new Map<string, ListAlias[]>();
  for (const r of parseCSV(altCsv)) {
    const [ent, , type, name] = r;
    if (!nil(ent) || !nil(name)) continue;
    const list = alts.get(nil(ent)) ?? [];
    list.push({ name: nil(name), quality: 'unclassified', type: nil(type) || 'aka' });
    alts.set(nil(ent), list);
  }
  const out: ListEntity[] = [];
  for (const r of parseCSV(primCsv)) {
    const [ent, name, type, program, title, , , , , vflag, , remarks] = r;
    const id = nil(ent);
    if (!id || !/^\d+$/.test(id) || !nil(name)) continue;
    const t = nil(type).toLowerCase();
    const rem = parseOfacRemarks(nil(remarks));
    const aliases = [
      ...(alts.get(id) ?? []),
      ...rem.weakAka.map((n) => ({ name: n, quality: 'low' as AliasQuality, type: 'weak aka (Remarks)' })),
    ];
    out.push({
      id,
      source,
      type: t === 'individual' ? 'individual' : t === 'vessel' ? 'vessel' : t === 'aircraft' ? 'aircraft' : 'entity',
      name: nil(name),
      aliases,
      dob: rem.dob,
      nationality: [...rem.nationality, ...(nil(vflag) ? [nil(vflag)] : [])],
      documents: rem.documents,
      programs: nil(program).split(/[\[\]\s]+/).filter(Boolean),
      remarks: [nil(title), nil(remarks)].filter(Boolean).join(' | ').slice(0, 600),
      url: `https://sanctionssearch.ofac.treas.gov/Details.aspx?id=${id}`,
    });
  }
  return out;
}

// ------------------------------------------------------------------ ONU
const unQuality = (q: string): AliasQuality => {
  const s = q.toLowerCase();
  return s.startsWith('good') ? 'good' : s.startsWith('low') ? 'low' : 'unclassified';
};

export function parseUN(xml: string): { entities: ListEntity[]; version: string | null } {
  const p = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseTagValue: false, trimValues: true });
  const doc = p.parse(xml);
  const root = doc.CONSOLIDATED_LIST ?? {};
  const version = root['@_dateGenerated'] ?? null;
  const out: ListEntity[] = [];
  for (const ind of arr(root.INDIVIDUALS?.INDIVIDUAL)) {
    const name = [ind.FIRST_NAME, ind.SECOND_NAME, ind.THIRD_NAME, ind.FOURTH_NAME].map(str).filter(Boolean).join(' ');
    if (!name) continue;
    const aliases: ListAlias[] = arr(ind.INDIVIDUAL_ALIAS)
      .filter((a: any) => str(a?.ALIAS_NAME))
      .map((a: any) => ({ name: str(a.ALIAS_NAME), quality: unQuality(str(a.QUALITY)), type: 'a.k.a.' }));
    if (str(ind.NAME_ORIGINAL_SCRIPT)) aliases.push({ name: str(ind.NAME_ORIGINAL_SCRIPT), quality: 'good', type: 'escritura original' });
    const dob = arr(ind.INDIVIDUAL_DATE_OF_BIRTH).map((d: any) =>
      str(d?.DATE) || str(d?.YEAR) || [str(d?.FROM_YEAR), str(d?.TO_YEAR)].filter(Boolean).join('-')).filter(Boolean);
    out.push({
      id: str(ind.REFERENCE_NUMBER) || str(ind.DATAID),
      source: 'UN',
      type: 'individual',
      name,
      aliases,
      dob,
      nationality: arr(ind.NATIONALITY?.VALUE).map(str).filter(Boolean),
      documents: arr(ind.INDIVIDUAL_DOCUMENT).map((d: any) => [str(d?.TYPE_OF_DOCUMENT), str(d?.NUMBER)].filter(Boolean).join(' ')).filter((s: string) => /\d/.test(s)),
      programs: [str(ind.UN_LIST_TYPE), str(ind.REFERENCE_NUMBER)].filter(Boolean),
      remarks: str(ind.COMMENTS1).slice(0, 600),
      url: 'https://main.un.org/securitycouncil/en/content/un-sc-consolidated-list',
    });
  }
  for (const ent of arr(root.ENTITIES?.ENTITY)) {
    const name = str(ent.FIRST_NAME);
    if (!name) continue;
    out.push({
      id: str(ent.REFERENCE_NUMBER) || str(ent.DATAID),
      source: 'UN',
      type: 'entity',
      name,
      aliases: arr(ent.ENTITY_ALIAS).filter((a: any) => str(a?.ALIAS_NAME))
        .map((a: any) => ({ name: str(a.ALIAS_NAME), quality: unQuality(str(a.QUALITY)), type: 'a.k.a.' })),
      dob: [],
      nationality: [],
      documents: [],
      programs: [str(ent.UN_LIST_TYPE), str(ent.REFERENCE_NUMBER)].filter(Boolean),
      remarks: str(ent.COMMENTS1).slice(0, 600),
      url: 'https://main.un.org/securitycouncil/en/content/un-sc-consolidated-list',
    });
  }
  return { entities: out, version };
}

// ------------------------------------------------------------------ UE
/** EU Consolidated Financial Sanctions (csvFullSanctionsList_1_1, ';'). */
export function parseEU(csv: string): { entities: ListEntity[]; version: string | null } {
  const rows = parseCSV(csv, ';');
  if (!rows.length) return { entities: [], version: null };
  const h = rows[0].map((x) => x.trim());
  const col = (...names: string[]) => {
    for (const n of names) { const i = h.indexOf(n); if (i >= 0) return i; }
    return -1;
  };
  const c = {
    date: col('fileGenerationDate'),
    id: col('Entity_LogicalId'),
    type: col('Entity_SubjectType_ClassificationCode', 'Entity_SubjectType'),
    prog: col('Entity_Regulation_Programme'),
    ref: col('Entity_EU_ReferenceNumber'),
    whole: col('NameAlias_WholeName'),
    dob: col('BirthDate_BirthDate'),
    year: col('BirthDate_Year'),
    cit: col('Citizenship_CountryDescription'),
    idnum: col('Identification_Number'),
    idtype: col('Identification_TypeDescription', 'Identification_TypeCode'),
    remark: col('Entity_Remark'),
  };
  if (c.id < 0 || c.whole < 0) throw new Error('Formato EU no reconocido: faltan Entity_LogicalId / NameAlias_WholeName');
  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '');
  const map = new Map<string, ListEntity>();
  let version: string | null = null;
  for (const r of rows.slice(1)) {
    const id = get(r, c.id);
    if (!id) continue;
    version ??= get(r, c.date) || null;
    let e = map.get(id);
    if (!e) {
      const t = get(r, c.type).toLowerCase();
      e = {
        id, source: 'EU',
        type: t.startsWith('p') ? 'individual' : t.startsWith('e') ? 'entity' : 'unknown',
        name: '', aliases: [], dob: [], nationality: [], documents: [], programs: [],
        remarks: get(r, c.remark).slice(0, 600),
        url: 'https://data.europa.eu/data/datasets/consolidated-list-of-persons-groups-and-entities-subject-to-eu-financial-sanctions',
      };
      map.set(id, e);
    }
    const whole = get(r, c.whole);
    if (whole) {
      if (!e.name) e.name = whole;
      else if (whole !== e.name && !e.aliases.some((a) => a.name === whole)) e.aliases.push({ name: whole, quality: 'unclassified', type: 'alias' });
    }
    const d = get(r, c.dob) || get(r, c.year);
    if (d && !e.dob.includes(d)) e.dob.push(d);
    const n = get(r, c.cit);
    if (n && !e.nationality.includes(n)) e.nationality.push(n);
    const doc = get(r, c.idnum);
    if (doc) { const s = `${get(r, c.idtype)} ${doc}`.trim(); if (!e.documents.includes(s)) e.documents.push(s); }
    for (const p of [get(r, c.prog), get(r, c.ref)]) if (p && !e.programs.includes(p)) e.programs.push(p);
  }
  return { entities: [...map.values()].filter((e) => e.name), version };
}

// ------------------------------------------------------------------ FBI / Interpol (consulta en vivo)
export function parseFBI(json: any): ListEntity[] {
  return arr(json?.items).map((it: any) => ({
    id: str(it.uid),
    source: 'FBI',
    type: 'individual' as const,
    name: str(it.title),
    aliases: arr<string>(it.aliases).map((a) => ({ name: str(a), quality: 'unclassified' as AliasQuality, type: 'alias' })),
    dob: arr<string>(it.dates_of_birth_used).map(str),
    nationality: [str(it.nationality)].filter(Boolean),
    documents: [],
    programs: arr<string>(it.subjects).map(str),
    url: str(it.url),
  })).filter((e) => e.name);
}

export function parseInterpol(json: any): ListEntity[] {
  return arr(json?._embedded?.notices).map((n: any) => ({
    id: str(n.entity_id),
    source: 'INTERPOL_RED',
    type: 'individual' as const,
    name: [str(n.forename), str(n.name)].filter(Boolean).join(' '),
    aliases: [],
    dob: [str(n.date_of_birth)].filter(Boolean),
    nationality: arr<string>(n.nationalities).map(str),
    documents: [],
    programs: ['Red Notice'],
    url: `https://www.interpol.int/How-we-work/Notices/Red-Notices/View-Red-Notices#${str(n.entity_id).replace('/', '-')}`,
  })).filter((e) => e.name);
}

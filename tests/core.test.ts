import { describe, expect, it } from 'vitest';
import { jaroWinkler, levenshtein, damerauLevenshtein, soundex, metaphone, nysiis } from '../shared/matching';
import { canonical, normalizeName, transliterate } from '../shared/normalize';
import { WatchlistIndex, aliasScore, classify } from '../shared/screening';
import { validateBIC, validateCLABE, validateCUSIP, validateCURP, validateFIGI, validateIBAN, validateISIN, validateLEI, validateRFC } from '../shared/validators';
import { extractEntities, parametricScan, dateChecks } from '../shared/extract';
import { parseOfac, parseUN, parseEU, parseFBI, parseInterpol } from '../shared/parsers';
import { analyzeEmailHeaders, buildTimeline, extractIOCs } from '../shared/iocs';
import { newCase, materiality } from '../shared/case';
import { fromScreening, fromValidation, fromNet } from '../shared/findings';
import { buildDictamen } from '../shared/dictamen';

describe('algoritmos (paridad jellyfish)', () => {
  it('Jaro-Winkler', () => {
    expect(jaroWinkler('martha', 'marhta')).toBeCloseTo(0.9611, 4);
    expect(jaroWinkler('dwayne', 'duane')).toBeCloseTo(0.84, 4);
    expect(jaroWinkler('dixon', 'dicksonx')).toBeCloseTo(0.8133, 4);
  });
  it('Levenshtein / Damerau', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(damerauLevenshtein('ca', 'ac')).toBe(1);
  });
  it('Soundex', () => {
    expect(soundex('Robert')).toBe('R163');
    expect(soundex('Rupert')).toBe('R163');
    expect(soundex('Ashcraft')).toBe('A261');
    expect(soundex('Tymczak')).toBe('T522');
    expect(soundex('Pfister')).toBe('P236');
  });
  it('Metaphone / NYSIIS', () => {
    expect(metaphone('knight')).toBe('NT');
    expect(metaphone('Thompson')).toMatch(/^(0MPSN|TMSN)$/);
    expect(nysiis('Macintosh')).toBe('MCANT');
    expect(nysiis('Knuth')).toBe('NAT');
  });
});

describe('normalización y transliteración', () => {
  it('familias de transliteración latina', () => {
    expect(canonical(normalizeName('Mohamed Hussein'))).toBe(canonical(normalizeName('Muhammad Husayn')));
  });
  it('cirílico BGN/PCGN, Pinyin, árabe', () => {
    expect(transliterate('Путин').text).toBe('putin');
    expect(transliterate('习近平').standards).toContain('Pinyin');
    expect(transliterate('أسامة').standards[0]).toMatch(/ISO 233/);
  });
  it('sufijos societarios', () => {
    expect(normalizeName('Grupo Ejemplo S.A. de C.V.', { entity: true })).toBe('ejemplo');
    expect(normalizeName('ACME Trading Company Limited', { entity: true })).toBe('acme trading');
  });
});

describe('scoring y clasificación §2.6.7–2.6.8', () => {
  it('fórmula', () => {
    const r = aliasScore('john smith', 'john smith');
    expect(r.score).toBe(100);
  });
  it('umbrales', () => {
    expect(classify(59.9)).toBe('CLEAR');
    expect(classify(60)).toBe('POTENTIAL MATCH');
    expect(classify(80)).toBe('LIKELY MATCH');
    expect(classify(95)).toBe('CONFIRMED MATCH');
  });
});

describe('validadores DOC', () => {
  it('IBAN', () => {
    expect(validateIBAN('GB82 WEST 1234 5698 7654 32').valid).toBe(true);
    expect(validateIBAN('GB82 WEST 1234 5698 7654 33').valid).toBe(false);
    expect(validateIBAN('DE89370400440532013000').valid).toBe(true);
    expect(validateIBAN('US12345678901234567890').valid).toBe(false);
  });
  it('BIC', () => {
    expect(validateBIC('DEUTDEFF').valid).toBe(true);
    expect(validateBIC('BOFAUS3NXXX').valid).toBe(true);
    expect(validateBIC('TVMUS33XXX').valid).toBe(false); // 10 caracteres
    expect(validateBIC('ABCDUS00').info.observación).toMatch(/test/);
  });
  it('ISIN / LEI / CUSIP / FIGI', () => {
    expect(validateISIN('US0378331005').valid).toBe(true);
    expect(validateISIN('US0378331006').valid).toBe(false);
    expect(validateLEI('529900T8BM49AURSDO55').valid).toBe(true);
    expect(validateLEI('529900T8BM49AURSDO56').valid).toBe(false);
    expect(validateCUSIP('037833100').valid).toBe(true);
    expect(validateCUSIP('037833101').valid).toBe(false);
    expect(validateFIGI('BBG000BLNNH6').valid).toBe(true);
    expect(validateFIGI('BBG000BLNNH7').valid).toBe(false);
  });
  it('CLABE / CURP / RFC', () => {
    expect(validateCLABE('002010077777777771').valid).toBe(true);
    expect(validateCLABE('002010077777777772').valid).toBe(false);
    expect(validateCURP('PERC800101HDFRZR09').valid).toBe(true);
    expect(validateRFC('GODE561231GR8').valid).toBe(true);
    expect(validateRFC('ABC991332XX1').valid).toBe(false);
  });
});

describe('extracción y cotejo paramétrico', () => {
  const txt = `Beneficiary bank SWIFT: DEUTDEFF, IBAN GB82 WEST 1234 5698 7654 33. ISIN US0378331005.
  Transfer via Global Server, IP/IP, ref TVM-LSM666 issued by OITC on 2024-02-30. Contact ops@bank-example.xyz amount USD 25,000,000.00`;
  it('entidades', () => {
    const e = extractEntities(txt);
    const kinds = e.map((x) => x.kind);
    expect(kinds).toEqual(expect.arrayContaining(['BIC', 'IBAN', 'ISIN', 'EMAIL', 'AMOUNT']));
    expect(e.find((x) => x.kind === 'IBAN')!.validation!.valid).toBe(false);
  });
  it('paramétrico y fechas', () => {
    const p = parametricScan(txt).map((h) => h.pattern);
    expect(p).toEqual(expect.arrayContaining(['TVM-LSM666', 'OITC', '"Global Server"']));
    expect(dateChecks(txt)[0].value).toBe('2024-02-30');
  });
});

// ---------------------------------------------------------------- fixtures de formato oficial
const SDN = `36,"AEROCARIBBEAN AIRLINES","-0- ","CUBA","-0- ","-0- ","-0- ","-0- ","-0- ","-0- ","-0- ","-0- "
6365,"BIN LADIN, Usama","individual","SDGT","-0- ","-0- ","-0- ","-0- ","-0- ","-0- ","-0- ","DOB 30 Jul 1957; alt. DOB 1958; POB Jeddah, Saudi Arabia; citizen Saudi Arabia; alt. citizen Afghanistan; a.k.a. 'ABU ABDALLAH'; Passport A123456 (Saudi Arabia)."
`;
const ALT = `36,12,"aka","AERO-CARIBBEAN","-0- "
6365,4520,"aka","BIN LADEN, Osama","-0- "
6365,4521,"aka","BIN LADIN, Osama bin Muhammad bin Awad","-0- "
`;
const UNXML = `<?xml version="1.0" encoding="UTF-8"?>
<CONSOLIDATED_LIST dateGenerated="2026-10-01T00:00:00.000Z">
<INDIVIDUALS><INDIVIDUAL><DATAID>6908555</DATAID><VERSIONNUM>1</VERSIONNUM><FIRST_NAME>ABDUL</FIRST_NAME><SECOND_NAME>HAKIM</SECOND_NAME><THIRD_NAME>MURAD</THIRD_NAME>
<UN_LIST_TYPE>Al-Qaida</UN_LIST_TYPE><REFERENCE_NUMBER>QDi.001</REFERENCE_NUMBER><NAME_ORIGINAL_SCRIPT>عبد الحكيم مراد</NAME_ORIGINAL_SCRIPT>
<NATIONALITY><VALUE>Pakistan</VALUE></NATIONALITY>
<INDIVIDUAL_ALIAS><QUALITY>Good</QUALITY><ALIAS_NAME>Murad, Abdul Hakim Hasim</ALIAS_NAME></INDIVIDUAL_ALIAS>
<INDIVIDUAL_ALIAS><QUALITY>Low</QUALITY><ALIAS_NAME>Saeed Akman</ALIAS_NAME></INDIVIDUAL_ALIAS>
<INDIVIDUAL_DATE_OF_BIRTH><TYPE_OF_DATE>EXACT</TYPE_OF_DATE><DATE>1968-04-11</DATE></INDIVIDUAL_DATE_OF_BIRTH>
<INDIVIDUAL_DOCUMENT><TYPE_OF_DOCUMENT>Passport</TYPE_OF_DOCUMENT><NUMBER>665334</NUMBER></INDIVIDUAL_DOCUMENT>
</INDIVIDUAL></INDIVIDUALS>
<ENTITIES><ENTITY><DATAID>110</DATAID><FIRST_NAME>AL-RASHID TRUST</FIRST_NAME><UN_LIST_TYPE>Al-Qaida</UN_LIST_TYPE><REFERENCE_NUMBER>QDe.005</REFERENCE_NUMBER>
<ENTITY_ALIAS><QUALITY>Good</QUALITY><ALIAS_NAME>Al-Rasheed Trust</ALIAS_NAME></ENTITY_ALIAS></ENTITY></ENTITIES>
</CONSOLIDATED_LIST>`;
const EUCSV = `fileGenerationDate;Entity_LogicalId;Entity_EU_ReferenceNumber;Entity_SubjectType_ClassificationCode;Entity_Regulation_Programme;NameAlias_WholeName;BirthDate_BirthDate;Citizenship_CountryDescription;Identification_Number;Identification_TypeDescription;Entity_Remark
2026-10-01;13;EU.27.28;person;TAQA;Saddam Hussein Al-Tikriti;1937-04-28;Iraq;;;
2026-10-01;13;EU.27.28;person;TAQA;Abu Ali;;;;;
2026-10-01;99;EU.9.1;enterprise;RUS;JSC Example Bank;;;1027700000000;Registration Number;
`;

describe('parsers de listas oficiales', () => {
  it('OFAC', () => {
    const e = parseOfac(SDN, ALT, 'OFAC_SDN');
    expect(e).toHaveLength(2);
    const ubl = e.find((x) => x.id === '6365')!;
    expect(ubl.type).toBe('individual');
    expect(ubl.dob).toEqual(['30 Jul 1957']);
    expect(ubl.nationality).toContain('Saudi Arabia');
    expect(ubl.aliases.find((a) => a.name === 'ABU ABDALLAH')!.quality).toBe('low');
    expect(ubl.documents[0]).toMatch(/A123456/);
    expect(e.find((x) => x.id === '36')!.type).toBe('entity');
  });
  it('ONU', () => {
    const { entities, version } = parseUN(UNXML);
    expect(version).toBe('2026-10-01T00:00:00.000Z');
    const i = entities[0];
    expect(i.name).toBe('ABDUL HAKIM MURAD');
    expect(i.aliases.map((a) => a.quality)).toEqual(['good', 'low', 'good']);
    expect(i.dob).toEqual(['1968-04-11']);
    expect(entities[1].type).toBe('entity');
  });
  it('UE', () => {
    const { entities, version } = parseEU(EUCSV);
    expect(version).toBe('2026-10-01');
    expect(entities).toHaveLength(2);
    expect(entities[0].aliases[0].name).toBe('Abu Ali');
    expect(entities[1].type).toBe('entity');
  });
  it('FBI / Interpol', () => {
    expect(parseFBI({ items: [{ uid: 'x', title: 'JOHN DOE', aliases: ['Johnny D'], dates_of_birth_used: ['1980'], url: 'u' }] })[0].aliases).toHaveLength(1);
    expect(parseInterpol({ _embedded: { notices: [{ entity_id: '2020/1', forename: 'JUAN', name: 'PEREZ', nationalities: ['MX'] }] } })[0].name).toBe('JUAN PEREZ');
  });
});

describe('cotejo integrado', () => {
  const idx = new WatchlistIndex([...parseOfac(SDN, ALT, 'OFAC_SDN'), ...parseUN(UNXML).entities]);
  const meta = { code: 'OFAC_SDN', authority: 'OFAC', url: 'u', version: null, sha256: 'abc' };
  it('alias + transliteración', () => {
    const m = idx.screen({ kind: 'individual', name: 'Osama bin Laden', dob: '1957' }, meta);
    expect(m[0].list_entity_id).toBe('6365');
    expect(m[0].classification).toBe('CONFIRMED MATCH');
    expect(m[0].corroboration.join()).toMatch(/±5/);
  });
  it('variante ortográfica', () => {
    const m = idx.screen({ kind: 'individual', name: 'Abdul Hakeem Murad' }, meta);
    expect(m[0]?.list_entity_name).toBe('ABDUL HAKIM MURAD');
    expect(m[0].score).toBeGreaterThanOrEqual(80);
  });
  it('escritura árabe original', () => {
    const m = idx.screen({ kind: 'individual', name: 'عبد الحكيم مراد' }, meta);
    expect(m[0]?.list_entity_name).toBe('ABDUL HAKIM MURAD');
  });
  it('DOB discordante reduce score', () => {
    const a = idx.screen({ kind: 'individual', name: 'Osama bin Laden' }, meta)[0].score_base;
    const b = idx.screen({ kind: 'individual', name: 'Osama bin Laden', dob: '1990' }, meta)[0];
    expect(b.adjustments.some((x) => x.delta < 0)).toBe(true);
    expect(b.score_base).toBe(a);
  });
  it('sin coincidencia', () => {
    expect(idx.screen({ kind: 'individual', name: 'María Fernanda López García' }, meta)).toHaveLength(0);
  });
  it('persona moral no cruza con persona física', () => {
    const m = idx.screen({ kind: 'entity', name: 'Al Rashid Trust' }, meta);
    expect(m[0].entity_type).toBe('entity');
  });
});

describe('CYBER pasivo', () => {
  it('IOCs con defang', () => {
    const i = extractIOCs('Conexión a hxxp://evil[.]example[.]com/x desde 203.0.113.7 hash d41d8cd98f00b204e9800998ecf8427e');
    expect(i.urls[0]).toBe('http://evil.example.com/x');
    expect(i.ipv4).toContain('203.0.113.7');
    expect(i.md5).toHaveLength(1);
  });
  it('timeline', () => {
    const t = buildTimeline('127.0.0.1 - - [10/Oct/2026:13:55:36 -0700] "GET /"\n2026-10-01T10:00:00Z login ok');
    expect(t[0].ts).toBe('2026-10-01T10:00:00.000Z');
    expect(t[1].ts).toBe('2026-10-10T20:55:36.000Z');
  });
  it('encabezados de correo', () => {
    const a = analyzeEmailHeaders(`Received: from mail.x.com (mail.x.com [198.51.100.4])\n by mx.google.com; Tue, 1 Oct 2026 10:00:00 +0000
Authentication-Results: mx.google.com; spf=softfail smtp.mailfrom=x.com; dkim=none; dmarc=fail
From: Banco <pagos@banco.com>
Reply-To: pagos@banco-seguro.xyz
Return-Path: <bounce@x.com>
Message-ID: <abc@x.com>`);
    expect(a.origin_ip).toBe('198.51.100.4');
    expect(a.observations.map((o) => o.field)).toEqual(expect.arrayContaining(['SPF', 'DKIM', 'DMARC', 'Reply-To vs From', 'Return-Path vs From']));
  });
});

describe('dictamen', () => {
  it('genera formato §5 con cláusula', () => {
    const c = newCase();
    c.findings.push(...fromValidation(validateIBAN('GB82WEST12345698765433')));
    c.findings.push(...fromNet('x.com', { rdap: { age_days: 10, registered: '2026-09-26', url: 'r', status: [] }, email_auth: { spf: [], dmarc: [] }, dns: { MX: [{}] } }));
    const idx = new WatchlistIndex(parseOfac(SDN, ALT, 'OFAC_SDN'));
    const matches = idx.screen({ kind: 'individual', name: 'Usama bin Ladin' }, { code: 'OFAC_SDN', authority: 'OFAC', url: 'u', version: null, sha256: 'f'.repeat(64) });
    const r: any = { query: { kind: 'individual', name: 'Usama bin Ladin' }, normalized: [{ variant: 'x', normalized: 'x', canonical: 'bin ladin usama', transliteration: [] }],
      consulted_at: 'now', lists: [{ code: 'OFAC_SDN', name: 'OFAC SDN List', authority: 'OFAC', url: 'u', downloaded_at: '2026-10-06T00:00:00Z', sha256: 'f'.repeat(64), status: 'ok', entities: 2, errors: [], result: 'CONFIRMED MATCH', best_score: 100 }],
      matches, overall: 'CONFIRMED MATCH', thresholds: { potential: 60, likely: 80, confirmed: 95 }, clause: '', limitations: [] };
    c.screenings.push(r);
    c.findings.push(...fromScreening(r));
    expect(materiality(c).level).toBe('SUSTANCIAL');
    const t = buildDictamen(c);
    for (const s of ['1. OBJETO', '2. MATERIALIDAD DE HALLAZGOS: SUSTANCIAL', '3. HALLAZGOS', '4. COTEJO DE ALIAS', '5. DETERMINACIÓN TÉCNICA', '6. IOCs / ANEXOS'])
      expect(t).toContain(s);
    expect(t).toContain('La ausencia de coincidencia en las listas consultadas no');
    expect(t).not.toMatch(/fraude|estafa|sospechoso|fraudulento/i);
  });
});

// 856-FFCI v3.1 — DOC-AGENT: validación normativa (§2.2)
// SWIFT/BIC (ISO 9362), IBAN (ISO 13616), ISIN (ISO 6166), LEI (ISO 17442),
// CUSIP, FIGI, CLABE (Banxico), RFC y CURP (formato).

export interface Validation {
  standard: string;
  input: string;
  value: string;
  valid: boolean;
  checks: { check: string; ok: boolean; detail?: string }[];
  info: Record<string, string>;
  confidence: number; // % de confianza del método
}

const clean = (s: string) => s.toUpperCase().replace(/[\s\-.]/g, '');

// ISO 3166-1 alfa-2 vigentes (+ XK Kosovo usado por SWIFT)
export const ISO3166 = new Set(('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW XK').split(' '));

// Registro IBAN (SWIFT, ISO 13616) — longitud por país
export const IBAN_LENGTHS: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BI: 27, BR: 29, BY: 28, CH: 21, CR: 22, CY: 28,
  CZ: 24, DE: 22, DJ: 27, DK: 18, DO: 28, EE: 20, EG: 29, ES: 24, FI: 18, FK: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23,
  GL: 18, GR: 27, GT: 28, HN: 28, HR: 21, HU: 28, IE: 22, IL: 23, IQ: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28,
  LC: 32, LI: 21, LT: 20, LU: 20, LV: 21, LY: 25, MC: 27, MD: 24, ME: 22, MK: 19, MN: 20, MR: 27, MT: 31, MU: 30, NI: 28,
  NL: 18, NO: 15, OM: 23, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29, RO: 24, RS: 22, RU: 33, SA: 24, SC: 31, SD: 18, SE: 24,
  SI: 19, SK: 24, SM: 27, SO: 23, ST: 25, SV: 28, TL: 23, TN: 24, TR: 26, UA: 29, VA: 22, VG: 24, XK: 20, YE: 30,
};

function mod97(numeric: string): number {
  let r = 0;
  for (let i = 0; i < numeric.length; i += 7) r = Number(String(r) + numeric.slice(i, i + 7)) % 97;
  return r;
}
const lettersToDigits = (s: string) => s.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));

export function validateIBAN(input: string): Validation {
  const v = clean(input);
  const cc = v.slice(0, 2);
  const checks: Validation['checks'] = [];
  const fmt = /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(v);
  checks.push({ check: 'Estructura ISO 13616 (CC + 2 dígitos + BBAN)', ok: fmt });
  const len = IBAN_LENGTHS[cc];
  checks.push({ check: 'País en registro IBAN', ok: !!len, detail: len ? `${cc}: ${len} caracteres` : `${cc} no participa en el registro IBAN` });
  if (len) checks.push({ check: 'Longitud conforme al país', ok: v.length === len, detail: `observada ${v.length}, esperada ${len}` });
  const mod = fmt ? mod97(lettersToDigits(v.slice(4) + v.slice(0, 4))) : -1;
  checks.push({ check: 'Dígito de control MOD 97-10 (ISO 7064)', ok: mod === 1, detail: `residuo ${mod}` });
  const valid = checks.every((c) => c.ok);
  return { standard: 'IBAN (ISO 13616)', input, value: v, valid, checks, info: { país: cc, 'dígitos de control': v.slice(2, 4), BBAN: v.slice(4) }, confidence: 99 };
}

export function validateBIC(input: string): Validation {
  const v = clean(input);
  const checks: Validation['checks'] = [];
  const fmt = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v);
  checks.push({ check: 'Estructura ISO 9362 (4 inst. + 2 país + 2 localidad [+3 sucursal])', ok: fmt, detail: `longitud ${v.length}` });
  const cc = v.slice(4, 6);
  checks.push({ check: 'Código de país ISO 3166-1', ok: ISO3166.has(cc), detail: cc });
  const loc = v.slice(6, 8);
  const info: Record<string, string> = { institución: v.slice(0, 4), país: cc, localidad: loc, sucursal: v.slice(8) || 'XXX (oficina principal)' };
  if (loc[1] === '0') info.observación = 'Segundo carácter de localidad "0": BIC de prueba/test (no operativo en red SWIFT)';
  if (loc[1] === '1') info.observación = 'Segundo carácter de localidad "1": participante pasivo (sin conexión directa a SWIFT)';
  checks.push({ check: 'BIC operativo (localidad ≠ x0)', ok: loc[1] !== '0', detail: loc });
  const valid = checks.every((c) => c.ok);
  info.limitación = 'La existencia en el directorio BIC de SWIFT (licenciado) no se verifica aquí; usar verificación GLEIF BIC↔LEI.';
  return { standard: 'SWIFT/BIC (ISO 9362)', input, value: v, valid, checks, info, confidence: 90 };
}

function luhnDigits(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = +digits[digits.length - 1 - i];
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

export function validateISIN(input: string): Validation {
  const v = clean(input);
  const fmt = /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(v);
  const cc = v.slice(0, 2);
  const checks = [
    { check: 'Estructura ISO 6166 (2 país + 9 NSIN + 1 control)', ok: fmt },
    { check: 'Prefijo de país/emisor válido', ok: ISO3166.has(cc) || ['XS', 'EU', 'XA', 'XB', 'XC', 'XD', 'QS', 'QT'].includes(cc), detail: cc },
    { check: 'Dígito de control (Luhn sobre conversión alfanumérica)', ok: fmt && luhnDigits(lettersToDigits(v)) },
  ];
  return { standard: 'ISIN (ISO 6166)', input, value: v, valid: checks.every((c) => c.ok), checks, info: { prefijo: cc, NSIN: v.slice(2, 11) }, confidence: 99 };
}

export function validateLEI(input: string): Validation {
  const v = clean(input);
  const fmt = /^[A-Z0-9]{18}\d{2}$/.test(v);
  const checks = [
    { check: 'Estructura ISO 17442 (20 caracteres alfanuméricos)', ok: fmt, detail: `longitud ${v.length}` },
    { check: 'Dígitos de control MOD 97-10 (ISO 7064)', ok: fmt && mod97(lettersToDigits(v)) === 1 },
  ];
  return { standard: 'LEI (ISO 17442)', input, value: v, valid: checks.every((c) => c.ok), checks, info: { LOU: v.slice(0, 4) }, confidence: 99 };
}

const cusipVal = (c: string) => (/\d/.test(c) ? +c : /[A-Z]/.test(c) ? c.charCodeAt(0) - 55 : c === '*' ? 36 : c === '@' ? 37 : c === '#' ? 38 : -1);

export function validateCUSIP(input: string): Validation {
  const v = input.toUpperCase().replace(/\s/g, '');
  const fmt = /^[A-Z0-9*@#]{8}\d$/.test(v);
  let sum = 0;
  if (fmt) for (let i = 0; i < 8; i++) {
    let n = cusipVal(v[i]);
    if (i % 2 === 1) n *= 2;
    sum += Math.floor(n / 10) + (n % 10);
  }
  const check = (10 - (sum % 10)) % 10;
  const checks = [
    { check: 'Estructura CUSIP (6 emisor + 2 emisión + 1 control)', ok: fmt },
    { check: 'Dígito de control (módulo 10 doble-suma)', ok: fmt && check === +v[8], detail: `esperado ${check}` },
  ];
  return { standard: 'CUSIP (ANSI X9.6)', input, value: v, valid: checks.every((c) => c.ok), checks, info: { emisor: v.slice(0, 6) }, confidence: 99 };
}

export function validateFIGI(input: string): Validation {
  const v = clean(input);
  const fmt = /^[B-DF-HJ-NP-TV-Z]{2}G[B-DF-HJ-NP-TV-Z0-9]{8}\d$/.test(v);
  const badPrefix = ['BS', 'BM', 'GG', 'GB', 'GH', 'KY', 'VG'].includes(v.slice(0, 2));
  let sum = 0;
  if (fmt) for (let i = 0; i < 11; i++) {
    let n = /\d/.test(v[i]) ? +v[i] : v.charCodeAt(i) - 55;
    if (i % 2 === 1) n *= 2;
    sum += String(n).split('').reduce((a, d) => a + +d, 0);
  }
  const check = (10 - (sum % 10)) % 10;
  const checks = [
    { check: 'Estructura FIGI (OMG, 12 caracteres, 3.º = "G", sin vocales)', ok: fmt },
    { check: 'Prefijo permitido (excluye BS, BM, GG, GB, GH, KY, VG)', ok: !badPrefix },
    { check: 'Dígito de control (módulo 10)', ok: fmt && check === +v[11], detail: `esperado ${check}` },
  ];
  return { standard: 'FIGI (OMG)', input, value: v, valid: checks.every((c) => c.ok), checks, info: {}, confidence: 99 };
}

const CLABE_BANKS: Record<string, string> = {
  '002': 'BANAMEX', '006': 'BANCOMEXT', '009': 'BANOBRAS', '012': 'BBVA MÉXICO', '014': 'SANTANDER', '019': 'BANJERCITO',
  '021': 'HSBC', '030': 'BAJÍO', '036': 'INBURSA', '042': 'MIFEL', '044': 'SCOTIABANK', '058': 'BANREGIO', '059': 'INVEX',
  '060': 'BANSI', '062': 'AFIRME', '072': 'BANORTE', '106': 'BANK OF AMERICA', '112': 'BMONEX', '113': 'VE POR MAS',
  '127': 'AZTECA', '128': 'AUTOFIN', '130': 'COMPARTAMOS', '132': 'MULTIVA', '133': 'ACTINVER', '136': 'INTERCAM',
  '137': 'BANCOPPEL', '138': 'ABC CAPITAL', '140': 'CONSUBANCO', '143': 'CIBANCO', '145': 'BBASE', '147': 'BANKAOOL',
  '152': 'BANCREA', '156': 'SABADELL', '166': 'BANSEFI/BIENESTAR', '168': 'HIPOTECARIA FEDERAL', '646': 'STP', '638': 'NU MÉXICO',
  '722': 'MERCADO PAGO W', '659': 'ASP INTEGRA OPC', '684': 'TRANSFER', '706': 'ARCUS', '710': 'NVIO',
};

export function validateCLABE(input: string): Validation {
  const v = input.replace(/\D/g, '');
  const fmt = /^\d{18}$/.test(v);
  const w = [3, 7, 1];
  let sum = 0;
  if (fmt) for (let i = 0; i < 17; i++) sum += (+v[i] * w[i % 3]) % 10;
  const check = (10 - (sum % 10)) % 10;
  const bank = CLABE_BANKS[v.slice(0, 3)];
  const checks = [
    { check: 'Estructura CLABE (18 dígitos)', ok: fmt, detail: `longitud ${v.length}` },
    { check: 'Dígito verificador (ponderación 3-7-1, Banxico)', ok: fmt && check === +v[17], detail: `esperado ${check}` },
    { check: 'Clave de institución en catálogo', ok: !!bank, detail: v.slice(0, 3) },
  ];
  return { standard: 'CLABE (Banxico)', input, value: v, valid: checks.slice(0, 2).every((c) => c.ok), checks,
    info: { banco: bank ?? 'no catalogado', plaza: v.slice(3, 6), cuenta: v.slice(6, 17) }, confidence: 99 };
}

const CURP_DICT = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
export function validateCURP(input: string): Validation {
  const v = input.toUpperCase().replace(/\s/g, '');
  const fmt = /^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HMX](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/.test(v);
  let sum = 0;
  if (fmt) for (let i = 0; i < 17; i++) sum += CURP_DICT.indexOf(v[i]) * (18 - i);
  const check = (10 - (sum % 10)) % 10;
  const checks = [
    { check: 'Estructura CURP (RENAPO)', ok: fmt },
    { check: 'Dígito verificador', ok: fmt && check === +v[17], detail: `esperado ${check}` },
  ];
  return { standard: 'CURP (RENAPO)', input, value: v, valid: checks.every((c) => c.ok), checks,
    info: fmt ? { nacimiento: v.slice(4, 10), sexo: v[10], entidad: v.slice(11, 13) } : {}, confidence: 95 };
}

export function validateRFC(input: string): Validation {
  const v = input.toUpperCase().replace(/[\s\-]/g, '');
  const pm = /^[A-ZÑ&]{3}\d{6}[A-Z\d]{3}$/.test(v);
  const pf = /^[A-ZÑ&]{4}\d{6}[A-Z\d]{3}$/.test(v);
  const d = v.slice(pm ? 3 : 4, pm ? 9 : 10);
  const mm = +d.slice(2, 4), dd = +d.slice(4, 6);
  const dateOk = mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31;
  const checks = [
    { check: 'Estructura RFC (SAT) persona moral (12) o física (13)', ok: pm || pf, detail: pm ? 'persona moral' : pf ? 'persona física' : `longitud ${v.length}` },
    { check: 'Fecha embebida válida (AAMMDD)', ok: (pm || pf) && dateOk, detail: d },
  ];
  return { standard: 'RFC (SAT)', input, value: v, valid: checks.every((c) => c.ok), checks,
    info: { tipo: pm ? 'persona moral' : pf ? 'persona física' : '—', limitación: 'Situación fiscal (lista 69-B) no verificada aquí.' }, confidence: 85 };
}

export const VALIDATORS = {
  IBAN: validateIBAN, BIC: validateBIC, ISIN: validateISIN, LEI: validateLEI, CUSIP: validateCUSIP,
  FIGI: validateFIGI, CLABE: validateCLABE, CURP: validateCURP, RFC: validateRFC,
} as const;
export type ValidatorKind = keyof typeof VALIDATORS;

// 856-FFCI v3.1 — Pipeline §10.1 pasos [1]–[3]: normalización, tokenización,
// transliteración. Transliteración aplicada ANTES de la codificación fonética.
import { pinyin } from 'pinyin-pro';

// BGN/PCGN (ruso) — cirílico → latín
const CYR: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  є: 'ye', і: 'i', ї: 'yi', ґ: 'g', ў: 'w', ј: 'j', љ: 'lj', њ: 'nj', ћ: 'c', ђ: 'dj', џ: 'dz',
};

// ISO 233 / ALA-LC simplificado a ASCII (árabe + persa/dari). Vocales cortas
// no se escriben en árabe: la transliteración es consonántica y se complementa
// con la tabla de equivalencias de tokens (CANON) y con la capa fonética.
const ARB: Record<string, string> = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ء': '', 'ؤ': 'u', 'ئ': 'i', 'ب': 'b', 'ت': 't',
  'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's',
  'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': '', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
  'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'ة': 'a', 'و': 'w', 'ي': 'y', 'ى': 'a',
  'پ': 'p', 'چ': 'ch', 'ژ': 'zh', 'گ': 'g', 'ک': 'k', 'ی': 'y', 'ـ': '',
  'َ': 'a', 'ُ': 'u', 'ِ': 'i', 'ّ': '', 'ْ': '', 'ً': 'an', 'ٌ': 'un', 'ٍ': 'in',
};

// Hebreo (ALA-LC simplificado)
const HEB: Record<string, string> = {
  'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z', 'ח': 'kh', 'ט': 't',
  'י': 'y', 'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's',
  'ע': '', 'פ': 'p', 'ף': 'f', 'צ': 'ts', 'ץ': 'ts', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't',
};

// Griego (ELOT 743 simplificado)
const GRK: Record<string, string> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l',
  μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'f',
  χ: 'ch', ψ: 'ps', ω: 'o',
};

export type Script = 'latin' | 'cyrillic' | 'arabic' | 'hebrew' | 'greek' | 'han' | 'thai' | 'other';

export function detectScripts(s: string): Script[] {
  const set = new Set<Script>();
  for (const ch of s) {
    if (/\p{Script=Latin}/u.test(ch)) set.add('latin');
    else if (/\p{Script=Cyrillic}/u.test(ch)) set.add('cyrillic');
    else if (/\p{Script=Arabic}/u.test(ch)) set.add('arabic');
    else if (/\p{Script=Hebrew}/u.test(ch)) set.add('hebrew');
    else if (/\p{Script=Greek}/u.test(ch)) set.add('greek');
    else if (/\p{Script=Han}/u.test(ch)) set.add('han');
    else if (/\p{Script=Thai}/u.test(ch)) set.add('thai');
  }
  return [...set];
}

/** Transliteración a latín. Devuelve el texto y el estándar aplicado. */
export function transliterate(input: string): { text: string; standards: string[] } {
  const standards = new Set<string>();
  let s = input.normalize('NFC');
  if (/\p{Script=Han}/u.test(s)) {
    s = s.replace(/\p{Script=Han}+/gu, (m) => ' ' + pinyin(m, { toneType: 'none', type: 'array' }).join(' ') + ' ');
    standards.add('Pinyin');
  }
  let out = '';
  for (const ch of s) {
    const lc = ch.toLowerCase();
    if (lc in CYR) { out += CYR[lc]; standards.add('BGN/PCGN'); }
    else if (ch in ARB) { out += ARB[ch]; standards.add('ISO 233 / ALA-LC'); }
    else if (ch in HEB) { out += HEB[ch]; standards.add('ALA-LC (hebreo)'); }
    else if (lc in GRK) { out += GRK[lc]; standards.add('ELOT 743'); }
    else out += ch;
  }
  return { text: out, standards: [...standards] };
}

const TITLES = new Set([
  'mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'sir', 'lic', 'ing', 'sr', 'sra', 'srta', 'don', 'dona',
  'sheikh', 'shaykh', 'sheik', 'haji', 'hajji', 'mullah', 'maulana', 'imam', 'general', 'gen',
  'colonel', 'col', 'major', 'capt', 'captain', 'admiral', 'brigadier', 'lieutenant', 'lt',
]);

// Sufijos societarios (§2.6.3 Persona Moral: expansión de sufijos)
const LEGAL_SUFFIX = [
  'sociedad anonima de capital variable', 'sa de cv', 's de rl de cv', 's de rl', 'sapi de cv', 'sab de cv',
  'company limited', 'co ltd', 'limited liability company', 'llc', 'ltd', 'limited', 'inc', 'incorporated',
  'corp', 'corporation', 'company', 'compagnie', 'cie', 'societe', 'gmbh', 'ag', 'sa', 'sas', 'sarl',
  'srl', 'spa', 'bv', 'nv', 'plc', 'lp', 'llp', 'pte', 'pty', 'oy', 'ab', 'as', 'kft', 'ooo', 'oao',
  'zao', 'pao', 'jsc', 'ojsc', 'cjsc', 'fze', 'fzco', 'fzc', 'organization', 'organisation', 'fund',
  'foundation', 'fundacion', 'group', 'grupo', 'holding', 'holdings', 'co',
];

// Familias de transliteración latina (Mohammed / Muhammad / Mohamed / ...)
const CANON_GROUPS: string[][] = [
  ['muhammad', 'mohammed', 'mohamed', 'muhammed', 'mohammad', 'mohamad', 'muhamad', 'mohamud', 'mahomed', 'mehmet', 'mohd', 'muhammet'],
  ['ahmad', 'ahmed', 'ahmet', 'akhmed'],
  ['abdul', 'abdel', 'abdal', 'abd'],
  ['husayn', 'hussein', 'hussain', 'husain', 'hossein', 'hosein', 'huseyin', 'husein'],
  ['hasan', 'hassan', 'hasson'],
  ['usama', 'osama', 'oussama', 'asama', 'usamah', 'osamah'],
  ['bin', 'ben', 'ibn', 'bn', 'ibin'],
  ['yusuf', 'yousef', 'youssef', 'yousuf', 'yusef', 'yosef'],
  ['ali', 'aly'],
  ['umar', 'omar', 'omer'],
  ['uthman', 'othman', 'osman', 'usman'],
  ['khalid', 'khaled', 'halid'],
  ['said', 'saeed', 'sayed', 'sayyid', 'saiid'],
  ['abu', 'abou', 'abo'],
  ['ibrahim', 'ebrahim', 'ibraheem'],
  ['mustafa', 'mostafa', 'moustafa', 'mustapha'],
  ['qaddafi', 'gaddafi', 'kadhafi', 'gadhafi', 'qadhafi', 'kaddafi', 'qathafi'],
  ['al', 'el', 'ul', 'ad', 'ar', 'as', 'at', 'az', 'an', 'ash'],
  ['aleksandr', 'alexander', 'aleksander', 'alexandr', 'oleksandr'],
  ['sergey', 'sergei', 'serhiy', 'serguei'],
  ['yuri', 'yuriy', 'iouri', 'yury'],
  ['dmitry', 'dmitri', 'dmitriy', 'dmytro'],
  ['evgeny', 'yevgeny', 'evgeniy', 'yevgeniy', 'evgueni'],
  ['zhang', 'chang'], ['wang', 'wong'], ['li', 'lee'], ['chen', 'chan'],
];
const CANON = new Map<string, string>();
for (const g of CANON_GROUPS) for (const v of g) CANON.set(v, g[0]);

export function stripDiacritics(s: string): string {
  return s.normalize('NFKD').replace(/\p{M}+/gu, '');
}

/** [1] Normalización Unicode NFC→NFKD, minúsculas, sin diacríticos, sin títulos. */
export function normalizeName(input: string, opts: { entity?: boolean } = {}): string {
  const { text } = transliterate(input);
  let s = stripDiacritics(text).toLowerCase();
  s = s.replace(/[’'`´.]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  let tokens = s.split(' ').filter(Boolean).filter((t) => !TITLES.has(t));
  if (opts.entity) tokens = stripLegalSuffix(tokens);
  return tokens.join(' ');
}

export function stripLegalSuffix(tokens: string[]): string[] {
  let joined = ' ' + tokens.join(' ') + ' ';
  for (const suf of LEGAL_SUFFIX) {
    const re = new RegExp(` ${suf}(?= )`, 'g');
    joined = joined.replace(re, ' ');
  }
  const out = joined.trim().split(/\s+/).filter(Boolean);
  return out.length ? out : tokens;
}

/** [2] Tokenización (espacios, guiones, comas ya colapsados por normalizeName). */
export function tokenize(normalized: string): string[] {
  return normalized.split(' ').filter((t) => t.length > 0);
}

/** Forma canónica: familias de transliteración unificadas + tokens ordenados. */
export function canonical(normalized: string): string {
  return tokenize(normalized)
    .map((t) => CANON.get(t) ?? t)
    .filter((t) => t !== 'al')
    .sort()
    .join(' ');
}

export function canonToken(t: string): string {
  return CANON.get(t) ?? t;
}

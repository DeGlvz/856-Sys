// 856-FFCI v3.1 — Algoritmos de similitud (equivalentes a jellyfish, BSD)
// Implementación propia sin dependencias: Jaro, Jaro-Winkler, Levenshtein,
// Damerau-Levenshtein (OSA), Soundex, Metaphone, NYSIIS.

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  let cur = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[b.length];
}

export function damerauLevenshtein(a: string, b: string): number {
  const d: number[][] = [];
  for (let i = 0; i <= a.length; i++) d.push([i]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

export function jaro(s1: string, s2: string): number {
  if (s1 === s2) return s1.length ? 1 : 0;
  const l1 = s1.length, l2 = s2.length;
  if (!l1 || !l2) return 0;
  const range = Math.max(0, Math.floor(Math.max(l1, l2) / 2) - 1);
  const m1 = new Array(l1).fill(false);
  const m2 = new Array(l2).fill(false);
  let matches = 0;
  for (let i = 0; i < l1; i++) {
    const lo = Math.max(0, i - range), hi = Math.min(i + range + 1, l2);
    for (let j = lo; j < hi; j++) {
      if (m2[j] || s1[i] !== s2[j]) continue;
      m1[i] = m2[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let t = 0, k = 0;
  for (let i = 0; i < l1; i++) {
    if (!m1[i]) continue;
    while (!m2[k]) k++;
    if (s1[i] !== s2[k]) t++;
    k++;
  }
  t /= 2;
  return (matches / l1 + matches / l2 + (matches - t) / matches) / 3;
}

export function jaroWinkler(s1: string, s2: string, p = 0.1): number {
  const j = jaro(s1, s2);
  let prefix = 0;
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  return j + prefix * p * (1 - j);
}

const SDX: Record<string, string> = {
  b: '1', f: '1', p: '1', v: '1',
  c: '2', g: '2', j: '2', k: '2', q: '2', s: '2', x: '2', z: '2',
  d: '3', t: '3', l: '4', m: '5', n: '5', r: '6',
};

/** Soundex americano (las letras h/w no separan códigos iguales). */
export function soundex(word: string): string {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return '';
  let out = w[0].toUpperCase();
  let last = SDX[w[0]] ?? '';
  for (let i = 1; i < w.length && out.length < 4; i++) {
    const ch = w[i];
    const code = SDX[ch];
    if (code) {
      if (code !== last) out += code;
      last = code;
    } else if (ch !== 'h' && ch !== 'w') {
      last = '';
    }
  }
  return out.padEnd(4, '0');
}

/** Metaphone original (Lawrence Philips, 1990). */
export function metaphone(word: string): string {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return '';
  // Reglas iniciales
  if (/^(kn|gn|pn|ae|wr)/.test(w)) w = w.slice(1);
  if (w[0] === 'x') w = 's' + w.slice(1);
  if (w.startsWith('wh')) w = 'w' + w.slice(2);
  const isV = (c?: string) => !!c && 'aeiou'.includes(c);
  let out = '';
  for (let i = 0; i < w.length; i++) {
    const c = w[i], prev = w[i - 1], next = w[i + 1], next2 = w[i + 2];
    if (c === prev && c !== 'c') continue;
    switch (c) {
      case 'a': case 'e': case 'i': case 'o': case 'u':
        if (i === 0) out += c.toUpperCase();
        break;
      case 'b':
        if (!(prev === 'm' && i === w.length - 1)) out += 'B';
        break;
      case 'c':
        if (next === 'i' && next2 === 'a') out += 'X';
        else if (next === 'h') { out += prev === 's' ? 'K' : 'X'; i++; }
        else if (next && 'iey'.includes(next)) { if (prev !== 's') out += 'S'; }
        else out += 'K';
        break;
      case 'd':
        if (next === 'g' && next2 && 'eiy'.includes(next2)) { out += 'J'; i++; }
        else out += 'T';
        break;
      case 'g':
        if (next === 'h' && !(i + 2 >= w.length || isV(next2))) break;
        if (next === 'n' && (i + 2 === w.length || (next2 === 'e' && w[i + 3] === 'd' && i + 4 === w.length))) break;
        if (next && 'iey'.includes(next) && prev !== 'g') out += 'J';
        else out += 'K';
        break;
      case 'h':
        if (isV(next) && !(prev && 'csptg'.includes(prev))) out += 'H';
        break;
      case 'k':
        if (prev !== 'c') out += 'K';
        break;
      case 'p':
        if (next === 'h') { out += 'F'; i++; } else out += 'P';
        break;
      case 'q': out += 'K'; break;
      case 's':
        if (next === 'h') { out += 'X'; i++; }
        else if (next === 'i' && next2 && 'oa'.includes(next2)) out += 'X';
        else out += 'S';
        break;
      case 't':
        if (next === 'i' && next2 && 'oa'.includes(next2)) out += 'X';
        else if (next === 'h') { out += '0'; i++; }
        else if (!(next === 'c' && next2 === 'h')) out += 'T';
        break;
      case 'v': out += 'F'; break;
      case 'w': case 'y':
        if (isV(next)) out += c.toUpperCase();
        break;
      case 'x': out += 'KS'; break;
      case 'z': out += 'S'; break;
      default: out += c.toUpperCase(); // f j l m n r
    }
  }
  return out;
}

/** NYSIIS (New York State Identification and Intelligence System). */
export function nysiis(word: string): string {
  let w = word.toUpperCase().replace(/[^A-Z]/g, '');
  if (!w) return '';
  const pre: [RegExp, string][] = [
    [/^MAC/, 'MCC'], [/^KN/, 'NN'], [/^K/, 'C'], [/^PH/, 'FF'], [/^PF/, 'FF'], [/^SCH/, 'SSS'],
  ];
  for (const [r, s] of pre) if (r.test(w)) { w = w.replace(r, s); break; }
  const suf: [RegExp, string][] = [[/(EE|IE)$/, 'Y'], [/(DT|RT|RD|NT|ND)$/, 'D']];
  for (const [r, s] of suf) if (r.test(w)) { w = w.replace(r, s); break; }
  const first = w[0];
  let key = first;
  const chars = w.split('');
  const isV = (c?: string) => !!c && 'AEIOU'.includes(c);
  for (let i = 1; i < chars.length; i++) {
    let c = chars[i];
    let rep: string;
    if (c === 'E' && chars[i + 1] === 'V') { rep = 'AF'; chars[i + 1] = 'F'; }
    else if (isV(c)) rep = 'A';
    else if (c === 'Q') rep = 'G';
    else if (c === 'Z') rep = 'S';
    else if (c === 'M') rep = 'N';
    else if (c === 'K') rep = chars[i + 1] === 'N' ? 'N' : 'C';
    else if (c === 'S' && chars[i + 1] === 'C' && chars[i + 2] === 'H') { rep = 'SSS'; chars[i + 1] = 'S'; chars[i + 2] = 'S'; }
    else if (c === 'P' && chars[i + 1] === 'H') { rep = 'FF'; chars[i + 1] = 'F'; }
    else if (c === 'H' && (!isV(chars[i - 1]) || !isV(chars[i + 1]))) rep = chars[i - 1];
    else if (c === 'W' && isV(chars[i - 1])) rep = chars[i - 1];
    else rep = c;
    chars[i] = rep[rep.length - 1];
    if (rep.length > 1) c = rep; else c = rep;
    for (const r of c) if (key[key.length - 1] !== r) key += r;
  }
  if (key.length > 1 && key.endsWith('S')) key = key.slice(0, -1);
  if (key.endsWith('AY')) key = key.slice(0, -2) + 'Y';
  if (key.length > 1 && key.endsWith('A')) key = key.slice(0, -1);
  return key;
}

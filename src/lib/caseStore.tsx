import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import { mergeIOCs, newCase, type CaseState, type Evidence, type Finding, type NetRecord } from '../../shared/case';
import type { IOCSet, TimelineEvent } from '../../shared/iocs';
import type { ScreeningResult } from '../../shared/types';

type Action =
  | { t: 'reset' }
  | { t: 'meta'; mode?: string; object?: string }
  | { t: 'evidence'; e: Evidence }
  | { t: 'findings'; f: Finding[] }
  | { t: 'removeFinding'; id: string }
  | { t: 'screening'; r: ScreeningResult }
  | { t: 'net'; n: NetRecord }
  | { t: 'iocs'; i: Partial<IOCSet> }
  | { t: 'timeline'; e: TimelineEvent[] }
  | { t: 'source'; ref: string; url?: string };

const KEY = 'ffci.case.v1';

function dedupeFindings(prev: Finding[], add: Finding[]) {
  const sig = (f: Finding) => `${f.domain}|${f.field}|${f.observed}`;
  const seen = new Set(prev.map(sig));
  return [...prev, ...add.filter((f) => !seen.has(sig(f)) && (seen.add(sig(f)), true))];
}

function reducer(s: CaseState, a: Action): CaseState {
  switch (a.t) {
    case 'reset': return newCase();
    case 'meta': return { ...s, mode: a.mode ?? s.mode, object: a.object ?? s.object };
    case 'evidence': return s.evidence.some((e) => e.sha256 === a.e.sha256) ? s : { ...s, evidence: [...s.evidence, a.e] };
    case 'findings': return { ...s, findings: dedupeFindings(s.findings, a.f) };
    case 'removeFinding': return { ...s, findings: s.findings.filter((f) => f.id !== a.id) };
    case 'screening': return { ...s, screenings: [...s.screenings.filter((x) => x.query.name !== a.r.query.name || x.query.kind !== a.r.query.kind), a.r] };
    case 'net': return { ...s, net: [...s.net.filter((x) => x.target !== a.n.target), a.n] };
    case 'iocs': return { ...s, iocs: mergeIOCs(s.iocs, a.i) };
    case 'timeline': {
      const seen = new Set(s.timeline.map((x) => x.ts + x.event));
      return { ...s, timeline: [...s.timeline, ...a.e.filter((x) => !seen.has(x.ts + x.event))].sort((x, y) => x.ts.localeCompare(y.ts)) };
    }
    case 'source': return { ...s, sources: [...s.sources, { ref: a.ref, url: a.url, consulted_at: new Date().toISOString() }] };
  }
}

function load(): CaseState {
  try { const v = localStorage.getItem(KEY); if (v) return { ...newCase(), ...JSON.parse(v) }; } catch { /* */ }
  return newCase();
}

const Ctx = createContext<{ state: CaseState; dispatch: (a: Action) => void } | null>(null);

export function CaseProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* cuota o modo privado */ } }, [state]);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useCase() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCase fuera de CaseProvider');
  return c;
}

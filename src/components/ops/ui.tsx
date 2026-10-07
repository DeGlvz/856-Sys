import type { ReactNode } from 'react';
import type { Severity } from '../../../shared/case';
import type { MatchClass } from '../../../shared/types';

export function Panel({ title, icon, children, right }: { title: string; icon: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-800 bg-[#0d1220] p-5">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 tracking-wider">
          <i className={`fas ${icon} text-cyan-400`}></i>{title}
        </h3>
        {right}
      </div>
      {children}
    </section>
  );
}

export function ModuleHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <i className={`fas ${icon} text-cyan-500`}></i>
      <h2 className="text-lg font-bold text-white tracking-wider">{title}</h2>
      <span className="text-xs text-gray-500">{subtitle}</span>
    </div>
  );
}

export function Btn({ children, onClick, disabled, kind = 'primary', type = 'button' }: { children: ReactNode; onClick?: () => void; disabled?: boolean; kind?: 'primary' | 'ghost' | 'danger'; type?: 'button' | 'submit' }) {
  const cls = kind === 'primary'
    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/30'
    : kind === 'danger' ? 'bg-red-500/10 border-red-500/40 text-red-300 hover:bg-red-500/20'
    : 'bg-white/5 border-gray-700 text-gray-300 hover:bg-white/10';
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`px-4 py-2 rounded border text-xs font-bold tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}>
      {children}
    </button>
  );
}

export const inputCls = 'w-full bg-[#0a0e17] border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-cyan-500 focus:outline-none';

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-400 block mb-1">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-gray-600 block mt-1">{hint}</span>}
    </label>
  );
}

const SEV: Record<string, string> = {
  SUSTANCIAL: 'bg-red-500/15 text-red-300 border-red-500/40',
  RELEVANTE: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  MENOR: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  'SIN NO-CONFORMIDADES': 'bg-green-500/15 text-green-300 border-green-500/40',
  CLEAR: 'bg-green-500/15 text-green-300 border-green-500/40',
  'POTENTIAL MATCH': 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40',
  'LIKELY MATCH': 'bg-orange-500/15 text-orange-300 border-orange-500/40',
  'CONFIRMED MATCH': 'bg-red-500/15 text-red-300 border-red-500/40',
  ok: 'bg-green-500/15 text-green-300 border-green-500/40',
  live: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
  error: 'bg-red-500/15 text-red-300 border-red-500/40',
  pending: 'bg-gray-500/15 text-gray-300 border-gray-500/40',
};

export function Badge({ v }: { v: Severity | MatchClass | string }) {
  return <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold tracking-wider whitespace-nowrap ${SEV[v] ?? SEV.pending}`}>{v}</span>;
}

export function ErrorBox({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300"><i className="fas fa-triangle-exclamation mr-2"></i>{msg}</div>;
}

export function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex gap-3 text-xs py-1 border-b border-gray-800/60">
      <span className="text-gray-500 w-44 shrink-0">{k}</span>
      <span className="text-gray-200 break-all">{v ?? '—'}</span>
    </div>
  );
}

export function Spinner() {
  return <i className="fas fa-circle-notch fa-spin text-cyan-400"></i>;
}

import { useState } from 'react';
import Header from './components/Header';
import AgentGrid from './components/AgentGrid';
import WorkflowPanel from './components/WorkflowPanel';
import AliasPipeline from './components/AliasPipeline';
import WatchlistTable from './components/WatchlistTable';
import OutputPreview from './components/OutputPreview';
import CapabilitiesPanel from './components/CapabilitiesPanel';
import { CaseProvider, useCase } from './lib/caseStore';
import CaseModule from './components/ops/CaseModule';
import AliasModule from './components/ops/AliasModule';
import DocModule from './components/ops/DocModule';
import NetModule from './components/ops/NetModule';
import CyberModule from './components/ops/CyberModule';
import DictamenModule from './components/ops/DictamenModule';
import SourcesModule from './components/ops/SourcesModule';

const TABS = [
  { id: 'case', label: 'CASO', icon: 'fa-folder-open' },
  { id: 'alias', label: 'ALIAS / LISTAS', icon: 'fa-fingerprint' },
  { id: 'doc', label: 'DOCUMENTAL', icon: 'fa-file-shield' },
  { id: 'net', label: 'RED', icon: 'fa-network-wired' },
  { id: 'cyber', label: 'SEGURIDAD', icon: 'fa-user-shield' },
  { id: 'dictamen', label: 'DICTAMEN', icon: 'fa-file-lines' },
  { id: 'sources', label: 'FUENTES', icon: 'fa-database' },
  { id: 'spec', label: 'ESPECIFICACIÓN', icon: 'fa-book' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export default function App() {
  return <CaseProvider><Shell /></CaseProvider>;
}

function Shell() {
  const [tab, setTab] = useState<Tab>('case');
  const [spec, setSpec] = useState<'overview' | 'agents' | 'pipeline' | 'watchlist' | 'output'>('overview');
  const { state } = useCase();

  return (
    <div className="min-h-screen bg-[#0a0e17] text-gray-100 font-mono">
      <Header />
      <nav className="border-b border-cyan-900/30 bg-[#0d1220]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2 items-center">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded text-xs font-bold tracking-wider transition-all whitespace-nowrap ${
                  tab === t.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'}`}>
                <i className={`fas ${t.icon} mr-2`}></i>{t.label}
                {t.id === 'case' && state.findings.length > 0 && <span className="ml-2 px-1.5 rounded bg-cyan-500/30 text-cyan-200">{state.findings.length}</span>}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {tab === 'case' && <CaseModule go={(t) => setTab(t as Tab)} />}
        {tab === 'alias' && <AliasModule />}
        {tab === 'doc' && <DocModule />}
        {tab === 'net' && <NetModule />}
        {tab === 'cyber' && <CyberModule />}
        {tab === 'dictamen' && <DictamenModule />}
        {tab === 'sources' && <SourcesModule />}
        {tab === 'spec' && (
          <div className="space-y-8">
            <div className="flex gap-2 flex-wrap">
              {([['overview', 'VISIÓN GENERAL'], ['agents', 'AGENTES'], ['pipeline', 'PIPELINE ALIAS'], ['watchlist', 'LISTAS'], ['output', 'FORMATO DICTAMEN']] as const).map(([id, l]) => (
                <button key={id} onClick={() => setSpec(id)} className={`px-3 py-1.5 rounded text-[11px] border ${spec === id ? 'border-cyan-500/50 text-cyan-300 bg-cyan-500/10' : 'border-gray-800 text-gray-500'}`}>{l}</button>
              ))}
            </div>
            {spec === 'overview' && <><HeroSection /><AgentGrid /><WorkflowPanel /><CapabilitiesPanel /></>}
            {spec === 'agents' && <AgentGrid expanded />}
            {spec === 'pipeline' && <AliasPipeline />}
            {spec === 'watchlist' && <WatchlistTable />}
            {spec === 'output' && <OutputPreview />}
          </div>
        )}
      </main>

      <footer className="border-t border-cyan-900/20 py-6 text-center text-xs text-gray-600">
        <p>856-FFCI v3.1 — Sistema Multi-Agente de Grado Pericial</p>
        <p className="mt-1">Dictámenes técnicos verificables · la calificación jurídica corresponde al receptor</p>
      </footer>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-cyan-900/30 bg-gradient-to-br from-[#0d1220] to-[#0a1628] p-8">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(6,182,212,0.1) 50px, rgba(6,182,212,0.1) 51px),
                           repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(6,182,212,0.1) 50px, rgba(6,182,212,0.1) 51px)`
        }}></div>
      </div>
      <div className="relative">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <i className="fas fa-shield-halved text-2xl text-white"></i>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">856 — FFCI</h1>
            <p className="text-cyan-400 text-sm tracking-wider">FINANCIAL FORENSIC & CYBER INTELLIGENCE</p>
          </div>
        </div>
        <p className="text-gray-400 max-w-3xl leading-relaxed text-sm">
          Sistema Multi-Agente de Grado Pericial que produce dictámenes técnicos verificables. 
          Cada aseveración se ancla a: <span className="text-cyan-300">fuente citada</span> · <span className="text-cyan-300">método de verificación</span> · <span className="text-cyan-300">nivel de confianza cuantificado</span>.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs">v3.1</span>
          <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs">8 AGENTES</span>
          <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs">12+ LISTAS</span>
          <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">5 DOMINIOS</span>
          <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs">SHA-256 CUSTODY</span>
        </div>
      </div>
    </div>
  );
}

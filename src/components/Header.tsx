export default function Header() {
  return (
    <header className="border-b border-cyan-900/20 bg-[#0a0e17]">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center">
              <i className="fas fa-shield-halved text-white text-sm"></i>
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0e17] animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wider">856-FFCI</h1>
            <p className="text-[10px] text-gray-500 tracking-widest">FORENSIC INTELLIGENCE SYSTEM</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
            <i className="fas fa-clock text-cyan-600"></i>
            <span>v3.1</span>
            <span className="text-gray-700">|</span>
            <span className="text-green-500">● OPERATIONAL</span>
          </div>
          <div className="px-3 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
            PERITAJE TÉCNICO
          </div>
        </div>
      </div>
    </header>
  );
}

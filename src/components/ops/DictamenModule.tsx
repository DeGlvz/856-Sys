import { useMemo, useState } from 'react';
import { useCase } from '../../lib/caseStore';
import { downloadText } from '../../lib/api';
import { buildDictamen, dictamenFilename } from '../../../shared/dictamen';
import { Btn, ModuleHeader, Panel } from './ui';

export default function DictamenModule() {
  const { state } = useCase();
  const [at, setAt] = useState(() => new Date());
  const text = useMemo(() => buildDictamen(state, at), [state, at]);
  const name = dictamenFilename(state, at);
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-6">
      <ModuleHeader icon="fa-file-lines" title="DICTAMEN TÉCNICO" subtitle="Formato obligatorio §5 · texto plano" />
      <Panel title={name} icon="fa-file-signature" right={
        <div className="flex gap-2">
          <Btn kind="ghost" onClick={() => setAt(new Date())}><i className="fas fa-clock-rotate-left mr-2"></i>ACTUALIZAR TIMESTAMP</Btn>
          <Btn kind="ghost" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* */ } }}>
            <i className="fas fa-copy mr-2"></i>{copied ? 'COPIADO' : 'COPIAR'}</Btn>
          <Btn onClick={() => downloadText(name, text)}><i className="fas fa-download mr-2"></i>DESCARGAR .TXT</Btn>
        </div>}>
        <pre className="text-[11px] leading-relaxed text-gray-200 bg-[#05080f] border border-gray-800 rounded p-4 overflow-x-auto max-h-[70vh] whitespace-pre">{text}</pre>
      </Panel>
    </div>
  );
}

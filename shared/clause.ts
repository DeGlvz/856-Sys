// Cláusula obligatoria de no-determinación (§6.2)
export const NO_DETERMINATION = (lists: { name: string; downloaded_at: string | null; sha256: string | null }[]) =>
  lists.map((l) => `Listas consultadas: ${l.name}, fecha de descarga: ${l.downloaded_at ?? 'N/D'}, versión del dataset: ${l.sha256 ?? 'N/D'}.`).join('\n') +
  '\nLa ausencia de coincidencia en las listas consultadas no constituye una determinación de ausencia de riesgo.';


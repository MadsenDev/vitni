import React, { useEffect, useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const fieldClass = 'w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

type PersonItem = { id: string; label: string };

export function ExportReportModal({ isOpen, onClose }: Props) {
  const [template, setTemplate] = useState<'full' | 'selection' | 'timeline' | 'person'>('full');
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [running, setRunning] = useState(false);
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [personId, setPersonId] = useState('');
  const [useAI, setUseAI] = useState(false);
  const [aiProvider, setAiProvider] = useState<'ollama' | 'openai'>('ollama');
  const [people, setPeople] = useState<PersonItem[]>([]);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [exportStage, setExportStage] = useState<string | null>(null);
  const [exportLog, setExportLog] = useState<string[]>([]);
  const [narrativePreview, setNarrativePreview] = useState<string | null>(null);
  const [openAIStatus, setOpenAIStatus] = useState<{ hasKey: boolean } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const [
          defaultTemplate,
          defaultIncludeAttachments,
          defaultUseAI,
          defaultAIProvider,
          graph
        ] = await Promise.all([
          window.piBridge.getProjectSetting<'full' | 'selection' | 'timeline' | 'person'>('report_default_template'),
          window.piBridge.getProjectSetting<boolean>('report_default_include_attachments'),
          window.piBridge.getProjectSetting<boolean>('report_default_use_ai'),
          window.piBridge.getProjectSetting<'ollama' | 'openai'>('report_default_ai_provider'),
          window.piBridge.loadGraph()
        ]);
        setTemplate(
          defaultTemplate === 'selection' || defaultTemplate === 'timeline' || defaultTemplate === 'person'
            ? defaultTemplate
            : 'full'
        );
        setIncludeAttachments(typeof defaultIncludeAttachments === 'boolean' ? defaultIncludeAttachments : true);
        setUseAI(typeof defaultUseAI === 'boolean' ? defaultUseAI : false);
        setAiProvider(defaultAIProvider === 'openai' ? 'openai' : 'ollama');
        const persons = graph.nodes
          .filter(n => (n.type || '').toLowerCase().includes('person'))
          .map(n => ({ id: n.id, label: n.label || n.id }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setPeople(persons);
        if (persons.length && !personId) setPersonId(persons[0].id);
      } catch {
        setPeople([]);
      }
      try {
        setOpenAIStatus(await window.piBridge.openAIStatus());
      } catch {
        setOpenAIStatus(null);
      }
    })();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribeLocalAI = window.piAI.onLocalAISetupProgress((payload) => {
      setExportMsg(payload.message);
      setExportLog((current) => [...current, payload.message].slice(-12));
    });
    const unsubscribeReport = window.piAI.onReportGenerateProgress((payload) => {
      if (payload.stage === 'writing_narrative_preview') {
        setExportStage('Writing with AI…');
        setNarrativePreview(payload.message);
        return;
      }
      setExportStage(reportStageLabel(payload.stage));
      setExportMsg(payload.message);
      if (payload.stage !== 'writing_narrative') {
        setNarrativePreview(null);
      }
      setExportLog((current) => [...current, payload.message].slice(-20));
    });
    return () => {
      unsubscribeLocalAI();
      unsubscribeReport();
    };
  }, [isOpen]);

  const runExport = async () => {
    try {
      setRunning(true);
      setExportStage('Preparing…');
      setExportMsg(null);
      setExportLog([]);
      setNarrativePreview(null);
      setResultPath(null);

      // Optionally ensure AI is ready
      if (useAI && aiProvider === 'ollama') {
        setExportMsg('Checking local AI runtime…');
        const result = await window.piBridge.aiSetup();
        if (!result.ok) {
          throw new Error(result.message || 'Local AI setup failed.');
        }
      }
      if (useAI && aiProvider === 'openai') {
        const cloudStatus = await window.piBridge.openAIStatus();
        setOpenAIStatus(cloudStatus);
        if (!cloudStatus.hasKey) {
          throw new Error('Cloud AI is selected but no OpenAI API key is configured in Settings.');
        }
      }

      setExportStage('Generating report…');
      setExportMsg('Generating report…');
      const res = await window.piBridge.reportGenerate({
        template,
        includeAttachments,
        personId: template === 'person' ? personId || undefined : undefined,
        useAI,
        aiProvider: useAI ? aiProvider : undefined
      });
      setResultPath(res.outputDir);
      setExportStage('Finalizing…');
      setExportMsg('Finalizing…');

      if (useAI && aiProvider === 'ollama') {
        const keepAlive = await window.piBridge.getDeviceSetting<boolean>('ai:ollama:keepAlive');
        if (!keepAlive) {
          await window.piBridge.aiStop();
        }
      }

      setExportStage('Done');
      setExportMsg('Done');
      setTimeout(() => setExportMsg(null), 1200);
    } catch (e) {
      setExportStage('Export failed');
      setExportMsg((e as Error).message || 'Export failed');
    } finally {
      setRunning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold text-white">Export Report</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-300">Template</label>
                <select className={fieldClass} value={template} onChange={e => setTemplate(e.target.value as any)}>
                  <option value="full">Full Report</option>
                  <option value="selection">Selection</option>
                  <option value="timeline">Timeline</option>
                  <option value="person">Person Profile</option>
                </select>
              </div>
              {template === 'person' && (
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Person</label>
                  <select className={fieldClass} value={personId} onChange={e => setPersonId(e.target.value)}>
                    {people.length === 0 ? (
                      <option value="">No persons found</option>
                    ) : (
                      people.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))
                    )}
                  </select>
                </div>
              )}
              <label className="flex items-center gap-2 text-slate-300">
                <input type="checkbox" className="h-4 w-4" checked={useAI} onChange={e => setUseAI(e.target.checked)} />
                Use AI-written report
              </label>
              {useAI && (
                <div className="space-y-3 rounded-md border border-slate-700 bg-slate-800/60 p-3">
                  <div>
                    <label className="mb-1 block text-sm text-slate-300">AI Provider</label>
                    <select className={fieldClass} value={aiProvider} onChange={e => setAiProvider(e.target.value as 'ollama' | 'openai')}>
                      <option value="ollama">Local (Ollama)</option>
                      <option value="openai">Cloud (OpenAI API)</option>
                    </select>
                  </div>
                  <p className="text-xs text-slate-400">
                    {aiProvider === 'openai'
                      ? openAIStatus?.hasKey
                        ? 'Cloud AI is configured. Export will send report facts to OpenAI only for this run.'
                        : 'No OpenAI API key is configured yet. Add one in Settings -> Cloud AI Reports.'
                      : 'Local AI uses your configured Ollama endpoint and model.'}
                  </p>
                </div>
              )}
              <label className="flex items-center gap-2 text-slate-300">
                <input type="checkbox" className="h-4 w-4" checked={includeAttachments} onChange={e => setIncludeAttachments(e.target.checked)} />
                Include attachments
              </label>
              {(exportStage || exportMsg) && (
                <div className="space-y-2 rounded border border-slate-700 bg-slate-800 p-3 text-sm text-slate-200">
                  {exportStage && <div className="font-medium text-white">{exportStage}</div>}
                  {exportMsg && <div>{exportMsg}</div>}
                  {narrativePreview && (
                    <div className="rounded border border-emerald-500/20 bg-slate-950/80 p-2 text-xs text-emerald-100 whitespace-pre-line">
                      {narrativePreview}
                    </div>
                  )}
                  {exportLog.length > 0 && (
                    <div className="max-h-32 overflow-y-auto rounded border border-slate-700 bg-slate-950/70 p-2 text-xs text-slate-300">
                      {exportLog.join('\n')}
                    </div>
                  )}
                </div>
              )}
              {resultPath && (
                <div className="rounded border border-slate-700 bg-slate-800 p-3 text-sm text-slate-200">
                  Exported to: <span className="text-sky-300">{resultPath}</span>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={onClose} className="rounded bg-slate-700 px-4 py-2 text-white hover:bg-slate-600">Close</button>
              <button onClick={runExport} disabled={running || (template === 'person' && !personId)} className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:opacity-50">{running ? 'Exporting…' : 'Export'}</button>
            </div>
      </div>
    </div>
  );
}

function reportStageLabel(stage: string) {
  switch (stage) {
    case 'preparing':
      return 'Preparing…';
    case 'loading_data':
      return 'Loading data…';
    case 'writing_narrative':
      return 'Writing with AI…';
    case 'writing_files':
      return 'Writing files…';
    case 'copying_attachments':
      return 'Copying attachments…';
    case 'done':
      return 'Done';
    default:
      return 'Generating report…';
  }
}

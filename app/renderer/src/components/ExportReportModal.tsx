import React, { useEffect, useState } from 'react';
import { ThemedButton, ThemedCard, ThemedPanel, ThemedSection, ThemedSelect } from '@renderer/features/personalization/primitives';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type PersonItem = { id: string; label: string };
type ReportTemplate = 'full' | 'selection' | 'timeline' | 'person';

export function ExportReportModal({ isOpen, onClose }: Props) {
  const [template, setTemplate] = useState<ReportTemplate>('full');
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
          window.piBridge.getProjectSetting<ReportTemplate>('report_default_template'),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'var(--overlay-backdrop)' }}>
      <ThemedPanel elevated className="w-full max-w-lg rounded-[28px] p-6">
            <h2 className="mb-4 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Export Report</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--text-muted)' }}>Template</label>
                <ThemedSelect
                  className="w-full"
                  value={template}
                  onChange={(event) => setTemplate(event.target.value as ReportTemplate)}
                >
                  <option value="full">Full Report</option>
                  <option value="selection">Selection</option>
                  <option value="timeline">Timeline</option>
                  <option value="person">Person Profile</option>
                </ThemedSelect>
              </div>
              {template === 'person' && (
                <div>
                  <label className="mb-1 block text-sm" style={{ color: 'var(--text-muted)' }}>Person</label>
                  <ThemedSelect className="w-full" value={personId} onChange={e => setPersonId(e.target.value)}>
                    {people.length === 0 ? (
                      <option value="">No persons found</option>
                    ) : (
                      people.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))
                    )}
                  </ThemedSelect>
                </div>
              )}
              <label className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <input type="checkbox" className="h-4 w-4" checked={useAI} onChange={e => setUseAI(e.target.checked)} />
                Use AI-written report
              </label>
              {useAI && (
                <ThemedSection className="space-y-3 rounded-2xl p-3">
                  <div>
                    <label className="mb-1 block text-sm" style={{ color: 'var(--text-muted)' }}>AI Provider</label>
                    <ThemedSelect className="w-full" value={aiProvider} onChange={e => setAiProvider(e.target.value as 'ollama' | 'openai')}>
                      <option value="ollama">Local (Ollama)</option>
                      <option value="openai">Cloud (OpenAI API)</option>
                    </ThemedSelect>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                    {aiProvider === 'openai'
                      ? openAIStatus?.hasKey
                        ? 'Cloud AI is configured. Export will send report facts to OpenAI only for this run.'
                        : 'No OpenAI API key is configured yet. Add one in Settings -> Cloud AI Reports.'
                      : 'Local AI uses your configured Ollama endpoint and model.'}
                  </p>
                </ThemedSection>
              )}
              <label className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <input type="checkbox" className="h-4 w-4" checked={includeAttachments} onChange={e => setIncludeAttachments(e.target.checked)} />
                Include attachments
              </label>
              {(exportStage || exportMsg) && (
                <ThemedCard className="space-y-2 rounded-2xl p-3 text-sm">
                  {exportStage && <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{exportStage}</div>}
                  {exportMsg && <div>{exportMsg}</div>}
                  {narrativePreview && (
                    <ThemedCard tone="success" className="rounded-xl p-2 text-xs whitespace-pre-line">
                      {narrativePreview}
                    </ThemedCard>
                  )}
                  {exportLog.length > 0 && (
                    <div className="max-h-32 overflow-y-auto rounded-xl border p-2 text-xs" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-base)', color: 'var(--text-muted)' }}>
                      {exportLog.join('\n')}
                    </div>
                  )}
                </ThemedCard>
              )}
              {resultPath && (
                <ThemedCard className="rounded-2xl p-3 text-sm">
                  Exported to: <span style={{ color: 'var(--status-accent-text)' }}>{resultPath}</span>
                </ThemedCard>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <ThemedButton onClick={onClose} variant="quiet">Close</ThemedButton>
              <ThemedButton onClick={runExport} variant="success" disabled={running || (template === 'person' && !personId)}>{running ? 'Exporting…' : 'Export'}</ThemedButton>
            </div>
      </ThemedPanel>
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

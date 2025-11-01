import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [useAI, setUseAI] = useState(true);
  const [people, setPeople] = useState<PersonItem[]>([]);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const graph = await window.piBridge.loadGraph();
        const persons = graph.nodes
          .filter(n => (n.type || '').toLowerCase().includes('person'))
          .map(n => ({ id: n.id, label: n.label || n.id }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setPeople(persons);
        if (persons.length && !personId) setPersonId(persons[0].id);
      } catch {
        setPeople([]);
      }
    })();
  }, [isOpen]);

  const runExport = async () => {
    try {
      setRunning(true);
      setExportMsg(null);
      setResultPath(null);

      // Optionally ensure AI is ready for person profile
      let started = false;
      if (template === 'person' && useAI) {
        setExportMsg('Starting local AI…');
        const status = await window.piBridge.aiStatus();
        if (!status.serverUp) {
          await window.piBridge.aiStart();
          started = true;
        }
        if (!status.modelAvailable) {
          setExportMsg('Downloading model…');
          await window.piBridge.aiPullModel();
        }
      }

      setExportMsg('Generating report…');
      const res = await window.piBridge.reportGenerate({ template, includeAttachments, personId: template === 'person' ? personId || undefined : undefined, useAI: template === 'person' ? useAI : undefined });
      setResultPath(res.outputDir);
      setExportMsg('Finalizing…');

      // Stop AI server if we started it just for this export
      if (started) {
        await window.piBridge.aiStop();
      }

      setExportMsg('Done');
      setTimeout(() => setExportMsg(null), 1200);
    } catch (e) {
      setExportMsg('Export failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
        >
          <motion.div
            initial={{ scale: 0.98, y: 8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 8, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl"
          >
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
                <>
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
                  <label className="flex items-center gap-2 text-slate-300">
                    <input type="checkbox" className="h-4 w-4" checked={useAI} onChange={e => setUseAI(e.target.checked)} />
                    Use AI narrative
                  </label>
                </>
              )}
              <label className="flex items-center gap-2 text-slate-300">
                <input type="checkbox" className="h-4 w-4" checked={includeAttachments} onChange={e => setIncludeAttachments(e.target.checked)} />
                Include attachments
              </label>
              {exportMsg && (
                <div className="rounded border border-slate-700 bg-slate-800 p-3 text-sm text-slate-200">{exportMsg}</div>
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

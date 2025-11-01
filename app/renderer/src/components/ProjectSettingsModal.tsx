import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProjectMetadata } from '../../../../shared/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const fieldClass = 'w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

export function ProjectSettingsModal({ isOpen, onClose }: Props) {
  const [meta, setMeta] = useState<ProjectMetadata>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const existing = await window.piBridge.getProjectMetadata();
        if (!cancelled) {
          setMeta(existing ?? {});
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen]);

  const update = (key: keyof ProjectMetadata, value: unknown) => {
    setMeta(prev => ({ ...prev, [key]: value as never }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const nowIso = new Date().toISOString();
      const payload: ProjectMetadata = { ...meta, modifiedDate: nowIso };
      if (!payload.createdDate) payload.createdDate = nowIso;
      await window.piBridge.setProjectMetadata(payload);
      onClose();
    } catch (e) {
      // noop - could add toast later
    } finally {
      setSaving(false);
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
            className="w-full max-w-2xl rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl"
          >
            <h2 className="mb-4 text-xl font-semibold text-white">Project Info</h2>
            {!loaded ? (
              <div className="text-slate-400">Loading…</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Author</label>
                  <input className={fieldClass} value={meta.author ?? ''} onChange={e => update('author', e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Case ID</label>
                  <input className={fieldClass} value={meta.caseId ?? ''} onChange={e => update('caseId', e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Agency</label>
                  <input className={fieldClass} value={meta.agency ?? ''} onChange={e => update('agency', e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Contact</label>
                  <input className={fieldClass} value={meta.contact ?? ''} onChange={e => update('contact', e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Jurisdiction</label>
                  <input className={fieldClass} value={meta.jurisdiction ?? ''} onChange={e => update('jurisdiction', e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Tags (comma separated)</label>
                  <input className={fieldClass} value={(meta.tags ?? []).join(', ')} onChange={e => update('tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm text-slate-300">Description</label>
                  <textarea className={fieldClass} rows={4} value={meta.description ?? ''} onChange={e => update('description', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm text-slate-300">Notes</label>
                  <textarea className={fieldClass} rows={4} value={meta.notes ?? ''} onChange={e => update('notes', e.target.value)} />
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={onClose} className="rounded bg-slate-700 px-4 py-2 text-white hover:bg-slate-600">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

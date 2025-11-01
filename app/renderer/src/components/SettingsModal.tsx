import React, { useEffect, useState } from 'react';
import { FaCog } from 'react-icons/fa';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  localAIEnabled: boolean;
  onLocalAIToggle: () => void;
  showNodeLabels: boolean;
  onShowNodeLabelsChange: (value: boolean) => void;
  showNodeImages: boolean;
  onShowNodeImagesChange: (value: boolean) => void;
  autoLayoutOnCreate: boolean;
  onAutoLayoutOnCreateChange: (value: boolean) => void;
  defaultRelationshipConfidence: 'unverified' | 'asserted' | 'verified';
  onDefaultRelationshipConfidenceChange: (value: 'unverified' | 'asserted' | 'verified') => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  localAIEnabled,
  onLocalAIToggle,
  showNodeLabels,
  onShowNodeLabelsChange,
  showNodeImages,
  onShowNodeImagesChange,
  autoLayoutOnCreate,
  onAutoLayoutOnCreateChange,
  defaultRelationshipConfidence,
  onDefaultRelationshipConfidenceChange
}: SettingsModalProps) {
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3.1:8b');
  const [ollamaKeepAlive, setOllamaKeepAlive] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ endpoint: string; model: string; serverUp: boolean; modelAvailable: boolean } | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const ep = await window.piBridge.getProjectSetting('ai:ollama:endpoint');
        const model = await window.piBridge.getProjectSetting('ai:ollama:model');
        const keep = await window.piBridge.getProjectSetting('ai:ollama:keepAlive');
        if (typeof ep === 'string' && ep) setOllamaEndpoint(ep);
        if (typeof model === 'string' && model) setOllamaModel(model);
        if (typeof keep === 'boolean') setOllamaKeepAlive(keep);
      } catch {}
      try {
        const st = await window.piBridge.aiStatus();
        setAiStatus(st);
      } catch {
        setAiStatus(null);
      }
    })();
  }, [isOpen]);

  const saveEndpoint = async (value: string) => {
    setOllamaEndpoint(value);
    try { await window.piBridge.setProjectSetting('ai:ollama:endpoint', value); } catch {}
  };
  const saveModel = async (value: string) => {
    setOllamaModel(value);
    try { await window.piBridge.setProjectSetting('ai:ollama:model', value); } catch {}
  };
  const saveKeepAlive = async (value: boolean) => {
    setOllamaKeepAlive(value);
    try { await window.piBridge.setProjectSetting('ai:ollama:keepAlive', value); } catch {}
  };

  const refreshAi = async () => {
    try { setAiStatus(await window.piBridge.aiStatus()); } catch { /* ignore */ }
  };

  const handleTest = async () => {
    setAiBusy('Testing…');
    await refreshAi();
    setAiBusy(null);
  };
  const handleInstall = async () => {
    setAiBusy('Installing…');
    const res = await window.piBridge.aiInstall();
    if (res.ok) {
      setAiBusy('Starting…');
      await window.piBridge.aiStart();
      setAiBusy('Pulling model…');
      await window.piBridge.aiPullModel();
    }
    await refreshAi();
    setAiBusy(null);
  };
  const handleStart = async () => {
    setAiBusy('Starting…');
    const res = await window.piBridge.aiStart();
    if (!res.ok) {
      setAiBusy(res.message || 'Start failed');
      setTimeout(() => setAiBusy(null), 3000);
    } else {
      setAiBusy(null);
    }
    await refreshAi();
  };
  const handleStop = async () => { setAiBusy('Stopping…'); await window.piBridge.aiStop(); await refreshAi(); setAiBusy(null); };
  const handlePull = async () => {
    setAiBusy('Pulling model…');
    const res = await window.piBridge.aiPullModel();
    if (!res.ok) {
      setAiBusy(res.message || 'Pull failed');
      setTimeout(() => setAiBusy(null), 3000);
    } else {
      setAiBusy(null);
    }
    await refreshAi();
  };
  const handleDownload = async () => {
    setAiBusy('Downloading Ollama…');
    try {
      const res = await window.piBridge.aiDownload();
      if (res.ok) {
        setAiBusy('Starting bundled Ollama…');
        await window.piBridge.aiStart();
        setAiBusy(null);
      } else {
        setAiBusy(res.message || 'Download failed');
        setTimeout(() => setAiBusy(null), 3000);
      }
    } catch {
      setAiBusy('Download failed');
      setTimeout(() => setAiBusy(null), 3000);
    }
    await refreshAi();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center space-x-3 mb-6">
          <FaCog className="w-6 h-6 text-slate-400" />
          <h2 className="text-xl font-semibold text-white">Settings</h2>
        </div>

        <div className="space-y-6">
          {/* Local AI Assistant */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Local AI Assistant</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Some features may require a local model via Ollama.
                </p>
              </div>
              <button
                onClick={onLocalAIToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  localAIEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    localAIEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {localAIEnabled && (
              <div className="mt-3 rounded-md bg-slate-800/50 p-3 text-xs text-slate-300 space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="block mb-1">Ollama Endpoint</label>
                    <input value={ollamaEndpoint} onChange={(e) => saveEndpoint(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block mb-1">Model</label>
                    <input value={ollamaModel} onChange={(e) => saveModel(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={ollamaKeepAlive} onChange={(e) => saveKeepAlive(e.target.checked)} />
                  Keep AI server running after exit
                </label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleTest} className="rounded bg-slate-700 px-3 py-1 hover:bg-slate-600 disabled:opacity-50" disabled={aiBusy !== null}>{aiBusy ?? 'Test connection'}</button>
                  <button onClick={handleDownload} className="rounded bg-slate-700 px-3 py-1 hover:bg-slate-600" disabled={aiBusy !== null}>Download bundled</button>
                  <button onClick={handleInstall} className="rounded bg-slate-700 px-3 py-1 hover:bg-slate-600" disabled={aiBusy !== null}>Install (system)</button>
                  <button onClick={handleStart} className="rounded bg-slate-700 px-3 py-1 hover:bg-slate-600" disabled={aiBusy !== null}>Start</button>
                  <button onClick={handleStop} className="rounded bg-slate-700 px-3 py-1 hover:bg-slate-600" disabled={aiBusy !== null}>Stop</button>
                  <button onClick={handlePull} className="rounded bg-slate-700 px-3 py-1 hover:bg-slate-600" disabled={aiBusy !== null}>Pull model</button>
                </div>
                <div className="text-slate-400">
                  {aiStatus ? (
                    <>
                      <div>Server: {aiStatus.serverUp ? 'running' : 'not running'}</div>
                      <div>Model: {aiStatus.modelAvailable ? 'available' : 'missing'}</div>
                    </>
                  ) : 'Status: unknown'}
                </div>
                <InstallFailsafe />
              </div>
            )}
          </section>

          <div className="h-px bg-slate-700"></div>

          {/* Graph Display */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Graph Display</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-slate-300">Show Node Labels</label>
                <p className="text-xs text-slate-400 mt-1">Display node names on the graph</p>
              </div>
              <button
                onClick={() => onShowNodeLabelsChange(!showNodeLabels)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showNodeLabels ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showNodeLabels ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-slate-300">Show Node Images</label>
                <p className="text-xs text-slate-400 mt-1">Display photos on person nodes</p>
              </div>
              <button
                onClick={() => onShowNodeImagesChange(!showNodeImages)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showNodeImages ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showNodeImages ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-slate-300">Auto-Layout on Create</label>
                <p className="text-xs text-slate-400 mt-1">Automatically arrange nodes when creating new entities</p>
              </div>
              <button
                onClick={() => onAutoLayoutOnCreateChange(!autoLayoutOnCreate)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoLayoutOnCreate ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoLayoutOnCreate ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </section>

          <div className="h-px bg-slate-700"></div>

          {/* Relationship Defaults */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Relationship Defaults</h3>
            
            <div>
              <label className="block text-sm text-slate-300 mb-2">Default Confidence Level</label>
              <select
                value={defaultRelationshipConfidence}
                onChange={(e) => onDefaultRelationshipConfidenceChange(e.target.value as typeof defaultRelationshipConfidence)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="unverified">Unverified</option>
                <option value="asserted">Asserted</option>
                <option value="verified">Verified</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">Default confidence level for newly created relationships</p>
            </div>
          </section>
        </div>

        <div className="flex justify-end mt-6 pt-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function InstallFailsafe() {
  const [installing, setInstalling] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);

  const start = async () => {
    setNote(null);
    setInstalling(true);
    const res = await window.piBridge.aiInstallStart();
    if (!res.started) {
      setInstalling(false);
      setNote('Could not start installer. See manual steps below.');
      return;
    }
    // Timeout after 25s and suggest manual
    setTimeout(async () => {
      const running = await window.piBridge.aiInstallRunning();
      if (running.running) {
        await window.piBridge.aiInstallCancel();
        setInstalling(false);
        setNote('Installation taking too long. Use the manual command or download link below.');
      }
    }, 25000);
  };

  const stop = async () => {
    await window.piBridge.aiInstallCancel();
    setInstalling(false);
    setNote('Installation cancelled.');
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setNote('Copied command'); setTimeout(() => setNote(null), 1200); } catch {}
  };

  return (
    <div className="mt-3 rounded-md bg-slate-900/50 p-3 text-xs text-slate-300">
      <div className="mb-2 font-semibold">Install failsafe</div>
      <div className="mb-2">If automatic install fails or stalls, use the commands below.</div>
      <div className="flex items-center gap-2 mb-2">
        <button onClick={installing ? stop : start} className="rounded bg-slate-700 px-3 py-1 hover:bg-slate-600">{installing ? 'Cancel install' : 'Run auto-install'}</button>
        {note && <span className="text-slate-400">{note}</span>}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <code className="rounded bg-slate-800 px-2 py-1">curl -fsSL https://ollama.com/install.sh | sh</code>
        <button onClick={() => copy('curl -fsSL https://ollama.com/install.sh | sh')} className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">Copy</button>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <code className="rounded bg-slate-800 px-2 py-1">winget install Ollama.Ollama</code>
        <button onClick={() => copy('winget install Ollama.Ollama')} className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">Copy</button>
      </div>
      <div className="mt-2">
        <button onClick={() => window.piBridge.openExternal('https://ollama.com/download')} className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">Open download page</button>
      </div>
    </div>
  );
}

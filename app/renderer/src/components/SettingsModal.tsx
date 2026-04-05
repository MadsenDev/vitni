import React, { useEffect, useState } from 'react';
import { FaCog } from 'react-icons/fa';
import { GRAPH_LAYOUT_PRESETS, type GraphLayoutPresetId } from '@renderer/features/graph/layoutPresets';
import { ICON_PACK_DEFINITIONS } from '@renderer/features/personalization/iconPacks';
import {
  createPresetTheme,
  DEFAULT_PERSONALIZATION_THEME,
  normalizePersonalizationTheme,
  PERSONALIZATION_PRESETS,
  type CanvasBackgroundMode,
  type CanvasImageFit,
  type IconPackId,
  type PersonalizationTheme,
  type PersonalizationPresetId,
  type SurfaceDepthPreset
} from '@renderer/features/personalization/theme';
import {
  INVESTIGATION_PROFILES,
  DEFAULT_INVESTIGATION_PROFILE,
  type InvestigationProfile,
  getInvestigationProfileDefinition
} from '@renderer/features/profiles/investigationProfiles';

/**
 * SettingsModal is the main control surface for project defaults and
 * device-local behavior. The sections intentionally mix "simple preference"
 * toggles with a few operational flows such as local/cloud AI setup and
 * personalization asset management, so state is grouped by settings section
 * rather than by hook type.
 */
type LocalAIModelPresetId =
  | 'tinyllama:1.1b'
  | 'llama3.2:1b'
  | 'llama3.2:3b'
  | 'qwen2.5:7b'
  | 'custom';

type SettingsSectionId = 'workspace' | 'investigation' | 'display' | 'personalization' | 'reports' | 'media' | 'ai' | 'advanced';

const LOCAL_AI_MODEL_PRESETS: Array<{
  id: Exclude<LocalAIModelPresetId, 'custom'>;
  label: string;
  hardware: string;
  description: string;
  approxSize: string;
}> = [
  {
    id: 'tinyllama:1.1b',
    label: 'Very light',
    hardware: 'Weak CPU',
    description: 'Fastest setup and lowest hardware requirement. Best for basic summaries.',
    approxSize: '~0.7 GB'
  },
  {
    id: 'llama3.2:1b',
    label: 'Light',
    hardware: 'Most laptops',
    description: 'Recommended default. Better quality than TinyLlama without the heavy CPU cost.',
    approxSize: '~1.3 GB'
  },
  {
    id: 'llama3.2:3b',
    label: 'Balanced',
    hardware: 'Stronger CPU',
    description: 'Better narrative quality, but can be slow on CPU-only machines.',
    approxSize: '~2.2 GB'
  },
  {
    id: 'qwen2.5:7b',
    label: 'Higher quality',
    hardware: 'High-end hardware',
    description: 'Best quality of the built-in tiers, but significantly heavier to run locally.',
    approxSize: '~4.8 GB'
  }
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  localAIEnabled: boolean;
  onLocalAIToggle: () => Promise<void>;
  investigationProfile: InvestigationProfile;
  onInvestigationProfileChange: (value: InvestigationProfile) => void;
  defaultWorkspaceView: 'graph' | 'timeline' | 'review';
  restoreSavedViewOnOpen: boolean;
  defaultSidebarTab: 'nodes' | 'ai';
  autoHideInspectorWhenIdle: boolean;
  onDefaultWorkspaceViewChange: (value: 'graph' | 'timeline' | 'review') => void;
  onRestoreSavedViewOnOpenChange: (value: boolean) => void;
  onDefaultSidebarTabChange: (value: 'nodes' | 'ai') => void;
  onAutoHideInspectorWhenIdleChange: (value: boolean) => void;
  showNodeLabels: boolean;
  onShowNodeLabelsChange: (value: boolean) => void;
  showNodeImages: boolean;
  onShowNodeImagesChange: (value: boolean) => void;
  autoLayoutPreset: 'off' | GraphLayoutPresetId;
  onAutoLayoutPresetChange: (value: 'off' | GraphLayoutPresetId) => void;
  defaultRelationshipConfidence: 'unverified' | 'asserted' | 'verified';
  onDefaultRelationshipConfidenceChange: (value: 'unverified' | 'asserted' | 'verified') => void;
  assertionFieldAutomation: 'auto' | 'prompt' | 'manual';
  onAssertionFieldAutomationChange: (value: 'auto' | 'prompt' | 'manual') => void;
  defaultReportTemplate: 'full' | 'selection' | 'timeline' | 'person';
  defaultReportIncludeAttachments: boolean;
  defaultReportUseAI: boolean;
  defaultReportAIProvider: 'ollama' | 'openai';
  onDefaultReportTemplateChange: (value: 'full' | 'selection' | 'timeline' | 'person') => void;
  onDefaultReportIncludeAttachmentsChange: (value: boolean) => void;
  onDefaultReportUseAIChange: (value: boolean) => void;
  onDefaultReportAIProviderChange: (value: 'ollama' | 'openai') => void;
  mediaLibraryDefaultView: 'grid' | 'list';
  mediaLibraryDefaultSort: 'newest' | 'oldest' | 'name' | 'usage';
  mediaLibraryShowFolders: boolean;
  onMediaLibraryDefaultViewChange: (value: 'grid' | 'list') => void;
  onMediaLibraryDefaultSortChange: (value: 'newest' | 'oldest' | 'name' | 'usage') => void;
  onMediaLibraryShowFoldersChange: (value: boolean) => void;
  uiDensity: 'comfortable' | 'compact';
  motionPreference: 'reduced' | 'standard' | 'enhanced';
  showExampleCaseOnWelcome: boolean;
  personalizationTheme: PersonalizationTheme;
  onUiDensityChange: (value: 'comfortable' | 'compact') => void;
  onMotionPreferenceChange: (value: 'reduced' | 'standard' | 'enhanced') => void;
  onShowExampleCaseOnWelcomeChange: (value: boolean) => void;
  onPersonalizationThemeChange: (value: PersonalizationTheme) => void | Promise<void>;
}

export function SettingsModal({
  isOpen,
  onClose,
  localAIEnabled,
  onLocalAIToggle,
  investigationProfile,
  onInvestigationProfileChange,
  defaultWorkspaceView,
  restoreSavedViewOnOpen,
  defaultSidebarTab,
  autoHideInspectorWhenIdle,
  onDefaultWorkspaceViewChange,
  onRestoreSavedViewOnOpenChange,
  onDefaultSidebarTabChange,
  onAutoHideInspectorWhenIdleChange,
  showNodeLabels,
  onShowNodeLabelsChange,
  showNodeImages,
  onShowNodeImagesChange,
  autoLayoutPreset,
  onAutoLayoutPresetChange,
  defaultRelationshipConfidence,
  onDefaultRelationshipConfidenceChange,
  assertionFieldAutomation,
  onAssertionFieldAutomationChange,
  defaultReportTemplate,
  defaultReportIncludeAttachments,
  defaultReportUseAI,
  defaultReportAIProvider,
  onDefaultReportTemplateChange,
  onDefaultReportIncludeAttachmentsChange,
  onDefaultReportUseAIChange,
  onDefaultReportAIProviderChange,
  mediaLibraryDefaultView,
  mediaLibraryDefaultSort,
  mediaLibraryShowFolders,
  onMediaLibraryDefaultViewChange,
  onMediaLibraryDefaultSortChange,
  onMediaLibraryShowFoldersChange,
  uiDensity,
  motionPreference,
  showExampleCaseOnWelcome,
  personalizationTheme,
  onUiDensityChange,
  onMotionPreferenceChange,
  onShowExampleCaseOnWelcomeChange,
  onPersonalizationThemeChange
}: SettingsModalProps) {
  // Local AI and OpenAI state is kept here rather than in the app store because
  // it is operational modal-only UI state, not durable workspace state.
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3.2:1b');
  const [ollamaModelPresetId, setOllamaModelPresetId] = useState<LocalAIModelPresetId>('llama3.2:1b');
  const [ollamaKeepAlive, setOllamaKeepAlive] = useState(false);
  const [aiStatus, setAiStatus] = useState<{
    endpoint: string;
    model: string;
    ollamaInstalled: boolean;
    serverUp: boolean;
    modelAvailable: boolean;
    setupRequired: boolean;
    recommendedAction: string;
    downloadEstimateMb: number | null;
  } | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [aiProgressDetails, setAiProgressDetails] = useState<string | null>(null);
  const [setupNote, setSetupNote] = useState<string | null>(null);
  const [selfTestBusy, setSelfTestBusy] = useState(false);
  const [selfTestResult, setSelfTestResult] = useState<{
    ok: boolean;
    message: string;
    elapsedMs?: number;
    firstTokenMs?: number | null;
    preview?: string;
  } | null>(null);
  const [openAIModel, setOpenAIModel] = useState('gpt-4o-mini');
  const [openAIKeyInput, setOpenAIKeyInput] = useState('');
  const [openAIStatus, setOpenAIStatus] = useState<{ storageAvailable: boolean; hasStoredKey: boolean; hasEnvKey: boolean; hasKey: boolean; storageMode: 'encrypted' | 'plaintext' | 'none' } | null>(null);
  const [openAIBusy, setOpenAIBusy] = useState<string | null>(null);
  const [openAINote, setOpenAINote] = useState<string | null>(null);
  const [personalizationNote, setPersonalizationNote] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('workspace');
  const profileDefinition = getInvestigationProfileDefinition(investigationProfile);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const ep = await window.piBridge.getDeviceSetting('ai:ollama:endpoint');
        const model = await window.piBridge.getDeviceSetting('ai:ollama:model');
        const keep = await window.piBridge.getDeviceSetting('ai:ollama:keepAlive');
        const openAIModelSetting = await window.piBridge.getProjectSetting('ai:openai:model');
        if (typeof ep === 'string' && ep) setOllamaEndpoint(ep);
        if (typeof model === 'string' && model) {
          setOllamaModel(model);
          setOllamaModelPresetId(getLocalAIModelPresetId(model));
        }
        if (typeof keep === 'boolean') setOllamaKeepAlive(keep);
        if (typeof openAIModelSetting === 'string' && openAIModelSetting) setOpenAIModel(openAIModelSetting);
      } catch {
        // Device settings are optional here; keep the modal usable with defaults.
      }
      try {
        const st = await window.piBridge.aiStatus();
        setAiStatus(st);
      } catch {
        setAiStatus(null);
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
    const unsubscribe = window.piAI.onLocalAISetupProgress((payload) => {
      setAiBusy(localAIStageLabel(payload.stage));
      setAiProgressDetails(payload.message);
    });
    return unsubscribe;
  }, [isOpen]);

  const saveEndpoint = async (value: string) => {
    setOllamaEndpoint(value);
    try {
      await window.piBridge.setDeviceSetting('ai:ollama:endpoint', value);
    } catch {
      // Keep the local input responsive even if persistence fails.
    }
  };
  const saveModel = async (value: string) => {
    setOllamaModel(value);
    setOllamaModelPresetId(getLocalAIModelPresetId(value));
    try {
      await window.piBridge.setDeviceSetting('ai:ollama:model', value);
    } catch {
      // Keep the local input responsive even if persistence fails.
    }
  };
  const saveKeepAlive = async (value: boolean) => {
    setOllamaKeepAlive(value);
    try {
      await window.piBridge.setDeviceSetting('ai:ollama:keepAlive', value);
    } catch {
      // Keep the local input responsive even if persistence fails.
    }
  };

  const refreshAi = async () => {
    try {
      const status = await window.piBridge.aiStatus();
      setAiStatus(status);
      if (status.model) {
        setOllamaModel(status.model);
        setOllamaModelPresetId(getLocalAIModelPresetId(status.model));
      }
      return status;
    } catch {
      return null;
    }
  };
  const refreshOpenAI = async () => {
    try {
      setOpenAIStatus(await window.piBridge.openAIStatus());
    } catch {
      // OpenAI status is optional while the modal is still usable.
    }
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

  const handleEnableAndSetup = async () => {
    setSetupNote(null);
    setAiProgressDetails(null);
    if (!localAIEnabled) {
      setAiBusy('Enabling local AI…');
      await onLocalAIToggle();
    }
    setAiBusy('Checking local AI runtime…');
    const result = await window.piBridge.aiSetup();
    const latestStatus = await refreshAi();
    if (result.ok) {
      setSetupNote('Local AI is ready. It will start automatically when needed.');
    } else if (result.stage === 'awaiting_external_install') {
      setSetupNote(result.message || 'Finish the external Ollama install, then click Repair / re-check.');
    } else if (result.message && result.message.trim().length > 0) {
      if (latestStatus?.ollamaInstalled && !latestStatus.serverUp) {
        setSetupNote(`${result.message} Once Ollama can start successfully, Vitni will continue downloading the model automatically.`);
      } else {
        setSetupNote(result.message);
      }
    } else if (latestStatus?.ollamaInstalled && !latestStatus.serverUp) {
      setSetupNote('Ollama is installed on this device. Click Repair / re-check to start the service and continue downloading the model.');
    } else if (latestStatus?.serverUp && !latestStatus.modelAvailable) {
      setSetupNote(`The Ollama service is running. Click Repair / re-check to finish downloading ${latestStatus.model}.`);
    } else {
      setSetupNote(result.message || 'Local AI setup failed. Open Advanced controls to troubleshoot.');
    }
    setAiBusy(null);
  };

  const handleDisableLocalAI = async () => {
    setSetupNote(null);
    setAiBusy('Disabling local AI…');
    await onLocalAIToggle();
    try {
      await window.piBridge.aiStop();
    } catch {
      // ignore
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

  const handleModelPresetChange = async (value: LocalAIModelPresetId) => {
    setOllamaModelPresetId(value);
    setSelfTestResult(null);
    if (value === 'custom') return;
    await saveModel(value);
    setSetupNote(`Selected ${getLocalAIModelPreset(value)?.label || value}.`);
  };

  const handleSelfTest = async () => {
    setSelfTestBusy(true);
    setSelfTestResult(null);
    try {
      const result = await window.piBridge.aiSelfTest();
      setSelfTestResult({
        ok: result.ok,
        message: result.message || (result.ok ? 'Self-test succeeded.' : 'Self-test failed.'),
        elapsedMs: result.elapsedMs,
        firstTokenMs: result.firstTokenMs,
        preview: result.preview
      });
      await refreshAi();
    } catch (error) {
      setSelfTestResult({
        ok: false,
        message: String((error as Error).message || 'Self-test failed.')
      });
    } finally {
      setSelfTestBusy(false);
    }
  };

  const saveOpenAIModel = async (value: string) => {
    setOpenAIModel(value);
    try {
      await window.piBridge.setProjectSetting('ai:openai:model', value);
    } catch {
      // Keep the local input responsive even if persistence fails.
    }
  };

  const handleSaveOpenAIKey = async () => {
    const trimmed = openAIKeyInput.trim();
    if (!trimmed) {
      setOpenAINote('Enter an API key first.');
      return;
    }
    setOpenAIBusy('Saving…');
    const result = await window.piBridge.openAISetApiKey(trimmed);
    if (result.ok) {
      setOpenAIKeyInput('');
      setOpenAINote('Cloud AI key saved on this device.');
      await refreshOpenAI();
    } else {
      setOpenAINote(result.message || 'Failed to save API key.');
    }
    setOpenAIBusy(null);
  };

  const handleClearOpenAIKey = async () => {
    setOpenAIBusy('Clearing…');
    const result = await window.piBridge.openAIClearApiKey();
    setOpenAINote(result.ok ? 'Stored cloud AI key removed.' : (result.message || 'Failed to clear API key.'));
    await refreshOpenAI();
    setOpenAIBusy(null);
  };

  const showSetupRecovery =
    !aiBusy &&
    Boolean(setupNote) &&
    !aiStatus?.ollamaInstalled &&
    /install|timed out|permission|network/i.test(setupNote || '');

  const updatePersonalizationTheme = async (nextTheme: PersonalizationTheme) => {
    const normalized = normalizePersonalizationTheme(nextTheme);
    await onPersonalizationThemeChange(normalized);
  };

  const handlePersonalizationPresetChange = async (presetId: Exclude<PersonalizationPresetId, 'custom'>) => {
    const presetTheme = createPresetTheme(presetId);
    await updatePersonalizationTheme({
      ...personalizationTheme,
      presetId,
      colors: presetTheme.colors
    });
    setPersonalizationNote(`Applied ${PERSONALIZATION_PRESETS.find((preset) => preset.id === presetId)?.label || 'preset'}.`);
  };

  const handleColorChange = async (key: keyof PersonalizationTheme['colors'], value: string) => {
    await updatePersonalizationTheme({
      ...personalizationTheme,
      presetId: 'custom',
      colors: {
        ...personalizationTheme.colors,
        [key]: value
      }
    });
  };

  const handleCanvasBackgroundChange = async (updates: Partial<PersonalizationTheme['canvasBackground']>) => {
    await updatePersonalizationTheme({
      ...personalizationTheme,
      canvasBackground: {
        ...personalizationTheme.canvasBackground,
        ...updates
      }
    });
  };

  const handlePickBackgroundImage = async () => {
    const result = await window.piBridge.personalizationPickBackgroundImage();
    if (!result.ok || !result.imagePath) {
      setPersonalizationNote(result.message || 'No background image selected.');
      return;
    }
    await handleCanvasBackgroundChange({
      mode: 'image',
      imagePath: result.imagePath,
      imageFileName: result.imageFileName ?? result.imagePath.split('/').pop() ?? 'Background image',
      overlayOpacity: 0.18,
      imageBlurPx: 10
    });
    setPersonalizationNote(`Using ${result.imageFileName || 'the selected image'} as the canvas background.`);
  };

  const handleImportTheme = async () => {
    const result = await window.piBridge.personalizationImportTheme();
    if (!result.ok || !result.theme) {
      setPersonalizationNote(result.message || 'Theme import canceled.');
      return;
    }
    await updatePersonalizationTheme(result.theme);
    setPersonalizationNote('Imported personalization theme.');
  };

  const handleExportTheme = async () => {
    const result = await window.piBridge.personalizationExportTheme(personalizationTheme);
    setPersonalizationNote(result.ok ? `Theme exported to ${result.path}.` : result.message || 'Theme export canceled.');
  };

  const selectedPreset =
    getLocalAIModelPreset(ollamaModelPresetId === 'custom' ? null : ollamaModelPresetId) ||
    getLocalAIModelPreset(getLocalAIModelPresetId(aiStatus?.model || ollamaModel));

  const sections: Array<{ id: SettingsSectionId; label: string; description: string; scope: 'Project' | 'Device' | 'Mixed' }> = [
    { id: 'workspace', label: 'Workspace', description: 'Open behavior, saved view restore, and entry defaults.', scope: 'Project' },
    { id: 'investigation', label: 'Investigation', description: 'Profile emphasis and casework defaults.', scope: 'Project' },
    { id: 'display', label: 'Display', description: 'Graph display, density, and motion preferences.', scope: 'Mixed' },
    { id: 'personalization', label: 'Personalization', description: 'Device-wide colors, canvas atmosphere, and icon styling.', scope: 'Device' },
    { id: 'reports', label: 'Reports', description: 'Default export behavior and AI report preferences.', scope: 'Project' },
    { id: 'media', label: 'Media', description: 'Media library browsing defaults for this case.', scope: 'Project' },
    { id: 'ai', label: 'AI', description: 'Optional local and cloud AI setup.', scope: 'Mixed' },
    { id: 'advanced', label: 'Advanced', description: 'Runtime overrides, diagnostics, and failsafes.', scope: 'Device' }
  ];

  const activeSectionDefinition = sections.find((section) => section.id === activeSection) ?? sections[0];

  const handleResetSection = async () => {
    switch (activeSection) {
      case 'workspace':
        onDefaultWorkspaceViewChange('graph');
        onRestoreSavedViewOnOpenChange(true);
        onDefaultSidebarTabChange('nodes');
        onShowExampleCaseOnWelcomeChange(true);
        break;
      case 'investigation':
        onInvestigationProfileChange(DEFAULT_INVESTIGATION_PROFILE);
        onDefaultRelationshipConfidenceChange('unverified');
        onAssertionFieldAutomationChange('auto');
        break;
      case 'display':
        onShowNodeLabelsChange(true);
        onShowNodeImagesChange(false);
        onAutoLayoutPresetChange('off');
        onUiDensityChange('comfortable');
        onMotionPreferenceChange('standard');
        break;
      case 'personalization':
        await updatePersonalizationTheme(DEFAULT_PERSONALIZATION_THEME);
        setPersonalizationNote('Reset personalization to the default Vitni theme.');
        break;
      case 'reports':
        onDefaultReportTemplateChange('full');
        onDefaultReportIncludeAttachmentsChange(true);
        onDefaultReportUseAIChange(false);
        onDefaultReportAIProviderChange('ollama');
        break;
      case 'media':
        onMediaLibraryDefaultViewChange('grid');
        onMediaLibraryDefaultSortChange('newest');
        onMediaLibraryShowFoldersChange(true);
        break;
      case 'ai':
        setOpenAINote(null);
        setSetupNote(null);
        break;
      case 'advanced':
        await saveEndpoint('http://localhost:11434');
        await saveModel('llama3.2:1b');
        await saveKeepAlive(false);
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="panel-elevated flex h-[min(92vh,820px)] w-full max-w-6xl overflow-hidden rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
      >
        <aside className="w-72 border-r border-slate-800/80 bg-slate-950/55 px-4 py-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-200">
              <FaCog className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-mono text-xl font-semibold text-white">Settings</h2>
              <p className="text-xs text-slate-500">Project defaults and device integrations</p>
            </div>
          </div>
          <nav className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  activeSection === section.id
                    ? 'border-sky-500/50 bg-sky-500/10 text-white shadow-[0_12px_28px_rgba(14,165,233,0.08)]'
                    : 'border-slate-800 bg-slate-900/55 text-slate-300 hover:border-slate-700 hover:bg-slate-900/80 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{section.label}</span>
                  <span className="rounded-full border border-slate-700/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    {section.scope}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{section.description}</p>
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-slate-800/80 px-8 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300/80">
                  {activeSectionDefinition.scope}
                </div>
                <h3 className="mt-1 font-mono text-2xl font-semibold text-white">{activeSectionDefinition.label}</h3>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">{activeSectionDefinition.description}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
            <div className="space-y-5">
              {activeSection === 'workspace' && (
                <>
                  <SettingsCard title="Startup defaults" description="Choose how this project should open when you resume work.">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldBlock label="Default workspace" description="Used when no saved view is restored.">
                        <select value={defaultWorkspaceView} onChange={(event) => onDefaultWorkspaceViewChange(event.target.value as 'graph' | 'timeline' | 'review')} className={selectClass}>
                          <option value="graph">Graph</option>
                          <option value="timeline">Timeline</option>
                          <option value="review">Review</option>
                        </select>
                      </FieldBlock>
                      <FieldBlock label="Default sidebar tab" description="Fallback when the project opens without a saved view.">
                        <select value={defaultSidebarTab} onChange={(event) => onDefaultSidebarTabChange(event.target.value as 'nodes' | 'ai')} className={selectClass}>
                          <option value="nodes">Nodes</option>
                          <option value="ai">AI</option>
                        </select>
                      </FieldBlock>
                    </div>
                    <ToggleRow
                      label="Restore last active saved view on open"
                      description="Return to the last saved workspace state automatically."
                      checked={restoreSavedViewOnOpen}
                      onChange={onRestoreSavedViewOnOpenChange}
                    />
                    <ToggleRow
                      label="Show example case action on the welcome screen"
                      description="Keep the included sample case visible as a launch option on this device."
                      checked={showExampleCaseOnWelcome}
                      onChange={onShowExampleCaseOnWelcomeChange}
                    />
                    <ToggleRow
                      label="Auto-hide inspector when nothing is selected"
                      description="Collapse the inspector until you select a node or edge on the graph."
                      checked={autoHideInspectorWhenIdle}
                      onChange={onAutoHideInspectorWhenIdleChange}
                    />
                  </SettingsCard>
                </>
              )}

              {activeSection === 'investigation' && (
                <>
                  <SettingsCard title="Investigation profile" description="Reorders and emphasizes the most relevant workflows without changing your underlying graph model.">
                    <div className="grid gap-3 md:grid-cols-3">
                      {INVESTIGATION_PROFILES.map((profile) => {
                        const active = investigationProfile === profile.id;
                        return (
                          <button
                            key={profile.id}
                            type="button"
                            onClick={() => onInvestigationProfileChange(profile.id)}
                            className={`rounded-2xl border p-4 text-left transition ${
                              active
                                ? 'border-sky-500/50 bg-sky-500/10 text-white'
                                : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-600 hover:text-white'
                            }`}
                          >
                            <div className="font-semibold">{profile.shortLabel}</div>
                            <div className="mt-2 text-xs text-slate-400">{profile.description}</div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 text-sm text-slate-300">
                      <div className="font-semibold text-white">{profileDefinition.label}</div>
                      <div className="mt-1 text-slate-400">{profileDefinition.description}</div>
                    </div>
                  </SettingsCard>
                  <SettingsCard title="Relationship defaults" description="Used when you create new relationships.">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldBlock label="Default confidence" description="Initial confidence for newly created relationships.">
                        <select
                          value={defaultRelationshipConfidence}
                          onChange={(event) => onDefaultRelationshipConfidenceChange(event.target.value as 'unverified' | 'asserted' | 'verified')}
                          className={selectClass}
                        >
                          <option value="unverified">Unverified</option>
                          <option value="asserted">Asserted</option>
                          <option value="verified">Verified</option>
                        </select>
                      </FieldBlock>
                      <FieldBlock label="Field-to-assertion behavior" description="How factual field edits should become source-backed assertions.">
                        <select
                          value={assertionFieldAutomation}
                          onChange={(event) => onAssertionFieldAutomationChange(event.target.value as 'auto' | 'prompt' | 'manual')}
                          className={selectClass}
                        >
                          <option value="auto">Auto-create when a source is linked</option>
                          <option value="prompt">Prompt before creating assertions</option>
                          <option value="manual">Manual only</option>
                        </select>
                      </FieldBlock>
                    </div>
                  </SettingsCard>
                </>
              )}

              {activeSection === 'display' && (
                <>
                  <SettingsCard title="Graph display" description="Control how much detail the graph shows while you work.">
                    <ToggleRow
                      label="Show node labels"
                      description="Display node names directly on the graph."
                      checked={showNodeLabels}
                      onChange={onShowNodeLabelsChange}
                    />
                    <ToggleRow
                      label="Show node images"
                      description="Display linked photos directly on supported nodes."
                      checked={showNodeImages}
                      onChange={onShowNodeImagesChange}
                    />
                    <FieldBlock label="Auto-layout after create" description="Run a layout preset automatically after adding nodes.">
                      <select value={autoLayoutPreset} onChange={(event) => onAutoLayoutPresetChange(event.target.value as 'off' | GraphLayoutPresetId)} className={selectClass}>
                        <option value="off">Off</option>
                        {GRAPH_LAYOUT_PRESETS.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </FieldBlock>
                  </SettingsCard>
                  <SettingsCard title="Interface feel" description="These settings apply on this device and affect the renderer shell globally.">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldBlock label="UI density" description="Adjust general interface compactness.">
                        <select value={uiDensity} onChange={(event) => onUiDensityChange(event.target.value as 'comfortable' | 'compact')} className={selectClass}>
                          <option value="comfortable">Comfortable</option>
                          <option value="compact">Compact</option>
                        </select>
                      </FieldBlock>
                      <FieldBlock label="Motion" description="Control transitions and animated UI effects on this device.">
                        <select value={motionPreference} onChange={(event) => onMotionPreferenceChange(event.target.value as 'reduced' | 'standard' | 'enhanced')} className={selectClass}>
                          <option value="reduced">Reduced</option>
                          <option value="standard">Standard</option>
                          <option value="enhanced">Enhanced</option>
                        </select>
                      </FieldBlock>
                    </div>
                  </SettingsCard>
                </>
              )}

              {activeSection === 'personalization' && (
                <>
                  <SettingsCard title="Theme colors" description="Customize the shell, surface, and accent palette on this device.">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldBlock label="Preset" description="Start from a curated theme, then tweak colors freely.">
                        <select
                          value={personalizationTheme.presetId === 'custom' ? 'custom' : personalizationTheme.presetId}
                          onChange={(event) => {
                            const nextValue = event.target.value as PersonalizationPresetId;
                            if (nextValue === 'custom') {
                              void updatePersonalizationTheme({ ...personalizationTheme, presetId: 'custom' });
                              return;
                            }
                            void handlePersonalizationPresetChange(nextValue as Exclude<PersonalizationPresetId, 'custom'>);
                          }}
                          className={selectClass}
                        >
                          {PERSONALIZATION_PRESETS.map((preset) => (
                            <option key={preset.id} value={preset.id}>
                              {preset.label}
                            </option>
                          ))}
                          <option value="custom">Custom</option>
                        </select>
                      </FieldBlock>
                      <FieldBlock label="Surface depth" description="Increase or soften panel shadowing.">
                        <select
                          value={personalizationTheme.surfaceDepth}
                          onChange={(event) =>
                            void updatePersonalizationTheme({
                              ...personalizationTheme,
                              surfaceDepth: event.target.value as SurfaceDepthPreset
                            })
                          }
                          className={selectClass}
                        >
                          <option value="soft">Soft</option>
                          <option value="standard">Standard</option>
                          <option value="dramatic">Dramatic</option>
                        </select>
                      </FieldBlock>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {([
                        ['accentSky', 'Primary accent'],
                        ['accentEmerald', 'Secondary accent'],
                        ['accentAmber', 'Warm accent'],
                        ['appBg', 'App background'],
                        ['surfaceRaised', 'Raised surface'],
                        ['borderStrong', 'Strong border'],
                        ['textPrimary', 'Primary text'],
                        ['textMuted', 'Muted text']
                      ] as Array<[keyof PersonalizationTheme['colors'], string]>).map(([key, label]) => (
                        <FieldBlock key={key} label={label}>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={coerceColorValue(personalizationTheme.colors[key])}
                              onChange={(event) => {
                                void handleColorChange(key, event.target.value);
                              }}
                              className="h-11 w-14 rounded-2xl border border-slate-700 bg-slate-950/70 p-1"
                            />
                            <input
                              value={personalizationTheme.colors[key]}
                              onChange={(event) => {
                                void handleColorChange(key, event.target.value);
                              }}
                              className={inputClass}
                            />
                          </div>
                        </FieldBlock>
                      ))}
                    </div>
                  </SettingsCard>

                  <SettingsCard title="Canvas background" description="Change the graph atmosphere independently of the rest of the shell.">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldBlock label="Background mode">
                        <select
                          value={personalizationTheme.canvasBackground.mode}
                          onChange={(event) =>
                            void handleCanvasBackgroundChange({
                              mode: event.target.value as CanvasBackgroundMode
                            })
                          }
                          className={selectClass}
                        >
                          <option value="grid">Grid</option>
                          <option value="gradient">Gradient</option>
                          <option value="none">None</option>
                          <option value="image">Image</option>
                        </select>
                      </FieldBlock>
                      <FieldBlock label="Grid opacity" description="Used when the grid background is active.">
                        <input
                          type="range"
                          min="0"
                          max="0.25"
                          step="0.01"
                          value={personalizationTheme.canvasBackground.gridOpacity}
                          onChange={(event) =>
                            void handleCanvasBackgroundChange({
                              gridOpacity: Number.parseFloat(event.target.value)
                            })
                          }
                          className="w-full accent-sky-400"
                        />
                        <div className="mt-1 text-xs text-slate-500">{Math.round(personalizationTheme.canvasBackground.gridOpacity * 100)}%</div>
                      </FieldBlock>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldBlock label="Background image" description="Stored locally on this device and never written into the project.">
                        <div className="space-y-3">
                          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 px-4 py-3 text-sm text-slate-300">
                            {personalizationTheme.canvasBackground.imageFileName || 'No image selected'}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                void handlePickBackgroundImage();
                              }}
                              className="rounded-2xl bg-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-600"
                            >
                              Choose image
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void handleCanvasBackgroundChange({
                                  imagePath: null,
                                  imageFileName: null,
                                  mode: personalizationTheme.canvasBackground.mode === 'image' ? 'grid' : personalizationTheme.canvasBackground.mode
                                });
                              }}
                              className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500"
                            >
                              Clear image
                            </button>
                          </div>
                        </div>
                      </FieldBlock>
                      <FieldBlock label="Image fit">
                        <select
                          value={personalizationTheme.canvasBackground.imageFit}
                          onChange={(event) =>
                            void handleCanvasBackgroundChange({
                              imageFit: event.target.value as CanvasImageFit
                            })
                          }
                          className={selectClass}
                        >
                          <option value="cover">Cover</option>
                          <option value="contain">Contain</option>
                          <option value="tile">Tile</option>
                          <option value="center">Centered</option>
                        </select>
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-slate-200">Image dim / overlay</label>
                          <input
                            type="range"
                            min="0"
                            max="0.7"
                            step="0.05"
                            value={personalizationTheme.canvasBackground.overlayOpacity}
                            onChange={(event) =>
                              void handleCanvasBackgroundChange({
                                overlayOpacity: Number.parseFloat(event.target.value)
                              })
                            }
                            className="mt-2 w-full accent-sky-400"
                          />
                          <div className="mt-1 text-xs text-slate-500">
                            {Math.round(personalizationTheme.canvasBackground.overlayOpacity * 100)}% dimming. Lower values show more of the image.
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-slate-200">Image blur</label>
                          <input
                            type="range"
                            min="0"
                            max="24"
                            step="1"
                            value={personalizationTheme.canvasBackground.imageBlurPx}
                            onChange={(event) =>
                              void handleCanvasBackgroundChange({
                                imageBlurPx: Number.parseInt(event.target.value, 10)
                              })
                            }
                            className="mt-2 w-full accent-sky-400"
                          />
                          <div className="mt-1 text-xs text-slate-500">
                            {personalizationTheme.canvasBackground.imageBlurPx}px blur. Lower values keep the image sharper.
                          </div>
                        </div>
                      </FieldBlock>
                    </div>
                  </SettingsCard>

                  <SettingsCard title="Icon style" description="Choose how palette and inspector icons are rendered on this device.">
                    <FieldBlock label="Built-in icon pack">
                      <select
                        value={personalizationTheme.iconPack}
                        onChange={(event) =>
                          void updatePersonalizationTheme({
                            ...personalizationTheme,
                            iconPack: event.target.value as IconPackId
                          })
                        }
                        className={selectClass}
                      >
                        {ICON_PACK_DEFINITIONS.map((pack) => (
                          <option key={pack.id} value={pack.id}>
                            {pack.label}
                          </option>
                        ))}
                      </select>
                    </FieldBlock>
                    <div className="grid gap-3 md:grid-cols-2">
                      {ICON_PACK_DEFINITIONS.map((pack) => (
                        <div
                          key={pack.id}
                          className={`rounded-2xl border px-4 py-3 text-sm ${
                            personalizationTheme.iconPack === pack.id
                              ? 'border-sky-500/50 bg-sky-500/10 text-white'
                              : 'border-slate-800 bg-slate-950/45 text-slate-300'
                          }`}
                        >
                          <div className="font-semibold">{pack.label}</div>
                          <div className="mt-1 text-xs text-slate-400">{pack.description}</div>
                        </div>
                      ))}
                    </div>
                  </SettingsCard>

                  <SettingsCard title="Reset, export, and import" description="Keep a backup of your device theme or restore the default quickly.">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          void updatePersonalizationTheme(DEFAULT_PERSONALIZATION_THEME);
                          setPersonalizationNote('Reset all personalization to the default Vitni theme.');
                        }}
                        className="rounded-2xl bg-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-600"
                      >
                        Reset all
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void handleExportTheme();
                        }}
                        className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500"
                      >
                        Export theme JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void handleImportTheme();
                        }}
                        className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500"
                      >
                        Import theme JSON
                      </button>
                    </div>
                    {personalizationNote ? (
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 text-sm text-slate-200">
                        {personalizationNote}
                      </div>
                    ) : null}
                  </SettingsCard>
                </>
              )}

              {activeSection === 'reports' && (
                <SettingsCard title="Report defaults" description="Pre-fills the export modal for this project.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldBlock label="Default report template">
                      <select value={defaultReportTemplate} onChange={(event) => onDefaultReportTemplateChange(event.target.value as 'full' | 'selection' | 'timeline' | 'person')} className={selectClass}>
                        <option value="full">Full report</option>
                        <option value="selection">Selection</option>
                        <option value="timeline">Timeline</option>
                        <option value="person">Person profile</option>
                      </select>
                    </FieldBlock>
                    <FieldBlock label="Default AI provider">
                      <select value={defaultReportAIProvider} onChange={(event) => onDefaultReportAIProviderChange(event.target.value as 'ollama' | 'openai')} className={selectClass}>
                        <option value="ollama">Local (Ollama)</option>
                        <option value="openai">Cloud (OpenAI API)</option>
                      </select>
                    </FieldBlock>
                  </div>
                  <ToggleRow
                    label="Include attachments by default"
                    description="Preselect attachment export when generating reports."
                    checked={defaultReportIncludeAttachments}
                    onChange={onDefaultReportIncludeAttachmentsChange}
                  />
                  <ToggleRow
                    label="Offer AI-written reports by default"
                    description="Preselect the AI report option in the export flow for this case."
                    checked={defaultReportUseAI}
                    onChange={onDefaultReportUseAIChange}
                  />
                </SettingsCard>
              )}

              {activeSection === 'media' && (
                <SettingsCard title="Media library defaults" description="Control how the media browser opens for this project.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldBlock label="Default view">
                      <select value={mediaLibraryDefaultView} onChange={(event) => onMediaLibraryDefaultViewChange(event.target.value as 'grid' | 'list')} className={selectClass}>
                        <option value="grid">Grid</option>
                        <option value="list">List</option>
                      </select>
                    </FieldBlock>
                    <FieldBlock label="Default sort">
                      <select value={mediaLibraryDefaultSort} onChange={(event) => onMediaLibraryDefaultSortChange(event.target.value as 'newest' | 'oldest' | 'name' | 'usage')} className={selectClass}>
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="name">Name</option>
                        <option value="usage">Most referenced</option>
                      </select>
                    </FieldBlock>
                  </div>
                  <ToggleRow
                    label="Show folder tree by default"
                    description="Open the media library with folder navigation visible."
                    checked={mediaLibraryShowFolders}
                    onChange={onMediaLibraryShowFoldersChange}
                  />
                </SettingsCard>
              )}

              {activeSection === 'ai' && (
                <>
                  <SettingsCard title="Local AI Assistant" description="Runs on this device and can set itself up automatically when you enable it.">
                    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                      <div>
                        <div className="text-base font-semibold text-white">
                          {localAIEnabled ? (aiStatus?.setupRequired ? 'Finish local AI setup' : 'Local AI is ready') : 'Enable local AI'}
                        </div>
                        <p className="mt-1 text-sm text-slate-400">
                          {localAIEnabled
                            ? aiStatus?.setupRequired
                              ? `Vitni will install the runtime if needed, start the Ollama service, and then download ${aiStatus?.model || ollamaModel}.`
                              : `The Ollama runtime and ${aiStatus?.model || ollamaModel} are ready for on-demand report generation.`
                            : 'Turn this on to let the app provision and use a local model for reports on this device.'}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${localAIEnabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-300'}`}>
                        {localAIEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                      <div className="space-y-3">
                        <FieldBlock label="Local model tier" description="Pick a model based on your hardware, not just output quality.">
                          <select
                            value={ollamaModelPresetId}
                            onChange={(event) => void handleModelPresetChange(event.target.value as LocalAIModelPresetId)}
                            className={selectClass}
                          >
                            {LOCAL_AI_MODEL_PRESETS.map((preset) => (
                              <option key={preset.id} value={preset.id}>
                                {preset.label} ({preset.hardware})
                              </option>
                            ))}
                            <option value="custom">Custom model…</option>
                          </select>
                        </FieldBlock>
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 text-sm text-slate-300">
                          <div className="font-semibold text-white">{selectedPreset?.label || 'Custom model'}</div>
                          <div className="mt-1 text-slate-400">
                            {ollamaModelPresetId === 'custom'
                              ? 'Use a custom Ollama model tag if you already know exactly what should run on this machine.'
                              : selectedPreset?.description || 'Choose a local model preset.'}
                          </div>
                          <div className="mt-2 text-xs text-slate-500">
                            Download size: {selectedPreset?.approxSize || 'varies'}.
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={handleEnableAndSetup} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50" disabled={aiBusy !== null}>
                            {aiBusy ?? (localAIEnabled ? (aiStatus?.setupRequired ? (aiStatus?.ollamaInstalled ? 'Repair / re-check' : 'Set up local AI') : 'Repair / re-check') : 'Enable and set up')}
                          </button>
                          <button onClick={handleDisableLocalAI} className="rounded-2xl bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50" disabled={aiBusy !== null}>
                            Disable
                          </button>
                          <button onClick={handleSelfTest} className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-50" disabled={aiBusy !== null || selfTestBusy}>
                            {selfTestBusy ? 'Running self-test…' : 'Run self-test'}
                          </button>
                        </div>
                        {aiBusy && (
                          <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                            <div className="text-sm font-semibold text-white">{aiBusy}</div>
                            <div className="max-h-32 overflow-y-auto whitespace-pre-line rounded-xl border border-slate-800 bg-black/20 px-3 py-2 font-mono text-[11px] text-slate-300">
                              {aiProgressDetails || aiBusy}
                            </div>
                          </div>
                        )}
                        {setupNote ? <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 text-sm text-slate-200">{setupNote}</div> : null}
                        {showSetupRecovery && (
                          <div className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                            <div>Automatic setup needs help from the OS. Use the system prompt or a manual install path, then re-check.</div>
                            <div className="flex flex-wrap gap-2">
                              <button onClick={handleEnableAndSetup} className="rounded-xl bg-emerald-700 px-3 py-2 text-white hover:bg-emerald-600 disabled:opacity-50" disabled={aiBusy !== null}>Install with system prompt</button>
                              <button onClick={handleDownload} className="rounded-xl bg-slate-700 px-3 py-2 text-white hover:bg-slate-600 disabled:opacity-50" disabled={aiBusy !== null}>Download bundled runtime</button>
                              <button onClick={() => window.piBridge.openExternal('https://ollama.com/download')} className="rounded-xl bg-slate-700 px-3 py-2 text-white hover:bg-slate-600">Open download page</button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 text-sm text-slate-300">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Runtime status</div>
                        <div className="mt-3 space-y-2">
                          <StatusRow label="Runtime" value={aiStatus?.ollamaInstalled ? 'Installed' : 'Missing'} />
                          <StatusRow label="Service" value={aiStatus?.serverUp ? 'Running' : 'Stopped'} />
                          <StatusRow label="Model" value={aiStatus?.modelAvailable ? 'Ready' : 'Not downloaded'} />
                          <StatusRow label="Model tag" value={aiStatus?.model || ollamaModel} />
                        </div>
                        {aiStatus?.downloadEstimateMb ? (
                          <p className="mt-4 text-xs text-slate-500">
                            First-time setup downloads roughly {Math.round(aiStatus.downloadEstimateMb / 100) / 10} GB after the service is available.
                          </p>
                        ) : null}
                        {selfTestResult ? (
                          <div className={`mt-4 rounded-2xl border p-3 text-xs ${selfTestResult.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-amber-500/30 bg-amber-500/10 text-amber-100'}`}>
                            <div className="font-semibold">{selfTestResult.ok ? 'Self-test passed' : 'Self-test failed'}</div>
                            <div className="mt-1">{selfTestResult.message}</div>
                            {(typeof selfTestResult.elapsedMs === 'number' || typeof selfTestResult.firstTokenMs === 'number') && (
                              <div className="mt-2 text-current/80">
                                {typeof selfTestResult.elapsedMs === 'number' ? `Total time: ${formatDuration(selfTestResult.elapsedMs)}.` : null}{' '}
                                {typeof selfTestResult.firstTokenMs === 'number' ? `First token: ${formatDuration(selfTestResult.firstTokenMs)}.` : null}
                              </div>
                            )}
                            {selfTestResult.preview ? <div className="mt-2 rounded border border-current/20 bg-black/20 px-2 py-1 font-mono text-[11px] text-current/90">{selfTestResult.preview}</div> : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <ToggleRow
                      label="Keep the local AI service running between exports"
                      description="Useful if you generate several reports in a row on this device."
                      checked={ollamaKeepAlive}
                      onChange={(value) => {
                        void saveKeepAlive(value);
                      }}
                    />
                  </SettingsCard>

                  <SettingsCard title="Cloud AI Reports" description="Optional OpenAI-powered report writing. API keys are always stored on this device only.">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldBlock label="OpenAI model">
                        <input value={openAIModel} onChange={(event) => void saveOpenAIModel(event.target.value)} className={inputClass} />
                      </FieldBlock>
                      <FieldBlock label="API key">
                        <input
                          type="password"
                          value={openAIKeyInput}
                          onChange={(event) => setOpenAIKeyInput(event.target.value)}
                          placeholder={openAIStatus?.hasKey ? 'A key is already configured' : 'sk-...'}
                          className={inputClass}
                        />
                      </FieldBlock>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={handleSaveOpenAIKey} className="rounded-2xl bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50" disabled={openAIBusy !== null}>
                        {openAIBusy ?? 'Save key'}
                      </button>
                      <button onClick={handleClearOpenAIKey} className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-50" disabled={openAIBusy !== null}>
                        Clear stored key
                      </button>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 text-sm text-slate-300">
                      <StatusRow label="Storage" value={openAIStatus?.storageMode === 'encrypted' ? 'Encrypted' : openAIStatus?.storageMode === 'plaintext' ? 'Plaintext fallback' : 'Not storing a key'} />
                      <StatusRow label="Encrypted storage" value={openAIStatus?.storageAvailable ? 'Available' : 'Unavailable'} />
                      <StatusRow label="Stored key" value={openAIStatus?.hasStoredKey ? 'Configured' : 'Not stored'} />
                      <StatusRow label="Environment key" value={openAIStatus?.hasEnvKey ? 'OPENAI_API_KEY present' : 'Not set'} />
                    </div>
                    {openAIStatus?.storageMode === 'plaintext' ? (
                      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                        This system does not support Electron encrypted storage, so the API key is stored in a local plaintext file under the app data directory.
                      </div>
                    ) : null}
                    {openAINote ? <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 text-sm text-slate-200">{openAINote}</div> : null}
                  </SettingsCard>
                </>
              )}

              {activeSection === 'advanced' && (
                <>
                  <SettingsCard title="Local runtime overrides" description="Only change these if you know the exact Ollama endpoint or model tag you need.">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldBlock label="Ollama endpoint">
                        <input value={ollamaEndpoint} onChange={(event) => void saveEndpoint(event.target.value)} className={inputClass} />
                      </FieldBlock>
                      <FieldBlock label="Model preset">
                        <select
                          value={ollamaModelPresetId}
                          onChange={(event) => void handleModelPresetChange(event.target.value as LocalAIModelPresetId)}
                          className={selectClass}
                        >
                          {LOCAL_AI_MODEL_PRESETS.map((preset) => (
                            <option key={preset.id} value={preset.id}>
                              {preset.label} ({preset.id})
                            </option>
                          ))}
                          <option value="custom">Custom model…</option>
                        </select>
                      </FieldBlock>
                    </div>
                    {ollamaModelPresetId === 'custom' ? (
                      <FieldBlock label="Custom model tag">
                        <input value={ollamaModel} onChange={(event) => void saveModel(event.target.value)} className={inputClass} placeholder="llama3.2:1b" />
                      </FieldBlock>
                    ) : null}
                  </SettingsCard>
                  <SettingsCard title="Manual controls" description="Use these when setup automation is not enough or you are troubleshooting.">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={handleTest} className="rounded-2xl bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50" disabled={aiBusy !== null}>{aiBusy ?? 'Test connection'}</button>
                      <button onClick={handleDownload} className="rounded-2xl bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50" disabled={aiBusy !== null}>Download bundled</button>
                      <button onClick={handleInstall} className="rounded-2xl bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50" disabled={aiBusy !== null}>Install (system)</button>
                      <button onClick={handleStart} className="rounded-2xl bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50" disabled={aiBusy !== null}>Start</button>
                      <button onClick={handleStop} className="rounded-2xl bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50" disabled={aiBusy !== null}>Stop</button>
                      <button onClick={handlePull} className="rounded-2xl bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50" disabled={aiBusy !== null}>Pull model</button>
                    </div>
                    <InstallFailsafe />
                  </SettingsCard>
                </>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-slate-800/80 bg-slate-950/70 px-8 py-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  void handleResetSection();
                }}
                className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white"
              >
                Reset section
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus:border-sky-500 focus:outline-none';
const selectClass = inputClass;

function SettingsCard({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-[24px] border border-slate-800/80 bg-slate-900/45 p-5">
      <div>
        <h4 className="font-mono text-lg font-semibold text-white">{title}</h4>
        {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function FieldBlock({
  label,
  description,
  children
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-200">{label}</label>
      {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3">
      <div>
        <div className="text-sm font-medium text-slate-100">{label}</div>
        {description ? <div className="mt-1 text-xs text-slate-500">{description}</div> : null}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-sky-600' : 'bg-slate-700'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-200">{value}</span>
    </div>
  );
}

function coerceColorValue(value: string) {
  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
  const match = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return '#0f172a';
  const [, r, g, b] = match;
  return `#${[r, g, b]
    .map((part) => Number.parseInt(part, 10).toString(16).padStart(2, '0'))
    .join('')}`;
}

function localAIStageLabel(stage: string) {
  switch (stage) {
    case 'detecting':
      return 'Checking local AI…';
    case 'installing_ollama':
      return 'Installing…';
    case 'awaiting_external_install':
      return 'Waiting for system install…';
    case 'starting_service':
      return 'Starting service…';
    case 'downloading_model':
      return 'Downloading model…';
    case 'verifying':
      return 'Verifying…';
    case 'ready':
      return 'Local AI is ready.';
    case 'failed':
      return 'Setup failed';
    default:
      return 'Working…';
  }
}

function getLocalAIModelPresetId(model: string | null | undefined): LocalAIModelPresetId {
  if (!model) return 'llama3.2:1b';
  const match = LOCAL_AI_MODEL_PRESETS.find((preset) => preset.id === model);
  return match ? match.id : 'custom';
}

function getLocalAIModelPreset(id: LocalAIModelPresetId | null | undefined) {
  if (!id || id === 'custom') return null;
  return LOCAL_AI_MODEL_PRESETS.find((preset) => preset.id === id) ?? null;
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = ((ms % 60_000) / 1000).toFixed(1);
  return `${minutes}m ${seconds}s`;
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
    try {
      await navigator.clipboard.writeText(text);
      setNote('Copied command');
      setTimeout(() => setNote(null), 1200);
    } catch {
      setNote('Could not copy the command.');
    }
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

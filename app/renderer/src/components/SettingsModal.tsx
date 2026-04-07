import React, { useEffect, useState } from 'react';
import { FaCog } from 'react-icons/fa';
import { GRAPH_LAYOUT_PRESETS, type GraphLayoutPresetId } from '@renderer/features/graph/layoutPresets';
import { ICON_PACK_DEFINITIONS } from '@renderer/features/personalization/iconPacks';
import {
  createPresetTheme,
  DEFAULT_PERSONALIZATION_THEME,
  normalizePersonalizationTheme,
  PERSONALIZATION_PRESETS,
  type AppearanceMode,
  type CanvasBackgroundMode,
  type CanvasImageFit,
  type IconPackId,
  type PersonalizationTheme,
  type PersonalizationPresetId,
  type SurfaceDepthPreset
} from '@renderer/features/personalization/theme';
import {
  ThemedBadge,
  ThemedButton,
  ThemedCard,
  ThemedInput,
  ThemedSection,
  ThemedSelect
} from '@renderer/features/personalization/primitives';
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
      ...presetTheme
    });
    setPersonalizationNote(`Applied ${PERSONALIZATION_PRESETS.find((preset) => preset.id === presetId)?.label || 'preset'}.`);
  };

  const handleColorChange = async (key: keyof PersonalizationTheme['colors'], value: string) => {
    await updatePersonalizationTheme({
      ...personalizationTheme,
      presetId: 'custom',
      appearanceMode: personalizationTheme.appearanceMode,
      colors: {
        ...personalizationTheme.colors,
        [key]: value
      }
    });
  };

  const handleAppearanceModeChange = async (appearanceMode: AppearanceMode) => {
    const fallbackPreset = appearanceMode === 'light' ? 'paper_trail' : 'vitni_midnight';
    const presetTheme = createPresetTheme(fallbackPreset);
    await updatePersonalizationTheme({
      ...personalizationTheme,
      ...presetTheme,
      iconPack: personalizationTheme.iconPack,
      surfaceDepth: personalizationTheme.surfaceDepth
    });
    setPersonalizationNote(`Switched to ${appearanceMode} mode with ${presetTheme.presetId.replace(/_/g, ' ')}.`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--overlay-backdrop)' }} onClick={onClose}>
      <div
        className="panel-elevated flex h-[min(92vh,820px)] w-full max-w-6xl overflow-hidden rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
      >
        <aside
          className="flex min-h-0 w-72 flex-col border-r px-4 py-5"
          style={{ borderColor: 'var(--border-subtle)', background: 'color-mix(in srgb, var(--surface-base) 94%, transparent)' }}
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border" style={{ borderColor: 'var(--status-accent-border)', background: 'var(--status-accent-bg)', color: 'var(--status-accent-text)' }}>
              <FaCog className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-mono text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h2>
              <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Project defaults and device integrations</p>
            </div>
          </div>
          <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {sections.map((section) => (
              <ThemedButton
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                variant={activeSection === section.id ? 'accent' : 'default'}
                className="w-full rounded-2xl px-4 py-3 text-left"
                style={activeSection === section.id ? { boxShadow: '0 12px 28px rgba(14,165,233,0.08)' } : undefined}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{section.label}</span>
                  <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-soft)' }}>
                    {section.scope}
                  </span>
                </div>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-soft)' }}>{section.description}</p>
              </ThemedButton>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b px-8 py-5" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent-sky)' }}>
                  {activeSectionDefinition.scope}
                </div>
                <h3 className="mt-1 font-mono text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{activeSectionDefinition.label}</h3>
                <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>{activeSectionDefinition.description}</p>
              </div>
              <ThemedButton
                type="button"
                onClick={onClose}
                className="rounded-2xl px-3 py-2 text-sm"
              >
                Close
              </ThemedButton>
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
                          <ThemedButton
                            key={profile.id}
                            type="button"
                            onClick={() => onInvestigationProfileChange(profile.id)}
                            variant={active ? 'accent' : 'default'}
                            className="rounded-2xl p-4 text-left"
                          >
                            <div className="font-semibold">{profile.shortLabel}</div>
                            <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{profile.description}</div>
                          </ThemedButton>
                        );
                      })}
                    </div>
                    <ThemedCard className="p-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                      <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{profileDefinition.label}</div>
                      <div className="mt-1">{profileDefinition.description}</div>
                    </ThemedCard>
                  </SettingsCard>
                  <SettingsCard title="Relationship defaults" description="Used when you create new relationships.">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldBlock label="Default confidence" description="Initial confidence for newly created relationships.">
                        <ThemedSelect
                          value={defaultRelationshipConfidence}
                          onChange={(event) => onDefaultRelationshipConfidenceChange(event.target.value as 'unverified' | 'asserted' | 'verified')}
                          className={selectClass}
                        >
                          <option value="unverified">Unverified</option>
                          <option value="asserted">Asserted</option>
                          <option value="verified">Verified</option>
                        </ThemedSelect>
                      </FieldBlock>
                      <FieldBlock label="Field-to-assertion behavior" description="How factual field edits should become source-backed assertions.">
                        <ThemedSelect
                          value={assertionFieldAutomation}
                          onChange={(event) => onAssertionFieldAutomationChange(event.target.value as 'auto' | 'prompt' | 'manual')}
                          className={selectClass}
                        >
                          <option value="auto">Auto-create when a source is linked</option>
                          <option value="prompt">Prompt before creating assertions</option>
                          <option value="manual">Manual only</option>
                        </ThemedSelect>
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
                        <ThemedSelect value={uiDensity} onChange={(event) => onUiDensityChange(event.target.value as 'comfortable' | 'compact')} className={selectClass}>
                          <option value="comfortable">Comfortable</option>
                          <option value="compact">Compact</option>
                        </ThemedSelect>
                      </FieldBlock>
                      <FieldBlock label="Motion" description="Control transitions and animated UI effects on this device.">
                        <ThemedSelect value={motionPreference} onChange={(event) => onMotionPreferenceChange(event.target.value as 'reduced' | 'standard' | 'enhanced')} className={selectClass}>
                          <option value="reduced">Reduced</option>
                          <option value="standard">Standard</option>
                          <option value="enhanced">Enhanced</option>
                        </ThemedSelect>
                      </FieldBlock>
                    </div>
                  </SettingsCard>
                </>
              )}

              {activeSection === 'personalization' && (
                <>
                  <SettingsCard title="Theme preset" description="Pick a finished look first, then fine-tune anything you want below.">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldBlock label="Theme mode" description="Switch between true dark and true light presets.">
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            ['dark', 'Dark'],
                            ['light', 'Light']
                          ] as Array<[AppearanceMode, string]>).map(([mode, label]) => {
                            const active = personalizationTheme.appearanceMode === mode;
                            return (
                              <ThemedButton
                                key={mode}
                                type="button"
                                onClick={() => {
                                  void handleAppearanceModeChange(mode);
                                }}
                                variant={active ? 'accent' : 'default'}
                                className="rounded-2xl px-4 py-3 text-sm font-medium"
                              >
                                {label}
                              </ThemedButton>
                            );
                          })}
                        </div>
                      </FieldBlock>
                      <FieldBlock label="Surface depth" description="Increase or soften panel shadows for the current theme.">
                        <ThemedSelect
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
                        </ThemedSelect>
                      </FieldBlock>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {PERSONALIZATION_PRESETS.filter((preset) => preset.appearanceMode === personalizationTheme.appearanceMode).map((preset) => {
                        const active = personalizationTheme.presetId === preset.id;
                        return (
                          <ThemedButton
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              void handlePersonalizationPresetChange(preset.id);
                            }}
                            variant={active ? 'accent' : 'default'}
                            className="rounded-[24px] p-4 text-left"
                            style={active ? { boxShadow: '0 18px 40px rgba(14,165,233,0.08)' } : undefined}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{preset.label}</div>
                                <div className="mt-1 text-xs leading-5" style={{ color: 'var(--text-muted)' }}>{preset.description}</div>
                              </div>
                              <div className="flex gap-1.5">
                                {[preset.colors.appBg, preset.colors.surfaceRaised, preset.colors.accentSky, preset.colors.accentEmerald].map((color) => (
                                  <span
                                    key={`${preset.id}-${color}`}
                                    className="h-5 w-5 rounded-full border border-white/20"
                                    style={{ backgroundColor: coerceColorValue(color) }}
                                  />
                                ))}
                              </div>
                            </div>
                          </ThemedButton>
                        );
                      })}
                    </div>
                  </SettingsCard>

                  <SettingsCard title="Advanced customization" description="Manually tune the current theme if you want something more specific than the presets.">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldBlock label="Preset state" description="Custom means your colors no longer exactly match a built-in preset.">
                        <ThemedSelect
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
                        </ThemedSelect>
                      </FieldBlock>
                      <FieldBlock label="Built-in icon pack" description="Switch icon styling without changing the case data.">
                        <ThemedSelect
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
                        </ThemedSelect>
                      </FieldBlock>
                    </div>

                    <div className="mt-5 grid gap-5 xl:grid-cols-3">
                      <ThemedSection className="space-y-4 rounded-2xl">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>Core surfaces</div>
                          <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Backgrounds, panels, and frame contrast.</div>
                        </div>
                        {([
                          ['appBg', 'App background'],
                          ['appBgSoft', 'Soft background'],
                          ['surfaceBase', 'Base surface'],
                          ['surfaceRaised', 'Raised surface'],
                          ['surfaceElevated', 'Elevated surface'],
                          ['borderSubtle', 'Subtle border'],
                          ['borderStrong', 'Strong border']
                        ] as Array<[keyof PersonalizationTheme['colors'], string]>).map(([key, label]) => (
                          <FieldBlock key={key} label={label}>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={coerceColorValue(personalizationTheme.colors[key])}
                                onChange={(event) => {
                                  void handleColorChange(key, event.target.value);
                                }}
                                className="h-11 w-14 rounded-2xl border p-1"
                                style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)' }}
                              />
                              <ThemedInput
                                value={personalizationTheme.colors[key]}
                                onChange={(event) => {
                                  void handleColorChange(key, event.target.value);
                                }}
                                className={inputClass}
                              />
                            </div>
                          </FieldBlock>
                        ))}
                      </ThemedSection>

                      <ThemedSection className="space-y-4 rounded-2xl">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>Text and accents</div>
                          <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Typography contrast and analytic highlight colors.</div>
                        </div>
                        {([
                          ['textPrimary', 'Primary text'],
                          ['textMuted', 'Muted text'],
                          ['textSoft', 'Soft text'],
                          ['accentSky', 'Primary accent'],
                          ['accentEmerald', 'Secondary accent'],
                          ['accentAmber', 'Warm accent'],
                          ['dangerSoft', 'Danger tone']
                        ] as Array<[keyof PersonalizationTheme['colors'], string]>).map(([key, label]) => (
                          <FieldBlock key={key} label={label}>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={coerceColorValue(personalizationTheme.colors[key])}
                                onChange={(event) => {
                                  void handleColorChange(key, event.target.value);
                                }}
                                className="h-11 w-14 rounded-2xl border p-1"
                                style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)' }}
                              />
                              <ThemedInput
                                value={personalizationTheme.colors[key]}
                                onChange={(event) => {
                                  void handleColorChange(key, event.target.value);
                                }}
                                className={inputClass}
                              />
                            </div>
                          </FieldBlock>
                        ))}
                      </ThemedSection>

                      <ThemedSection className="space-y-4 rounded-2xl">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>Icon pack</div>
                          <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Preview the current built-in icon styles.</div>
                        </div>
                        <div className="grid gap-3">
                          {ICON_PACK_DEFINITIONS.map((pack) => (
                            <ThemedCard
                              key={pack.id}
                              tone={personalizationTheme.iconPack === pack.id ? 'accent' : 'default'}
                              className="px-4 py-3 text-sm"
                            >
                              <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{pack.label}</div>
                              <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{pack.description}</div>
                            </ThemedCard>
                          ))}
                        </div>
                      </ThemedSection>
                    </div>
                  </SettingsCard>

                  <SettingsCard title="Canvas background" description="Change the graph atmosphere independently of the rest of the shell.">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldBlock label="Background mode">
                        <ThemedSelect
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
                        </ThemedSelect>
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
                          <div className="mt-1 text-xs" style={{ color: 'var(--text-soft)' }}>{Math.round(personalizationTheme.canvasBackground.gridOpacity * 100)}%</div>
                      </FieldBlock>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldBlock label="Background image" description="Stored locally on this device and never written into the project.">
                        <div className="space-y-3">
                          <ThemedCard className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                            {personalizationTheme.canvasBackground.imageFileName || 'No image selected'}
                          </ThemedCard>
                          <div className="flex flex-wrap gap-2">
                            <ThemedButton
                              type="button"
                              onClick={() => {
                                void handlePickBackgroundImage();
                              }}
                              className="rounded-2xl px-4 py-2 text-sm"
                            >
                              Choose image
                            </ThemedButton>
                            <ThemedButton
                              type="button"
                              onClick={() => {
                                void handleCanvasBackgroundChange({
                                  imagePath: null,
                                  imageFileName: null,
                                  mode: personalizationTheme.canvasBackground.mode === 'image' ? 'grid' : personalizationTheme.canvasBackground.mode
                                });
                              }}
                              className="rounded-2xl px-4 py-2 text-sm"
                            >
                              Clear image
                            </ThemedButton>
                          </div>
                        </div>
                      </FieldBlock>
                      <FieldBlock label="Image fit">
                        <ThemedSelect
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
                        </ThemedSelect>
                        <div className="mt-4">
                          <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Image dim / overlay</label>
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
                          <div className="mt-1 text-xs" style={{ color: 'var(--text-soft)' }}>
                            {Math.round(personalizationTheme.canvasBackground.overlayOpacity * 100)}% dimming. Lower values show more of the image.
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Image blur</label>
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
                          <div className="mt-1 text-xs" style={{ color: 'var(--text-soft)' }}>
                            {personalizationTheme.canvasBackground.imageBlurPx}px blur. Lower values keep the image sharper.
                          </div>
                        </div>
                      </FieldBlock>
                    </div>
                  </SettingsCard>

                  <SettingsCard title="Reset, export, and import" description="Keep a backup of your device theme or restore the default quickly.">
                    <div className="flex flex-wrap gap-2">
                      <ThemedButton
                        type="button"
                        onClick={() => {
                          void updatePersonalizationTheme(DEFAULT_PERSONALIZATION_THEME);
                          setPersonalizationNote('Reset all personalization to the default Vitni theme.');
                        }}
                        className="rounded-2xl px-4 py-2 text-sm"
                      >
                        Reset all
                      </ThemedButton>
                      <ThemedButton
                        type="button"
                        onClick={() => {
                          void handleExportTheme();
                        }}
                        className="rounded-2xl px-4 py-2 text-sm"
                      >
                        Export theme JSON
                      </ThemedButton>
                      <ThemedButton
                        type="button"
                        onClick={() => {
                          void handleImportTheme();
                        }}
                        className="rounded-2xl px-4 py-2 text-sm"
                      >
                        Import theme JSON
                      </ThemedButton>
                    </div>
                    {personalizationNote ? (
                      <ThemedCard className="p-4 text-sm" style={{ color: 'var(--text-primary)' }}>
                        {personalizationNote}
                      </ThemedCard>
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
                    <ThemedCard className="flex items-start justify-between gap-4 p-4">
                      <div>
                        <div className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {localAIEnabled ? (aiStatus?.setupRequired ? 'Finish local AI setup' : 'Local AI is ready') : 'Enable local AI'}
                        </div>
                        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                          {localAIEnabled
                            ? aiStatus?.setupRequired
                              ? `Vitni will install the runtime if needed, start the Ollama service, and then download ${aiStatus?.model || ollamaModel}.`
                              : `The Ollama runtime and ${aiStatus?.model || ollamaModel} are ready for on-demand report generation.`
                            : 'Turn this on to let the app provision and use a local model for reports on this device.'}
                        </p>
                      </div>
                      <ThemedBadge tone={localAIEnabled ? 'success' : 'default'} className="px-2.5 py-1 text-[11px] font-semibold">
                        {localAIEnabled ? 'Enabled' : 'Disabled'}
                      </ThemedBadge>
                    </ThemedCard>
                    <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                      <div className="space-y-3">
                        <FieldBlock label="Local model tier" description="Pick a model based on your hardware, not just output quality.">
                          <ThemedSelect
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
                          </ThemedSelect>
                        </FieldBlock>
                        <ThemedCard className="p-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                          <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedPreset?.label || 'Custom model'}</div>
                          <div className="mt-1">
                            {ollamaModelPresetId === 'custom'
                              ? 'Use a custom Ollama model tag if you already know exactly what should run on this machine.'
                              : selectedPreset?.description || 'Choose a local model preset.'}
                          </div>
                          <div className="mt-2 text-xs" style={{ color: 'var(--text-soft)' }}>
                            Download size: {selectedPreset?.approxSize || 'varies'}.
                          </div>
                        </ThemedCard>
                        <div className="flex flex-wrap gap-2">
                          <ThemedButton variant="success" onClick={handleEnableAndSetup} className="rounded-2xl px-4 py-2 text-sm font-semibold" disabled={aiBusy !== null}>
                            {aiBusy ?? (localAIEnabled ? (aiStatus?.setupRequired ? (aiStatus?.ollamaInstalled ? 'Repair / re-check' : 'Set up local AI') : 'Repair / re-check') : 'Enable and set up')}
                          </ThemedButton>
                          <ThemedButton onClick={handleDisableLocalAI} className="rounded-2xl px-4 py-2 text-sm" disabled={aiBusy !== null}>
                            Disable
                          </ThemedButton>
                          <ThemedButton onClick={handleSelfTest} className="rounded-2xl px-4 py-2 text-sm" disabled={aiBusy !== null || selfTestBusy}>
                            {selfTestBusy ? 'Running self-test…' : 'Run self-test'}
                          </ThemedButton>
                        </div>
                        {aiBusy && (
                          <ThemedSection className="space-y-2 rounded-2xl p-4">
                            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{aiBusy}</div>
                            <div className="max-h-32 overflow-y-auto whitespace-pre-line rounded-xl border px-3 py-2 font-mono text-[11px]" style={{ borderColor: 'var(--border-subtle)', background: 'color-mix(in srgb, var(--surface-base) 88%, transparent)', color: 'var(--text-muted)' }}>
                              {aiProgressDetails || aiBusy}
                            </div>
                          </ThemedSection>
                        )}
                        {setupNote ? <ThemedCard className="p-4 text-sm" style={{ color: 'var(--text-primary)' }}>{setupNote}</ThemedCard> : null}
                        {showSetupRecovery && (
                          <ThemedSection className="space-y-3 rounded-2xl p-4 text-sm" style={{ borderColor: 'var(--status-warning-border)', background: 'var(--status-warning-bg)', color: 'var(--status-warning-text)' }}>
                            <div>Automatic setup needs help from the OS. Use the system prompt or a manual install path, then re-check.</div>
                            <div className="flex flex-wrap gap-2">
                              <ThemedButton variant="success" onClick={handleEnableAndSetup} className="rounded-xl px-3 py-2" disabled={aiBusy !== null}>Install with system prompt</ThemedButton>
                              <ThemedButton onClick={handleDownload} className="rounded-xl px-3 py-2" disabled={aiBusy !== null}>Download bundled runtime</ThemedButton>
                              <ThemedButton onClick={() => window.piBridge.openExternal('https://ollama.com/download')} className="rounded-xl px-3 py-2">Open download page</ThemedButton>
                            </div>
                          </ThemedSection>
                        )}
                      </div>
                      <ThemedCard className="p-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>Runtime status</div>
                        <div className="mt-3 space-y-2">
                          <StatusRow label="Runtime" value={aiStatus?.ollamaInstalled ? 'Installed' : 'Missing'} />
                          <StatusRow label="Service" value={aiStatus?.serverUp ? 'Running' : 'Stopped'} />
                          <StatusRow label="Model" value={aiStatus?.modelAvailable ? 'Ready' : 'Not downloaded'} />
                          <StatusRow label="Model tag" value={aiStatus?.model || ollamaModel} />
                        </div>
                        {aiStatus?.downloadEstimateMb ? (
                          <p className="mt-4 text-xs" style={{ color: 'var(--text-soft)' }}>
                            First-time setup downloads roughly {Math.round(aiStatus.downloadEstimateMb / 100) / 10} GB after the service is available.
                          </p>
                        ) : null}
                        {selfTestResult ? (
                          <ThemedCard tone={selfTestResult.ok ? 'success' : 'warning'} className="mt-4 p-3 text-xs">
                            <div className="font-semibold">{selfTestResult.ok ? 'Self-test passed' : 'Self-test failed'}</div>
                            <div className="mt-1">{selfTestResult.message}</div>
                            {(typeof selfTestResult.elapsedMs === 'number' || typeof selfTestResult.firstTokenMs === 'number') && (
                              <div className="mt-2 text-current/80">
                                {typeof selfTestResult.elapsedMs === 'number' ? `Total time: ${formatDuration(selfTestResult.elapsedMs)}.` : null}{' '}
                                {typeof selfTestResult.firstTokenMs === 'number' ? `First token: ${formatDuration(selfTestResult.firstTokenMs)}.` : null}
                              </div>
                            )}
                            {selfTestResult.preview ? <div className="mt-2 rounded border border-current/20 bg-black/20 px-2 py-1 font-mono text-[11px] text-current/90">{selfTestResult.preview}</div> : null}
                          </ThemedCard>
                        ) : null}
                      </ThemedCard>
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
                        <ThemedInput value={openAIModel} onChange={(event) => void saveOpenAIModel(event.target.value)} className={inputClass} />
                      </FieldBlock>
                      <FieldBlock label="API key">
                        <ThemedInput
                          type="password"
                          value={openAIKeyInput}
                          onChange={(event) => setOpenAIKeyInput(event.target.value)}
                          placeholder={openAIStatus?.hasKey ? 'A key is already configured' : 'sk-...'}
                          className={inputClass}
                        />
                      </FieldBlock>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ThemedButton onClick={handleSaveOpenAIKey} className="rounded-2xl px-4 py-2 text-sm" disabled={openAIBusy !== null}>
                        {openAIBusy ?? 'Save key'}
                      </ThemedButton>
                      <ThemedButton onClick={handleClearOpenAIKey} className="rounded-2xl px-4 py-2 text-sm" disabled={openAIBusy !== null}>
                        Clear stored key
                      </ThemedButton>
                    </div>
                    <ThemedCard className="p-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                      <StatusRow label="Storage" value={openAIStatus?.storageMode === 'encrypted' ? 'Encrypted' : openAIStatus?.storageMode === 'plaintext' ? 'Plaintext fallback' : 'Not storing a key'} />
                      <StatusRow label="Encrypted storage" value={openAIStatus?.storageAvailable ? 'Available' : 'Unavailable'} />
                      <StatusRow label="Stored key" value={openAIStatus?.hasStoredKey ? 'Configured' : 'Not stored'} />
                      <StatusRow label="Environment key" value={openAIStatus?.hasEnvKey ? 'OPENAI_API_KEY present' : 'Not set'} />
                    </ThemedCard>
                    {openAIStatus?.storageMode === 'plaintext' ? (
                      <ThemedSection className="rounded-2xl p-4 text-sm" style={{ borderColor: 'var(--status-warning-border)', background: 'var(--status-warning-bg)', color: 'var(--status-warning-text)' }}>
                        This system does not support Electron encrypted storage, so the API key is stored in a local plaintext file under the app data directory.
                      </ThemedSection>
                    ) : null}
                    {openAINote ? <ThemedCard className="p-4 text-sm" style={{ color: 'var(--text-primary)' }}>{openAINote}</ThemedCard> : null}
                  </SettingsCard>
                </>
              )}

              {activeSection === 'advanced' && (
                <>
                  <SettingsCard title="Local runtime overrides" description="Only change these if you know the exact Ollama endpoint or model tag you need.">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldBlock label="Ollama endpoint">
                        <ThemedInput value={ollamaEndpoint} onChange={(event) => void saveEndpoint(event.target.value)} className={inputClass} />
                      </FieldBlock>
                      <FieldBlock label="Model preset">
                        <ThemedSelect
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
                        </ThemedSelect>
                      </FieldBlock>
                    </div>
                    {ollamaModelPresetId === 'custom' ? (
                      <FieldBlock label="Custom model tag">
                        <ThemedInput value={ollamaModel} onChange={(event) => void saveModel(event.target.value)} className={inputClass} placeholder="llama3.2:1b" />
                      </FieldBlock>
                    ) : null}
                  </SettingsCard>
                  <SettingsCard title="Manual controls" description="Use these when setup automation is not enough or you are troubleshooting.">
                    <div className="flex flex-wrap gap-2">
                      <ThemedButton onClick={handleTest} className="rounded-2xl px-3 py-2 text-sm" disabled={aiBusy !== null}>{aiBusy ?? 'Test connection'}</ThemedButton>
                      <ThemedButton onClick={handleDownload} className="rounded-2xl px-3 py-2 text-sm" disabled={aiBusy !== null}>Download bundled</ThemedButton>
                      <ThemedButton onClick={handleInstall} className="rounded-2xl px-3 py-2 text-sm" disabled={aiBusy !== null}>Install (system)</ThemedButton>
                      <ThemedButton onClick={handleStart} className="rounded-2xl px-3 py-2 text-sm" disabled={aiBusy !== null}>Start</ThemedButton>
                      <ThemedButton onClick={handleStop} className="rounded-2xl px-3 py-2 text-sm" disabled={aiBusy !== null}>Stop</ThemedButton>
                      <ThemedButton onClick={handlePull} className="rounded-2xl px-3 py-2 text-sm" disabled={aiBusy !== null}>Pull model</ThemedButton>
                    </div>
                    <InstallFailsafe />
                  </SettingsCard>
                </>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 border-t px-8 py-4 backdrop-blur" style={{ borderColor: 'var(--border-subtle)', background: 'color-mix(in srgb, var(--surface-elevated) 90%, transparent)' }}>
            <div className="flex items-center justify-between gap-3">
              <ThemedButton
                type="button"
                onClick={() => {
                  void handleResetSection();
                }}
                className="rounded-2xl px-4 py-2 text-sm"
              >
                Reset section
              </ThemedButton>
              <ThemedButton
                variant="accent"
                type="button"
                onClick={onClose}
                className="rounded-2xl px-4 py-2 text-sm font-semibold"
              >
                Close
              </ThemedButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--input-text)] focus:outline-none';
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
    <section
      className="space-y-4 rounded-[24px] border p-5"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-base)' }}
    >
      <div>
        <h4 className="font-mono text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h4>
        {description ? <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{description}</p> : null}
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
      <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</label>
      {description ? <p className="mt-1 text-xs" style={{ color: 'var(--text-soft)' }}>{description}</p> : null}
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
    <div
      className="flex items-start justify-between gap-4 rounded-2xl border px-4 py-3"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-base)' }}
    >
      <div>
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</div>
        {description ? <div className="mt-1 text-xs" style={{ color: 'var(--text-soft)' }}>{description}</div> : null}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
        style={{ background: checked ? 'var(--accent-sky)' : 'var(--border-strong)' }}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
          style={{ background: 'var(--surface-elevated)' }}
        />
      </button>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span style={{ color: 'var(--text-soft)' }}>{label}</span>
      <span className="text-right" style={{ color: 'var(--text-primary)' }}>{value}</span>
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
    <ThemedCard className="mt-3 rounded-md p-3 text-xs" style={{ color: 'var(--text-muted)' }}>
      <div className="mb-2 font-semibold" style={{ color: 'var(--text-primary)' }}>Install failsafe</div>
      <div className="mb-2">If automatic install fails or stalls, use the commands below.</div>
      <div className="flex items-center gap-2 mb-2">
        <ThemedButton onClick={installing ? stop : start} className="rounded px-3 py-1 text-xs">{installing ? 'Cancel install' : 'Run auto-install'}</ThemedButton>
        {note && <span style={{ color: 'var(--text-soft)' }}>{note}</span>}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <code className="rounded px-2 py-1" style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)' }}>curl -fsSL https://ollama.com/install.sh | sh</code>
        <ThemedButton onClick={() => copy('curl -fsSL https://ollama.com/install.sh | sh')} className="rounded px-2 py-1 text-xs">Copy</ThemedButton>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <code className="rounded px-2 py-1" style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)' }}>winget install Ollama.Ollama</code>
        <ThemedButton onClick={() => copy('winget install Ollama.Ollama')} className="rounded px-2 py-1 text-xs">Copy</ThemedButton>
      </div>
      <div className="mt-2">
        <ThemedButton onClick={() => window.piBridge.openExternal('https://ollama.com/download')} className="rounded px-2 py-1 text-xs">Open download page</ThemedButton>
      </div>
    </ThemedCard>
  );
}

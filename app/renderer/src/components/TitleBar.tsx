import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FaMinus, FaSquare, FaWindowRestore, FaTimes, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import vitniLogo from '../assets/vitni_logo.svg';
import { GRAPH_LAYOUT_PRESETS, type GraphLayoutPresetId } from '@renderer/features/graph/layoutPresets';
import type { SavedView } from '@renderer/types/app';

type ViewContext = 'welcome' | 'booting' | 'main';

interface TitleBarProps {
  context: ViewContext;
  onProjectNew: () => void;
  onProjectOpen: () => void;
  onProjectImportCsv?: () => void;
  onProjectClose?: () => void;
  onProjectSaveAs: () => void;
  onExportReport: () => void;
  onSettingsOpen: () => void;
  onProjectInfo: () => void;
  onTerminology: () => void;
  onMediaGallery: () => void;
  onViewZoomSelection: () => void;
  onViewFit: () => void;
  onViewCenterSelection: () => void;
  onViewRunLayoutPreset: (preset: GraphLayoutPresetId) => void;
  onViewShowGraph: () => void;
  onViewShowTimeline: () => void;
  onViewShowReview: () => void;
  onViewToggleFilters: () => void;
  onToolsToggleRelationshipMode: () => void;
  onToolsToggleBoxSelect: () => void;
  onToolsAlignLeft: () => void;
  onToolsAlignTop: () => void;
  onToolsInvertSelection: () => void;
  savedViews: SavedView[];
  activeSavedViewId: string | null;
  onApplySavedView: (viewId: string) => void;
}

interface MenuItem {
  label?: string;
  accelerator?: string;
  action?: () => void;
  separator?: boolean;
  submenu?: MenuItem[];
}

export function TitleBar({
  context,
  onProjectNew,
  onProjectOpen,
  onProjectImportCsv,
  onProjectClose,
  onProjectSaveAs,
  onExportReport,
  onSettingsOpen,
  onProjectInfo,
  onTerminology,
  onMediaGallery,
  onViewZoomSelection,
  onViewFit,
  onViewCenterSelection,
  onViewRunLayoutPreset,
  onViewShowGraph,
  onViewShowTimeline,
  onViewShowReview,
  onViewToggleFilters,
  onToolsToggleRelationshipMode,
  onToolsToggleBoxSelect,
  onToolsAlignLeft,
  onToolsAlignTop,
  onToolsInvertSelection,
  savedViews,
  activeSavedViewId,
  onApplySavedView
}: TitleBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Only check on mount and when maximize button is clicked - not polling
  useEffect(() => {
    const checkMaximized = async () => {
      const maximized = await window.piBridge.windowIsMaximized();
      setIsMaximized(maximized);
    };
    checkMaximized();
    // Remove the interval - we'll update state when needed
  }, []);

  useEffect(() => {
    if (!activeMenu) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const menuElement = menuRefs.current[activeMenu];
      if (!menuElement) return;
      
      const target = event.target as Node;
      // Don't close if clicking on the menu button or inside the menu
      if (!menuElement.contains(target)) {
        const buttonElement = (target as HTMLElement).closest?.('button');
        const isMenuButton = buttonElement?.textContent?.includes(activeMenu);
        if (!isMenuButton) {
          setActiveMenu(null);
        }
      }
    };
    
    // Use a slight delay to avoid capturing the opening click
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
    }, 10);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [activeMenu]);

  const handleMenuClick = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const handleMenuHover = useCallback((menuName: string) => {
    setActiveMenu((current) => (current && current !== menuName ? menuName : current));
  }, []);

  const handleMenuItemClick = useCallback((item: MenuItem) => {
    if (item.action) {
      item.action();
      setActiveMenu(null);
    }
  }, []);

  const handleMinimize = useCallback(() => {
    window.piBridge.windowMinimize();
  }, []);

  const handleMaximize = useCallback(async () => {
    await window.piBridge.windowMaximize();
    // Update state immediately after maximize/unmaximize
    const maximized = await window.piBridge.windowIsMaximized();
    setIsMaximized(maximized);
  }, []);

  const handleClose = useCallback(() => {
    window.piBridge.windowClose();
  }, []);

  const menus: Record<string, MenuItem[]> = useMemo(() => {
    const allMenus: Record<string, MenuItem[]> = {
      File: [
        { label: 'New Project', accelerator: 'Ctrl+N', action: onProjectNew },
        { label: 'Open Project…', accelerator: 'Ctrl+O', action: onProjectOpen },
        ...(context === 'main' ? [
          { label: 'Import CSV…', accelerator: 'Ctrl+Alt+I', action: onProjectImportCsv },
          { label: 'Save Project As…', accelerator: 'Ctrl+Shift+S', action: onProjectSaveAs },
          { separator: true },
          { label: 'Export Report…', accelerator: 'Ctrl+E', action: onExportReport },
          { separator: true },
          { label: 'Close Project', accelerator: 'Ctrl+W', action: onProjectClose }
        ] : []),
        { separator: true },
        { label: 'Quit', accelerator: 'Alt+F4', action: handleClose }
      ],
      Edit: context === 'main' ? [
        { label: 'Undo', accelerator: 'Ctrl+Z', action: () => document.execCommand('undo') },
        { label: 'Redo', accelerator: 'Ctrl+Y', action: () => document.execCommand('redo') },
        { separator: true },
        { label: 'Cut', accelerator: 'Ctrl+X', action: () => document.execCommand('cut') },
        { label: 'Copy', accelerator: 'Ctrl+C', action: () => document.execCommand('copy') },
        { label: 'Paste', accelerator: 'Ctrl+V', action: () => document.execCommand('paste') },
        { label: 'Select All', accelerator: 'Ctrl+A', action: () => document.execCommand('selectAll') }
      ] : [],
      View: context === 'main' ? [
        { label: 'Investigation', accelerator: 'Alt+1', action: onViewShowGraph },
        { label: 'Timeline', accelerator: 'Alt+2', action: onViewShowTimeline },
        { label: 'Review', accelerator: 'Alt+3', action: onViewShowReview },
        { label: 'Filters…', accelerator: 'Ctrl+Shift+L', action: onViewToggleFilters },
        ...(savedViews.length > 0
          ? [
              {
                label: 'Saved Views',
                submenu: savedViews.map((savedView) => ({
                  label: savedView.id === activeSavedViewId ? `${savedView.name}  •` : savedView.name,
                  action: () => onApplySavedView(savedView.id)
                }))
              } as MenuItem,
              { separator: true } as MenuItem
            ]
          : []),
        {
          label: 'Layout',
          submenu: GRAPH_LAYOUT_PRESETS.map((preset) => ({
            label: preset.label,
            action: () => onViewRunLayoutPreset(preset.id)
          }))
        },
        { separator: true },
        { label: 'Zoom to Selection', accelerator: 'Ctrl+Shift+Z', action: onViewZoomSelection },
        { label: 'Fit to Screen', accelerator: 'Ctrl+Shift+F', action: onViewFit },
        { label: 'Center Selection', accelerator: 'Ctrl+Shift+C', action: onViewCenterSelection }
      ] : [],
      Tools: context === 'main' ? [
        { label: 'Relationship Mode', accelerator: 'Ctrl+Shift+R', action: onToolsToggleRelationshipMode },
        { label: 'Box Selection', accelerator: 'Ctrl+Shift+B', action: onToolsToggleBoxSelect },
        { separator: true },
        { label: 'Align Left', accelerator: 'Ctrl+Shift+Left', action: onToolsAlignLeft },
        { label: 'Align Top', accelerator: 'Ctrl+Shift+Up', action: onToolsAlignTop },
        { label: 'Invert Selection', accelerator: 'Ctrl+Shift+I', action: onToolsInvertSelection }
      ] : [],
      Settings: [
        { label: 'Preferences…', accelerator: 'Ctrl+,', action: onSettingsOpen },
        ...(context === 'main' ? [
          { label: 'Project Info…', accelerator: 'Ctrl+I', action: onProjectInfo },
          { label: 'Terminology…', accelerator: 'Ctrl+/', action: onTerminology }
        ] : [])
      ],
      Media: context === 'main' ? [
        { label: 'Open Media Gallery…', accelerator: 'Ctrl+Shift+M', action: onMediaGallery }
      ] : []
    };

    // Filter out empty menus
    return Object.fromEntries(
      Object.entries(allMenus).filter(([, items]) => items.length > 0)
    );
  }, [
    context,
    onProjectNew,
    onProjectOpen,
    onProjectImportCsv,
    onProjectClose,
    onProjectSaveAs,
    onExportReport,
    onSettingsOpen,
    onProjectInfo,
    onTerminology,
    onMediaGallery,
    onViewZoomSelection,
    onViewFit,
    onViewCenterSelection,
    onViewRunLayoutPreset,
    onViewShowGraph,
    onViewShowTimeline,
    onViewShowReview,
    onViewToggleFilters,
    onToolsToggleRelationshipMode,
    onToolsToggleBoxSelect,
    onToolsAlignLeft,
    onToolsAlignTop,
    onToolsInvertSelection,
    savedViews,
    activeSavedViewId,
    onApplySavedView,
    handleClose
  ]);

  const renderMenuItems = useCallback((items: MenuItem[], nested = false) => {
    return items.map((item, idx) => {
      if (item.separator) {
        return <div key={`${nested ? 'nested' : 'root'}-sep-${idx}`} className="my-1 h-px bg-slate-700" />;
      }

      if (item.submenu?.length) {
        return (
          <div key={`${nested ? 'nested' : 'root'}-submenu-${idx}`} className="group relative">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left font-mono text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <span>{item.label}</span>
              <FaChevronRight className="ml-4 text-[10px] text-slate-500 transition group-hover:text-slate-300" />
            </button>
            <div className="panel-elevated invisible absolute left-full top-0 z-[70] ml-1 min-w-[220px] rounded-xl py-1 opacity-0 transition group-hover:visible group-hover:opacity-100">
              {renderMenuItems(item.submenu, true)}
            </div>
          </div>
        );
      }

      return (
        <button
          key={`${nested ? 'nested' : 'root'}-item-${idx}`}
          type="button"
          onClick={() => handleMenuItemClick(item)}
          className="flex w-full items-center justify-between px-3 py-2 text-left font-mono text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <span>{item.label}</span>
          {item.accelerator && <span className="ml-4 text-xs text-slate-500">{item.accelerator}</span>}
        </button>
      );
    });
  }, [handleMenuItemClick]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex h-9 select-none items-center justify-between border-b border-slate-800/70 bg-[rgba(6,10,22,0.88)] backdrop-blur-xl" style={{ WebkitAppRegion: 'drag', willChange: 'auto' } as React.CSSProperties}>
      {/* Left side - Logo and Menu items */}
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <img src={vitniLogo} alt="Vitni" className="ml-3 mr-2 h-5 w-auto opacity-90" />
        <div className="mr-2 h-4 w-px bg-slate-700/80" />
        {Object.keys(menus).map((menuName) => (
          <div key={menuName} className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMenuClick(menuName);
              }}
              onMouseEnter={() => handleMenuHover(menuName)}
              onMouseDown={(e) => {
                // Prevent drag from interfering
                e.stopPropagation();
              }}
              className={`flex h-9 items-center gap-1.5 px-3 text-[12px] font-mono uppercase tracking-[0.14em] transition-colors ${
                activeMenu === menuName
                  ? 'bg-slate-800/90 text-emerald-300'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              {menuName}
              <FaChevronDown className="text-[10px] opacity-60" />
            </button>
            {activeMenu === menuName && (
              <div
                ref={(el) => (menuRefs.current[menuName] = el)}
                className="panel-elevated absolute left-0 top-9 z-[60] mt-1 min-w-[220px] rounded-xl py-1"
                style={{ 
                  maxWidth: 'min(300px, calc(100vw - 2rem))',
                  left: '0'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {renderMenuItems(menus[menuName])}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right side - Window controls */}
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button onClick={handleMinimize} className="flex h-9 w-11 items-center justify-center text-slate-500 transition-colors hover:bg-slate-800 hover:text-white">
          <FaMinus className="text-xs" />
        </button>
        <button onClick={handleMaximize} className="flex h-9 w-11 items-center justify-center text-slate-500 transition-colors hover:bg-slate-800 hover:text-white">
          {isMaximized ? (
            <FaWindowRestore className="text-xs" />
          ) : (
            <FaSquare className="text-xs" />
          )}
        </button>
        <button onClick={handleClose} className="flex h-9 w-11 items-center justify-center text-slate-500 transition-colors hover:bg-red-600/20 hover:text-red-400">
          <FaTimes className="text-xs" />
        </button>
      </div>
    </div>
  );
}

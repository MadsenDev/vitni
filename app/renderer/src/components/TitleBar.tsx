import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FaMinus, FaSquare, FaWindowRestore, FaTimes, FaChevronDown } from 'react-icons/fa';
import vitniLogo from '../assets/vitni_logo.svg';

type ViewContext = 'welcome' | 'booting' | 'main';

interface TitleBarProps {
  context: ViewContext;
  onProjectNew: () => void;
  onProjectOpen: () => void;
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
}

interface MenuItem {
  label: string;
  accelerator?: string;
  action?: () => void;
  separator?: boolean;
  submenu?: MenuItem[];
}

export function TitleBar({
  context,
  onProjectNew,
  onProjectOpen,
  onProjectClose,
  onProjectSaveAs,
  onExportReport,
  onSettingsOpen,
  onProjectInfo,
  onTerminology,
  onMediaGallery,
  onViewZoomSelection,
  onViewFit,
  onViewCenterSelection
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
        { label: 'Zoom to Selection', accelerator: 'Ctrl+Shift+Z', action: onViewZoomSelection },
        { label: 'Fit to Screen', accelerator: 'Ctrl+Shift+F', action: onViewFit },
        { label: 'Center Selection', accelerator: 'Ctrl+Shift+C', action: onViewCenterSelection }
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
      Object.entries(allMenus).filter(([_, items]) => items.length > 0)
    );
  }, [context, onProjectNew, onProjectOpen, onProjectClose, onProjectSaveAs, onExportReport, onSettingsOpen, onProjectInfo, onTerminology, onMediaGallery, onViewZoomSelection, onViewFit, onViewCenterSelection, handleClose]);

  return (
    <div className="fixed top-0 left-0 right-0 flex h-8 items-center justify-between bg-slate-900/95 border-b border-slate-800/50 backdrop-blur-sm select-none z-50" style={{ WebkitAppRegion: 'drag', willChange: 'auto' } as React.CSSProperties}>
      {/* Left side - Logo and Menu items */}
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <img
          src={vitniLogo}
          alt="Vitni"
          className="h-5 w-auto ml-3 mr-2 opacity-90"
        />
        <div className="h-4 w-px bg-slate-700 mr-2" />
        {Object.keys(menus).map((menuName) => (
          <div key={menuName} className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMenuClick(menuName);
              }}
              onMouseDown={(e) => {
                // Prevent drag from interfering
                e.stopPropagation();
              }}
              className={`px-3 h-8 flex items-center gap-1 text-sm font-mono transition-colors ${
                activeMenu === menuName
                  ? 'bg-slate-800 text-emerald-300'
                  : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              {menuName}
              <FaChevronDown className="text-xs opacity-60" />
            </button>
            {activeMenu === menuName && (
              <div
                ref={(el) => (menuRefs.current[menuName] = el)}
                className="absolute left-0 top-8 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-xl py-1 z-[60] min-w-[200px]"
                style={{ 
                  maxWidth: 'min(300px, calc(100vw - 2rem))',
                  left: '0'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {menus[menuName].map((item, idx) => {
                  if (item.separator) {
                    return <div key={idx} className="h-px bg-slate-700 my-1" />;
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleMenuItemClick(item)}
                      className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center justify-between font-mono transition-colors"
                    >
                      <span>{item.label}</span>
                      {item.accelerator && (
                        <span className="text-xs text-slate-500 ml-4">{item.accelerator}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right side - Window controls */}
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={handleMinimize}
          className="h-8 w-10 flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <FaMinus className="text-xs" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-8 w-10 flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          {isMaximized ? (
            <FaWindowRestore className="text-xs" />
          ) : (
            <FaSquare className="text-xs" />
          )}
        </button>
        <button
          onClick={handleClose}
          className="h-8 w-10 flex items-center justify-center text-slate-400 hover:bg-red-600/20 hover:text-red-400 transition-colors"
        >
          <FaTimes className="text-xs" />
        </button>
      </div>
    </div>
  );
}


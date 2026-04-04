import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MediaFolderNode, MediaLibraryItem, SourceRecord } from '@shared/types';
import { inferMediaType, inferSourceKind, formatBytes, readFileAsArrayBuffer } from '../lib/files';
import { emitToast } from '../lib/toast';
import { piBridge } from '../services/piBridge';
import { useAttachmentPreviews } from '../lib/useAttachmentPreviews';

interface MediaLibraryModalProps {
  isOpen: boolean;
  mode: 'manage' | 'select';
  onClose: () => void;
  onSelect?: (source: SourceRecord) => void;
}

interface PendingUpload {
  file: File;
  title: string;
  kind: string;
}

type LinkFilter = 'all' | 'linked' | 'unlinked';
type SortKey = 'newest' | 'oldest' | 'name' | 'usage';
type ViewMode = 'grid' | 'list';

function folderDepth(folderPath: string) {
  return folderPath ? folderPath.split('/').filter(Boolean).length : 0;
}

function buildBreadcrumbs(folderPath: string): Array<{ label: string; path: string }> {
  const parts = folderPath.split('/').filter(Boolean);
  const crumbs = [{ label: 'All media', path: '' }];
  let current = '';
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    crumbs.push({ label: part, path: current });
  }
  return crumbs;
}

function isWithinFolder(item: MediaLibraryItem, folderPath: string) {
  if (!folderPath) return true;
  return item.folderPath === folderPath || item.folderPath.startsWith(`${folderPath}/`);
}

function folderName(folder: MediaFolderNode) {
  return folder.path ? folder.name : 'All media';
}

function usageLabel(item: MediaLibraryItem) {
  if (item.usageCount === 0) return 'Unlinked';
  if (item.usageCount === 1) return '1 reference';
  return `${item.usageCount} references`;
}

export function MediaLibraryModal({ isOpen, mode, onClose, onSelect }: MediaLibraryModalProps) {
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [folders, setFolders] = useState<MediaFolderNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [pendingReplacement, setPendingReplacement] = useState<{ item: MediaLibraryItem; file: File } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video' | 'audio' | 'document' | 'other'>('all');
  const [linkFilter, setLinkFilter] = useState<LinkFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFolderTree, setShowFolderTree] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [folderDraft, setFolderDraft] = useState('');
  const [folderError, setFolderError] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [moveTarget, setMoveTarget] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const { previews, isLoading: isPreviewLoading, error: previewError } = useAttachmentPreviews(items);

  const refreshLibrary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await piBridge.listMediaLibrary();
      setItems(result.items);
      setFolders(result.folders);
      if (!result.folders.some((folder) => folder.path === currentFolder)) {
        setCurrentFolder('');
      }
      if (!result.items.some((item) => item.id === activeId)) {
        const nextActive = result.items[0]?.id ?? null;
        setActiveId(nextActive);
      }
      setSelectedIds((current) => current.filter((id) => result.items.some((item) => item.id === id)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load media library');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void (async () => {
      try {
        const [defaultView, defaultSort, showFolders] = await Promise.all([
          piBridge.getProjectSetting<ViewMode>('media_library_default_view'),
          piBridge.getProjectSetting<SortKey>('media_library_default_sort'),
          piBridge.getProjectSetting<boolean>('media_library_show_folders')
        ]);
        setViewMode(defaultView === 'list' ? 'list' : 'grid');
        setSortBy(
          defaultSort === 'oldest' || defaultSort === 'name' || defaultSort === 'usage'
            ? defaultSort
            : 'newest'
        );
        setShowFolderTree(typeof showFolders === 'boolean' ? showFolders : true);
      } catch {
        setViewMode('grid');
        setSortBy('newest');
        setShowFolderTree(true);
      }
      await refreshLibrary();
    })();
  }, [isOpen]);

  const previewById = useMemo(() => {
    const map = new Map<string, { url: string; mimeType: string; fileName: string }>();
    previews.forEach((preview) => {
      map.set(preview.source.id, {
        url: preview.url,
        mimeType: preview.mimeType,
        fileName: preview.fileName
      });
    });
    return map;
  }, [previews]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const next = items.filter((item) => {
      if (!isWithinFolder(item, currentFolder)) return false;
      const mediaType = inferMediaType(item.kind, item.mime);
      if (typeFilter !== 'all' && mediaType !== typeFilter) return false;
      if (linkFilter === 'linked' && item.usageCount === 0) return false;
      if (linkFilter === 'unlinked' && item.usageCount > 0) return false;
      if (!query) return true;

      const haystack = [
        item.displayName,
        item.title,
        item.fileName,
        item.folderPath,
        item.locator,
        item.kind,
        item.mime,
        ...item.usage.flatMap((usage) => [usage.entity_label, usage.entity_id, usage.assertion_path])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });

    next.sort((left, right) => {
      switch (sortBy) {
        case 'oldest':
          return (left.modified_at ?? left.added_at) - (right.modified_at ?? right.added_at);
        case 'name':
          return left.displayName.localeCompare(right.displayName);
        case 'usage':
          return right.usageCount - left.usageCount || left.displayName.localeCompare(right.displayName);
        case 'newest':
        default:
          return (right.modified_at ?? right.added_at) - (left.modified_at ?? left.added_at);
      }
    });

    return next;
  }, [currentFolder, items, linkFilter, search, sortBy, typeFilter]);

  useEffect(() => {
    if (!visibleItems.some((item) => item.id === activeId)) {
      setActiveId(visibleItems[0]?.id ?? null);
    }
  }, [activeId, visibleItems]);

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) ?? null,
    [activeId, items]
  );

  useEffect(() => {
    if (activeItem) {
      setRenameDraft(activeItem.displayName);
      setMoveTarget(activeItem.folderPath);
    }
  }, [activeItem]);

  const folderOptions = useMemo(() => {
    const baseFolders = folders.length > 0 ? folders : [{ path: '', name: 'All media', parentPath: null }];
    return baseFolders.slice().sort((left, right) => left.path.localeCompare(right.path));
  }, [folders]);

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file) {
      setPendingUpload({
        file,
        title: file.name,
        kind: inferSourceKind(file.type || 'application/octet-stream')
      });
      setUploadError(null);
    }
    event.target.value = '';
  };

  const handleReplaceChooseFile = () => {
    if (!activeItem) return;
    replaceInputRef.current?.click();
  };

  const handleReplaceFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file && activeItem) {
      setPendingReplacement({ item: activeItem, file });
      setUploadError(null);
    }
    event.target.value = '';
  };

  const handleUploadConfirm = async () => {
    if (!pendingUpload) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const data = await readFileAsArrayBuffer(pendingUpload.file);
      const created = await piBridge.uploadMedia({
        data,
        name: pendingUpload.file.name,
        mime: pendingUpload.file.type || 'application/octet-stream',
        folderPath: currentFolder,
        title: pendingUpload.title.trim() || pendingUpload.file.name,
        kind: pendingUpload.kind
      });
      setPendingUpload(null);
      await refreshLibrary();
      setActiveId(created.id);
      if (mode === 'select' && onSelect) {
        onSelect(created);
        onClose();
      }
    } catch (uploadErr) {
      setUploadError(uploadErr instanceof Error ? uploadErr.message : 'Failed to upload media');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReplaceConfirm = async () => {
    if (!pendingReplacement) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const data = await readFileAsArrayBuffer(pendingReplacement.file);
      const updated = await piBridge.replaceMedia({
        sourceId: pendingReplacement.item.id,
        data,
        name: pendingReplacement.file.name,
        mime: pendingReplacement.file.type || 'application/octet-stream'
      });
      setPendingReplacement(null);
      await refreshLibrary();
      setActiveId(updated.id);
      emitToast({
        tone: 'success',
        title: 'Media replaced',
        description: `${updated.displayName} now points to the new file, and all existing usages were preserved.`
      });
    } catch (replaceError) {
      setUploadError(replaceError instanceof Error ? replaceError.message : 'Failed to replace media');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    const trimmed = folderDraft.trim();
    if (!trimmed) return;
    setFolderError(null);
    try {
      const target = currentFolder ? `${currentFolder}/${trimmed}` : trimmed;
      const created = await piBridge.createMediaFolder(target);
      setFolderDraft('');
      await refreshLibrary();
      setCurrentFolder(created.path);
    } catch (createError) {
      setFolderError(createError instanceof Error ? createError.message : 'Failed to create folder');
    }
  };

  const handleRename = async () => {
    if (!activeItem) return;
    setIsSubmittingAction(true);
    try {
      await piBridge.renameMedia({
        sourceId: activeItem.id,
        displayName: renameDraft.trim() || activeItem.displayName
      });
      await refreshLibrary();
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleMoveActive = async () => {
    if (!activeItem) return;
    setIsSubmittingAction(true);
    try {
      await piBridge.moveMedia({
        sourceIds: [activeItem.id],
        destinationFolderPath: moveTarget
      });
      await refreshLibrary();
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleMoveSelected = async () => {
    if (selectedIds.length === 0) return;
    setIsSubmittingAction(true);
    try {
      await piBridge.moveMedia({
        sourceIds: selectedIds,
        destinationFolderPath: moveTarget
      });
      setSelectedIds([]);
      await refreshLibrary();
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const toggleSelected = (itemId: string) => {
    setSelectedIds((current) => (
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId]
    ));
  };

  const headerTitle = mode === 'select' ? 'Select Media' : 'Media Library';
  const headerSubtitle =
    mode === 'select'
      ? 'Browse folders, filter results, and choose an existing asset or upload a new one.'
      : 'Organize project media with folders, search, filtering, previews, and move/rename actions.';

  if (!isOpen) {
    return null;
  }

  const modal = (
    <div className="fixed inset-0 z-[110] bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_rgba(15,23,42,0.98)_38%)] shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
        <div className="flex items-start justify-between border-b border-slate-800/80 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-white">{headerTitle}</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">{headerSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className={`grid min-h-0 flex-1 ${showFolderTree ? 'grid-cols-[260px_minmax(0,1fr)_340px]' : 'grid-cols-[minmax(0,1fr)_340px]'}`}>
          {showFolderTree ? (
          <aside className="border-r border-slate-800/80 bg-slate-950/60 px-4 py-5">
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Folders</p>
              <div className="mt-3 space-y-1">
                {folderOptions.map((folder) => (
                  <button
                    key={folder.path || '__root__'}
                    type="button"
                    onClick={() => setCurrentFolder(folder.path)}
                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm transition ${
                      currentFolder === folder.path
                        ? 'bg-sky-500/15 text-sky-100 ring-1 ring-sky-500/40'
                        : 'text-slate-300 hover:bg-slate-900/60 hover:text-white'
                    }`}
                    style={{ paddingLeft: `${12 + folderDepth(folder.path) * 16}px` }}
                  >
                    <span className="truncate">{folderName(folder)}</span>
                    {folder.path === '' ? <span className="text-[11px] text-slate-500">{items.length}</span> : null}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'manage' && (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Create folder</p>
                <input
                  value={folderDraft}
                  onChange={(event) => setFolderDraft(event.target.value)}
                  placeholder={currentFolder ? `Inside ${currentFolder}` : 'Folder name'}
                  className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
                {folderError ? <p className="mt-2 text-xs text-red-300">{folderError}</p> : null}
                <button
                  type="button"
                  onClick={() => { void handleCreateFolder(); }}
                  className="mt-3 w-full rounded-2xl bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                >
                  Create folder
                </button>
              </div>
            )}
          </aside>
          ) : null}

          <section className="min-h-0 overflow-hidden px-6 py-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, file name, folder, mime, or linked entity…"
                className="min-w-[260px] flex-1 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-2.5 text-sm text-white focus:border-sky-500 focus:outline-none"
              />
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
                className="rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
              >
                <option value="all">All types</option>
                <option value="image">Images</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="document">Documents</option>
                <option value="other">Other</option>
              </select>
              <select
                value={linkFilter}
                onChange={(event) => setLinkFilter(event.target.value as LinkFilter)}
                className="rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
              >
                <option value="all">All linkage</option>
                <option value="linked">Linked only</option>
                <option value="unlinked">Unlinked only</option>
              </select>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortKey)}
                className="rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name</option>
                <option value="usage">Most referenced</option>
              </select>
              <div className="inline-flex rounded-2xl border border-slate-700 bg-slate-950/80 p-1">
                <button
                  type="button"
                  onClick={() => setShowFolderTree((current) => !current)}
                  className={`rounded-xl px-3 py-1.5 text-sm transition ${showFolderTree ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {showFolderTree ? 'Hide folders' : 'Show folders'}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`rounded-xl px-3 py-1.5 text-sm transition ${viewMode === 'grid' ? 'bg-sky-500/20 text-sky-100' : 'text-slate-400 hover:text-white'}`}
                >
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`rounded-xl px-3 py-1.5 text-sm transition ${viewMode === 'list' ? 'bg-sky-500/20 text-sky-100' : 'text-slate-400 hover:text-white'}`}
                >
                  List
                </button>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/50 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-slate-100">{buildBreadcrumbs(currentFolder).map((crumb) => crumb.label).join(' / ')}</div>
                <div className="text-xs text-slate-500">
                  {visibleItems.length} asset{visibleItems.length === 1 ? '' : 's'}
                  {selectedIds.length > 0 ? ` • ${selectedIds.length} selected` : ''}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleChooseFile()}
                  className="rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white"
                >
                  Upload media
                </button>
                {mode === 'manage' && selectedIds.length > 0 ? (
                  <>
                    <select
                      value={moveTarget}
                      onChange={(event) => setMoveTarget(event.target.value)}
                      className="rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
                    >
                      {folderOptions.map((folder) => (
                        <option key={folder.path || '__root_option__'} value={folder.path}>
                          {folderName(folder)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => { void handleMoveSelected(); }}
                      disabled={isSubmittingAction}
                      className="rounded-2xl bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-70"
                    >
                      Move selected
                    </button>
                  </>
                ) : null}
              </div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
              <input ref={replaceInputRef} type="file" className="hidden" onChange={handleReplaceFileChange} />
            </div>

            {pendingUpload ? (
              <div className="mb-4 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
                  <input
                    value={pendingUpload.title}
                    onChange={(event) =>
                      setPendingUpload((current) => (current ? { ...current, title: event.target.value } : current))
                    }
                    className="rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                    placeholder="Display name"
                  />
                  <input
                    value={pendingUpload.kind}
                    onChange={(event) =>
                      setPendingUpload((current) => (current ? { ...current, kind: event.target.value } : current))
                    }
                    className="rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                    placeholder="Kind"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {pendingUpload.file.name} will be uploaded to <span className="text-slate-300">{currentFolder || 'All media'}</span>.
                </p>
                {uploadError ? <p className="mt-2 text-sm text-red-300">{uploadError}</p> : null}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { void handleUploadConfirm(); }}
                    disabled={isUploading}
                    className="rounded-2xl bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-70"
                  >
                    {isUploading ? 'Uploading…' : 'Save to library'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingUpload(null)}
                    disabled={isUploading}
                    className="rounded-2xl border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {pendingReplacement ? (
              <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-950/25 p-4">
                <p className="text-sm font-semibold text-amber-100">Replace file for {pendingReplacement.item.displayName}</p>
                <p className="mt-2 text-xs text-amber-50/80">
                  The asset will keep the same media ID and all existing usages. Only the underlying file and file metadata will change.
                </p>
                <p className="mt-2 text-xs text-amber-50/70">
                  New file: {pendingReplacement.file.name}
                </p>
                {uploadError ? <p className="mt-2 text-sm text-red-300">{uploadError}</p> : null}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { void handleReplaceConfirm(); }}
                    disabled={isUploading}
                    className="rounded-2xl bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:opacity-70"
                  >
                    {isUploading ? 'Replacing…' : 'Replace file'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingReplacement(null);
                      setUploadError(null);
                    }}
                    disabled={isUploading}
                    className="rounded-2xl border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {error ? <p className="mb-3 text-sm text-red-300">{error}</p> : null}
            {previewError ? <p className="mb-3 text-sm text-red-300">{previewError}</p> : null}
            {(isLoading || isPreviewLoading) ? <p className="mb-3 text-sm text-slate-500">Loading media…</p> : null}

            {visibleItems.length === 0 && !isLoading ? (
              <div className="rounded-[28px] border border-dashed border-slate-800/80 bg-slate-950/30 px-6 py-16 text-center">
                <p className="text-sm text-slate-400">No media matched this folder and filter set.</p>
                <p className="mt-2 text-xs text-slate-500">Try another folder, clear filters, or upload a new file.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid max-h-[calc(100vh-280px)] gap-4 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                {visibleItems.map((item) => {
                  const preview = previewById.get(item.id);
                  const isActive = item.id === activeId;
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <article
                      key={item.id}
                      className={`overflow-hidden rounded-[24px] border transition ${
                        isActive
                          ? 'border-sky-500/60 bg-slate-900 shadow-[0_0_0_1px_rgba(14,165,233,0.15)]'
                          : 'border-slate-800/80 bg-slate-950/50 hover:border-slate-700'
                      }`}
                    >
                      <div
                        onClick={() => setActiveId(item.id)}
                        className="block h-full w-full cursor-pointer text-left"
                      >
                        <div className="relative h-44 overflow-hidden bg-slate-950/70">
                          {mode === 'manage' ? (
                            <label className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-black/45 px-2 py-1 text-xs text-white">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelected(item.id)}
                                onClick={(event) => event.stopPropagation()}
                              />
                              Select
                            </label>
                          ) : null}
                          {preview ? (
                            preview.mimeType.startsWith('image/') ? (
                              <img src={preview.url} alt={item.displayName} className="h-full w-full object-cover" />
                            ) : preview.mimeType.startsWith('video/') ? (
                              <video src={preview.url} className="h-full w-full object-cover" muted />
                            ) : preview.mimeType.startsWith('audio/') ? (
                              <div className="flex h-full items-center justify-center text-slate-400">Audio asset</div>
                            ) : (
                              <div className="flex h-full items-center justify-center text-slate-400">{preview.mimeType}</div>
                            )
                          ) : (
                            <div className="flex h-full items-center justify-center text-slate-600">No preview</div>
                          )}
                        </div>
                        <div className="space-y-2 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-semibold text-slate-100">{item.displayName}</h3>
                              <p className="mt-1 truncate text-xs text-slate-500">{item.folderPath || 'Root folder'}</p>
                            </div>
                            <span className="rounded-full border border-slate-700/80 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                              {item.mediaType}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>{usageLabel(item)}</span>
                            <span>{formatBytes(item.file_size)}</span>
                          </div>
                          {mode === 'select' ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelect?.(item);
                                onClose();
                              }}
                              className="w-full rounded-2xl bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                            >
                              Use this media
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto rounded-[24px] border border-slate-800/80 bg-slate-950/40">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-950/95 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      {mode === 'manage' ? <th className="px-4 py-3">Select</th> : null}
                      <th className="px-4 py-3">Asset</th>
                      <th className="px-4 py-3">Folder</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Usage</th>
                      <th className="px-4 py-3">Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`cursor-pointer border-t border-slate-800/60 transition ${item.id === activeId ? 'bg-sky-500/8' : 'hover:bg-slate-900/60'}`}
                        onClick={() => setActiveId(item.id)}
                      >
                        {mode === 'manage' ? (
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item.id)}
                              onChange={() => toggleSelected(item.id)}
                              onClick={(event) => event.stopPropagation()}
                            />
                          </td>
                        ) : null}
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-100">{item.displayName}</div>
                          <div className="text-xs text-slate-500">{item.fileName}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{item.folderPath || 'Root folder'}</td>
                        <td className="px-4 py-3 text-slate-400">{item.mediaType}</td>
                        <td className="px-4 py-3 text-slate-400">{usageLabel(item)}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {new Date((item.modified_at ?? item.added_at) * 1000).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <aside className="border-l border-slate-800/80 bg-slate-950/55 px-5 py-5">
            {activeItem ? (
              <>
                <div className="mb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Preview</p>
                  <div className="mt-3 overflow-hidden rounded-[24px] border border-slate-800/80 bg-slate-950/70">
                    {(() => {
                      const preview = previewById.get(activeItem.id);
                      if (!preview) {
                        return <div className="flex h-60 items-center justify-center text-sm text-slate-500">No preview available</div>;
                      }
                      if (preview.mimeType.startsWith('image/')) {
                        return (
                          <button type="button" onClick={() => setLightboxOpen(true)} className="block w-full">
                            <img src={preview.url} alt={activeItem.displayName} className="h-60 w-full object-cover" />
                          </button>
                        );
                      }
                      if (preview.mimeType.startsWith('video/')) {
                        return <video src={preview.url} controls className="h-60 w-full object-cover" />;
                      }
                      if (preview.mimeType.startsWith('audio/')) {
                        return <audio src={preview.url} controls className="w-full p-6" />;
                      }
                      return <div className="flex h-60 items-center justify-center px-6 text-sm text-slate-500">{preview.mimeType}</div>;
                    })()}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{activeItem.displayName}</h3>
                    <p className="mt-1 text-sm text-slate-400">{activeItem.fileName}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Type</div>
                      <div className="mt-1 text-slate-200">{activeItem.mediaType}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Usage</div>
                      <div className="mt-1 text-slate-200">{usageLabel(activeItem)}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Folder</div>
                      <div className="mt-1 break-words text-slate-200">{activeItem.folderPath || 'Root folder'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Size</div>
                      <div className="mt-1 text-slate-200">{formatBytes(activeItem.file_size)}</div>
                    </div>
                  </div>

                  {mode === 'manage' ? (
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Manage asset</p>
                      <input
                        value={renameDraft}
                        onChange={(event) => setRenameDraft(event.target.value)}
                        className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => { void handleRename(); }}
                        disabled={isSubmittingAction}
                        className="mt-3 w-full rounded-2xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white disabled:opacity-70"
                      >
                        Rename asset
                      </button>
                      <button
                        type="button"
                        onClick={handleReplaceChooseFile}
                        disabled={isSubmittingAction || isUploading}
                        className="mt-3 w-full rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-400 hover:bg-amber-500/15 disabled:opacity-70"
                      >
                        Replace file…
                      </button>
                      <select
                        value={moveTarget}
                        onChange={(event) => setMoveTarget(event.target.value)}
                        className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
                      >
                        {folderOptions.map((folder) => (
                          <option key={folder.path || '__move_folder__'} value={folder.path}>
                            {folderName(folder)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => { void handleMoveActive(); }}
                        disabled={isSubmittingAction}
                        className="mt-3 w-full rounded-2xl bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-70"
                      >
                        Move asset
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onSelect?.(activeItem);
                        onClose();
                      }}
                      className="w-full rounded-2xl bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                    >
                      Use this media
                    </button>
                  )}

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Linked usage</p>
                    <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                      {activeItem.usage.length > 0 ? (
                        activeItem.usage.map((usage) => (
                          <div key={`${usage.assertion_id}-${usage.entity_id}`} className="rounded-2xl border border-slate-800/80 bg-slate-900/55 p-3">
                            <div className="text-sm font-medium text-slate-100">{usage.entity_label ?? usage.entity_id}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{usage.assertion_path}</div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-800/80 bg-slate-900/40 p-3 text-sm text-slate-500">
                          This asset is not linked to any entity yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
                Select a media item to inspect it.
              </div>
            )}
          </aside>
        </div>
      </div>

      {lightboxOpen && activeItem ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-8" onClick={() => setLightboxOpen(false)}>
          <div className="max-h-full max-w-6xl overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <img
              src={previewById.get(activeItem.id)?.url}
              alt={activeItem.displayName}
              className="max-h-[85vh] max-w-[85vw] object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );

  return createPortal(modal, document.body);
}

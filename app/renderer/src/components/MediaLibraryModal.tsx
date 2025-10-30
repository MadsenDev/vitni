import { ChangeEvent, Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { SourceRecord, SourceWithUsage } from '@shared/types';
import { inferSourceKind, readFileAsArrayBuffer } from '../lib/files';
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

export function MediaLibraryModal({ isOpen, mode, onClose, onSelect }: MediaLibraryModalProps) {
  const [sources, setSources] = useState<SourceWithUsage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { previews, isLoading: isPreviewLoading, error: previewError } = useAttachmentPreviews(sources);

  useEffect(() => {
    if (!isOpen) return;

    const loadSources = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await window.piBridge.listAllSourcesWithUsage();
        setSources(result);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load media library');
      } finally {
        setIsLoading(false);
      }
    };

    void loadSources();
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

  const resetPendingUpload = () => {
    setPendingUpload(null);
    setUploadError(null);
  };

  const refreshSources = async (): Promise<SourceWithUsage[]> => {
    const result = await window.piBridge.listAllSourcesWithUsage();
    setSources(result);
    return result;
  };

  const handleUploadConfirm = async () => {
    if (!pendingUpload) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const data = await readFileAsArrayBuffer(pendingUpload.file);
      const attachment = await window.piBridge.attachFile({
        data,
        name: pendingUpload.file.name,
        mime: pendingUpload.file.type || 'application/octet-stream'
      });

      const sourceId = await window.piBridge.createSource({
        kind: pendingUpload.kind,
        locator: attachment.relativePath,
        title: pendingUpload.title.trim() ? pendingUpload.title.trim() : undefined,
        hash: attachment.hash,
        mime: attachment.mimeType || pendingUpload.file.type || null
      });

      const updated = await refreshSources();
      const created = updated.find((item) => item.id === sourceId);
      resetPendingUpload();

      if (mode === 'select' && onSelect && created) {
        onSelect(created);
        onClose();
      }
    } catch (uploadErr) {
      setUploadError(uploadErr instanceof Error ? uploadErr.message : 'Failed to upload media');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectSource = (source: SourceRecord) => {
    if (mode === 'select' && onSelect) {
      onSelect(source);
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  const headerTitle = mode === 'select' ? 'Select Media' : 'Media Library';
  const headerSubtitle =
    mode === 'select'
      ? 'Choose an existing media item or upload a new attachment.'
      : 'Review all stored media attachments, their types, and where they are referenced.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 p-6">
          <div>
            <h2 className="text-xl font-semibold text-white">{headerTitle}</h2>
            <p className="mt-1 text-sm text-slate-400">{headerSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-slate-800 px-2 py-1 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <section className="rounded border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Upload new media
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Files are stored inside the project and become available for reuse in assertions and source links.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleChooseFile}
                  className="rounded border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500"
                >
                  Choose file
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
              </div>

              {pendingUpload && (
                <div className="mt-4 space-y-3 rounded border border-slate-800 bg-slate-900/70 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Title
                      <input
                        value={pendingUpload.title}
                        onChange={(event) =>
                          setPendingUpload((current) =>
                            current
                              ? { ...current, title: event.target.value }
                              : current
                          )
                        }
                        className="mt-1 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                      />
                    </label>
                    <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Kind
                      <input
                        value={pendingUpload.kind}
                        onChange={(event) =>
                          setPendingUpload((current) =>
                            current
                              ? { ...current, kind: event.target.value }
                              : current
                          )
                        }
                        className="mt-1 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-slate-500">
                    Selected file: <span className="font-medium text-slate-300">{pendingUpload.file.name}</span>
                  </p>
                  {uploadError && <p className="text-sm text-red-400">{uploadError}</p>}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleUploadConfirm}
                      disabled={isUploading}
                      className="rounded bg-sky-500 px-3 py-1 text-sm font-semibold text-slate-900 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isUploading ? 'Uploading…' : 'Save to library'}
                    </button>
                    <button
                      type="button"
                      onClick={resetPendingUpload}
                      disabled={isUploading}
                      className="rounded border border-slate-700 px-3 py-1 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Library contents
                </h3>
                {(isLoading || isPreviewLoading) && (
                  <span className="text-xs text-slate-500">Loading…</span>
                )}
              </div>
              {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
              {previewError && <p className="mt-2 text-sm text-red-400">{previewError}</p>}
              {sources.length === 0 && !isLoading ? (
                <p className="mt-3 text-sm text-slate-500">
                  No media has been uploaded yet. Add files above to start building your gallery.
                </p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sources.map((source) => {
                    const preview = previewById.get(source.id);
                    const usage = source.usage;
                    return (
                      <div
                        key={source.id}
                        className="flex h-full flex-col overflow-hidden rounded border border-slate-800 bg-slate-900/70"
                      >
                        <div className="h-40 w-full bg-slate-950/60">
                          {preview ? (
                            preview.mimeType.startsWith('image/') ? (
                              <img
                                src={preview.url}
                                alt={source.title ?? preview.fileName ?? source.locator}
                                className="h-full w-full object-cover"
                              />
                            ) : preview.mimeType.startsWith('video/') ? (
                              <video src={preview.url} controls className="h-full w-full object-cover" />
                            ) : preview.mimeType.startsWith('audio/') ? (
                              <audio src={preview.url} controls className="mt-6 w-full px-3" />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <span className="text-xs text-slate-500">{preview.mimeType}</span>
                              </div>
                            )
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <span className="text-xs text-slate-600">No preview available</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-3 text-sm text-slate-200">
                          <div className="font-medium text-slate-100">
                            {source.title ?? preview?.fileName ?? source.locator}
                          </div>
                          <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                            {source.kind} • {source.mime ?? 'Unknown mime'}
                          </div>
                          <div className="mt-2 flex-1 space-y-1 overflow-y-auto text-xs text-slate-400">
                            {usage.length > 0 ? (
                              usage.map((item) => (
                                <Fragment key={`${item.assertion_id}-${item.entity_id}`}>
                                  <div className="rounded border border-slate-800/60 bg-slate-950/40 p-2">
                                    <div className="font-medium text-slate-200">
                                      {item.entity_label ?? item.entity_id}
                                    </div>
                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                                      {item.assertion_path}
                                    </div>
                                  </div>
                                </Fragment>
                              ))
                            ) : (
                              <p className="rounded border border-dashed border-slate-800/60 bg-slate-950/20 p-2 text-xs text-slate-500">
                                Not linked to any entities yet.
                              </p>
                            )}
                          </div>
                          {mode === 'select' && (
                            <button
                              type="button"
                              onClick={() => handleSelectSource(source)}
                              className="mt-3 w-full rounded bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-400"
                            >
                              Use this media
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

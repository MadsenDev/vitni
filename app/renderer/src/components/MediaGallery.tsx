import { useEffect, useMemo, useState } from 'react';
import type { SourceRecord } from '@shared/types';
import { base64ToBlob } from '../lib/files';

interface MediaGalleryProps {
  sources: SourceRecord[];
}

interface MediaPreview {
  source: SourceRecord;
  url: string;
  mimeType: string;
  fileName: string;
}

export function MediaGallery({ sources }: MediaGalleryProps) {
  const attachmentSources = useMemo(
    () => sources.filter((source) => Boolean(source.hash) && Boolean(source.locator)),
    [sources]
  );
  const [previews, setPreviews] = useState<MediaPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const loadAttachments = async () => {
      if (attachmentSources.length === 0) {
        setPreviews((previous) => {
          previous.forEach((item) => URL.revokeObjectURL(item.url));
          return [];
        });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const loaded = await Promise.all(
          attachmentSources.map(async (source) => {
            try {
              const data = await window.piBridge.getAttachmentData({
                locator: source.locator,
                mime: source.mime
              });
              const blob = base64ToBlob(data.base64, data.mimeType);
              const url = URL.createObjectURL(blob);
              return { source, url, mimeType: data.mimeType, fileName: data.fileName };
            } catch (attachmentError) {
              console.warn('[MediaGallery] Failed to load attachment', attachmentError);
              return null;
            }
          })
        );

        if (!isCancelled) {
          setPreviews((previous) => {
            previous.forEach((item) => URL.revokeObjectURL(item.url));
            return loaded.filter((item): item is MediaPreview => item !== null);
          });
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load attachments');
          setPreviews((previous) => {
            previous.forEach((item) => URL.revokeObjectURL(item.url));
            return [];
          });
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadAttachments();

    return () => {
      isCancelled = true;
      setPreviews((previous) => {
        previous.forEach((item) => URL.revokeObjectURL(item.url));
        return [];
      });
    };
  }, [attachmentSources]);

  if (attachmentSources.length === 0) {
    return null;
  }

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Media Gallery</h4>
        {isLoading && <span className="text-xs text-slate-500">Loading…</span>}
      </div>
      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
      {previews.length === 0 && !isLoading ? (
        <p className="text-sm text-slate-500">Attachments could not be previewed.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {previews.map((preview) => {
            const title = preview.source.title ?? preview.fileName ?? preview.source.locator;
            if (preview.mimeType.startsWith('image/')) {
              return (
                <figure
                  key={preview.source.id}
                  className="overflow-hidden rounded border border-slate-800 bg-slate-900/70"
                >
                  <img
                    src={preview.url}
                    alt={title}
                    className="h-40 w-full object-cover"
                  />
                  <figcaption className="px-3 py-2 text-xs text-slate-300">
                    {title}
                    <div className="mt-1 text-[11px] text-slate-500">
                      {preview.mimeType}
                    </div>
                  </figcaption>
                </figure>
              );
            }

            if (preview.mimeType.startsWith('video/')) {
              return (
                <figure
                  key={preview.source.id}
                  className="overflow-hidden rounded border border-slate-800 bg-slate-900/70"
                >
                  <video src={preview.url} controls className="h-40 w-full object-cover" />
                  <figcaption className="px-3 py-2 text-xs text-slate-300">
                    {title}
                    <div className="mt-1 text-[11px] text-slate-500">{preview.mimeType}</div>
                  </figcaption>
                </figure>
              );
            }

            if (preview.mimeType.startsWith('audio/')) {
              return (
                <figure
                  key={preview.source.id}
                  className="rounded border border-slate-800 bg-slate-900/70 p-3"
                >
                  <figcaption className="text-xs font-medium text-slate-200">{title}</figcaption>
                  <audio src={preview.url} controls className="mt-2 w-full" />
                  <p className="mt-2 text-[11px] text-slate-500">{preview.mimeType}</p>
                </figure>
              );
            }

            return (
              <div
                key={preview.source.id}
                className="rounded border border-dashed border-slate-800 bg-slate-900/70 p-3"
              >
                <p className="text-xs font-medium text-slate-200">{title}</p>
                <p className="mt-1 text-[11px] text-slate-500">{preview.mimeType}</p>
                <a
                  href={preview.url}
                  download={preview.fileName || preview.source.title || preview.source.id}
                  className="mt-3 inline-flex items-center rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-200 transition hover:border-slate-500"
                >
                  Download
                </a>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

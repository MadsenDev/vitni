import { useEffect, useMemo, useState } from 'react';
import type { SourceRecord } from '@shared/types';
import { base64ToBlob } from './files';

export interface AttachmentPreview {
  source: SourceRecord;
  url: string;
  mimeType: string;
  fileName: string;
}

interface UseAttachmentPreviewsResult {
  attachmentSources: SourceRecord[];
  previews: AttachmentPreview[];
  isLoading: boolean;
  error: string | null;
}

export function useAttachmentPreviews(sources: SourceRecord[]): UseAttachmentPreviewsResult {
  const attachmentSources = useMemo(
    () => sources.filter((source) => Boolean(source.hash) && Boolean(source.locator)),
    [sources]
  );

  const [previews, setPreviews] = useState<AttachmentPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      if (attachmentSources.length === 0) {
        setPreviews((previous) => {
          previous.forEach((item) => URL.revokeObjectURL(item.url));
          return [];
        });
        setError(null);
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
              return {
                source,
                url,
                mimeType: data.mimeType,
                fileName: data.fileName
              };
            } catch (attachmentError) {
              console.warn('[useAttachmentPreviews] Failed to load attachment', attachmentError);
              return null;
            }
          })
        );

        if (!isCancelled) {
          setPreviews((previous) => {
            previous.forEach((item) => URL.revokeObjectURL(item.url));
            return loaded.filter((item): item is AttachmentPreview => item !== null);
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

    void load();

    return () => {
      isCancelled = true;
      setPreviews((previous) => {
        previous.forEach((item) => URL.revokeObjectURL(item.url));
        return [];
      });
    };
  }, [attachmentSources]);

  return { attachmentSources, previews, isLoading, error };
}

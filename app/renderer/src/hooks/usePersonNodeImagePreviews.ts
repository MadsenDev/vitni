import { useEffect, useState } from 'react';
import { base64ToBlob } from '@renderer/lib/files';
import { piBridge } from '@renderer/services/piBridge';
import type { GraphSnapshot } from '@renderer/types/graph';

export function usePersonNodeImagePreviews(graph: GraphSnapshot, showNodeImages: boolean): Map<string, string> {
  const [imagePreviews, setImagePreviews] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!showNodeImages) {
      setImagePreviews((previous) => {
        previous.forEach((url) => URL.revokeObjectURL(url));
        return new Map();
      });
      return;
    }

    let isCancelled = false;

    const loadImagePreviews = async () => {
      try {
        const allSources = await piBridge.listAllSourcesWithUsage();
        const photoSourceIds = new Set<string>();

        graph.nodes.forEach((node) => {
          if (node.type === 'person' && node.properties?.photo) {
            photoSourceIds.add(String(node.properties.photo));
          }
        });

        const nextPreviews = new Map<string, string>();
        await Promise.all(
          Array.from(photoSourceIds).map(async (sourceId) => {
            try {
              const source = allSources.find((item) => item.id === sourceId);
              if (!source) return;
              const data = await piBridge.getAttachmentDataBySourceId({ sourceId });
              if (!data.mimeType?.startsWith('image/')) return;
              const blob = base64ToBlob(data.base64, data.mimeType);
              nextPreviews.set(sourceId, URL.createObjectURL(blob));
            } catch (error) {
              console.warn('[usePersonNodeImagePreviews] Failed to load image preview', sourceId, error);
            }
          })
        );

        if (isCancelled) {
          nextPreviews.forEach((url) => URL.revokeObjectURL(url));
          return;
        }

        setImagePreviews((previous) => {
          previous.forEach((url) => URL.revokeObjectURL(url));
          return nextPreviews;
        });
      } catch (error) {
        console.error('[usePersonNodeImagePreviews] Failed to load image previews', error);
      }
    };

    void loadImagePreviews();

    return () => {
      isCancelled = true;
    };
  }, [graph.nodes, showNodeImages]);

  useEffect(
    () => () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    },
    [imagePreviews]
  );

  return imagePreviews;
}

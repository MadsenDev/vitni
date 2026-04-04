export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer();
}

export function inferSourceKind(mimeType: string): string {
  if (!mimeType) {
    return 'document';
  }

  if (mimeType.startsWith('image/')) {
    return 'image';
  }

  if (mimeType.startsWith('video/')) {
    return 'video';
  }

  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }

  if (mimeType === 'application/pdf') {
    return 'document';
  }

  if (mimeType.includes('text/')) {
    return 'document';
  }

  return 'file';
}

export function inferMediaType(kind: string, mimeType?: string | null): 'image' | 'video' | 'audio' | 'document' | 'other' {
  if (mimeType?.startsWith('image/') || kind === 'image') return 'image';
  if (mimeType?.startsWith('video/') || kind === 'video') return 'video';
  if (mimeType?.startsWith('audio/') || kind === 'audio') return 'audio';
  if (mimeType === 'application/pdf' || mimeType?.startsWith('text/') || kind === 'document') return 'document';
  return 'other';
}

export function formatBytes(bytes?: number | null): string {
  if (bytes == null || Number.isNaN(bytes)) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binaryString = atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

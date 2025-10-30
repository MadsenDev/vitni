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

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binaryString = atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

import { type ChangeEvent, type FormEvent, useState } from 'react';
import type { AttachmentResult, Confidence, EntityRecord } from '@shared/types';
import { formatConfidenceLabel } from '../../lib/confidence';
import { inferSourceKind, readFileAsArrayBuffer } from '../../lib/files';

interface Props {
  entityId: EntityRecord['id'];
  onSourceCreated: () => void;
}

const CONFIDENCE_LEVELS: Confidence[] = ['verified', 'asserted', 'unverified'];

export function AddSourceForm({ entityId, onSourceCreated }: Props) {
  const [kind, setKind] = useState('document');
  const [locator, setLocator] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [confidence, setConfidence] = useState<Confidence>('asserted');
  const [sourceMime, setSourceMime] = useState<string | null>(null);
  const [uploadedAttachment, setUploadedAttachment] = useState<
    (AttachmentResult & { originalName: string }) | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    kind.trim().length > 0 &&
    locator.trim().length > 0 &&
    !isSubmitting &&
    !isUploading;

  const resetAttachment = () => {
    setUploadedAttachment(null);
    setLocator('');
    setTitle('');
    setSourceMime(null);
    setKind('document');
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      const data = await readFileAsArrayBuffer(file);
      const attachment = await window.piBridge.attachFile({
        data,
        name: file.name,
        mime: file.type || 'application/octet-stream'
      });

      setUploadedAttachment({ ...attachment, originalName: file.name });
      setLocator(attachment.relativePath);
      setTitle((current) => current || file.name);
      setKind(inferSourceKind(file.type || attachment.mimeType));
      setSourceMime(attachment.mimeType || file.type || 'application/octet-stream');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload attachment');
      resetAttachment();
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const sourceId = await window.piBridge.createSource({
        kind,
        locator,
        title: title.trim() ? title.trim() : undefined,
        hash: uploadedAttachment?.hash ?? null,
        mime: sourceMime ?? uploadedAttachment?.mimeType ?? null
      });

      await window.piBridge.createAssertion({
        subject_kind: 'entity',
        subject_id: entityId,
        path: 'source.reference',
        value: note.trim() ? { note: note.trim() } : {},
        source_id: sourceId,
        confidence
      });

      await window.piBridge.recordAudit({
        action: 'link_source',
        subject_kind: 'entity',
        subject_id: entityId,
        actor: 'user',
        reason: `Source linked (${title.trim() || locator.trim()})`,
        transform_run_id: null
      });

      setKind('document');
      resetAttachment();
      setNote('');
      setConfidence('asserted');

      onSourceCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add source');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Add source">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attachment</label>
        <div className="mt-2 space-y-2 rounded border border-slate-800 bg-slate-900/60 p-3">
          <div className="flex items-center gap-2">
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="text-xs text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-slate-800 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-200 hover:file:bg-slate-700"
            />
            {uploadedAttachment && (
              <button
                type="button"
                onClick={resetAttachment}
                className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                Remove file
              </button>
            )}
          </div>
          {isUploading && <p className="text-xs text-slate-500">Uploading…</p>}
          {uploadedAttachment && (
            <div className="rounded border border-slate-800 bg-slate-950/40 p-2 text-xs text-slate-400">
              <p className="font-medium text-slate-200">{uploadedAttachment.originalName}</p>
              <p className="truncate">Stored as: {uploadedAttachment.relativePath}</p>
              <p className="capitalize">Detected kind: {kind}</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Kind</label>
        <input
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          value={kind}
          onChange={(event) => setKind(event.target.value)}
          placeholder="document"
          required
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Locator</label>
        <input
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          value={locator}
          onChange={(event) => setLocator(event.target.value)}
          placeholder="/path/to/file.pdf"
          readOnly={Boolean(uploadedAttachment)}
          required
        />
        {uploadedAttachment && (
          <p className="mt-1 text-xs text-slate-500">Locator locked to stored attachment path.</p>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Title</label>
        <input
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Leaked memo"
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Investigator note</label>
        <textarea
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Brief context for why this source matters"
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Confidence</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CONFIDENCE_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className={`rounded px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
                confidence === level
                  ? 'bg-slate-200 text-slate-900'
                  : 'border border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
              onClick={() => setConfidence(level)}
            >
              {formatConfidenceLabel(level)}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        className="w-full rounded bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canSubmit}
      >
        {isSubmitting ? 'Saving…' : 'Attach source'}
      </button>
    </form>
  );
}

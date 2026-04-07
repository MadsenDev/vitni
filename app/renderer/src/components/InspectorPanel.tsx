import { ConfidenceBadge } from './ConfidenceBadge';
import { LocationMapPicker } from './LocationMapPicker';
import { SourcesList } from './SourcesList';
import { MediaLibraryModal } from './MediaLibraryModal';
import type { EntityType } from '@shared/types';
import type { SourceRecord, TransformManifest, TransformRegistry } from '@shared/types';
import type { DerivedReviewAssertion } from '@renderer/features/review/reviewModel';
import {
  buildFieldAssertionValue,
  deriveFieldAssertionState,
  getAssertionFieldMapping,
  getAssertionFieldMappings,
  getFieldAssertionPrimitiveValue,
  type AssertionFieldMapping,
  type DerivedFieldAssertionState
} from '@renderer/features/assertions/assertionFieldMappings';
import { resolveNodeTypeIcon } from '@renderer/features/personalization/iconPacks';
import type { IconPackId } from '@renderer/features/personalization/theme';
import {
  ThemedBadge,
  ThemedButton,
  ThemedCard,
  ThemedInput,
  ThemedPanel,
  ThemedSection,
  ThemedSelect,
  ThemedTextarea
} from '@renderer/features/personalization/primitives';
import { piBridge } from '@renderer/services/piBridge';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';
import { emitToast } from '@renderer/lib/toast';
import type { SearchFocusState } from '@renderer/types/app';
import type { NodeType } from '../lib/nodeTypes/index';
import { relationshipTypes } from '../lib/relationshipTypes';
import { useAttachmentPreviews } from '../lib/useAttachmentPreviews';
import { extractDomain } from '../lib/fetchWebsiteMetadata';
import React from 'react';
import { createPortal } from 'react-dom';

/**
 * InspectorPanel is the main detail surface for selected graph entities.
 *
 * It combines three different responsibilities:
 * - summary/property editing for regular nodes and edges
 * - specialized artifact/location views for richer node types
 * - assertion/fact helpers that keep summary fields aligned with evidence
 *
 * The file is intentionally large because those flows still share a lot of UI
 * state. Comments below mark the higher-level sections so later extraction into
 * focused inspector modules is straightforward.
 */
interface ParsedNode {
  id: string;
  type: string;
  label: string | null;
  properties: Record<string, unknown>;
}

interface ParsedEdge {
  id: string;
  src_id: string;
  dst_id: string;
  type: string;
  properties?: Record<string, unknown>;
}

type AssertionView = ParsedAssertionRecord;

function parseCoordinate(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function buildOpenStreetMapUrls(latitude: number, longitude: number) {
  const latPad = 0.008;
  const lonPad = 0.012;
  const left = longitude - lonPad;
  const right = longitude + lonPad;
  const top = latitude + latPad;
  const bottom = latitude - latPad;
  return {
    embedUrl: `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latitude}%2C${longitude}`,
    browserUrl: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`
  };
}

function isHttpUrl(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

function formatFileSize(bytes: number | null | undefined) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return null;
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatNodeDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function isEmptyFieldValue(value: unknown) {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function fieldValueEquals(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function summarizeFieldValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((entry) => summarizeFieldValue(entry)).filter(Boolean).join(', ') || null;
  const serialized = JSON.stringify(value);
  return serialized.length > 120 ? `${serialized.slice(0, 117)}...` : serialized;
}

function formatSourceTimestamp(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  const normalized = value > 1_000_000_000_000 ? value : value * 1000;
  return new Date(normalized).toLocaleString();
}

function downloadPreviewAsset(url: string, fileName: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function buildArtifactPreviewTitle(node: ParsedNode) {
  return node.label || String(node.properties.title || node.properties.filename || node.properties.name || 'Artifact');
}

const inspectorInputClassName = 'w-full';
const inspectorButtonClassName = 'px-3 py-1.5 text-xs';

function buildArtifactSourcePool(sources: SourceRecord[], imageSources: SourceRecord[]) {
  const map = new Map<string, SourceRecord>();
  [...imageSources, ...sources].forEach((source) => {
    map.set(source.id, source);
  });
  return Array.from(map.values());
}

function resolvePrimaryArtifactSource(
  node: ParsedNode,
  sourcePool: SourceRecord[],
  previewMap: Map<string, { url: string; mimeType: string; fileName: string }>
) {
  const previewable = sourcePool.filter((source) => previewMap.has(source.id));
  const documentLike = sourcePool.filter(
    (source) =>
      source.mime?.startsWith('application/pdf') ||
      source.mime?.startsWith('text/') ||
      source.kind === 'document'
  );

  if (node.type === 'media') {
    return (
      previewable.find((source) => {
        const mime = previewMap.get(source.id)?.mimeType ?? source.mime ?? '';
        return mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/');
      }) ??
      previewable[0] ??
      sourcePool[0] ??
      null
    );
  }

  if (node.type === 'document' || node.type === 'identity_document') {
    return documentLike[0] ?? previewable[0] ?? sourcePool[0] ?? null;
  }

  return null;
}

// Shared artifact helpers keep preview-first node types readable without
// forcing the main render body to re-implement file/source heuristics.
function buildArtifactExternalUrl(node: ParsedNode, source: SourceRecord | null) {
  const nodeUrl =
    typeof node.properties.url === 'string'
      ? node.properties.url
      : typeof node.properties.profileUrl === 'string'
        ? node.properties.profileUrl
        : null;
  if (isHttpUrl(nodeUrl)) return nodeUrl;
  if (source && isHttpUrl(source.locator)) return source.locator;
  return null;
}

function ArtifactDetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/45 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-100">{value}</div>
    </div>
  );
}

function FieldFactComposerModal({
  open,
  fieldLabel,
  assertionPath,
  valuePreview,
  sources,
  onClose,
  onSubmit
}: {
  open: boolean;
  fieldLabel: string;
  assertionPath: string;
  valuePreview: string | null;
  sources: SourceRecord[];
  onClose: () => void;
  onSubmit: (payload: {
    sourceId?: string | null;
    sourceKind?: string;
    sourceLocator?: string;
    sourceTitle?: string;
    confidence: AssertionView['confidence'];
  }) => Promise<void>;
}) {
  const [sourceMode, setSourceMode] = React.useState<'existing' | 'new'>(sources.length > 0 ? 'existing' : 'new');
  const [sourceId, setSourceId] = React.useState<string>(sources[0]?.id ?? '');
  const [sourceKind, setSourceKind] = React.useState('document');
  const [sourceLocator, setSourceLocator] = React.useState('');
  const [sourceTitle, setSourceTitle] = React.useState('');
  const [confidence, setConfidence] = React.useState<AssertionView['confidence']>('asserted');
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setSourceMode(sources.length > 0 ? 'existing' : 'new');
    setSourceId(sources[0]?.id ?? '');
    setSourceKind('document');
    setSourceLocator('');
    setSourceTitle('');
    setConfidence('asserted');
    setError(null);
    setIsSaving(false);
  }, [open, sources]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/75 p-6 backdrop-blur-md" onClick={onClose}>
      <div
        className="panel-elevated w-[min(92vw,680px)] rounded-[28px] border border-slate-800/80 bg-slate-950/96 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Create fact</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{fieldLabel}</h3>
            <p className="mt-2 text-sm text-slate-400">
              Create a source-backed fact for <span className="text-slate-200">{assertionPath}</span>.
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:bg-slate-800"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-slate-800/80 bg-slate-900/45 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Fact value</div>
          <div className="mt-1 text-sm text-slate-100">{valuePreview || 'Empty value'}</div>
        </div>

        <div className="grid gap-5 md:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">Source</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`rounded-xl border px-3 py-1.5 text-xs transition-colors ${
                    sourceMode === 'existing'
                      ? 'border-sky-500/40 bg-sky-500/10 text-sky-200'
                      : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:bg-slate-800'
                  }`}
                  onClick={() => setSourceMode('existing')}
                  disabled={sources.length === 0}
                >
                  Use linked source
                </button>
                <button
                  type="button"
                  className={`rounded-xl border px-3 py-1.5 text-xs transition-colors ${
                    sourceMode === 'new'
                      ? 'border-sky-500/40 bg-sky-500/10 text-sky-200'
                      : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:bg-slate-800'
                  }`}
                  onClick={() => setSourceMode('new')}
                >
                  Create source
                </button>
              </div>
            </div>

            {sourceMode === 'existing' ? (
              <div>
                {sources.length > 0 ? (
                  <select
                    value={sourceId}
                    onChange={(event) => setSourceId(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {sources.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.title || source.display_name || source.file_name || source.locator}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 px-4 py-5 text-sm text-slate-500">
                    No linked sources yet. Switch to <span className="text-slate-300">Create source</span> to add one now.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  value={sourceKind}
                  onChange={(event) => setSourceKind(event.target.value)}
                  placeholder="Source kind"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <input
                  value={sourceLocator}
                  onChange={(event) => setSourceLocator(event.target.value)}
                  placeholder="/path/to/file.pdf or https://example.test"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <input
                  value={sourceTitle}
                  onChange={(event) => setSourceTitle(event.target.value)}
                  placeholder="Source title"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">Confidence</div>
              <select
                value={confidence}
                onChange={(event) => setConfidence(event.target.value as AssertionView['confidence'])}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="asserted">Asserted</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/35 px-4 py-3 text-xs text-slate-400">
              The summary field remains editable, but this fact becomes the evidence-backed version used for review and reporting.
            </div>
          </div>
        </div>

        {error ? <div className="mt-4 text-sm text-rose-300">{error}</div> : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-xl border border-sky-500/35 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-200 transition-colors hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() => {
              void (async () => {
                setError(null);
                if (sourceMode === 'existing' && !sourceId) {
                  setError('Choose a linked source first.');
                  return;
                }
                if (sourceMode === 'new' && (!sourceKind.trim() || !sourceLocator.trim())) {
                  setError('Source kind and locator are required.');
                  return;
                }
                setIsSaving(true);
                try {
                  await onSubmit({
                    sourceId: sourceMode === 'existing' ? sourceId : null,
                    sourceKind: sourceMode === 'new' ? sourceKind.trim() : undefined,
                    sourceLocator: sourceMode === 'new' ? sourceLocator.trim() : undefined,
                    sourceTitle: sourceMode === 'new' ? sourceTitle.trim() : undefined,
                    confidence
                  });
                  onClose();
                } catch (error) {
                  setError(error instanceof Error ? error.message : 'Failed to create fact.');
                } finally {
                  setIsSaving(false);
                }
              })();
            }}
          >
            {isSaving ? 'Creating…' : 'Create fact'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ArtifactPreviewModal({
  open,
  title,
  preview,
  externalUrl,
  onClose
}: {
  open: boolean;
  title: string;
  preview: { url: string; mimeType: string; fileName: string } | null;
  externalUrl: string | null;
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/75 p-6 backdrop-blur-md" onClick={onClose}>
      <div
        className="panel-elevated flex h-[min(84vh,820px)] w-[min(94vw,1100px)] flex-col overflow-hidden rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Artifact Preview</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {externalUrl ? (
              <button
                type="button"
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 transition-colors hover:bg-emerald-500/20"
                onClick={() => void piBridge.openExternal(externalUrl)}
              >
                Open source
              </button>
            ) : null}
            {preview ? (
              <button
                type="button"
                className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:bg-slate-800"
                onClick={() => downloadPreviewAsset(preview.url, preview.fileName)}
              >
                Download
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:bg-slate-800"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-950 p-4">
          {!preview ? (
            <div className="text-sm text-slate-500">No preview is available for this artifact.</div>
          ) : preview.mimeType.startsWith('image/') ? (
            <img src={preview.url} alt={title} className="max-h-full max-w-full rounded-2xl object-contain" />
          ) : preview.mimeType.startsWith('video/') ? (
            <video src={preview.url} controls className="max-h-full max-w-full rounded-2xl bg-black" />
          ) : preview.mimeType.startsWith('audio/') ? (
            <div className="w-full max-w-2xl rounded-2xl border border-slate-800/80 bg-slate-900/55 p-8">
              <audio src={preview.url} controls className="w-full" />
            </div>
          ) : preview.mimeType === 'application/pdf' ? (
            <iframe title={title} src={preview.url} className="h-full w-full rounded-2xl border-0 bg-white" />
          ) : preview.mimeType.startsWith('text/') ? (
            <iframe title={title} src={preview.url} className="h-full w-full rounded-2xl border-0 bg-white" />
          ) : (
            <div className="text-sm text-slate-500">{preview.mimeType}</div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function ArtifactInspectorCard({
  node,
  source,
  preview,
  externalUrl,
  onOpenPreview,
  onAddSource
}: {
  node: ParsedNode;
  source: SourceRecord | null;
  preview: { url: string; mimeType: string; fileName: string } | null;
  externalUrl: string | null;
  onOpenPreview: () => void;
  onAddSource: () => void;
}) {
  const title = buildArtifactPreviewTitle(node);
  const isMedia = node.type === 'media';
  const isIdentity = node.type === 'identity_document';

  return (
    <div className="rounded-[24px] border border-slate-800/80 bg-slate-950/30 px-4 py-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            {isMedia ? 'Media Preview' : isIdentity ? 'Identity Document' : 'Document Summary'}
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            {isMedia
              ? 'Preview and review the core artifact before diving into raw properties.'
              : isIdentity
                ? 'Credential-first view with identity fields and attached artifact context.'
                : 'Document-first view with quick access to the underlying artifact or source.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {preview ? (
            <button
              type="button"
              className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-100 transition-colors hover:bg-sky-500/20"
              onClick={onOpenPreview}
            >
              Open full preview
            </button>
          ) : null}
          {externalUrl ? (
            <button
              type="button"
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 transition-colors hover:bg-emerald-500/20"
              onClick={() => void piBridge.openExternal(externalUrl)}
            >
              Open source
            </button>
          ) : null}
        </div>
      </div>

      {preview ? (
        <div className="mb-4 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/60">
          {preview.mimeType.startsWith('image/') ? (
            <img src={preview.url} alt={title} className="h-60 w-full object-cover" />
          ) : preview.mimeType.startsWith('video/') ? (
            <video src={preview.url} controls className="h-60 w-full object-cover bg-black" />
          ) : preview.mimeType.startsWith('audio/') ? (
            <div className="p-6">
              <audio src={preview.url} controls className="w-full" />
            </div>
          ) : preview.mimeType === 'application/pdf' ? (
            <iframe title={title} src={preview.url} className="h-72 w-full border-0 bg-white" />
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-slate-500">{preview.mimeType}</div>
          )}
        </div>
      ) : (
        <div className="mb-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 px-4 py-8 text-center text-sm text-slate-500">
          {isMedia ? 'No linked media source is available yet.' : 'No linked artifact source is available yet.'}
          <div className="mt-3">
            <button
              type="button"
              className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:bg-slate-800"
              onClick={onAddSource}
            >
              Attach source
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {isMedia ? (
          <>
            <ArtifactDetailRow label="Filename" value={String(node.properties.filename || source?.display_name || source?.file_name || source?.title || '')} />
            <ArtifactDetailRow label="Media Type" value={String(node.properties.mediaType || '')} />
            <ArtifactDetailRow label="Format" value={String(node.properties.format || source?.mime || '')} />
            <ArtifactDetailRow label="Created" value={formatNodeDate(node.properties.createdDate)} />
            <ArtifactDetailRow label="Resolution" value={String(node.properties.resolution || '')} />
            <ArtifactDetailRow label="Duration" value={String(node.properties.duration || '')} />
          </>
        ) : isIdentity ? (
          <>
            <ArtifactDetailRow label="Document Type" value={String(node.properties.documentType || '')} />
            <ArtifactDetailRow label="Holder Name" value={String(node.properties.holderName || '')} />
            <ArtifactDetailRow label="Document Number" value={String(node.properties.documentNumber || '')} />
            <ArtifactDetailRow label="Issuing Country" value={String(node.properties.issuingCountry || '')} />
            <ArtifactDetailRow label="Issuing Authority" value={String(node.properties.issuingAuthority || '')} />
            <ArtifactDetailRow label="Issue / Expiry" value={[formatNodeDate(node.properties.issueDate), formatNodeDate(node.properties.expiryDate)].filter(Boolean).join(' → ')} />
          </>
        ) : (
          <>
            <ArtifactDetailRow label="Title" value={String(node.properties.title || node.label || '')} />
            <ArtifactDetailRow label="Document Type" value={String(node.properties.documentType || '')} />
            <ArtifactDetailRow label="Author" value={String(node.properties.author || '')} />
            <ArtifactDetailRow label="Recipient" value={String(node.properties.recipient || '')} />
            <ArtifactDetailRow
              label="Dates"
              value={[formatNodeDate(node.properties.createdDate), formatNodeDate(node.properties.modifiedDate)].filter(Boolean).join(' • ')}
            />
            <ArtifactDetailRow label="Confidentiality" value={String(node.properties.confidentiality || '')} />
          </>
        )}
        <ArtifactDetailRow label="Source Kind" value={source?.kind || null} />
        <ArtifactDetailRow label="MIME" value={preview?.mimeType || source?.mime || null} />
        <ArtifactDetailRow label="Stored File" value={source?.display_name || source?.file_name || null} />
        <ArtifactDetailRow label="File Size" value={formatFileSize(source?.file_size)} />
        <ArtifactDetailRow label="Added" value={formatSourceTimestamp(source?.added_at)} />
        <ArtifactDetailRow label="Modified" value={formatSourceTimestamp(source?.modified_at)} />
      </div>
    </div>
  );
}

function LocationMapCard({
  coordinates,
  label,
  onExpand
}: {
  coordinates: { latitude: number; longitude: number } | null;
  label: string;
  onExpand: () => void;
}) {
  const urls = React.useMemo(
    () => (coordinates ? buildOpenStreetMapUrls(coordinates.latitude, coordinates.longitude) : null),
    [coordinates]
  );

  return (
    <div className="rounded-[24px] border border-slate-800/80 bg-slate-950/30 px-4 py-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Map</h4>
          <p className="mt-1 text-xs text-slate-500">
            {coordinates ? 'OpenStreetMap preview for this location node.' : 'No coordinates set yet. Use the map to place this location.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:bg-slate-800"
            onClick={onExpand}
          >
            {coordinates ? 'Open map' : 'Set on map'}
          </button>
          {urls ? (
            <button
              type="button"
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 transition-colors hover:bg-emerald-500/20"
              onClick={() => void piBridge.openExternal(urls.browserUrl)}
            >
              Open in browser
            </button>
          ) : null}
        </div>
      </div>
      {urls ? (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/60">
            <iframe
              title={`Map preview for ${label}`}
              src={urls.embedUrl}
              className="h-56 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>{coordinates!.latitude.toFixed(5)}, {coordinates!.longitude.toFixed(5)}</span>
            <span>Source: OpenStreetMap</span>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 px-4 py-8 text-center text-sm text-slate-500">
          Choose coordinates on a map to enable the location preview and browser deep-link.
        </div>
      )}
    </div>
  );
}

function FieldAssertionPromptModal({
  open,
  fieldLabel,
  valuePreview,
  sourceLabel,
  onClose,
  onConfirm
}: {
  open: boolean;
  fieldLabel: string;
  valuePreview: string | null;
  sourceLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  // Fact creation is intentionally modal so field rows stay quiet by default
  // and only expand into source/confidence details when the user asks for it.
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/75 p-6 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[28px] border border-slate-800/80 bg-slate-950/95 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.48)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Create fact</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{fieldLabel}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            This field changed. Create a source-backed fact now, or keep the summary field as-is for the moment.
          </p>
        </div>
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/55 px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Value</div>
            <div className="mt-2 text-sm text-slate-100">{valuePreview || 'Empty value'}</div>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/55 px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Supporting source</div>
            <div className="mt-2 text-sm text-slate-100">{sourceLabel}</div>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800"
            onClick={onClose}
          >
            Skip for now
          </button>
          <button
            type="button"
            className="rounded-xl border border-sky-500/35 bg-sky-500/10 px-4 py-2 text-sm text-sky-200 transition-colors hover:bg-sky-500/20"
            onClick={onConfirm}
          >
            Create fact
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function FieldFactsPopover({
  open,
  anchorRect,
  title,
  children,
  onClose
}: {
  open: boolean;
  anchorRect: DOMRect | null;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const popoverRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!popoverRef.current) return;
      if (popoverRef.current.contains(event.target as Node)) return;
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const handleDismiss = () => onClose();

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleDismiss);
    window.addEventListener('scroll', handleDismiss, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleDismiss);
      window.removeEventListener('scroll', handleDismiss, true);
    };
  }, [onClose, open]);

  if (!open || !anchorRect || typeof document === 'undefined') return null;

  const width = 380;
  const left = Math.min(Math.max(16, anchorRect.right - width), window.innerWidth - width - 16);
  const top = Math.min(anchorRect.bottom + 8, window.innerHeight - 120);

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[135] w-[380px] rounded-[24px] border border-slate-800/80 bg-slate-950/95 p-3 shadow-[0_28px_80px_rgba(0,0,0,0.48)] backdrop-blur-xl"
      style={{ left, top, maxHeight: Math.max(260, window.innerHeight - top - 24) }}
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Facts</p>
          <h4 className="mt-1 truncate text-sm font-semibold text-slate-100">{title}</h4>
        </div>
        <button
          type="button"
          className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-[11px] text-slate-300 transition-colors hover:bg-slate-800"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div className="max-h-[min(70vh,540px)] overflow-y-auto pr-1">{children}</div>
    </div>,
    document.body
  );
}

function AssertionCard({
  assertion,
  highlighted = false,
  derivedReview,
  onOpenInReview,
  onNextUnreviewed
}: {
  assertion: AssertionView;
  highlighted?: boolean;
  derivedReview?: DerivedReviewAssertion | null;
  onOpenInReview?: (() => void) | null;
  onNextUnreviewed?: (() => void) | null;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [jsonValue, setJsonValue] = React.useState(JSON.stringify(assertion.value, null, 2));
  const [confidence, setConfidence] = React.useState<AssertionView['confidence']>(assertion.confidence);
  const [reviewState, setReviewState] = React.useState<AssertionView['review_state']>(assertion.review_state);
  const [reviewNote, setReviewNote] = React.useState(assertion.review_note ?? '');
  const [jsonError, setJsonError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);

  React.useEffect(() => {
    setJsonValue(JSON.stringify(assertion.value, null, 2));
    setConfidence(assertion.confidence);
    setReviewState(assertion.review_state);
    setReviewNote(assertion.review_note ?? '');
    setJsonError(null);
    setIsEditing(false);
    setIsDeleting(false);
  }, [assertion.confidence, assertion.id, assertion.review_note, assertion.review_state, assertion.value]);

  const reviewToneClass =
    assertion.review_state === 'accepted'
      ? 'bg-emerald-500/15 text-emerald-200'
      : assertion.review_state === 'disputed'
        ? 'bg-amber-500/15 text-amber-200'
        : assertion.review_state === 'rejected'
          ? 'bg-rose-500/15 text-rose-200'
          : 'bg-slate-800/80 text-slate-300';

  const reviewLabel =
    assertion.review_state === 'accepted'
      ? 'Accepted'
      : assertion.review_state === 'disputed'
        ? 'Disputed'
        : assertion.review_state === 'rejected'
          ? 'Rejected'
          : 'Unreviewed';

  const persistReviewState = async (nextReviewState: AssertionView['review_state']) => {
    setIsSaving(true);
    try {
      const ok = await piBridge.updateAssertion(assertion.id, {
        review_state: nextReviewState,
        review_note: reviewNote.trim() || null
      });
      if (!ok) {
        throw new Error('Assertion review update was not applied.');
      }
      emitToast({ tone: 'success', title: 'Fact review updated' });
      window.dispatchEvent(new CustomEvent('pi:refresh'));
    } catch (error) {
      emitToast({
        tone: 'error',
        title: 'Fact review failed',
        description: error instanceof Error ? error.message : 'Unexpected renderer error.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    let parsedValue: Record<string, unknown>;

    try {
      const candidate = JSON.parse(jsonValue);
      if (candidate === null || Array.isArray(candidate) || typeof candidate !== 'object') {
        throw new Error('Assertion value must be a JSON object.');
      }
      parsedValue = candidate as Record<string, unknown>;
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
      return;
    }

    setJsonError(null);
    setIsSaving(true);

    try {
      const ok = await piBridge.updateAssertion(assertion.id, {
        confidence,
        value: parsedValue,
        review_state: reviewState,
        review_note: reviewNote.trim() || null
      });
      if (!ok) {
        throw new Error('Assertion update was not applied.');
      }

      setIsEditing(false);
      emitToast({ tone: 'success', title: 'Fact updated' });
      window.dispatchEvent(new CustomEvent('pi:refresh'));
    } catch (error) {
      emitToast({
        tone: 'error',
        title: 'Fact update failed',
        description: error instanceof Error ? error.message : 'Unexpected renderer error.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsRemoving(true);
    try {
      const ok = await piBridge.deleteAssertion(assertion.id);
      if (!ok) {
        throw new Error('Assertion delete was not applied.');
      }

      emitToast({ tone: 'success', title: 'Fact deleted' });
      window.dispatchEvent(new CustomEvent('pi:refresh'));
    } catch (error) {
      emitToast({
        tone: 'error',
        title: 'Fact delete failed',
        description: error instanceof Error ? error.message : 'Unexpected renderer error.'
      });
    } finally {
      setIsRemoving(false);
      setIsDeleting(false);
    }
  };

  return (
    <div
      data-assertion-card-id={assertion.id}
      className={
        `${highlighted ? 'ring-2 ring-sky-500/70 shadow-[0_0_0_1px_rgba(14,165,233,0.15)]' : ''} ${
          assertion.confidence === 'unverified'
            ? 'rounded-3xl border border-dashed border-unverified/70 bg-slate-900/40 p-4'
            : 'rounded-3xl border border-slate-800/80 bg-slate-900/40 p-4'
        }`
      }
    >
      <div className="space-y-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Fact path</div>
          <div className="mt-1 break-words text-sm font-semibold leading-6 text-slate-100">{assertion.path}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ConfidenceBadge confidence={assertion.confidence} />
          <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${reviewToneClass}`}>{reviewLabel}</span>
          {derivedReview ? (
            <>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${
                  derivedReview.evidenceStatus === 'none'
                    ? 'bg-rose-500/15 text-rose-200'
                    : derivedReview.evidenceStatus === 'single'
                      ? 'bg-sky-500/15 text-sky-200'
                      : 'bg-emerald-500/15 text-emerald-200'
                }`}
              >
                {derivedReview.evidenceStatus === 'none'
                  ? 'No source'
                  : derivedReview.evidenceStatus === 'single'
                    ? 'Single source'
                    : `${derivedReview.supportingSourceCount} sources`}
              </span>
              {derivedReview.conflictStatus === 'conflict' ? (
                <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-amber-200">
                  Conflict candidate
                </span>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                className="rounded-xl bg-sky-600 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-[11px] text-slate-300 transition-colors hover:bg-slate-800"
                onClick={() => {
                  setJsonValue(JSON.stringify(assertion.value, null, 2));
                  setConfidence(assertion.confidence);
                  setReviewState(assertion.review_state);
                  setReviewNote(assertion.review_note ?? '');
                  setJsonError(null);
                  setIsEditing(false);
                }}
              >
                Cancel
              </button>
            </>
          ) : !isDeleting ? (
            <>
              <button
                type="button"
                className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-[11px] text-slate-300 transition-colors hover:bg-slate-800"
                title="Edit fact"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
              <button
                type="button"
                className="rounded-xl border border-red-800/40 bg-red-900/20 px-3 py-1.5 text-[11px] text-red-300 transition-colors hover:bg-red-900/40"
                title="Delete fact"
                onClick={() => setIsDeleting(true)}
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="rounded-xl border border-red-700/50 bg-red-800/40 px-3 py-1.5 text-[11px] font-medium text-red-100 transition-colors hover:bg-red-700/60 disabled:cursor-not-allowed"
                onClick={handleDelete}
                disabled={isRemoving}
              >
                {isRemoving ? 'Deleting...' : 'Confirm delete'}
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-[11px] text-slate-300 transition-colors hover:bg-slate-800"
                onClick={() => setIsDeleting(false)}
              >
                Keep
              </button>
            </>
          )}
        </div>
      </div>
      {isEditing ? (
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-slate-500">Confidence</label>
            <select
              value={confidence}
              onChange={(event) => setConfidence(event.target.value as AssertionView['confidence'])}
              aria-label="Confidence"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="asserted">Asserted</option>
              <option value="unverified">Unverified</option>
              <option value="verified">Verified</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-slate-500">Review state</label>
            <select
              value={reviewState}
              onChange={(event) => setReviewState(event.target.value as AssertionView['review_state'])}
              aria-label="Review state"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="unreviewed">Unreviewed</option>
              <option value="accepted">Accepted</option>
              <option value="disputed">Disputed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-slate-500">Review note</label>
            <textarea
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              aria-label="Review note"
              rows={3}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-slate-500">Fact JSON</label>
            <textarea
              value={jsonValue}
              onChange={(event) => setJsonValue(event.target.value)}
              aria-label="Fact JSON"
              rows={7}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            {jsonError ? <p className="mt-2 text-xs text-red-300">{jsonError}</p> : null}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-950/35 px-3 py-3">
            <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">Review actions</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(['accepted', 'disputed', 'rejected'] as const).map((state) => (
                <button
                  key={state}
                  type="button"
                  className={`rounded-xl border px-3 py-2 text-[11px] transition-colors ${
                    assertion.review_state === state
                      ? state === 'accepted'
                        ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                        : state === 'disputed'
                          ? 'border-amber-500/50 bg-amber-500/15 text-amber-200'
                          : 'border-rose-500/50 bg-rose-500/15 text-rose-200'
                      : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:bg-slate-800'
                  }`}
                  disabled={isSaving}
                  onClick={() => void persistReviewState(state)}
                >
                  {state === 'accepted' ? 'Accept' : state === 'disputed' ? 'Dispute' : 'Reject'}
                </button>
              ))}
            </div>
            {assertion.review_state !== 'unreviewed' ? (
              <div className="mt-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-[11px] text-slate-300 transition-colors hover:bg-slate-800"
                  disabled={isSaving}
                  onClick={() => void persistReviewState('unreviewed')}
                >
                  Reset review
                </button>
              </div>
            ) : null}
          </div>
          {assertion.review_note ? (
            <div className="mt-3 rounded-2xl border border-slate-800/80 bg-slate-950/45 px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Review note</div>
              <div className="mt-1 text-sm leading-6 text-slate-300">{assertion.review_note}</div>
            </div>
          ) : null}
          {assertion.reviewed_at ? (
            <div className="mt-2 text-[11px] text-slate-500">
              Reviewed {new Date((assertion.reviewed_at > 1_000_000_000_000 ? assertion.reviewed_at : assertion.reviewed_at * 1000)).toLocaleString()}
              {assertion.reviewed_by ? ` by ${assertion.reviewed_by}` : ''}
            </div>
          ) : null}
          <div className="mt-3 rounded-2xl border border-slate-800/80 bg-slate-950/50 px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Value</div>
            <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-slate-300">{JSON.stringify(assertion.value, null, 2)}</pre>
          </div>
          {derivedReview && (onOpenInReview || onNextUnreviewed) ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {onOpenInReview ? (
                <button
                  type="button"
                  className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-[11px] text-sky-200 transition-colors hover:bg-sky-500/20"
                  onClick={onOpenInReview}
                >
                  Open in Review mode
                </button>
              ) : null}
              {onNextUnreviewed ? (
                <button
                  type="button"
                  className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-[11px] text-slate-300 transition-colors hover:bg-slate-800"
                  onClick={onNextUnreviewed}
                >
                  Next unreviewed
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

interface InspectorPanelProps {
  nodeTypes: NodeType[];
  iconPack: IconPackId;
  graphNodes: ParsedNode[];
  graphEdges: ParsedEdge[];
  selectedNodeId: string | null;
  selectedNodeIds?: string[];
  selectedEdgeId: string | null;
  assertions: AssertionView[];
  sources: SourceRecord[];
  onAddAssertion: () => void;
  onAddSource: () => void;
  onDeleteNode: () => void;
  onDeleteNodes?: (ids: string[]) => void;
  onDeleteEdge: () => void;
  onUpdateLabel: (nodeId: string, label: string) => void;
  onUpdateProperty: (nodeId: string, key: string, value: unknown) => Promise<void>;
  onUpdateEdgeProperty?: (edgeId: string, key: string, value: unknown) => void;
  onRequestRemoteTransform?: (transform: TransformManifest, payload: Record<string, unknown>) => void;
  onAlignLeft?: () => void;
  onAlignTop?: () => void;
  reviewItems?: DerivedReviewAssertion[];
  onOpenAssertionInReview?: (assertionId: string) => void;
  onNextUnreviewedReview?: () => void;
  searchFocus?: SearchFocusState;
  assertionFieldAutomation?: 'auto' | 'prompt' | 'manual';
}

function buildTransformPayload(transform: TransformManifest, node: ParsedNode): Record<string, unknown> | null {
  switch (transform.id) {
    case 'whois.lookup':
    case 'dns.lookup': {
      const rawDomain =
        node.type === 'domain'
          ? String(node.properties.domain || node.label || '')
          : node.type === 'website'
            ? String(node.properties.url || node.label || '')
            : '';
      const domain = extractDomain(rawDomain);
      return domain ? { domain } : null;
    }
    case 'ip.lookup': {
      const ipAddress = String(node.properties.ipAddress || node.label || '').trim();
      return ipAddress ? { ipAddress } : null;
    }
    default:
      return null;
  }
}

export function InspectorPanel({
  nodeTypes,
  iconPack,
  graphNodes,
  graphEdges,
  selectedNodeId,
  selectedNodeIds,
  selectedEdgeId,
  assertions,
  sources,
  onAddAssertion,
  onAddSource,
  onDeleteNode,
  onDeleteNodes,
  onDeleteEdge,
  onUpdateLabel,
  onUpdateProperty
  , onUpdateEdgeProperty,
  onRequestRemoteTransform,
  onAlignLeft,
  onAlignTop,
  reviewItems = [],
  onOpenAssertionInReview,
  onNextUnreviewedReview,
  searchFocus = null,
  assertionFieldAutomation = 'auto'
}: InspectorPanelProps) {
  const [tab, setTab] = React.useState<'details' | 'tools' | 'evidence'>('details');
  const [imageModalOpen, setImageModalOpen] = React.useState(false);
  const [imagePropertyKey, setImagePropertyKey] = React.useState<string | null>(null);
  const [allSources, setAllSources] = React.useState<SourceRecord[]>([]);
  const [transformRegistry, setTransformRegistry] = React.useState<TransformRegistry | null>(null);
  const [transformRegistryError, setTransformRegistryError] = React.useState<string | null>(null);
  const [runningTransformId, setRunningTransformId] = React.useState<string | null>(null);
  const [locationMapOpen, setLocationMapOpen] = React.useState(false);
  const [artifactPreviewOpen, setArtifactPreviewOpen] = React.useState(false);
  const [expandedFieldPath, setExpandedFieldPath] = React.useState<string | null>(null);
  const [fieldComposerState, setFieldComposerState] = React.useState<{
    mapping: AssertionFieldMapping;
    fieldLabel: string;
    rawValue: unknown;
  } | null>(null);
  const [fieldPromptState, setFieldPromptState] = React.useState<{
    mapping: AssertionFieldMapping;
    fieldLabel: string;
    rawValue: unknown;
    source: SourceRecord;
  } | null>(null);
  const panelRef = React.useRef<HTMLElement | null>(null);
  const fieldFactsButtonRefs = React.useRef(new Map<string, HTMLButtonElement | null>());
  const selectedNode = selectedNodeId ? graphNodes.find(n => n.id === selectedNodeId) ?? null : null;
  const multiSelected = (selectedNodeIds ?? []).filter(id => graphNodes.some(n => n.id === id));
  const nodeTypeDefinition = React.useMemo(
    () => (selectedNode ? nodeTypes.find((type) => type.id === selectedNode.type) ?? null : null),
    [nodeTypes, selectedNode]
  );
  const fieldMappings = React.useMemo(
    () => (selectedNode ? getAssertionFieldMappings(selectedNode.type as EntityType) : []),
    [selectedNode]
  );
  const fieldAssertionStates = React.useMemo(() => {
    const next = new Map<string, DerivedFieldAssertionState>();
    for (const mapping of fieldMappings) {
      next.set(mapping.propertyKey, deriveFieldAssertionState(mapping, assertions));
    }
    return next;
  }, [assertions, fieldMappings]);
  const latestLinkedSource = React.useMemo(
    () =>
      [...sources]
        .sort((left, right) => (right.added_at ?? 0) - (left.added_at ?? 0))
        .find((source) => Boolean(source.id)) ?? null,
    [sources]
  );
  const locationCoordinates = React.useMemo(() => {
    if (!selectedNode || selectedNode.type !== 'location') return null;
    const latitude = parseCoordinate(selectedNode.properties?.latitude);
    const longitude = parseCoordinate(selectedNode.properties?.longitude);
    if (latitude === null || longitude === null) return null;
    return { latitude, longitude };
  }, [selectedNode]);
  React.useEffect(() => {
    if (searchFocus?.assertionId || searchFocus?.sourceId) {
      setTab('evidence');
    }
  }, [searchFocus?.assertionId, searchFocus?.sourceId]);

  React.useEffect(() => {
    setArtifactPreviewOpen(false);
    setLocationMapOpen(false);
    setExpandedFieldPath(null);
    setFieldComposerState(null);
  }, [selectedNodeId]);
  
  // Load all sources for image previews (including ones referenced in properties)
  React.useEffect(() => {
    const loadAllSources = async () => {
      try {
        const all = await window.piBridge.listAllSourcesWithUsage();
        setAllSources(all);
      } catch (error) {
        console.error('Failed to load all sources for image previews:', error);
      }
    };
    loadAllSources();
  }, [selectedNodeId]);

  React.useEffect(() => {
    const loadRegistry = async () => {
      try {
        const registry = await piBridge.listTransforms();
        setTransformRegistry(registry);
        setTransformRegistryError(null);
      } catch (error) {
        setTransformRegistryError(error instanceof Error ? error.message : 'Failed to load tools.');
      }
    };
    void loadRegistry();
  }, []);
  
  // Get sources that are referenced in node properties (for previews)
  const imageSourceIds = React.useMemo(() => {
    if (!selectedNode) return [];
    const imageProps = Object.entries(selectedNode.properties || {})
      .filter(([, value]) => value && typeof value === 'string' && value.length > 0)
      .map(([, value]) => String(value));
    return imageProps;
  }, [selectedNode]);
  
  const imageSources = React.useMemo(() => {
    return allSources.filter(s => imageSourceIds.includes(s.id));
  }, [allSources, imageSourceIds]);

  const artifactSourcePool = React.useMemo(() => {
    if (!selectedNode || !['media', 'document', 'identity_document'].includes(selectedNode.type)) return [];
    return buildArtifactSourcePool(sources, imageSources);
  }, [imageSources, selectedNode, sources]);
  const sourceLabelMap = React.useMemo(() => {
    const map = new Map<string, string>();
    [...allSources, ...sources, ...imageSources].forEach((source) => {
      map.set(source.id, source.title || source.display_name || source.file_name || source.locator || source.id);
    });
    return map;
  }, [allSources, imageSources, sources]);
  const activeFactsProperty = React.useMemo(
    () =>
      nodeTypeDefinition?.properties.find((property) => {
        const mapping = selectedNode ? getAssertionFieldMapping(selectedNode.type as EntityType, property.id) : null;
        return mapping?.assertionPath === expandedFieldPath;
      }) ?? null,
    [expandedFieldPath, nodeTypeDefinition, selectedNode]
  );
  const activeFactsMapping = React.useMemo(
    () => (selectedNode && activeFactsProperty ? getAssertionFieldMapping(selectedNode.type as EntityType, activeFactsProperty.id) : null),
    [activeFactsProperty, selectedNode]
  );
  const activeFactsState = React.useMemo(
    () => (activeFactsMapping ? fieldAssertionStates.get(activeFactsMapping.propertyKey) ?? null : null),
    [activeFactsMapping, fieldAssertionStates]
  );
  const activeFactsAnchorRect = React.useMemo(() => {
    if (!expandedFieldPath) return null;
    const button = fieldFactsButtonRefs.current.get(expandedFieldPath);
    return button ? button.getBoundingClientRect() : null;
  }, [expandedFieldPath]);
  
  const availableRemoteTransforms = React.useMemo(() => {
    if (!selectedNode || !transformRegistry) return [];
    return transformRegistry.remote.filter((transform) => {
      if (Array.isArray(transform.appliesTo) && transform.appliesTo.length > 0) {
        return transform.appliesTo.includes(selectedNode.type);
      }
      return transform.input.some((descriptor) => descriptor.entityType === selectedNode.type);
    });
  }, [selectedNode, transformRegistry]);
  
  // Get all sources for previews (sources from evidence + image sources)
  const allSourcesForPreviews = React.useMemo(() => {
    const sourceIds = new Set<string>();
    sources.forEach(s => sourceIds.add(s.id));
    imageSources.forEach(s => sourceIds.add(s.id));
    return allSources.filter(s => sourceIds.has(s.id));
  }, [sources, imageSources, allSources]);
  
  const { previews } = useAttachmentPreviews(allSourcesForPreviews);
  const previewMap = React.useMemo(() => {
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

  const primaryArtifactSource = React.useMemo(() => {
    if (!selectedNode || artifactSourcePool.length === 0) return null;
    return resolvePrimaryArtifactSource(selectedNode, artifactSourcePool, previewMap);
  }, [artifactSourcePool, previewMap, selectedNode]);

  const primaryArtifactPreview = React.useMemo(() => {
    return primaryArtifactSource ? previewMap.get(primaryArtifactSource.id) ?? null : null;
  }, [previewMap, primaryArtifactSource]);

  const primaryArtifactExternalUrl = React.useMemo(() => {
    if (!selectedNode) return null;
    return buildArtifactExternalUrl(selectedNode, primaryArtifactSource);
  }, [primaryArtifactSource, selectedNode]);

  const createAssertionFromField = React.useCallback(
    async ({
      mapping,
      rawValue,
      mode,
      sourceOverride,
      confidenceOverride
    }: {
      mapping: AssertionFieldMapping;
      rawValue: unknown;
      mode: 'explicit' | 'auto';
      sourceOverride?: SourceRecord | null;
      confidenceOverride?: AssertionView['confidence'];
    }) => {
      if (!selectedNodeId || isEmptyFieldValue(rawValue)) return false;
      const nextValue = buildFieldAssertionValue(rawValue);
      const fieldState = fieldAssertionStates.get(mapping.propertyKey) ?? deriveFieldAssertionState(mapping, assertions);
      const chosenSource = sourceOverride ?? (sources.length === 1 ? sources[0] : latestLinkedSource);
      const duplicate = fieldState.assertions.some(
        (assertion) =>
          assertion.source_id === chosenSource?.id &&
          fieldValueEquals(assertion.value, nextValue)
      );
      if (duplicate) return true;

      if (!chosenSource) {
        if (mode === 'explicit' || assertionFieldAutomation !== 'manual') {
          emitToast({
            tone: 'warning',
            title: 'Add a source first',
            description: `Link a source to this node before promoting ${mapping.propertyKey} into a fact.`
          });
        }
        return false;
      }

      if (!sourceOverride && sources.length > 1) {
        emitToast({
          tone: 'warning',
          title: 'Choose a source for this fact',
          description: `Multiple sources are linked to this node. Expand the field and choose the supporting source explicitly.`
        });
        setExpandedFieldPath(mapping.assertionPath);
        return false;
      }

      if (mode === 'auto' && assertionFieldAutomation === 'manual') return false;
      if (mode === 'auto' && assertionFieldAutomation === 'prompt') {
        setFieldPromptState({
          mapping,
          fieldLabel: mapping.propertyKey,
          rawValue,
          source: chosenSource
        });
        return false;
      }

      await piBridge.createAssertion({
        subject_kind: 'entity',
        subject_id: selectedNodeId,
        path: mapping.assertionPath,
        value: nextValue,
        source_id: chosenSource.id,
        confidence: confidenceOverride ?? 'asserted'
      });
      emitToast({
        tone: 'success',
        title: mode === 'auto' ? 'Field grounded' : 'Fact created',
        description: `${mapping.propertyKey} is now backed by ${chosenSource.title || chosenSource.display_name || chosenSource.locator}.`
      });
      window.dispatchEvent(new CustomEvent('pi:refresh'));
      return true;
    },
    [assertionFieldAutomation, assertions, fieldAssertionStates, latestLinkedSource, selectedNodeId, sources]
  );

  const syncFieldFromStrongestAssertion = React.useCallback(
    async (mapping: AssertionFieldMapping) => {
      if (!selectedNode) return;
      const fieldState = fieldAssertionStates.get(mapping.propertyKey);
      if (!fieldState?.strongestAssertion) return;
      const strongestValue = getFieldAssertionPrimitiveValue(fieldState.strongestAssertion);
      await onUpdateProperty(selectedNode.id, mapping.propertyKey, strongestValue);
      emitToast({
        tone: 'success',
        title: 'Summary field updated',
        description: `${mapping.propertyKey} now reflects the strongest fact for this node.`
      });
    },
    [fieldAssertionStates, onUpdateProperty, selectedNode]
  );

  const syncAllStaleFields = React.useCallback(async () => {
    if (!selectedNode) return;
    const staleMappings = fieldMappings.filter((mapping) => {
      const fieldState = fieldAssertionStates.get(mapping.propertyKey);
      if (!fieldState?.strongestAssertion || fieldState.displayValue == null) return false;
      return fieldState.displayValue !== summarizeFieldValue(selectedNode.properties?.[mapping.propertyKey]);
    });
    if (staleMappings.length === 0) {
      emitToast({
        tone: 'warning',
        title: 'No stale summary fields',
        description: 'The mapped summary fields already reflect the strongest available facts.'
      });
      return;
    }
    for (const mapping of staleMappings) {
      const fieldState = fieldAssertionStates.get(mapping.propertyKey);
      if (!fieldState?.strongestAssertion) continue;
      await onUpdateProperty(selectedNode.id, mapping.propertyKey, getFieldAssertionPrimitiveValue(fieldState.strongestAssertion));
    }
    emitToast({
      tone: 'success',
      title: 'Summary fields synced',
      description: `${staleMappings.length} field${staleMappings.length === 1 ? '' : 's'} now reflect the strongest facts on this node.`
    });
  }, [fieldAssertionStates, fieldMappings, onUpdateProperty, selectedNode]);

  React.useEffect(() => {
    if (tab !== 'evidence') return;
    const focusId = searchFocus?.assertionId ?? searchFocus?.sourceId;
    if (!focusId || !panelRef.current) return;

    const dataAttribute = searchFocus?.assertionId ? 'data-assertion-card-id' : 'data-source-item-id';
    const safeFocusId = focusId.replace(/"/g, '\\"');

    const frame = window.requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(`[${dataAttribute}="${safeFocusId}"]`);
      if (target) {
        target.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [searchFocus?.assertionId, searchFocus?.sourceId, tab, assertions, sources]);

  return (
    <aside
      ref={panelRef}
      className="h-full w-96 min-w-[280px] max-w-[400px] flex-shrink-0 overflow-y-auto backdrop-blur-xl"
      style={{
        background: 'var(--surface-elevated)',
        borderLeft: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-float)',
        color: 'var(--text-primary)'
      }}
    >
      <div className="px-6 pt-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="mb-3">
          <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>Inspector</p>
          <h2 className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Details, evidence, and editing</h2>
        </div>
        <div
          className="flex items-center gap-2 rounded-2xl p-1"
          style={{
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-base)'
          }}
        >
        <button
          className="flex-1 rounded-xl px-3 py-2 text-sm transition-colors"
          style={
            tab === 'details'
              ? {
                  background: 'var(--surface-raised)',
                  color: 'var(--text-primary)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)'
                }
              : { color: 'var(--text-muted)' }
          }
          onClick={() => setTab('details')}
        >
          Details
        </button>
        <button
          className="flex-1 rounded-xl px-3 py-2 text-sm transition-colors"
          style={
            tab === 'tools'
              ? {
                  background: 'var(--surface-raised)',
                  color: 'var(--text-primary)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)'
                }
              : { color: 'var(--text-muted)' }
          }
          onClick={() => setTab('tools')}
        >
          Tools
        </button>
        <button
          className="flex-1 rounded-xl px-3 py-2 text-sm transition-colors"
          style={
            tab === 'evidence'
              ? {
                  background: 'var(--surface-raised)',
                  color: 'var(--text-primary)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)'
                }
              : { color: 'var(--text-muted)' }
          }
          onClick={() => setTab('evidence')}
        >
          Evidence
        </button>
        </div>
      </div>
      <div className="p-6 pr-4">
      {multiSelected.length > 1 ? (
        <div className="animate-enter-rise">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Multiple selected</h3>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{multiSelected.length} items</div>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
            <ThemedCard className="p-3">
              <div style={{ color: 'var(--text-muted)' }}>Types</div>
              <ul className="mt-1 list-disc pl-5">
                {Array.from(new Map(multiSelected.map(id => {
                  const n = graphNodes.find(nn => nn.id === id);
                  return [n?.type || 'unknown', (n?.type || 'unknown')];
                })).values()).map(t => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </ThemedCard>
            <ThemedCard className="p-3">
              <div style={{ color: 'var(--text-muted)' }}>First items</div>
              <ul className="mt-1 space-y-1">
                {multiSelected.slice(0, 5).map(id => {
                  const n = graphNodes.find(nn => nn.id === id);
                  return <li key={id} className="truncate">{n?.label || id}</li>;
                })}
              </ul>
            </ThemedCard>
          </div>
          <div className="flex flex-wrap gap-2">
            <ThemedButton className={inspectorButtonClassName} onClick={() => onAlignLeft && onAlignLeft()}>
              Align left
            </ThemedButton>
            <ThemedButton className={inspectorButtonClassName} onClick={() => onAlignTop && onAlignTop()}>
              Align top
            </ThemedButton>
            <ThemedButton variant="danger" className={inspectorButtonClassName} onClick={() => onDeleteNodes && onDeleteNodes(multiSelected)}>
              Delete selected
            </ThemedButton>
          </div>
        </div>
      ) : selectedNode ? (
        <div className="animate-enter-rise">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Node Inspector</h3>
            <div className="flex items-center space-x-2">
              <ThemedBadge className="px-2 py-1 text-xs">Selected</ThemedBadge>
              <ThemedButton
                variant="danger"
                onClick={onDeleteNode}
                className="rounded-full px-2 py-1 text-xs"
                title="Delete node (or press Delete key)"
              >
                Delete
              </ThemedButton>
            </div>
          </div>

          <ThemedPanel
            elevated
            className="mb-6 rounded-[24px] p-4"
            style={{
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--surface-raised) 92%, transparent), color-mix(in srgb, var(--surface-base) 96%, transparent))'
            }}
          >
            <div className="mb-3 flex items-center space-x-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${nodeTypes.find(nt => nt.id === selectedNode.type)?.color || 'bg-slate-600'} text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]`}>
                {(() => {
                  const nodeType = nodeTypes.find(nt => nt.id === selectedNode.type);
                  if (!nodeType) return '?';
                  const Icon = resolveNodeTypeIcon(nodeType, iconPack);
                  return <Icon className="w-4 h-4" />;
                })()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>Type: {selectedNode.type}</div>
                <input
                  type="text"
                  value={selectedNode.label || ''}
                  onChange={(e) => onUpdateLabel(selectedNode.id, e.target.value)}
                  className="w-full rounded-xl border px-2 py-1 text-lg font-semibold focus:outline-none"
                  style={{
                    borderColor: 'transparent',
                    background: 'transparent',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="Untitled Entity"
                />
              </div>
            </div>
          </ThemedPanel>

          {tab === 'details' && (
          <div className="space-y-4">
            {selectedNode && ['media', 'document', 'identity_document'].includes(selectedNode.type) ? (
              <ArtifactInspectorCard
                node={selectedNode}
                source={primaryArtifactSource}
                preview={primaryArtifactPreview}
                externalUrl={primaryArtifactExternalUrl}
                onOpenPreview={() => setArtifactPreviewOpen(true)}
                onAddSource={onAddSource}
              />
            ) : null}
            {locationCoordinates ? (
              <LocationMapCard
                coordinates={locationCoordinates}
                label={selectedNode.label || selectedNode.properties?.name?.toString() || 'Location'}
                onExpand={() => setLocationMapOpen(true)}
              />
            ) : selectedNode.type === 'location' ? (
              <LocationMapCard
                coordinates={null}
                label={selectedNode.label || selectedNode.properties?.name?.toString() || 'Location'}
                onExpand={() => setLocationMapOpen(true)}
              />
            ) : null}
            <ThemedSection>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Summary fields</h4>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-soft)' }}>Edit the node summary while grounding important facts in sources.</p>
              </div>
              {selectedNode && fieldMappings.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <ThemedButton
                    variant="success"
                    type="button"
                    className={inspectorButtonClassName}
                    onClick={() => {
                      void syncAllStaleFields();
                    }}
                  >
                    Sync stale fields
                  </ThemedButton>
                  <ThemedButton
                    variant="accent"
                    type="button"
                    className={inspectorButtonClassName}
                    onClick={() => {
                      void (async () => {
                        const eligibleMappings = fieldMappings.filter((mapping) => !isEmptyFieldValue(selectedNode.properties?.[mapping.propertyKey]));
                        let createdCount = 0;
                        for (const mapping of eligibleMappings) {
                          const created = await createAssertionFromField({
                            mapping,
                            rawValue: selectedNode.properties?.[mapping.propertyKey],
                            mode: 'explicit'
                          });
                          if (created) createdCount += 1;
                        }
                        if (createdCount === 0) {
                          emitToast({
                            tone: 'warning',
                            title: 'No new facts created',
                            description: latestLinkedSource
                              ? 'The mapped fields were already represented by matching facts.'
                              : 'Link a source first, then promote the filled fields.'
                          });
                        }
                      })();
                    }}
                  >
                    Promote all filled fields
                  </ThemedButton>
                </div>
              ) : null}
            </div>
            {(() => {
              const nodeType = nodeTypes.find(nt => nt.id === selectedNode.type);
              if (!nodeType) {
                return (
                  <div className="space-y-2">
                    {Object.entries(selectedNode.properties || {}).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{key}</label>
                        <ThemedInput
                          type="text"
                          value={String(value || '')}
                          onChange={(e) => onUpdateProperty(selectedNode.id, key, e.target.value)}
                          className={inspectorInputClassName}
                          placeholder={`Enter ${key}...`}
                        />
                      </div>
                    ))}
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {nodeType.properties.map((property) => {
                    const currentValue = selectedNode.properties?.[property.id] || '';
                    const fieldMapping = getAssertionFieldMapping(selectedNode.type as EntityType, property.id);
                    const fieldState = fieldMapping ? fieldAssertionStates.get(property.id) ?? null : null;
                    const fieldCurrentSummary = summarizeFieldValue(currentValue);
                    const strongestSummary = fieldState?.displayValue ?? null;
                    const summaryState =
                      !fieldMapping
                        ? null
                        : fieldState?.strongestAssertion
                          ? strongestSummary === fieldCurrentSummary
                            ? 'derived'
                            : 'stale'
                          : fieldState?.assertions.length
                            ? 'unresolved'
                            : 'raw';
                    const compactFieldStatus = !fieldMapping
                      ? null
                      : fieldState?.hasConflict
                        ? 'Conflict'
                        : summaryState === 'stale'
                          ? 'Stale summary'
                          : fieldState?.evidenceStatus === 'none' && (fieldState?.assertions.length ?? 0) > 0
                            ? 'No source'
                            : null;

                    const renderInput = () => {
                      switch (property.type) {
                        case 'select':
                          return (
                            <ThemedSelect
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              onBlur={(event) => {
                                if (!fieldMapping || !fieldMapping.autoAssert) return;
                                void createAssertionFromField({ mapping: fieldMapping, rawValue: event.target.value, mode: 'auto' });
                              }}
                              className={inspectorInputClassName}
                            >
                              <option value="">Select {property.label}</option>
                              {property.options?.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </ThemedSelect>
                          );
                        case 'textarea':
                          return (
                            <ThemedTextarea
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              onBlur={(event) => {
                                if (!fieldMapping || !fieldMapping.autoAssert) return;
                                void createAssertionFromField({ mapping: fieldMapping, rawValue: event.target.value, mode: 'auto' });
                              }}
                              placeholder={property.placeholder}
                              rows={3}
                              className="resize-none"
                            />
                          );
                        case 'number':
                          return (
                            <ThemedInput
                              type="number"
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              onBlur={(event) => {
                                if (!fieldMapping || !fieldMapping.autoAssert) return;
                                const nextValue = event.target.value === '' ? '' : Number(event.target.value);
                                void createAssertionFromField({ mapping: fieldMapping, rawValue: nextValue, mode: 'auto' });
                              }}
                              placeholder={property.placeholder}
                              className={inspectorInputClassName}
                            />
                          );
                        case 'date':
                          return (
                            <ThemedInput
                              type="date"
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              onBlur={(event) => {
                                if (!fieldMapping || !fieldMapping.autoAssert) return;
                                void createAssertionFromField({ mapping: fieldMapping, rawValue: event.target.value, mode: 'auto' });
                              }}
                              className={inspectorInputClassName}
                            />
                          );
                        case 'email':
                          return (
                            <ThemedInput
                              type="email"
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              onBlur={(event) => {
                                if (!fieldMapping || !fieldMapping.autoAssert) return;
                                void createAssertionFromField({ mapping: fieldMapping, rawValue: event.target.value, mode: 'auto' });
                              }}
                              placeholder={property.placeholder}
                              className={inspectorInputClassName}
                            />
                          );
                        case 'url':
                          return (
                            <ThemedInput
                              type="url"
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              onBlur={(event) => {
                                if (!fieldMapping || !fieldMapping.autoAssert) return;
                                void createAssertionFromField({ mapping: fieldMapping, rawValue: event.target.value, mode: 'auto' });
                              }}
                              placeholder={property.placeholder}
                              className={inspectorInputClassName}
                            />
                          );
                        case 'phone':
                          return (
                            <ThemedInput
                              type="tel"
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              onBlur={(event) => {
                                if (!fieldMapping || !fieldMapping.autoAssert) return;
                                void createAssertionFromField({ mapping: fieldMapping, rawValue: event.target.value, mode: 'auto' });
                              }}
                              placeholder={property.placeholder}
                              className={inspectorInputClassName}
                            />
                          );
                        case 'image': {
                          const sourceId = String(currentValue);
                          const preview = sourceId ? previewMap.get(sourceId) : null;
                          return (
                            <div className="space-y-2">
                              {preview && preview.mimeType?.startsWith('image/') ? (
                                <div className="relative group">
                                  <img
                                    src={preview.url}
                                    alt={preview.fileName}
                                    className="h-48 w-full rounded-lg object-cover"
                                    style={{ border: '1px solid var(--border-strong)' }}
                                  />
                                  <button
                                    onClick={() => {
                                      setImagePropertyKey(property.id);
                                      setImageModalOpen(true);
                                    }}
                                    className="absolute inset-0 flex items-center justify-center rounded-lg text-sm text-white opacity-0 transition-opacity group-hover:opacity-100"
                                    style={{ background: 'var(--overlay-backdrop)' }}
                                  >
                                    Change Image
                                  </button>
                                  <button
                                    onClick={() => onUpdateProperty(selectedNode.id, property.id, '')}
                                    className="absolute right-2 top-2 rounded px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                                    style={{ background: 'color-mix(in srgb, var(--status-danger-bg) 92%, transparent)' }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setImagePropertyKey(property.id);
                                    setImageModalOpen(true);
                                  }}
                                  className="w-full rounded-lg border-2 border-dashed px-4 py-8 text-sm transition-colors"
                                  style={{ borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}
                                >
                                  <div className="flex flex-col items-center gap-2">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>{property.placeholder || 'Click to upload image'}</span>
                                  </div>
                                </button>
                              )}
                            </div>
                          );
                        }
                        default:
                          return (
                            <ThemedInput
                              type="text"
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              onBlur={(event) => {
                                if (!fieldMapping || !fieldMapping.autoAssert) return;
                                void createAssertionFromField({ mapping: fieldMapping, rawValue: event.target.value, mode: 'auto' });
                              }}
                              placeholder={property.placeholder}
                              className={inspectorInputClassName}
                            />
                          );
                      }
                    };

                    return (
                      <ThemedCard key={property.id} className="space-y-2 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                                {property.label}
                                {property.required && <span className="text-red-400 ml-1">*</span>}
                              </label>
                              {fieldMapping ? (
                                <button
                                  type="button"
                                  ref={(node) => {
                                    fieldFactsButtonRefs.current.set(fieldMapping.assertionPath, node);
                                  }}
                                  className="shrink-0 text-[11px] font-medium transition-colors"
                                  style={{ color: 'var(--text-muted)' }}
                                  onClick={() =>
                                    setExpandedFieldPath((current) => (current === fieldMapping.assertionPath ? null : fieldMapping.assertionPath))
                                  }
                                >
                                  {expandedFieldPath === fieldMapping.assertionPath
                                    ? 'Hide facts'
                                    : `Facts${fieldState?.assertions.length ? ` (${fieldState.assertions.length})` : ''}`}
                                </button>
                              ) : null}
                            </div>
                            {compactFieldStatus ? (
                              <div
                                className={`mt-2 text-[11px] ${
                                  compactFieldStatus === 'Conflict' || compactFieldStatus === 'Stale summary'
                                    ? 'text-amber-300'
                                    : 'text-slate-500'
                                }`}
                              >
                                {compactFieldStatus}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        {renderInput()}
                      </ThemedCard>
                    );
                  })}
                </div>
              );
            })()}
            </ThemedSection>
          </div>
          )}

          {tab === 'tools' && (
          <div className="space-y-4">
            <ThemedSection>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Tools</h4>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-soft)' }}>Run lookups and enrichment against the selected node.</p>
                </div>
                {transformRegistryError ? <span className="text-[11px] text-red-300">{transformRegistryError}</span> : null}
              </div>
              {availableRemoteTransforms.length === 0 ? (
                <ThemedCard className="p-3 text-sm" style={{ color: 'var(--text-soft)' }}>
                  No remote tools are available for this node type yet.
                </ThemedCard>
              ) : (
                <div className="space-y-2">
                  {availableRemoteTransforms.map((transform) => {
                    const payload = buildTransformPayload(transform, selectedNode);
                    const disabled = !payload || !onRequestRemoteTransform;
                    return (
                      <ThemedCard key={transform.id} className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{transform.name}</p>
                            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                              {transform.description || `Send a consented lookup to ${transform.network?.host ?? 'remote service'}.`}
                            </p>
                            {!payload ? (
                              <p className="mt-2 text-[11px] text-amber-300">
                                This tool needs a valid {transform.id === 'ip.lookup' ? 'IP address' : 'domain or URL'} on the node first.
                              </p>
                            ) : null}
                          </div>
                          <ThemedButton
                            variant="accent"
                            type="button"
                            disabled={disabled || runningTransformId === transform.id}
                            className={inspectorButtonClassName}
                            onClick={() => {
                              if (!payload || !onRequestRemoteTransform) return;
                              setRunningTransformId(transform.id);
                              try {
                                onRequestRemoteTransform(transform, payload);
                              } finally {
                                window.setTimeout(() => setRunningTransformId((current) => (current === transform.id ? null : current)), 0);
                              }
                            }}
                          >
                            {runningTransformId === transform.id ? 'Preparing…' : 'Request'}
                          </ThemedButton>
                        </div>
                      </ThemedCard>
                    );
                  })}
                </div>
              )}
            </ThemedSection>
          </div>
          )}

          {tab === 'evidence' && (
          <ThemedSection className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Facts</h4>
              <ThemedButton
                variant="success"
                onClick={onAddAssertion}
                className="px-2 py-1 text-xs"
                title="Add fact"
              >
                +
              </ThemedButton>
            </div>
            {assertions.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-soft)' }}>No facts yet.</p>
            )}
            {assertions.map((assertion) => {
              const derivedReview = reviewItems.find((item) => item.id === assertion.id) ?? null;
              return (
                <AssertionCard
                  key={assertion.id}
                  assertion={assertion}
                  highlighted={searchFocus?.assertionId === assertion.id}
                  derivedReview={derivedReview}
                  onOpenInReview={derivedReview && onOpenAssertionInReview ? () => onOpenAssertionInReview(assertion.id) : null}
                  onNextUnreviewed={onNextUnreviewedReview ?? null}
                />
              );
            })}
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Sources</h4>
                <ThemedButton
                  variant="success"
                  onClick={onAddSource}
                  className="px-2 py-1 text-xs"
                  title="Add source"
                >
                  +
                </ThemedButton>
              </div>
              <SourcesList
                sources={sources}
                highlightedSourceId={searchFocus?.sourceId ?? null}
              />
            </div>
          </ThemedSection>
          )}
        </div>
      ) : selectedEdgeId ? (
        <div>
          {(() => {
            const edge = graphEdges.find(e => e.id === selectedEdgeId);
            const sourceNode = graphNodes.find(n => n.id === edge?.src_id);
            const targetNode = graphNodes.find(n => n.id === edge?.dst_id);
            return (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Relationship</h3>
                  <div className="flex items-center space-x-2">
                    <ThemedBadge className="px-2 py-1 text-xs">Selected</ThemedBadge>
                    <ThemedButton
                      variant="danger"
                      onClick={onDeleteEdge}
                      className="px-2 py-1 text-xs"
                      title="Delete relationship (or press Delete key)"
                    >
                      Delete
                    </ThemedButton>
                  </div>
                </div>
                <ThemedCard className="mb-4 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{sourceNode?.label || 'Unknown'}</div>
                    <div className="flex items-center space-x-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full text-xs" style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)' }}>🔗</div>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{edge?.type}</span>
                    </div>
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{targetNode?.label || 'Unknown'}</div>
                  </div>
                  <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>ID: {edge?.id}</div>
                </ThemedCard>
                {edge && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Subtype</label>
                      <ThemedSelect
                        value={String(edge.properties?.subtype || '')}
                        onChange={(e) => onUpdateEdgeProperty && onUpdateEdgeProperty(edge.id, 'subtype', e.target.value)}
                        className={inspectorInputClassName}
                      >
                        <option value="">None</option>
                        {relationshipTypes.find(rt => rt.id === edge.type)?.subtypes?.map(st => (
                          <option key={st.id} value={st.id}>{st.label}</option>
                        ))}
                      </ThemedSelect>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Date</label>
                      <ThemedInput
                        type="date"
                        value={String(edge.properties?.date || '')}
                        onChange={(e) => onUpdateEdgeProperty && onUpdateEdgeProperty(edge.id, 'date', e.target.value)}
                        className={inspectorInputClassName}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Notes</label>
                      <ThemedTextarea
                        value={String(edge.properties?.notes || '')}
                        onChange={(e) => onUpdateEdgeProperty && onUpdateEdgeProperty(edge.id, 'notes', e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-center" style={{ color: 'var(--text-soft)' }}>
          <p>Select a node or relationship to inspect details.</p>
        </div>
      )}
      </div>

      {selectedNode && selectedNode.type === 'location' && locationMapOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/75 p-6 backdrop-blur-md"
              onClick={() => setLocationMapOpen(false)}
            >
              <div onClick={(event) => event.stopPropagation()}>
                <LocationMapPicker
                  initialCoordinates={locationCoordinates}
                  label={selectedNode.label || selectedNode.properties?.name?.toString() || 'Location'}
                  onClose={() => setLocationMapOpen(false)}
                  onOpenExternal={(coords) => {
                    const { browserUrl } = buildOpenStreetMapUrls(coords.latitude, coords.longitude);
                    void piBridge.openExternal(browserUrl);
                  }}
                  onSave={(coords) => {
                    onUpdateProperty(selectedNode.id, 'latitude', Number(coords.latitude.toFixed(6)));
                    onUpdateProperty(selectedNode.id, 'longitude', Number(coords.longitude.toFixed(6)));
                    setLocationMapOpen(false);
                    emitToast({
                      tone: 'success',
                      title: 'Location updated',
                      description: `Coordinates set to ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}.`
                    });
                  }}
                />
              </div>
            </div>,
            document.body
          )
        : null}
      {selectedNode && ['media', 'document', 'identity_document'].includes(selectedNode.type) ? (
        <ArtifactPreviewModal
          open={artifactPreviewOpen}
          title={buildArtifactPreviewTitle(selectedNode)}
          preview={primaryArtifactPreview}
          externalUrl={primaryArtifactExternalUrl}
          onClose={() => setArtifactPreviewOpen(false)}
        />
      ) : null}
      <FieldFactsPopover
        open={Boolean(expandedFieldPath && activeFactsMapping && activeFactsProperty && activeFactsAnchorRect)}
        anchorRect={activeFactsAnchorRect}
        title={activeFactsProperty?.label ?? 'Field facts'}
        onClose={() => setExpandedFieldPath(null)}
      >
        {activeFactsMapping && activeFactsProperty && selectedNode ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-xl border border-sky-500/35 bg-sky-500/10 px-3 py-1.5 text-[11px] text-sky-200 transition-colors hover:bg-sky-500/20"
                onClick={() => {
                  if (sources.length !== 1) {
                    setFieldComposerState({
                      mapping: activeFactsMapping,
                      fieldLabel: activeFactsProperty.label,
                      rawValue: selectedNode.properties?.[activeFactsProperty.id]
                    });
                    return;
                  }
                  void createAssertionFromField({
                    mapping: activeFactsMapping,
                    rawValue: selectedNode.properties?.[activeFactsProperty.id],
                    mode: 'explicit'
                  });
                }}
              >
                {activeFactsState?.assertions.length ? 'Create another fact' : 'Create fact'}
              </button>
              {activeFactsState?.strongestAssertion &&
              activeFactsState.displayValue !== null &&
              activeFactsState.displayValue !== summarizeFieldValue(selectedNode.properties?.[activeFactsProperty.id]) ? (
                <button
                  type="button"
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-200 transition-colors hover:bg-emerald-500/20"
                  onClick={() => {
                    void syncFieldFromStrongestAssertion(activeFactsMapping);
                  }}
                >
                  Use strongest fact
                </button>
              ) : null}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Use linked source</div>
              {sources.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {sources.map((source) => (
                    <button
                      key={source.id}
                      type="button"
                      className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-[11px] text-slate-300 transition-colors hover:bg-slate-800"
                      onClick={() => {
                        void createAssertionFromField({
                          mapping: activeFactsMapping,
                          rawValue: selectedNode.properties?.[activeFactsProperty.id],
                          mode: 'explicit',
                          sourceOverride: source
                        });
                      }}
                    >
                      {source.title || source.display_name || source.file_name || source.locator}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="text-sm text-slate-500">No linked sources yet.</div>
                  <button
                    type="button"
                    className="rounded-xl border border-sky-500/35 bg-sky-500/10 px-3 py-1.5 text-[11px] text-sky-200 transition-colors hover:bg-sky-500/20"
                    onClick={() => {
                      setFieldComposerState({
                        mapping: activeFactsMapping,
                        fieldLabel: activeFactsProperty.label,
                        rawValue: selectedNode.properties?.[activeFactsProperty.id]
                      });
                    }}
                  >
                    Create source and fact
                  </button>
                </div>
              )}
            </div>
            {activeFactsState && activeFactsState.assertions.length > 0 ? (
              <div className="space-y-2">
                {activeFactsState.assertions.map((assertion, index) => (
                  <div key={assertion.id} className="rounded-xl border border-slate-800/80 bg-slate-900/45 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {index === 0 ? (
                          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-emerald-200">
                            Strongest
                          </span>
                        ) : null}
                        <div className="min-w-0 text-xs font-medium text-slate-200">
                          {summarizeFieldValue(getFieldAssertionPrimitiveValue(assertion)) ?? 'Empty fact'}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                        <span>{assertion.confidence}</span>
                        <span>{assertion.review_state}</span>
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Source {sourceLabelMap.get(assertion.source_id) || assertion.source_id.slice(0, 8)} •{' '}
                      {new Date(assertion.created_at * 1000).toLocaleString()}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {!fieldValueEquals(assertion.value, buildFieldAssertionValue(selectedNode.properties?.[activeFactsProperty.id])) ? (
                        <button
                          type="button"
                          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-200 transition-colors hover:bg-emerald-500/20"
                          onClick={() => {
                            void onUpdateProperty(
                              selectedNode.id,
                              activeFactsProperty.id,
                              getFieldAssertionPrimitiveValue(assertion)
                            );
                          }}
                        >
                          Use this fact
                        </button>
                      ) : null}
                      {onOpenAssertionInReview ? (
                        <button
                          type="button"
                          className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-[11px] text-slate-300 transition-colors hover:bg-slate-800"
                          onClick={() => onOpenAssertionInReview(assertion.id)}
                        >
                          Open in Review
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">No facts yet for this field.</div>
            )}
          </div>
        ) : null}
      </FieldFactsPopover>
      <FieldFactComposerModal
        open={Boolean(fieldComposerState)}
        fieldLabel={fieldComposerState?.fieldLabel ?? 'Field'}
        assertionPath={fieldComposerState?.mapping.assertionPath ?? ''}
        valuePreview={summarizeFieldValue(fieldComposerState?.rawValue)}
        sources={sources}
        onClose={() => setFieldComposerState(null)}
        onSubmit={async ({ sourceId, sourceKind, sourceLocator, sourceTitle, confidence }) => {
          if (!fieldComposerState) return;
          let sourceOverride: SourceRecord | null = null;
          if (sourceId) {
            sourceOverride = sources.find((source) => source.id === sourceId) ?? null;
          } else if (sourceKind && sourceLocator) {
            const createdSourceId = await piBridge.createSource({
              kind: sourceKind,
              locator: sourceLocator,
              title: sourceTitle || undefined,
              hash: null,
              mime: null
            });
            sourceOverride = {
              id: createdSourceId,
              kind: sourceKind,
              locator: sourceLocator,
              title: sourceTitle || null,
              added_at: Date.now(),
              hash: null,
              mime: null
            };
          }
          await createAssertionFromField({
            mapping: fieldComposerState.mapping,
            rawValue: fieldComposerState.rawValue,
            mode: 'explicit',
            sourceOverride,
            confidenceOverride: confidence
          });
        }}
      />
      <FieldAssertionPromptModal
        open={Boolean(fieldPromptState)}
        fieldLabel={fieldPromptState?.fieldLabel ?? 'Field'}
        valuePreview={summarizeFieldValue(fieldPromptState?.rawValue)}
        sourceLabel={
          fieldPromptState?.source.title ||
          fieldPromptState?.source.display_name ||
          fieldPromptState?.source.file_name ||
          fieldPromptState?.source.locator ||
          'Linked source'
        }
        onClose={() => setFieldPromptState(null)}
        onConfirm={() => {
          const pendingPrompt = fieldPromptState;
          if (!pendingPrompt) return;
          setFieldPromptState(null);
          void createAssertionFromField({
            mapping: pendingPrompt.mapping,
            rawValue: pendingPrompt.rawValue,
            mode: 'explicit',
            sourceOverride: pendingPrompt.source
          });
        }}
      />
      
      {/* Image selection modal */}
      <MediaLibraryModal
        isOpen={imageModalOpen}
        mode="select"
        onClose={() => {
          setImageModalOpen(false);
          setImagePropertyKey(null);
        }}
        onSelect={(source) => {
          if (imagePropertyKey && selectedNode) {
            onUpdateProperty(selectedNode.id, imagePropertyKey, source.id);
          }
          setImageModalOpen(false);
          setImagePropertyKey(null);
        }}
      />
    </aside>
  );
}

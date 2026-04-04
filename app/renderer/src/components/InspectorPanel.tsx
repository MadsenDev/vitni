import { ConfidenceBadge } from './ConfidenceBadge';
import { LocationMapPicker } from './LocationMapPicker';
import { SourcesList } from './SourcesList';
import { MediaLibraryModal } from './MediaLibraryModal';
import type { SourceRecord, TransformManifest, TransformRegistry } from '@shared/types';
import { resolveNodeTypeIcon } from '@renderer/features/personalization/iconPacks';
import type { IconPackId } from '@renderer/features/personalization/theme';
import { piBridge } from '@renderer/services/piBridge';
import { emitToast } from '@renderer/lib/toast';
import type { SearchFocusState } from '@renderer/types/app';
import type { NodeType } from '../lib/nodeTypes/index';
import { relationshipTypes } from '../lib/relationshipTypes';
import { useAttachmentPreviews } from '../lib/useAttachmentPreviews';
import { extractDomain } from '../lib/fetchWebsiteMetadata';
import React from 'react';
import { createPortal } from 'react-dom';

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

interface AssertionView {
  id: string;
  path: string;
  value: Record<string, unknown>;
  confidence: 'asserted' | 'unverified' | 'verified';
}

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

function AssertionCard({ assertion, highlighted = false }: { assertion: AssertionView; highlighted?: boolean }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [jsonValue, setJsonValue] = React.useState(JSON.stringify(assertion.value, null, 2));
  const [confidence, setConfidence] = React.useState<AssertionView['confidence']>(assertion.confidence);
  const [jsonError, setJsonError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);

  React.useEffect(() => {
    setJsonValue(JSON.stringify(assertion.value, null, 2));
    setConfidence(assertion.confidence);
    setJsonError(null);
    setIsEditing(false);
    setIsDeleting(false);
  }, [assertion.confidence, assertion.id, assertion.value]);

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
        value: parsedValue
      });
      if (!ok) {
        throw new Error('Assertion update was not applied.');
      }

      setIsEditing(false);
      emitToast({ tone: 'success', title: 'Assertion updated' });
      window.dispatchEvent(new CustomEvent('pi:refresh'));
    } catch (error) {
      emitToast({
        tone: 'error',
        title: 'Assertion update failed',
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

      emitToast({ tone: 'success', title: 'Assertion deleted' });
      window.dispatchEvent(new CustomEvent('pi:refresh'));
    } catch (error) {
      emitToast({
        tone: 'error',
        title: 'Assertion delete failed',
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
            ? 'rounded-2xl border border-dashed border-unverified/70 bg-slate-900/40 p-3'
            : 'rounded-2xl border border-slate-800 bg-slate-900/40 p-3'
        }`
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-sm font-medium text-slate-100">{assertion.path}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isEditing ? <ConfidenceBadge confidence={assertion.confidence} /> : null}
          {isEditing ? (
            <>
              <button
                type="button"
                className="rounded-xl bg-sky-600 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-700 bg-slate-900/50 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:bg-slate-800"
                onClick={() => {
                  setJsonValue(JSON.stringify(assertion.value, null, 2));
                  setConfidence(assertion.confidence);
                  setJsonError(null);
                  setIsEditing(false);
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="rounded-xl border border-slate-700 bg-slate-900/50 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:bg-slate-800"
                title="Edit assertion"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
              {!isDeleting ? (
                <button
                  type="button"
                  className="rounded-xl border border-red-800/40 bg-red-900/20 px-2.5 py-1 text-[11px] text-red-300 transition-colors hover:bg-red-900/40"
                  title="Delete assertion"
                  onClick={() => setIsDeleting(true)}
                >
                  Delete
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="rounded-xl border border-red-700/50 bg-red-800/40 px-2.5 py-1 text-[11px] font-medium text-red-100 transition-colors hover:bg-red-700/60 disabled:cursor-not-allowed"
                    onClick={handleDelete}
                    disabled={isRemoving}
                  >
                    {isRemoving ? 'Deleting...' : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-700 bg-slate-900/50 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:bg-slate-800"
                    onClick={() => setIsDeleting(false)}
                  >
                    Keep
                  </button>
                </>
              )}
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
            <label className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-slate-500">Assertion JSON</label>
            <textarea
              value={jsonValue}
              onChange={(event) => setJsonValue(event.target.value)}
              aria-label="Assertion JSON"
              rows={7}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            {jsonError ? <p className="mt-2 text-xs text-red-300">{jsonError}</p> : null}
          </div>
        </div>
      ) : (
        <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-300">{JSON.stringify(assertion.value, null, 2)}</pre>
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
  onUpdateProperty: (nodeId: string, key: string, value: unknown) => void;
  onUpdateEdgeProperty?: (edgeId: string, key: string, value: unknown) => void;
  onRequestRemoteTransform?: (transform: TransformManifest, payload: Record<string, unknown>) => void;
  onAlignLeft?: () => void;
  onAlignTop?: () => void;
  searchFocus?: SearchFocusState;
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
  searchFocus = null
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
  const panelRef = React.useRef<HTMLElement | null>(null);
  const selectedNode = selectedNodeId ? graphNodes.find(n => n.id === selectedNodeId) ?? null : null;
  const multiSelected = (selectedNodeIds ?? []).filter(id => graphNodes.some(n => n.id === id));
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
      .filter(([_, value]) => value && typeof value === 'string' && value.length > 0)
      .map(([_, value]) => String(value));
    return imageProps;
  }, [selectedNode]);
  
  const imageSources = React.useMemo(() => {
    return allSources.filter(s => imageSourceIds.includes(s.id));
  }, [allSources, imageSourceIds]);

  const artifactSourcePool = React.useMemo(() => {
    if (!selectedNode || !['media', 'document', 'identity_document'].includes(selectedNode.type)) return [];
    return buildArtifactSourcePool(sources, imageSources);
  }, [imageSources, selectedNode, sources]);
  
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
      className="h-full w-96 min-w-[280px] max-w-[400px] flex-shrink-0 overflow-y-auto bg-[rgba(7,11,23,0.94)] backdrop-blur-xl"
    >
      <div className="border-b border-slate-800/80 px-6 pt-4">
        <div className="mb-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Inspector</p>
          <h2 className="mt-1 text-sm font-semibold text-slate-100">Details, evidence, and editing</h2>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/45 p-1">
        <button
          className={`flex-1 rounded-xl px-3 py-2 text-sm transition-colors ${tab === 'details' ? 'bg-slate-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' : 'text-slate-400 hover:text-slate-200'}`}
          onClick={() => setTab('details')}
        >
          Details
        </button>
        <button
          className={`flex-1 rounded-xl px-3 py-2 text-sm transition-colors ${tab === 'tools' ? 'bg-slate-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' : 'text-slate-400 hover:text-slate-200'}`}
          onClick={() => setTab('tools')}
        >
          Tools
        </button>
        <button
          className={`flex-1 rounded-xl px-3 py-2 text-sm transition-colors ${tab === 'evidence' ? 'bg-slate-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' : 'text-slate-400 hover:text-slate-200'}`}
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
            <h3 className="text-lg font-semibold text-white">Multiple selected</h3>
            <div className="text-sm text-slate-400">{multiSelected.length} items</div>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/55 p-3">
              <div className="text-slate-400">Types</div>
              <ul className="mt-1 list-disc pl-5">
                {Array.from(new Map(multiSelected.map(id => {
                  const n = graphNodes.find(nn => nn.id === id);
                  return [n?.type || 'unknown', (n?.type || 'unknown')];
                })).values()).map(t => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/55 p-3">
              <div className="text-slate-400">First items</div>
              <ul className="mt-1 space-y-1">
                {multiSelected.slice(0, 5).map(id => {
                  const n = graphNodes.find(nn => nn.id === id);
                  return <li key={id} className="truncate">{n?.label || id}</li>;
                })}
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="control-chip rounded-xl px-3 py-1.5 text-xs text-slate-200"
              onClick={() => onAlignLeft && onAlignLeft()}
            >
              Align left
            </button>
            <button
              className="control-chip rounded-xl px-3 py-1.5 text-xs text-slate-200"
              onClick={() => onAlignTop && onAlignTop()}
            >
              Align top
            </button>
            <button
              className="rounded-xl border border-red-800/40 bg-red-900/20 px-3 py-1.5 text-xs text-red-300 transition-colors hover:bg-red-900/40"
              onClick={() => onDeleteNodes && onDeleteNodes(multiSelected)}
            >
              Delete selected
            </button>
          </div>
        </div>
      ) : selectedNode ? (
        <div className="animate-enter-rise">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Node Inspector</h3>
            <div className="flex items-center space-x-2">
              <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-400">Selected</span>
              <button
                onClick={onDeleteNode}
                className="rounded-full bg-red-900/20 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-900/30 hover:text-red-300"
                title="Delete node (or press Delete key)"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="mb-6 rounded-[24px] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.74),rgba(2,6,23,0.86))] p-4 shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
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
                <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">Type: {selectedNode.type}</div>
                <input
                  type="text"
                  value={selectedNode.label || ''}
                  onChange={(e) => onUpdateLabel(selectedNode.id, e.target.value)}
                  className="w-full rounded-xl border border-transparent bg-transparent px-0 py-1 text-lg font-semibold text-white focus:border-slate-700 focus:bg-slate-800 focus:px-2 focus:outline-none"
                  placeholder="Untitled Entity"
                />
              </div>
            </div>
          </div>

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
            <div className="rounded-[24px] border border-slate-800/80 bg-slate-950/30 px-4 py-4">
            <div className="mb-3">
              <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Properties</h4>
              <p className="mt-1 text-xs text-slate-500">Edit the node title and structured details used throughout the case.</p>
            </div>
            {(() => {
              const nodeType = nodeTypes.find(nt => nt.id === selectedNode.type);
              if (!nodeType) {
                return (
                  <div className="space-y-2">
                    {Object.entries(selectedNode.properties || {}).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">{key}</label>
                        <input
                          type="text"
                          value={String(value || '')}
                          onChange={(e) => onUpdateProperty(selectedNode.id, key, e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                    const renderInput = () => {
                      switch (property.type) {
                        case 'select':
                          return (
                            <select
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select {property.label}</option>
                              {property.options?.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          );
                        case 'textarea':
                          return (
                            <textarea
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              placeholder={property.placeholder}
                              rows={3}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                          );
                        case 'number':
                          return (
                            <input
                              type="number"
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              placeholder={property.placeholder}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          );
                        case 'date':
                          return (
                            <input
                              type="date"
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          );
                        case 'email':
                          return (
                            <input
                              type="email"
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              placeholder={property.placeholder}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          );
                        case 'url':
                          return (
                            <input
                              type="url"
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              placeholder={property.placeholder}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          );
                        case 'phone':
                          return (
                            <input
                              type="tel"
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              placeholder={property.placeholder}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                    className="w-full h-48 object-cover rounded-lg border border-slate-700"
                                  />
                                  <button
                                    onClick={() => {
                                      setImagePropertyKey(property.id);
                                      setImageModalOpen(true);
                                    }}
                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm rounded-lg"
                                  >
                                    Change Image
                                  </button>
                                  <button
                                    onClick={() => onUpdateProperty(selectedNode.id, property.id, '')}
                                    className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
                                  className="w-full px-4 py-8 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors text-sm"
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
                            <input
                              type="text"
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              placeholder={property.placeholder}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          );
                      }
                    };

                    return (
                      <div key={property.id} className="space-y-1">
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                          {property.label}
                          {property.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        {renderInput()}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            </div>
          </div>
          )}

          {tab === 'tools' && (
          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-800/80 bg-slate-950/30 px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Tools</h4>
                  <p className="mt-1 text-xs text-slate-500">Run lookups and enrichment against the selected node.</p>
                </div>
                {transformRegistryError ? <span className="text-[11px] text-red-300">{transformRegistryError}</span> : null}
              </div>
              {availableRemoteTransforms.length === 0 ? (
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-3 text-sm text-slate-500">
                  No remote tools are available for this node type yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {availableRemoteTransforms.map((transform) => {
                    const payload = buildTransformPayload(transform, selectedNode);
                    const disabled = !payload || !onRequestRemoteTransform;
                    return (
                      <div key={transform.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/55 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-100">{transform.name}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {transform.description || `Send a consented lookup to ${transform.network?.host ?? 'remote service'}.`}
                            </p>
                            {!payload ? (
                              <p className="mt-2 text-[11px] text-amber-300">
                                This tool needs a valid {transform.id === 'ip.lookup' ? 'IP address' : 'domain or URL'} on the node first.
                              </p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            disabled={disabled || runningTransformId === transform.id}
                            className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 transition-colors hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
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
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          )}

          {tab === 'evidence' && (
          <section className="mt-6 space-y-3 rounded-[24px] border border-slate-800/80 bg-slate-950/30 px-4 py-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Assertions</h4>
              <button
                onClick={onAddAssertion}
                className="text-xs text-green-400 hover:text-green-300 bg-green-900/20 hover:bg-green-900/30 px-2 py-1 rounded transition-colors"
                title="Add assertion"
              >
                +
              </button>
            </div>
            {assertions.length === 0 && (
              <p className="text-sm text-slate-500">No assertions yet.</p>
            )}
            {assertions.map((assertion) => (
              <AssertionCard
                key={assertion.id}
                assertion={assertion}
                highlighted={searchFocus?.assertionId === assertion.id}
              />
            ))}
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Sources</h4>
                <button
                  onClick={onAddSource}
                  className="text-xs text-green-400 hover:text-green-300 bg-green-900/20 hover:bg-green-900/30 px-2 py-1 rounded transition-colors"
                  title="Add source"
                >
                  +
                </button>
              </div>
              <SourcesList
                sources={sources}
                highlightedSourceId={searchFocus?.sourceId ?? null}
              />
            </div>
          </section>
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
                  <h3 className="text-lg font-semibold">Relationship</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">Selected</span>
                    <button
                      onClick={onDeleteEdge}
                      className="text-xs text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/30 px-2 py-1 rounded transition-colors"
                      title="Delete relationship (or press Delete key)"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="mb-4 p-3 bg-slate-800/50 border border-slate-700 rounded-md">
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-slate-300 font-medium">{sourceNode?.label || 'Unknown'}</div>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs">🔗</div>
                      <span className="text-slate-400 text-xs">{edge?.type}</span>
                    </div>
                    <div className="text-slate-300 font-medium">{targetNode?.label || 'Unknown'}</div>
                  </div>
                  <div className="text-slate-400 text-xs mt-2">ID: {edge?.id}</div>
                </div>
                {edge && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Subtype</label>
                      <select
                        value={String(edge.properties?.subtype || '')}
                        onChange={(e) => onUpdateEdgeProperty && onUpdateEdgeProperty(edge.id, 'subtype', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">None</option>
                        {relationshipTypes.find(rt => rt.id === edge.type)?.subtypes?.map(st => (
                          <option key={st.id} value={st.id}>{st.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Date</label>
                      <input
                        type="date"
                        value={String(edge.properties?.date || '')}
                        onChange={(e) => onUpdateEdgeProperty && onUpdateEdgeProperty(edge.id, 'date', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
                      <textarea
                        value={String(edge.properties?.notes || '')}
                        onChange={(e) => onUpdateEdgeProperty && onUpdateEdgeProperty(edge.id, 'notes', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
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

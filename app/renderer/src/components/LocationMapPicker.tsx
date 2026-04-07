import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import React from 'react';
import { ThemedButton, ThemedCard, ThemedInput, ThemedPanel } from '@renderer/features/personalization/primitives';

type CoordinateDraft = {
  latitude: number;
  longitude: number;
};

interface LocationMapPickerProps {
  initialCoordinates: CoordinateDraft | null;
  label: string;
  onSave: (coords: CoordinateDraft) => void;
  onClose: () => void;
  onOpenExternal: (coords: CoordinateDraft) => void;
}

const DEFAULT_CENTER: CoordinateDraft = { latitude: 20, longitude: 0 };
const DEFAULT_ZOOM = 2;
const DETAIL_ZOOM = 16;

export function LocationMapPicker({
  initialCoordinates,
  label,
  onSave,
  onClose,
  onOpenExternal
}: LocationMapPickerProps) {
  const [draft, setDraft] = React.useState<CoordinateDraft>(initialCoordinates ?? DEFAULT_CENTER);
  const [hasExplicitPoint, setHasExplicitPoint] = React.useState(Boolean(initialCoordinates));
  const mapRef = React.useRef<L.Map | null>(null);
  const markerRef = React.useRef<L.CircleMarker | null>(null);
  const mapContainerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (initialCoordinates) {
      setDraft(initialCoordinates);
      setHasExplicitPoint(true);
    } else {
      setDraft(DEFAULT_CENTER);
      setHasExplicitPoint(false);
    }
  }, [initialCoordinates]);

  React.useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initial = initialCoordinates ?? DEFAULT_CENTER;
    const zoom = initialCoordinates ? DETAIL_ZOOM : DEFAULT_ZOOM;
    const map = L.map(mapContainerRef.current, {
      center: [initial.latitude, initial.longitude],
      zoom,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const marker = L.circleMarker([initial.latitude, initial.longitude], {
      radius: 10,
      color: '#5fd4ff',
      fillColor: '#5fd4ff',
      fillOpacity: 0.28,
      weight: 2
    }).addTo(map);

    map.on('click', (event: L.LeafletMouseEvent) => {
      const coords = {
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6))
      };
      setDraft(coords);
      setHasExplicitPoint(true);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [initialCoordinates]);

  React.useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    marker.setLatLng([draft.latitude, draft.longitude]);
    map.setView([draft.latitude, draft.longitude], hasExplicitPoint ? DETAIL_ZOOM : DEFAULT_ZOOM, { animate: true });
    window.setTimeout(() => map.invalidateSize(), 0);
  }, [draft, hasExplicitPoint]);

  return (
    <ThemedPanel elevated className="flex h-[min(82vh,780px)] w-[min(94vw,1120px)] flex-col overflow-hidden rounded-[28px]">
      <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-dim)' }}>Location Map</p>
          <h3 className="mt-1 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</h3>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>Click anywhere on the map to set this location’s coordinates.</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemedButton type="button" variant="success" className="px-3 py-1.5 text-xs" onClick={() => onOpenExternal(draft)}>
            Open in browser
          </ThemedButton>
          <ThemedButton type="button" variant="quiet" className="px-3 py-1.5 text-xs" onClick={onClose}>
            Close
          </ThemedButton>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_280px]">
        <div className="relative min-h-0" style={{ background: 'var(--surface-base)' }}>
          <div ref={mapContainerRef} className="h-full w-full" />
        </div>
        <div className="flex flex-col gap-4 border-l p-5" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-overlay)' }}>
          <ThemedCard className="rounded-2xl p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Selected Coordinates</h4>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-dim)' }}>Latitude</span>
                <ThemedInput
                  type="number"
                  value={draft.latitude}
                  step="0.000001"
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isFinite(next)) {
                      setDraft((current) => ({ ...current, latitude: next }));
                      setHasExplicitPoint(true);
                    }
                  }}
                  className="w-full rounded-xl"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-dim)' }}>Longitude</span>
                <ThemedInput
                  type="number"
                  value={draft.longitude}
                  step="0.000001"
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isFinite(next)) {
                      setDraft((current) => ({ ...current, longitude: next }));
                      setHasExplicitPoint(true);
                    }
                  }}
                  className="w-full rounded-xl"
                />
              </label>
            </div>
          </ThemedCard>
          <ThemedCard className="rounded-2xl p-4 text-xs" style={{ color: 'var(--text-dim)' }}>
            Use the map for a quick point pick, or fine-tune the coordinates manually here. OpenStreetMap tiles are provided by the public OSM tile service.
          </ThemedCard>
          <div className="mt-auto flex items-center justify-end gap-2">
            <ThemedButton type="button" variant="quiet" className="px-3 py-2 text-sm" onClick={onClose}>
              Cancel
            </ThemedButton>
            <ThemedButton type="button" variant="accent" className="px-3 py-2 text-sm font-medium" onClick={() => onSave(draft)}>
              Use Coordinates
            </ThemedButton>
          </div>
        </div>
      </div>
    </ThemedPanel>
  );
}

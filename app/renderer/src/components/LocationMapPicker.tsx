import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import React from 'react';

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
    <div className="panel-elevated flex h-[min(82vh,780px)] w-[min(94vw,1120px)] flex-col overflow-hidden rounded-[28px]">
      <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Location Map</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{label}</h3>
          <p className="mt-1 text-xs text-slate-500">Click anywhere on the map to set this location’s coordinates.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 transition-colors hover:bg-emerald-500/20"
            onClick={() => onOpenExternal(draft)}
          >
            Open in browser
          </button>
          <button
            type="button"
            className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:bg-slate-800"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_280px]">
        <div className="relative min-h-0 bg-slate-950">
          <div ref={mapContainerRef} className="h-full w-full" />
        </div>
        <div className="flex flex-col gap-4 border-l border-slate-800/80 bg-slate-950/65 p-5">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Selected Coordinates</h4>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-500">Latitude</span>
                <input
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
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-500">Longitude</span>
                <input
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
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </label>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 text-xs text-slate-400">
            Use the map for a quick point pick, or fine-tune the coordinates manually here. OpenStreetMap tiles are provided by the public OSM tile service.
          </div>
          <div className="mt-auto flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-xl border border-sky-500/30 bg-sky-500/15 px-3 py-2 text-sm font-medium text-sky-100 transition-colors hover:bg-sky-500/25"
              onClick={() => onSave(draft)}
            >
              Use Coordinates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

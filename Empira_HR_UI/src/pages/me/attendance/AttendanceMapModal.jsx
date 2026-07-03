import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowDownLeft, ArrowUpRight, X } from 'lucide-react';
import { getProfileHeader } from '../../../services/profileHeader';
import { buildMapPointsForDay, formatMapViewDate } from '../attendanceLogHelpers';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function createLetterIcon(letter) {
  return L.divIcon({
    className: 'attendance-map-marker',
    html: `<div class="attendance-map-marker-pin"><span>${letter}</span></div>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

export default function AttendanceMapModal({ row, hour24 = false, onClose }) {
  const open = Boolean(row);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [activeLetter, setActiveLetter] = useState(null);

  const dateIso = row?.id ? String(row.id).slice(0, 10) : '';
  const sessions = row?.sessions ?? [];

  const points = useMemo(
    () => buildMapPointsForDay(sessions, hour24),
    [sessions, hour24]
  );

  const { data: profile } = useQuery({
    queryKey: ['profileHeader', 'me'],
    queryFn: () => getProfileHeader('me'),
    enabled: open,
    staleTime: 60_000,
  });

  const employeeName = profile?.display_name?.trim() || 'Employee';
  const headerDate = formatMapViewDate(dateIso);
  const sectionTitle = useMemo(() => {
    const mode = points[0]?.workMode ?? 'office';
    const label = String(mode).replace(/_/g, ' ');
    return label.toUpperCase() === 'OFFICE' ? 'WEB CLOCK IN' : label.toUpperCase();
  }, [points]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !mapContainerRef.current || points.length === 0) return undefined;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    markersRef.current = points.map((p) => {
      const marker = L.marker([p.lat, p.lng], { icon: createLetterIcon(p.letter) }).addTo(map);
      marker.on('click', () => setActiveLetter(p.letter));
      return { marker, letter: p.letter };
    });

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
    } else {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [48, 48] });
    }

    const fitTimer = window.setTimeout(() => {
      map.invalidateSize();
      if (points.length === 1) {
        map.setView([points[0].lat, points[0].lng], 15);
      } else {
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [48, 48] });
      }
    }, 100);

    return () => {
      window.clearTimeout(fitTimer);
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, [open, points]);

  useEffect(() => {
    if (!mapRef.current || !activeLetter) return;
    const entry = markersRef.current.find((m) => m.letter === activeLetter);
    if (entry) {
      const latLng = entry.marker.getLatLng();
      mapRef.current.panTo(latLng, { animate: true });
    }
  }, [activeLetter]);

  if (!open || points.length === 0) return null;

  return createPortal(
    <>
      <style>{`
        .attendance-map-marker { background: transparent; border: none; }
        .attendance-map-marker-pin {
          width: 28px; height: 36px;
          background: #e11d48;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: grid; place-items: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        }
        .attendance-map-marker-pin span {
          transform: rotate(45deg);
          color: white;
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
        }
      `}</style>

      <div
        className="fixed inset-0 z-[240] flex flex-col bg-[#0a1018]"
        role="dialog"
        aria-modal="true"
        aria-label="Attendance map view"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[#2a3447] px-5 py-3">
          <h2 className="text-sm font-semibold tracking-wide text-white sm:text-base">
            MAP VIEW - {headerDate} - {employeeName.toUpperCase()}
          </h2>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="grid h-9 w-9 place-items-center rounded-lg text-gray-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Close map view"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="w-[min(100%,320px)] shrink-0 overflow-y-auto border-r border-[#2a3447] bg-[#0f172a] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{sectionTitle}</p>
            <ul className="mt-3 space-y-2">
              {points.map((p) => {
                const active = activeLetter === p.letter;
                const isIn = p.type === 'in';
                return (
                  <li key={`${p.letter}-${p.type}-${p.iso}`}>
                    <button
                      type="button"
                      onClick={() => setActiveLetter(p.letter)}
                      className={cx(
                        'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition',
                        active
                          ? 'border-violet-500/50 bg-violet-500/10'
                          : 'border-[#2a3447] bg-[#151b2b] hover:border-[#3d4a63]'
                      )}
                    >
                      <span
                        className={cx(
                          'grid h-8 w-8 shrink-0 place-items-center rounded-full',
                          isIn ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        )}
                      >
                        {isIn ? (
                          <ArrowDownLeft className="h-4 w-4" strokeWidth={2.5} />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold tabular-nums text-gray-100">{p.timeLabel}</p>
                        <p className="mt-0.5 truncate text-[11px] text-gray-500">{p.coordLabel}</p>
                      </div>
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#e11d48] text-xs font-bold text-white">
                        {p.letter}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="relative min-h-0 min-w-0 flex-1 bg-[#1a2332]">
            <div ref={mapContainerRef} className="absolute inset-0 z-0" />
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

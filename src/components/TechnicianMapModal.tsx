import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Order, TechnicianWithWorkload } from '../types';
import {
  X, Navigation, MapPin, Phone, Briefcase,
  ChevronDown, ChevronUp, Sparkles, Loader2, Crosshair, CheckCircle2,
} from 'lucide-react';

// ─── Geocode with multiple fallback strategies ────────────────────────────────
async function geocodeAddress(raw: string): Promise<[number, number] | null> {
  // Build a list of progressively simpler queries to try
  const cleaned = raw
    .replace(/Federal Territory of\s*/gi, '')   // remove "Federal Territory of"
    .replace(/\bW\.P\.?\s*/gi, '')               // remove "W.P."
    .replace(/\s{2,}/g, ' ')
    .trim();

  const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean);

  const candidates = [
    cleaned,                                        // cleaned full address
    raw.trim(),                                     // original as-is
    parts.slice(0, 3).join(', '),                   // first 3 parts
    parts.slice(0, 2).join(', '),                   // first 2 parts
    parts.slice(-2).join(', '),                     // last 2 parts (postcode + city)
    parts[0] + ', Malaysia',                        // just area + country
  ].filter((s, i, arr) => s.length > 3 && arr.indexOf(s) === i);   // dedupe

  for (const q of candidates) {
    try {
      const url =
        `https://nominatim.openstreetmap.org/search` +
        `?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=my`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'SejukOps/1.0' },
      });
      const data: { lat: string; lon: string }[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch { /* try next */ }
  }
  return null;
}

// ─── Haversine distance ───────────────────────────────────────────────────────
function distKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_HEX: Record<TechnicianWithWorkload['workStatus'], string> = {
  Idle: '#16a34a',
  'On the way': '#d97706',
  'On-site': '#dc2626',
};
const STATUS_CSS: Record<TechnicianWithWorkload['workStatus'], string> = {
  Idle: 'bg-green-100 text-green-700',
  'On the way': 'bg-amber-100 text-amber-700',
  'On-site': 'bg-red-100 text-red-700',
};

// ─── Leaflet marker factories ─────────────────────────────────────────────────
function makeTechIcon(tech: TechnicianWithWorkload, selected: boolean, recommended: boolean): L.DivIcon {
  const color = STATUS_HEX[tech.workStatus];
  const initials = tech.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const size = recommended ? 46 : selected ? 42 : 36;
  let ring = recommended
    ? `box-shadow:0 0 0 3px white,0 0 0 7px #7c3aed;`
    : selected
    ? `box-shadow:0 0 0 3px white,0 0 0 5px ${color};`
    : `box-shadow:0 2px 6px rgba(0,0,0,0.25);`;
  return L.divIcon({
    html: `<div style="background:${color};color:white;width:${size}px;height:${size}px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;font-size:${size >= 42 ? 13 : 11}px;
      font-weight:700;border:2.5px solid white;${ring}">${initials}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 6],
  });
}

function makeOrderIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:46px;height:46px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      background:#1d4ed8;border:3px solid white;box-shadow:0 4px 14px rgba(29,78,216,.45);
      display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);font-size:17px;line-height:1">🏠</span></div>`,
    className: '',
    iconSize: [46, 46],
    iconAnchor: [23, 46],
    popupAnchor: [0, -50],
  });
}

// ─── Small reusable pieces ────────────────────────────────────────────────────
function Avatar({ tech, size = 40 }: { tech: TechnicianWithWorkload; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size >= 40 ? 14 : 12,
        backgroundColor: STATUS_HEX[tech.workStatus], boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
    >
      {tech.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
    </div>
  );
}

function StatusPill({ status }: { status: TechnicianWithWorkload['workStatus'] }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CSS[status]}`}>
      {status}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  order: Order;
  technicians: TechnicianWithWorkload[];
  onAssign: (techId: string) => void;
  onClose: () => void;
  assigning?: boolean;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function TechnicianMapModal({ order, technicians, onAssign, onClose, assigning }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const orderMarkerRef = useRef<L.Marker | null>(null);
  const pinClickRef = useRef<((e: L.LeafletMouseEvent) => void) | null>(null);

  const [selectedId, setSelectedId] = useState(order.assigned_technician_id ?? '');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ reasoning: string; recommendedId: string } | null>(null);
  const [aiError, setAiError] = useState('');

  // Resolved order coordinates
  const [resolvedLat, setResolvedLat] = useState<number | null>(order.latitude ?? null);
  const [resolvedLng, setResolvedLng] = useState<number | null>(order.longitude ?? null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [pinned, setPinned] = useState(false);   // user has manually placed a pin

  const hasOrderLoc = resolvedLat !== null && resolvedLng !== null;

  const getDistance = (tech: TechnicianWithWorkload): number | null => {
    if (!hasOrderLoc || !tech.latitude || !tech.longitude) return null;
    return distKm(resolvedLat!, resolvedLng!, tech.latitude, tech.longitude);
  };

  const selectTech = (id: string) => {
    setSelectedId(id);
    const tech = technicians.find(t => t.id === id);
    if (mapRef.current && tech?.latitude && tech?.longitude)
      mapRef.current.panTo([tech.latitude, tech.longitude], { animate: true, duration: 0.4 });
  };

  // ─── Place / update the order pin on the map ────────────────────────────────
  const placeOrderPin = useCallback((lat: number, lng: number, draggable = false) => {
    if (!mapRef.current) return;
    if (orderMarkerRef.current) mapRef.current.removeLayer(orderMarkerRef.current);

    const marker = L.marker([lat, lng], {
      icon: makeOrderIcon(),
      zIndexOffset: 1000,
      draggable,
    })
      .addTo(mapRef.current)
      .bindPopup(
        `<div style="font-family:system-ui;min-width:160px;padding:2px 0">
          <div style="font-weight:700;font-size:13px;margin-bottom:2px">${order.order_no || 'New Order'}</div>
          <div style="color:#374151">${order.customer_name}</div>
          <div style="color:#6b7280;font-size:12px">${order.customer_address}</div>
        </div>`,
        { offset: [0, -4] },
      );

    if (draggable) {
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setResolvedLat(pos.lat);
        setResolvedLng(pos.lng);
      });
    }

    orderMarkerRef.current = marker;
  }, [order]);

  // ─── Geocode on mount if no coords ─────────────────────────────────────────
  useEffect(() => {
    if (resolvedLat !== null || !order.customer_address.trim()) return;
    setGeocoding(true);
    geocodeAddress(order.customer_address).then(coords => {
      if (coords) {
        const [lat, lng] = coords;
        setResolvedLat(lat);
        setResolvedLng(lng);
        setGeocodeFailed(false);
        placeOrderPin(lat, lng);
        mapRef.current?.panTo([lat, lng], { animate: true, duration: 0.6 });
      } else {
        setGeocodeFailed(true);
      }
    }).finally(() => setGeocoding(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Init map (once) ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    const center: [number, number] = resolvedLat !== null && resolvedLng !== null
      ? [resolvedLat, resolvedLng]
      : [3.139, 101.6869];

    const map = L.map(mapDivRef.current, { center, zoom: 13, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    if (resolvedLat !== null && resolvedLng !== null) {
      placeOrderPin(resolvedLat, resolvedLng);
    }

    technicians.forEach(tech => {
      if (!tech.latitude || !tech.longitude) return;
      const dist = getDistance(tech);
      const marker = L.marker([tech.latitude, tech.longitude], {
        icon: makeTechIcon(tech, tech.id === (order.assigned_technician_id ?? ''), false),
      })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:system-ui;min-width:150px;padding:2px 0">
            <div style="font-weight:700;font-size:13px;margin-bottom:3px">${tech.name}</div>
            <div style="color:${STATUS_HEX[tech.workStatus]};font-weight:600;font-size:12px;margin-bottom:3px">${tech.workStatus}</div>
            ${tech.activeOrders > 0 ? `<div style="color:#6b7280;font-size:12px">${tech.activeOrders} active job${tech.activeOrders > 1 ? 's' : ''}</div>` : ''}
            ${dist !== null ? `<div style="color:#2563eb;font-size:12px;margin-top:3px">📍 ${dist.toFixed(1)} km from order</div>` : ''}
          </div>`,
          { offset: [0, -4] },
        )
        .on('click', () => {
          setSelectedId(tech.id);
          setExpandedId(id => id === tech.id ? null : tech.id);
          setAiResult(null);
        });
      markersRef.current.set(tech.id, marker);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      orderMarkerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Pin mode: click on map to place order marker ───────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const container = map.getContainer();

    // Clean up previous listener
    if (pinClickRef.current) {
      map.off('click', pinClickRef.current);
      pinClickRef.current = null;
    }

    if (pinMode) {
      container.style.cursor = 'crosshair';
      const handler = (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setResolvedLat(lat);
        setResolvedLng(lng);
        setGeocodeFailed(false);
        setPinned(true);
        setPinMode(false);
        placeOrderPin(lat, lng, true);   // draggable so user can fine-tune
        map.panTo([lat, lng], { animate: true });
      };
      pinClickRef.current = handler;
      map.on('click', handler);
    } else {
      container.style.cursor = '';
    }

    return () => {
      if (pinClickRef.current) map.off('click', pinClickRef.current);
      container.style.cursor = '';
    };
  }, [pinMode, placeOrderPin]);

  // ─── Update marker icons when selection / AI changes ───────────────────────
  useEffect(() => {
    technicians.forEach(tech => {
      const marker = markersRef.current.get(tech.id);
      if (!marker) return;
      marker.setIcon(makeTechIcon(tech, tech.id === selectedId, aiResult?.recommendedId === tech.id));
    });
  }, [selectedId, aiResult, technicians]);

  // ─── Pan to selected technician ─────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const tech = technicians.find(t => t.id === selectedId);
    if (tech?.latitude && tech?.longitude)
      mapRef.current.panTo([tech.latitude, tech.longitude], { animate: true, duration: 0.4 });
  }, [selectedId, technicians]);

  // ─── AI suggest ─────────────────────────────────────────────────────────────
  const handleAISuggest = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch('/api/ai-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: {
            order_no: order.order_no,
            customer_name: order.customer_name,
            customer_address: order.customer_address,
            service_type: order.service_type,
            problem_description: order.problem_description,
          },
          technicians: technicians.map(t => ({
            id: t.id,
            name: t.name,
            workStatus: t.workStatus,
            activeOrders: t.activeOrders,
            distanceKm: getDistance(t),
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'AI request failed');

      const { answer, recommendedName } = json as { answer: string; recommendedName: string | null };
      const rec = recommendedName
        ? technicians.find(t =>
            t.name.toLowerCase().includes(recommendedName.toLowerCase()) ||
            recommendedName.toLowerCase().includes(t.name.toLowerCase()))
        : null;

      const reasoning = answer.replace(/\*\*Recommended:.*?\*\*/gi, '').trim();
      setAiResult({ reasoning, recommendedId: rec?.id ?? '' });

      if (rec) {
        setSelectedId(rec.id);
        setExpandedId(null);
        if (mapRef.current && rec.latitude && rec.longitude) {
          mapRef.current.panTo([rec.latitude, rec.longitude], { animate: true });
          setTimeout(() => markersRef.current.get(rec.id)?.openPopup(), 450);
        }
      }
    } catch (err) {
      setAiError((err as Error).message ?? 'AI suggestion failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const selectedTech = technicians.find(t => t.id === selectedId);
  const recommendedTech = aiResult ? technicians.find(t => t.id === aiResult.recommendedId) : null;
  const listTechs = [...technicians]
    .sort((a, b) => {
      const o = { Idle: 0, 'On the way': 1, 'On-site': 2 };
      const d = o[a.workStatus] - o[b.workStatus];
      return d !== 0 ? d : (getDistance(a) ?? 999) - (getDistance(b) ?? 999);
    })
    .filter(t => !aiResult || t.id !== aiResult.recommendedId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <MapPin size={16} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900">Assign Technician</h2>
              {/* Order meta */}
              <p className="text-xs text-gray-400 font-mono truncate">
                {order.order_no || 'New Order'} &middot; {order.customer_name} &middot; {order.service_type}
              </p>
              {/* Customer address — always visible */}
              {order.customer_address && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate" title={order.customer_address}>
                  <MapPin size={10} className="text-gray-400 flex-shrink-0" />
                  {order.customer_address}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0 ml-3"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Sidebar ── */}
          <div className="flex flex-col flex-shrink-0 border-r border-gray-100" style={{ width: 296 }}>

            {/* AI button */}
            <div className="px-3 pt-3 pb-2">
              <button
                onClick={handleAISuggest}
                disabled={aiLoading}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${aiLoading
                    ? 'bg-violet-100 text-violet-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-sm hover:shadow-md'
                  }`}
              >
                {aiLoading
                  ? <><span className="w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /> Analysing...</>
                  : <><Sparkles size={14} /> {aiResult ? 'Re-run AI Suggestion' : 'AI Suggest Best Technician'}</>
                }
              </button>
            </div>

            {aiError && (
              <div className="mx-3 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                {aiError}
              </div>
            )}

            {/* Technician list */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">

              {/* AI recommendation card */}
              {recommendedTech && aiResult && (
                <div className="mb-1">
                  <div className="flex items-center gap-1.5 mb-1.5 px-0.5">
                    <Sparkles size={11} className="text-violet-500" />
                    <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">AI Recommendation</span>
                  </div>
                  <button
                    onClick={() => selectTech(recommendedTech.id)}
                    className={`w-full text-left rounded-xl border-2 overflow-hidden transition-all
                      ${selectedId === recommendedTech.id ? 'border-violet-500 shadow-md shadow-violet-100' : 'border-violet-300 hover:border-violet-400'}`}
                  >
                    <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
                    <div className="p-3 bg-violet-50">
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div className="relative">
                          <Avatar tech={recommendedTech} size={42} />
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-600 rounded-full flex items-center justify-center">
                            <Sparkles size={8} className="text-white" />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-sm text-gray-900">{recommendedTech.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StatusPill status={recommendedTech.workStatus} />
                            {getDistance(recommendedTech) !== null && (
                              <span className="text-xs text-gray-500 flex items-center gap-0.5">
                                <Navigation size={9} /> {getDistance(recommendedTech)!.toFixed(1)} km
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg px-3 py-2 border border-violet-100">
                        <p className="text-xs text-gray-600 leading-relaxed">{aiResult.reasoning}</p>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                        {recommendedTech.phone && (
                          <span className="flex items-center gap-1"><Phone size={10} /> {recommendedTech.phone}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Briefcase size={10} />
                          {recommendedTech.activeOrders === 0 ? 'Available' : `${recommendedTech.activeOrders} active`}
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {aiResult && listTechs.length > 0 && (
                <div className="flex items-center gap-2 py-0.5">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400">Others</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
              )}

              {!aiResult && (
                <p className="text-xs text-gray-400 font-medium px-0.5 mb-1">
                  {technicians.length} technicians · sorted by availability & distance
                </p>
              )}

              {listTechs.map(tech => {
                const dist = getDistance(tech);
                const isSelected = tech.id === selectedId;
                const isExpanded = expandedId === tech.id;
                return (
                  <button
                    key={tech.id}
                    onClick={() => {
                      selectTech(tech.id);
                      setExpandedId(isExpanded ? null : tech.id);
                      setAiResult(null);
                    }}
                    className={`w-full text-left rounded-xl border p-3 transition-all duration-150
                      ${isSelected ? 'border-blue-300 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar tech={tech} size={36} />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm text-gray-900 block truncate">{tech.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StatusPill status={tech.workStatus} />
                          {dist !== null && (
                            <span className="text-xs text-gray-400 flex items-center gap-0.5">
                              <Navigation size={9} /> {dist.toFixed(1)} km
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-gray-300 flex-shrink-0">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-2.5 pt-2.5 border-t border-gray-100 space-y-1.5">
                        {tech.phone && (
                          <p className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Phone size={10} className="text-gray-300" /> {tech.phone}
                          </p>
                        )}
                        <p className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Briefcase size={10} className="text-gray-300" />
                          {tech.activeOrders === 0
                            ? 'No active jobs — fully available'
                            : `${tech.activeOrders} active${tech.inProgressOrders > 0 ? ` (${tech.inProgressOrders} on-site)` : ''}`}
                        </p>
                        {dist !== null && (
                          <p className="flex items-center gap-1.5 text-xs text-blue-500 font-medium">
                            <MapPin size={10} /> {dist.toFixed(1)} km from order
                          </p>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-3 py-3 space-y-3 flex-shrink-0 bg-gray-50/60">
              <div className="flex items-center justify-center gap-4">
                {(['Idle', 'On the way', 'On-site'] as const).map(s => (
                  <div key={s} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_HEX[s] }} />
                    <span className="text-xs text-gray-400">{s}</span>
                  </div>
                ))}
              </div>
              <button
                disabled={!selectedId || assigning}
                onClick={() => selectedId && onAssign(selectedId)}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2
                  ${selectedId && !assigning
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                {assigning
                  ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Assigning…</>
                  : selectedTech ? `Assign ${selectedTech.name}` : 'Select a technician'}
              </button>
              <button onClick={onClose} disabled={assigning} className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1">
                Cancel
              </button>
            </div>
          </div>

          {/* ── Map ── */}
          <div className="flex-1 relative overflow-hidden">

            {/* Geocoding spinner */}
            {geocoding && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-600 shadow-sm flex items-center gap-2 whitespace-nowrap">
                <Loader2 size={12} className="animate-spin" />
                Locating "{order.customer_address.slice(0, 40)}{order.customer_address.length > 40 ? '…' : ''}"
              </div>
            )}

            {/* Geocode failed — offer manual pin */}
            {geocodeFailed && !pinMode && !pinned && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white border border-amber-300 rounded-xl px-4 py-3 shadow-md flex items-center gap-3 whitespace-nowrap">
                <div>
                  <p className="text-xs font-semibold text-amber-700">Address not found on map</p>
                  <p className="text-xs text-gray-500 mt-0.5">Pin the location manually so AI can calculate distances</p>
                </div>
                <button
                  onClick={() => setPinMode(true)}
                  className="flex items-center gap-1.5 bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors flex-shrink-0"
                >
                  <Crosshair size={12} /> Pin Location
                </button>
              </div>
            )}

            {/* Pin mode instruction */}
            {pinMode && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-gray-900 text-white rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 whitespace-nowrap">
                <Crosshair size={14} className="text-amber-400" />
                <div>
                  <p className="text-xs font-semibold">Click on the map to set order location</p>
                  <p className="text-xs text-gray-400 mt-0.5">You can drag the pin after placing it</p>
                </div>
                <button
                  onClick={() => setPinMode(false)}
                  className="text-gray-400 hover:text-white transition-colors ml-1"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Pin placed confirmation */}
            {pinned && !pinMode && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white border border-green-300 rounded-lg px-3 py-2 shadow-sm flex items-center gap-2 whitespace-nowrap">
                <CheckCircle2 size={13} className="text-green-500" />
                <span className="text-xs text-green-700 font-medium">Location pinned — drag pin to adjust</span>
                <button
                  onClick={() => { setPinMode(true); setPinned(false); }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline ml-1"
                >
                  re-pin
                </button>
              </div>
            )}

            <div ref={mapDivRef} className="w-full h-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

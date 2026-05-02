import React, { useState, useEffect } from "react";
import { RealMap } from "./Map";
import {
  Bike,
  BusFront,
  Car,
  Footprints,
  MapPin,
  Plus,
  TrainFront,
  X,
} from "lucide-react";
import { BottomNav } from "./BottomNav";
import { Switch } from "../ui/switch";
import { getBackendUrl } from "../../lib/backend";
import { getTransportColor } from "./transportColors";
import type { OtpItinerary, OtpLeg, OtpRouteResponse } from "./otpTypes";

interface LocationResult {
  name: string;
  lat: number;
  lng: number;
}

interface SavedPlace {
  _id: string;
  label: string;
  address: string;
  lat?: number;
  lng?: number;
}

type TravelMode = "car" | "bike" | "local" | "walk";
type LocalTransportMode = "bus" | "rail" | "subway";

interface RouteStep {
  mode: string;
  from?: string;
  to?: string;
  routeName?: string;
  color: string;
  duration: number;
}

const travelModeChoices: Array<{
  id: TravelMode;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { id: "car", label: "Car", Icon: Car },
  { id: "bike", label: "Bike", Icon: Bike },
  { id: "local", label: "Local transport", Icon: TrainFront },
  { id: "walk", label: "Walk", Icon: Footprints },
];

const localTransportChoices: Array<{
  id: LocalTransportMode;
  label: string;
  detail: string;
  color: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { id: "bus", label: "Buses", detail: "BEST routes", color: "#f97316", Icon: BusFront },
  { id: "rail", label: "Locals", detail: "Suburban rail", color: "#64748b", Icon: TrainFront },
  { id: "subway", label: "Metro", detail: "Lines 1, 2A, 3, 7", color: "#2563eb", Icon: TrainFront },
];

const metroLineBadges = [
  ["1", "#2563eb", "#ffffff"],
  ["2A", "#facc15", "#0f172a"],
  ["3", "#06b6d4", "#ffffff"],
  ["7", "#ef4444", "#ffffff"],
] as const;

const defaultLocalTransport = {
  bus: true,
  rail: true,
  subway: true,
};

type LocalTransportStyle = React.CSSProperties & {
  "--local-transport-color": string;
  "--local-transport-soft": string;
  "--local-transport-card": string;
};

const modeLabels: Record<string, string> = {
  WALK: "Walk",
  SUBWAY: "Metro",
  BUS: "Bus",
  RAIL: "Local",
  CAR: "Car",
  BICYCLE: "Bike",
};

const modeIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  WALK: Footprints,
  SUBWAY: TrainFront,
  BUS: BusFront,
  RAIL: TrainFront,
  CAR: Car,
  BICYCLE: Bike,
};

const getForegroundForRouteColor = (color: string) =>
  color.toLowerCase() === "#facc15" ? "#0f172a" : "#ffffff";


const fetchLocationSuggestions = async (query: string) => {
  try {
    const res = await fetch(
      `${getBackendUrl()}/api/search?q=${encodeURIComponent(query)}`
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
};

const fetchSavedPlaces = async (): Promise<SavedPlace[]> => {
  try {
    const res = await fetch(`${getBackendUrl()}/api/places`, {
      credentials: "include",
    });
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return data.places || [];
  } catch {
    return [];
  }
};

const savePlaceToBackend = async (place: {
  label: string;
  address: string;
  lat?: number;
  lng?: number;
}) => {
  try {
    const res = await fetch(`${getBackendUrl()}/api/places`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(place),
    });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data.place;
  } catch {
    return null;
  }
};

const deletePlaceFromBackend = async (id: string) => {
  try {
    const res = await fetch(`${getBackendUrl()}/api/places/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const TravelView = () => {
  const [locA, setLocA] = useState("");
  const [locB, setLocB] = useState("");

  const [debouncedA, setDebouncedA] = useState("");
  const [debouncedB, setDebouncedB] = useState("");

  const [coordsA, setCoordsA] = useState<LocationResult | null>(null);
  const [coordsB, setCoordsB] = useState<LocationResult | null>(null);

  const [suggestionsA, setSuggestionsA] = useState<LocationResult[]>([]);
  const [suggestionsB, setSuggestionsB] = useState<LocationResult[]>([]);

  const [activeField, setActiveField] = useState<"A" | "B" | null>(null);

  const [routeData, setRouteData] = useState<OtpRouteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [routeNotice, setRouteNotice] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [travelMode, setTravelMode] = useState<TravelMode>("local");
  const [localTransport, setLocalTransport] = useState<Record<LocalTransportMode, boolean>>(
    defaultLocalTransport
  );

  const [isExpanded, setIsExpanded] = useState(true);
  const [isSearchCollapsed, setIsSearchCollapsed] = useState(false);

  // Saved places
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [debouncedNewAddr, setDebouncedNewAddr] = useState("");
  const [newAddrSuggestions, setNewAddrSuggestions] = useState<LocationResult[]>([]);
  const [newCoords, setNewCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetchSavedPlaces().then((places) => {
      setSavedPlaces(places);
    });
  }, []);

  // Debounce for add-place address
  useEffect(() => {
    const t = setTimeout(() => setDebouncedNewAddr(newAddress), 400);
    return () => clearTimeout(t);
  }, [newAddress]);

  useEffect(() => {
    if (debouncedNewAddr.length > 2) {
      fetchLocationSuggestions(debouncedNewAddr).then(setNewAddrSuggestions);
    } else {
      setNewAddrSuggestions([]);
    }
  }, [debouncedNewAddr]);

  /* -------------------- Debounce -------------------- */

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedA(locA), 400);
    return () => clearTimeout(timer);
  }, [locA]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedB(locB), 400);
    return () => clearTimeout(timer);
  }, [locB]);

  /* -------------------- Fetch -------------------- */

  useEffect(() => {
    if (debouncedA.length > 2) {
      fetchLocationSuggestions(debouncedA).then(setSuggestionsA);
    } else {
      setSuggestionsA([]);
    }
  }, [debouncedA]);

  useEffect(() => {
    if (debouncedB.length > 2) {
      fetchLocationSuggestions(debouncedB).then(setSuggestionsB);
    } else {
      setSuggestionsB([]);
    }
  }, [debouncedB]);

  const hasLocalTransportMode = Object.values(localTransport).some(Boolean);
  const canRequestRoute = Boolean(
    coordsA &&
    coordsB &&
    (travelMode !== "local" || hasLocalTransportMode)
  );

  const updateTravelMode = (mode: TravelMode) => {
    setTravelMode(mode);
    setRouteNotice("");
    setRouteData(null);
    setSelectedIndex(0);
    setIsSearchCollapsed(false);
  };

  const updateLocalTransport = (
    mode: LocalTransportMode,
    checked: boolean
  ) => {
    setLocalTransport((current) => ({
      ...current,
      [mode]: checked,
    }));
    setRouteNotice("");
    setRouteData(null);
    setSelectedIndex(0);
    setIsSearchCollapsed(false);
  };

  const handleRoute = async () => {
    if (!coordsA || !coordsB || !canRequestRoute) return;
    setLoading(true);
    setRouteNotice("");
    setSelectedIndex(0);
    try {
      const res = await fetch(`${getBackendUrl()}/api/otp/route`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: { lat: coordsA.lat, lng: coordsA.lng },
          to: { lat: coordsB.lat, lng: coordsB.lng },
          fromName: locA,
          toName: locB,
          travelMode,
          localTransport: {
            bus: localTransport.bus,
            rail: localTransport.rail,
            subway: localTransport.subway,
          },
        }),
      });
      const data = await res.json() as OtpRouteResponse;
      setRouteData(data);
      const nextItineraries = data?.data?.plan?.itineraries || [];
      if (!res.ok || nextItineraries.length === 0) {
        setRouteNotice("No route found for the selected travel modes.");
        setIsSearchCollapsed(false);
        return;
      }
      setIsSearchCollapsed(true);
    } catch {
      setRouteNotice("Could not find a route right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (location: LocationResult, type: "A" | "B") => {
    if (type === "A") {
      setLocA(location.name);
      setCoordsA(location);
      setSuggestionsA([]);
    } else {
      setLocB(location.name);
      setCoordsB(location);
      setSuggestionsB([]);
    }
    setActiveField(null);
    setRouteData(null);
    setRouteNotice("");
    setSelectedIndex(0);
    setIsSearchCollapsed(false);
  };

  const handleSavedPlaceClick = (place: SavedPlace) => {
    setLocB(place.address);
    if (place.lat && place.lng) {
      setCoordsB({ name: place.address, lat: place.lat, lng: place.lng });
    } else {
      setCoordsB(null);
      // trigger a search so suggestions appear
      setActiveField("B");
    }
    setSuggestionsB([]);
    setRouteData(null);
    setRouteNotice("");
    setSelectedIndex(0);
    setIsSearchCollapsed(false);
  };

  const handleAddPlace = async () => {
    if (!newLabel || !newAddress) return;
    const created = await savePlaceToBackend({
      label: newLabel,
      address: newAddress,
      lat: newCoords?.lat,
      lng: newCoords?.lng,
    });
    if (created) {
      setSavedPlaces((prev) => [...prev, created]);
    }
    setNewLabel("");
    setNewAddress("");
    setNewCoords(null);
    setNewAddrSuggestions([]);
    setShowAddModal(false);
  };

  const handleDeletePlace = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // don't trigger the card click
    const deleted = await deletePlaceFromBackend(id);
    if (deleted) {
      setSavedPlaces((prev) => prev.filter((p) => p._id !== id));
    }
  };

  const itineraries: OtpItinerary[] = routeData?.data?.plan?.itineraries || [];
  const itinerary = itineraries[selectedIndex];
  const routingNote = routeData?.routing?.adjustedToNextMetroService
    ? `Showing next metro service at ${routeData.routing.time}`
    : "";

  const steps: RouteStep[] | undefined = itinerary?.legs?.map((leg: OtpLeg) => ({
    mode: leg.mode,
    from: leg.from?.name,
    to: leg.to?.name,
    routeName: leg.route?.shortName || leg.route?.longName,
    color: getTransportColor(
      leg.mode,
      leg.route?.shortName || leg.route?.longName || ""
    ),
    duration: Math.round((leg.endTime - leg.startTime) / 60000),
  }));

  const routeControls = (
    <section className="relative z-20 px-4 pb-24">
      <div className="mx-auto max-w-xl space-y-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-2 shadow-lg">
          <div className="grid grid-cols-4 gap-1">
            {travelModeChoices.map(({ id, label, Icon }) => {
              const isActive = travelMode === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => updateTravelMode(id)}
                  aria-pressed={isActive}
                  aria-label={id === "local" ? "Local transport" : label}
                  className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-medium leading-tight transition-all ${
                    isActive
                      ? "bg-white text-primary shadow-sm dark:bg-slate-100"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                  }`}
                >
                  <Icon size={20} />
                  <span className="whitespace-normal text-center">{label}</span>
                </button>
              );
            })}
          </div>

          {travelMode === "local" && (
            <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900/90 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-100">
                    Local transport
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Buses, locals, metro
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {metroLineBadges.map(([line, color, textColor]) => (
                    <span
                      key={line}
                      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                      style={{ backgroundColor: color, color: textColor }}
                    >
                      {line}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                {localTransportChoices.map(({ id, label, detail, color, Icon }) => {
                  const isEnabled = localTransport[id];
                  const transportStyle: LocalTransportStyle = {
                    "--local-transport-color": color,
                    "--local-transport-soft": `${color}33`,
                    "--local-transport-card": `${color}14`,
                  };

                  return (
                    <div
                      key={id}
                      className={`local-transport-card flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                        isEnabled
                          ? "local-transport-card--active"
                          : "border-slate-800 bg-slate-950/70"
                      }`}
                      style={transportStyle}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex size-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition-transform ${
                            isEnabled ? "scale-100" : "scale-95 opacity-70"
                          }`}
                          style={{ backgroundColor: color }}
                        >
                          <Icon size={17} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-100">
                            {label}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {detail}
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => updateLocalTransport(id, checked)}
                        aria-label={`Use ${label}`}
                        className="local-transport-switch"
                        style={transportStyle}
                      />
                    </div>
                  );
                })}
              </div>

              {!hasLocalTransportMode && (
                <div className="mt-2 text-xs text-amber-300">
                  Select at least one local transport mode.
                </div>
              )}
            </div>
          )}
        </div>

        {routeNotice && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            {routeNotice}
          </div>
        )}

        {coordsA && coordsB && (
          <button
            onClick={handleRoute}
            className="w-full bg-primary py-3 rounded-xl font-medium text-white disabled:opacity-50"
            disabled={loading || !canRequestRoute}
          >
            {loading ? "Finding Route..." : "Find Route"}
          </button>
        )}
      </div>
    </section>
  );

  return (
   <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background-light dark:bg-background-dark border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="max-w-xl mx-auto space-y-4">

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSearchCollapsed(false)}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>

            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Route Planner
            </h1>
          </div>

        </div>
      </header>

      {/* Edit Route button when search collapsed */}
      {isSearchCollapsed && (
        <button
          onClick={() => {
            setIsSearchCollapsed(false);
            setIsExpanded(false);
          }}
          className="fixed top-20 right-4 bg-primary px-4 py-2 rounded-full shadow-lg"
          style={{ zIndex: 9999 }}
        >
          Edit Route
        </button>
      )}

      {/* Search panel */}
      {!isSearchCollapsed && (
          <div
              className="relative z-30 mt-4 px-4 overflow-visible"
            >
          {routeData && (
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => setIsSearchCollapsed(true)}
                className="inline-flex size-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
                aria-label="Collapse route editor"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Saved Places row */}
          <div className="mb-3 flex gap-2 overflow-x-auto no-scrollbar mt-2">
            {savedPlaces.map((p) => (
              <button
                key={p._id}
                onClick={() => handleSavedPlaceClick(p)}
                className="relative flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl pl-4 pr-8 py-2 shrink-0 hover:bg-slate-800 hover:border-zinc-700 transition-all"
              >
                <MapPin size={14} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-zinc-200 whitespace-nowrap">
                  {p.label}
                </span>
                <span
                  onClick={(e) => handleDeletePlace(p._id, e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-red-400 transition-colors"
                >
                  <X size={12} />
                </span>
              </button>
            ))}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-dashed border-zinc-700 rounded-xl px-4 py-2 shrink-0 hover:bg-slate-800 hover:border-emerald-500/50 transition-all"
            >
              <Plus size={16} className="text-emerald-400" />
              <span className="text-xs text-slate-400 whitespace-nowrap">Add</span>
            </button>
          </div>

          {/* From */}
          <div className="relative z-30 mb-4">
            <input
              value={locA}
              onChange={(e) => {
                setLocA(e.target.value);
                setActiveField("A");
              }}
              placeholder="From..."
              className="w-full bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl py-3 px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
            />
            {activeField === "A" && suggestionsA.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl bg-slate-800 shadow-2xl">
                {suggestionsA.map((s) => (
                  <button
                    key={`${s.name}-${s.lat}`}
                    onClick={() => handleSelect(s, "A")}
                    className="block w-full text-left px-4 py-3 hover:bg-zinc-700 text-sm"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* To */}
          <div className="relative z-30 mb-6">
            <input
              value={locB}
              onChange={(e) => {
                setLocB(e.target.value);
                setActiveField("B");
              }}
              placeholder="To..."
              className="w-full bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl py-3 px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
            />
            {activeField === "B" && suggestionsB.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl bg-slate-800 shadow-2xl">
                {suggestionsB.map((s) => (
                  <button
                    key={`${s.name}-${s.lat}`}
                    onClick={() => handleSelect(s, "B")}
                    className="block w-full text-left px-4 py-3 hover:bg-zinc-700 text-sm"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
      {/* Map layer */}
        <section className="relative z-0 px-4 pb-4">
          <div className="relative z-0 w-full h-[40vh] overflow-hidden rounded-xl border border-slate-800 shadow-lg sm:h-[45vh] lg:h-[55vh]">

            <RealMap
              markers={[
                ...(coordsA ? [{ lat: coordsA.lat, lng: coordsA.lng, name: locA }] : []),
                ...(coordsB ? [{ lat: coordsB.lat, lng: coordsB.lng, name: locB }] : []),
              ]}
              routeData={routeData}
              selectedIndex={selectedIndex}
            />

          </div>
        </section>

      {!isSearchCollapsed && routeControls}

      {/* Add Place Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4" style={{ zIndex: 10000 }}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm relative">
            <button
              onClick={() => {
                setShowAddModal(false);
                setNewLabel("");
                setNewAddress("");
                setNewCoords(null);
                setNewAddrSuggestions([]);
              }}
              className="absolute top-3 right-3 text-zinc-500 hover:text-white"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-semibold mb-4">Save a Place</h3>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (e.g. Home, Gym, Office)"
              className="w-full bg-slate-800 border border-zinc-700 rounded-xl py-3 px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none mb-3"
            />
            <div className="relative mb-3">
              <input
                value={newAddress}
                onChange={(e) => {
                  setNewAddress(e.target.value);
                  setNewCoords(null);
                }}
                placeholder="Search address..."
                className="w-full bg-slate-800 border border-zinc-700 rounded-xl py-3 px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
              />
              {newAddrSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-slate-800 rounded-xl mt-2 shadow-lg z-20 max-h-40 overflow-y-auto">
                  {newAddrSuggestions.map((s) => (
                    <button
                      key={`${s.name}-${s.lat}`}
                      onClick={() => {
                        setNewAddress(s.name);
                        setNewCoords({ lat: s.lat, lng: s.lng });
                        setNewAddrSuggestions([]);
                      }}
                      className="block w-full text-left px-4 py-3 hover:bg-zinc-700 text-sm"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleAddPlace}
              disabled={!newLabel || !newAddress}
              className="w-full bg-primary py-3 rounded-xl font-medium disabled:opacity-50 mt-1"
            >
              Save Place
            </button>
          </div>
        </div>
      )}

      {/* Itinerary Selector */}
      {isSearchCollapsed && itineraries.length > 1 && (
        <div className="fixed left-0 right-0 top-24 px-4" style={{ zIndex: 25 }}>
          <div className="flex gap-2 overflow-x-auto">
            {itineraries.map((it: OtpItinerary, index: number) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${
                  selectedIndex === index ? "bg-primary" : "bg-slate-800"
                }`}
              >
                Option {index + 1} - {Math.round(it.duration / 60)} mins
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Sheet */}
      {itinerary && (
        <div
          className={`fixed bottom-[72px] left-0 right-0 z-20 rounded-t-3xl border-t border-slate-800 bg-background-dark shadow-2xl transition-all duration-300 ${
            isExpanded ? "h-[50vh]" : "h-[88px]"
          }`}
        >
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-4 cursor-pointer flex flex-col items-center"
          >
            <div className="w-12 h-1 bg-zinc-600 rounded-full mb-3" />
            <div className="text-sm font-medium text-zinc-300">
              {isExpanded
                ? "Swipe down to collapse"
                : `Route - ${Math.round(itinerary.duration / 60)} mins (Tap to expand)`}
            </div>
            {routingNote && (
              <div className="mt-1 text-xs font-medium text-amber-300">
                {routingNote}
              </div>
            )}
          </div>

          {isExpanded && (
            <div className="h-[calc(100%-88px)] overflow-y-auto px-4 pb-6">
              {steps?.map((step: RouteStep, index: number) => {
                const StepIcon = modeIcons[step.mode] || MapPin;
                const modeLabel = modeLabels[step.mode] || step.mode;
                const stepForeground = getForegroundForRouteColor(step.color);

                return (
                  <div
                    key={index}
                    className="mb-3 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm"
                    style={{ borderLeftColor: step.color, borderLeftWidth: 4 }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2 font-medium text-slate-100">
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: step.color,
                            color: stepForeground,
                          }}
                        >
                          <StepIcon size={16} />
                        </span>
                        <span>{modeLabel}</span>
                      </div>
                      <div className="shrink-0 text-xs font-medium text-slate-400">
                        {step.duration} mins
                      </div>
                    </div>

                    {step.routeName && step.mode !== "WALK" && (
                      <div className="mt-2 inline-flex items-center rounded-full bg-slate-950 px-3 py-1 text-xs font-medium">
                        <span
                          className="mr-2 h-2 w-6 rounded-full"
                          style={{ backgroundColor: step.color }}
                        />
                        <span style={{ color: step.color }}>
                          Line {step.routeName}
                        </span>
                      </div>
                    )}

                    <div className="mt-2 text-slate-400">
                      From{" "}
                      <span className="font-medium text-white">{step.from}</span>{" "}
                      to{" "}
                      <span className="font-medium text-white">{step.to}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

        <BottomNav active="travel" />
    </div>
  );
};

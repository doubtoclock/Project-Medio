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
import { apiFetch } from "../../lib/api";
import {
  fetchLocationSuggestions,
  type LocationResult,
} from "../../lib/locationSearch";
import type { OtpItinerary, OtpRouteResponse } from "./otpTypes";

interface SavedPlace {
  _id: string;
  label: string;
  address: string;
  lat?: number;
  lng?: number;
}

type TravelMode = "car" | "bike" | "local" | "walk";
type LocalTransportMode = "bus" | "rail" | "subway";

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

const fetchSavedPlaces = async (): Promise<SavedPlace[]> => {
  try {
    const res = await apiFetch("/api/places", {
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
    const res = await apiFetch("/api/places", {
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
    const res = await apiFetch(`/api/places/${id}`, {
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
  const [travelMode, setTravelMode] = useState<TravelMode>("local");
  const [localTransport, setLocalTransport] = useState<Record<LocalTransportMode, boolean>>(
    defaultLocalTransport
  );

  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);

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
    const query = debouncedNewAddr.trim();
    if (query.length < 3) {
      setNewAddrSuggestions([]);
      return;
    }

    const controller = new AbortController();
    let isCurrent = true;

    fetchLocationSuggestions(query, controller.signal)
      .then((suggestions) => {
        if (isCurrent) setNewAddrSuggestions(suggestions);
      })
      .catch(() => {
        if (isCurrent && !controller.signal.aborted) {
          setNewAddrSuggestions([]);
        }
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
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
    const query = debouncedA.trim();
    if (query.length < 3) {
      setSuggestionsA([]);
      return;
    }

    const controller = new AbortController();
    let isCurrent = true;

    fetchLocationSuggestions(query, controller.signal)
      .then((suggestions) => {
        if (isCurrent) setSuggestionsA(suggestions);
      })
      .catch(() => {
        if (isCurrent && !controller.signal.aborted) {
          setSuggestionsA([]);
        }
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [debouncedA]);

  useEffect(() => {
    const query = debouncedB.trim();
    if (query.length < 3) {
      setSuggestionsB([]);
      return;
    }

    const controller = new AbortController();
    let isCurrent = true;

    fetchLocationSuggestions(query, controller.signal)
      .then((suggestions) => {
        if (isCurrent) setSuggestionsB(suggestions);
      })
      .catch(() => {
        if (isCurrent && !controller.signal.aborted) {
          setSuggestionsB([]);
        }
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
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
    setSelectedRoute(null);
    setShowMap(false);
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
    setSelectedRoute(null);
    setShowMap(false);
  };

  const resetRouteState = () => {
    setRouteData(null);
    setRouteNotice("");
    setSelectedRoute(null);
    setShowMap(false);
  };

  const handleLocationInputChange = (value: string, type: "A" | "B") => {
    if (type === "A") {
      setLocA(value);
      setCoordsA(null);
      setSuggestionsA([]);
    } else {
      setLocB(value);
      setCoordsB(null);
      setSuggestionsB([]);
    }

    setActiveField(type);
    resetRouteState();
  };

  const handleFieldBlur = (type: "A" | "B") => {
    setTimeout(() => {
      const suggestions = type === "A" ? suggestionsA : suggestionsB;
      const coords = type === "A" ? coordsA : coordsB;
      if (suggestions.length > 0 && !coords) {
        handleSelect(suggestions[0], type);
      }
    }, 0);
  };

  const handleRoute = async () => {
    if (!coordsA || !coordsB || !canRequestRoute) return;
    setLoading(true);
    setRouteNotice("");
    setSelectedRoute(null);
    try {
      const res = await apiFetch("/api/otp/route", {
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
      const data = await res.json() as OtpRouteResponse & { message?: string };
      if (!res.ok) {
        setRouteNotice(data?.message || "Could not find a route right now.");
        return;
      }
      setRouteData(data as OtpRouteResponse);
      const nextItineraries = (data as OtpRouteResponse)?.data?.plan?.itineraries || [];
      if (nextItineraries.length === 0) {
        setRouteNotice("No route found for the selected travel modes.");
        return;
      }
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
    resetRouteState();
  };

  const handleSavedPlaceClick = (place: SavedPlace) => {
    setLocB(place.address);
    if (place.lat && place.lng) {
      setCoordsB({ name: place.address, lat: place.lat, lng: place.lng });
    } else {
      setCoordsB(null);
      setActiveField("B");
    }
    setSuggestionsB([]);
    setRouteData(null);
    setRouteNotice("");
    setSelectedRoute(null);
    setShowMap(false);
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
              <div className="mt-2 text-xs text-white/40">
                Transit routing is available between 6 AM and 11 PM.
              </div>
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
    <>
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 relative">
      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-slate-900 px-10 py-8 border border-slate-700 shadow-2xl">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
            <p className="text-sm text-slate-300">Finding your route...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background-light dark:bg-background-dark border-b border-slate-200 dark:border-slate-800 p-4 pr-36">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Route Planner
            </h1>
          </div>
        </div>
      </header>

      {/* Search panel */}
      <div className="relative z-30 mt-4 px-4 overflow-visible">
        {/* Saved Places row */}
        <div className="mb-3 flex gap-2 overflow-x-auto no-scrollbar mt-2">
          {savedPlaces.map((p) => (
            <div key={p._id} className="relative shrink-0">
              <button
                type="button"
                onClick={() => handleSavedPlaceClick(p)}
                className="flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl pl-4 pr-8 py-2 hover:bg-slate-800 hover:border-zinc-700 transition-all"
              >
                <MapPin size={14} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-zinc-200 whitespace-nowrap">
                  {p.label}
                </span>
              </button>
              <button
                type="button"
                aria-label={`Delete saved place ${p.label}`}
                onClick={(e) => handleDeletePlace(p._id, e)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-red-400 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
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
        <div className="relative z-40 mb-4">
          <input
            value={locA}
            onChange={(e) => handleLocationInputChange(e.target.value, "A")}
            onBlur={() => handleFieldBlur("A")}
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
            onChange={(e) => handleLocationInputChange(e.target.value, "B")}
            onBlur={() => handleFieldBlur("B")}
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

      {routeControls}

      {/* Route option cards */}
      {routeData && itineraries.length > 0 && (
        <section className="relative z-20 px-4 mt-2">
          <div className="mx-auto max-w-xl space-y-2">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {itineraries.map((it: OtpItinerary, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedRoute(index)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all ${
                    selectedRoute === index
                      ? "bg-primary text-white shadow-lg"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  Option {index + 1} - {Math.round(it.duration / 60)} mins
                </button>
              ))}
            </div>

            {selectedRoute !== null && selectedRoute >= 0 && itineraries[selectedRoute] && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                <p className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">
                    {Math.round(itineraries[selectedRoute].duration / 60)} min
                  </span>{" "}
                  route via{" "}
                  <span className="text-slate-200">
                    {itineraries[selectedRoute].legs
                      ?.filter((l) => l.mode !== "WALK")
                      .map((l) => l.route?.shortName || l.mode)
                      .filter(Boolean)
                      .join(", ") || "selected modes"}
                  </span>
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Map layer */}
      <section className="relative z-0 px-4 pb-4 mt-4">
        <div className="relative z-0 w-full h-[40vh] overflow-hidden rounded-xl border border-slate-800 shadow-lg sm:h-[45vh] lg:h-[55vh]">
          <RealMap
            markers={[
              ...(coordsA ? [{ lat: coordsA.lat, lng: coordsA.lng, name: locA }] : []),
              ...(coordsB ? [{ lat: coordsB.lat, lng: coordsB.lng, name: locB }] : []),
            ]}
            routeData={null}
          />
        </div>
      </section>

      {/* Show Route button */}
      {routeData && itineraries.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-30 px-4 pb-2">
          <button
            onClick={() => setShowMap(true)}
            disabled={selectedRoute === null}
            className="w-full bg-primary py-3 rounded-xl font-medium text-white disabled:opacity-40 shadow-lg transition-all enabled:hover:bg-primary/90"
          >
            {selectedRoute !== null
              ? `Show Route - ${Math.round(itineraries[selectedRoute].duration / 60)} mins`
              : "Select a route option"}
          </button>
        </div>
      )}

      {/* Add Place Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4" style={{ zIndex: 10000 }}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm relative">
            <button
              type="button"
              aria-label="Close save place dialog"
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
                  setNewAddrSuggestions([]);
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

      <BottomNav active="travel" />
    </div>

    {/* Full-screen map overlay */}
    {showMap && routeData && selectedRoute !== null && itineraries[selectedRoute] && (
      <div className="fixed inset-0 z-[9999] bg-background-dark flex flex-col">
        <header className="sticky top-0 z-40 bg-background-light dark:bg-background-dark border-b border-slate-200 dark:border-slate-800 p-4">
          <div className="max-w-xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setShowMap(false)}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
              aria-label="Back to route options"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Option {selectedRoute + 1} - {Math.round(itineraries[selectedRoute].duration / 60)} mins
            </h1>
          </div>
        </header>
        <div className="flex-1 relative">
          <RealMap
            markers={[
              ...(coordsA ? [{ lat: coordsA.lat, lng: coordsA.lng, name: locA }] : []),
              ...(coordsB ? [{ lat: coordsB.lat, lng: coordsB.lng, name: locB }] : []),
            ]}
            routeData={routeData}
            selectedIndex={selectedRoute}
          />
        </div>
      </div>
    )}
    </>
  );
};

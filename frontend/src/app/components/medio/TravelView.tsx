import React, { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { RealMap } from "./Map";
import { BottomNav } from "./BottomNav";
import { apiFetch } from "../../lib/api";
import {
  fetchLocationSuggestions,
  type LocationResult,
} from "../../lib/locationSearch";
import type { OtpItinerary, OtpRouteResponse } from "./otpTypes";
import { FloatingButtons } from "./travel/FloatingButtons";
import {
  NearbyPanel,
  type NearbyPlace,
} from "./travel/NearbyPanel";
import {
  TravelBottomSheet,
  type SheetState,
} from "./travel/TravelBottomSheet";
import {
  TravelSearch,
  type LocalTransportMode,
  type SavedPlace,
  type TravelMode,
} from "./travel/TravelSearch";

const defaultLocalTransport: Record<LocalTransportMode, boolean> = {
  bus: true,
  rail: true,
  subway: true,
};

const fetchSavedPlaces = async (): Promise<SavedPlace[]> => {
  try {
    const res = await apiFetch("/api/places", { credentials: "include" });
    if (!res.ok) return [];
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(place),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.place as SavedPlace;
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
  const [localTransport, setLocalTransport] =
    useState<Record<LocalTransportMode, boolean>>(defaultLocalTransport);
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>("collapsed");

  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [debouncedNewAddr, setDebouncedNewAddr] = useState("");
  const [newAddrSuggestions, setNewAddrSuggestions] = useState<LocationResult[]>([]);
  const [newCoords, setNewCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [searchCollapsed, setSearchCollapsed] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyCategory, setNearbyCategory] = useState<string | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);

  useEffect(() => {
    fetchSavedPlaces().then(setSavedPlaces);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedA(locA), 400);
    return () => clearTimeout(timer);
  }, [locA]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedB(locB), 400);
    return () => clearTimeout(timer);
  }, [locB]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedNewAddr(newAddress), 400);
    return () => clearTimeout(timer);
  }, [newAddress]);

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
        if (isCurrent && !controller.signal.aborted) setSuggestionsA([]);
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
        if (isCurrent && !controller.signal.aborted) setSuggestionsB([]);
      });
    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [debouncedB]);

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
        if (isCurrent && !controller.signal.aborted) setNewAddrSuggestions([]);
      });
    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [debouncedNewAddr]);

  const itineraries: OtpItinerary[] = routeData?.data?.plan?.itineraries || [];
  const hasLocalTransportMode = Object.values(localTransport).some(Boolean);
  const canRequestRoute = Boolean(
    coordsA &&
      coordsB &&
      (travelMode !== "local" || hasLocalTransportMode)
  );

  const routeCenter = useMemo(() => {
    if (!coordsA || !coordsB) return coordsA || coordsB;
    return {
      lat: (coordsA.lat + coordsB.lat) / 2,
      lng: (coordsA.lng + coordsB.lng) / 2,
      name: "Route center",
    };
  }, [coordsA, coordsB]);

  const resetRouteState = () => {
    setRouteData(null);
    setRouteNotice("");
    setSelectedRoute(null);
    setSheetState("collapsed");
    setNearbyCategory(null);
    setNearbyPlaces([]);
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
    setSearchCollapsed(false);
    resetRouteState();
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
    setSearchCollapsed(false);
    resetRouteState();
  };

  const handleFieldBlur = (type: "A" | "B") => {
    setTimeout(() => {
      const suggestions = type === "A" ? suggestionsA : suggestionsB;
      const coords = type === "A" ? coordsA : coordsB;
      if (suggestions.length > 0 && !coords) handleSelect(suggestions[0], type);
    }, 0);
  };

  const updateTravelMode = (mode: TravelMode) => {
    setTravelMode(mode);
    setSearchCollapsed(false);
    resetRouteState();
  };

  const updateLocalTransport = (mode: LocalTransportMode, checked: boolean) => {
    setLocalTransport((current) => ({ ...current, [mode]: checked }));
    setSearchCollapsed(false);
    resetRouteState();
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
      const data = (await res.json()) as OtpRouteResponse & { message?: string };
      if (!res.ok) {
        setRouteNotice(data?.message || "Could not find a route right now.");
        return;
      }
      const nextItineraries = data?.data?.plan?.itineraries || [];
      setRouteData(data);
      if (nextItineraries.length === 0) {
        setRouteNotice("No route found for the selected travel modes.");
        return;
      }
      setSelectedRoute(0);
      setSheetState("half");
      setSearchCollapsed(true);
    } catch {
      setRouteNotice("Could not find a route right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleSavedPlaceClick = (place: SavedPlace) => {
    setLocB(place.address);
    setCoordsB(
      place.lat && place.lng
        ? { name: place.address, lat: place.lat, lng: place.lng }
        : null
    );
    setActiveField(place.lat && place.lng ? null : "B");
    setSuggestionsB([]);
    resetRouteState();
  };

  const handleDeletePlace = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const deleted = await deletePlaceFromBackend(id);
    if (deleted) setSavedPlaces((places) => places.filter((place) => place._id !== id));
  };

  const handleAddPlace = async () => {
    if (!newLabel || !newAddress) return;
    const created = await savePlaceToBackend({
      label: newLabel,
      address: newAddress,
      lat: newCoords?.lat,
      lng: newCoords?.lng,
    });
    if (created) setSavedPlaces((places) => [created, ...places]);
    setNewLabel("");
    setNewAddress("");
    setNewCoords(null);
    setNewAddrSuggestions([]);
    setShowAddModal(false);
  };

  const handleLocate = () => {
    navigator.geolocation?.getCurrentPosition((position) => {
      setCurrentLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    });
  };

  const handleNearbyPlacesChange = useCallback((places: NearbyPlace[]) => {
    setNearbyPlaces(places);
  }, []);

  const mapMarkers = [
    ...(coordsA
      ? [{ lat: coordsA.lat, lng: coordsA.lng, name: locA || "Origin", color: "green", kind: "origin" as const }]
      : []),
    ...(coordsB
      ? [{ lat: coordsB.lat, lng: coordsB.lng, name: locB || "Destination", color: "red", kind: "destination" as const }]
      : []),
    ...nearbyPlaces.map((place) => ({
      lat: place.lat,
      lng: place.lng,
      name: place.name,
      color: "#64748b",
      kind: "nearby" as const,
    })),
  ];

  return (
    <div className="relative h-screen overflow-hidden bg-background-dark text-slate-100">
      {loading && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-700 bg-background-dark px-10 py-8 shadow-2xl">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
            <p className="text-sm font-semibold text-slate-300">Finding your route...</p>
          </div>
        </div>
      )}

      <div className="absolute inset-0">
        <RealMap
          lat={routeCenter?.lat}
          lng={routeCenter?.lng}
          zoom={coordsA || coordsB ? 13 : 12}
          markers={mapMarkers}
          routeData={routeData}
          selectedIndex={selectedRoute ?? 0}
          currentLocation={currentLocation}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[520] h-44 bg-gradient-to-b from-background-dark/88 to-transparent" />

      <TravelSearch
        locA={locA}
        locB={locB}
        coordsA={coordsA}
        coordsB={coordsB}
        suggestionsA={suggestionsA}
        suggestionsB={suggestionsB}
        activeField={activeField}
        savedPlaces={savedPlaces}
        travelMode={travelMode}
        localTransport={localTransport}
        loading={loading}
        canRequestRoute={canRequestRoute}
        routeNotice={routeNotice}
        onInputChange={handleLocationInputChange}
        onFieldBlur={handleFieldBlur}
        onSelect={handleSelect}
        onSavedPlaceClick={handleSavedPlaceClick}
        onDeleteSavedPlace={handleDeletePlace}
        onAddPlace={() => setShowAddModal(true)}
        onTravelModeChange={updateTravelMode}
        onLocalTransportChange={updateLocalTransport}
        onRoute={handleRoute}
        collapsed={searchCollapsed}
        onToggleCollapsed={() => setSearchCollapsed(false)}
      />

      <FloatingButtons
        nearbyOpen={Boolean(nearbyCategory)}
        onLocate={handleLocate}
        onExplore={() => {
          setSheetState("full");
          setNearbyCategory((category) => category || "cafes");
        }}
        onToggleSheet={() => setSheetState((state) => (state === "collapsed" ? "half" : "collapsed"))}
      />

      <TravelBottomSheet
        state={sheetState}
        itineraries={itineraries}
        selectedIndex={selectedRoute}
        onStateChange={setSheetState}
        onSelectRoute={(index) => {
          setSelectedRoute(index);
          setSheetState((state) => (state === "collapsed" ? "half" : state));
        }}
        nearbyContent={
          <NearbyPanel
            center={routeCenter}
            selectedCategory={nearbyCategory}
            onCategoryChange={setNearbyCategory}
            onPlacesChange={handleNearbyPlacesChange}
          />
        }
      />

      {showAddModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-2xl">
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
              className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-900 hover:text-white"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-black">Save a place</h3>
            <div className="mt-4 grid gap-3">
              <input
                value={newLabel}
                onChange={(event) => setNewLabel(event.target.value)}
                placeholder="Label"
                className="min-h-12 rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
              />
              <div className="relative">
                <input
                  value={newAddress}
                  onChange={(event) => {
                    setNewAddress(event.target.value);
                    setNewCoords(null);
                    setNewAddrSuggestions([]);
                  }}
                  placeholder="Search address"
                  className="min-h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
                />
                {newAddrSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-48 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
                    {newAddrSuggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.name}-${suggestion.lat}`}
                        type="button"
                        onClick={() => {
                          setNewAddress(suggestion.name);
                          setNewCoords({ lat: suggestion.lat, lng: suggestion.lng });
                          setNewAddrSuggestions([]);
                        }}
                        className="block w-full px-4 py-3 text-left text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
                      >
                        {suggestion.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddPlace}
                disabled={!newLabel || !newAddress}
                className="min-h-12 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white transition hover:bg-primary/90 disabled:opacity-45"
              >
                Save place
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="travel" />
    </div>
  );
};

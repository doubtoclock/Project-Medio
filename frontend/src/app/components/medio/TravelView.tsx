import React, { useCallback, useEffect, useMemo, useState } from "react";
import { X, Navigation } from "lucide-react";
import { RealMap } from "./Map";
import { BottomNav } from "./BottomNav";
import { apiClient } from "../../lib/apiClient";
import {
  fetchLocationSuggestions,
  type LocationResult,
} from "../../lib/locationSearch";
import type { OtpItinerary, OtpRouteResponse } from "./otpTypes";
import { Button } from "../design/Button";
import { Input } from "../design/Input";
import { Loading } from "../design/Loading";
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
    const data = await apiClient.places.list();
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
    const data = await apiClient.places.create(place);
    return data.place as SavedPlace;
  } catch {
    return null;
  }
};

const deletePlaceFromBackend = async (id: string) => {
  try {
    await apiClient.places.delete(id);
    return true;
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
      const result = await apiClient.route.plan({
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
      });
      const data = result as OtpRouteResponse & { message?: string };
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
      place.lat != null && place.lng != null
        ? { name: place.address, lat: place.lat, lng: place.lng }
        : null
    );
    setActiveField(place.lat != null && place.lng != null ? null : "B");
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

  const mapMarkers = useMemo(() => [
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
  ], [coordsA, coordsB, locA, locB, nearbyPlaces]);

  return (
    <div
      className="relative h-dvh overflow-hidden"
      style={{ backgroundColor: "var(--ds-bg-primary)" }}
    >
      <style>{`
        @keyframes travel-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .travel-enter {
          animation: travel-fade-up 0.4s var(--ds-ease-out) both;
        }
      `}</style>

      {loading && (
        <div
          className="fixed inset-0 z-[var(--ds-z-modal)] flex items-center justify-center"
          style={{
            backgroundColor: "var(--ds-overlay)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            className="ds-glass-strong flex flex-col items-center gap-5 px-10 py-9 rounded-[var(--ds-radius-2xl)]"
            style={{ boxShadow: "var(--ds-shadow-2xl)" }}
          >
            <Loading size="lg" />
            <div className="flex flex-col items-center gap-1">
              <p
                className="text-sm font-[var(--ds-weight-medium)]"
                style={{ color: "var(--ds-text-primary)" }}
              >
                Finding your route...
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--ds-text-tertiary)" }}
              >
                Calculating directions and travel times
              </p>
            </div>
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

      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-44"
        style={{
          background: "linear-gradient(180deg, var(--ds-bg-primary) 0%, var(--ds-bg-primary) 40%, transparent 100%)",
        }}
      />

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
        <div
          className="fixed inset-0 z-[var(--ds-z-modal)] flex items-center justify-center p-4"
          style={{ backgroundColor: "var(--ds-overlay)", backdropFilter: "blur(8px)" }}
          role="dialog"
          aria-modal="true"
          aria-label="Save a place"
        >
          <div
            className="travel-enter relative w-full max-w-sm rounded-[var(--ds-radius-2xl)] overflow-hidden"
            style={{
              backgroundColor: "var(--ds-bg-secondary)",
              border: "1px solid var(--ds-border-primary)",
              boxShadow: "var(--ds-shadow-2xl)",
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-24 opacity-[0.06] pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at 50% 0%, var(--ds-accent) 0%, transparent 70%)",
              }}
            />

            <div className="relative z-10 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-lg font-[var(--ds-weight-bold)]"
                  style={{ color: "var(--ds-text-primary)" }}
                >
                  Save a place
                </h3>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewLabel("");
                    setNewAddress("");
                    setNewCoords(null);
                    setNewAddrSuggestions([]);
                  }}
                  className="size-9 rounded-[var(--ds-radius-lg)] flex items-center justify-center transition-colors"
                  style={{ color: "var(--ds-text-tertiary)" }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Label (e.g. Home, Office)"
                  label="Label"
                />

                <div className="relative">
                  <Input
                    value={newAddress}
                    onChange={(e) => {
                      setNewAddress(e.target.value);
                      setNewCoords(null);
                      setNewAddrSuggestions([]);
                    }}
                    placeholder="Search address"
                    label="Address"
                  />
                  {newAddrSuggestions.length > 0 && (
                    <div
                      className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-[var(--ds-radius-lg)]"
                      style={{
                        backgroundColor: "var(--ds-bg-secondary)",
                        border: "1px solid var(--ds-border-primary)",
                        boxShadow: "var(--ds-shadow-lg)",
                      }}
                    >
                      {newAddrSuggestions.map((suggestion) => (
                        <button
                          key={`${suggestion.name}-${suggestion.lat}`}
                          type="button"
                          onClick={() => {
                            setNewAddress(suggestion.name);
                            setNewCoords({ lat: suggestion.lat, lng: suggestion.lng });
                            setNewAddrSuggestions([]);
                          }}
                          className="block w-full px-4 py-2.5 text-left text-sm transition-colors"
                          style={{ color: "var(--ds-text-primary)" }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--ds-bg-hover)"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        >
                          {suggestion.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleAddPlace}
                  disabled={!newLabel || !newAddress}
                  className="mt-1"
                >
                  <Navigation size={16} />
                  Save place
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="travel" />
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { RealMap } from "./Map";
import { Plus, MapPin, X } from "lucide-react";
import { Link } from "react-router-dom";

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

const fetchLocationSuggestions = async (query: string) => {
  try {
    const res = await fetch(
      `http://localhost:5001/api/search?q=${encodeURIComponent(query)}`
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
};

const fetchSavedPlaces = async (): Promise<SavedPlace[]> => {
  try {
    const res = await fetch("http://localhost:5001/api/places", {
      credentials: "include",
    });
    if (!res.ok) {
      console.error("Fetch places failed:", res.status, res.statusText);
      return [];
    }
    const data = await res.json();
    return data.places || [];
  } catch (err) {
    console.error("Fetch places error:", err);
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
    const res = await fetch("http://localhost:5001/api/places", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(place),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      console.error("Save place failed:", res.status, res.statusText, errorData);
      return null;
    }
    const data = await res.json();
    return data.place;
  } catch (err) {
    console.error("Save place network error:", err);
    return null;
  }
};

const deletePlaceFromBackend = async (id: string) => {
  try {
    const res = await fetch(`http://localhost:5001/api/places/${id}`, {
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

  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
      console.log("Fetched saved places:", places);
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

  const handleRoute = async () => {
    if (!coordsA || !coordsB) return;
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5001/api/otp/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: { lat: coordsA.lat, lng: coordsA.lng },
          to: { lat: coordsB.lat, lng: coordsB.lng },
        }),
      });
      const data = await res.json();
      console.log("FULL RESPONSE:", data);
      setRouteData(data);
      setIsSearchCollapsed(true);
    } catch (err) {
      console.error("Route error:", err);
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
    setIsSearchCollapsed(false);
  };

  const handleAddPlace = async () => {
    if (!newLabel || !newAddress) return;
    console.log("Saving place:", newLabel, newAddress);
    const created = await savePlaceToBackend({
      label: newLabel,
      address: newAddress,
      lat: newCoords?.lat,
      lng: newCoords?.lng,
    });
    console.log("Created:", created);
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

  const itineraries = routeData?.data?.plan?.itineraries || [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itinerary = itineraries[selectedIndex];

  const steps = itinerary?.legs?.map((leg: any) => ({
    mode: leg.mode,
    from: leg.from?.name,
    to: leg.to?.name,
    routeName: leg.route?.shortName || leg.route?.longName,
    duration: Math.round((leg.endTime - leg.startTime) / 60000),
  }));

  return (
   <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 relative">
      {/* HEADER — PLACE IT HERE */}
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
              className="px-4 mt-4"
              style={{ zIndex: 30 }}
            >

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
          <div className="relative mb-4">
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
              <div className="absolute top-full left-0 right-0 bg-slate-800 rounded-xl mt-2 shadow-lg z-20">
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
          <div className="relative mb-6">
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
              <div className="absolute top-full left-0 right-0 bg-slate-800 rounded-xl mt-2 shadow-lg z-20">
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

          {/* Find Route */}
          {coordsA && coordsB && (
            <button
              onClick={handleRoute}
              className="w-full bg-primary py-3 rounded-xl font-medium disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Finding Route..." : "Find Route"}
            </button>
          )}
        </div>
      )}
      {/* Map layer */}
        <section className="px-4 pb-24">
          <div className="w-full h-[40vh] sm:h-[45vh] lg:h-[55vh] overflow-hidden rounded-xl border border-slate-800 shadow-lg">

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
        <div className="fixed top-24 left-0 right-0 px-4" style={{ zIndex: 9998 }}>
          <div className="flex gap-2 overflow-x-auto">
            {itineraries.map((it: any, index: number) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${
                  selectedIndex === index ? "bg-primary" : "bg-slate-800"
                }`}
              >
                Option {index + 1} · {Math.round(it.duration / 60)} mins
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Sheet */}
      {itinerary && (
        <div
          className={`fixed bottom-0 left-0 right-0 bg-background-dark rounded-t-3xl shadow-2xl border-t border-slate-800 transition-all duration-300 ${
            isExpanded ? "h-[55vh]" : "h-[90px]"
          }`}
          style={{ zIndex: 9998 }}
        >
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-4 cursor-pointer flex flex-col items-center"
          >
            <div className="w-12 h-1 bg-zinc-600 rounded-full mb-3" />
            <div className="text-sm font-medium text-zinc-300">
              {isExpanded
                ? "Swipe down to collapse"
                : `Route · ${Math.round(itinerary.duration / 60)} mins (Tap to expand)`}
            </div>
          </div>

          {isExpanded && (
            <div className="px-4 pb-24 overflow-y-auto h-[calc(75vh-100px)]">
              {steps?.map((step: any, index: number) => (
                <div
                  key={index}
                  className="bg-slate-900 p-4 rounded-xl text-sm border border-slate-800 mb-3"
                >
                  <div className="font-medium">
                    {step.mode === "WALK" && "🚶 Walk"}
                    {step.mode === "SUBWAY" && "🚇 Metro"}
                    {step.mode === "BUS" && "🚌 Bus"}
                  </div>
                  {step.routeName && step.mode !== "WALK" && (
                    <div className="text-emerald-400 text-sm mt-1">
                      Line: {step.routeName}
                    </div>
                  )}
                  <div className="mt-1 text-slate-400">
                    From{" "}
                    <span className="text-white font-medium">{step.from}</span>{" "}
                    to{" "}
                    <span className="text-white font-medium">{step.to}</span>
                  </div>
                  <div className="mt-1 text-emerald-400">~ {step.duration} mins</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

        <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center bg-slate-900/80 backdrop-blur-xl border-t border-slate-800 px-6 py-3">

          <Link to="/meet" className="flex flex-1 flex-col items-center text-slate-400">
            <span className="material-symbols-outlined">map</span>
            <span className="text-[10px]">Meet</span>
          </Link>

          <Link to="/travel" className="flex flex-1 flex-col items-center text-primary">
            <span className="material-symbols-outlined">commute</span>
            <span className="text-[10px] font-bold">Travel</span>
          </Link>

          <Link to="/guide" className="flex flex-1 flex-col items-center text-slate-400">
            <span className="material-symbols-outlined">explore</span>
            <span className="text-[10px]">Guide</span>
          </Link>

          <Link to="/profile" className="flex flex-1 flex-col items-center text-slate-400">
            <span className="material-symbols-outlined">person</span>
            <span className="text-[10px]">Profile</span>
          </Link>

        </nav>
    </div>
  );
};
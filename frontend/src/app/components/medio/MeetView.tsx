import React, { useState, useEffect } from "react";
import { MapPin, X } from "lucide-react";
import { Header } from "./Header";
import { RealMap } from "./Map";

interface LocationResult {
  name: string;
  lat: number;
  lng: number;
}

// Fetch search suggestions
const fetchLocationSuggestions = async (query: string) => {
  try {
    const response = await fetch(
      `http://localhost:5001/api/search?q=${encodeURIComponent(query)}`
    );
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
};

export const MeetView: React.FC = () => {
  const [locA, setLocA] = useState("");
  const [locB, setLocB] = useState("");
  const [debouncedA, setDebouncedA] = useState("");
  const [debouncedB, setDebouncedB] = useState("");

  const [coordsA, setCoordsA] = useState<LocationResult | null>(null);
  const [coordsB, setCoordsB] = useState<LocationResult | null>(null);

  const [activeField, setActiveField] = useState<"A" | "B" | null>(null);

  const [suggestionsA, setSuggestionsA] = useState<LocationResult[]>([]);
  const [suggestionsB, setSuggestionsB] = useState<LocationResult[]>([]);

  const [meetResults, setMeetResults] = useState<any[]>([]);
  const [selectedMeet, setSelectedMeet] = useState<any | null>(null);
  const [loadingMeet, setLoadingMeet] = useState(false);

  // Debounce A
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedA(locA), 400);
    return () => clearTimeout(timer);
  }, [locA]);

  // Debounce B
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedB(locB), 400);
    return () => clearTimeout(timer);
  }, [locB]);

  // Fetch suggestions
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

  const handleSelectLocation = (location: LocationResult, type: "A" | "B") => {
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

  const handleFindMeetingPoint = async () => {
    if (!coordsA || !coordsB) return;

    setLoadingMeet(true);
    setMeetResults([]);
    setSelectedMeet(null);

    const response = await fetch("http://localhost:5001/api/meet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latA: coordsA.lat,
        lonA: coordsA.lng,
        latB: coordsB.lat,
        lonB: coordsB.lng,
        minutes: 40,
      }),
    });

    const data = await response.json();
    setMeetResults(data);

    if (data.length > 0) setSelectedMeet(data[0]);

    setLoadingMeet(false);
  };

  const clearLocation = (type: "A" | "B") => {
    if (type === "A") {
      setLocA("");
      setCoordsA(null);
      setSuggestionsA([]);
    } else {
      setLocB("");
      setCoordsB(null);
      setSuggestionsB([]);
    }
  };

  return (
    <div className="relative min-h-screen bg-background-dark text-slate-100">

      <Header />

      {/* MAP */}
      <div className="absolute inset-0 z-0">
        <RealMap
          markers={[
            ...(coordsA
              ? [{ lat: coordsA.lat, lng: coordsA.lng, name: locA, color: "green" }]
              : []),
            ...(coordsB
              ? [{ lat: coordsB.lat, lng: coordsB.lng, name: locB, color: "red" }]
              : []),
            ...meetResults.map((place) => ({
              lat: place.lat,
              lng: place.lon,
              name: place.name,
              color: selectedMeet?.id === place.id ? "yellow" : "blue",
            })),
          ]}
        />
      </div>

      {/* SEARCH PANEL */}
      <div className="absolute top-[80px] left-0 right-0 px-4 z-40">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">

          {/* LOCATION A */}
          <div className="relative">
            <label className="text-xs text-slate-400 mb-1 block">
              Your Location
            </label>

            <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-3 border border-slate-700">
              <MapPin size={16} className="text-primary" />

              <input
                value={locA}
                onChange={(e) => {
                  setLocA(e.target.value);
                  setActiveField("A");
                }}
                placeholder="Search location..."
                className="bg-transparent flex-1 outline-none text-sm"
              />

              {locA && (
                <X
                  size={16}
                  className="cursor-pointer"
                  onClick={() => clearLocation("A")}
                />
              )}
            </div>

            {activeField === "A" && suggestionsA.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                {suggestionsA.map((location) => (
                  <button
                    key={`${location.name}-${location.lat}`}
                    onClick={() => handleSelectLocation(location, "A")}
                    className="w-full text-left px-4 py-3 hover:bg-slate-700"
                  >
                    {location.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* LOCATION B */}
          <div className="relative">
            <label className="text-xs text-slate-400 mb-1 block">
              Friend's Location
            </label>

            <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-3 border border-slate-700">
              <MapPin size={16} className="text-indigo-400" />

              <input
                value={locB}
                onChange={(e) => {
                  setLocB(e.target.value);
                  setActiveField("B");
                }}
                placeholder="Search location..."
                className="bg-transparent flex-1 outline-none text-sm"
              />

              {locB && (
                <X
                  size={16}
                  className="cursor-pointer"
                  onClick={() => clearLocation("B")}
                />
              )}
            </div>

            {activeField === "B" && suggestionsB.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                {suggestionsB.map((location) => (
                  <button
                    key={`${location.name}-${location.lat}`}
                    onClick={() => handleSelectLocation(location, "B")}
                    className="w-full text-left px-4 py-3 hover:bg-slate-700"
                  >
                    {location.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* FIND BUTTON */}
          {coordsA && coordsB && (
            <button
              onClick={handleFindMeetingPoint}
              className="w-full bg-primary hover:bg-primary/90 py-3 rounded-xl font-semibold"
            >
              Find Meeting Point
            </button>
          )}

          {loadingMeet && (
            <p className="text-sm text-slate-400">
              Calculating optimal meeting spots...
            </p>
          )}
        </div>
      </div>

      {/* RESULT CARDS */}
      {meetResults.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 max-h-[40vh] overflow-y-auto px-4 pb-32 space-y-3">

          <h3 className="text-xs uppercase tracking-widest text-slate-400">
            Optimized Meeting Points
          </h3>

          {meetResults.map((place, index) => (
            <div
              key={place.id}
              onClick={() => setSelectedMeet(place)}
              className={`p-4 rounded-xl border cursor-pointer ${
                selectedMeet?.id === place.id
                  ? "bg-primary/20 border-primary"
                  : "bg-slate-900 border-slate-800"
              }`}
            >
              <div className="font-semibold">
                {index === 0 && "⭐ "} {place.name}
              </div>

              <div className="text-xs text-slate-400 mt-1">
                You: {place.travelTimeA} min • Friend: {place.travelTimeB} min
              </div>

              <div className="text-xs text-slate-500">
                Difference: {place.difference} min
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


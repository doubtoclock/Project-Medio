import React, { useState, useEffect } from "react";
import { RealMap } from "./Map";
import { Header } from "./Header";

interface LocationResult {
  name: string;
  lat: number;
  lng: number;
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: { lat: coordsA.lat, lng: coordsA.lng },
          to: { lat: coordsB.lat, lng: coordsB.lng },
        }),
      });

      const data = await res.json();
      //console.log("OTP route result:", data);
      console.log("FULL RESPONSE:", data);
      console.log("PLAN DIRECT:", data.plan);
      console.log("PLAN IN DATA:", data.data?.plan);

      setRouteData(data);
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

  return (
    <div className="h-screen bg-zinc-950 text-white relative overflow-hidden">
      <Header />

      <div className="absolute inset-0 -z-0">
        <RealMap
          markers={[
            ...(coordsA
              ? [{ lat: coordsA.lat, lng: coordsA.lng, name: locA }]
              : []),
            ...(coordsB
              ? [{ lat: coordsB.lat, lng: coordsB.lng, name: locB }]
              : []),
          ]}
          routeData={routeData}
        />
      </div>

      <div className="absolute inset-0 pt-24 px-4 pb-24 overflow-y-auto no-scrollbar">

        {/* From */}
        <div className="relative mb-4">
          <input
            value={locA}
            onChange={(e) => {
              setLocA(e.target.value);
              setActiveField("A");
            }}
            placeholder="From..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
          />

          {activeField === "A" && suggestionsA.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-zinc-800 rounded-xl mt-2 shadow-lg">
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
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
          />

          {activeField === "B" && suggestionsB.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-zinc-800 rounded-xl mt-2 shadow-lg">
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

        {coordsA && coordsB && (
          <button
            onClick={handleRoute}
            className="w-full bg-emerald-600 py-3 rounded-xl font-medium disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Finding Route..." : "Find Route"}
          </button>
        )}
      </div>
    </div>
  );
};
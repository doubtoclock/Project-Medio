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

  const [isExpanded, setIsExpanded] = useState(true);

  const [isSearchCollapsed, setIsSearchCollapsed] = useState(false);



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
            selectedIndex={selectedIndex}  // 🔥 REQUIRED
          />
        </div>

        {isSearchCollapsed && (
              <button
                onClick={() => {
                  setIsSearchCollapsed(false);
                  setIsExpanded(false);
                }}
                className="absolute top-20 right-4 bg-emerald-600 px-4 py-2 rounded-full shadow-lg z-50"
              >
                Edit Route
              </button>
            )}

        {!isSearchCollapsed && (
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

            {/* Find Route Button */}
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
        )}

{/* Itinerary Selector (Only if route exists) */}
{isSearchCollapsed && itineraries.length > 1 && (

  <div className="fixed top-24 left-0 right-0 px-4 z-40">
    <div className="flex gap-2 overflow-x-auto">
      {itineraries.map((it: any, index: number) => (
        <button
          key={index}
          onClick={() => setSelectedIndex(index)}
          className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${
            selectedIndex === index
              ? "bg-emerald-600"
              : "bg-zinc-800"
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
    className={`fixed bottom-0 left-0 right-0 bg-zinc-950 rounded-t-3xl shadow-2xl border-t border-zinc-800 transition-all duration-300 ${
      isExpanded ? "h-[75vh]" : "h-[90px]"
    }`}
  >
    {/* Header / Handle */}
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

    {/* Expandable Content */}
    {isExpanded && (
      <div className="px-4 pb-24 overflow-y-auto h-[calc(75vh-100px)]">
        {steps?.map((step: any, index: number) => (
          <div
            key={index}
            className="bg-zinc-900 p-4 rounded-xl text-sm border border-zinc-800 mb-3"
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

            <div className="mt-1 text-zinc-400">
              From{" "}
              <span className="text-white font-medium">{step.from}</span>{" "}
              to{" "}
              <span className="text-white font-medium">{step.to}</span>
            </div>

            <div className="mt-1 text-emerald-400">
              ~ {step.duration} mins
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
    </div>
  );
}
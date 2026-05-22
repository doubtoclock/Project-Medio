import React, { useState, useEffect, useMemo } from "react";
import { Clock, MapPin, Route, Star, X } from "lucide-react";
import { RealMap } from "./Map";
import { BottomNav } from "./BottomNav";
import { getBackendUrl } from "../../lib/backend";


interface LocationResult {
  name: string;
  lat: number;
  lng: number;
}

interface MeetResult {
  id: number;
  name: string;
  lat: number;
  lon: number;
  category?: string;
  travelTimeA: number;
  travelTimeB: number;
  difference: number;
  average: number;
  maxTravelTime?: number;
  score?: number;
  reason?: string;
}

type RouteSide = "A" | "B";

const CATEGORY_ORDER = [
  "Cafe",
  "Restaurant",
  "Food court",
  "Mall",
  "Park",
  "Garden",
  "Cinema",
  "Theatre",
  "Museum",
  "Gallery",
  "Library",
  "Bar",
  "Dessert",
  "Quick bite",
  "Bookstore",
  "Market",
  "Arts center",
  "Community center",
  "Bowling",
  "Sports",
  "Beach",
  "Hotel",
  "Attraction",
  "Campus",
  "Place",
];

const getMeetCategory = (place: MeetResult) => place.category || "Place";

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

  const [meetResults, setMeetResults] = useState<MeetResult[]>([]);
  const [selectedMeet, setSelectedMeet] = useState<MeetResult | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loadingMeet, setLoadingMeet] = useState(false);
  const [routeSide, setRouteSide] = useState<RouteSide>("A");
  const [routeCache, setRouteCache] = useState<Record<string, any>>({});
  const [loadingRouteKey, setLoadingRouteKey] = useState<string | null>(null);
  const [routeError, setRouteError] = useState("");
  const [meetNotice, setMeetNotice] = useState("");
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedA(locA), 400);
    return () => clearTimeout(timer);
  }, [locA]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedB(locB), 400);
    return () => clearTimeout(timer);
  }, [locB]);

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
    setSelectedCategories([]);
    setRouteCache({});
    setRouteError("");
    setMeetNotice("");
    setSelectedRouteIndex(0);

    try {
      const res = await fetch(`${getBackendUrl()}/api/meet`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latA: coordsA.lat,
          lonA: coordsA.lng,
          latB: coordsB.lat,
          lonB: coordsB.lng,
          minutes: 40,
          fromName: locA,
          toName: locB,
        }),
      });

      const data = await res.json();
      const results = Array.isArray(data) ? data.slice(0, 12) : [];

      if (!res.ok) {
        setMeetNotice("Could not finish the meeting spot search right now.");
        return;
      }

      setMeetResults(results);
      setSelectedMeet(results[0] ?? null);

      if (results.length === 0) {
        setMeetNotice(
          "No named meeting spots were found after expanding the search."
        );
      }
    } catch {
      setMeetNotice("Could not finish the meeting spot search right now.");
    } finally {
      setLoadingMeet(false);
    }
  };

  const getRouteKey = (side: RouteSide, place: MeetResult) =>
    `${side}-${place.id}`;

  const fetchMeetRoute = async (side: RouteSide, place: MeetResult) => {
    const from = side === "A" ? coordsA : coordsB;
    const fromName = side === "A" ? locA : locB;
    if (!from) return;

    const routeKey = getRouteKey(side, place);
    setRouteError("");
    if (routeCache[routeKey]) return;

    setLoadingRouteKey(routeKey);

    try {
      const res = await fetch(`${getBackendUrl()}/api/otp/route`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: { lat: from.lat, lng: from.lng },
          to: { lat: place.lat, lng: place.lon },
          fromName,
          toName: place.name,
        }),
      });

      const data = await res.json();
      const itineraries = data?.data?.plan?.itineraries || [];

      if (!res.ok || itineraries.length === 0) {
        setRouteError("No public transport route found for this side.");
        return;
      }

      setRouteCache((prev) => ({
        ...prev,
        [routeKey]: data,
      }));
    } catch {
      setRouteError("Could not load the route right now.");
    } finally {
      setLoadingRouteKey((current) => (
        current === routeKey ? null : current
      ));
    }
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

  const categoryCounts = useMemo(() => {
    return meetResults.reduce<Record<string, number>>((counts, place) => {
      const category = getMeetCategory(place);
      counts[category] = (counts[category] ?? 0) + 1;
      return counts;
    }, {});
  }, [meetResults]);

  const availableCategories = useMemo(() => {
    const categories = Object.keys(categoryCounts);
    return categories.sort((left, right) => {
      const leftIndex = CATEGORY_ORDER.indexOf(left);
      const rightIndex = CATEGORY_ORDER.indexOf(right);
      const normalizedLeftIndex =
        leftIndex === -1 ? CATEGORY_ORDER.length : leftIndex;
      const normalizedRightIndex =
        rightIndex === -1 ? CATEGORY_ORDER.length : rightIndex;

      if (normalizedLeftIndex !== normalizedRightIndex) {
        return normalizedLeftIndex - normalizedRightIndex;
      }

      return left.localeCompare(right);
    });
  }, [categoryCounts]);

  const filteredMeetResults = useMemo(() => {
    if (selectedCategories.length === 0) return meetResults;

    const selected = new Set(selectedCategories);
    return meetResults.filter((place) => selected.has(getMeetCategory(place)));
  }, [meetResults, selectedCategories]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  };

  const activeRouteKey = selectedMeet
    ? getRouteKey(routeSide, selectedMeet)
    : "";
  const routeData = activeRouteKey ? routeCache[activeRouteKey] : null;
  const itineraries = routeData?.data?.plan?.itineraries || [];
  const selectedItinerary = itineraries[selectedRouteIndex];
  const routeSteps = selectedItinerary?.legs?.map((leg: any) => ({
    mode: leg.mode,
    from: leg.from?.name,
    to: leg.to?.name,
    routeName: leg.route?.shortName || leg.route?.longName,
    duration: Math.round((leg.endTime - leg.startTime) / 60000),
  }));

  useEffect(() => {
    setSelectedRouteIndex(0);
  }, [activeRouteKey]);

  useEffect(() => {
    setRouteError("");
  }, [selectedMeet, routeSide]);

  useEffect(() => {
    if (!selectedMeet) {
      if (filteredMeetResults.length > 0) {
        setSelectedMeet(filteredMeetResults[0]);
      }
      return;
    }

    if (filteredMeetResults.some((place) => place.id === selectedMeet.id)) {
      return;
    }

    setSelectedMeet(filteredMeetResults[0] ?? null);
  }, [filteredMeetResults, selectedMeet]);

  return (
    <div className="relative flex min-h-screen flex-col bg-background-dark text-slate-100">

      {/* HEADER */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-4 backdrop-blur-md bg-background-dark/80 border-b border-slate-800">
        <div className="flex size-10 items-center justify-center rounded-full bg-slate-800">
          <span className="material-symbols-outlined">menu</span>
        </div>

        <h1 className="text-lg font-bold">Medio Meet</h1>

        <button className="relative flex items-center justify-center rounded-full">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-primary"></span>
        </button>
      </header>

      {/* LOCATION INPUTS */}
      <section className="relative z-30 flex flex-col gap-3 bg-slate-900/40 px-4 py-6 overflow-visible">

        {/* LOCATION A */}
        <div className="relative z-40">
          <div className="flex items-center bg-slate-800 rounded-xl px-3 py-3 border border-slate-700">
            <MapPin size={16} className="text-primary mr-2" />
            <input
              value={locA}
              onChange={(e) => {
                setLocA(e.target.value);
                setActiveField("A");
              }}
              placeholder="Location A"
              className="bg-transparent flex-1 outline-none text-sm"
            />
            {locA && (
              <button
                type="button"
                aria-label="Clear location A"
                onClick={() => clearLocation("A")}
                className="inline-flex items-center justify-center"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {activeField === "A" && suggestionsA.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 shadow-2xl">
              {suggestionsA.map((s) => (
                <button
                  key={s.name}
                  onClick={() => handleSelectLocation(s, "A")}
                  className="block w-full text-left px-4 py-3 hover:bg-slate-700"
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* LOCATION B */}
        <div className="relative z-30">
          <div className="flex items-center bg-slate-800 rounded-xl px-3 py-3 border border-slate-700">
            <MapPin size={16} className="text-indigo-400 mr-2" />
            <input
              value={locB}
              onChange={(e) => {
                setLocB(e.target.value);
                setActiveField("B");
              }}
              placeholder="Location B"
              className="bg-transparent flex-1 outline-none text-sm"
            />
            {locB && (
              <button
                type="button"
                aria-label="Clear location B"
                onClick={() => clearLocation("B")}
                className="inline-flex items-center justify-center"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {activeField === "B" && suggestionsB.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 shadow-2xl">
              {suggestionsB.map((s) => (
                <button
                  key={s.name}
                  onClick={() => handleSelectLocation(s, "B")}
                  className="block w-full text-left px-4 py-3 hover:bg-slate-700"
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {coordsA && coordsB && (
          <button
            onClick={handleFindMeetingPoint}
            className="w-full bg-primary py-3 rounded-xl font-semibold hover:bg-primary/90"
          >
            Find Meeting Point
          </button>
        )}

        {loadingMeet && (
          <p className="text-sm text-slate-400">
            Finding best meeting spots...
          </p>
        )}

        {!loadingMeet && meetNotice && (
          <p className="text-sm text-slate-400">{meetNotice}</p>
        )}
      </section>

      {/* MAP */}
      <section className="relative z-0 px-4 pb-24">
        <div className="relative z-0 w-full h-[40vh] overflow-hidden rounded-xl border border-slate-800 shadow-lg sm:h-[45vh] lg:h-[55vh]">
          <RealMap
            markers={[
              ...(coordsA
                ? [{ lat: coordsA.lat, lng: coordsA.lng, name: locA, color: "green" }]
                : []),
              ...(coordsB
                ? [{ lat: coordsB.lat, lng: coordsB.lng, name: locB, color: "red" }]
                : []),
              ...filteredMeetResults.map((p) => ({
                lat: p.lat,
                lng: p.lon,
                name: p.name,
                color: selectedMeet?.id === p.id ? "yellow" : "blue",
              })),
            ]}
            routeData={routeData}
            selectedIndex={selectedRouteIndex}
          />
        </div>

        {meetResults.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-1">
              {(["A", "B"] as RouteSide[]).map((side) => (
                <button
                  key={side}
                  onClick={() => setRouteSide(side)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    routeSide === side
                      ? "bg-primary text-white"
                      : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  Route from User {side}
                </button>
              ))}
            </div>

            {availableCategories.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Categories
                  </p>
                  {selectedCategories.length > 0 && (
                    <button
                      onClick={() => setSelectedCategories([])}
                      className="text-xs font-medium text-primary"
                    >
                      Show all
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map((category) => {
                    const checked = selectedCategories.includes(category);

                    return (
                      <label
                        key={category}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                          checked
                            ? "border-primary bg-primary/15 text-slate-100"
                            : "border-slate-700 bg-slate-800/70 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategory(category)}
                          className="size-3.5 accent-primary"
                        />
                        <span>{category}</span>
                        <span className="rounded bg-slate-950/60 px-1.5 py-0.5 text-[10px] text-slate-400">
                          {categoryCounts[category]}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredMeetResults.length === 0 && (
              <p className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-400">
                No results match the selected categories.
              </p>
            )}

            {filteredMeetResults.map((place, index) => {
              const isSelected = selectedMeet?.id === place.id;

              return (
                <button
                  key={place.id}
                  onClick={() => setSelectedMeet(place)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-slate-800 bg-slate-900/80 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                        <p className="truncate text-sm font-semibold text-slate-100">
                          {place.name}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {getMeetCategory(place)} -{" "}
                        {place.reason || "Balanced meeting option"}
                      </p>
                    </div>
                    {isSelected && (
                      <Star size={16} className="shrink-0 text-primary" />
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-800/70 px-2 py-2">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Clock size={12} />
                        User A
                      </div>
                      <p className="mt-1 font-semibold text-slate-100">
                        {place.travelTimeA} min
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-800/70 px-2 py-2">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Clock size={12} />
                        User B
                      </div>
                      <p className="mt-1 font-semibold text-slate-100">
                        {place.travelTimeB} min
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-800/70 px-2 py-2">
                      <p className="text-slate-400">Gap</p>
                      <p className="mt-1 font-semibold text-slate-100">
                        {place.difference} min
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}

            {selectedMeet && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Route size={16} className="text-primary" />
                      <span className="truncate">
                        User {routeSide} to {selectedMeet.name}
                      </span>
                    </div>
                    {selectedItinerary && (
                      <p className="mt-1 text-xs text-slate-400">
                        {Math.round(selectedItinerary.duration / 60)} min public route
                      </p>
                    )}
                  </div>
                  {loadingRouteKey === activeRouteKey && (
                    <span className="shrink-0 text-xs text-slate-400">
                      Loading...
                    </span>
                  )}
                </div>

                {!routeData && loadingRouteKey !== activeRouteKey && (
                  <button
                    onClick={() => fetchMeetRoute(routeSide, selectedMeet)}
                    className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
                  >
                    Show route
                  </button>
                )}

                {itineraries.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {itineraries.map((itinerary: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedRouteIndex(index)}
                        className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium ${
                          selectedRouteIndex === index
                            ? "bg-primary text-white"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        Option {index + 1} - {Math.round(itinerary.duration / 60)} min
                      </button>
                    ))}
                  </div>
                )}

                {routeError && activeRouteKey === loadingRouteKey ? null : (
                  routeError && (
                    <p className="mt-3 text-sm text-red-300">{routeError}</p>
                  )
                )}

                {routeSteps && (
                  <div className="mt-3 space-y-2">
                    {routeSteps.map((step: any, index: number) => (
                      <div
                        key={index}
                        className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm"
                      >
                        <div className="font-medium text-slate-100">
                          {step.mode === "WALK" && "Walk"}
                          {step.mode === "SUBWAY" && "Metro"}
                          {step.mode === "BUS" && "Bus"}
                          {!["WALK", "SUBWAY", "BUS"].includes(step.mode) &&
                            step.mode}
                        </div>
                        {step.routeName && step.mode !== "WALK" && (
                          <div className="mt-1 text-xs text-emerald-400">
                            Line: {step.routeName}
                          </div>
                        )}
                        <div className="mt-1 text-xs text-slate-400">
                          From{" "}
                          <span className="text-slate-100">{step.from}</span>{" "}
                          to{" "}
                          <span className="text-slate-100">{step.to}</span>
                        </div>
                        <div className="mt-1 text-xs text-emerald-400">
                          ~ {step.duration} min
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>


        <BottomNav active="meet" />


    </div>
  );
};

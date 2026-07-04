import React, { useState, useEffect, useMemo, useRef } from "react";
import { MapPin, X, Crosshair, Navigation } from "lucide-react";
import { RealMap } from "./Map";
import { BottomNav } from "./BottomNav";
import { apiClient } from "../../lib/apiClient";
import {
  fetchLocationSuggestions,
  type LocationResult,
} from "../../lib/locationSearch";
import type { OtpItinerary, OtpLeg, OtpRouteResponse } from "./otpTypes";
import { Button } from "../design/Button";
import { Chip } from "../design/Chip";
import { Loading } from "../design/Loading";
import { DetailView } from "./DetailView";
import { ShareView } from "./ShareView";
import {
  ResultCard,
  RouteDetail,
  LoadingSequence,
  type MeetResult,
  type RouteSide,
  type MeetRouteStep,
  getMeetCategory,
  CATEGORY_ORDER,
} from "./meet";

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
  const [routeCache, setRouteCache] = useState<Record<string, OtpRouteResponse>>({});
  const [loadingRouteKey, setLoadingRouteKey] = useState<string | null>(null);
  const [routeError, setRouteError] = useState("");
  const [meetNotice, setMeetNotice] = useState("");
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [loadingStage, setLoadingStage] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  // Staged loading sequence
  useEffect(() => {
    if (!loadingMeet) {
      setLoadingStage(0);
      return;
    }
    setLoadingStage(1);
    const interval = setInterval(() => {
      setLoadingStage((prev) => Math.min(prev + 1, 5));
    }, 1800);
    return () => clearInterval(interval);
  }, [loadingMeet]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedA(locA), 400);
    return () => clearTimeout(timer);
  }, [locA]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedB(locB), 400);
    return () => clearTimeout(timer);
  }, [locB]);

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

  const resetMeetState = () => {
    setMeetResults([]);
    setSelectedMeet(null);
    setSelectedCategories([]);
    setRouteCache({});
    setLoadingRouteKey(null);
    setRouteError("");
    setMeetNotice("");
    setSelectedRouteIndex(0);
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
    resetMeetState();
  };

  const handleFieldBlur = (type: "A" | "B") => {
    setTimeout(() => {
      const suggestions = type === "A" ? suggestionsA : suggestionsB;
      const coords = type === "A" ? coordsA : coordsB;
      if (suggestions.length > 0 && !coords) {
        handleSelectLocation(suggestions[0], type);
      }
    }, 0);
  };

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
    resetMeetState();
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
      const data = await apiClient.meet.find({
        latA: coordsA.lat,
        lonA: coordsA.lng,
        latB: coordsB.lat,
        lonB: coordsB.lng,
        minutes: 40,
        fromName: locA,
        toName: locB,
      });

      const results = Array.isArray(data) ? data.slice(0, 12) : [];

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
      const data = await apiClient.route.plan({
        from: { lat: from.lat, lng: from.lng },
        to: { lat: place.lat, lng: place.lon },
        fromName,
        toName: place.name,
      });

      const routeData = data as OtpRouteResponse;
      const itineraries = routeData?.data?.plan?.itineraries || [];

      if (itineraries.length === 0) {
        setRouteError("No public transport route found for this side.");
        return;
      }

      setRouteCache((prev) => ({
        ...prev,
        [routeKey]: routeData,
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
    setActiveField(null);
    resetMeetState();
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

  const routeKeyA = selectedMeet ? getRouteKey("A", selectedMeet) : "";
  const routeKeyB = selectedMeet ? getRouteKey("B", selectedMeet) : "";
  const routeDataA = routeKeyA ? routeCache[routeKeyA] : null;
  const routeDataB = routeKeyB ? routeCache[routeKeyB] : null;
  const activeRouteKey = selectedMeet
    ? getRouteKey(routeSide, selectedMeet)
    : "";
  const itineraries: OtpItinerary[] = (activeRouteKey ? routeCache[activeRouteKey] : null)?.data?.plan?.itineraries || [];
  const routeSteps: MeetRouteStep[] | undefined = useMemo(
    () => itineraries[selectedRouteIndex]?.legs?.map((leg: OtpLeg) => ({
      mode: leg.mode,
      from: leg.from?.name,
      to: leg.to?.name,
      routeName: leg.route?.shortName || leg.route?.longName,
      duration: Math.round((leg.endTime - leg.startTime) / 60000),
    })),
    [itineraries, selectedRouteIndex],
  );

  useEffect(() => {
    setSelectedRouteIndex(0);
  }, [activeRouteKey]);

  useEffect(() => {
    setRouteError("");
  }, [selectedMeet, routeSide]);

  useEffect(() => {
    if (!selectedMeet || !coordsA || !coordsB) return;
    if (!routeCache[getRouteKey("A", selectedMeet)]) {
      fetchMeetRoute("A", selectedMeet);
    }
    if (!routeCache[getRouteKey("B", selectedMeet)]) {
      fetchMeetRoute("B", selectedMeet);
    }
  }, [selectedMeet, coordsA, coordsB]);

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

  const hasResults = meetResults.length > 0;

  const markers = useMemo(() => [
    ...(coordsA ? [{ lat: coordsA.lat, lng: coordsA.lng, name: locA, kind: "user" as const }] : []),
    ...(coordsB ? [{ lat: coordsB.lat, lng: coordsB.lng, name: locB, kind: "destination" as const }] : []),
    ...filteredMeetResults.map((p) => ({
      lat: p.lat,
      lng: p.lon,
      name: p.name,
      kind: (selectedMeet?.id === p.id ? "meeting" : "nearby") as "meeting" | "nearby",
    })),
  ], [coordsA, coordsB, locA, locB, filteredMeetResults, selectedMeet]);

  const multiRouteData = useMemo(() => (
    selectedMeet
      ? [
          ...(routeDataA ? [{ routeData: routeDataA, selectedIndex: selectedRouteIndex, color: "#3B82F6" as const, label: "User A" as const }] : []),
          ...(routeDataB ? [{ routeData: routeDataB, selectedIndex: selectedRouteIndex, color: "#EF4444" as const, label: "User B" as const }] : []),
        ]
      : undefined
  ), [selectedMeet, routeDataA, routeDataB, selectedRouteIndex]);

  return (
    <div
      className="relative flex h-dvh flex-col overflow-hidden"
      style={{ backgroundColor: "var(--ds-bg-primary)" }}
    >
      <style>{`
        @keyframes meet-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes meet-slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes meet-scale-in {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        .meet-enter {
          animation: meet-fade-up 0.5s var(--ds-ease-out) both;
        }
        .meet-enter-d1 { animation-delay: 0.05s; }
        .meet-enter-d2 { animation-delay: 0.1s; }
        .meet-enter-d3 { animation-delay: 0.15s; }
        .meet-enter-d4 { animation-delay: 0.2s; }
        .meet-card-enter {
          animation: meet-scale-in 0.35s var(--ds-ease-out) both;
        }
        .meet-results-enter {
          animation: meet-slide-up 0.4s var(--ds-ease-out) both;
        }
      `}</style>

      {/* ===== Loading Sequence ===== */}
      {loadingMeet && <LoadingSequence stage={loadingStage} />}

      {loadingRouteKey !== null && !loadingMeet && (
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
                Loading route...
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--ds-text-tertiary)" }}
              >
                Calculating public transport directions
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== Map (full-height background) ===== */}
      <div className="absolute inset-0 z-0">
        <RealMap
          markers={markers}
          multiRouteData={multiRouteData}
        />
      </div>

      {/* ===== Ambient map gradient overlay ===== */}
      <div
        className="absolute inset-x-0 top-0 z-[1] h-64 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, var(--ds-bg-primary) 0%, var(--ds-bg-primary) 30%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 z-[1] h-48 pointer-events-none"
        style={{
          background: "linear-gradient(0deg, var(--ds-bg-primary) 0%, var(--ds-bg-primary) 20%, transparent 100%)",
        }}
      />

      {/* ===== Top Search Panel ===== */}
      <div className="relative z-10 flex flex-col gap-3 px-4 pt-3 pb-3 meet-enter meet-enter-d1">
        <div
          className="ds-glass-strong rounded-[var(--ds-radius-2xl)] p-4 sm:p-5 flex flex-col gap-3"
          style={{ boxShadow: "var(--ds-shadow-lg)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5">
            <div
              className="size-8 rounded-[var(--ds-radius-lg)] flex items-center justify-center"
              style={{ backgroundColor: "var(--ds-accent-soft)" }}
            >
              <Crosshair
                size={16}
                style={{ color: "var(--ds-accent)" }}
              />
            </div>
            <h1
              className="text-base font-[var(--ds-weight-semibold)]"
              style={{ color: "var(--ds-text-primary)" }}
            >
              Meet
            </h1>
          </div>

          {/* Location A */}
          <div className="relative">
            <div
              className="flex items-center gap-2.5 h-11 px-3.5 rounded-[var(--ds-radius-lg)] transition-all duration-[var(--ds-duration-fast)]"
              style={{
                backgroundColor: "var(--ds-bg-tertiary)",
                border: "1px solid",
                borderColor:
                  activeField === "A"
                    ? "var(--ds-accent)"
                    : "var(--ds-border-primary)",
              }}
            >
              <MapPin
                size={16}
                className="shrink-0"
                style={{ color: "var(--ds-accent)" }}
              />
              <input
                value={locA}
                onChange={(e) => handleLocationInputChange(e.target.value, "A")}
                onFocus={() => setActiveField("A")}
                onBlur={() => handleFieldBlur("A")}
                placeholder="Your location (A)"
                className="flex-1 bg-transparent text-sm outline-none border-none"
                style={{
                  color: "var(--ds-text-primary)",
                }}
              />
              {locA && (
                <button
                  type="button"
                  aria-label="Clear location A"
                  onClick={() => clearLocation("A")}
                  className="shrink-0 flex items-center justify-center size-6 rounded-full transition-colors"
                  style={{ color: "var(--ds-text-tertiary)" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--ds-bg-hover)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {activeField === "A" && suggestionsA.length > 0 && (
              <div
                className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-[var(--ds-radius-lg)]"
                style={{
                  backgroundColor: "var(--ds-bg-secondary)",
                  border: "1px solid var(--ds-border-primary)",
                  boxShadow: "var(--ds-shadow-lg)",
                }}
              >
                {suggestionsA.map((s) => (
                  <button
                    key={s.name}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectLocation(s, "A");
                    }}
                    onClick={() => handleSelectLocation(s, "A")}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors"
                    style={{ color: "var(--ds-text-primary)" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--ds-bg-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <MapPin size={14} style={{ color: "var(--ds-text-tertiary)" }} />
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Location B */}
          <div className="relative">
            <div
              className="flex items-center gap-2.5 h-11 px-3.5 rounded-[var(--ds-radius-lg)] transition-all duration-[var(--ds-duration-fast)]"
              style={{
                backgroundColor: "var(--ds-bg-tertiary)",
                border: "1px solid",
                borderColor:
                  activeField === "B"
                    ? "var(--ds-accent)"
                    : "var(--ds-border-primary)",
              }}
            >
              <Navigation
                size={16}
                className="shrink-0"
                style={{ color: "var(--ds-accent)" }}
              />
              <input
                value={locB}
                onChange={(e) => handleLocationInputChange(e.target.value, "B")}
                onFocus={() => setActiveField("B")}
                onBlur={() => handleFieldBlur("B")}
                placeholder="Their location (B)"
                className="flex-1 bg-transparent text-sm outline-none border-none"
                style={{
                  color: "var(--ds-text-primary)",
                }}
              />
              {locB && (
                <button
                  type="button"
                  aria-label="Clear location B"
                  onClick={() => clearLocation("B")}
                  className="shrink-0 flex items-center justify-center size-6 rounded-full transition-colors"
                  style={{ color: "var(--ds-text-tertiary)" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--ds-bg-hover)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {activeField === "B" && suggestionsB.length > 0 && (
              <div
                className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-[var(--ds-radius-lg)]"
                style={{
                  backgroundColor: "var(--ds-bg-secondary)",
                  border: "1px solid var(--ds-border-primary)",
                  boxShadow: "var(--ds-shadow-lg)",
                }}
              >
                {suggestionsB.map((s) => (
                  <button
                    key={s.name}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectLocation(s, "B");
                    }}
                    onClick={() => handleSelectLocation(s, "B")}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors"
                    style={{ color: "var(--ds-text-primary)" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--ds-bg-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <Navigation size={14} style={{ color: "var(--ds-text-tertiary)" }} />
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Find button */}
          {coordsA && coordsB && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={loadingMeet}
              onClick={handleFindMeetingPoint}
              className="meet-enter meet-enter-d2"
            >
              <Crosshair size={16} />
              Find Meeting Point
            </Button>
          )}

        </div>
      </div>

      {/* ===== Results Panel ===== */}
      <div
        ref={resultsRef}
        className="relative z-10 flex-1 overflow-y-auto px-4 pb-4"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--ds-border-primary) transparent",
        }}
      >
        {hasResults && (
          <div className="flex flex-col gap-3 meet-results-enter">
            {/* Route toggle */}
            <div
              className="ds-glass-strong rounded-[var(--ds-radius-xl)] p-1.5 flex gap-1"
              style={{ boxShadow: "var(--ds-shadow-md)" }}
            >
              {(["A", "B"] as RouteSide[]).map((side) => (
                <button
                  key={side}
                  onClick={() => setRouteSide(side)}
                  className="flex-1 h-9 rounded-[var(--ds-radius-lg)] text-sm font-[var(--ds-weight-semibold)] transition-all duration-[var(--ds-duration-fast)]"
                  style={{
                    backgroundColor:
                      routeSide === side ? "var(--ds-accent)" : "transparent",
                    color:
                      routeSide === side
                        ? "var(--ds-accent-text)"
                        : "var(--ds-text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    if (routeSide !== side) {
                      e.currentTarget.style.backgroundColor = "var(--ds-bg-hover)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (routeSide !== side) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  Route from User {side}
                </button>
              ))}
            </div>

            {/* Category filters */}
            {availableCategories.length > 0 && (
              <div
                className="ds-glass-strong rounded-[var(--ds-radius-xl)] p-3.5 flex flex-col gap-2.5"
                style={{ boxShadow: "var(--ds-shadow-md)" }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-[var(--ds-weight-semibold)] uppercase tracking-[var(--ds-tracking-wider)]"
                    style={{ color: "var(--ds-text-tertiary)" }}
                  >
                    Categories
                  </span>
                  {selectedCategories.length > 0 && (
                    <button
                      onClick={() => setSelectedCategories([])}
                      className="text-xs font-[var(--ds-weight-medium)] transition-colors"
                      style={{ color: "var(--ds-accent)" }}
                    >
                      Show all
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map((category) => {
                    const checked = selectedCategories.includes(category);
                    return (
                      <Chip
                        key={category}
                        variant={checked ? "accent" : "default"}
                        onClick={() => toggleCategory(category)}
                        className="cursor-pointer"
                      >
                        {category}
                        <span className="ml-1 text-[10px] opacity-60">
                          {categoryCounts[category]}
                        </span>
                      </Chip>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No results after filter */}
            {filteredMeetResults.length === 0 && selectedCategories.length > 0 && (
              <div
                className="ds-glass-strong rounded-[var(--ds-radius-xl)] p-5 text-center flex flex-col items-center gap-2"
                style={{ boxShadow: "var(--ds-shadow-md)" }}
              >
                <p
                  className="text-sm font-[var(--ds-weight-medium)]"
                  style={{ color: "var(--ds-text-primary)" }}
                >
                  No matching spots
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--ds-text-tertiary)" }}
                >
                  Try selecting different categories
                </p>
              </div>
            )}

            {/* Result cards */}
            <div className="flex flex-col gap-2.5 pb-20">
              {filteredMeetResults.map((place, index) => (
                <div
                  key={place.id}
                  className="meet-card-enter"
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  <ResultCard
                    place={place}
                    index={index}
                    isSelected={selectedMeet?.id === place.id}
                    onClick={() => setSelectedMeet(place)}
                  />
                </div>
              ))}

              {/* Route details for selected meet */}
              {selectedMeet && (
                <div
                  className="meet-card-enter"
                  style={{ animationDelay: `${filteredMeetResults.length * 0.04}s` }}
                >
                  <RouteDetail
                    selectedMeet={selectedMeet}
                    routeSide={routeSide}
                    itineraries={itineraries}
                    selectedRouteIndex={selectedRouteIndex}
                    setSelectedRouteIndex={setSelectedRouteIndex}
                    routeSteps={routeSteps}
                    routeError={routeError}
                    loadingRouteKey={loadingRouteKey}
                    getRouteKey={getRouteKey}
                  />
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      onClick={() => setShowDetail(true)}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => setShowShare(true)}
                    >
                      Share
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!hasResults && !loadingMeet && !meetNotice && (
          <div
            className="ds-glass-strong rounded-[var(--ds-radius-2xl)] p-8 mt-8 flex flex-col items-center gap-4 text-center"
            style={{ boxShadow: "var(--ds-shadow-lg)" }}
          >
            <div
              className="size-14 rounded-[var(--ds-radius-xl)] flex items-center justify-center"
              style={{ backgroundColor: "var(--ds-accent-soft)" }}
            >
              <Crosshair
                size={28}
                style={{ color: "var(--ds-accent)" }}
              />
            </div>
            <div className="flex flex-col gap-1 max-w-[240px]">
              <p
                className="text-base font-[var(--ds-weight-semibold)]"
                style={{ color: "var(--ds-text-primary)" }}
              >
                Find a meeting point
              </p>
              <p
                className="text-sm"
                style={{ color: "var(--ds-text-tertiary)" }}
              >
                Enter two locations and we'll find the best spot for you both
              </p>
            </div>
          </div>
        )}

        {/* Notice/error in empty state */}
        {!hasResults && !loadingMeet && meetNotice && (
          <div
            className="ds-glass-strong rounded-[var(--ds-radius-2xl)] p-6 mt-4 flex flex-col items-center gap-4 text-center"
            style={{ boxShadow: "var(--ds-shadow-lg)" }}
          >
            <div
              className="size-12 rounded-[var(--ds-radius-xl)] flex items-center justify-center"
              style={{ backgroundColor: "var(--ds-warning-soft)" }}
            >
              <span className="text-lg" style={{ color: "var(--ds-warning)" }}>
                !
              </span>
            </div>
            <div className="flex flex-col gap-1 max-w-[260px]">
              <p
                className="text-sm font-[var(--ds-weight-semibold)]"
                style={{ color: "var(--ds-text-primary)" }}
              >
                No spots found
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--ds-text-tertiary)" }}
              >
                {meetNotice}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleFindMeetingPoint}
            >
              Try again
            </Button>
          </div>
        )}
      </div>

      {/* ===== Detail View ===== */}
      {showDetail && selectedMeet && (
        <DetailView
          place={selectedMeet}
          routeSide={routeSide}
          onClose={() => setShowDetail(false)}
          onShare={() => {
            setShowDetail(false);
            setShowShare(true);
          }}
        />
      )}

      {/* ===== Share View ===== */}
      {selectedMeet && (
        <ShareView
          open={showShare}
          placeName={selectedMeet.name}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* ===== Bottom Navigation ===== */}
      <div className="relative z-10">
        <BottomNav active="meet" />
      </div>
    </div>
  );
};

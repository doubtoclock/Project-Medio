import React, { useState, useEffect, useMemo, useRef } from "react";
import { MapPin, X, Crosshair, Navigation, ArrowRight } from "lucide-react";
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
    <div className="meet-page relative flex h-dvh flex-col overflow-hidden"
      style={{ backgroundColor: '#090909' }}
    >
      <style>{`
        .meet-bg .leaflet-container {
          transform: scale(1.15);
          animation: cinematicIdlePan 40s linear infinite alternate;
        }
        @keyframes cinematicIdlePan {
          0% { transform: scale(1.15) rotateZ(-2deg) translate(-10px, -10px); }
          50% { transform: scale(1.18) rotateZ(1deg) translate(10px, 5px); }
          100% { transform: scale(1.15) rotateZ(2deg) translate(-5px, 15px); }
        }
        @keyframes meetFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes meetFadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes meetFadeInDown {
          from { opacity: 0; transform: translateY(-14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes meet-scale-in {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        .meet-card-enter {
          animation: meet-scale-in 0.35s var(--ds-ease-out) both;
        }
        .meet-input:focus {
          border-bottom-color: #F5F5F5 !important;
          transform: translateY(-1px);
        }
        .meet-input::placeholder {
          color: rgba(255, 255, 255, 0.25);
          font-weight: 500;
        }
        .meet-cta-button:hover {
          background-color: #FFFFFF !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25) !important;
        }
        .meet-cta-button:active {
          transform: scale(0.97) !important;
          background-color: #E0E0E0 !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
        }
      `}</style>

      {/* Ambient Map Background */}
      <div className="meet-bg absolute inset-0 z-0 overflow-hidden">
        <RealMap
          markers={markers}
          multiRouteData={multiRouteData}
        />
        <div
          className="meet-bg-overlay absolute inset-0 pointer-events-none"
          style={{
            zIndex: 1000,
            background: 'linear-gradient(180deg, rgba(15,15,15,0.85) 0%, rgba(15,15,15,0.65) 35%, rgba(15,15,15,0.85) 70%, rgba(10,10,10,0.98) 100%)',
          }}
        />
      </div>

      {/* Loading overlays */}
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

      {/* ===== ENTRY MODE (initial state, no results) ===== */}
      {!hasResults && (
        <div className="meet-content relative z-10 flex flex-col h-full overflow-y-auto"
          style={{ padding: '36px var(--meet-pad-x, 24px) 20px' }}
        >
          {/* Coordinate Badge */}
          <div
            className="meet-coord-badge flex items-center gap-[10px] mb-6"
            style={{ animation: 'meetFadeInDown 0.6s ease-out' }}
          >
            <div
              className="meet-coord-bar"
              style={{
                width: 3,
                height: 18,
                backgroundColor: '#F5F5F5',
                borderRadius: 2,
              }}
            />
            <span
              className="meet-coord-text"
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 3,
                color: '#A1A1A1',
                textTransform: 'uppercase',
              }}
            >
              Coordinate System Active
            </span>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Hero */}
          <h1
            className="meet-hero-title"
            style={{
              fontSize: 52,
              fontWeight: 900,
              lineHeight: 1.0,
              letterSpacing: -2,
              color: '#F5F5F5',
              textShadow: '0 4px 12px #090909',
              marginBottom: 16,
              animation: 'meetFadeInUp 0.7s ease-out 0.15s both',
            }}
          >
            Meet<br />Medio.
          </h1>
          <p
            className="meet-hero-subtitle"
            style={{
              fontSize: 17,
              fontWeight: 700,
              lineHeight: 1.5,
              color: '#A1A1A1',
              textShadow: '0 2px 8px #090909',
              maxWidth: 280,
              marginBottom: 8,
              animation: 'meetFadeInUp 0.7s ease-out 0.3s both',
            }}
          >
            Define two origins to calculate the optimal nexus.
          </p>

          {/* Origin A */}
          <div
            className="origin-section"
            style={{
              marginTop: 64,
              marginBottom: 8,
              animation: 'meetFadeInUp 0.7s ease-out 0.45s both',
            }}
          >
            <label
              className="origin-label"
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2.5,
                color: 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase',
                marginBottom: 10,
                display: 'block',
              }}
            >
              Origin A / Your Location
            </label>
            <div className="relative flex items-center gap-2.5">
              <MapPin size={16} style={{ color: '#F5F5F5', flexShrink: 0 }} />
              <input
                value={locA}
                onChange={(e) => handleLocationInputChange(e.target.value, "A")}
                onFocus={() => setActiveField("A")}
                onBlur={() => handleFieldBlur("A")}
                placeholder="Enter your address..."
                className="meet-input"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.25)',
                  outline: 'none',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#F5F5F5',
                  textShadow: '0 2px 4px rgba(0,0,0,0.6)',
                  padding: '4px 0 14px',
                  transition: 'border-color 0.3s, box-shadow 0.3s, transform 0.3s',
                }}
              />
              {locA && (
                <button
                  type="button"
                  aria-label="Clear location A"
                  onClick={() => clearLocation("A")}
                  className="shrink-0 flex items-center justify-center"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    color: 'rgba(255,255,255,0.25)',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {activeField === "A" && suggestionsA.length > 0 && (
              <div
                className="mt-1.5 overflow-hidden rounded-lg"
                style={{
                  backgroundColor: '#171717',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                }}
              >
                {suggestionsA.map((s) => (
                  <button
                    key={s.name}
                    onMouseDown={(e) => { e.preventDefault(); handleSelectLocation(s, "A"); }}
                    onClick={() => handleSelectLocation(s, "A")}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors"
                    style={{ color: '#F5F5F5', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <MapPin size={14} style={{ color: '#A1A1A1' }} />
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Origin B */}
          <div
            className="origin-section"
            style={{
              marginBottom: 24,
              animation: 'meetFadeInUp 0.7s ease-out 0.55s both',
            }}
          >
            <label
              className="origin-label"
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2.5,
                color: 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase',
                marginBottom: 10,
                display: 'block',
              }}
            >
              Origin B / Friend's Location
            </label>
            <div className="relative flex items-center gap-2.5">
              <Navigation size={16} style={{ color: '#F5F5F5', flexShrink: 0 }} />
              <input
                value={locB}
                onChange={(e) => handleLocationInputChange(e.target.value, "B")}
                onFocus={() => setActiveField("B")}
                onBlur={() => handleFieldBlur("B")}
                placeholder="Enter friend's address..."
                className="meet-input"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.25)',
                  outline: 'none',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#F5F5F5',
                  textShadow: '0 2px 4px rgba(0,0,0,0.6)',
                  padding: '4px 0 14px',
                  transition: 'border-color 0.3s, box-shadow 0.3s, transform 0.3s',
                }}
              />
              {locB && (
                <button
                  type="button"
                  aria-label="Clear location B"
                  onClick={() => clearLocation("B")}
                  className="shrink-0 flex items-center justify-center"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    color: 'rgba(255,255,255,0.25)',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {activeField === "B" && suggestionsB.length > 0 && (
              <div
                className="mt-1.5 overflow-hidden rounded-lg"
                style={{
                  backgroundColor: '#171717',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                }}
              >
                {suggestionsB.map((s) => (
                  <button
                    key={s.name}
                    onMouseDown={(e) => { e.preventDefault(); handleSelectLocation(s, "B"); }}
                    onClick={() => handleSelectLocation(s, "B")}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors"
                    style={{ color: '#F5F5F5', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Navigation size={14} style={{ color: '#A1A1A1' }} />
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bottom section */}
          <div
            className="meet-spacer-bottom"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <p
              className="analysis-text"
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: 2.5,
                color: 'rgba(255,255,255,0.25)',
                textAlign: 'center',
                marginBottom: 16,
                animation: 'meetFadeIn 0.7s ease-out 0.7s both',
              }}
            >
              ANALYSIS ENGINE V.4.0
            </p>

            {coordsA && coordsB && (
              <button
                onClick={handleFindMeetingPoint}
                disabled={loadingMeet}
                className="meet-cta-button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '18px 32px',
                  backgroundColor: '#F5F5F5',
                  color: '#0F0F0F',
                  border: 'none',
                  borderRadius: 24,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  animation: 'meetFadeInUp 0.7s ease-out 0.9s both',
                  boxSizing: 'border-box',
                }}
              >
                {loadingMeet ? "Searching..." : "Find Midpoint"}
                {!loadingMeet && <ArrowRight size={20} strokeWidth={2.5} />}
              </button>
            )}
          </div>

          {/* Notice */}
          {meetNotice && (
            <div
              className="mt-4 p-4 text-center"
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <p style={{ fontSize: 13, color: '#A1A1A1', fontFamily: "'Inter', sans-serif" }}>
                {meetNotice}
              </p>
              <button
                onClick={handleFindMeetingPoint}
                style={{
                  marginTop: 12,
                  padding: '8px 20px',
                  borderRadius: 20,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'transparent',
                  color: '#F5F5F5',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Try again
              </button>
            </div>
          )}

          {/* Footer */}
          <div
            className="meet-footer"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
              paddingBottom: 4,
              animation: 'meetFadeIn 0.7s ease-out 1.1s both',
            }}
          >
            <span
              className="meet-footer-text"
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                letterSpacing: 1.2,
                color: 'rgba(255,255,255,0.25)',
              }}
            >
              52.5200° N, 13.4050° E
            </span>
            <span
              className="meet-footer-text"
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                letterSpacing: 1.2,
                color: 'rgba(255,255,255,0.25)',
              }}
            >
              S-01 ACTIVE
            </span>
          </div>
        </div>
      )}

      {/* ===== RESULTS MODE ===== */}
      {hasResults && (
        <div
          className="relative z-10 flex flex-col flex-1 overflow-y-auto"
          style={{ padding: '16px 24px 0' }}
        >
          {/* Compact coordinate badge */}
          <div
            className="meet-coord-badge flex items-center gap-[10px] mb-4"
            style={{ animation: 'meetFadeInDown 0.5s ease-out' }}
          >
            <div
              className="meet-coord-bar"
              style={{
                width: 3,
                height: 14,
                backgroundColor: '#F5F5F5',
                borderRadius: 2,
              }}
            />
            <span
              className="meet-coord-text"
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2.5,
                color: '#A1A1A1',
                textTransform: 'uppercase',
              }}
            >
              Coordinate System Active
            </span>
          </div>

          {/* Compact inputs */}
          <div
            className="ds-glass-strong rounded-[var(--ds-radius-2xl)] p-4 flex flex-col gap-3"
            style={{
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(16px)',
              backgroundColor: 'rgba(18,18,18,0.85)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Origin A */}
            <div className="relative">
              <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-[var(--ds-radius-lg)]"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid',
                  borderColor: activeField === "A" ? '#F5F5F5' : 'rgba(255,255,255,0.08)',
                  transition: 'border-color 0.2s',
                }}
              >
                <MapPin size={16} className="shrink-0" style={{ color: '#F5F5F5' }} />
                <input
                  value={locA}
                  onChange={(e) => handleLocationInputChange(e.target.value, "A")}
                  onFocus={() => setActiveField("A")}
                  onBlur={() => handleFieldBlur("A")}
                  placeholder="Your location (A)"
                  className="flex-1 bg-transparent text-sm outline-none border-none"
                  style={{ color: '#F5F5F5', fontFamily: "'Inter', sans-serif" }}
                />
                {locA && (
                  <button
                    type="button"
                    aria-label="Clear location A"
                    onClick={() => clearLocation("A")}
                    className="shrink-0 flex items-center justify-center size-6 rounded-full transition-colors"
                    style={{ color: 'rgba(255,255,255,0.3)', border: 'none', background: 'transparent', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {activeField === "A" && suggestionsA.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-[var(--ds-radius-lg)]"
                  style={{
                    backgroundColor: '#171717',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                  }}
                >
                  {suggestionsA.map((s) => (
                    <button
                      key={s.name}
                      onMouseDown={(e) => { e.preventDefault(); handleSelectLocation(s, "A"); }}
                      onClick={() => handleSelectLocation(s, "A")}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors"
                      style={{ color: '#F5F5F5', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <MapPin size={14} style={{ color: '#A1A1A1' }} />
                      <span className="truncate">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Origin B */}
            <div className="relative">
              <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-[var(--ds-radius-lg)]"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid',
                  borderColor: activeField === "B" ? '#F5F5F5' : 'rgba(255,255,255,0.08)',
                  transition: 'border-color 0.2s',
                }}
              >
                <Navigation size={16} className="shrink-0" style={{ color: '#F5F5F5' }} />
                <input
                  value={locB}
                  onChange={(e) => handleLocationInputChange(e.target.value, "B")}
                  onFocus={() => setActiveField("B")}
                  onBlur={() => handleFieldBlur("B")}
                  placeholder="Their location (B)"
                  className="flex-1 bg-transparent text-sm outline-none border-none"
                  style={{ color: '#F5F5F5', fontFamily: "'Inter', sans-serif" }}
                />
                {locB && (
                  <button
                    type="button"
                    aria-label="Clear location B"
                    onClick={() => clearLocation("B")}
                    className="shrink-0 flex items-center justify-center size-6 rounded-full transition-colors"
                    style={{ color: 'rgba(255,255,255,0.3)', border: 'none', background: 'transparent', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {activeField === "B" && suggestionsB.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-[var(--ds-radius-lg)]"
                  style={{
                    backgroundColor: '#171717',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                  }}
                >
                  {suggestionsB.map((s) => (
                    <button
                      key={s.name}
                      onMouseDown={(e) => { e.preventDefault(); handleSelectLocation(s, "B"); }}
                      onClick={() => handleSelectLocation(s, "B")}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors"
                      style={{ color: '#F5F5F5', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Navigation size={14} style={{ color: '#A1A1A1' }} />
                      <span className="truncate">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {coordsA && coordsB && (
              <button
                onClick={handleFindMeetingPoint}
                disabled={loadingMeet}
                className="meet-cta-button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '14px 32px',
                  backgroundColor: '#F5F5F5',
                  color: '#0F0F0F',
                  border: 'none',
                  borderRadius: 24,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  boxSizing: 'border-box',
                }}
              >
                {loadingMeet ? "Searching..." : "Find Midpoint"}
                {!loadingMeet && <ArrowRight size={18} strokeWidth={2.5} />}
              </button>
            )}
          </div>

          {/* Results panel */}
          <div
            ref={resultsRef}
            className="flex-1 overflow-y-auto pt-4 pb-4"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255,255,255,0.08) transparent",
            }}
          >
            {hasResults && (
              <div className="flex flex-col gap-3">
                {/* Route toggle */}
                <div
                  className="rounded-[var(--ds-radius-xl)] p-1.5 flex gap-1"
                  style={{
                    backgroundColor: 'rgba(18,18,18,0.9)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}
                >
                  {(["A", "B"] as RouteSide[]).map((side) => (
                    <button
                      key={side}
                      onClick={() => setRouteSide(side)}
                      className="flex-1 h-9 rounded-[var(--ds-radius-lg)] text-sm font-[var(--ds-weight-semibold)] transition-all duration-[var(--ds-duration-fast)]"
                      style={{
                        backgroundColor:
                          routeSide === side ? '#F5F5F5' : 'transparent',
                        color:
                          routeSide === side
                            ? '#0F0F0F'
                            : '#A1A1A1',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (routeSide !== side) {
                          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (routeSide !== side) {
                          e.currentTarget.style.backgroundColor = 'transparent';
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
                    className="rounded-[var(--ds-radius-xl)] p-3.5 flex flex-col gap-2.5"
                    style={{
                      backgroundColor: 'rgba(18,18,18,0.9)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-[var(--ds-weight-semibold)] uppercase tracking-[var(--ds-tracking-wider)]"
                        style={{ color: '#A1A1A1' }}
                      >
                        Categories
                      </span>
                      {selectedCategories.length > 0 && (
                        <button
                          onClick={() => setSelectedCategories([])}
                          className="text-xs font-[var(--ds-weight-medium)] transition-colors"
                          style={{ color: '#F5F5F5', border: 'none', background: 'transparent', cursor: 'pointer' }}
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
                    className="rounded-[var(--ds-radius-xl)] p-5 text-center flex flex-col items-center gap-2"
                    style={{
                      backgroundColor: 'rgba(18,18,18,0.9)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    }}
                  >
                    <p
                      className="text-sm font-[var(--ds-weight-medium)]"
                      style={{ color: '#F5F5F5' }}
                    >
                      No matching spots
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: '#A1A1A1' }}
                    >
                      Try selecting different categories
                    </p>
                  </div>
                )}

                {/* Result cards */}
                <div className="flex flex-col gap-2.5 pb-4">
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

            {/* Notice in results mode */}
            {meetNotice && (
              <div
                className="rounded-[var(--ds-radius-2xl)] p-6 mt-4 flex flex-col items-center gap-4 text-center"
                style={{
                  backgroundColor: 'rgba(18,18,18,0.9)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
              >
                <div
                  className="size-12 rounded-[var(--ds-radius-xl)] flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                >
                  <span className="text-lg" style={{ color: '#A1A1A1' }}>!</span>
                </div>
                <div className="flex flex-col gap-1 max-w-[260px]">
                  <p
                    className="text-sm font-[var(--ds-weight-semibold)]"
                    style={{ color: '#F5F5F5' }}
                  >
                    No spots found
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: '#A1A1A1' }}
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
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="relative z-10 shrink-0">
        <BottomNav active="meet" />
      </div>

      {/* Detail View */}
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

      {/* Share View */}
      {selectedMeet && (
        <ShareView
          open={showShare}
          placeName={selectedMeet.name}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
};

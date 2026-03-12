import React, { useState, useEffect } from "react";
import { MapPin, X } from "lucide-react";
import { RealMap } from "./Map";
import { Link } from "react-router-dom";


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

    const res = await fetch("http://localhost:5001/api/meet", {
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

    const data = await res.json();
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
      <section className="flex flex-col gap-3 px-4 py-6 bg-slate-900/40">

        {/* LOCATION A */}
        <div className="relative">
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
            {locA && <X size={16} onClick={() => clearLocation("A")} />}
          </div>

          {activeField === "A" && suggestionsA.length > 0 && (
            <div className="absolute top-full mt-2 bg-slate-800 border border-slate-700 rounded-xl w-full z-50">
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
        <div className="relative">
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
            {locB && <X size={16} onClick={() => clearLocation("B")} />}
          </div>

          {activeField === "B" && suggestionsB.length > 0 && (
            <div className="absolute top-full mt-2 bg-slate-800 border border-slate-700 rounded-xl w-full z-50">
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
      </section>

      {/* MAP */}
      <section className="px-4 pb-24">
        <div className="w-full h-[40vh] sm:h-[45vh] lg:h-[55vh] overflow-hidden rounded-xl border border-slate-800 shadow-lg">
          <RealMap
            markers={[
              ...(coordsA
                ? [{ lat: coordsA.lat, lng: coordsA.lng, name: locA, color: "green" }]
                : []),
              ...(coordsB
                ? [{ lat: coordsB.lat, lng: coordsB.lng, name: locB, color: "red" }]
                : []),
              ...meetResults.map((p) => ({
                lat: p.lat,
                lng: p.lon,
                name: p.name,
                color: selectedMeet?.id === p.id ? "yellow" : "blue",
              })),
            ]}
          />
        </div>
      </section>


        {/* BOTTOM NAV */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center bg-slate-900/80 backdrop-blur-xl border-t border-slate-800 px-6 py-3">

          <Link to="/meet" className="flex flex-1 flex-col items-center text-primary">
            <span className="material-symbols-outlined">map</span>
            <span className="text-[10px] font-bold">Meet</span>
          </Link>

          <Link to="/travel" className="flex flex-1 flex-col items-center text-slate-400">
            <span className="material-symbols-outlined">commute</span>
            <span className="text-[10px]">Travel</span>
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


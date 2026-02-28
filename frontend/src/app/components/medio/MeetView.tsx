import React, { useState, useEffect } from 'react';
import { MapPin, X } from 'lucide-react';
import { Header } from './Header';
import { RealMap } from './Map';

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

export const MeetView = () => {
  const [locA, setLocA] = useState('');
  const [locB, setLocB] = useState('');
  const [debouncedA, setDebouncedA] = useState('');
  const [debouncedB, setDebouncedB] = useState('');

  const [coordsA, setCoordsA] = useState<LocationResult | null>(null);
  const [coordsB, setCoordsB] = useState<LocationResult | null>(null);

  const [activeField, setActiveField] = useState<'A' | 'B' | null>(null);

  const [suggestionsA, setSuggestionsA] = useState<LocationResult[]>([]);
  const [suggestionsB, setSuggestionsB] = useState<LocationResult[]>([]);

  // 🔥 NEW STATE FOR MEET RESULTS
  const [meetResults, setMeetResults] = useState<any[]>([]);
  const [selectedMeet, setSelectedMeet] = useState<any | null>(null);
  const [loadingMeet, setLoadingMeet] = useState(false);

  // Debounce logic
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

  const handleSelectLocation = (location: LocationResult, type: 'A' | 'B') => {
    if (type === 'A') {
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
        minutes: 40
      }),
    });

    const data = await response.json();
    setMeetResults(data);

    if (data.length > 0) {
      setSelectedMeet(data[0]); // Auto-select best
    }

    setLoadingMeet(false);
  };

  const clearLocation = (type: 'A' | 'B') => {
    if (type === 'A') {
      setLocA('');
      setCoordsA(null);
      setSuggestionsA([]);
    } else {
      setLocB('');
      setCoordsB(null);
      setSuggestionsB([]);
    }
  };

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden">
      <Header />

      {/* Map */}
      <div className="absolute inset-0 -z-0">
        <RealMap
          markers={[
            ...(coordsA ? [{ lat: coordsA.lat, lng: coordsA.lng, name: locA, color: 'green' }] : []),
            ...(coordsB ? [{ lat: coordsB.lat, lng: coordsB.lng, name: locB, color: 'red' }] : []),
            ...meetResults.map((place) => ({
              lat: place.lat,
              lng: place.lon,
              name: place.name,
              color: selectedMeet?.id === place.id ? 'yellow' : 'blue'
            }))
          ]}
        />
      </div>

      {/* Search Container */}
      <div className="absolute top-[80px] left-0 right-0 z-50 px-4 pt-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl p-4 space-y-4">

          {/* Location A */}
          <div className="relative">
            <label className="text-xs text-zinc-400 mb-1 block">Your Location</label>
            <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2 border border-zinc-700">
              <MapPin size={16} className="text-emerald-500" />
              <input
                value={locA}
                onChange={(e) => {
                  setLocA(e.target.value);
                  setActiveField('A');
                }}
                placeholder="Search location..."
                className="bg-transparent flex-1 outline-none text-sm"
              />
              {locA && <X size={16} onClick={() => clearLocation('A')} />}
            </div>

            {activeField === 'A' && suggestionsA.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-lg z-50">
                {suggestionsA.map((location) => (
                  <button
                    key={`${location.name}-${location.lat}`}
                    onClick={() => handleSelectLocation(location, 'A')}
                    className="w-full px-4 py-3 text-left hover:bg-zinc-700"
                  >
                    {location.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Location B */}
          <div className="relative">
            <label className="text-xs text-zinc-400 mb-1 block">Friend's Location</label>
            <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2 border border-zinc-700">
              <MapPin size={16} className="text-red-500" />
              <input
                value={locB}
                onChange={(e) => {
                  setLocB(e.target.value);
                  setActiveField('B');
                }}
                placeholder="Search location..."
                className="bg-transparent flex-1 outline-none text-sm"
              />
              {locB && <X size={16} onClick={() => clearLocation('B')} />}
            </div>

            {activeField === 'B' && suggestionsB.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-lg z-50">
                {suggestionsB.map((location) => (
                  <button
                    key={`${location.name}-${location.lat}`}
                    onClick={() => handleSelectLocation(location, 'B')}
                    className="w-full px-4 py-3 text-left hover:bg-zinc-700"
                  >
                    {location.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {coordsA && coordsB && (
            <button
              onClick={handleFindMeetingPoint}
              className="w-full bg-emerald-600 hover:bg-emerald-700 py-2 rounded-lg"
            >
              Find Meeting Point
            </button>
          )}

          {loadingMeet && (
            <p className="text-sm text-zinc-400 mt-2">
              Finding best meeting spots...
            </p>
          )}

          {meetResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-semibold">Top 5 Meeting Spots</h3>

              {meetResults.map((place, index) => (
                <div
                  key={place.id}
                  onClick={() => setSelectedMeet(place)}
                  className={`p-3 rounded-lg cursor-pointer ${
                    selectedMeet?.id === place.id
                      ? "bg-emerald-700"
                      : "bg-zinc-800 hover:bg-zinc-700"
                  }`}
                >
                  <div className="font-medium">
                    {index === 0 && "⭐ "}
                    {place.name}
                  </div>
                  <div className="text-xs text-zinc-400">
                    You: {place.travelTimeA} min | Friend: {place.travelTimeB} min
                  </div>
                  <div className="text-xs text-zinc-500">
                    Difference: {place.difference} min
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
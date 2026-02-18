import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, X } from 'lucide-react';
import { Header } from './Header';
import { RealMap } from './Map';

interface LocationResult {
  name: string;
  lat: number;
  lng: number;
}

// Function to fetch suggestions from backend
const fetchLocationSuggestions = async (query: string) => {
  try {
    const response = await fetch(`http://localhost:5001/api/search?q=${encodeURIComponent(query)}`);

    if (!response.ok) return [];

    const data = await response.json();
    return data;
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
  const buffer=10;//10 minutes buffer in midpoint

  const [coordsA, setCoordsA] = useState<LocationResult | null>(null);
  const [coordsB, setCoordsB] = useState<LocationResult | null>(null);

  const [activeField, setActiveField] = useState<'A' | 'B' | null>(null);

  const [suggestionsA, setSuggestionsA] = useState<LocationResult[]>([]);
  const [suggestionsB, setSuggestionsB] = useState<LocationResult[]>([]);

  const [equidistantPoints, setEquidistantPoints] = useState<{ lat: number; lng: number }[]>([]);

  useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedA(locA);
  }, 400);

  return () => clearTimeout(timer);
}, [locA]);

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedB(locB);
  }, 400);

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

  const handleInputChangeA = (value: string) => {
    setLocA(value);
    setActiveField('A');
  };

  const handleInputChangeB = (value: string) => {
    setLocB(value);
    setActiveField('B');
  };

  const handleSelectLocation = (location: LocationResult, type: 'A' | 'B')  => {
    console.log('Selected location:', location, 'Type:', type);
    console.log('Coordinates:', { lat: location.lat, lng: location.lng });
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

    console.log('Sending to backend:', { coordsA, coordsB });
    console.log('Point A coordinates:', { lat: coordsA.lat, lng: coordsA.lng });
    console.log('Point B coordinates:', { lat: coordsB.lat, lng: coordsB.lng });
    const response = await fetch("http://localhost:5001/api/meet/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pointA: { lat: coordsA.lat, lng: coordsA.lng },
        pointB: { lat: coordsB.lat, lng: coordsB.lng },
      }),
    });

    const data = await response.json();
    console.log('Meeting point response:', data);
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
      
      {/* Map Background */}
      <div className="absolute inset-0 -z-0">
        <RealMap 
          markers={[
            ...(coordsA ? [{ lat: coordsA.lat, lng: coordsA.lng, name: locA, color: 'green' }] : []),
            ...(coordsB ? [{ lat: coordsB.lat, lng: coordsB.lng, name: locB, color: 'red' }] : []),
            ...equidistantPoints.map((point) => ({ lat: point.lat, lng: point.lng, name: 'Equidistant', color: 'blue' })),
          ]}
        />
      </div>

      {/* Search Container */}
      <div className="absolute top-[80px] left-0 right-0 z-50 px-4 pt-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl p-4 space-y-4">
          
          {/* Location A */}
          <div className="relative">
            <label className="text-xs text-zinc-400 font-medium mb-1 block">Your Location</label>
            <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2 border border-zinc-700">
              <MapPin size={16} className="text-emerald-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search location..."
                value={locA}
                onChange={(e) => handleInputChangeA(e.target.value)}
                className="bg-transparent flex-1 outline-none text-sm text-zinc-100 placeholder:text-zinc-500"
              />
              {locA && (
                <X 
                  size={16} 
                  className="cursor-pointer text-zinc-500 hover:text-zinc-300 flex-shrink-0"
                  onClick={() => clearLocation('A')} 
                />
              )}
            </div>

            {/* Suggestions Dropdown A - Opaque */}
            {activeField === 'A' && suggestionsA.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-lg z-50">
                {suggestionsA.map((location) => (
                  <button
                    key={`${location.name}-${location.lat}`}
                    onClick={() => handleSelectLocation(location, 'A')}
                    className="w-full px-4 py-3 text-left text-sm text-zinc-100 hover:bg-zinc-700 transition-colors flex items-center gap-2 border-b border-zinc-700 last:border-b-0"
                  >
                    <MapPin size={14} className="text-emerald-500 flex-shrink-0" />
                    <span>{location.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Location B */}
          <div className="relative">
            <label className="text-xs text-zinc-400 font-medium mb-1 block">Friend's Location</label>
            <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2 border border-zinc-700">
              <MapPin size={16} className="text-red-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search location..."
                value={locB}
                onChange={(e) => handleInputChangeB(e.target.value)}
                className="bg-transparent flex-1 outline-none text-sm text-zinc-100 placeholder:text-zinc-500"
              />
              {locB && (
                <X 
                  size={16} 
                  className="cursor-pointer text-zinc-500 hover:text-zinc-300 flex-shrink-0"
                  onClick={() => clearLocation('B')} 
                />
              )}
            </div>

            {/* Suggestions Dropdown B - Opaque */}
            {activeField === 'B' && suggestionsB.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-lg z-50">
                {suggestionsB.map((location) => (
                  <button
                    key={`${location.name}-${location.lat}`}
                    onClick={() => handleSelectLocation(location, 'B')}
                    className="w-full px-4 py-3 text-left text-sm text-zinc-100 hover:bg-zinc-700 transition-colors flex items-center gap-2 border-b border-zinc-700 last:border-b-0"
                  >
                    <MapPin size={14} className="text-red-500 flex-shrink-0" />
                    <span>{location.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {coordsA && coordsB && (
            <button 
              onClick={handleFindMeetingPoint}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition-colors text-sm mt-4"
            >
              Find Meeting Point
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
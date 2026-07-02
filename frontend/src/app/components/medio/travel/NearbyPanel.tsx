import React, { useEffect, useMemo, useState } from "react";
import { Building2, Coffee, Dumbbell, Fuel, Hospital, Landmark, ParkingCircle, ShoppingBasket, Utensils } from "lucide-react";

export type NearbyPlace = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  category: string;
};

type NearbyPanelProps = {
  center: { lat: number; lng: number } | null;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  onPlacesChange: (places: NearbyPlace[]) => void;
};

type OverpassElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const categories = [
  { id: "cafes", label: "Cafes", Icon: Coffee, query: `node["amenity"="cafe"]` },
  { id: "restaurants", label: "Restaurants", Icon: Utensils, query: `node["amenity"~"restaurant|fast_food"]` },
  { id: "gyms", label: "Gyms", Icon: Dumbbell, query: `node["leisure"="fitness_centre"]` },
  { id: "hospitals", label: "Hospitals", Icon: Hospital, query: `node["amenity"~"hospital|clinic"]` },
  { id: "grocery", label: "Grocery", Icon: ShoppingBasket, query: `node["shop"~"supermarket|convenience|grocery"]` },
  { id: "atm", label: "ATM", Icon: Landmark, query: `node["amenity"="atm"]` },
  { id: "fuel", label: "Fuel", Icon: Fuel, query: `node["amenity"="fuel"]` },
  { id: "parking", label: "Parking", Icon: ParkingCircle, query: `node["amenity"="parking"]` },
];

export const NearbyPanel: React.FC<NearbyPanelProps> = ({
  center,
  selectedCategory,
  onCategoryChange,
  onPlacesChange,
}) => {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const activeCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategory) || null,
    [selectedCategory]
  );

  useEffect(() => {
    if (!center || !activeCategory) {
      setPlaces([]);
      onPlacesChange([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setNotice("");

    const query = `
      [out:json][timeout:8];
      (
        ${activeCategory.query}(around:1800,${center.lat},${center.lng});
      );
      out center 18;
    `;

    fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
      headers: { "Content-Type": "text/plain" },
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { elements?: OverpassElement[] }) => {
        const nextPlaces = (data.elements || [])
          .map((item) => ({
            id: item.id,
            name: item.tags?.name || activeCategory.label,
            lat: item.lat ?? item.center?.lat,
            lng: item.lon ?? item.center?.lon,
            category: activeCategory.label,
          }))
          .filter((item): item is NearbyPlace => Number.isFinite(item.lat) && Number.isFinite(item.lng))
          .slice(0, 12);
        setPlaces(nextPlaces);
        onPlacesChange(nextPlaces);
        if (nextPlaces.length === 0) setNotice("No nearby places found for this category.");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setNotice("Nearby places are unavailable right now.");
          setPlaces([]);
          onPlacesChange([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [activeCategory, center, onPlacesChange]);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/72 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Explore nearby
          </p>
          <h3 className="text-sm font-black text-slate-100">
            Places around this route
          </h3>
        </div>
        <Building2 size={18} className="text-cyan-200" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map(({ id, label, Icon }) => {
          const active = selectedCategory === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onCategoryChange(active ? null : id)}
              aria-pressed={active}
              className={`flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition ${
                active
                  ? "bg-cyan-300 text-slate-950"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {loading && <p className="mt-3 text-sm text-slate-400">Finding nearby places...</p>}
      {notice && <p className="mt-3 text-sm text-slate-400">{notice}</p>}

      {places.length > 0 && (
        <div className="mt-3 grid gap-2">
          {places.slice(0, 5).map((place) => (
            <div key={place.id} className="rounded-2xl bg-slate-900/82 px-3 py-2">
              <p className="truncate text-sm font-bold text-slate-100">{place.name}</p>
              <p className="text-xs text-slate-500">{place.category}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNearbyPlaces = void 0;
const getNearbyPlaces = async (midpoint) => {
    if (!Number.isFinite(midpoint.lat) || !Number.isFinite(midpoint.lng)) {
        return [];
    }
    const query = `
  [out:json];
  (
    node["amenity"~"cafe|restaurant|bus_station"](around:8000,${midpoint.lat},${midpoint.lng});
    node["railway"~"station|subway_entrance"](around:8000,${midpoint.lat},${midpoint.lng});
    node["shop"="mall"](around:8000,${midpoint.lat},${midpoint.lng});
  );
  out body;
  `;
    const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
        headers: {
            "Content-Type": "text/plain",
            "User-Agent": "Medio/1.0 (nearby-place-search)"
        },
        signal: AbortSignal.timeout(5000)
    });
    const data = (await response.json());
    return data.elements.map((p) => ({
        id: p.id,
        name: p.tags?.name || "Unnamed place",
        lat: p.lat,
        lng: p.lon,
        tags: p.tags || {}
    }));
};
exports.getNearbyPlaces = getNearbyPlaces;
//# sourceMappingURL=osm.service.js.map
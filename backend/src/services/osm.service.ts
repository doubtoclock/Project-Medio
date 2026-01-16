type OsmElement = {
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements: OsmElement[];
};

export const getNearbyPlaces = async (midpoint: { lat: number; lng: number }) => {
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
      "Content-Type": "text/plain"
    }
  });

  const data = (await response.json()) as OverpassResponse;

  return data.elements.map((p) => ({
    id: p.id,
    name: p.tags?.name || "Unnamed place",
    lat: p.lat,
    lng: p.lon,
    tags: p.tags || {}
  }));
};

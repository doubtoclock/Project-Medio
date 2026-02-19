import axios from "axios";
import * as turf from "@turf/turf";
import { Feature, Geometry } from "geojson";

type OverpassPOI = {
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
};

export async function fetchMeetingPOIs(
  polygon: Feature<Geometry>
): Promise<OverpassPOI[]> {

  const bbox = turf.bbox(polygon);

  const query = `
  [out:json][timeout:15];
  (
    node["amenity"="cafe"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
    node["amenity"="restaurant"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
    node["shop"="mall"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
  );
  out body;
  `;

  try {
    const response = await axios.post(
      "https://overpass.kumi.systems/api/interpreter",
      query,
      { headers: { "Content-Type": "text/plain" } }
    );

    // 🔥 SAFETY CHECK
    if (!response.data || !response.data.elements) {
      console.error("Invalid Overpass response:", response.data);
      return [];
    }

    const pois: OverpassPOI[] = response.data.elements;

    return pois.filter((p: OverpassPOI) => {
      if (!p.lat || !p.lon) return false;

      const point = turf.point([p.lon, p.lat]);
      return turf.booleanPointInPolygon(point, polygon as any);
    });

  } catch (err: any) {
    console.error("Overpass request failed:", err.message);
    return [];
  }
}

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

  const south = bbox[1];
  const west = bbox[0];
  const north = bbox[3];
  const east = bbox[2];

  const query = `
  [out:json][timeout:25];

  (
    node["amenity"~"cafe|restaurant|fast_food|food_court|bar|pub"](${south},${west},${north},${east});
    node["amenity"~"library|college|university"](${south},${west},${north},${east});
    node["amenity"="park"](${south},${west},${north},${east});
    node["leisure"="park"](${south},${west},${north},${east});
    node["tourism"~"museum|attraction"](${south},${west},${north},${east});
    node["shop"="mall"](${south},${west},${north},${east});
  );

  out body;
  `;

  try {

    const response = await axios.post(
      "https://overpass.kumi.systems/api/interpreter",
      query,
      {
        headers: { "Content-Type": "text/plain" },
        timeout: 20000
      }
    );

    if (!response.data || !response.data.elements) {
      console.error("Invalid Overpass response:", response.data);
      return [];
    }

    const pois: OverpassPOI[] = response.data.elements;

    /* ==============================
       FILTER POIs INSIDE POLYGON
    =============================== */

    const filtered = pois.filter((p) => {

      if (!p.lat || !p.lon) return false;

      const point = turf.point([p.lon, p.lat]);

      return turf.booleanPointInPolygon(point, polygon as any);
    });

    console.log("Overpass returned:", pois.length);
    console.log("Inside polygon:", filtered.length);

    return filtered;

  } catch (err: any) {

    console.error("Overpass request failed:", err.message);

    return [];
  }
}
export interface OsmElement {
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  elements: OsmElement[];
}

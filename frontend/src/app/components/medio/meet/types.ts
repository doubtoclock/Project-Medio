export interface MeetResult {
  id: number;
  name: string;
  lat: number;
  lon: number;
  category?: string;
  travelTimeA: number;
  travelTimeB: number;
  difference: number;
  average: number;
  maxTravelTime?: number;
  score?: number;
  reason?: string;
}

export type RouteSide = "A" | "B";

export type MeetRouteStep = {
  mode: string;
  from?: string;
  to?: string;
  routeName?: string;
  duration: number;
};

export const CATEGORY_ORDER = [
  "Cafe",
  "Restaurant",
  "Food court",
  "Mall",
  "Park",
  "Garden",
  "Cinema",
  "Theatre",
  "Museum",
  "Gallery",
  "Library",
  "Bar",
  "Dessert",
  "Quick bite",
  "Bookstore",
  "Market",
  "Arts center",
  "Community center",
  "Bowling",
  "Sports",
  "Beach",
  "Hotel",
  "Attraction",
  "Campus",
  "Place",
];

export const getMeetCategory = (place: MeetResult) => place.category || "Place";

export const SERVICE_AREA_BOUNDS = {
  south: 18.88,
  west: 72.75,
  north: 19.33,
  east: 73.02,
};

export const SERVICE_AREA_QUERY = "Mumbai Mira Bhayandar";

export const SERVICE_AREA_NAMES = [
  "mumbai",
  "greater mumbai",
  "mumbai city",
  "mumbai suburban",
  "mira bhayandar",
  "mira-bhayandar",
  "mira road",
  "bhayandar",
];

export const normalizeServiceAreaText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export const isWithinServiceAreaBounds = ({
  lat,
  lng,
  lon,
}: {
  lat: number;
  lng?: number;
  lon?: number;
}) => {
  const longitude = lng ?? lon;
  return (
    typeof longitude === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(longitude) &&
    lat >= SERVICE_AREA_BOUNDS.south &&
    lat <= SERVICE_AREA_BOUNDS.north &&
    longitude >= SERVICE_AREA_BOUNDS.west &&
    longitude <= SERVICE_AREA_BOUNDS.east
  );
};

export const hasServiceAreaName = (parts: Array<string | undefined>) => {
  const haystack = normalizeServiceAreaText(parts.filter(Boolean).join(" "));
  return SERVICE_AREA_NAMES.some((name) => haystack.includes(name));
};

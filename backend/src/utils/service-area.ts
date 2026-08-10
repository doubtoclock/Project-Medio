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
  "mira bhayander",
  "mira-bhayander",
  "mira road",
  "miraroad",
  "bhayandar",
  "bhayander",
  "kashimira",
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
  if (!haystack) return false;

  const matchesServiceName = (name: string) => haystack.includes(name);

  if (matchesServiceName("navi mumbai")) {
    return SERVICE_AREA_NAMES.some(
      (name) => name !== "mumbai" && matchesServiceName(name)
    );
  }

  return SERVICE_AREA_NAMES.some(matchesServiceName);
};

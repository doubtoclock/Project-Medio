export type ServiceAreaBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type ServiceAreaConfig = {
  id: string;
  label: string;
  photonQuery: string;
  bounds: ServiceAreaBounds;
  acceptedNames: string[];
};

export const SERVICE_AREAS: ServiceAreaConfig[] = [
  {
    id: "mumbai-mira-bhayandar",
    label: "Mumbai and Mira Bhayandar",
    photonQuery: "Mumbai Mira Bhayandar",
    bounds: {
      south: 18.88,
      west: 72.75,
      north: 19.33,
      east: 73.02,
    },
    acceptedNames: [
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
    ],
  },
];

export const DEFAULT_SERVICE_AREA = SERVICE_AREAS[0];

export const SERVICE_AREA_BOUNDS = DEFAULT_SERVICE_AREA.bounds;

export const SERVICE_AREA_QUERY = DEFAULT_SERVICE_AREA.photonQuery;

export const SERVICE_AREA_NAMES = DEFAULT_SERVICE_AREA.acceptedNames;

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
  serviceArea = DEFAULT_SERVICE_AREA,
}: {
  lat: number;
  lng?: number;
  lon?: number;
  serviceArea?: ServiceAreaConfig;
}) => {
  const longitude = lng ?? lon;
  return (
    typeof longitude === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(longitude) &&
    lat >= serviceArea.bounds.south &&
    lat <= serviceArea.bounds.north &&
    longitude >= serviceArea.bounds.west &&
    longitude <= serviceArea.bounds.east
  );
};

export const hasServiceAreaName = (
  parts: Array<string | undefined>,
  serviceArea = DEFAULT_SERVICE_AREA
) => {
  const haystack = normalizeServiceAreaText(parts.filter(Boolean).join(" "));
  if (!haystack) return false;

  const matchesServiceName = (name: string) => haystack.includes(name);

  if (matchesServiceName("navi mumbai")) {
    return serviceArea.acceptedNames.some(
      (name) => name !== "mumbai" && matchesServiceName(name)
    );
  }

  return serviceArea.acceptedNames.some(matchesServiceName);
};

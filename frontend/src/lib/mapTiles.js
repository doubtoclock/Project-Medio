const CARTO_BASEMAPS_KEY =
  import.meta.env.VITE_CARTO_BASEMAPS_KEY || "cb1_3yvy_1_93a066d8fc07c861e20712b8";

const withKey = (url) =>
  `${url}${url.includes("?") ? "&" : "?"}key=${CARTO_BASEMAPS_KEY}`;

export const CARTO_DARK_TILE_URL = withKey(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
);

export const CARTO_ATTRIBUTION =
  '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const TILE_SUBDOMAINS = ["a", "b", "c", "d"];
const loadedTiles = new Set();

const lonToTileX = (lng, zoom) =>
  Math.floor(((lng + 180) / 360) * 2 ** zoom);

const latToTileY = (lat, zoom) => {
  const radians = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) *
      2 ** zoom
  );
};

const getTileUrl = (x, y, zoom) =>
  CARTO_DARK_TILE_URL
    .replace("{s}", TILE_SUBDOMAINS[Math.abs(x + y + zoom) % TILE_SUBDOMAINS.length])
    .replace("{z}", String(zoom))
    .replace("{x}", String(x))
    .replace("{y}", String(y))
    .replace("{r}", window.devicePixelRatio > 1 ? "@2x" : "");

export const preloadMapTiles = (
  center = { lat: 19.0760, lng: 72.8777 },
  zoom = 13,
  radius = 1
) => {
  if (typeof window === "undefined" || typeof Image === "undefined") return;

  const centerX = lonToTileX(center.lng, zoom);
  const centerY = latToTileY(center.lat, zoom);

  for (let x = centerX - radius; x <= centerX + radius; x += 1) {
    for (let y = centerY - radius; y <= centerY + radius; y += 1) {
      const url = getTileUrl(x, y, zoom);
      if (loadedTiles.has(url)) continue;
      loadedTiles.add(url);
      const image = new Image();
      image.decoding = "async";
      image.src = url;
    }
  }
};

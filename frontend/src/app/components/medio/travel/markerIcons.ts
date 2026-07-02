import L from "leaflet";

export type MarkerRole =
  | "origin"
  | "destination"
  | "user"
  | "meeting"
  | "nearby"
  | "currentLocation";

type RoleConfig = {
  defaultColor: string;
  size: [number, number];
  inner: "dot" | "star";
};

const ROLE_CONFIG: Record<MarkerRole, RoleConfig> = {
  origin: { defaultColor: "#22C55E", size: [28, 38], inner: "dot" },
  destination: { defaultColor: "#EF4444", size: [28, 38], inner: "dot" },
  user: { defaultColor: "#3B82F6", size: [28, 38], inner: "dot" },
  meeting: { defaultColor: "#F59E0B", size: [28, 38], inner: "star" },
  nearby: { defaultColor: "#64748B", size: [22, 30], inner: "dot" },
  currentLocation: { defaultColor: "#0EA5E9", size: [34, 34], inner: "dot" },
};

const pinSvg = (color: string, w: number, h: number, dotR: number): string => {
  const cx = w / 2;
  const tipY = h - 1;
  const topY = 2;
  const mid = cx;
  const left = topY;
  const right = w - topY;
  const curveX = cx - 7;
  const curveY = cx - 2;
  const lowerCurveY = cx + 11;

  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <path d="M${mid} ${topY}
      C${curveX} ${topY} ${left} ${curveY} ${left} ${mid + 2}
      C${left} ${lowerCurveY} ${mid} ${tipY - 2} ${mid} ${tipY}
      C${mid} ${tipY - 2} ${right} ${lowerCurveY} ${right} ${mid + 2}
      C${right} ${curveY} ${curveX + 14} ${topY} ${mid} ${topY}Z"
      fill="${color}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="${mid}" cy="${mid + 2}" r="${dotR}" fill="#fff"/>
  </svg>`;
};

const starPinSvg = (w: number, h: number): string => {
  const cx = w / 2;
  const topY = 2;
  const mid = cx;
  const left = topY;
  const right = w - topY;
  const curveX = cx - 7;
  const curveY = cx - 2;
  const lowerCurveY = cx + 11;

  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <path d="M${mid} ${topY}
      C${curveX} ${topY} ${left} ${curveY} ${left} ${mid + 2}
      C${left} ${lowerCurveY} ${mid} ${h - topY} ${mid} ${h - topY}
      C${mid} ${h - topY} ${right} ${lowerCurveY} ${right} ${mid + 2}
      C${right} ${curveY} ${curveX + 14} ${topY} ${mid} ${topY}Z"
      fill="#F59E0B" stroke="#fff" stroke-width="1.5"/>
    <text x="${mid}" y="${mid + 4}" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">&#9733;</text>
  </svg>`;
};

export const createMarkerIcon = (
  role: MarkerRole,
  options?: { color?: string; selected?: boolean }
): L.DivIcon => {
  const config = ROLE_CONFIG[role];
  const color = options?.color || config.defaultColor;
  const [w, h] = config.size;
  const selected = options?.selected ?? false;

  if (role === "currentLocation") {
    return L.divIcon({
      className: "medio-current-location",
      html: `<div class="medio-current-location__dot" style="background:${color};"></div>`,
      iconSize: [w, h],
      iconAnchor: [w / 2, h / 2],
    });
  }

  const isSmall = role === "nearby";
  const dotR = isSmall ? 2.5 : 4;
  const innerSvg = role === "meeting" ? starPinSvg(w, h) : pinSvg(color, w, h, dotR);

  return L.divIcon({
    className: selected ? "medio-marker-bounce" : "",
    html: `<div style="width:${w}px;height:${h}px;filter:drop-shadow(0 3px 7px rgba(0,0,0,0.35));">${innerSvg}</div>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
  });
};

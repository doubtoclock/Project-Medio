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

const starPoints = (cx: number, cy: number, r: number): string => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI / 5) - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.4;
    pts.push(`${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return pts.join(" ");
};

const pinSvg = (color: string, w: number, h: number, dotR: number): string => {
  const cx = w / 2;
  const tipY = h - 2;

  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <path d="M${cx} 2
    C${(cx - w * 0.32).toFixed(1)} 2 2 ${(cx - w * 0.18).toFixed(1)} 2 ${(cx - 1).toFixed(1)}
    C2 ${(cx + 9).toFixed(1)} ${cx} ${tipY} ${cx} ${tipY}
    C${cx} ${tipY} ${(w - 2).toFixed(1)} ${(cx + 9).toFixed(1)} ${(w - 2).toFixed(1)} ${(cx - 1).toFixed(1)}
    C${(w - 2).toFixed(1)} ${(cx - w * 0.18).toFixed(1)} ${(cx + w * 0.32).toFixed(1)} 2 ${cx} 2Z"
    fill="${color}" stroke="#fff" stroke-width="1.5"/>
  <circle cx="${cx}" cy="${(cx - 1).toFixed(1)}" r="${dotR}" fill="#fff"/>
</svg>`;
};

const starPinSvg = (w: number, h: number): string => {
  const cx = w / 2;
  const tipY = h - 2;

  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <path d="M${cx} 2
    C${(cx - w * 0.32).toFixed(1)} 2 2 ${(cx - w * 0.18).toFixed(1)} 2 ${(cx - 1).toFixed(1)}
    C2 ${(cx + 9).toFixed(1)} ${cx} ${tipY} ${cx} ${tipY}
    C${cx} ${tipY} ${(w - 2).toFixed(1)} ${(cx + 9).toFixed(1)} ${(w - 2).toFixed(1)} ${(cx - 1).toFixed(1)}
    C${(w - 2).toFixed(1)} ${(cx - w * 0.18).toFixed(1)} ${(cx + w * 0.32).toFixed(1)} 2 ${cx} 2Z"
    fill="#F59E0B" stroke="#fff" stroke-width="1.5"/>
  <polygon points="${starPoints(cx, cx - 1, calcDotR(cx))}" fill="#fff" stroke="none"/>
</svg>`;
};

const calcDotR = (cx: number) => Math.max(3, cx * 0.36);

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

  const dotRadius = role === "nearby" ? 2.5 : 4;
  const innerSvg = role === "meeting" ? starPinSvg(w, h) : pinSvg(color, w, h, dotRadius);

  return L.divIcon({
    className: selected ? "medio-marker-bounce" : "",
    html: `<div style="width:${w}px;height:${h}px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.3));">${innerSvg}</div>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
  });
};

const transportLineColors: Record<string, string> = {
  L1: "#2563eb",
  M1: "#2563eb",
  "LINE 1": "#2563eb",
  L2A: "#facc15",
  M2A: "#facc15",
  "LINE 2A": "#facc15",
  L3: "#06b6d4",
  M3: "#06b6d4",
  "LINE 3": "#06b6d4",
  L7: "#ef4444",
  M7: "#ef4444",
  "LINE 7": "#ef4444",
  CENTRAL: "#c62828",
  CL: "#c62828",
  HARBOUR: "#2e7d32",
  HARBOR: "#2e7d32",
  HL: "#2e7d32",
  WESTERN: "#1565c0",
  WL: "#1565c0",
  BUS: "#f97316",
  WALK: "#8b5cf6",
  RAIL: "#64748b",
  SUBWAY: "#14b8a6",
  TRAM: "#db2777",
  FERRY: "#0ea5e9",
  BICYCLE: "#84cc16",
};

const getMetroLineColor = (mode: string, routeName: string) => {
  const normalizedMode = (mode || "").toUpperCase();
  const normalizedRoute = (routeName || "")
    .toUpperCase()
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const compactRoute = normalizedRoute.replace(/[^A-Z0-9]/g, "");
  const isMetro =
    normalizedMode === "SUBWAY" ||
    normalizedRoute.includes("METRO") ||
    compactRoute.startsWith("M");

  if (!isMetro) return null;

  if (
    normalizedRoute.includes("YELLOW") ||
    /\b(?:LINE\s*)?(?:L|M)?\s*2\s*A\b/.test(normalizedRoute) ||
    ["2A", "L2A", "M2A", "LINE2A", "METRO2A"].includes(compactRoute)
  ) {
    return "#facc15";
  }

  if (
    normalizedRoute.includes("RED") ||
    /\b(?:LINE\s*)?(?:L|M)?\s*7\b/.test(normalizedRoute) ||
    ["7", "L7", "M7", "LINE7", "METRO7"].includes(compactRoute)
  ) {
    return "#ef4444";
  }

  if (
    normalizedRoute.includes("AQUA") ||
    /\b(?:LINE\s*)?(?:L|M)?\s*3\b/.test(normalizedRoute) ||
    ["3", "L3", "M3", "LINE3", "METRO3"].includes(compactRoute)
  ) {
    return "#06b6d4";
  }

  if (
    normalizedRoute.includes("BLUE") ||
    /\b(?:LINE\s*)?(?:L|M)?\s*1\b/.test(normalizedRoute) ||
    ["1", "L1", "M1", "LINE1", "METRO1"].includes(compactRoute)
  ) {
    return "#2563eb";
  }

  return null;
};

export const getTransportColor = (mode: string, routeName: string) => {
  const normalizedMode = (mode || "").toUpperCase();
  const normalizedRoute = (routeName || "").toUpperCase();
  const metroLineColor = getMetroLineColor(normalizedMode, normalizedRoute);

  if (metroLineColor) return metroLineColor;

  return (
    transportLineColors[normalizedRoute] ||
    transportLineColors[normalizedRoute.replace(/\s+LINE$/, "")] ||
    transportLineColors[normalizedMode] ||
    "#475569"
  );
};

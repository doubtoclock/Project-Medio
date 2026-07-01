const transportLineColors: Record<string, string> = {
  // Metro Lines
  L1: "#1565C0",
  M1: "#1565C0",
  "LINE 1": "#1565C0",
  L2A: "#FDD835",
  M2A: "#FDD835",
  "LINE 2A": "#FDD835",
  L3: "#26C6DA",
  M3: "#26C6DA",
  "LINE 3": "#26C6DA",
  L4: "#43A047",
  M4: "#43A047",
  "LINE 4": "#43A047",
  L6: "#EC407A",
  M6: "#EC407A",
  "LINE 6": "#EC407A",
  L7: "#D32F2F",
  M7: "#D32F2F",
  "LINE 7": "#D32F2F",
  L9: "#6D4C41",
  M9: "#6D4C41",
  "LINE 9": "#6D4C41",

  // Local Train Lines
  CENTRAL: "#6A1B9A",
  CL: "#6A1B9A",
  HARBOUR: "#6A1B9A",
  HARBOR: "#6A1B9A",
  HL: "#6A1B9A",
  WESTERN: "#6A1B9A",
  WL: "#6A1B9A",

  // Transport Modes
  BUS: "#E53935",
  WALK: "#4CAF50",
  RAIL: "#6A1B9A",
  SUBWAY: "#1565C0",
  TRAM: "#26C6DA",
  FERRY: "#0ea5e9",
  BICYCLE: "#FF9800",
  CAR: "#1976D2",
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

  const linePatterns: [RegExp, string[], string][] = [
    [/YELLOW/, ["2A", "L2A", "M2A", "LINE2A", "METRO2A", "LINE2A"], "#FDD835"],
    [/RED/, ["7", "L7", "M7", "LINE7", "METRO7", "LINE7"], "#D32F2F"],
    [/AQUA/, ["3", "L3", "M3", "LINE3", "METRO3", "LINE3"], "#26C6DA"],
    [/BLUE/, ["1", "L1", "M1", "LINE1", "METRO1", "LINE1"], "#1565C0"],
    [/GREEN/, ["4", "L4", "M4", "LINE4", "METRO4", "LINE4"], "#43A047"],
    [/PINK/, ["6", "L6", "M6", "LINE6", "METRO6", "LINE6"], "#EC407A"],
    [/BROWN/, ["9", "L9", "M9", "LINE9", "METRO9", "LINE9"], "#6D4C41"],
  ];

  for (const [nameRegex, compactForms, color] of linePatterns) {
    if (
      nameRegex.test(normalizedRoute) ||
      compactForms.includes(compactRoute) ||
      new RegExp(`\\b(?:LINE\\s*)?(?:L|M)?\\s*${compactForms[0]}\\b`).test(normalizedRoute)
    ) {
      return color;
    }
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

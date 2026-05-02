import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KML_PATH = process.argv[2] || "C:\\Users\\achal\\Downloads\\b34111da-5b73-45e9-82d0-78da9d153b1c.kml";
const OUTPUT_DIR = process.argv[3] || path.join(REPO_ROOT, "otp-project", "otp-data", "GTFS-bus-test");
const CACHE_DIR = path.join(REPO_ROOT, "tmp", "transitrun-cache");
const FEED_START_DATE = "20260101";
const FEED_END_DATE = "20271231";
const FEED_VERSION = "20260502-bus";

const AGENCIES = [
  {
    agencyId: "BEST_AC",
    agencyName: "Best AC Buses",
    agencyUrl: "https://www.bestundertaking.com/",
    sourceUrl: "https://transitrun.com/en/public-transit-lines_BEST+AC+Buses_4744",
  },
  {
    agencyId: "BEST",
    agencyName: "Best Bus",
    agencyUrl: "https://www.bestundertaking.com/",
    sourceUrl: "https://transitrun.com/en/public-transit-lines_BEST+bus_4743",
  },
  {
    agencyId: "BEST_CHALO",
    agencyName: "Best Chalo Premium Bus Service",
    agencyUrl: "https://chalo.com/",
    sourceUrl: "https://transitrun.com/en/public-transit-lines_BEST+Chalo+Premium+Bus+Service_4746",
  },
  {
    agencyId: "BEST_NIGHT",
    agencyName: "Best Night Bus",
    agencyUrl: "https://www.bestundertaking.com/",
    sourceUrl: "https://transitrun.com/en/public-transit-lines_BEST+Night+Bus_4745",
  },
];

const DAY_BITS = {
  Mon: [1, 0, 0, 0, 0, 0, 0],
  Tue: [0, 1, 0, 0, 0, 0, 0],
  Wed: [0, 0, 1, 0, 0, 0, 0],
  Thu: [0, 0, 0, 1, 0, 0, 0],
  Fri: [0, 0, 0, 0, 1, 0, 0],
  Sat: [0, 0, 0, 0, 0, 1, 0],
  Sun: [0, 0, 0, 0, 0, 0, 1],
};

const ENTITY_MAP = {
  amp: "&",
  quot: "\"",
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
  ndash: "-",
  mdash: "-",
};

const GENERIC_STOP_TOKENS = new Set([
  "A",
  "AND",
  "AT",
  "BUS",
  "CENTRE",
  "CENTER",
  "CHOWK",
  "COLONY",
  "DEPOT",
  "E",
  "EAST",
  "EXTENSION",
  "HOSPITAL",
  "JUNCTION",
  "MANDIR",
  "MARG",
  "MARKET",
  "NAGAR",
  "NEAR",
  "OFFICE",
  "POST",
  "RAILWAY",
  "ROAD",
  "SCHOOL",
  "STATION",
  "STOP",
  "TEMPLE",
  "W",
  "WEST",
]);

function decodeEntities(value) {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 16))).replace(/u0027/g, "'").replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_, entity) => {
    if (entity[0] === "#") {
      const radix = entity[1]?.toLowerCase() === "x" ? 16 : 10;
      const code = Number.parseInt(entity.replace(/^#x?/i, ""), radix);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    }
    return ENTITY_MAP[entity] ?? _;
  });
}

function asciiDisplay(value) {
  let text = decodeEntities(value).normalize("NFKC");
  text = text
    .split("/")
    .filter((part) => !/[\u0080-\uFFFF]/.test(part))
    .join("/");
  text = text.replace(/[^\x20-\x7E]/g, " ");
  return text.replace(/\s*\/\s*/g, " / ").replace(/\s+/g, " ").replace(/\s+-\s+/g, " - ").trim();
}

function mixedCaseRouteShortName(value) {
  return asciiDisplay(value).replace(/[A-Z]{2,}/g, (segment) => {
    if (/^\d+$/.test(segment)) return segment;
    return `${segment[0]}${segment.slice(1).toLowerCase()}`;
  });
}

function stripTags(value) {
  return decodeEntities(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

async function writeCsv(filename, header, rows) {
  const body = [header, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\r\n");
  await fs.writeFile(path.join(OUTPUT_DIR, filename), `${body}\r\n`, "utf8");
}

function hashText(value) {
  return crypto.createHash("sha1").update(value).digest("hex");
}

async function fetchCached(url) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const filename = path.join(CACHE_DIR, `${hashText(url)}.html`);
  try {
    return await fs.readFile(filename, "utf8");
  } catch {
    // Continue with network fetch.
  }

  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "Medio GTFS generator (+https://transitrun.com/)",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      const text = await response.text();
      await fs.writeFile(filename, text, "utf8");
      return text;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 700));
    }
  }
  throw lastError;
}

function absoluteTransitRunUrl(href) {
  return new URL(decodeEntities(href), "https://transitrun.com").toString();
}

function parseAgencyRoutes(html) {
  const links = [];
  const seen = new Set();
  const listMatch = html.match(/<ul class="list">([\s\S]*?)<\/ul>/);
  const source = listMatch?.[1] ?? html;
  const anchorRe = /<a\s+href="([^"]*public-transit-line_[^"]+)"[\s\S]*?<\/a>/g;
  for (const match of source.matchAll(anchorRe)) {
    const anchor = match[0];
    const href = absoluteTransitRunUrl(match[1]);
    if (seen.has(href)) continue;
    seen.add(href);
    const span = anchor.match(/<span>([\s\S]*?)<\/span>/)?.[1];
    const strong = anchor.match(/<strong>([\s\S]*?)<\/strong>/)?.[1];
    links.push({
      url: href,
      shortName: stripTags(span ?? ""),
      listLongName: stripTags(strong ?? ""),
    });
  }
  return links;
}

function parseRoutePage(html, routeListEntry) {
  const h1 = stripTags(html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? routeListEntry.shortName);
  const h2 = stripTags(html.match(/<h2>([\s\S]*?)<\/h2>/)?.[1] ?? routeListEntry.listLongName);
  const stopsBlock = html.match(/<ul class="route">([\s\S]*?)<\/ul>/)?.[1] ?? "";
  const stops = [...stopsBlock.matchAll(/<h3>([\s\S]*?)<\/h3>/g)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean);

  const schedule = [];
  const tableBlock = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
  for (const row of tableBlock.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map((cell) => stripTags(cell[1]));
    if (cells.length >= 3) {
      schedule.push({
        day: cells[0],
        hours: cells[1],
        frequency: cells[2],
      });
    }
  }

  return {
    sourceUrl: routeListEntry.url,
    shortName: mixedCaseRouteShortName(h1.replace(/\s+Line$/i, "").trim() || routeListEntry.shortName),
    longName: asciiDisplay(h2 || routeListEntry.listLongName),
    stops: stops.map(asciiDisplay).filter(Boolean),
    schedule,
  };
}

function removeIndicText(value) {
  return value
    .split("/")
    .filter((part) => !/[\u0080-\uFFFF]/.test(part))
    .join(" ");
}

function normalizeName(value) {
  let text = decodeEntities(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  text = removeIndicText(text);
  text = text
    .replace(/\bDR\s*\.?\s*/g, "DOCTOR ")
    .replace(/\bSTN\s*\.?\b/g, "STATION")
    .replace(/\bST\s*\.?\b/g, "SAINT")
    .replace(/\bRD\s*\.?\b/g, "ROAD")
    .replace(/\bRLY\s*\.?\b/g, "RAILWAY")
    .replace(/\bJN\s*\.?\b/g, "JUNCTION")
    .replace(/\bJCT\s*\.?\b/g, "JUNCTION")
    .replace(/\bT T\b/g, "TT")
    .replace(/\bC S M T\b/g, "CSMT")
    .replace(/\bC S T\b/g, "CST")
    .replace(/\bB K C\b/g, "BKC")
    .replace(/\bA P M C\b/g, "APMC")
    .replace(/\bW E H\b/g, "WEH")
    .replace(/\bMAHATMA GANDHI\b/g, "MG")
    .replace(/\bSWAMI DAYANAND\b/g, "SWAMI DYANAND")
    .replace(/\bSHYAMAPRASAD\b/g, "SHYAMA PRASAD")
    .replace(/\bMUKHERJEE\b/g, "MUKHERJI")
    .replace(/\bMANDIR\b/g, "TEMPLE")
    .replace(/\bNGR\b/g, "NAGAR")
    .replace(/\bCHKY\b/g, "CHOWKY")
    .replace(/\bCHK\b/g, "CHOWK")
    .replace(/\bPT\b/g, "PANDIT")
    .replace(/\bBUS DEPOT\b/g, "DEPOT")
    .replace(/\bBUS STATION\b/g, "STATION")
    .replace(/\bRAILWAY STATION\b/g, "STATION")
    .replace(/\bRLY STATION\b/g, "STATION")
    .replace(/\bCOLONY BUS STATION\b/g, "COLONY STATION")
    .replace(/\bBUS STOP\b/g, "STOP");
  text = text.replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  return text;
}

function compactName(value) {
  return normalizeName(value).replace(/\s+/g, "");
}

function nameVariants(value) {
  const variants = new Set();
  const source = decodeEntities(value).trim();
  const withoutIndic = removeIndicText(source);
  const withoutParens = withoutIndic.replace(/\([^)]*\)/g, " ");
  const parens = [...withoutIndic.matchAll(/\(([^)]*)\)/g)].map((match) => match[1]).join(" ");
  const beforeSlash = source.split("/")[0];

  for (const item of [source, withoutIndic, withoutParens, beforeSlash]) {
    const normalized = normalizeName(item);
    if (normalized) variants.add(normalized);
  }

  if (parens) {
    const reordered = `${parens} ${withoutParens}`;
    const normalized = normalizeName(reordered);
    if (normalized) variants.add(normalized);
  }

  for (const variant of [...variants]) {
    const tokens = variant.split(" ");
    if (tokens.length > 2 && tokens.includes("DEPOT")) {
      variants.add(tokens.filter((token) => token !== "DEPOT").join(" "));
    }
    if (tokens.length > 2 && tokens.includes("STATION")) {
      variants.add(tokens.filter((token) => token !== "STATION").join(" "));
    }
  }
  return [...variants].filter(Boolean);
}

function tokenSet(value) {
  return new Set(
    normalizeName(value)
      .split(" ")
      .filter((token) => token.length > 1 && !GENERIC_STOP_TOKENS.has(token))
  );
}

function diceScore(aTokens, bTokens) {
  if (!aTokens.size || !bTokens.size) return 0;
  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }
  return (2 * overlap) / (aTokens.size + bTokens.size);
}

function parseKmlStops(kmlText) {
  const exact = new Map();
  const candidates = [];
  let index = 0;

  for (const placemark of kmlText.matchAll(/<Placemark>([\s\S]*?)<\/Placemark>/g)) {
    const block = placemark[1];
    const name = stripTags(block.match(/<name>\s*([\s\S]*?)\s*<\/name>/)?.[1] ?? "");
    const coordinates = stripTags(block.match(/<coordinates>\s*([\s\S]*?)\s*<\/coordinates>/)?.[1] ?? "");
    const parts = coordinates.split(",").map((part) => Number.parseFloat(part));
    if (!name || parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
      continue;
    }
    const stop = {
      kmlId: `KML_${index += 1}`,
      kmlName: name,
      lon: parts[0],
      lat: parts[1],
      tokens: tokenSet(name),
    };
    candidates.push(stop);
    for (const variant of nameVariants(name)) {
      if (!exact.has(variant)) exact.set(variant, stop);
      exact.set(compactName(variant), stop);
    }
  }

  return { exact, candidates };
}

function matchStop(stopName, kmlIndex) {
  for (const variant of nameVariants(stopName)) {
    const direct = kmlIndex.exact.get(variant) ?? kmlIndex.exact.get(compactName(variant));
    if (direct) {
      return { stop: direct, method: "exact", score: 1 };
    }
  }

  const stopTokens = tokenSet(stopName);
  let best = null;
  let bestScore = 0;
  for (const candidate of kmlIndex.candidates) {
    const score = diceScore(stopTokens, candidate.tokens);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  const overlap = best ? [...stopTokens].filter((token) => best.tokens.has(token)).length : 0;
  if (best && bestScore >= 0.72 && overlap >= 2) {
    return { stop: best, method: "fuzzy", score: bestScore };
  }
  return null;
}

function parseClock(timeText) {
  const match = timeText.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2] ?? "0", 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (hour > 47 || minute > 59) return null;
  return hour * 3600 + minute * 60;
}

function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hour = Math.floor(seconds / 3600);
  const minute = Math.floor((seconds % 3600) / 60);
  const second = seconds % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

function parseHours(hoursText) {
  const text = hoursText.trim();
  if (/not operational/i.test(text)) return null;
  if (/24\s*hours/i.test(text)) return { start: 0, end: 24 * 3600 };
  const parts = text.split(/\s*-\s*/);
  if (parts.length !== 2) return null;
  const start = parseClock(parts[0]);
  let end = parseClock(parts[1]);
  if (start == null || end == null) return null;
  if (end <= start) end += 24 * 3600;
  return { start, end };
}

function parseHeadway(frequencyText) {
  if (/not operational/i.test(frequencyText)) return null;
  const values = [...frequencyText.matchAll(/\d+/g)].map((match) => Number.parseInt(match[0], 10));
  if (!values.length) return null;
  const minutes = Math.max(1, Math.round(values.reduce((sum, value) => sum + value, 0) / values.length));
  return minutes * 60;
}

function buildScheduleGroups(schedule) {
  const groups = new Map();
  for (const row of schedule) {
    const day = row.day.slice(0, 3);
    const dayBits = DAY_BITS[day];
    if (!dayBits) continue;
    const hours = parseHours(row.hours);
    const headway = parseHeadway(row.frequency);
    if (!hours || !headway) continue;
    const key = `${hours.start}|${hours.end}|${headway}`;
    if (!groups.has(key)) {
      groups.set(key, {
        start: hours.start,
        end: hours.end,
        headway,
        bits: [0, 0, 0, 0, 0, 0, 0],
      });
    }
    const group = groups.get(key);
    for (let i = 0; i < dayBits.length; i += 1) {
      group.bits[i] = Math.max(group.bits[i], dayBits[i]);
    }
  }
  return [...groups.values()].filter((group) => group.bits.some(Boolean) && group.end > group.start);
}

function distanceMeters(a, b) {
  const radius = 6371000;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

function segmentSeconds(a, b) {
  const meters = distanceMeters(a, b);
  const secondsAt18Kph = meters / 5;
  return Math.max(75, Math.min(900, Math.ceil(secondsAt18Kph / 15) * 15));
}

function routeIdFromUrl(agencyId, routeUrl) {
  const suffix = routeUrl.match(/_([^_/]+)$/)?.[1] ?? hashText(routeUrl).slice(0, 8);
  return `${agencyId}_${suffix}`;
}

function serviceIdFor(bits) {
  const labels = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
  const name = bits.map((bit, index) => (bit ? labels[index] : "")).filter(Boolean).join("_");
  return `BUS_${name}`;
}

async function main() {
  const kmlText = await fs.readFile(KML_PATH, "utf8");
  const kmlIndex = parseKmlStops(kmlText);
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const routeEntries = [];
  for (const agency of AGENCIES) {
    const html = await fetchCached(agency.sourceUrl);
    for (const entry of parseAgencyRoutes(html)) {
      routeEntries.push({ ...entry, agency });
    }
  }

  const routePages = [];
  const concurrency = 8;
  let cursor = 0;
  async function worker() {
    while (cursor < routeEntries.length) {
      const entry = routeEntries[cursor];
      cursor += 1;
      const html = await fetchCached(entry.url);
      routePages.push({ entry, route: parseRoutePage(html, entry) });
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  routePages.sort((a, b) => a.entry.url.localeCompare(b.entry.url));

  const usedStops = new Map();
  const services = new Map();
  const agencies = AGENCIES.map((agency) => [
    agency.agencyId,
    agency.agencyName,
    agency.agencyUrl,
    "Asia/Kolkata",
    "en",
  ]);
  const routes = [];
  const trips = [];
  const stopTimes = [];
  const frequencies = [];
  const skipped = [];
  const fuzzyMatches = [];
  const inferredStops = [];
  let stopCounter = 0;

  function getGtfsStop(stopName, coordinates) {
    const key = coordinates.key;
    if (usedStops.has(key)) return usedStops.get(key);
    const stopId = `BEST_STOP_${String(++stopCounter).padStart(5, "0")}`;
    const row = {
      stopId,
      stopName: asciiDisplay(stopName),
      lat: coordinates.lat.toFixed(6),
      lon: coordinates.lon.toFixed(6),
      sourceName: coordinates.sourceName ?? "",
    };
    usedStops.set(key, row);
    return row;
  }

  function inferCoordinate(stopName, index, matchedStops) {
    let prev = null;
    let next = null;
    for (let i = index - 1; i >= 0; i -= 1) {
      if (matchedStops[i]?.coordinates) {
        prev = { index: i, coordinates: matchedStops[i].coordinates };
        break;
      }
    }
    for (let i = index + 1; i < matchedStops.length; i += 1) {
      if (matchedStops[i]?.coordinates) {
        next = { index: i, coordinates: matchedStops[i].coordinates };
        break;
      }
    }
    let lat;
    let lon;
    if (prev && next) {
      const span = next.index - prev.index;
      const ratio = (index - prev.index) / span;
      lat = prev.coordinates.lat + (next.coordinates.lat - prev.coordinates.lat) * ratio;
      lon = prev.coordinates.lon + (next.coordinates.lon - prev.coordinates.lon) * ratio;
    } else if (prev) {
      lat = prev.coordinates.lat;
      lon = prev.coordinates.lon;
    } else if (next) {
      lat = next.coordinates.lat;
      lon = next.coordinates.lon;
    } else {
      return null;
    }
    const key = `INFER_${normalizeName(stopName)}_${lat.toFixed(5)}_${lon.toFixed(5)}`;
    return { key, lat, lon, sourceName: "inferred" };
  }

  for (const { entry, route } of routePages) {
    if (route.stops.length < 2) {
      skipped.push({ url: route.sourceUrl, reason: "fewer than two stops" });
      continue;
    }
    const scheduleGroups = buildScheduleGroups(route.schedule);
    if (!scheduleGroups.length) {
      skipped.push({ url: route.sourceUrl, reason: "no operating schedule" });
      continue;
    }

    const matchedStops = [];
    let matchedAnchorCount = 0;
    for (const stopName of route.stops) {
      const match = matchStop(stopName, kmlIndex);
      if (!match) {
        matchedStops.push({
          sourceName: stopName,
          coordinates: null,
        });
      } else {
        matchedAnchorCount += 1;
        if (match.method === "fuzzy") {
          fuzzyMatches.push({
            route: route.shortName,
            stopName,
            kmlName: match.stop.kmlName,
            score: Number(match.score.toFixed(3)),
          });
        }
        matchedStops.push({
          sourceName: stopName,
          coordinates: {
            key: match.stop.kmlId,
            lat: match.stop.lat,
            lon: match.stop.lon,
            sourceName: match.stop.kmlName,
          },
        });
      }
    }
    if (!matchedAnchorCount) {
      skipped.push({ url: route.sourceUrl, shortName: route.shortName, reason: "no KML coordinate anchors" });
      continue;
    }
    for (let i = 0; i < matchedStops.length; i += 1) {
      if (!matchedStops[i].coordinates) {
        const coordinates = inferCoordinate(matchedStops[i].sourceName, i, matchedStops);
        if (!coordinates) {
          skipped.push({ url: route.sourceUrl, shortName: route.shortName, reason: "unable to infer coordinates" });
          continue;
        }
        matchedStops[i].coordinates = coordinates;
        inferredStops.push({
          route: route.shortName,
          stopName: matchedStops[i].sourceName,
        });
      }
      matchedStops[i].gtfsStop = getGtfsStop(matchedStops[i].sourceName, matchedStops[i].coordinates);
      matchedStops[i].lat = matchedStops[i].coordinates.lat;
      matchedStops[i].lon = matchedStops[i].coordinates.lon;
    }

    const routeId = routeIdFromUrl(entry.agency.agencyId, route.sourceUrl);
    routes.push([
      routeId,
      entry.agency.agencyId,
      route.shortName,
      route.longName,
      3,
      route.sourceUrl,
    ]);

    const offsets = [0];
    for (let i = 1; i < matchedStops.length; i += 1) {
      offsets.push(offsets[i - 1] + segmentSeconds(matchedStops[i - 1], matchedStops[i]));
    }

    for (let groupIndex = 0; groupIndex < scheduleGroups.length; groupIndex += 1) {
      const group = scheduleGroups[groupIndex];
      const serviceId = serviceIdFor(group.bits);
      if (!services.has(serviceId)) services.set(serviceId, group.bits);
      const tripId = `${routeId}_${groupIndex + 1}`;
      const lastStopName = asciiDisplay(matchedStops.at(-1).sourceName);
      trips.push([routeId, serviceId, tripId, lastStopName, ""]);
      frequencies.push([tripId, formatTime(group.start), formatTime(group.end), group.headway, 0]);
      for (let i = 0; i < matchedStops.length; i += 1) {
        const time = formatTime(group.start + offsets[i]);
        stopTimes.push([tripId, time, time, matchedStops[i].gtfsStop.stopId, i + 1, 1]);
      }
    }
  }

  const stopRows = [...usedStops.values()]
    .sort((a, b) => a.stopId.localeCompare(b.stopId))
    .map((stop) => [stop.stopId, stop.stopName, stop.lat, stop.lon, 0]);
  const serviceRows = [...services.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([serviceId, bits]) => [serviceId, ...bits, FEED_START_DATE, FEED_END_DATE]);

  routes.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  trips.sort((a, b) => String(a[2]).localeCompare(String(b[2])));
  stopTimes.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || Number(a[4]) - Number(b[4]));
  frequencies.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  await writeCsv("agency.txt", ["agency_id", "agency_name", "agency_url", "agency_timezone", "agency_lang"], agencies);
  await writeCsv("stops.txt", ["stop_id", "stop_name", "stop_lat", "stop_lon", "location_type"], stopRows);
  await writeCsv("routes.txt", ["route_id", "agency_id", "route_short_name", "route_long_name", "route_type", "route_url"], routes);
  await writeCsv("calendar.txt", ["service_id", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "start_date", "end_date"], serviceRows);
  await writeCsv("trips.txt", ["route_id", "service_id", "trip_id", "trip_headsign", "direction_id"], trips);
  await writeCsv("stop_times.txt", ["trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence", "timepoint"], stopTimes);
  await writeCsv("frequencies.txt", ["trip_id", "start_time", "end_time", "headway_secs", "exact_times"], frequencies);
  await writeCsv("feed_info.txt", ["feed_publisher_name", "feed_publisher_url", "feed_lang", "feed_contact_url", "feed_start_date", "feed_end_date", "feed_version"], [[
    "Mumbai BEST bus routes from TransitRun",
    "https://transitrun.com/en/public-transit_Mumbai_524",
    "en",
    "https://transitrun.com/en/public-transit_Mumbai_524",
    FEED_START_DATE,
    FEED_END_DATE,
    FEED_VERSION,
  ]]);

  const metadata = {
    generatedAt: new Date().toISOString(),
    kmlPath: KML_PATH,
    outputDir: OUTPUT_DIR,
    sourceAgencies: AGENCIES.map(({ agencyName, sourceUrl }) => ({ agencyName, sourceUrl })),
    routePagesDiscovered: routeEntries.length,
    routesWritten: routes.length,
    stopsWritten: stopRows.length,
    tripsWritten: trips.length,
    stopTimesWritten: stopTimes.length,
    frequenciesWritten: frequencies.length,
    skippedRoutes: skipped.length,
    skippedRouteSamples: skipped.slice(0, 50),
    fuzzyMatchCount: fuzzyMatches.length,
    fuzzyMatchSamples: fuzzyMatches.slice(0, 50),
    inferredStopCount: inferredStops.length,
    inferredStopSamples: inferredStops.slice(0, 50),
  };
  await fs.writeFile(`${OUTPUT_DIR}-generation-report.json`, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(metadata, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import React, { useMemo, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import polyline from "@mapbox/polyline";
import { getTransportColor } from "./transportColors";
import { createMarkerIcon } from "./travel/markerIcons";
import type { MarkerRole } from "./travel/markerIcons";
import type { OtpLeg, OtpRouteResponse } from "./otpTypes";

type RouteEntry = {
  routeData: OtpRouteResponse;
  selectedIndex?: number;
  color?: string;
  label?: string;
};

type MapMarker = {
  lat: number;
  lng: number;
  name: string;
  color?: string;
  kind?: MarkerRole;
  selected?: boolean;
};

type RealMapProps = {
  lat?: number;
  lng?: number;
  zoom?: number;
  markers?: MapMarker[];
  routeData?: OtpRouteResponse | null;
  selectedIndex?: number;
  multiRouteData?: RouteEntry[];
  currentLocation?: { lat: number; lng: number } | null;
};

type DecodedLine = {
  positions: [number, number][];
  mode: string;
  routeName: string;
  participantColor?: string;
  participantLabel?: string;
};

const MARKER_COLORS: Record<string, string> = {
  green: "#22C55E",
  red: "#EF4444",
  yellow: "#F59E0B",
  blue: "#3B82F6",
  purple: "#A855F7",
  orange: "#F97316",
};

const resolveColor = (color?: string) => {
  if (!color) return undefined;
  if (color.startsWith("#")) return color;
  return MARKER_COLORS[color.toLowerCase()] || color;
};

const getLegStyle = (mode: string, routeName: string, participantColor?: string) => {
  const normalizedMode = mode.toUpperCase();

  if (participantColor) {
    switch (normalizedMode) {
      case "WALK":
        return { color: participantColor, weight: 5, opacity: 0.8, dashArray: "10, 8" as const };
      case "BICYCLE":
        return { color: participantColor, weight: 5 };
      case "CAR":
        return { color: participantColor, weight: 6 };
      case "BUS":
        return { color: participantColor, weight: 6 };
      case "SUBWAY":
      case "RAIL":
        return {
          color: participantColor,
          weight: 7,
          lineCap: "round" as const,
          lineJoin: "round" as const,
        };
      default:
        return { color: participantColor, weight: 6 };
    }
  }

  switch (normalizedMode) {
    case "WALK":
      return { color: "#4CAF50", weight: 5, opacity: 0.8, dashArray: "10, 8" as const };
    case "BICYCLE":
      return { color: "#FF9800", weight: 5 };
    case "CAR":
      return { color: "#1976D2", weight: 6 };
    case "BUS":
      return { color: "#E53935", weight: 6 };
    case "SUBWAY":
    case "RAIL":
      return {
        color: getTransportColor(mode, routeName),
        weight: 7,
        lineCap: "round" as const,
        lineJoin: "round" as const,
      };
    default:
      return { color: getTransportColor(mode, routeName), weight: 6 };
  }
};

const isMetroLike = (mode: string) => {
  const m = mode.toUpperCase();
  return m === "SUBWAY" || m === "RAIL" || m === "TRAM";
};

// --- Bounds Controller ---
const BoundsController: React.FC<{ points: [number, number][] }> = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    if (bounds.isValid()) {
      map.flyToBounds(bounds, { padding: [76, 76], maxZoom: 16, duration: 1 });
    }
  }, [points, map]);

  return null;
};

// --- Legend ---
const MODE_LABELS: Record<string, string> = {
  WALK: "Walk",
  CAR: "Car",
  BICYCLE: "Bike",
  BUS: "Bus",
  SUBWAY: "Metro",
  RAIL: "Local Train",
  TRAM: "Tram",
  FERRY: "Ferry",
};

const Legend: React.FC<{
  items: Array<{ label: string; color: string; dashed?: boolean }>;
}> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        right: 20,
        zIndex: 1000,
        backgroundColor: "rgba(15, 23, 42, 0.92)",
        borderRadius: 12,
        padding: "10px 14px",
        border: "1px solid rgba(148, 163, 184, 0.2)",
        fontSize: 12,
        color: "#e2e8f0",
        fontFamily: "inherit",
        backdropFilter: "blur(8px)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        userSelect: "none",
      }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: i < items.length - 1 ? 5 : 0,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 20,
              height: item.dashed ? 0 : 4,
              borderTop: item.dashed ? `3px dashed ${item.color}` : undefined,
              borderRadius: 2,
              backgroundColor: item.dashed ? "transparent" : item.color,
              opacity: 0.9,
              flexShrink: 0,
            }}
          />
          <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

// --- Main Map Component ---
export const RealMap: React.FC<RealMapProps> = ({
  lat = 19.076,
  lng = 72.8777,
  zoom = 12,
  markers = [],
  routeData,
  selectedIndex = 0,
  multiRouteData,
  currentLocation,
}) => {
  const allLegs = useMemo(() => {
    const legs: DecodedLine[] = [];

    if (routeData) {
      const itinerary = routeData.data?.plan?.itineraries?.[selectedIndex];
      if (itinerary) {
        itinerary.legs?.forEach((leg: OtpLeg) => {
          if (leg?.legGeometry?.points) {
            const decoded = polyline.decode(leg.legGeometry.points);
            legs.push({
              positions: decoded as [number, number][],
              mode: leg.mode,
              routeName: (leg.route?.shortName || leg.route?.longName || "").toUpperCase(),
            });
          }
        });
      }
    }

    multiRouteData?.forEach((entry) => {
      const itinerary = entry.routeData.data?.plan?.itineraries?.[entry.selectedIndex ?? 0];
      if (itinerary) {
        itinerary.legs?.forEach((leg: OtpLeg) => {
          if (leg?.legGeometry?.points) {
            const decoded = polyline.decode(leg.legGeometry.points);
            legs.push({
              positions: decoded as [number, number][],
              mode: leg.mode,
              routeName: (leg.route?.shortName || leg.route?.longName || "").toUpperCase(),
              participantColor: entry.color,
              participantLabel: entry.label,
            });
          }
        });
      }
    });

    return legs;
  }, [routeData, selectedIndex, multiRouteData]);

  const boundsPoints = useMemo(() => {
    const pts: [number, number][] = [];
    markers.forEach((m) => pts.push([m.lat, m.lng]));
    if (currentLocation) pts.push([currentLocation.lat, currentLocation.lng]);
    allLegs.forEach((l) => l.positions.forEach((p) => pts.push(p)));
    return pts;
  }, [markers, currentLocation, allLegs]);

  const legendItems = useMemo(() => {
    if (allLegs.length === 0) return [];

    if (multiRouteData && multiRouteData.length > 0) {
      return multiRouteData
        .filter((e) => e.label && e.color)
        .map((e) => ({ label: e.label!, color: e.color!, dashed: false }));
    }

    const seen = new Set<string>();
    const items: Array<{ label: string; color: string; dashed?: boolean }> = [];
    allLegs.forEach((leg) => {
      const mode = leg.mode.toUpperCase();
      if (seen.has(mode)) return;
      seen.add(mode);
      const label = MODE_LABELS[mode] || mode;
      const dashed = mode === "WALK";
      const color = getTransportColor(leg.mode, leg.routeName);
      items.push({ label, color, dashed });
    });
    return items;
  }, [allLegs, multiRouteData]);

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        scrollWheelZoom
        className="w-full h-full"
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <BoundsController points={boundsPoints} />

        {/* Markers */}
        {markers.map((marker, idx) => (
          <Marker
            key={idx}
            position={[marker.lat, marker.lng]}
            icon={createMarkerIcon(marker.kind || "nearby", {
              color: resolveColor(marker.color),
              selected: marker.selected,
            })}
          >
            <Popup>{marker.name}</Popup>
          </Marker>
        ))}

        {currentLocation && (
          <Marker
            position={[currentLocation.lat, currentLocation.lng]}
            icon={createMarkerIcon("currentLocation")}
          >
            <Popup>Current location</Popup>
          </Marker>
        )}

        {/* Route lines */}
        {allLegs.map((leg, index) => {
          const style = getLegStyle(leg.mode, leg.routeName, leg.participantColor);

          return (
            <React.Fragment key={index}>
              {/* Glow layer for metro */}
              {isMetroLike(leg.mode) && (
                <Polyline
                  positions={leg.positions}
                  pathOptions={{
                    color: style.color,
                    weight: 14,
                    opacity: 0.15,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />
              )}
              <Polyline
                positions={leg.positions}
                pathOptions={style}
              />
            </React.Fragment>
          );
        })}
      </MapContainer>

      <Legend items={legendItems} />
    </div>
  );
};

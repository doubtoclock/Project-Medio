"use client";
import React, { useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import polyline from "@mapbox/polyline";

// Fix default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* Metro Line → Color Mapping */
const metroLineColors: Record<string, string> = {
  L1: "#2563eb",
  L2A: "#facc15",
  L3: "#06b6d4",
  L7: "#ef4444",
};

type RealMapProps = {
  lat?: number;
  lng?: number;
  zoom?: number;
  markers?: Array<{ lat: number; lng: number; name: string; color?: string }>;
  routeData?: any;
  selectedIndex?: number;
};

export const RealMap: React.FC<RealMapProps> = ({
  lat = 19.076,
  lng = 72.8777,
  zoom = 12,
  markers = [],
  routeData,
  selectedIndex = 0,
}) => {
  const decodedLines = useMemo(() => {
    const lines: {
      positions: [number, number][];
      mode: string;
      routeName: string;
    }[] = [];

    const plan = routeData?.data?.plan;
    if (!plan) return lines;

    const itinerary = plan.itineraries?.[selectedIndex];
    if (!itinerary) return lines;

    itinerary.legs.forEach((leg: any) => {
      if (leg?.legGeometry?.points) {
        const decoded = polyline.decode(leg.legGeometry.points);

        lines.push({
          positions: decoded as [number, number][],
          mode: leg.mode,
          routeName:
            (leg.route?.shortName || leg.route?.longName || "").toUpperCase(),
        });
      }
    });

    return lines;
  }, [routeData, selectedIndex]);

  return (
    <div className="w-full h-full">
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

        {/* Markers */}
        {markers.map((marker, idx) => (
          <Marker key={idx} position={[marker.lat, marker.lng]}>
            <Popup>{marker.name}</Popup>
          </Marker>
        ))}

        {/* Route lines */}
        {decodedLines.map((line, index) => (
          <Polyline
            key={index}
            positions={line.positions}
            pathOptions={{
              color:
                line.mode === "WALK"
                  ? "#a855f7"
                  : metroLineColors[line.routeName] || "#10b981",
              weight: 6,
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
};


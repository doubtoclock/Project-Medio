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
import { getTransportColor } from "./transportColors";
import type { OtpLeg, OtpRouteResponse } from "./otpTypes";

// Fix default marker icon issue
type DefaultIconPrototype = L.Icon.Default & { _getIconUrl?: unknown };
delete (L.Icon.Default.prototype as DefaultIconPrototype)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type RealMapProps = {
  lat?: number;
  lng?: number;
  zoom?: number;
  markers?: Array<{ lat: number; lng: number; name: string; color?: string }>;
  routeData?: OtpRouteResponse | null;
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

    itinerary.legs?.forEach((leg: OtpLeg) => {
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
              color: getTransportColor(line.mode, line.routeName),
              weight: 6,
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
};


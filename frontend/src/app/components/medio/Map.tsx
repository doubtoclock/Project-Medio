"use client";
import React, { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import polyline from "@mapbox/polyline";

// Fix default marker icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
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
  routeData?: any;
};

export const RealMap: React.FC<RealMapProps> = ({
  lat = 19.0760,
  lng = 72.8777,
  zoom = 12,
  markers = [],
  routeData,
}) => {

  const decodedLines = useMemo(() => {
    const lines: [number, number][][] = [];

    // 🔥 GraphQL structure
    const plan = routeData?.data?.plan;

    if (!plan) return lines;

    if (plan.itineraries && plan.itineraries.length > 0) {
      const legs = plan.itineraries[0].legs;

      legs.forEach((leg: any) => {
        if (leg?.legGeometry?.points) {
          const decoded = polyline.decode(leg.legGeometry.points);
          lines.push(decoded as [number, number][]);
        }
      });
    }

    return lines;
  }, [routeData]);

  return (
    <div className="absolute inset-0">
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution="©️ OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Markers */}
        {markers.map((marker, idx) => (
          <Marker key={idx} position={[marker.lat, marker.lng]}>
            <Popup>{marker.name}</Popup>
          </Marker>
        ))}

        {/* Route */}
        {decodedLines.map((line, index) => (
          <Polyline
            key={index}
            positions={line}
            pathOptions={{ color: "#10b981", weight: 5 }}
          />
        ))}
      </MapContainer>
    </div>
  );
};
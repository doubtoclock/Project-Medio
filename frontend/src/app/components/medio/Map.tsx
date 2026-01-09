"use client";
import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

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
};

export const RealMap: React.FC<RealMapProps> = ({
  lat = 19.0760,   // default: Mumbai
  lng = 72.8777,
  zoom = 12,
}) => {
  return (
    <div className="absolute inset-0">
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full"
      >
        {/* OpenStreetMap tiles */}
        <TileLayer
          attribution='© OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Example marker */}
        <Marker position={[lat, lng]}>
          <Popup>
            You are here 📍
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};
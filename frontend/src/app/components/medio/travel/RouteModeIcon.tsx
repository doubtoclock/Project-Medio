import React from "react";
import { Bike, BusFront, Car, Footprints, TrainFront } from "lucide-react";
import { normalizeMode } from "./routeUtils";

type RouteModeIconProps = {
  mode: string;
  className?: string;
  size?: number;
};

export const RouteModeIcon: React.FC<RouteModeIconProps> = ({
  mode,
  className,
  size = 15,
}) => {
  const normalizedMode = normalizeMode(mode);

  if (normalizedMode === "WALK") return <Footprints size={size} className={className} />;
  if (normalizedMode === "CAR") return <Car size={size} className={className} />;
  if (normalizedMode === "BICYCLE") return <Bike size={size} className={className} />;
  if (normalizedMode === "BUS") return <BusFront size={size} className={className} />;
  return <TrainFront size={size} className={className} />;
};

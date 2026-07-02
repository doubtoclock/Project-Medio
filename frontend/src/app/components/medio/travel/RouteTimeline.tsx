import React from "react";
import type { OtpItinerary, OtpLeg } from "../otpTypes";
import { getTransportColor } from "../transportColors";
import {
  formatDistance,
  getLegDurationMinutes,
  getLegRouteName,
  modeLabels,
  normalizeMode,
} from "./routeUtils";
import { RouteModeIcon } from "./RouteModeIcon";

type RouteTimelineProps = {
  itinerary?: OtpItinerary;
};

export const RouteTimeline: React.FC<RouteTimelineProps> = ({ itinerary }) => {
  const legs = itinerary?.legs || [];

  if (legs.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-400">
        Select a route to see the full timeline.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-100">Route timeline</h3>
        <span className="text-xs font-semibold text-slate-400">
          {legs.length} steps
        </span>
      </div>

      <div className="space-y-2">
        {legs.map((leg, index) => (
          <TimelineStep key={`${leg.mode}-${index}`} leg={leg} isLast={index === legs.length - 1} />
        ))}
        <div className="flex gap-3 rounded-2xl bg-emerald-400/10 px-3 py-3 text-sm text-emerald-100">
          <span className="grid size-8 place-items-center rounded-full bg-emerald-400 text-slate-950">
            <RouteModeIcon mode="WALK" size={14} />
          </span>
          <div className="min-w-0">
            <p className="font-bold">Destination</p>
            <p className="truncate text-xs text-emerald-100/70">
              {legs[legs.length - 1]?.to?.name || "Arrive"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const TimelineStep = ({ leg, isLast }: { leg: OtpLeg; isLast: boolean }) => {
  const mode = normalizeMode(leg.mode);
  const routeName = getLegRouteName(leg);
  const color = getTransportColor(leg.mode, routeName);
  const label = modeLabels[mode] || leg.mode;

  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
      <div className="relative flex justify-center">
        <span
          className="z-10 grid size-8 place-items-center rounded-full border-2 border-white/80 text-white shadow-lg"
          style={{ backgroundColor: color }}
        >
          <RouteModeIcon mode={leg.mode} size={14} />
        </span>
        {!isLast && (
          <span
            className={`absolute top-8 h-[calc(100%+0.5rem)] w-0.5 ${mode === "WALK" ? "border-l-2 border-dashed" : ""}`}
            style={{ backgroundColor: mode === "WALK" ? "transparent" : color, borderColor: color }}
          />
        )}
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/72 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-100">
              {label}
              {mode !== "WALK" && routeName ? ` - ${routeName}` : ""}
            </p>
            <p className="mt-1 truncate text-xs text-slate-400">
              {leg.from?.name || "Start"} to {leg.to?.name || "next stop"}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-slate-800 px-2 py-1 text-xs font-bold text-slate-200">
            {getLegDurationMinutes(leg)} min
          </span>
        </div>
        {Number.isFinite(leg.distance) && (
          <p className="mt-2 text-xs text-slate-500">{formatDistance(leg.distance)} total</p>
        )}
      </div>
    </div>
  );
};

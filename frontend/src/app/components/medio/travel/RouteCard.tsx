import React from "react";
import { ArrowRight, IndianRupee, Route, Shuffle, Timer } from "lucide-react";
import type { OtpItinerary } from "../otpTypes";
import {
  formatDistance,
  formatDuration,
  getRouteMetrics,
  getRouteTags,
  getTransportSequence,
} from "./routeUtils";
import { RouteModeIcon } from "./RouteModeIcon";

type RouteCardProps = {
  itinerary: OtpItinerary;
  index: number;
  itineraries: OtpItinerary[];
  selected: boolean;
  onSelect: () => void;
};

export const RouteCard: React.FC<RouteCardProps> = ({
  itinerary,
  index,
  itineraries,
  selected,
  onSelect,
}) => {
  const metrics = getRouteMetrics(itinerary);
  const modes = getTransportSequence(itinerary);
  const tags = getRouteTags(itineraries, index);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-[1.45rem] border p-4 text-left transition-all duration-300 ${
        selected
          ? "border-primary/70 bg-primary/10 text-slate-100 shadow-lg ring-4 ring-primary/15"
          : "border-slate-800 bg-slate-900/80 text-slate-100 shadow-lg hover:border-slate-500/60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {modes.map((mode, modeIndex) => (
              <React.Fragment key={`${mode}-${modeIndex}`}>
                <span
                  className={`grid size-8 place-items-center rounded-full ${
                    selected ? "bg-primary/10 text-primary" : "bg-slate-800 text-slate-200"
                  }`}
                >
                  <RouteModeIcon mode={mode} />
                </span>
                {modeIndex < modes.length - 1 && (
                  <ArrowRight size={13} className={selected ? "text-slate-400" : "text-slate-500"} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                  selected ? "bg-primary/10 text-primary" : "bg-cyan-400/10 text-cyan-200"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-2xl font-black tracking-tight">
            {formatDuration(itinerary.duration)}
          </p>
          <p className={selected ? "text-xs text-slate-500" : "text-xs text-slate-400"}>
            Option {index + 1}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
        <Metric
          selected={selected}
          icon={<IndianRupee size={13} />}
          label="Fare"
          value={metrics.fare > 0 ? `₹${metrics.fare}` : "Free"}
        />
        <Metric
          selected={selected}
          icon={<Route size={13} />}
          label="Walk"
          value={formatDistance(metrics.walkingMeters)}
        />
        <Metric
          selected={selected}
          icon={<Shuffle size={13} />}
          label="Transfers"
          value={String(metrics.transfers)}
        />
        <Metric
          selected={selected}
          icon={<Timer size={13} />}
          label="Stops"
          value={String(metrics.stops)}
        />
      </div>
    </button>
  );
};

const Metric = ({
  icon,
  label,
  value,
  selected,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  selected: boolean;
}) => (
  <div
    className={`min-w-0 rounded-2xl px-2 py-2 ${
      selected ? "bg-slate-100 text-slate-950" : "bg-slate-900/90 text-slate-100"
    }`}
  >
    <div className={`flex items-center gap-1 ${selected ? "text-slate-500" : "text-slate-400"}`}>
      {icon}
      <span className="truncate">{label}</span>
    </div>
    <p className="mt-1 truncate font-bold">{value}</p>
  </div>
);

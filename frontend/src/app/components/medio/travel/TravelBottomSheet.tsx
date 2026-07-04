import React from "react";
import { ChevronDown, ChevronUp, IndianRupee, Route, Timer } from "lucide-react";
import type { OtpItinerary } from "../otpTypes";
import { RouteCard } from "./RouteCard";
import { RouteTimeline } from "./RouteTimeline";
import { TransportLegend } from "./TransportLegend";
import {
  formatDistance,
  formatDuration,
  getRouteMetrics,
  getTransportSequence,
} from "./routeUtils";
import { RouteModeIcon } from "./RouteModeIcon";

export type SheetState = "collapsed" | "half" | "full";

type TravelBottomSheetProps = {
  state: SheetState;
  itineraries: OtpItinerary[];
  selectedIndex: number | null;
  nearbyContent: React.ReactNode;
  onStateChange: (state: SheetState) => void;
  onSelectRoute: (index: number) => void;
};

export const TravelBottomSheet: React.FC<TravelBottomSheetProps> = ({
  state,
  itineraries,
  selectedIndex,
  nearbyContent,
  onStateChange,
  onSelectRoute,
}) => {
  const selectedItinerary =
    selectedIndex !== null ? itineraries[selectedIndex] : itineraries[0];
  const metrics = selectedItinerary ? getRouteMetrics(selectedItinerary) : null;
  const isFull = state === "full";
  const isHalf = state === "half";

  return (
    <section
      className={`fixed inset-x-0 bottom-0 z-[var(--ds-z-nav)] rounded-t-[var(--ds-radius-3xl)] transition-all duration-[var(--ds-duration-slow)] ease-[var(--ds-ease-out)]`}
      style={{
        backgroundColor: "var(--ds-bg-secondary)",
        border: "1px solid var(--ds-border-primary)",
        boxShadow: "0 -24px 80px rgba(0,0,0,0.45)",
        height: isFull ? "82vh" : isHalf ? "54vh" : "9.5rem",
      }}
      aria-label="Route details"
    >
      <div className="mx-auto flex h-full max-w-2xl flex-col px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-2">
        {/* Handle bar */}
        <button
          type="button"
          onClick={() => onStateChange(state === "collapsed" ? "half" : state === "half" ? "full" : "collapsed")}
          className="mx-auto mb-2 flex min-h-8 w-24 items-center justify-center rounded-full transition-colors"
          style={{ color: "var(--ds-text-tertiary)" }}
          aria-label="Change bottom sheet size"
        >
          <span className="h-1.5 w-12 rounded-full" style={{ backgroundColor: "var(--ds-border-strong)" }} />
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-[var(--ds-weight-black)] uppercase tracking-[var(--ds-tracking-wider)]" style={{ color: "var(--ds-accent)" }}>
              {itineraries.length > 0 ? `${itineraries.length} routes available` : "Ready when you are"}
            </p>
            <h2 className="mt-1 truncate text-xl font-[var(--ds-weight-black)] tracking-tight" style={{ color: "var(--ds-text-primary)" }}>
              {selectedItinerary ? formatDuration(selectedItinerary.duration) : "Choose a route"}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {selectedItinerary &&
              getTransportSequence(selectedItinerary).slice(0, 4).map((mode, index) => (
                <span
                  key={`${mode}-${index}`}
                  className="grid size-9 place-items-center rounded-full"
                  style={{ backgroundColor: "var(--ds-bg-tertiary)" }}
                >
                  <RouteModeIcon mode={mode} />
                </span>
              ))}
            <button
              type="button"
              onClick={() => onStateChange(state === "full" ? "half" : "full")}
              className="grid size-9 place-items-center rounded-full transition-colors"
              style={{ backgroundColor: "var(--ds-bg-tertiary)", color: "var(--ds-text-secondary)" }}
              aria-label={state === "full" ? "Collapse route details" : "Expand route details"}
            >
              {state === "full" ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <SummaryMetric icon={<IndianRupee size={14} />} label="Fare" value={metrics.fare ? `₹${metrics.fare}` : "Free"} />
            <SummaryMetric icon={<Route size={14} />} label="Walking" value={formatDistance(metrics.walkingMeters)} />
            <SummaryMetric icon={<Timer size={14} />} label="Transfers" value={String(metrics.transfers)} />
          </div>
        )}

        {/* Scrollable content */}
        <div className={`mt-4 min-h-0 flex-1 overflow-y-auto pr-1 ${state === "collapsed" ? "hidden" : "block"}`}>
          {itineraries.length > 0 ? (
            <div className="flex flex-col gap-3">
              {itineraries.map((itinerary, index) => (
                <RouteCard
                  key={index}
                  itinerary={itinerary}
                  index={index}
                  itineraries={itineraries}
                  selected={selectedIndex === index}
                  onSelect={() => onSelectRoute(index)}
                />
              ))}
            </div>
          ) : (
            <div
              className="rounded-[var(--ds-radius-2xl)] p-4"
              style={{ backgroundColor: "var(--ds-bg-tertiary)", border: "1px solid var(--ds-border-primary)" }}
            >
              <p className="text-sm font-[var(--ds-weight-semibold)]" style={{ color: "var(--ds-text-secondary)" }}>
                Set your origin and destination, then find a route. The map will stay active here.
              </p>
            </div>
          )}

          {isFull && (
            <div className="mt-5 space-y-4">
              <RouteTimeline itinerary={selectedItinerary} />
              <TransportLegend itinerary={selectedItinerary} />
              {nearbyContent}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const SummaryMetric = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div
    className="min-w-0 rounded-[var(--ds-radius-lg)] px-3 py-2"
    style={{ backgroundColor: "var(--ds-bg-tertiary)" }}
  >
    <div className="flex items-center gap-1.5 text-xs font-[var(--ds-weight-semibold)]" style={{ color: "var(--ds-text-tertiary)" }}>
      {icon}
      <span className="truncate">{label}</span>
    </div>
    <p className="mt-1 truncate text-sm font-[var(--ds-weight-black)]" style={{ color: "var(--ds-text-primary)" }}>
      {value}
    </p>
  </div>
);

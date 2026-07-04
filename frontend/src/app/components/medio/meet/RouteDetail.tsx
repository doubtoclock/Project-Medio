import { Route } from "lucide-react";
import { Card, CardBody } from "../../design/Card";
import { Loading } from "../../design/Loading";
import type { MeetResult, RouteSide, MeetRouteStep } from "./types";
import type { OtpItinerary } from "../otpTypes";

interface RouteDetailProps {
  selectedMeet: MeetResult;
  routeSide: RouteSide;
  itineraries: OtpItinerary[];
  selectedRouteIndex: number;
  setSelectedRouteIndex: (index: number) => void;
  routeSteps: MeetRouteStep[] | undefined;
  routeError: string;
  loadingRouteKey: string | null;
  getRouteKey: (side: RouteSide, place: MeetResult) => string;
}

const MODE_LABELS: Record<string, string> = {
  WALK: "Walk",
  SUBWAY: "Metro",
  BUS: "Bus",
  RAIL: "Train",
  TRAM: "Tram",
  BICYCLE: "Bicycle",
  CAR: "Car",
  FERRY: "Ferry",
};

const getModeLabel = (mode: string) =>
  MODE_LABELS[mode] || mode;

export function RouteDetail({
  selectedMeet,
  routeSide,
  itineraries,
  selectedRouteIndex,
  setSelectedRouteIndex,
  routeSteps,
  routeError,
  loadingRouteKey,
  getRouteKey,
}: RouteDetailProps) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-4 !py-4 !px-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="size-8 shrink-0 rounded-[var(--ds-radius-lg)] flex items-center justify-center"
              style={{ backgroundColor: "var(--ds-accent-soft)" }}
            >
              <Route size={16} style={{ color: "var(--ds-accent)" }} />
            </div>
            <div className="min-w-0">
              <p
                className="text-sm font-[var(--ds-weight-semibold)] truncate"
                style={{ color: "var(--ds-text-primary)" }}
              >
                User {routeSide} → {selectedMeet.name}
              </p>
              {loadingRouteKey !== getRouteKey(routeSide, selectedMeet) && itineraries.length > 0 && (
                <p className="text-xs mt-0.5" style={{ color: "var(--ds-text-tertiary)" }}>
                  {Math.round((itineraries[selectedRouteIndex]?.duration ?? 0) / 60)} min public route
                </p>
              )}
            </div>
          </div>

          {loadingRouteKey === getRouteKey(routeSide, selectedMeet) && (
            <Loading size="sm" />
          )}
        </div>

        {/* Itinerary options */}
        {itineraries.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {itineraries.map((itinerary: OtpItinerary, index: number) => (
              <button
                key={index}
                onClick={() => setSelectedRouteIndex(index)}
                className="shrink-0 h-8 px-3 rounded-[var(--ds-radius-lg)] text-xs font-[var(--ds-weight-medium)] transition-all duration-[var(--ds-duration-fast)]"
                style={{
                  backgroundColor:
                    selectedRouteIndex === index
                      ? "var(--ds-accent)"
                      : "var(--ds-bg-tertiary)",
                  color:
                    selectedRouteIndex === index
                      ? "var(--ds-accent-text)"
                      : "var(--ds-text-secondary)",
                }}
              >
                Option {index + 1} — {Math.round(itinerary.duration / 60)} min
              </button>
            ))}
          </div>
        )}

        {/* Route steps */}
        {routeSteps && (
          <div className="flex flex-col gap-2">
            {routeSteps.map((step: MeetRouteStep, index: number) => (
              <div
                key={index}
                className="rounded-[var(--ds-radius-lg)] p-3 text-sm flex flex-col gap-1.5"
                style={{ backgroundColor: "var(--ds-bg-tertiary)" }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-[var(--ds-weight-medium)] text-xs uppercase tracking-[var(--ds-tracking-wider)]"
                    style={{ color: "var(--ds-text-secondary)" }}
                  >
                    {getModeLabel(step.mode)}
                  </span>
                  <span
                    className="text-xs font-[var(--ds-weight-medium)]"
                    style={{ color: "var(--ds-success-text)" }}
                  >
                    ~{step.duration} min
                  </span>
                </div>

                {step.routeName && step.mode !== "WALK" && (
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[10px] font-[var(--ds-weight-semibold)] uppercase tracking-wide px-1.5 py-0.5 rounded-[var(--ds-radius-xs)]"
                      style={{
                        backgroundColor: "var(--ds-accent-soft)",
                        color: "var(--ds-accent)",
                      }}
                    >
                      {step.routeName}
                    </span>
                  </div>
                )}

                <div
                  className="text-xs flex items-center gap-1.5"
                  style={{ color: "var(--ds-text-tertiary)" }}
                >
                  <span>{step.from || "Start"}</span>
                  <span>→</span>
                  <span>{step.to || "End"}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Route error */}
        {routeError && (
          <div
            className="rounded-[var(--ds-radius-lg)] px-3 py-2.5 text-sm"
            style={{
              backgroundColor: "var(--ds-error-soft)",
              color: "var(--ds-error-text)",
            }}
          >
            {routeError}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

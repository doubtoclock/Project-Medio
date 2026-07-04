import React from "react";
import { ArrowLeft, Clock, MapPin, Navigation, Route, Share2, Star } from "lucide-react";
import { Button } from "../design/Button";
import { Badge } from "../design/Badge";
import { Card, CardBody } from "../design/Card";
import { SkeletonText } from "../design/Loading";
import type { MeetResult, RouteSide } from "./meet/types";
import { getMeetCategory } from "./meet/types";

interface DetailViewProps {
  place: MeetResult;
  routeSide: RouteSide;
  onClose: () => void;
  onShare: () => void;
  loading?: boolean;
}

export function DetailView({ place, routeSide, onClose, onShare, loading }: DetailViewProps) {
  if (loading) {
    return (
      <div className="fixed inset-0 z-[var(--ds-z-modal)] flex flex-col" style={{ backgroundColor: "var(--ds-bg-primary)" }}>
        <header className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button onClick={onClose} className="size-10 rounded-[var(--ds-radius-lg)] flex items-center justify-center" style={{ backgroundColor: "var(--ds-bg-tertiary)", color: "var(--ds-text-secondary)" }}>
            <ArrowLeft size={18} />
          </button>
        </header>
        <div className="flex-1 px-4 space-y-4 pt-4">
          <SkeletonText lines={2} />
          <div className="h-40 rounded-[var(--ds-radius-2xl)]" style={{ backgroundColor: "var(--ds-bg-tertiary)" }} />
          <SkeletonText lines={4} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[var(--ds-z-modal)] flex flex-col overflow-y-auto"
      style={{ backgroundColor: "var(--ds-bg-primary)" }}
      role="dialog"
      aria-modal="true"
      aria-label={place.name}
    >
      <style>{`
        @keyframes detail-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .detail-enter { animation: detail-fade-up 0.45s var(--ds-ease-out) both; }
        .detail-enter-d1 { animation-delay: 0.05s; }
        .detail-enter-d2 { animation-delay: 0.1s; }
        .detail-enter-d3 { animation-delay: 0.15s; }
        .detail-enter-d4 { animation-delay: 0.2s; }
      `}</style>

      {/* Hero section */}
      <div className="relative overflow-hidden" style={{ backgroundColor: "var(--ds-bg-secondary)" }}>
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            background: "radial-gradient(ellipse at 30% 20%, var(--ds-accent) 0%, transparent 60%)",
          }}
        />
        <header className="relative z-10 flex items-center gap-3 px-4 pt-4 pb-2">
          <button
            onClick={onClose}
            className="size-10 rounded-[var(--ds-radius-lg)] flex items-center justify-center transition-colors"
            style={{ backgroundColor: "var(--ds-bg-tertiary)", color: "var(--ds-text-secondary)" }}
            aria-label="Close"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="relative z-10 px-4 pb-6 detail-enter">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-12 rounded-[var(--ds-radius-xl)] flex items-center justify-center" style={{ backgroundColor: "var(--ds-accent-soft)" }}>
              <MapPin size={22} style={{ color: "var(--ds-accent)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-[var(--ds-weight-bold)] truncate" style={{ color: "var(--ds-text-primary)" }}>
                {place.name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={place.score && place.score > 7 ? "success" : "accent"}>
                  {getMeetCategory(place)}
                </Badge>
                {place.score && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: "var(--ds-text-tertiary)" }}>
                    <Star size={12} style={{ color: place.score > 7 ? "var(--ds-warning)" : "var(--ds-text-tertiary)" }} />
                    {place.score.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {place.reason && (
            <p className="text-sm mt-2 max-w-md" style={{ color: "var(--ds-text-secondary)" }}>
              {place.reason}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-4 space-y-4 pb-24">
        {/* Travel time summary */}
        <div className="detail-enter detail-enter-d1">
          <Card>
            <CardBody className="!py-4 !px-4">
              <p className="text-xs font-[var(--ds-weight-semibold)] uppercase tracking-[var(--ds-tracking-wider)] mb-3" style={{ color: "var(--ds-text-tertiary)" }}>
                Travel Time Summary
              </p>
              <div className="grid grid-cols-2 gap-3">
                <TimeBlock label="User A" value={place.travelTimeA} icon={<Clock size={14} />} />
                <TimeBlock label="User B" value={place.travelTimeB} icon={<Clock size={14} />} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-[var(--ds-radius-lg)] px-3 py-2.5 flex flex-col gap-1" style={{ backgroundColor: "var(--ds-bg-tertiary)" }}>
                  <span className="text-[10px] font-[var(--ds-weight-medium)]" style={{ color: "var(--ds-text-tertiary)" }}>Average</span>
                  <span className="text-base font-[var(--ds-weight-bold)]" style={{ color: "var(--ds-text-primary)" }}>
                    {place.average} <span className="text-[11px] font-[var(--ds-weight-regular)]" style={{ color: "var(--ds-text-tertiary)" }}>min</span>
                  </span>
                </div>
                <div className="rounded-[var(--ds-radius-lg)] px-3 py-2.5 flex flex-col gap-1" style={{ backgroundColor: "var(--ds-bg-tertiary)" }}>
                  <span className="text-[10px] font-[var(--ds-weight-medium)]" style={{ color: "var(--ds-text-tertiary)" }}>Gap</span>
                  <span
                    className="text-base font-[var(--ds-weight-bold)]"
                    style={{
                      color: place.difference <= 5 ? "var(--ds-success)" : place.difference <= 15 ? "var(--ds-warning)" : "var(--ds-error)",
                    }}
                  >
                    {place.difference} <span className="text-[11px] font-[var(--ds-weight-regular)]" style={{ color: "var(--ds-text-tertiary)" }}>min</span>
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Route info */}
        <div className="detail-enter detail-enter-d2">
          <Card>
            <CardBody className="!py-4 !px-4">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="size-8 rounded-[var(--ds-radius-lg)] flex items-center justify-center" style={{ backgroundColor: "var(--ds-accent-soft)" }}>
                  <Route size={16} style={{ color: "var(--ds-accent)" }} />
                </div>
                <div>
                  <p className="text-sm font-[var(--ds-weight-semibold)]" style={{ color: "var(--ds-text-primary)" }}>
                    Route from User {routeSide}
                  </p>
                  <p className="text-xs" style={{ color: "var(--ds-text-tertiary)" }}>
                    Public transport directions
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 detail-enter detail-enter-d3">
          <Button variant="primary" size="lg" fullWidth onClick={onShare}>
            <Share2 size={16} />
            Share
          </Button>
          <Button variant="secondary" size="lg" fullWidth onClick={() => {}}>
            <Navigation size={16} />
            Navigate
          </Button>
        </div>

        {/* Coordinates */}
        <div className="detail-enter detail-enter-d4">
          <div className="rounded-[var(--ds-radius-xl)] px-4 py-3 text-xs" style={{ backgroundColor: "var(--ds-bg-tertiary)", color: "var(--ds-text-tertiary)" }}>
            <span className="font-[var(--ds-weight-medium)]">Coordinates: </span>
            {place.lat.toFixed(5)}, {place.lon.toFixed(5)}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimeBlock({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-[var(--ds-radius-lg)] px-3 py-2.5 flex flex-col gap-1" style={{ backgroundColor: "var(--ds-bg-tertiary)" }}>
      <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--ds-text-tertiary)" }}>
        {icon}
        {label}
      </div>
      <span className="text-base font-[var(--ds-weight-bold)]" style={{ color: "var(--ds-text-primary)" }}>
        {value} <span className="text-[11px] font-[var(--ds-weight-regular)]" style={{ color: "var(--ds-text-tertiary)" }}>min</span>
      </span>
    </div>
  );
}

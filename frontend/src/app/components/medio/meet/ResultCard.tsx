import React from "react";
import { Clock } from "lucide-react";
import { Card, CardBody } from "../../design/Card";
import { Badge } from "../../design/Badge";
import type { MeetResult } from "./types";
import { getMeetCategory } from "./types";

interface ResultCardProps {
  place: MeetResult;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}

export function ResultCard({ place, index, isSelected, onClick, style }: ResultCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left outline-none"
      style={style}
    >
      <Card
        className={
          isSelected
            ? "border-[var(--ds-accent)] transition-all duration-[var(--ds-duration-normal)]"
            : "border-[var(--ds-border-primary)] transition-all duration-[var(--ds-duration-normal)] hover:border-[var(--ds-border-secondary)]"
        }
      >
        <CardBody className="flex flex-col gap-3 !py-3.5 !px-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="size-7 shrink-0 rounded-[var(--ds-radius-md)] flex items-center justify-center text-xs font-[var(--ds-weight-bold)] transition-colors duration-[var(--ds-duration-fast)]"
                style={{
                  backgroundColor: isSelected
                    ? "var(--ds-accent-soft)"
                    : "var(--ds-bg-tertiary)",
                  color: isSelected
                    ? "var(--ds-accent)"
                    : "var(--ds-text-secondary)",
                }}
              >
                {index + 1}
              </div>
              <div className="min-w-0">
                <p
                  className="truncate text-sm font-[var(--ds-weight-semibold)]"
                  style={{ color: "var(--ds-text-primary)" }}
                >
                  {place.name}
                </p>
                <p
                  className="mt-0.5 truncate text-xs"
                  style={{ color: "var(--ds-text-tertiary)" }}
                >
                  {getMeetCategory(place)}
                  {place.reason && ` — ${place.reason}`}
                </p>
              </div>
            </div>

            {isSelected && (
              <Badge variant="accent" dot>
                Selected
              </Badge>
            )}
          </div>

          {/* Travel time grid */}
          <div className="grid grid-cols-3 gap-2">
            <TravelTime label="User A" value={place.travelTimeA} />
            <TravelTime label="User B" value={place.travelTimeB} />
            <TravelGap value={place.difference} />
          </div>
        </CardBody>
      </Card>
    </button>
  );
}

function TravelTime({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-[var(--ds-radius-lg)] px-2.5 py-2 flex flex-col gap-0.5"
      style={{ backgroundColor: "var(--ds-bg-tertiary)" }}
    >
      <div
        className="flex items-center gap-1 text-[10px]"
        style={{ color: "var(--ds-text-tertiary)" }}
      >
        <Clock size={10} />
        {label}
      </div>
      <p
        className="text-sm font-[var(--ds-weight-semibold)]"
        style={{ color: "var(--ds-text-primary)" }}
      >
        {value}
        <span
          className="text-[10px] font-[var(--ds-weight-regular)] ml-0.5"
          style={{ color: "var(--ds-text-tertiary)" }}
        >
          min
        </span>
      </p>
    </div>
  );
}

function TravelGap({ value }: { value: number }) {
  return (
    <div
      className="rounded-[var(--ds-radius-lg)] px-2.5 py-2 flex flex-col gap-0.5"
      style={{ backgroundColor: "var(--ds-bg-tertiary)" }}
    >
      <span
        className="text-[10px]"
        style={{ color: "var(--ds-text-tertiary)" }}
      >
        Gap
      </span>
      <p
        className="text-sm font-[var(--ds-weight-semibold)]"
        style={{
          color:
            value <= 5
              ? "var(--ds-success)"
              : value <= 15
              ? "var(--ds-warning)"
              : "var(--ds-error)",
        }}
      >
        {value}
        <span
          className="text-[10px] font-[var(--ds-weight-regular)] ml-0.5"
          style={{ color: "var(--ds-text-tertiary)" }}
        >
          min
        </span>
      </p>
    </div>
  );
}

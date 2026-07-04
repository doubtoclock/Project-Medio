import React from "react";
import {
  ArrowRight,
  Bike,
  BusFront,
  Car,
  ChevronDown,
  Footprints,
  MapPin,
  Navigation,
  Plus,
  TrainFront,
  X,
} from "lucide-react";
import { Switch } from "../../ui/switch";
import { Button } from "../../design/Button";
import type { LocationResult } from "../../../lib/locationSearch";

export type SavedPlace = {
  _id: string;
  label: string;
  address: string;
  lat?: number;
  lng?: number;
};

export type TravelMode = "car" | "bike" | "local" | "walk";
export type LocalTransportMode = "bus" | "rail" | "subway";

type TravelSearchProps = {
  locA: string;
  locB: string;
  coordsA: LocationResult | null;
  coordsB: LocationResult | null;
  suggestionsA: LocationResult[];
  suggestionsB: LocationResult[];
  activeField: "A" | "B" | null;
  savedPlaces: SavedPlace[];
  travelMode: TravelMode;
  localTransport: Record<LocalTransportMode, boolean>;
  loading: boolean;
  canRequestRoute: boolean;
  routeNotice: string;
  onInputChange: (value: string, type: "A" | "B") => void;
  onFieldBlur: (type: "A" | "B") => void;
  onSelect: (location: LocationResult, type: "A" | "B") => void;
  onSavedPlaceClick: (place: SavedPlace) => void;
  onDeleteSavedPlace: (id: string, event: React.MouseEvent) => void;
  onAddPlace: () => void;
  onTravelModeChange: (mode: TravelMode) => void;
  onLocalTransportChange: (mode: LocalTransportMode, checked: boolean) => void;
  onRoute: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

const travelModeChoices: Array<{
  id: TravelMode;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
}> = [
  { id: "local", label: "Transit", Icon: TrainFront },
  { id: "car", label: "Car", Icon: Car },
  { id: "bike", label: "Bike", Icon: Bike },
  { id: "walk", label: "Walk", Icon: Footprints },
];

const localTransportChoices: Array<{
  id: LocalTransportMode;
  label: string;
  detail: string;
  color: string;
  Icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
}> = [
  { id: "bus", label: "Bus", detail: "BEST routes", color: "#e53935", Icon: BusFront },
  { id: "rail", label: "Local", detail: "Suburban rail", color: "#6a1b9a", Icon: TrainFront },
  { id: "subway", label: "Metro", detail: "Mumbai metro", color: "#1565c0", Icon: TrainFront },
];

type LocalTransportStyle = React.CSSProperties & {
  "--local-transport-color": string;
  "--local-transport-soft": string;
  "--local-transport-card": string;
};

export const TravelSearch: React.FC<TravelSearchProps> = ({
  locA,
  locB,
  coordsA,
  coordsB,
  suggestionsA,
  suggestionsB,
  activeField,
  savedPlaces,
  travelMode,
  localTransport,
  loading,
  canRequestRoute,
  routeNotice,
  onInputChange,
  onFieldBlur,
  onSelect,
  onSavedPlaceClick,
  onDeleteSavedPlace,
  onAddPlace,
  onTravelModeChange,
  onLocalTransportChange,
  onRoute,
  collapsed = false,
  onToggleCollapsed,
}) => {
  const hasLocalTransportMode = Object.values(localTransport).some(Boolean);

  return (
    <section className="pointer-events-none absolute inset-x-0 top-0 z-[var(--ds-z-fixed)] px-3 pt-[calc(0.85rem+env(safe-area-inset-top))] sm:px-4">
      <div className="pointer-events-auto mx-auto max-w-xl">
        {collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="ds-glass-strong w-full rounded-[var(--ds-radius-xl)] p-3 transition-all duration-[var(--ds-duration-normal)]"
            style={{ boxShadow: "var(--ds-shadow-lg)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm font-[var(--ds-weight-semibold)]" style={{ color: "var(--ds-text-primary)" }}>
                <span style={{ color: "var(--ds-success)" }} className="truncate">
                  {locA || "Origin"}
                </span>
                <ArrowRight size={14} style={{ color: "var(--ds-text-tertiary)" }} />
                <span style={{ color: "var(--ds-error)" }} className="truncate">
                  {locB || "Destination"}
                </span>
              </div>
              <ChevronDown size={16} style={{ color: "var(--ds-text-tertiary)" }} />
            </div>
          </button>
        ) : (
        <div
          className="ds-glass-strong rounded-[var(--ds-radius-2xl)] p-4"
          style={{ boxShadow: "var(--ds-shadow-xl)" }}
        >
          <div className="flex items-center justify-between gap-3 mb-3 pr-32">
            <div>
              <p className="text-xs font-[var(--ds-weight-bold)] uppercase tracking-[var(--ds-tracking-widest)]" style={{ color: "var(--ds-accent)" }}>
                Medio Travel
              </p>
              <h1 className="text-lg font-[var(--ds-weight-black)] tracking-tight" style={{ color: "var(--ds-text-primary)" }}>
                Navigate Mumbai
              </h1>
            </div>
          </div>

          {/* Saved places */}
          {savedPlaces.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
              {savedPlaces.map((place) => (
                <div key={place._id} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => onSavedPlaceClick(place)}
                    className="flex min-h-10 items-center gap-2 rounded-[var(--ds-radius-lg)] px-3 py-2 text-xs font-[var(--ds-weight-bold)] transition-all duration-[var(--ds-duration-fast)]"
                    style={{
                      backgroundColor: "var(--ds-bg-tertiary)",
                      border: "1px solid var(--ds-border-primary)",
                      color: "var(--ds-text-primary)",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--ds-accent)"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--ds-border-primary)"}
                  >
                    <MapPin size={14} style={{ color: "var(--ds-accent)" }} />
                    <span className="max-w-28 truncate">{place.label}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete saved place ${place.label}`}
                    onClick={(event) => onDeleteSavedPlace(place._id, event)}
                    className="absolute -right-1 -top-1 size-5 rounded-full flex items-center justify-center transition-colors"
                    style={{ backgroundColor: "var(--ds-bg-secondary)", color: "var(--ds-text-tertiary)" }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "var(--ds-error-text)"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "var(--ds-text-tertiary)"}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={onAddPlace}
                className="flex min-h-10 shrink-0 items-center gap-2 rounded-[var(--ds-radius-lg)] border border-dashed px-3 py-2 text-xs font-[var(--ds-weight-bold)] transition-all duration-[var(--ds-duration-fast)]"
                style={{
                  borderColor: "var(--ds-border-secondary)",
                  color: "var(--ds-text-secondary)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--ds-accent)";
                  e.currentTarget.style.color = "var(--ds-accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--ds-border-secondary)";
                  e.currentTarget.style.color = "var(--ds-text-secondary)";
                }}
              >
                <Plus size={15} style={{ color: "var(--ds-accent)" }} />
                Add
              </button>
            </div>
          )}

          {/* Location inputs */}
          <div className="flex flex-col gap-2 mb-3">
            <LocationInput
              value={locA}
              selected={Boolean(coordsA)}
              color="var(--ds-success)"
              placeholder="From"
              suggestions={activeField === "A" ? suggestionsA : []}
              onChange={(value) => onInputChange(value, "A")}
              onBlur={() => onFieldBlur("A")}
              onSelect={(location) => onSelect(location, "A")}
            />
            <LocationInput
              value={locB}
              selected={Boolean(coordsB)}
              color="var(--ds-error)"
              placeholder="To"
              suggestions={activeField === "B" ? suggestionsB : []}
              onChange={(value) => onInputChange(value, "B")}
              onBlur={() => onFieldBlur("B")}
              onSelect={(location) => onSelect(location, "B")}
            />
          </div>

          {/* Travel mode selector */}
          <div
            className="grid grid-cols-4 gap-1 rounded-[var(--ds-radius-lg)] p-1 mb-3"
            style={{ backgroundColor: "var(--ds-bg-tertiary)" }}
          >
            {travelModeChoices.map(({ id, label, Icon }) => {
              const active = travelMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onTravelModeChange(id)}
                  aria-pressed={active}
                  className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-[var(--ds-radius-md)] px-1 text-[11px] font-[var(--ds-weight-bold)] transition-all duration-[var(--ds-duration-fast)]"
                  style={{
                    backgroundColor: active ? "var(--ds-accent)" : "transparent",
                    color: active ? "var(--ds-accent-text)" : "var(--ds-text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = "var(--ds-bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <Icon size={17} />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Local transport toggles */}
          {travelMode === "local" && (
            <div className="flex flex-col gap-2 mb-3">
              {localTransportChoices.map(({ id, label, detail, color, Icon }) => {
                const enabled = localTransport[id];
                const style: LocalTransportStyle = {
                  "--local-transport-color": color,
                  "--local-transport-soft": `${color}33`,
                  "--local-transport-card": `${color}14`,
                };

                return (
                  <div
                    key={id}
                    className={`local-transport-card flex items-center justify-between gap-2 rounded-[var(--ds-radius-lg)] px-3 py-2 ${
                      enabled ? "local-transport-card--active" : ""
                    }`}
                    style={{
                      ...style,
                      border: enabled ? `1px solid ${color}40` : "1px solid var(--ds-border-primary)",
                      backgroundColor: enabled ? `${color}14` : "var(--ds-bg-tertiary)",
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full" style={{ backgroundColor: color }}>
                        <Icon size={15} style={{ color: "#fff" }} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-[var(--ds-weight-black)]" style={{ color: "var(--ds-text-primary)" }}>
                          {label}
                        </p>
                        <p className="truncate text-[11px]" style={{ color: "var(--ds-text-tertiary)" }}>
                          {detail}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => onLocalTransportChange(id, checked)}
                      aria-label={`Use ${label}`}
                      className="local-transport-switch"
                      style={style}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Route notice */}
          {routeNotice && (
            <div
              className="rounded-[var(--ds-radius-lg)] px-3 py-2.5 text-sm mb-3"
              style={{
                backgroundColor: "var(--ds-warning-soft)",
                color: "var(--ds-warning-text)",
                border: "1px solid var(--ds-warning)20",
              }}
            >
              {routeNotice}
            </div>
          )}

          {!hasLocalTransportMode && travelMode === "local" && (
            <p className="text-xs font-[var(--ds-weight-semibold)] mb-3" style={{ color: "var(--ds-warning-text)" }}>
              Select at least one local transport mode.
            </p>
          )}

          {/* Find route button */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={!canRequestRoute}
            onClick={onRoute}
          >
            <Navigation size={17} />
            {loading ? "Finding route..." : "Find route"}
          </Button>
        </div>
        )}
      </div>
    </section>
  );
};

const LocationInput = ({
  value,
  selected,
  color,
  placeholder,
  suggestions,
  onChange,
  onBlur,
  onSelect,
}: {
  value: string;
  selected: boolean;
  color: string;
  placeholder: string;
  suggestions: LocationResult[];
  onChange: (value: string) => void;
  onBlur: () => void;
  onSelect: (location: LocationResult) => void;
}) => (
  <div className="relative">
    <div
      className="flex min-h-12 items-center gap-3 rounded-[var(--ds-radius-lg)] px-3 transition-all duration-[var(--ds-duration-fast)]"
      style={{
        backgroundColor: "var(--ds-bg-tertiary)",
        border: "1px solid var(--ds-border-primary)",
      }}
    >
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm font-[var(--ds-weight-semibold)] outline-none border-none"
        style={{ color: "var(--ds-text-primary)" }}
      />
      {selected && (
        <span className="text-[11px] font-[var(--ds-weight-bold)]" style={{ color: "var(--ds-success-text)" }}>
          Set
        </span>
      )}
    </div>

    {suggestions.length > 0 && (
      <div
        className="absolute left-0 right-0 top-full z-[var(--ds-z-dropdown)] mt-1.5 overflow-hidden rounded-[var(--ds-radius-lg)]"
        style={{
          backgroundColor: "var(--ds-bg-secondary)",
          border: "1px solid var(--ds-border-primary)",
          boxShadow: "var(--ds-shadow-lg)",
        }}
      >
        {suggestions.map((suggestion) => (
          <button
            key={`${suggestion.name}-${suggestion.lat}-${suggestion.lng}`}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(suggestion)}
            className="block w-full px-4 py-2.5 text-left text-sm transition-colors"
            style={{ color: "var(--ds-text-primary)" }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--ds-bg-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            {suggestion.name}
          </button>
        ))}
      </div>
    )}
  </div>
);

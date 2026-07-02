import React from "react";
import {
  Bike,
  BusFront,
  Car,
  Footprints,
  MapPin,
  Navigation,
  Plus,
  TrainFront,
  X,
} from "lucide-react";
import { Switch } from "../../ui/switch";
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
};

const travelModeChoices: Array<{
  id: TravelMode;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
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
  Icon: React.ComponentType<{ size?: number; className?: string }>;
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
}) => {
  const hasLocalTransportMode = Object.values(localTransport).some(Boolean);

  return (
    <section className="pointer-events-none absolute inset-x-0 top-0 z-[600] px-3 pt-[calc(0.85rem+env(safe-area-inset-top))] sm:px-4">
      <div className="pointer-events-auto mx-auto max-w-xl">
        <div className="rounded-[1.65rem] border border-white/12 bg-slate-950/86 p-3 text-slate-100 shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
          <div className="mb-3 flex items-center justify-between gap-3 pr-32">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200/80">
                Medio Travel
              </p>
              <h1 className="text-lg font-black tracking-tight">Navigate Mumbai</h1>
            </div>
          </div>

          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {savedPlaces.map((place) => (
              <div key={place._id} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => onSavedPlaceClick(place)}
                  className="flex min-h-10 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/90 py-2 pl-3 pr-8 text-xs font-bold text-slate-200 transition hover:border-cyan-400/50"
                >
                  <MapPin size={14} className="text-emerald-300" />
                  <span className="max-w-28 truncate">{place.label}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete saved place ${place.label}`}
                  onClick={(event) => onDeleteSavedPlace(place._id, event)}
                  className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full text-slate-500 transition hover:bg-red-400/15 hover:text-red-200"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={onAddPlace}
              className="flex min-h-10 shrink-0 items-center gap-2 rounded-2xl border border-dashed border-slate-600 bg-slate-900/80 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-emerald-300"
            >
              <Plus size={15} className="text-emerald-300" />
              Add
            </button>
          </div>

          <div className="grid gap-2">
            <LocationInput
              value={locA}
              selected={Boolean(coordsA)}
              color="bg-emerald-400"
              placeholder="From"
              suggestions={activeField === "A" ? suggestionsA : []}
              onChange={(value) => onInputChange(value, "A")}
              onBlur={() => onFieldBlur("A")}
              onSelect={(location) => onSelect(location, "A")}
            />
            <LocationInput
              value={locB}
              selected={Boolean(coordsB)}
              color="bg-rose-500"
              placeholder="To"
              suggestions={activeField === "B" ? suggestionsB : []}
              onChange={(value) => onInputChange(value, "B")}
              onBlur={() => onFieldBlur("B")}
              onSelect={(location) => onSelect(location, "B")}
            />
          </div>

          <div className="mt-3 grid grid-cols-4 gap-1 rounded-2xl bg-slate-900/80 p-1">
            {travelModeChoices.map(({ id, label, Icon }) => {
              const active = travelMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onTravelModeChange(id)}
                  aria-pressed={active}
                  className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold transition ${
                    active
                      ? "bg-white text-slate-950 shadow"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  }`}
                >
                  <Icon size={17} />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>

          {travelMode === "local" && (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
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
                    className={`local-transport-card flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 ${
                      enabled ? "local-transport-card--active" : "border-slate-800 bg-slate-950/70"
                    }`}
                    style={style}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: color }}>
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-slate-100">{label}</p>
                        <p className="truncate text-[11px] text-slate-500">{detail}</p>
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

          {routeNotice && (
            <p className="mt-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
              {routeNotice}
            </p>
          )}

          {!hasLocalTransportMode && travelMode === "local" && (
            <p className="mt-2 text-xs font-semibold text-amber-200">
              Select at least one local transport mode.
            </p>
          )}

          <button
            type="button"
            onClick={onRoute}
            disabled={!canRequestRoute || loading}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white shadow-lg shadow-primary/25 transition enabled:hover:bg-primary/90 disabled:opacity-45"
          >
            <Navigation size={17} />
            {loading ? "Finding route..." : "Find route"}
          </button>
        </div>
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
    <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 px-3 transition focus-within:border-cyan-300/60">
      <span className={`size-2.5 shrink-0 rounded-full ${color}`} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500"
      />
      {selected && <span className="text-[11px] font-bold text-emerald-300">Set</span>}
    </div>

    {suggestions.length > 0 && (
      <div className="absolute left-0 right-0 top-full z-[900] mt-2 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {suggestions.map((suggestion) => (
          <button
            key={`${suggestion.name}-${suggestion.lat}-${suggestion.lng}`}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(suggestion)}
            className="block w-full px-4 py-3 text-left text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
          >
            {suggestion.name}
          </button>
        ))}
      </div>
    )}
  </div>
);

import React from "react";
import { Layers, LocateFixed, Search } from "lucide-react";

type FloatingButtonsProps = {
  nearbyOpen: boolean;
  onExplore: () => void;
  onLocate: () => void;
  onToggleSheet: () => void;
};

export const FloatingButtons: React.FC<FloatingButtonsProps> = ({
  nearbyOpen,
  onExplore,
  onLocate,
  onToggleSheet,
}) => (
  <div className="pointer-events-none fixed right-3 top-[42vh] z-[var(--ds-z-popover)] flex flex-col gap-2 sm:right-4">
    <MapButton label="Use current location" onClick={onLocate}>
      <LocateFixed size={18} />
    </MapButton>
    <MapButton label="Show route sheet" onClick={onToggleSheet}>
      <Layers size={18} />
    </MapButton>
    <MapButton label="Explore nearby" onClick={onExplore} active={nearbyOpen}>
      <Search size={18} />
    </MapButton>
  </div>
);

const MapButton = ({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className="pointer-events-auto grid size-11 place-items-center rounded-full shadow-xl backdrop-blur-xl transition-all duration-[var(--ds-duration-fast)]"
    style={{
      backgroundColor: active ? "var(--ds-info)" : "var(--ds-bg-secondary)",
      border: active ? "1px solid transparent" : "1px solid var(--ds-border-primary)",
      color: active ? "var(--ds-text-inverse)" : "var(--ds-text-secondary)",
    }}
  >
    {children}
  </button>
);

import React from "react";
import { getTransportColor } from "../transportColors";
import type { OtpItinerary } from "../otpTypes";
import { modeLabels, normalizeMode } from "./routeUtils";

type TransportLegendProps = {
  itinerary?: OtpItinerary;
};

export const TransportLegend: React.FC<TransportLegendProps> = ({ itinerary }) => {
  const items = (itinerary?.legs || []).reduce<Array<{ mode: string; label: string; color: string; dashed: boolean }>>(
    (acc, leg) => {
      const mode = normalizeMode(leg.mode);
      if (acc.some((item) => item.mode === mode)) return acc;
      const routeName = leg.route?.shortName || leg.route?.longName || "";
      acc.push({
        mode,
        label: modeLabels[mode] || mode,
        color: getTransportColor(mode, routeName),
        dashed: mode === "WALK",
      });
      return acc;
    },
    []
  );

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/72 p-3">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        Map legend
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.mode}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200"
          >
            <span
              className="h-1 w-6 rounded-full"
              style={{
                backgroundColor: item.dashed ? "transparent" : item.color,
                borderTop: item.dashed ? `2px dashed ${item.color}` : undefined,
              }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
};

import { useEffect, useState } from "react";
import { fetchLocationSuggestions } from "../lib/locationSearch";
import type { LocationResult } from "../lib/locationSearch";

export function useLocationSearch(debouncedQuery: string) {
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);

  useEffect(() => {
    const query = debouncedQuery.trim();
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    let isCurrent = true;

    fetchLocationSuggestions(query, controller.signal)
      .then((results) => {
        if (isCurrent) setSuggestions(results);
      })
      .catch(() => {
        if (isCurrent && !controller.signal.aborted) {
          setSuggestions([]);
        }
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [debouncedQuery]);

  return suggestions;
};

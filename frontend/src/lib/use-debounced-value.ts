import { useEffect, useState } from "react";

import { SEARCH_DEBOUNCE_MS } from "@/constants/query";

/** El valor, pero solo después de que deja de cambiar (búsquedas mientras se escribe). */
export function useDebouncedValue<TValue>(value: TValue, delayMs = SEARCH_DEBOUNCE_MS): TValue {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

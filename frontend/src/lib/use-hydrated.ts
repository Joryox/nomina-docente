import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` en el servidor y durante la hidratación; `true` después. Los datos que el
 * navegador ya tiene en caché (la sesión tras iniciar sesión) se muestran hasta entonces:
 * así el HTML del servidor y el primer render del cliente coinciden.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

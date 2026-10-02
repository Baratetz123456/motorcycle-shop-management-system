"use client";

import { useSyncExternalStore } from "react";

function emptySubscribe() {
  return () => {};
}

/**
 * Idiomatic React 18/19 SSR-safe client mount hook.
 * Uses `useSyncExternalStore` instead of `useEffect` + `setState`
 * to avoid cascading re-renders and hydration mismatch.
 */
export function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

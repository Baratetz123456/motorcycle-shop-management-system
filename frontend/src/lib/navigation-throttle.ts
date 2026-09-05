let lastNavigationTime = 0;
const THROTTLE_WINDOW_MS = 350;

/**
 * Checks if a navigation action is allowed based on the 350ms throttle window
 * and current pathname comparison.
 */
export function canNavigate(targetPath: string, currentPath?: string): boolean {
  const now = Date.now();

  // 1. Same-route guard: ignore clicks if target is already the active route
  if (currentPath && (targetPath === currentPath || (targetPath !== "/" && currentPath.startsWith(targetPath) && currentPath.split("?")[0] === targetPath.split("?")[0]))) {
    return false;
  }

  // 2. Throttle window check (350ms debounce)
  if (now - lastNavigationTime < THROTTLE_WINDOW_MS) {
    return false;
  }

  lastNavigationTime = now;

  // Trigger instant start of top progress bar
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("navigation_progress_start"));
  }

  return true;
}

/**
 * Manually trigger navigation progress start (useful before router.push)
 */
export function startNavigationProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("navigation_progress_start"));
  }
}

/**
 * Manually complete navigation progress
 */
export function completeNavigationProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("navigation_progress_complete"));
  }
}

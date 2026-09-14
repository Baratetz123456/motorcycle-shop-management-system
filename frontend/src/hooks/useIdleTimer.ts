"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { tokenStore } from "@/lib/auth-token";

// 30-Minute Idle Inactivity Timeout
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const THROTTLE_INTERVAL_MS = 5000; // Only update activity timestamp at most once every 5 seconds

export function useIdleTimer() {
  const router = useRouter();
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const performIdleLogout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (_) {
      // Ignore network errors on logout
    } finally {
      tokenStore.clearToken();
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_role");
        localStorage.removeItem("user_id");
        localStorage.removeItem("user_email");
        localStorage.removeItem("user_name");
        router.push("/login?inactivity=1");
      }
    }
  }, [router]);

  const checkIdleStatus = useCallback(() => {
    const timeSinceLastActivity = Date.now() - lastActivityRef.current;
    if (timeSinceLastActivity >= INACTIVITY_TIMEOUT_MS) {
      performIdleLogout();
    }
  }, [performIdleLogout]);

  useEffect(() => {
    // Only run in the browser
    if (typeof window === "undefined") return;

    let lastRecordedActivity = Date.now();
    lastActivityRef.current = Date.now();

    const handleUserInteraction = () => {
      const now = Date.now();
      if (now - lastRecordedActivity >= THROTTLE_INTERVAL_MS) {
        lastRecordedActivity = now;
        lastActivityRef.current = now;
      }
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((eventName) => {
      window.addEventListener(eventName, handleUserInteraction, { passive: true });
    });

    // Check inactivity every 15 seconds
    timerRef.current = setInterval(checkIdleStatus, 15000);

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserInteraction);
      });
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [checkIdleStatus]);
}

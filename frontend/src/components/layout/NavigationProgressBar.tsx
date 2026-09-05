"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const completeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startProgress = () => {
    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsVisible(true);
    setProgress(15);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 60) return prev + 15;
        if (prev < 85) return prev + 6;
        if (prev < 95) return prev + 1.5;
        return prev;
      });
    }, 100);
  };

  const completeProgress = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setProgress(100);

    completeTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        setProgress(0);
      }, 300);
    }, 200);
  };

  // Trigger completion whenever pathname or search parameters change
  useEffect(() => {
    completeProgress();
  }, [pathname, searchParams]);

  // Global event listeners for navigation throttling utility and internal link clicks
  useEffect(() => {
    const handleStart = () => startProgress();
    const handleComplete = () => completeProgress();

    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("//") &&
        target.target !== "_blank" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        startProgress();
      }
    };

    window.addEventListener("navigation_progress_start", handleStart);
    window.addEventListener("navigation_progress_complete", handleComplete);
    document.addEventListener("click", handleAnchorClick, { capture: true });

    return () => {
      window.removeEventListener("navigation_progress_start", handleStart);
      window.removeEventListener("navigation_progress_complete", handleComplete);
      document.removeEventListener("click", handleAnchorClick, { capture: true });
      if (timerRef.current) clearInterval(timerRef.current);
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, []);

  if (!isVisible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none transition-opacity duration-300"
      style={{ opacity: isVisible ? 1 : 0 }}
      aria-hidden="true"
    >
      <div
        className="h-[3px] bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 shadow-[0_0_12px_rgba(6,182,212,0.8)] relative transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      >
        {/* Trailing neon beacon light */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-[5px] bg-white/60 shadow-[0_0_16px_4px_rgba(34,211,238,0.95)] rounded-full blur-[0.5px]" />
      </div>
    </div>
  );
}

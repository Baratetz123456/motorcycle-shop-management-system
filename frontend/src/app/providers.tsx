"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, Suspense } from 'react';
import { getAppTheme, applyThemeToDocument, getAppMode, applyModeToDocument } from '@/lib/theme';
import { NavigationProgressBar } from '@/components/layout/NavigationProgressBar';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }));

  useEffect(() => {
    // Initialize theme and mode on client mount
    const currentTheme = getAppTheme();
    applyThemeToDocument(currentTheme);

    const currentMode = getAppMode();
    applyModeToDocument(currentMode);

    const handleThemeUpdated = (e: any) => {
      if (e.detail?.theme) {
        applyThemeToDocument(e.detail.theme);
      }
    };

    const handleModeUpdated = (e: any) => {
      if (e.detail?.mode) {
        applyModeToDocument(e.detail.mode);
      }
    };

    window.addEventListener("theme_updated", handleThemeUpdated);
    window.addEventListener("mode_updated", handleModeUpdated);
    return () => {
      window.removeEventListener("theme_updated", handleThemeUpdated);
      window.removeEventListener("mode_updated", handleModeUpdated);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <NavigationProgressBar />
      </Suspense>
      {children}
    </QueryClientProvider>
  );
}

"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { getAppTheme, applyThemeToDocument } from '@/lib/theme';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }));

  useEffect(() => {
    // Initialize theme on client mount
    const currentTheme = getAppTheme();
    applyThemeToDocument(currentTheme);

    const handleThemeUpdated = (e: any) => {
      if (e.detail?.theme) {
        applyThemeToDocument(e.detail.theme);
      }
    };

    window.addEventListener("theme_updated", handleThemeUpdated);
    return () => window.removeEventListener("theme_updated", handleThemeUpdated);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

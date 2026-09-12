import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ProvidersWrapper from './providers';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Versiklo | Motorcycle Shop Management",
  description: "Versiklo — The all-in-one system for running your motorcycle shop.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" data-theme="lime" data-mode="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var uid = localStorage.getItem('user_id');
                  var mode = (uid ? localStorage.getItem('motoshop_app_mode_' + uid) : null) || localStorage.getItem('motoshop_app_mode') || localStorage.getItem('motoshop_theme_mode') || 'light';
                  var resolved = mode;
                  if (mode === 'system') {
                    resolved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
                  }
                  if (resolved === 'dark') {
                    document.documentElement.classList.remove('light');
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-mode', 'dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                    document.documentElement.setAttribute('data-mode', 'light');
                  }
                } catch(e) {}

                // Suppress upstream Chromium DevTools injected Live Metrics / web-vitals bug (Chromium Issue 543499029)
                if (typeof window !== 'undefined') {
                  // 1. window.onerror hook (returns true to prevent browser console error printing)
                  var prevOnError = window.onerror;
                  window.onerror = function(msg, url, lineNo, colNo, error) {
                    var text = String(msg || '') + ' ' + String(error ? error.stack || error.message : '');
                    if (
                      text.indexOf('startTime') !== -1 &&
                      (text.indexOf('Cannot read properties of undefined') !== -1 || text.indexOf('reportAllChanges') !== -1)
                    ) {
                      return true; // suppresses standard error printing in DevTools console
                    }
                    if (typeof prevOnError === 'function') {
                      return prevOnError.apply(this, arguments);
                    }
                    return false;
                  };

                  // 2. window.addEventListener('error') capture phase
                  window.addEventListener('error', function(event) {
                    var msg = (event && (event.message || (event.error && (event.error.message || event.error.stack)))) || '';
                    if (
                      msg.indexOf('startTime') !== -1 &&
                      (msg.indexOf('Cannot read properties of undefined') !== -1 || msg.indexOf('reportAllChanges') !== -1)
                    ) {
                      event.preventDefault();
                      event.stopImmediatePropagation();
                      return true;
                    }
                  }, true);

                  // 3. Unhandled promise rejections
                  window.addEventListener('unhandledrejection', function(event) {
                    var reason = event && event.reason;
                    var text = String(reason ? (reason.stack || reason.message || reason) : '');
                    if (
                      text.indexOf('startTime') !== -1 &&
                      (text.indexOf('Cannot read properties of undefined') !== -1 || text.indexOf('reportAllChanges') !== -1)
                    ) {
                      event.preventDefault();
                      event.stopImmediatePropagation();
                      return true;
                    }
                  });

                  // 4. Guard console.error from direct DevTools script writes
                  if (window.console && typeof window.console.error === 'function') {
                    var origConsoleError = window.console.error;
                    window.console.error = function() {
                      for (var i = 0; i < arguments.length; i++) {
                        var argStr = String(arguments[i] || '');
                        if (
                          argStr.indexOf('startTime') !== -1 &&
                          (argStr.indexOf('Cannot read properties of undefined') !== -1 || argStr.indexOf('reportAllChanges') !== -1)
                        ) {
                          return; // silence DevTools internal web-vitals crash
                        }
                      }
                      return origConsoleError.apply(window.console, arguments);
                    };
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-zinc-900 min-h-screen selection:bg-lime-500/30 selection:text-lime-900`}
      >
        <ProvidersWrapper>
          {children}
        </ProvidersWrapper>
      </body>
    </html>
  );
}

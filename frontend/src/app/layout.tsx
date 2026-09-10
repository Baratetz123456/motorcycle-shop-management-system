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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('motoshop_app_theme') || 'cyan';
                  document.documentElement.setAttribute('data-theme', t);
                } catch(e) {}

                // Suppress upstream Chromium DevTools injected soft-navigation bug (Chromium Issue 543499029)
                if (typeof window !== 'undefined') {
                  window.addEventListener('error', function(event) {
                    if (
                      event &&
                      event.message &&
                      event.message.indexOf("Cannot read properties of undefined (reading 'startTime')") !== -1 &&
                      (!event.filename || event.filename.indexOf('VM') !== -1 || event.filename === '')
                    ) {
                      event.preventDefault();
                      event.stopImmediatePropagation();
                      return true;
                    }
                  }, true);
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-50 min-h-screen selection:bg-cyan-500/30 selection:text-cyan-200`}
      >
        <ProvidersWrapper>
          {children}
        </ProvidersWrapper>
      </body>
    </html>
  );
}

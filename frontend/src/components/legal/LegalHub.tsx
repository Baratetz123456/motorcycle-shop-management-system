"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  FileText, 
  Printer, 
  ArrowLeft, 
  Bike, 
  Calendar, 
  ExternalLink, 
  Search,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Lock,
  ChevronRight
} from "lucide-react";
import clsx from "clsx";
import { getSystemSettings, SystemSettings } from "@/lib/settings";
import { getPrivacyPolicySections, getTermsOfServiceSections } from "@/lib/legal-content";

interface LegalHubProps {
  initialTab?: "privacy" | "terms";
}

export function LegalHub({ initialTab = "privacy" }: LegalHubProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"privacy" | "terms">(initialTab);
  const [settings, setSettings] = useState<SystemSettings>(getSystemSettings);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<string>("");

  useEffect(() => {
    setSettings(getSystemSettings());
    const handleSettingsUpdate = () => setSettings(getSystemSettings());
    window.addEventListener("system_settings_updated", handleSettingsUpdate);
    return () => window.removeEventListener("system_settings_updated", handleSettingsUpdate);
  }, []);

  const privacyData = useMemo(() => getPrivacyPolicySections(settings), [settings]);
  const termsData = useMemo(() => getTermsOfServiceSections(settings), [settings]);

  const currentDoc = activeTab === "privacy" ? privacyData : termsData;

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return currentDoc.sections;
    const query = searchQuery.toLowerCase();
    return currentDoc.sections.filter((sec) => {
      const matchTitle = sec.title.toLowerCase().includes(query);
      const matchContent = sec.content.some((c) => c.toLowerCase().includes(query));
      const matchSub = sec.subsections?.some(
        (sub) =>
          sub.subtitle.toLowerCase().includes(query) ||
          sub.paragraphs.some((p) => p.toLowerCase().includes(query))
      );
      return matchTitle || matchContent || matchSub;
    });
  }, [currentDoc, searchQuery]);

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const headings = currentDoc.sections.map((sec) => document.getElementById(sec.id));
      const scrollPos = window.scrollY + 200;

      for (let i = headings.length - 1; i >= 0; i--) {
        const el = headings[i];
        if (el && el.offsetTop <= scrollPos) {
          setActiveSectionId(el.id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [currentDoc]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-b border-white/10 print:hidden shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition-colors flex items-center gap-1 text-xs font-semibold"
              title="Return to previous screen"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500 p-0.5 flex items-center justify-center">
                <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                  <Bike className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <div>
                <span className="font-bold text-sm tracking-wide text-white">{settings.appName || "Versiklo"}</span>
                <span className="text-[10px] font-mono text-zinc-400 block -mt-0.5">Legal & Compliance Hub</span>
              </div>
            </div>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex bg-zinc-900/90 p-1 rounded-2xl border border-white/10 text-xs shadow-inner">
            <button
              onClick={() => {
                setActiveTab("privacy");
                setSearchQuery("");
                window.history.replaceState(null, "", "/privacy");
              }}
              className={clsx(
                "px-4 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2",
                activeTab === "privacy"
                  ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Privacy Policy</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("terms");
                setSearchQuery("");
                window.history.replaceState(null, "", "/terms");
              }}
              className={clsx(
                "px-4 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2",
                activeTab === "terms"
                  ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Terms of Service</span>
            </button>
          </div>

          {/* Quick Print Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition-colors flex items-center gap-2 text-xs font-semibold shadow-sm"
              title="Print document or save as PDF"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span className="hidden md:inline">Print / Save PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner with Metadata */}
      <section className="border-b border-white/10 bg-zinc-900/40 py-10 px-4 sm:px-6 lg:px-8 print:py-4 print:border-none">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider print:hidden">
            <Lock className="w-3.5 h-3.5" />
            <span>Republic of the Philippines Statutory Compliance</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {currentDoc.title}
          </h1>

          <p className="text-sm text-zinc-400 max-w-3xl leading-relaxed">
            Standard legal agreements, workshop warranty stipulations, test-ride waivers, and customer data handling policies established for{" "}
            <strong className="text-zinc-200">{settings.appName || "Versiklo"}</strong> operations at {settings.shopAddress || "Metro Manila, Philippines"}.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400 pt-2">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              Effective Date: {currentDoc.effectiveDate}
            </span>
            <span className="text-zinc-700">•</span>
            <span>Last Updated: {currentDoc.lastUpdated}</span>
            <span className="text-zinc-700">•</span>
            <span className="text-emerald-400 font-semibold">Active & Enforceable</span>
          </div>
        </div>
      </section>

      {/* Main Dual-Column Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Floating Table of Contents Sidebar (Left) */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-6 print:hidden">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder={`Search ${activeTab === "privacy" ? "privacy clauses" : "terms & conditions"}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl py-2 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
            />
          </div>

          <nav className="p-4 bg-zinc-900/40 border border-white/10 rounded-3xl backdrop-blur-md space-y-2">
            <h2 className="text-xs uppercase font-bold tracking-wider text-zinc-400 px-3 pb-2 border-b border-white/5">
              Table of Contents
            </h2>
            <ul className="space-y-1 text-xs">
              {currentDoc.sections.map((sec) => {
                const isActive = activeSectionId === sec.id;
                return (
                  <li key={sec.id}>
                    <a
                      href={`#${sec.id}`}
                      className={clsx(
                        "block px-3 py-2 rounded-xl transition-all font-medium truncate flex items-center justify-between",
                        isActive
                          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
                      )}
                    >
                      <span className="truncate">{sec.title}</span>
                      <ChevronRight className={clsx("w-3.5 h-3.5 shrink-0 opacity-40", isActive && "opacity-100 text-cyan-400")} />
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Quick Shop Floor Notice Card */}
          <div className="p-5 bg-zinc-900 border border-white/10 rounded-3xl space-y-2.5 text-xs text-zinc-400 backdrop-blur-md">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Bike className="w-4 h-4" />
              <span>Workshop Custody Rule</span>
            </div>
            <p>
              Motorcycles parked or checked into workshop lift bays remain under shop custody subject to Article 1731 of the Philippine Civil Code (Mechanic&apos;s Lien).
            </p>
          </div>
        </aside>

        {/* Legal Document Content (Right) */}
        <main className="lg:col-span-8 space-y-10 min-w-0 print:col-span-12">
          {filteredSections.length === 0 ? (
            <div className="p-12 text-center bg-zinc-900/40 border border-white/10 rounded-3xl space-y-3">
              <FileText className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No clauses found</h3>
              <p className="text-xs text-zinc-400">
                No policy sections matched &ldquo;{searchQuery}&rdquo;. Try another search term or clear the filter.
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 bg-zinc-800 text-zinc-200 text-xs font-bold rounded-xl hover:bg-zinc-700"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            filteredSections.map((sec) => (
              <section
                key={sec.id}
                id={sec.id}
                className="p-6 sm:p-8 bg-zinc-900/30 border border-white/10 rounded-3xl space-y-5 scroll-mt-24 backdrop-blur-sm print:bg-transparent print:border-b print:border-black/10 print:p-2 print:space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4 print:border-none">
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide flex items-center gap-2.5">
                    <span>{sec.title}</span>
                  </h2>
                  {sec.badge && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 w-fit">
                      {sec.badge}
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                  {sec.content.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>

                {sec.subsections && sec.subsections.length > 0 && (
                  <div className="space-y-4 pt-2">
                    {sec.subsections.map((sub, sIdx) => (
                      <div
                        key={sIdx}
                        className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-2 print:bg-transparent print:border-none"
                      >
                        <h3 className="font-bold text-xs sm:text-sm text-cyan-300">
                          {sub.subtitle}
                        </h3>
                        <div className="space-y-1.5 text-xs text-zinc-400">
                          {sub.paragraphs.map((para, pIdx) => (
                            <p key={pIdx} className="leading-relaxed">
                              • {para}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))
          )}

          {/* Legal Footer Notice */}
          <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10 text-center space-y-2 text-xs text-zinc-500 print:text-black">
            <p>
              © {new Date().getFullYear()} {settings.appName || "Versiklo"} Management Systems. Registered in the Republic of the Philippines.
            </p>
            <p className="font-mono text-[11px] text-zinc-400">
              For official certified legal copies or warranty arbitration, email {settings.contactEmail || "support@motoshop.com"}.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default LegalHub;

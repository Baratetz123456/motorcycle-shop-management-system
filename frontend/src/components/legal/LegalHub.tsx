"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  FileText, 
  Printer, 
  ArrowLeft, 
  Calendar, 
  Search,
  Scale,
  Lock,
  ChevronRight,
  X,
  ListOrdered,
  Sparkles,
  BookOpen,
  Home
} from "lucide-react";
import clsx from "clsx";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { getSystemSettings, SystemSettings } from "@/lib/settings";
import { getPrivacyPolicySections, getTermsOfServiceSections, LegalSection } from "@/lib/legal-content";
import { printIsolatedDocument } from "@/components/documents/printUtils";

interface LegalHubProps {
  initialTab?: "privacy" | "terms";
}

/**
 * Generates decoupled, clean white-canvas HTML for the print engine.
 * Ensures zero dark-mode leakage and standard statutory document formatting.
 */
function generatePrintableHtml(
  doc: { title: string; effectiveDate: string; lastUpdated: string; sections: LegalSection[] },
  settings: SystemSettings
): string {
  const appName = settings.appName || "Versiklo";
  const shopAddress = settings.shopAddress || "Metro Manila, Philippines";
  const shopTin = settings.shopTin || "000-000-000-000";
  const shopPhone = settings.contactPhone || "+63 (02) 8123-4567";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #09090b; background: #ffffff; padding: 24px; max-width: 800px; margin: 0 auto; line-height: 1.5; font-size: 11pt;">
      <!-- Letterhead Header -->
      <div style="border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1 style="font-size: 16pt; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: -0.5px;">${appName}</h1>
          <p style="font-size: 8.5pt; color: #52525b; margin: 2px 0 0 0;">Precision Motorcycle Workshop Management Systems</p>
          <p style="font-size: 8pt; color: #71717a; margin: 2px 0 0 0;">${shopAddress} • TIN: ${shopTin} • Tel: ${shopPhone}</p>
        </div>
        <div style="text-align: right; font-size: 8pt; color: #71717a; font-family: monospace;">
          <div>STATUTORY LEGAL ARCHIVE</div>
          <div>Effective: ${doc.effectiveDate}</div>
          <div>Last Updated: ${doc.lastUpdated}</div>
        </div>
      </div>

      <!-- Document Title -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 14pt; font-weight: 700; margin: 0 0 6px 0; color: #09090b;">${doc.title}</h2>
        <p style="font-size: 9pt; color: #52525b; margin: 0;">Official regulatory documentation for ${appName} workshop floor, point-of-sale services, and customer vehicular custody under Philippine statutory law.</p>
      </div>

      <!-- Itemized Sections -->
      <div style="display: flex; flex-direction: column; gap: 18px;">
        ${doc.sections
          .map(
            (sec) => `
          <div style="border-bottom: 1px solid #e4e4e7; padding-bottom: 14px; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
              <h3 style="font-size: 10.5pt; font-weight: 700; margin: 0; color: #09090b;">${sec.title}</h3>
              ${sec.badge ? `<span style="font-size: 7.5pt; font-family: monospace; background: #f4f4f5; border: 1px solid #d4d4d8; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${sec.badge}</span>` : ""}
            </div>
            ${sec.content.map((p) => `<p style="font-size: 9pt; color: #27272a; margin: 4px 0 6px 0; text-align: justify;">${p}</p>`).join("")}
            ${
              sec.subsections && sec.subsections.length > 0
                ? `<div style="margin-top: 8px; padding-left: 12px; border-left: 2px solid #e4e4e7;">
                    ${sec.subsections
                      .map(
                        (sub) => `
                      <div style="margin-bottom: 6px;">
                        <div style="font-size: 8.5pt; font-weight: 600; color: #09090b;">${sub.subtitle}</div>
                        ${sub.paragraphs.map((para) => `<p style="font-size: 8pt; color: #52525b; margin: 2px 0;">• ${para}</p>`).join("")}
                      </div>
                    `
                      )
                      .join("")}
                  </div>`
                : ""
            }
          </div>
        `
          )
          .join("")}
      </div>

      <!-- Statutory Certification Footer -->
      <div style="margin-top: 28px; padding-top: 14px; border-top: 1px dashed #a1a1aa; font-size: 8pt; color: #71717a; text-align: center; page-break-inside: avoid;">
        <p style="margin: 0 0 4px 0;">© ${new Date().getFullYear()} ${appName}. Registered in the Republic of the Philippines. All rights reserved.</p>
        <p style="font-family: monospace; font-size: 7.5pt; margin: 0;">Republic Act No. 10173 (Data Privacy Act of 2012) • RA 7394 (Consumer Act) • Civil Code Art. 1731 (Mechanic's Lien)</p>
      </div>
    </div>
  `;
}

export function LegalHub({ initialTab = "privacy" }: LegalHubProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"privacy" | "terms">(initialTab);
  const [settings, setSettings] = useState<SystemSettings>(getSystemSettings);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false);
  const [isAuthenticated] = useState(() => typeof window !== "undefined" && Boolean(localStorage.getItem("user_role")));
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync settings and listen for updates
  useEffect(() => {
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
      const scrollPos = window.scrollY + 220;

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

  // Handle Tab Switch
  const handleTabSwitch = useCallback((tab: "privacy" | "terms") => {
    setActiveTab(tab);
    setSearchQuery("");
    setIsMobileTocOpen(false);
    window.history.replaceState(null, "", tab === "privacy" ? "/privacy" : "/terms");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Smart Back navigation
  const handleSmartBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1 && document.referrer) {
      router.back();
    } else {
      router.push(isAuthenticated ? "/reports" : "/login");
    }
  }, [router, isAuthenticated]);

  // Handle Print via Decoupled Engine
  const handlePrint = useCallback(() => {
    const html = generatePrintableHtml(currentDoc, settings);
    printIsolatedDocument(`${settings.appName || "Versiklo"} - ${currentDoc.title}`, html);
  }, [currentDoc, settings]);

  // Jump to specific clause and close mobile drawer
  const handleJumpToSection = useCallback((id: string) => {
    setIsMobileTocOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const offsetTop = element.getBoundingClientRect().top + window.scrollY - 130;
      window.scrollTo({ top: offsetTop, behavior: "smooth" });
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-lime-500 selection:text-black relative">
      {/* 
        ========================================================================
        1. DESKTOP NAVBAR (>= md)
        Unified 64px Fixed Header matching MotoShop Dark Zinc Precision Design
        ========================================================================
      */}
      <header className="hidden md:block sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-800 print:hidden shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          {/* Left: Smart Return & Brand Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSmartBack}
              data-testid="desktop-legal-back-btn"
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/80 transition-all flex items-center gap-1.5 text-xs font-semibold active:scale-95 cursor-pointer"
              title="Return to previous screen"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>Back</span>
            </button>

            <Link href={isAuthenticated ? "/reports" : "/login"} className="flex items-center gap-3 group">
              <BrandLogo size="md" variant="lime-on-dark" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg text-white tracking-tight leading-none group-hover:text-emerald-400 transition-colors">
                    {settings.appName || "Versiklo"}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300 border border-zinc-700">
                    Legal Hub
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider mt-0.5">
                  Statutory & Compliance
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Desktop Segmented Tab Switcher */}
          <div className="flex bg-zinc-950 p-1 rounded-2xl border border-zinc-800 text-xs shadow-inner">
            <button
              type="button"
              onClick={() => handleTabSwitch("privacy")}
              data-testid="desktop-tab-privacy"
              className={clsx(
                "px-5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer",
                activeTab === "privacy"
                  ? "bg-emerald-500 text-zinc-950 font-black shadow-sm"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Privacy Policy</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSwitch("terms")}
              data-testid="desktop-tab-terms"
              className={clsx(
                "px-5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer",
                activeTab === "terms"
                  ? "bg-emerald-500 text-zinc-950 font-black shadow-sm"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
              )}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Terms of Service</span>
            </button>
          </div>

          {/* Right: Actions (Search trigger, Print, and App Exit link) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              data-testid="desktop-print-btn"
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700/80 transition-all flex items-center gap-2 text-xs font-semibold shadow-xs cursor-pointer active:scale-95"
              title="Print official document or save as PDF"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Print / Save PDF</span>
            </button>

            <Link
              href={isAuthenticated ? "/reports" : "/login"}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700 transition-all flex items-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              <span>{isAuthenticated ? "Dashboard" : "Login"}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 
        ========================================================================
        2. MOBILE TWO-TIER NAVBAR (< md)
        Tier 1: 56px Top Header with Brand, TOC Trigger, and Print Action
        Tier 2: 44px Full-Width Sticky Segmented Subnav
        ========================================================================
      */}
      <div className="block md:hidden sticky top-0 z-40 print:hidden shadow-md">
        {/* Tier 1: Primary Mobile Header */}
        <div className="h-14 px-3.5 bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-800 flex items-center justify-between gap-2">
          {/* Mobile Left: Back + Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={handleSmartBack}
              data-testid="mobile-legal-back-btn"
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/80 active:scale-95 transition-all cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <BrandLogo size="sm" variant="lime-on-dark" />
              <div className="truncate">
                <span className="font-extrabold text-sm text-white tracking-tight block truncate">
                  {settings.appName || "Versiklo"}
                </span>
                <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider block -mt-0.5">
                  Legal Hub
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Right: TOC Drawer Button & Print */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsMobileTocOpen(true)}
              data-testid="mobile-toc-trigger-btn"
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-zinc-700/80 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95"
              title="Open Table of Contents"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span className="text-[11px]">Index</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              data-testid="mobile-print-btn"
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/80 active:scale-95 transition-all cursor-pointer"
              title="Print document"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>

        {/* Tier 2: Sticky Full-Width Segmented Tab Switcher */}
        <div className="h-11 px-3 bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-800 flex items-center">
          <div className="grid grid-cols-2 gap-1 w-full bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 text-xs">
            <button
              type="button"
              onClick={() => handleTabSwitch("privacy")}
              data-testid="mobile-tab-privacy"
              className={clsx(
                "py-1.5 rounded-lg text-center font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === "privacy"
                  ? "bg-emerald-500 text-zinc-950 font-black shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="truncate">Privacy Policy</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSwitch("terms")}
              data-testid="mobile-tab-terms"
              className={clsx(
                "py-1.5 rounded-lg text-center font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === "terms"
                  ? "bg-emerald-500 text-zinc-950 font-black shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Scale className="w-3.5 h-3.5" />
              <span className="truncate">Terms of Service</span>
            </button>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        3. HERO PRESENTATION BANNER
        High-Octane Minimalist Dark Surface with Statutory Metadata
        ========================================================================
      */}
      <section className="border-b border-zinc-800/80 bg-zinc-900/50 py-8 sm:py-10 px-4 sm:px-6 lg:px-8 print:hidden">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Republic of the Philippines Statutory Compliance</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            {currentDoc.title}
          </h1>

          <p className="text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed">
            Standard legal agreements, workshop warranty stipulations, test-ride waivers, and customer data handling policies established for{" "}
            <strong className="text-white">{settings.appName || "Versiklo"}</strong> operations at {settings.shopAddress || "Metro Manila, Philippines"}.
          </p>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono text-zinc-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Effective Date: {currentDoc.effectiveDate}
            </span>
            <span className="text-zinc-600 hidden sm:inline">•</span>
            <span>Last Updated: {currentDoc.lastUpdated}</span>
            <span className="text-zinc-600 hidden sm:inline">•</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active & Enforceable
            </span>
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        4. MAIN DUAL-COLUMN CONTENT LAYOUT
        Desktop: Sticky Sidebar TOC + Right Content
        Mobile: Full-Width Content with Slide-Up Drawer for TOC
        ========================================================================
      */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Floating Table of Contents Sidebar (Desktop Only: lg:col-span-4) */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-6 print:hidden">
          {/* Real-Time Clause Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`Search ${activeTab === "privacy" ? "privacy clauses" : "terms & conditions"}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-2 pl-10 pr-9 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Table of Contents Navigation List */}
          <nav className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl shadow-sm space-y-2">
            <div className="flex items-center justify-between px-3 pb-2 border-b border-zinc-800 text-xs uppercase font-bold tracking-wider text-zinc-400">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                Table of Contents
              </span>
              <span className="font-mono text-[10px] text-zinc-500">
                {filteredSections.length} clauses
              </span>
            </div>
            <ul className="space-y-1 text-xs max-h-[55vh] overflow-y-auto pr-1">
              {currentDoc.sections.map((sec) => {
                const isActive = activeSectionId === sec.id;
                return (
                  <li key={sec.id}>
                    <button
                      type="button"
                      onClick={() => handleJumpToSection(sec.id)}
                      className={clsx(
                        "w-full text-left px-3 py-2 rounded-xl transition-all font-medium flex items-center justify-between group cursor-pointer",
                        isActive
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                      )}
                    >
                      <span className="truncate pr-2">{sec.title}</span>
                      <ChevronRight className={clsx("w-3.5 h-3.5 shrink-0 transition-transform", isActive ? "text-emerald-400 translate-x-0.5" : "opacity-30 group-hover:opacity-75")} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Workshop Statutory Custody Notice Card */}
          <div className="p-5 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl space-y-2.5 text-xs text-zinc-400 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Workshop Custody Rule</span>
            </div>
            <p className="leading-relaxed text-zinc-400">
              Motorcycles parked or checked into workshop lift bays remain under shop custody subject to Article 1731 of the Philippine Civil Code (Mechanic&apos;s Lien).
            </p>
          </div>
        </aside>

        {/* Legal Document Content (Right Column) */}
        <main className="lg:col-span-8 space-y-8 min-w-0 print:col-span-12">
          {filteredSections.length === 0 ? (
            <div className="p-12 text-center bg-zinc-900/60 border border-zinc-800 rounded-3xl space-y-3 shadow-xs">
              <FileText className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No clauses found</h3>
              <p className="text-xs text-zinc-400">
                No policy sections matched &ldquo;{searchQuery}&rdquo;. Try another search term or clear the filter.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            filteredSections.map((sec) => (
              <section
                key={sec.id}
                id={sec.id}
                className="p-6 sm:p-8 bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 rounded-3xl space-y-5 scroll-mt-28 sm:scroll-mt-24 shadow-xs transition-colors print:bg-white print:text-black print:border-b print:border-black/15 print:p-2 print:space-y-3 print:shadow-none"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-4 print:border-none">
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide flex items-center gap-2.5 print:text-black">
                    <span>{sec.title}</span>
                  </h2>
                  {sec.badge && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-zinc-800 text-emerald-400 border border-emerald-500/20 w-fit print:bg-zinc-100 print:text-black print:border-zinc-300">
                      {sec.badge}
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans print:text-zinc-800">
                  {sec.content.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>

                {sec.subsections && sec.subsections.length > 0 && (
                  <div className="space-y-4 pt-2">
                    {sec.subsections.map((sub, sIdx) => (
                      <div
                        key={sIdx}
                        className="p-4 sm:p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-2 print:bg-transparent print:border-none print:p-0"
                      >
                        <h3 className="font-bold text-xs sm:text-sm text-white print:text-black">
                          {sub.subtitle}
                        </h3>
                        <div className="space-y-1.5 text-xs text-zinc-400 print:text-zinc-700">
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

          {/* Legal Footer Notice & Certifications */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 text-center space-y-2 text-xs text-zinc-400 shadow-xs print:text-black print:border-none">
            <p>
              © {new Date().getFullYear()} {settings.appName || "Versiklo"} Management Systems. Registered in the Republic of the Philippines.
            </p>
            <p className="font-mono text-[11px] text-zinc-500 print:text-zinc-600">
              Tax Identification No. (TIN): {settings.shopTin || "000-000-000-000"} • DTI / SEC Registration No. {settings.shopRegistrationNo || "NCR-2026-0912"}
            </p>
          </div>
        </main>
      </div>

      {/* 
        ========================================================================
        5. MOBILE TABLE OF CONTENTS DRAWER / BOTTOM SHEET (< lg)
        Summoned via the 'Index' button in Tier-1 mobile top bar
        ========================================================================
      */}
      {isMobileTocOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setIsMobileTocOpen(false)}
          />

          {/* Sheet Surface */}
          <div
            data-testid="mobile-toc-drawer"
            className="relative bg-zinc-900 border-t border-zinc-800 rounded-t-3xl max-h-[80vh] flex flex-col p-5 shadow-2xl z-10 animate-in slide-in-from-bottom duration-200"
          >
            {/* Grab Handle */}
            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-3" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Table of Contents</h3>
                <span className="font-mono text-[10px] text-zinc-400">
                  ({currentDoc.sections.length} clauses)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileTocOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Search in Sheet */}
            <div className="pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter clauses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-8 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Clause List */}
            <ul className="space-y-1 overflow-y-auto max-h-[50vh] pr-1 pt-1 pb-4">
              {currentDoc.sections.map((sec) => {
                const isActive = activeSectionId === sec.id;
                return (
                  <li key={sec.id}>
                    <button
                      type="button"
                      onClick={() => handleJumpToSection(sec.id)}
                      className={clsx(
                        "w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer",
                        isActive
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 font-bold"
                          : "text-zinc-300 hover:bg-zinc-800/70"
                      )}
                    >
                      <span className="truncate pr-2">{sec.title}</span>
                      <ChevronRight className={clsx("w-3.5 h-3.5 shrink-0", isActive ? "text-emerald-400" : "opacity-40")} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default LegalHub;

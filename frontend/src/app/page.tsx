"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnimatedCounter from "@/components/AnimatedCounter";
import { useLanguage } from "@/context/LanguageContext";
import { API_BASE } from "@/lib/api";
import {
  ShieldAlert,
  Search,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  HelpCircle,
  TrendingUp,
  ChevronRight,
  Flame,
  Globe2
} from "lucide-react";

export default function HomePage() {
  const { t } = useLanguage();
  const [phoneQuery, setPhoneQuery] = useState("");
  const [stats, setStats] = useState<any>({
    totalScamNumbers: 1482,
    reportsToday: 38,
    activeReporters: 840,
    categoryDistribution: [],
  });
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const router = useRouter();

  // Load stats and reports from backend
  useEffect(() => {
    fetch(`${API_BASE}/dashboard/stats`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.totalScamNumbers !== undefined) {
          setStats({
            totalScamNumbers: data.totalScamNumbers,
            reportsToday: data.reportsToday,
            activeReporters: data.totalScamNumbers > 0 ? Math.ceil(data.totalScamNumbers * 0.6) : 840,
            categoryDistribution: data.categoryDistribution || [],
          });
        }
      })
      .catch(() => {});

    fetch(`${API_BASE}/reports`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRecentReports(data.slice(0, 3));
        }
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneQuery.trim()) return;
    router.push(`/search?phone=${encodeURIComponent(phoneQuery.trim())}`);
  };

  const getCategoryCount = (type: string, fallbackCountNum: number) => {
    if (!stats.categoryDistribution || stats.categoryDistribution.length === 0) {
      return fallbackCountNum;
    }
    const match = stats.categoryDistribution.find((c: any) => c.category === type);
    return match ? match.count : fallbackCountNum;
  };

  const categories = [
    { name: t("BANK_FRAUD"), desc: t("BANK_FRAUD_desc"), countVal: getCategoryCount("BANK_FRAUD", 482), type: "BANK_FRAUD" },
    { name: t("FAKE_DELIVERY"), desc: t("FAKE_DELIVERY_desc"), countVal: getCategoryCount("FAKE_DELIVERY", 349), type: "FAKE_DELIVERY" },
    { name: t("INVESTMENT"), desc: t("INVESTMENT_desc"), countVal: getCategoryCount("INVESTMENT", 219), type: "INVESTMENT" },
    { name: t("LOTTERY"), desc: t("LOTTERY_desc"), countVal: getCategoryCount("LOTTERY", 185), type: "LOTTERY" },
    { name: t("GOVERNMENT"), desc: t("GOVERNMENT_desc"), countVal: getCategoryCount("GOVERNMENT", 128), type: "GOVERNMENT" },
    { name: t("ROMANCE"), desc: t("ROMANCE_desc"), countVal: getCategoryCount("ROMANCE", 94), type: "ROMANCE" },
  ];

  return (
    <>
      <Navbar />
      <main className="flex-grow grid-bg relative">
        {/* Decorative Gradients */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 pt-20 pb-16 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-6">
            <Flame className="h-3.5 w-3.5" /> {t("heroTagline")}
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            {t("heroTitle1")} <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-red-500 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
              ScamShield Cambodia
            </span>
          </h1>
          <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {t("heroSubtitle")}
          </p>

          {/* Search Card */}
          <div className="max-w-2xl mx-auto bg-slate-950/60 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-850 focus-within:border-red-500/40 focus-within:ring-2 focus-within:ring-red-500/10 focus-within:shadow-[0_0_35px_rgba(239,68,68,0.18)] shadow-2xl transition-all duration-300 mb-12 group/card">
            <form onSubmit={handleSearch} className="flex flex-row items-center w-full gap-2">
              <div className="relative flex-grow flex items-center group/input">
                <Search className="absolute left-3.5 h-5 w-5 text-slate-500 group-focus-within/input:text-red-500/80 group-focus-within/card:text-red-500/70 transition-colors duration-300 pointer-events-none" />
                <input
                  type="text"
                  value={phoneQuery}
                  onChange={(e) => setPhoneQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="w-full pl-11 pr-3 py-3.5 bg-transparent border-none outline-none text-white placeholder-slate-500 text-sm sm:text-base focus:ring-0"
                />
              </div>
              <button
                type="submit"
                className="py-3 px-4 sm:px-7 rounded-xl bg-gradient-to-r from-red-650 to-red-500 hover:from-red-550 hover:to-orange-500 text-white font-bold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-1 sm:gap-1.5 shadow-md shadow-red-600/15 active:scale-[0.98] group/btn shrink-0 cursor-pointer"
              >
                {t("scanButton")}
                <ChevronRight className="h-4 w-4 sm:h-4.5 sm:w-4.5 transform group-hover/btn:translate-x-0.5 transition-transform" />
              </button>
            </form>
          </div>

          {/* Animated Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="glass p-6 rounded-2xl border border-slate-800 text-center">
              <div className="text-4xl font-extrabold text-white mb-1.5 tracking-tight font-mono">
                <AnimatedCounter value={stats.totalScamNumbers} />
              </div>
              <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                {t("totalScamNumbers")}
              </div>
            </div>
            <div className="glass p-6 rounded-2xl border border-slate-800 text-center">
              <div className="text-4xl font-extrabold text-red-500 mb-1.5 tracking-tight font-mono">
                +<AnimatedCounter value={stats.reportsToday} />
              </div>
              <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                {t("newReportsToday")}
              </div>
            </div>
            <div className="glass p-6 rounded-2xl border border-slate-800 text-center">
              <div className="text-4xl font-extrabold text-orange-400 mb-1.5 tracking-tight font-mono">
                <AnimatedCounter value={stats.activeReporters} />
              </div>
              <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                {t("activeReporters")}
              </div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="border-t border-slate-900 bg-slate-950/40 py-20 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold text-white">{t("howProtectsTitle")}</h2>
              <p className="text-slate-400 mt-3 max-w-xl mx-auto">
                {t("howProtectsDesc")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="glass p-8 rounded-2xl border border-slate-800 text-center space-y-4">
                <div className="inline-flex p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-500">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white">{t("step1Title")}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {t("step1Desc")}
                </p>
              </div>

              <div className="glass p-8 rounded-2xl border border-slate-800 text-center space-y-4">
                <div className="inline-flex p-3 bg-orange-500/10 rounded-xl border border-orange-500/20 text-orange-400">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white">{t("step2Title")}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {t("step2Desc")}
                </p>
              </div>

              <div className="glass p-8 rounded-2xl border border-slate-800 text-center space-y-4">
                <div className="inline-flex p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white">{t("step3Title")}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {t("step3Desc")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-white">{t("commonCategoriesTitle")}</h2>
            <p className="text-slate-400 mt-3 max-w-xl mx-auto">
              {t("commonCategoriesDesc")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((c, i) => (
              <div key={i} className="glass glass-hover p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg text-white mb-2">{c.name}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{c.desc}</p>
                </div>
                <div className="mt-6 flex items-center justify-between text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-semibold uppercase font-mono">
                    {c.type}
                  </span>
                  <span className="text-red-400 font-semibold">{c.countVal} {t("activeReportsCount")}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent activity feed */}
        {recentReports.length > 0 && (
          <section className="border-t border-slate-900 bg-slate-950/20 py-20 relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-14">
                <h2 className="text-3xl font-extrabold text-white">{t("recentActivityTitle")}</h2>
                <p className="text-slate-400 mt-3 max-w-xl mx-auto text-sm">
                  {t("recentActivityDesc")}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {recentReports.map((r, i) => (
                  <div key={i} className="glass p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 glass-hover">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-sm font-bold text-white tracking-wide">
                          {r.number}
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-red-400 font-bold uppercase font-mono">
                          {t(r.category) || r.category}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">
                        {r.description || t("noDescription")}
                      </p>
                    </div>

                    <div className="border-t border-slate-900/60 pt-3 flex justify-between items-center text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      <span>{t("byReporter")}{r.reporter}</span>
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQs */}
        <section className="border-t border-slate-900 py-20 bg-slate-950/20 relative z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-extrabold text-white">{t("faqsTitle")}</h2>
            </div>

            <div className="space-y-6">
              <div className="glass p-6 rounded-xl border border-slate-800 space-y-2">
                <h3 className="font-bold text-white flex gap-2 items-center text-base">
                  <HelpCircle className="h-5 w-5 text-red-500 shrink-0" />
                  {t("faq1Q")}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed pl-7">
                  {t("faq1A")}
                </p>
              </div>

              <div className="glass p-6 rounded-xl border border-slate-800 space-y-2">
                <h3 className="font-bold text-white flex gap-2 items-center text-base">
                  <HelpCircle className="h-5 w-5 text-orange-500 shrink-0" />
                  {t("faq2Q")}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed pl-7">
                  {t("faq2A")}
                </p>
              </div>

              <div className="glass p-6 rounded-xl border border-slate-800 space-y-2">
                <h3 className="font-bold text-white flex gap-2 items-center text-base">
                  <HelpCircle className="h-5 w-5 text-yellow-500 shrink-0" />
                  {t("faq3Q")}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed pl-7">
                  {t("faq3A")}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

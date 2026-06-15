"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RiskBadge from "@/components/RiskBadge";
import { useLanguage } from "@/context/LanguageContext";
import { API_BASE } from "@/lib/api";
import {
  ShieldAlert,
  Search,
  Calendar,
  Flag,
  Globe2,
  Share2,
  Clock,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  MapPin
} from "lucide-react";

interface Report {
  id: string;
  category: string;
  description: string | null;
  createdAt: string;
  province: string | null;
  district: string | null;
  commune: string | null;
  village: string | null;
}

interface NumberDetails {
  number: string;
  country: string;
  countryCode: string;
  carrier: string;
  location: string;
  riskScore: number;
  riskLevel: string;
  totalReports: number;
  reports: Report[];
  recentReportsCount: number;
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const phone = searchParams.get("phone") || "";

  const [searchQuery, setSearchQuery] = useState(phone);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<NumberDetails | null>(null);

  const fetchDetails = async (numberToFetch: string) => {
    if (!numberToFetch) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/numbers/search/${encodeURIComponent(numberToFetch)}`);
      if (!res.ok) throw new Error("Number lookup failed");
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || "Could not retrieve reputation data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (phone) {
      fetchDetails(phone);
    } else {
      setLoading(false);
    }
  }, [phone]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?phone=${encodeURIComponent(searchQuery.trim())}`);
  };

  const formatCategory = (cat: string) => {
    return cat.replace(/_/g, " ");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8 relative z-10">
      
      {/* Back button and Search Form */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition text-sm font-medium self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToHome")}
        </button>

        <div className="w-full md:max-w-md bg-slate-950/60 backdrop-blur-xl p-1 rounded-xl border border-slate-850 focus-within:border-red-500/40 focus-within:ring-2 focus-within:ring-red-500/10 focus-within:shadow-[0_0_25px_rgba(239,68,68,0.12)] shadow-xl transition-all duration-300 group/card">
          <form onSubmit={handleSearchSubmit} className="flex flex-row items-center w-full gap-1.5">
            <div className="relative flex-grow flex items-center group/input">
              <Search className="absolute left-3 h-4 w-4 text-slate-500 group-focus-within/input:text-red-500/80 group-focus-within/card:text-red-500/70 transition-colors duration-300 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchAnotherPlaceholder")}
                className="w-full pl-9 pr-2 py-2 bg-transparent border-none outline-none text-white placeholder-slate-500 text-xs sm:text-sm focus:ring-0"
              />
            </div>
            <button
              type="submit"
              className="py-2 px-4.5 rounded-lg bg-gradient-to-r from-red-650 to-red-500 hover:from-red-550 hover:to-orange-500 text-white font-bold text-xs transition-all duration-300 flex items-center justify-center gap-1 shadow-md shadow-red-600/10 active:scale-[0.98] shrink-0 cursor-pointer"
            >
              {t("scanBtn")}
            </button>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="glass p-12 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-4 text-center">
          <div className="h-10 w-10 border-4 border-slate-800 border-t-red-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">{t("loadingReputation")}</p>
        </div>
      ) : error ? (
        <div className="glass p-8 rounded-2xl border border-slate-800 text-center space-y-4">
          <div className="inline-flex p-3 bg-red-500/10 rounded-full border border-red-500/20 text-red-500">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-white">{t("analysisFailed")}</h2>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">{error}</p>
        </div>
      ) : !phone ? (
        <div className="glass p-12 rounded-2xl border border-slate-800 text-center space-y-6">
          <div className="inline-flex p-4 bg-slate-900 rounded-full text-slate-500">
            <Search className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-white">{t("scanAPhone")}</h2>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            {t("scanAPhoneDesc")}
          </p>
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Reputation Summary Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass p-6 rounded-2xl border border-slate-800 space-y-6">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1">
                  {t("scannedId")}
                </span>
                <h2 className="text-2xl font-mono font-bold text-white tracking-wide break-words">
                  {data.number}
                </h2>
              </div>

              {/* Radial Score Gauge */}
              <div className="flex flex-col items-center py-4">
                <div className="relative flex items-center justify-center">
                  {/* SVG radial ring */}
                  <svg className="w-36 h-36">
                    <circle
                      cx="72"
                      cy="72"
                      r="64"
                      className="stroke-slate-900 fill-none"
                      strokeWidth="10"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="64"
                      className={`fill-none transition-all duration-1000 ease-out ${
                        data.riskScore >= 75
                          ? "stroke-red-500"
                          : data.riskScore >= 30
                          ? "stroke-orange-500"
                          : "stroke-emerald-500"
                      }`}
                      strokeWidth="10"
                      strokeDasharray={`${2 * Math.PI * 64}`}
                      strokeDashoffset={`${2 * Math.PI * 64 * (1 - data.riskScore / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-3xl font-extrabold text-white font-mono">{data.riskScore}</div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest mt-0.5">
                      {t("riskIndex")}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-900 pt-6 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Globe2 className="h-4 w-4 text-slate-500" /> {t("country")}
                  </span>
                  <span className="font-semibold text-white">{data.country} ({data.countryCode})</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Globe2 className="h-4 w-4 text-slate-500" /> {t("carrier")}
                  </span>
                  <span className="font-semibold text-white">{data.carrier}</span>
                </div>
                <div className="flex justify-between items-start text-sm">
                  <span className="text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Flag className="h-4 w-4 text-slate-500" /> {t("regionProvince")}
                  </span>
                  <span className="font-semibold text-white text-right text-xs max-w-[180px] break-words">
                    {(() => {
                      const reportedLoc = data.reports.find(r => r.province);
                      if (reportedLoc) {
                        return `${reportedLoc.province}${reportedLoc.district ? `, ${reportedLoc.district}` : ""}${reportedLoc.commune ? `, ${reportedLoc.commune}` : ""}${reportedLoc.village ? `, ${reportedLoc.village}` : ""}`;
                      }
                      return data.location;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-slate-500" /> {t("activeReportsCount")}
                  </span>
                  <span className="font-semibold text-white font-mono">{data.totalReports}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-slate-500" /> {t("recentVelocity")}
                  </span>
                  <span className="font-semibold text-white font-mono">{data.recentReportsCount} (7d)</span>
                </div>
              </div>
            </div>

            {/* Actions Card */}
            <div className="glass p-6 rounded-2xl border border-slate-800 space-y-4 text-center">
              <h3 className="font-bold text-white text-sm">{t("recognizeTitle")}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t("recognizeDesc")}
              </p>
              <button
                onClick={() => router.push(`/report?phone=${encodeURIComponent(data.number)}`)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-950/40 hover:border-red-500/30 transition flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="h-4 w-4" />
                {t("reportNumberButton")}
              </button>
            </div>
          </div>

          {/* Details & Reports Timeline Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Risk Badge Alert Banner */}
            <RiskBadge score={data.riskScore} />

            <div className="glass p-6 rounded-2xl border border-slate-800 space-y-6">
              <h3 className="font-bold text-lg text-white border-b border-slate-900 pb-4">
                {t("timelineTitle")} ({data.reports.length})
              </h3>

              {data.reports.length === 0 ? (
                <div className="py-8 text-center text-slate-500 space-y-4">
                  <div className="inline-flex p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-white text-sm">{t("cleanRecordTitle")}</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    {t("cleanRecordDesc")}
                  </p>
                </div>
              ) : (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {data.reports.map((report, reportIdx) => (
                      <li key={report.id}>
                        <div className="relative pb-8">
                          {reportIdx !== data.reports.length - 1 ? (
                            <span
                              className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-900"
                              aria-hidden="true"
                            />
                          ) : null}
                          <div className="relative flex space-x-3 items-start">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center ring-8 ring-slate-950">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 pt-1.5">
                              <div className="text-xs text-slate-400 flex items-center justify-between">
                                <p className="font-semibold text-slate-300">
                                  {t("categoryLabel")}
                                  <span className="text-red-400 uppercase tracking-wide bg-slate-900 px-2 py-0.5 rounded border border-slate-850 ml-1">
                                    {t(report.category) || formatCategory(report.category)}
                                  </span>
                                </p>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {new Date(report.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              {report.province && (
                                <div className="text-xs text-orange-400 mt-2 flex gap-1 items-center font-medium bg-orange-950/15 border border-orange-500/10 px-2.5 py-1 rounded-lg w-fit">
                                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                                  <span>
                                    {t("incidentLocation")}{report.province}
                                    {report.district ? ` / ${report.district}` : ""}
                                    {report.commune ? ` / ${report.commune}` : ""}
                                    {report.village ? ` / ${report.village}` : ""}
                                  </span>
                                </div>
                              )}
                              <p className="text-sm text-slate-300 mt-2.5 bg-slate-950/40 p-3.5 rounded-xl border border-slate-900/60 leading-relaxed font-sans">
                                {report.description || t("noDescription")}
                              </p>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

        </div>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  const { t } = useLanguage();

  return (
    <>
      <Navbar />
      <main className="flex-grow grid-bg relative">
        <Suspense fallback={
          <div className="max-w-6xl mx-auto px-4 py-24 text-center">
            <div className="h-8 w-8 border-4 border-slate-800 border-t-red-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm">{t("loadingSearchContext")}</p>
          </div>
        }>
          <SearchResultsContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

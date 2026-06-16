"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RiskBadge from "@/components/RiskBadge";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
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
  MapPin,
  Eye,
  TrendingUp,
  TrendingDown,
  Image,
  FileAudio,
  FileText,
  Map,
  Info
} from "lucide-react";

interface Evidence {
  id: string;
  fileUrl: string;
  fileType: string;
}

interface Report {
  id: string;
  category: string;
  description: string | null;
  createdAt: string;
  province: string | null;
  district: string | null;
  commune: string | null;
  village: string | null;
  status: string;
  evidence: Evidence[];
  userId?: string;
}

interface NumberDetails {
  id?: string;
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
  evidenceCounts: { screenshots: number; audio: number; documents: number };
  commonScamType: string;
  lastReportedText: string;
  historyTimeline: { month: string; riskScore: number }[];
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language, t } = useLanguage();
  const { user, apiFetch } = useAuth();
  const phone = searchParams.get("phone") || "";

  const [searchQuery, setSearchQuery] = useState(phone);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<NumberDetails | null>(null);
  const [isWatched, setIsWatched] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);

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

  useEffect(() => {
    if (user && data) {
      apiFetch("/watchlist")
        .then((list: any[]) => {
          const item = list.find((w) => w.number === data.number);
          setIsWatched(!!item);
        })
        .catch(() => {});
    } else {
      setIsWatched(false);
    }
  }, [user, data]);

  const handleWatchToggle = async () => {
    if (!data) return;
    setWatchLoading(true);
    try {
      if (isWatched) {
        const list = await apiFetch("/watchlist");
        const item = list.find((w: any) => w.number === data.number);
        if (item) {
          await apiFetch(`/watchlist/${item.numberId}`, {
            method: "DELETE",
          });
          setIsWatched(false);
        }
      } else {
        await apiFetch("/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number: data.number }),
        });
        setIsWatched(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWatchLoading(false);
    }
  };

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
                {user && (
                  <button
                    onClick={handleWatchToggle}
                    disabled={watchLoading}
                    className={`mt-3.5 w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer ${
                      isWatched
                        ? "bg-slate-900 border border-slate-800 text-red-450 hover:bg-slate-850 hover:text-red-400"
                        : "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-550/15"
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    {isWatched
                      ? (language === "kh" ? "ឈប់តាមដានលេខនេះ" : "Unwatch Number")
                      : (language === "kh" ? "តាមដានលេខនេះ" : "Watch Number")}
                  </button>
                )}
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

                {/* Contributors list */}
                {data.riskScore > 0 && (
                  <div className="bg-[#0d0e12]/60 p-4 rounded-xl border border-slate-900 text-xs space-y-3 mt-4">
                    <h4 className="font-bold text-slate-400 uppercase tracking-wider">
                      {language === "kh" ? "សមាសភាគវាយតម្លៃហានិភ័យ" : "Risk Contributors"}
                    </h4>
                    <div className="space-y-2 font-medium">
                      <div className="flex items-center gap-2 text-slate-350">
                        <span className="text-emerald-500">✓</span>
                        <span>
                          {data.reports.filter(r => r.status === "APPROVED").length}{" "}
                          {language === "kh" ? "របាយការណ៍ត្រូវបានអនុម័ត" : "approved reports"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-350">
                        <span className="text-emerald-500">✓</span>
                        <span>
                          {new Set(data.reports.map(r => r.userId || r.id)).size}{" "}
                          {language === "kh" ? "គណនីរាយការណ៍ផ្សេងគ្នា" : "different reporters"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-350">
                        <span className="text-emerald-500">✓</span>
                        <span>
                          {data.evidenceCounts.screenshots + data.evidenceCounts.audio + data.evidenceCounts.documents}{" "}
                          {language === "kh" ? "ឯកសារភស្តុតាងភ្ជាប់" : "evidence files"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-350">
                        <span className="text-emerald-500">✓</span>
                        <span>
                          {data.recentReportsCount}{" "}
                          {language === "kh" ? "របាយការណ៍ក្នុងរយៈពេល៧ថ្ងៃចុងក្រោយ" : "reports in last 7 days"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
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
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-950/40 hover:border-red-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="h-4 w-4" />
                {t("reportNumberButton")}
              </button>
              {data.riskScore > 0 && (
                <button
                  onClick={() => router.push(`/appeal?phone=${encodeURIComponent(data.number)}`)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white transition flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Appeal Scam Rating
                </button>
              )}
            </div>

            {/* Timeline Chart */}
            {data.historyTimeline && data.historyTimeline.length > 0 && (
              <div className="glass p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-red-500" />
                  {language === "kh" ? "ប្រវត្តិនៃការពិន្ទុហានិភ័យ" : "Risk Score History"}
                </h3>
                <div className="flex items-end justify-between gap-1 pt-6 h-28 px-1 border-b border-slate-900/60">
                  {data.historyTimeline.map((pt, idx) => (
                    <div key={idx} className="flex flex-col items-center flex-grow group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-[9px] text-white font-mono -top-6 pointer-events-none z-10 whitespace-nowrap shadow-xl">
                        {pt.riskScore}%
                      </div>
                      {/* Bar */}
                      <div
                        style={{ height: `${Math.max(pt.riskScore, 4)}%` }}
                        className={`w-full max-w-[28px] rounded-t-sm transition-all duration-500 ${
                          pt.riskScore >= 75
                            ? "bg-gradient-to-t from-red-600/80 to-red-550"
                            : pt.riskScore >= 30
                            ? "bg-gradient-to-t from-orange-500/80 to-orange-450"
                            : "bg-gradient-to-t from-emerald-600/85 to-emerald-500"
                        }`}
                      />
                      {/* Month label */}
                      <span className="text-[9px] text-slate-550 font-bold mt-2">
                        {pt.month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Details & Reports Timeline Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Risk Badge Alert Banner */}
            <RiskBadge score={data.riskScore} />

            {/* Number Intelligence Profile Card */}
            {(() => {
              const latestStatus = data.reports.length > 0 ? data.reports[0].status : "SAFE";
              const activeSince = data.reports.length > 0 
                ? new Date(Math.min(...data.reports.map(r => new Date(r.createdAt).getTime()))).toLocaleDateString(language === "kh" ? "km-KH" : "en-US", { year: "numeric", month: "long", day: "numeric" })
                : (language === "kh" ? "គ្មានកំណត់ត្រា" : "No record");
              const uniqueProvinces = Array.from(new Set(data.reports.map(r => r.province).filter(Boolean)));
              
              let trendDirection = "stable";
              let trendDiff = 0;
              if (data.historyTimeline && data.historyTimeline.length >= 2) {
                const cur = data.historyTimeline[data.historyTimeline.length - 1].riskScore;
                const prev = data.historyTimeline[data.historyTimeline.length - 2].riskScore;
                trendDiff = cur - prev;
                if (cur > prev) trendDirection = "increasing";
                else if (cur < prev) trendDirection = "decreasing";
              }

              return (
                <div className="glass p-6 rounded-2xl border border-slate-800 space-y-6 relative overflow-hidden font-sans">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500/10 via-red-500/30 to-red-500/10" />
                  
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-900/60 pb-5">
                    <div>
                      <h3 className="font-bold text-white text-base flex items-center gap-2">
                        <Info className="h-4.5 w-4.5 text-red-500" />
                        {language === "kh" ? "ព័ត៌មានលម្អិតនៃលេខទូរស័ព្ទ" : "Number Intelligence Profile"}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {language === "kh" ? "ការវិភាគហានិភ័យ និងភស្តុតាងដែលបានប្រមូលផ្តុំពីរាយការណ៍របស់សហគមន៍" : "Multi-factor risk analysis and compiled community evidence files."}
                      </p>
                    </div>
                    
                    {/* Active Since */}
                    <div className="bg-slate-950/50 p-2.5 px-4 rounded-xl border border-slate-900/60 text-xs flex flex-col gap-0.5 self-start sm:self-auto shrink-0 font-sans font-medium">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        {language === "kh" ? "សកម្មតាំងពី" : "Active Since"}
                      </span>
                      <span className="text-slate-200 font-mono">
                        {activeSince}
                      </span>
                    </div>
                  </div>

                  {/* Status and Scam Type Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900/80 space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        {language === "kh" ? "ស្ថានភាពស៊ើបអង្កេត" : "Investigation Status"}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide px-2.5 py-1 rounded-lg border mt-1 ${
                        latestStatus === "CONFIRMED_SCAM" || latestStatus === "APPROVED"
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : latestStatus === "FALSE_REPORT" || latestStatus === "REJECTED"
                          ? "bg-slate-500/10 text-slate-400 border-slate-500/20"
                          : latestStatus === "INSUFFICIENT_EVIDENCE"
                          ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                          : latestStatus === "UNDER_REVIEW"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : latestStatus === "PENDING"
                          ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}>
                        {latestStatus === "CONFIRMED_SCAM" || latestStatus === "APPROVED" ? (language === "kh" ? "បញ្ជាក់ថាបោកប្រាស់" : "Confirmed Scam") :
                         latestStatus === "FALSE_REPORT" || latestStatus === "REJECTED" ? (language === "kh" ? "របាយការណ៍មិនពិត" : "False Report") :
                         latestStatus === "INSUFFICIENT_EVIDENCE" ? (language === "kh" ? "មិនគ្រប់គ្រាន់ភស្តុតាង" : "Insufficient Evidence") :
                         latestStatus === "UNDER_REVIEW" ? (language === "kh" ? "កំពុងត្រួតពិនិត្យ" : "Under Review") :
                         latestStatus === "PENDING" ? (language === "kh" ? "រង់ចាំការពិនិត្យ" : "Pending Audit") :
                         (language === "kh" ? "សុវត្ថិភាព" : "Safe")}
                      </span>
                    </div>

                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900/80 space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        {language === "kh" ? "ប្រភេទឆបោកចម្បង" : "Primary Scam Type"}
                      </span>
                      <span className="text-white text-xs font-bold uppercase tracking-wide bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-850 inline-block mt-1 truncate max-w-full">
                        {data.commonScamType === "NONE" 
                          ? (language === "kh" ? "គ្មាន" : "None")
                          : (t(data.commonScamType) || formatCategory(data.commonScamType))}
                      </span>
                    </div>

                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900/80 space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        {language === "kh" ? "និន្នាការហានិភ័យ" : "Risk Trend"}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1 font-sans">
                        {trendDirection === "increasing" ? (
                          <div className="flex items-center gap-1 text-red-500 font-black text-xs">
                            <TrendingUp className="h-4.5 w-4.5" />
                            <span>{language === "kh" ? "កើនឡើង" : "Increasing"} (+{trendDiff}%)</span>
                          </div>
                        ) : trendDirection === "decreasing" ? (
                          <div className="flex items-center gap-1 text-emerald-500 font-black text-xs">
                            <TrendingDown className="h-4.5 w-4.5" />
                            <span>{language === "kh" ? "ថយចុះ" : "Decreasing"} ({trendDiff}%)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-slate-400 font-black text-xs">
                            <span className="text-sm font-bold">—</span>
                            <span>{language === "kh" ? "ថេរ" : "Stable"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Geographic and Evidence Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Affected Provinces */}
                    <div className="bg-[#0b0c10]/40 p-4 rounded-xl border border-slate-900/80 space-y-3.5">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Map className="h-4 w-4 text-orange-500" />
                        {language === "kh" ? "ខេត្តដែលរងផលប៉ះពាល់" : "Affected Provinces"}
                      </h4>
                      {uniqueProvinces.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {uniqueProvinces.map((prov, index) => (
                            <span key={index} className="text-xs font-semibold text-slate-300 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-850 flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-red-500/80" />
                              {prov}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 leading-relaxed font-sans font-medium">
                          {language === "kh" ? "គ្មានកំណត់ត្រាខេត្តជាក់លាក់ (ប្រព័ន្ធជាតិ)" : "No specific province locked (National range)."}
                        </p>
                      )}
                    </div>

                    {/* Evidence Profile */}
                    <div className="bg-[#0b0c10]/40 p-4 rounded-xl border border-slate-900/80 space-y-3.5">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-emerald-500" />
                        {language === "kh" ? "ទម្រង់ភស្តុតាង" : "Evidence Profile"}
                      </h4>
                      <div className="grid grid-cols-3 gap-2.5 font-sans font-semibold">
                        <div className="bg-slate-955/60 p-2.5 rounded-lg border border-slate-900/60 text-center flex flex-col items-center">
                          <Image className="h-4.5 w-4.5 text-blue-400 mb-1" />
                          <span className="text-white font-bold text-xs font-mono">{data.evidenceCounts.screenshots}</span>
                          <span className="text-[9px] text-slate-550 font-bold uppercase mt-0.5">Images</span>
                        </div>
                        <div className="bg-slate-955/60 p-2.5 rounded-lg border border-slate-900/60 text-center flex flex-col items-center">
                          <FileAudio className="h-4.5 w-4.5 text-emerald-400 mb-1" />
                          <span className="text-white font-bold text-xs font-mono">{data.evidenceCounts.audio}</span>
                          <span className="text-[9px] text-slate-550 font-bold uppercase mt-0.5">Audio</span>
                        </div>
                        <div className="bg-slate-955/60 p-2.5 rounded-lg border border-slate-900/60 text-center flex flex-col items-center">
                          <FileText className="h-4.5 w-4.5 text-orange-400 mb-1" />
                          <span className="text-white font-bold text-xs font-mono">{data.evidenceCounts.documents}</span>
                          <span className="text-[9px] text-slate-550 font-bold uppercase mt-0.5">Docs</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })()}

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
                              <p className="text-sm text-slate-300 mt-2.5 bg-slate-950/40 p-3.5 rounded-xl border border-slate-900/60 leading-relaxed font-sans font-medium">
                                {report.description || t("noDescription")}
                              </p>
                              {report.evidence && report.evidence.length > 0 && (
                                <div className="mt-3.5 space-y-2">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    Evidence Attachments
                                  </p>
                                  <div className="flex flex-wrap gap-3">
                                    {report.evidence.map((file) => {
                                      const fullUrl = `${API_BASE.replace("/api", "")}${file.fileUrl}`;
                                      if (file.fileType.startsWith("image/")) {
                                        return (
                                          <a
                                            key={file.id}
                                            href={fullUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="group/thumb relative block shrink-0"
                                          >
                                            <img
                                              src={fullUrl}
                                              alt="Evidence"
                                              className="w-16 h-16 object-cover rounded-lg border border-slate-800 hover:border-slate-755 transition"
                                            />
                                          </a>
                                        );
                                      } else if (file.fileType.startsWith("audio/")) {
                                        return (
                                          <div key={file.id} className="w-full max-w-xs bg-slate-950/80 p-2.5 rounded-xl border border-slate-850 flex flex-col gap-1.5">
                                            <span className="text-[10px] text-slate-400 font-semibold truncate">
                                              Audio Recording
                                            </span>
                                            <audio
                                              controls
                                              src={fullUrl}
                                              className="w-full h-8 accent-red-500 text-xs"
                                            />
                                          </div>
                                        );
                                      }
                                      return null;
                                    })}
                                  </div>
                                </div>
                              )}
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

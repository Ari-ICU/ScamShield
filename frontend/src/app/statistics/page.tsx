"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BarChart, LineChart } from "@/components/Charts";
import { useLanguage } from "@/context/LanguageContext";
import { API_BASE } from "@/lib/api";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  PieChart,
  Info,
  ShieldAlert,
  Activity,
  Shield,
  ArrowUpRight,
  LayoutGrid
} from "lucide-react";

interface CategoryStat {
  category: string;
  count: number;
}

interface RiskNumber {
  number: string;
  riskScore: number;
  totalReport: number;
}

interface DashboardStats {
  totalScamNumbers: number;
  reportsToday: number;
  activeReporters: number;
  categoryDistribution: CategoryStat[];
  highestRiskNumbers: RiskNumber[];
}

export default function StatisticsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [volumeView, setVolumeView] = useState<"chart" | "list">("chart");

  useEffect(() => {
    fetch(`${API_BASE}/dashboard/stats`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not retrieve statistics data");
        return res.json();
      })
      .then((data: DashboardStats) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        // Fallback placeholder data if offline
        setStats({
          totalScamNumbers: 1482,
          reportsToday: 38,
          activeReporters: 840,
          categoryDistribution: [
            { category: "BANK_FRAUD", count: 482 },
            { category: "FAKE_DELIVERY", count: 349 },
            { category: "INVESTMENT", count: 219 },
            { category: "LOTTERY", count: 185 },
            { category: "GOVERNMENT", count: 128 },
            { category: "ROMANCE", count: 94 },
            { category: "OTHER", count: 25 },
          ],
          highestRiskNumbers: [
            { number: "+85599888777", riskScore: 95, totalReport: 18 },
            { number: "+85512345678", riskScore: 90, totalReport: 15 },
            { number: "+85577666555", riskScore: 85, totalReport: 12 },
            { number: "+85588333444", riskScore: 80, totalReport: 10 },
            { number: "+85515222333", riskScore: 75, totalReport: 9 },
          ],
        });
        setLoading(false);
      });
  }, []);

  const formatCategory = (cat: string) => {
    return cat.replace(/_/g, " ");
  };

  // Static trend analysis mock
  const trendsData = [
    { label: "Jan", value: 120 },
    { label: "Feb", value: 190 },
    { label: "Mar", value: 160 },
    { label: "Apr", value: 240 },
    { label: "May", value: 310 },
    { label: "Jun", value: 480 },
  ];

  const categoryChartData = stats?.categoryDistribution
    ? stats.categoryDistribution.map((c) => ({
        label: t(c.category) || formatCategory(c.category),
        value: c.count,
      }))
    : [];

  const totalCategoryReports = stats?.categoryDistribution
    ? stats.categoryDistribution.reduce((acc, curr) => acc + curr.count, 0)
    : 1;

  const handleNumberClick = (phoneNum: string) => {
    router.push(`/search?phone=${encodeURIComponent(phoneNum)}`);
  };

  const getRankBadge = (idx: number) => {
    switch (idx) {
      case 0:
        return "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-md shadow-amber-500/20 border border-amber-400/40";
      case 1:
        return "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-950 font-black shadow-md shadow-slate-350/20 border border-slate-350/40";
      case 2:
        return "bg-gradient-to-r from-amber-655 to-amber-700 text-white font-black shadow-md shadow-amber-750/20 border border-amber-600/40";
      default:
        return "bg-slate-900 text-slate-400 font-bold border border-slate-800";
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-grow grid-bg relative py-12 px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-140px)]">
        {/* Background Ambient Orbs */}
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto space-y-8 relative z-10">
          
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex p-3.5 bg-red-500/10 rounded-full border border-red-500/20 text-red-500 mb-4 shadow-inner shadow-red-500/10">
              <BarChart3 className="h-6.5 w-6.5 animate-pulse" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{t("metricsTitle")}</h1>
            <p className="text-slate-400 text-sm max-w-lg mx-auto mt-2 leading-relaxed">
              {t("metricsDesc")}
            </p>
          </motion.div>

          {loading || !stats ? (
            <div className="glass p-20 rounded-2xl border border-slate-800 text-center shadow-xl">
              <div className="h-8 w-8 border-4 border-slate-800 border-t-red-650 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400 text-sm">{t("aggregatingTelemetry")}</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
              className="space-y-8"
            >
              
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                <motion.div
                  whileHover={{ y: -4 }}
                  className="glass p-6 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-red-500" />
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {t("totalScamNumbers")}
                    </span>
                    <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
                      {stats.totalScamNumbers}
                    </span>
                  </div>
                  <div className="p-3 bg-red-500/10 rounded-xl text-red-500 border border-red-500/20">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                </motion.div>
                
                <motion.div
                  whileHover={{ y: -4 }}
                  className="glass p-6 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-orange-500" />
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {t("newReportsToday")}
                    </span>
                    <span className="text-3xl font-extrabold text-orange-500 tracking-tight font-mono">
                      +{stats.reportsToday}
                    </span>
                  </div>
                  <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500 border border-orange-500/20">
                    <Activity className="h-6 w-6 animate-pulse" />
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -4 }}
                  className="glass p-6 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-emerald-500" />
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {t("activeProtections")}
                    </span>
                    <span className="text-sm font-bold text-emerald-450 flex items-center gap-2 mt-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span>SHIELD SECURED</span>
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                    <Shield className="h-6 w-6" />
                  </div>
                </motion.div>

              </div>

              {/* Charts Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Line Chart Card */}
                <div className="glass p-6 rounded-2xl border border-slate-800 space-y-6 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
                  <div className="flex justify-between items-center border-b border-slate-900 pb-4">
                    <h3 className="font-bold text-base text-white flex items-center gap-2.5">
                      <TrendingUp className="h-5 w-5 text-red-500" /> {t("reportingVelocityTitle")}
                    </h3>
                  </div>
                  <div className="pt-2">
                    <LineChart data={trendsData} />
                  </div>
                  <div className="text-[11px] text-slate-400 flex gap-2.5 items-start bg-slate-950/60 p-3.5 rounded-xl border border-slate-900 leading-relaxed shadow-inner">
                    <Info className="h-4.5 w-4.5 shrink-0 mt-0.5 text-slate-500" />
                    <span>
                      {t("reportingVelocityDesc")}
                    </span>
                  </div>
                </div>

                {/* Bar Chart Card with Toggles */}
                <div className="glass p-6 rounded-2xl border border-slate-800 space-y-6 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
                  <div className="flex justify-between items-center border-b border-slate-900 pb-4">
                    <h3 className="font-bold text-base text-white flex items-center gap-2.5">
                      <PieChart className="h-5 w-5 text-orange-500" /> {t("scamMethodVolumes")}
                    </h3>

                    {/* Interactive Tab Toggles */}
                    <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-900">
                      <button
                        onClick={() => setVolumeView("chart")}
                        className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                          volumeView === "chart"
                            ? "bg-orange-500/10 border border-orange-500/20 text-orange-400"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <PieChart className="h-3.5 w-3.5" />
                        <span>Chart</span>
                      </button>
                      <button
                        onClick={() => setVolumeView("list")}
                        className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                          volumeView === "list"
                            ? "bg-orange-500/10 border border-orange-500/20 text-orange-400"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span>List</span>
                      </button>
                    </div>
                  </div>

                  {categoryChartData.length === 0 ? (
                    <p className="text-slate-500 text-center py-12">{t("noCategoriesLoaded")}</p>
                  ) : volumeView === "chart" ? (
                    <BarChart data={categoryChartData} />
                  ) : (
                    <div className="space-y-4 pt-2 max-h-[300px] overflow-y-auto scrollbar-none">
                      {stats.categoryDistribution.map((item, idx) => {
                        const percent = Math.round((item.count / totalCategoryReports) * 100);
                        return (
                          <div key={idx} className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-900/60">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-white">{t(item.category) || formatCategory(item.category)}</span>
                              <span className="font-mono text-slate-400 font-semibold">{item.count} ({percent}%)</span>
                            </div>
                            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-850">
                              <div 
                                className="bg-orange-500 h-full rounded-full" 
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Table of Top Flagged Numbers (Cyan/Red Security Theme) */}
                <div className="lg:col-span-2 glass p-6 rounded-2xl border border-slate-800 space-y-6 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
                  <h3 className="font-bold text-base text-white flex items-center gap-2.5">
                    <AlertTriangle className="h-5 w-5 text-red-500" /> {t("highDensityThreatLog")}
                  </h3>
                  
                  <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/30">
                    <table className="min-w-full divide-y divide-slate-900 text-left text-sm">
                      <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-xs">
                        <tr>
                          <th className="px-6 py-4">{t("tablePhoneId")}</th>
                          <th className="px-6 py-4">{t("tableTotalReports")}</th>
                          <th className="px-6 py-4">{t("tableRiskScore")}</th>
                          <th className="px-6 py-4">{t("tableClassification")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 text-slate-300 bg-transparent">
                        {stats.highestRiskNumbers.map((n, idx) => (
                          <tr 
                            key={idx}
                            onClick={() => handleNumberClick(n.number)}
                            className="hover:bg-slate-900/40 transition cursor-pointer group/row"
                          >
                            <td className="px-6 py-4 font-mono font-bold text-white flex items-center gap-2.5">
                              <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 ${getRankBadge(idx)}`}>
                                {idx + 1}
                              </span>
                              <span className="group-hover/row:text-red-400 group-hover/row:underline transition duration-200">
                                {n.number}
                              </span>
                              <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover/row:opacity-100 text-red-400 transition-all duration-200" />
                            </td>
                            <td className="px-6 py-4 font-mono">{n.totalReport}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-red-500 font-bold text-xs shrink-0 w-8">{n.riskScore}%</span>
                                <div className="w-24 bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-850 shrink-0">
                                  <div 
                                    className="bg-red-500 h-full rounded-full" 
                                    style={{ width: `${n.riskScore}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 uppercase tracking-wide">
                                {t("highRiskThreatBadge")}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {stats.highestRiskNumbers.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center py-8 text-slate-500">
                              {t("noThreatItems")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BarChart, LineChart } from "@/components/Charts";
import { useLanguage } from "@/context/LanguageContext";
import { API_BASE } from "@/lib/api";
import { BarChart3, TrendingUp, AlertTriangle, ShieldCheck, PieChart, Info } from "lucide-react";

export default function StatisticsPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/dashboard/stats`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not retrieve statistics data");
        return res.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        // Fallback placeholder data if offline
        setStats({
          totalScamNumbers: 1482,
          reportsToday: 38,
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
    ? stats.categoryDistribution.map((c: any) => ({
        label: t(c.category) || formatCategory(c.category),
        value: c.count,
      }))
    : [];

  return (
    <>
      <Navbar />
      <main className="flex-grow grid-bg relative py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-8 relative z-10">
          
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex p-3 bg-red-500/10 rounded-full border border-red-500/20 text-red-500 mb-3">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold text-white font-sans">{t("metricsTitle")}</h1>
            <p className="text-slate-400 text-sm max-w-md mx-auto mt-1.5 leading-relaxed">
              {t("metricsDesc")}
            </p>
          </div>

          {loading ? (
            <div className="glass p-20 rounded-2xl border border-slate-800 text-center">
              <div className="h-8 w-8 border-4 border-slate-800 border-t-red-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400 text-sm">{t("aggregatingTelemetry")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Line Chart Card */}
              <div className="glass p-6 rounded-2xl border border-slate-800 space-y-6">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-red-500" /> {t("reportingVelocityTitle")}
                </h3>
                <div className="pt-2">
                  <LineChart data={trendsData} />
                </div>
                <div className="text-[11px] text-slate-500 flex gap-1.5 items-start bg-slate-950/40 p-3 rounded-xl border border-slate-900 leading-relaxed">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    {t("reportingVelocityDesc")}
                  </span>
                </div>
              </div>

              {/* Bar Chart Card */}
              <div className="glass p-6 rounded-2xl border border-slate-800 space-y-6">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-orange-500" /> {t("scamMethodVolumes")}
                </h3>
                {categoryChartData.length === 0 ? (
                  <p className="text-slate-500 text-center py-10">{t("noCategoriesLoaded")}</p>
                ) : (
                  <BarChart data={categoryChartData} />
                )}
              </div>

              {/* Table of Top Flagged Numbers */}
              <div className="lg:col-span-2 glass p-6 rounded-2xl border border-slate-800 space-y-6">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" /> {t("highDensityThreatLog")}
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-900">
                  <table className="min-w-full divide-y divide-slate-900 text-left text-sm">
                    <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-xs">
                      <tr>
                        <th className="px-6 py-4">{t("tablePhoneId")}</th>
                        <th className="px-6 py-4">{t("tableTotalReports")}</th>
                        <th className="px-6 py-4">{t("tableRiskScore")}</th>
                        <th className="px-6 py-4">{t("tableClassification")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-slate-355 bg-slate-950/20">
                      {stats?.highestRiskNumbers?.map((n: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-900/30 transition">
                          <td className="px-6 py-4 font-mono font-bold text-white">{n.number}</td>
                          <td className="px-6 py-4 font-mono">{n.totalReport}</td>
                          <td className="px-6 py-4 font-mono text-red-500 font-bold">{n.riskScore}%</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 uppercase tracking-wide">
                              {t("highRiskThreatBadge")}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(!stats?.highestRiskNumbers || stats.highestRiskNumbers.length === 0) && (
                        <tr>
                          <td colSpan={4} className="text-center py-6 text-slate-500">
                            {t("noThreatItems")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

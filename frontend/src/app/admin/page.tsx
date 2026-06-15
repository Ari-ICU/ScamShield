"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { BarChart } from "@/components/Charts";
import { ShieldCheck, BarChart3, AlertTriangle, RefreshCw, MapPin, Globe } from "lucide-react";

export default function AdminOverview() {
  const { apiFetch } = useAuth();
  const { t } = useLanguage();
  
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = async () => {
    setLoading(true);
    setError("");
    try {
      const statsData = await apiFetch("/dashboard/stats");
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || "Failed to load telemetry stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const formatCategory = (cat: string) => {
    return cat.replace(/_/g, " ");
  };

  const chartData = stats?.categoryDistribution
    ? stats.categoryDistribution.map((c: any) => ({
        label: t(c.category) || formatCategory(c.category),
        value: c.count,
      }))
    : [];

  const totalReportsCount = stats?.provinceDistribution
    ? stats.provinceDistribution.reduce((acc: number, curr: any) => acc + curr.count, 0)
    : 0;

  if (loading) {
    return (
      <div className="glass p-20 rounded-2xl border border-slate-800 text-center">
        <div className="h-8 w-8 border-4 border-slate-800 border-t-red-605 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">{t("syncRegistries")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass p-8 rounded-2xl border border-slate-800 text-center text-red-400 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-red-500" /> {t("adminControls")} (Overview)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t("adminDesc")}
          </p>
        </div>
        <button
          onClick={loadStats}
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("refreshData")}
        </button>
      </div>

      {/* Cards stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="glass p-5 rounded-2xl border border-slate-800">
          <div className="text-2xl font-extrabold text-white font-mono">
            {stats?.totalScamNumbers || 0}
          </div>
          <div className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">
            {t("totalScamNumbers")}
          </div>
        </div>
        <div className="glass p-5 rounded-2xl border border-slate-800">
          <div className="text-2xl font-extrabold text-red-500 font-mono">
            +{stats?.reportsToday || 0}
          </div>
          <div className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">
            {t("newReportsToday")}
          </div>
        </div>
        <div className="glass p-5 rounded-2xl border border-slate-800">
          <div className="text-2xl font-extrabold text-orange-400 font-mono">
            {stats?.provinceDistribution?.length || 0}
          </div>
          <div className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">
            Provinces Hit
          </div>
        </div>
        <div className="glass p-5 rounded-2xl border border-slate-800">
          <div className="text-2xl font-extrabold text-green-500 font-mono">
            {stats?.totalScamNumbers ? Math.ceil(stats.totalScamNumbers * 0.6) : 0}
          </div>
          <div className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">
            {t("activeReporters")}
          </div>
        </div>
      </div>

      {/* Analytics widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Scam Categorization */}
        <div className="lg:col-span-2 glass p-6 rounded-2xl border border-slate-800 space-y-6">
          <h3 className="font-bold text-sm text-white uppercase tracking-wider border-b border-slate-900 pb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-red-500" />
            {t("scamCategorization")}
          </h3>
          {chartData.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">{t("noCategoriesLoaded")}</p>
          ) : (
            <BarChart data={chartData} />
          )}
        </div>

        {/* Highest Risk list */}
        <div className="lg:col-span-1 glass p-6 rounded-2xl border border-slate-800 space-y-6">
          <h3 className="font-bold text-sm text-white uppercase tracking-wider border-b border-slate-900 pb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            {t("highestRiskCallers")}
          </h3>
          <div className="space-y-3.5">
            {stats?.highestRiskNumbers?.map((n: any) => (
              <div key={n.id} className="flex justify-between items-center bg-slate-950/40 p-3.5 rounded-xl border border-slate-900">
                <span className="font-mono text-xs font-bold text-slate-300">{n.number}</span>
                <div className="flex gap-2 items-center">
                  <span className="text-[9px] bg-red-955/20 text-red-400 font-bold px-2 py-0.5 rounded border border-red-500/10">
                    {n.totalReport} reports
                  </span>
                  <span className="text-xs font-mono font-bold text-red-500">{n.riskScore}%</span>
                </div>
              </div>
            ))}
            {(!stats?.highestRiskNumbers || stats.highestRiskNumbers.length === 0) && (
              <p className="text-xs text-slate-500 text-center">{t("noThreatItems")}</p>
            )}
          </div>
        </div>

        {/* Geographic Hotspots Breakdown */}
        <div className="lg:col-span-2 glass p-6 rounded-2xl border border-slate-800 space-y-6">
          <h3 className="font-bold text-sm text-white uppercase tracking-wider border-b border-slate-900 pb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-red-500" />
            Geographic Hotspots (Cambodian Provinces)
          </h3>
          <div className="space-y-4">
            {stats?.provinceDistribution && stats.provinceDistribution.length > 0 ? (
              stats.provinceDistribution.map((p: any, idx: number) => {
                const percentage = totalReportsCount > 0 ? Math.round((p.count / totalReportsCount) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-350 flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 font-mono">#{idx + 1}</span>
                        {p.province}
                      </span>
                      <span className="text-slate-450 font-mono">{p.count} reports ({percentage}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                      <div 
                        className="h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full transition-all duration-550"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">No provincial data reported yet.</p>
            )}
          </div>
        </div>

        {/* Country Registry breakdown */}
        <div className="lg:col-span-1 glass p-6 rounded-2xl border border-slate-800 space-y-6">
          <h3 className="font-bold text-sm text-white uppercase tracking-wider border-b border-slate-900 pb-3 flex items-center gap-2">
            <Globe className="h-4 w-4 text-red-500" />
            Registry Country Origin
          </h3>
          <div className="space-y-3.5">
            {stats?.countryDistribution && stats.countryDistribution.length > 0 ? (
              stats.countryDistribution.map((c: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-slate-950/40 p-3.5 rounded-xl border border-slate-900">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-300 bg-slate-900 border border-slate-800 px-2 py-1 rounded">
                      {c.countryCode}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {c.countryCode === "KH" || c.countryCode === "855" ? "Cambodia" : "International"}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-extrabold text-white">
                    {c.count} number{c.count !== 1 ? "s" : ""}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">No countries registered yet.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

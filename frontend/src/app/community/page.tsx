"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { io, Socket } from "socket.io-client";
import { useLanguage } from "@/context/LanguageContext";
import { API_BASE, SOCKET_URL } from "@/lib/api";
import {
  Users,
  AlertTriangle,
  Calendar,
  ShieldAlert,
  Volume2,
  X,
  ShieldCheck
} from "lucide-react";

interface LiveReport {
  id: string;
  number: string;
  riskScore: number;
  category: string;
  description: string | null;
  createdAt: string;
  reporter: string;
}

interface AlertNotification {
  number: string;
  riskScore: number;
  totalReports: number;
  category: string;
}

export default function CommunityPage() {
  const { t } = useLanguage();
  const [reports, setReports] = useState<LiveReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Alert overlays
  const [alert, setAlert] = useState<AlertNotification | null>(null);

  useEffect(() => {
    // 1. Fetch initial reports
    fetch(`${API_BASE}/reports`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not retrieve community reports");
        return res.json();
      })
      .then((data) => {
        setReports(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load reports feed");
        setLoading(false);
      });

    // 2. Connect to Socket.IO Server
    const socket: Socket = io(SOCKET_URL);

    socket.on("connect", () => {
      console.log("Connected to live telemetry socket");
    });

    socket.on("new_report", (newReport: any) => {
      // Structure match
      const formattedReport: LiveReport = {
        id: newReport.id,
        number: newReport.number,
        riskScore: newReport.riskScore,
        category: newReport.category,
        description: newReport.description,
        createdAt: newReport.createdAt,
        reporter: newReport.reporter || "Anonymous",
      };

      setReports((prev) => [formattedReport, ...prev.slice(0, 19)]);
    });

    socket.on("risk_alert", (alertData: any) => {
      setAlert(alertData);
      // Automatically hide after 6 seconds
      setTimeout(() => {
        setAlert(null);
      }, 6000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const formatCategory = (cat: string) => {
    return cat.replace(/_/g, " ");
  };

  const getRiskLevelText = (score: number) => {
    if (score >= 75) return t("criticalStatus");
    if (score >= 30) return t("suspiciousStatus");
    return t("safeStatus");
  };

  return (
    <>
      <Navbar />
      <main className="flex-grow grid-bg relative py-12 px-4 sm:px-6 lg:px-8">
        
        {/* Real-time Alert Banner Popup */}
        {alert && (
          <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm glass border border-red-500/30 p-4 rounded-xl shadow-2xl bg-red-950/40 text-red-200 animate-bounce">
            <div className="flex justify-between items-start gap-2">
              <div className="flex gap-2 items-start">
                <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-white">{t("highRiskDetected")}</h4>
                  <p className="text-xs font-mono font-bold mt-1 text-red-300 bg-black/40 px-2 py-0.5 rounded inline-block">
                    {alert.number}
                  </p>
                  <p className="text-xs mt-2 opacity-80">
                    {t("flaggedFor")} <span className="font-semibold">{t(alert.category) || formatCategory(alert.category)}</span>{t("riskIndexReached")}{alert.riskScore}/100.
                  </p>
                </div>
              </div>
              <button onClick={() => setAlert(null)} className="text-slate-400 hover:text-white transition">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex p-3 bg-red-500/10 rounded-full border border-red-500/20 text-red-500 mb-3">
              <Users className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold text-white">{t("liveTelemetryTitle")}</h1>
            <p className="text-slate-400 text-sm max-w-md mx-auto mt-1.5 leading-relaxed">
              {t("liveTelemetryDesc")}
            </p>
          </div>

          {loading ? (
            <div className="glass p-12 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-4 text-center">
              <div className="h-8 w-8 border-4 border-slate-800 border-t-red-600 rounded-full animate-spin" />
              <p className="text-slate-400 text-xs">{t("connectingLive")}</p>
            </div>
          ) : error ? (
            <div className="glass p-8 rounded-2xl border border-slate-800 text-center text-red-400 text-sm">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              
              <div className="flex justify-between items-center px-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {t("timelineStream")}
                </span>
                <span className="text-[10px] bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full text-red-400 font-bold flex gap-1.5 items-center animate-pulse">
                  <span className="h-1.5 w-1.5 bg-red-500 rounded-full" />
                  {t("liveConnecting")}
                </span>
              </div>

              {reports.length === 0 ? (
                <div className="glass p-12 rounded-2xl text-center text-slate-500">
                  {t("noScamLogs")}
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="glass p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between gap-4 glass-hover"
                    >
                      <div className="space-y-2.5 flex-grow">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-base font-bold text-white tracking-wide">
                            {report.number}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 font-mono font-semibold text-slate-400 uppercase">
                            {t(report.category) || formatCategory(report.category)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed font-sans max-w-2xl bg-slate-950/20 border border-slate-900/40 p-3 rounded-xl">
                          {report.description || t("noDescription")}
                        </p>
                        <div className="flex gap-4 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                          <span>{t("reportedBy")}{report.reporter}</span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Right Hand score indicator */}
                      <div className="flex sm:flex-col justify-between items-center sm:items-end shrink-0 gap-2 border-t sm:border-t-0 border-slate-900 pt-3 sm:pt-0">
                        <div className="text-right sm:text-right">
                          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                            {t("riskLevelLabel")}
                          </div>
                          <div
                            className={`text-sm font-extrabold mt-0.5 ${
                              report.riskScore >= 75
                                ? "text-red-500"
                                : report.riskScore >= 30
                                ? "text-orange-500"
                                : "text-emerald-500"
                            }`}
                          >
                            {getRiskLevelText(report.riskScore)}
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 text-xs font-mono font-bold rounded-lg border ${
                            report.riskScore >= 75
                              ? "bg-red-500/10 border-red-500/20 text-red-400"
                              : report.riskScore >= 30
                              ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {t("riskIndex")}: {report.riskScore}
                        </span>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

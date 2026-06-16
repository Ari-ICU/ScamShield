"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { io, Socket } from "socket.io-client";
import { useLanguage } from "@/context/LanguageContext";
import { API_BASE, SOCKET_URL } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Calendar,
  ShieldAlert,
  X,
  ArrowUpRight
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

const detectCarrier = (phoneNum: string): string => {
  const sanitized = phoneNum.replace(/\s+/g, "").replace(/^\+855/, "0");
  if (!sanitized) return "";

  const smartPrefixes = /^(010|015|016|069|070|081|086|087|093|096|098)/;
  const cellcardPrefixes = /^(012|017|061|076|077|078|085|089|092|095|099)/;
  const metfonePrefixes = /^(097|088|071|068|067|066|090|031)/;
  const seatelPrefixes = /^(018)/;
  const cootelPrefixes = /^(011|060|080|083|084|091)/;

  if (smartPrefixes.test(sanitized)) return "Smart";
  if (cellcardPrefixes.test(sanitized)) return "Cellcard";
  if (metfonePrefixes.test(sanitized)) return "Metfone";
  if (seatelPrefixes.test(sanitized)) return "Seatel";
  if (cootelPrefixes.test(sanitized)) return "CooTel";

  return "";
};

const getCarrierBadgeColor = (carrier: string) => {
  switch (carrier) {
    case "Smart":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "Cellcard":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "Metfone":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "Seatel":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "CooTel":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    default:
      return "bg-slate-800/50 text-slate-400 border-slate-700/50";
  }
};

export default function CommunityPage() {
  const { t } = useLanguage();
  const router = useRouter();
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
      .then((data: LiveReport[]) => {
        setReports(data.slice(0, 20));
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message || "Failed to load reports feed");
        setLoading(false);
      });

    // 2. Connect to Socket.IO Server
    const socket: Socket = io(SOCKET_URL);

    socket.on("connect", () => {
      console.log("Connected to live telemetry socket");
    });

    socket.on("new_report", (newReport: LiveReport) => {
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

    socket.on("risk_alert", (alertData: AlertNotification) => {
      setAlert(alertData);
      
      const timer = setTimeout(() => {
        setAlert(null);
      }, 6000);

      return () => clearTimeout(timer);
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

  const handleNumberClick = (phoneNum: string) => {
    router.push(`/search?phone=${encodeURIComponent(phoneNum)}`);
  };

  return (
    <>
      <Navbar />
      <main className="flex-grow grid-bg relative py-12 px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-140px)]">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
        <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-orange-500/5 rounded-full blur-[90px] pointer-events-none" />

        {/* Real-time Alert Banner Popup Overhaul */}
        <AnimatePresence>
          {alert && (
            <motion.div
              initial={{ x: 350, opacity: 0, scale: 0.9 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: 350, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 120, damping: 15 }}
              className="fixed bottom-6 right-6 z-50 w-full max-w-sm glass border border-red-500/40 p-5 rounded-2xl shadow-2xl bg-red-950/40 text-red-200"
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-600 via-orange-500 to-red-650" />
              <div className="flex justify-between items-start gap-3">
                <div className="flex gap-3 items-start">
                  <div className="p-2 bg-red-500/10 rounded-xl text-red-400 border border-red-500/20 shrink-0 mt-0.5 animate-pulse">
                    <ShieldAlert className="h-5.5 w-5.5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-white tracking-tight">{t("highRiskDetected")}</h4>
                    <button 
                      onClick={() => handleNumberClick(alert.number)}
                      className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-slate-950/70 border border-slate-800 text-red-400 flex items-center gap-1 hover:border-red-500 hover:text-white transition duration-200 cursor-pointer"
                    >
                      <span>{alert.number}</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                    <p className="text-xs text-slate-350 leading-relaxed pt-1">
                      {t("flaggedFor")} <span className="font-semibold text-white">{t(alert.category) || formatCategory(alert.category)}</span>{t("riskIndexReached")}<span className="text-red-400 font-bold font-mono">{alert.riskScore}%</span>.
                    </p>
                  </div>
                </div>
                <button onClick={() => setAlert(null)} className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded-lg transition cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex p-3.5 bg-red-500/10 rounded-full border border-red-500/20 text-red-500 mb-4 shadow-inner shadow-red-500/10">
              <Users className="h-6.5 w-6.5 animate-pulse" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{t("liveTelemetryTitle")}</h1>
            <p className="text-slate-400 text-sm max-w-lg mx-auto mt-2 leading-relaxed">
              {t("liveTelemetryDesc")}
            </p>
          </motion.div>

          {loading ? (
            <div className="glass p-16 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-4 text-center shadow-xl">
              <div className="h-8 w-8 border-4 border-slate-800 border-t-red-650 rounded-full animate-spin" />
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{t("connectingLive")}</p>
            </div>
          ) : error ? (
            <div className="glass p-8 rounded-2xl border border-red-500/20 text-center text-red-400 text-sm shadow-xl">
              {error}
            </div>
          ) : (
            <div className="space-y-5">
              
              <div className="flex justify-between items-center px-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t("timelineStream")}
                </span>
                <span className="text-[10px] bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full text-red-400 font-bold flex gap-2 items-center animate-pulse">
                  <span className="h-1.5 w-1.5 bg-red-500 rounded-full" />
                  {t("liveConnecting")}
                </span>
              </div>

              {reports.length === 0 ? (
                <div className="glass p-16 rounded-2xl text-center text-slate-500 border border-slate-850 shadow-inner">
                  {t("noScamLogs")}
                </div>
              ) : (
                <div className="relative space-y-6 pl-8">
                  {/* Vertical Timeline Thread */}
                  <div className="absolute top-2 bottom-2 left-[18px] w-[2px] bg-slate-900" />

                  <AnimatePresence initial={false}>
                    {reports.map((report) => {
                      const carrier = detectCarrier(report.number);
                      const isHighRisk = report.riskScore >= 75;
                      const isSuspicious = report.riskScore >= 30;

                      return (
                        <motion.div
                          key={report.id}
                          layout
                          initial={{ opacity: 0, x: -20, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                          transition={{ type: "spring", stiffness: 150, damping: 18 }}
                          className="relative"
                        >
                          {/* Timeline node dot */}
                          <div className={`w-3.5 h-3.5 rounded-full absolute -left-[26px] top-[24px] z-10 border-2 border-slate-950 shadow-lg ${
                            isHighRisk
                              ? "bg-red-500 shadow-red-500/20 animate-pulse"
                              : isSuspicious
                              ? "bg-orange-500"
                              : "bg-emerald-500"
                          }`} />

                          <div className="glass p-5 rounded-2xl border border-slate-850 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-750 transition duration-350 hover:shadow-lg hover:shadow-red-500/5 group/card">
                            <div className="space-y-2 flex-grow min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() => handleNumberClick(report.number)}
                                  className="font-mono text-base font-bold text-white tracking-wide hover:text-red-400 hover:underline transition flex items-center gap-1 cursor-pointer"
                                >
                                  <span>{report.number}</span>
                                  <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover/card:opacity-100 text-red-400 transition-opacity" />
                                </button>
                                <span className="text-[10px] px-2.5 py-0.5 rounded bg-slate-950/80 border border-slate-900 font-mono font-bold text-slate-400 uppercase tracking-wide">
                                  {t(report.category) || formatCategory(report.category)}
                                </span>
                                {carrier && (
                                  <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${getCarrierBadgeColor(carrier)}`}>
                                    {carrier}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-350 leading-relaxed font-sans max-w-2xl bg-slate-950/35 border border-slate-900/60 p-3.5 rounded-xl shadow-inner break-words">
                                {report.description || t("noDescription")}
                              </p>
                              <div className="flex gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <span>{t("reportedBy")}{report.reporter}</span>
                                <span>&bull;</span>
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {new Date(report.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            {/* Right Hand score indicator */}
                            <div className="flex sm:flex-col justify-between items-center sm:items-end shrink-0 gap-3 border-t sm:border-t-0 border-slate-900/50 pt-3 sm:pt-0 w-full sm:w-auto">
                              <div className="text-left sm:text-right">
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                  {t("riskLevelLabel")}
                                </div>
                                <div
                                  className={`text-sm font-extrabold mt-0.5 ${
                                    isHighRisk
                                      ? "text-red-500"
                                      : isSuspicious
                                      ? "text-orange-500"
                                      : "text-emerald-500"
                                  }`}
                                >
                                  {getRiskLevelText(report.riskScore)}
                                </div>
                              </div>
                              <span
                                className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border shrink-0 ${
                                  isHighRisk
                                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                                    : isSuspicious
                                    ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                }`}
                              >
                                {t("riskIndex")}: {report.riskScore}
                              </span>
                            </div>

                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
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

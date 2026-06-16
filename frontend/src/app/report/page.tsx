"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";
import { API_BASE } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Phone,
  FileText,
  Send,
  LogIn,
  MapPin,
  CreditCard,
  Truck,
  TrendingUp,
  Trophy,
  Building,
  Heart,
  Cpu,
  ShieldQuestion,
  Map,
  Navigation,
  Home,
  Check,
  CheckCircle2,
  Activity,
  Info,
  Lock,
  Upload,
  X,
  Image,
  FileAudio
} from "lucide-react";

enum ScamType {
  BANK_FRAUD = "BANK_FRAUD",
  FAKE_DELIVERY = "FAKE_DELIVERY",
  INVESTMENT = "INVESTMENT",
  LOTTERY = "LOTTERY",
  GOVERNMENT = "GOVERNMENT",
  ROMANCE = "ROMANCE",
  TECH_SUPPORT = "TECH_SUPPORT",
  OTHER = "OTHER",
}

const categoryIcons = {
  [ScamType.BANK_FRAUD]: CreditCard,
  [ScamType.FAKE_DELIVERY]: Truck,
  [ScamType.INVESTMENT]: TrendingUp,
  [ScamType.LOTTERY]: Trophy,
  [ScamType.GOVERNMENT]: Building,
  [ScamType.ROMANCE]: Heart,
  [ScamType.TECH_SUPPORT]: Cpu,
  [ScamType.OTHER]: ShieldQuestion,
};

const categoryColors = {
  [ScamType.BANK_FRAUD]: "text-red-500 bg-red-500/10 border-red-500/20",
  [ScamType.FAKE_DELIVERY]: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  [ScamType.INVESTMENT]: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  [ScamType.LOTTERY]: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  [ScamType.GOVERNMENT]: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  [ScamType.ROMANCE]: "text-pink-500 bg-pink-500/10 border-pink-500/20",
  [ScamType.TECH_SUPPORT]: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  [ScamType.OTHER]: "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

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
      return "bg-green-500/15 text-green-400 border-green-500/30";
    case "Cellcard":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    case "Metfone":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "Seatel":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "CooTel":
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    default:
      return "bg-slate-800/60 text-slate-400 border-slate-700/30";
  }
};

interface DashboardStats {
  totalScamNumbers: number;
  reportsToday: number;
  activeReporters: number;
}

function ReportFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, apiFetch } = useAuth();
  const { t } = useLanguage();

  const phoneParam = searchParams.get("phone") || "";

  const [number, setNumber] = useState(phoneParam);
  const [prevPhoneParam, setPrevPhoneParam] = useState(phoneParam);

  // Sync state if phoneParam changes from URL (during render, avoiding useEffect cascading render)
  if (phoneParam !== prevPhoneParam) {
    setNumber(phoneParam);
    setPrevPhoneParam(phoneParam);
  }

  const [category, setCategory] = useState(ScamType.BANK_FRAUD);
  const [description, setDescription] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [commune, setCommune] = useState("");
  const [village, setVillage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  // Compute carrier dynamically during render, no useEffect needed
  const carrier = detectCarrier(number);

  const [stats, setStats] = useState<DashboardStats>({
    totalScamNumbers: 1482,
    reportsToday: 38,
    activeReporters: 840,
  });

  useEffect(() => {
    fetch(`${API_BASE}/dashboard/stats`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.totalScamNumbers !== undefined) {
          setStats({
            totalScamNumbers: data.totalScamNumbers,
            reportsToday: data.reportsToday,
            activeReporters: data.totalScamNumbers > 0 ? Math.ceil(data.totalScamNumbers * 0.6) : 840,
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!number.trim()) {
      setError(t("phoneRequired"));
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("number", number.trim());
      formData.append("category", category);
      formData.append("description", description.trim());
      formData.append("province", province.trim());
      formData.append("district", district.trim());
      formData.append("commune", commune.trim());
      formData.append("village", village.trim());

      evidenceFiles.forEach((file) => {
        formData.append("evidence", file);
      });

      await apiFetch("/reports", {
        method: "POST",
        body: formData,
      });

      setSuccess(t("reportSuccess"));
      setTimeout(() => {
        router.push(`/search?phone=${encodeURIComponent(number.trim())}`);
      }, 1500);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to submit report";
      setError(errMsg);
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="glass rounded-2xl border border-slate-800 p-8 text-center space-y-6 relative overflow-hidden shadow-2xl"
        >
          {/* Radar Scan Effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-red-500/10 rounded-full animate-ping opacity-25" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-red-500/15 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-red-500/20 rounded-full" />
          </div>

          <div className="inline-flex p-4 bg-red-500/10 rounded-full border border-red-500/20 text-red-500 relative z-10">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-white relative z-10">{t("authRequired")}</h2>
          <p className="text-slate-400 text-sm leading-relaxed relative z-10">
            {t("authRequiredDesc")}
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/login")}
            className="w-full py-3.5 px-4 rounded-xl font-semibold bg-gradient-to-r from-red-650 to-red-550 hover:from-red-550 hover:to-orange-500 text-white transition flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/20 relative z-10 cursor-pointer"
          >
            <LogIn className="h-4.5 w-4.5" />
            {t("signInToReport")}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Main Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-8 space-y-6"
        >
          <div className="glass rounded-2xl border border-slate-800 p-6 sm:p-8 relative overflow-hidden shadow-2xl">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />

            <div className="flex items-center gap-4 border-b border-slate-900 pb-5 mb-6">
              <div className="p-3 bg-red-500/10 rounded-xl text-red-500 border border-red-500/20">
                <AlertTriangle className="h-6.5 w-6.5 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">{t("reportTitle")}</h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  {t("reportSub")}
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm flex gap-3 items-center"
                >
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                  <span>{error}</span>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-sm flex gap-3 items-center"
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  <span>{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Phone Input with Carrier Detection */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t("scamPhone")}
                  </label>
                  {carrier && (
                    <motion.span
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${getCarrierBadgeColor(carrier)}`}
                    >
                      {carrier}
                    </motion.span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Phone className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder={t("phonePlaceholder")}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-950/70 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl outline-none text-white transition-all text-sm font-mono focus:ring-1 focus:ring-red-500/20"
                  />
                </div>
              </div>

              {/* Grid Scam Category Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  {t("scamCategory")}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.values(ScamType).map((type) => {
                    const IconComponent = categoryIcons[type] || ShieldQuestion;
                    const colorClasses = categoryColors[type] || "text-slate-400 bg-slate-500/10 border-slate-500/20";
                    const isSelected = category === type;

                    return (
                      <motion.button
                        key={type}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setCategory(type)}
                        className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer relative ${
                          isSelected
                            ? "border-red-500 bg-red-950/20 ring-1 ring-red-500/25 shadow-lg shadow-red-500/5"
                            : "border-slate-850 bg-slate-950/40 hover:bg-slate-900/40 hover:border-slate-750"
                        }`}
                      >
                        <div className={`p-2.5 rounded-lg shrink-0 ${colorClasses}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="space-y-0.5 min-w-0 pr-6">
                          <p className="font-bold text-sm text-white truncate">
                            {t(type)}
                          </p>
                          <p className="text-xs text-slate-400 leading-normal line-clamp-2">
                            {t(`${type}_desc`)}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-3 right-3 p-0.5 bg-red-500 rounded-full text-white">
                            <Check className="h-3 w-3 stroke-[3px]" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Incident Location (Grouped inside nesting card) */}
              <div className="p-5 rounded-xl border border-slate-855 bg-slate-950/30 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                  <Map className="h-4.5 w-4.5 text-slate-400" />
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {t("locationGroupTitle")}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">
                      {t("provinceLabel")}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        placeholder={t("locationPlaceholderPhnomPenh")}
                        className="w-full pl-10 pr-4 py-3 bg-slate-955/70 border border-slate-855 hover:border-slate-750 focus:border-red-500 rounded-xl outline-none text-white transition-all text-sm focus:ring-1 focus:ring-red-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">
                      {t("districtLabel")}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                        <Navigation className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder={t("locationPlaceholderChamkarMon")}
                        className="w-full pl-10 pr-4 py-3 bg-slate-955/70 border border-slate-855 hover:border-slate-750 focus:border-red-500 rounded-xl outline-none text-white transition-all text-sm focus:ring-1 focus:ring-red-500/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">
                      {t("communeLabel")}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        value={commune}
                        onChange={(e) => setCommune(e.target.value)}
                        placeholder={t("locationPlaceholderTonleBassac")}
                        className="w-full pl-10 pr-4 py-3 bg-slate-955/70 border border-slate-855 hover:border-slate-750 focus:border-red-500 rounded-xl outline-none text-white transition-all text-sm focus:ring-1 focus:ring-red-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">
                      {t("villageLabel")}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                        <Home className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        value={village}
                        onChange={(e) => setVillage(e.target.value)}
                        placeholder={t("locationPlaceholderPhum1")}
                        className="w-full pl-10 pr-4 py-3 bg-slate-955/70 border border-slate-855 hover:border-slate-750 focus:border-red-500 rounded-xl outline-none text-white transition-all text-sm focus:ring-1 focus:ring-red-500/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {t("fraudDesc")}
                </label>
                <div className="relative">
                  <span className="absolute top-3.5 left-3.5 text-slate-500">
                    <FileText className="h-4.5 w-4.5" />
                  </span>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("fraudDescPlaceholder")}
                    className="w-full pl-11 pr-4 py-3 bg-slate-955 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl outline-none text-white transition-all text-sm resize-none focus:ring-1 focus:ring-red-500/20"
                  />
                </div>
              </div>

              {/* Evidence Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Evidence Files (Screenshots, Audio, SMS)
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files) {
                      const newFiles = Array.from(e.dataTransfer.files);
                      setEvidenceFiles((prev) => [...prev, ...newFiles]);
                    }
                  }}
                  className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/20 rounded-xl p-6 text-center cursor-pointer transition relative"
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*,audio/*"
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files);
                        setEvidenceFiles((prev) => [...prev, ...newFiles]);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="p-3 bg-slate-900 rounded-full text-slate-400">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Drag & drop files here, or click to browse</p>
                      <p className="text-xs text-slate-500 mt-1">Upload up to 5 files. Allowed: JPG, PNG, WEBP, MP3, WAV, M4A (Max 10MB per file)</p>
                    </div>
                  </div>
                </div>
                {evidenceFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {evidenceFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-850 rounded-xl">
                        <div className="flex items-center gap-3">
                          {file.type.startsWith("image/") ? (
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                              <Image className="h-4 w-4" />
                            </div>
                          ) : (
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                              <FileAudio className="h-4 w-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-[400px]">
                              {file.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEvidenceFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 transition cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.99 }}
                className="w-full py-4 px-4 rounded-xl font-bold bg-gradient-to-r from-red-650 to-red-550 hover:from-red-550 hover:to-orange-500 text-white transition flex items-center justify-center gap-2 disabled:opacity-55 disabled:cursor-not-allowed shadow-lg shadow-red-655/20 cursor-pointer"
              >
                {loading ? t("submittingReport") : t("submitReportButton")}
                {!loading && <Send className="h-4.5 w-4.5" />}
              </motion.button>

            </form>
          </div>
        </motion.div>

        {/* Right: Sidebar Guides & Stats */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="lg:col-span-4 space-y-6"
        >
          {/* Guidelines Card */}
          <div className="glass rounded-2xl border border-slate-800 p-6 space-y-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
            <div className="flex items-center gap-2.5 border-b border-slate-900 pb-4">
              <Info className="h-5 w-5 text-orange-400" />
              <h3 className="font-bold text-white text-base leading-tight">
                {t("howToReportTitle")}
              </h3>
            </div>
            
            <ul className="space-y-4">
              <li className="flex gap-3 items-start">
                <div className="p-1.5 bg-red-500/10 rounded-lg text-red-400 border border-red-500/20 shrink-0 mt-0.5">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {t("howToReport1")}
                </p>
              </li>
              <li className="flex gap-3 items-start">
                <div className="p-1.5 bg-orange-500/10 rounded-lg text-orange-400 border border-orange-500/20 shrink-0 mt-0.5">
                  <FileText className="h-4 w-4" />
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {t("howToReport2")}
                </p>
              </li>
              <li className="flex gap-3 items-start">
                <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                  <Activity className="h-4 w-4" />
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {t("howToReport3")}
                </p>
              </li>
            </ul>
          </div>

          {/* Registry Stats Summary */}
          <div className="glass rounded-2xl border border-slate-800 p-6 space-y-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
            <div className="flex items-center gap-2.5 border-b border-slate-900 pb-4">
              <Activity className="h-5 w-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base leading-tight">
                {t("liveStatsSummary")}
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-950/50 border border-slate-905 p-3.5 rounded-xl">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  {t("totalScamNumbers")}
                </span>
                <span className="text-xl font-bold text-white font-mono">
                  {stats.totalScamNumbers}
                </span>
              </div>

              <div className="flex justify-between items-center bg-slate-950/50 border border-slate-905 p-3.5 rounded-xl">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  {t("newReportsToday")}
                </span>
                <span className="text-xl font-bold text-red-500 font-mono">
                  +{stats.reportsToday}
                </span>
              </div>

              <div className="flex justify-between items-center bg-slate-950/50 border border-slate-905 p-3.5 rounded-xl">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  {t("activeReporters")}
                </span>
                <span className="text-xl font-bold text-orange-400 font-mono">
                  {stats.activeReporters}
                </span>
              </div>

              <div className="flex items-center gap-2 px-1 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                <span>{t("activeProtections")}</span>
              </div>
            </div>
          </div>

        </motion.div>

      </div>
    </div>
  );
}

export default function ReportPage() {
  const { t } = useLanguage();

  return (
    <>
      <Navbar />
      <main className="flex-grow grid-bg relative flex items-center justify-center min-h-[calc(100vh-140px)]">
        {/* Background Ambient Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />
        <div className="absolute top-1/2 right-10 w-[250px] h-[250px] bg-orange-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        <Suspense fallback={
          <div className="max-w-2xl mx-auto py-24 text-center">
            <div className="h-8 w-8 border-4 border-slate-800 border-t-red-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm">{t("loadingSearchContext")}</p>
          </div>
        }>
          <ReportFormContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

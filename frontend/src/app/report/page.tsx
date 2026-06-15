"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";
import { ShieldAlert, AlertTriangle, AlertCircle, Phone, FileText, Send, LogIn, MapPin } from "lucide-react";

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

function ReportFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, apiFetch } = useAuth();
  const { t } = useLanguage();

  const phoneParam = searchParams.get("phone") || "";

  const [number, setNumber] = useState(phoneParam);
  const [category, setCategory] = useState(ScamType.BANK_FRAUD);
  const [description, setDescription] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [commune, setCommune] = useState("");
  const [village, setVillage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (phoneParam) {
      setNumber(phoneParam);
    }
  }, [phoneParam]);

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
      await apiFetch("/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: number.trim(),
          category,
          description: description.trim(),
          province: province.trim(),
          district: district.trim(),
          commune: commune.trim(),
          village: village.trim(),
        }),
      });

      setSuccess(t("reportSuccess"));
      setTimeout(() => {
        router.push(`/search?phone=${encodeURIComponent(number.trim())}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to submit report");
      setLoading(false);
    }
  };

  const getCategoryLabel = (type: ScamType) => {
    return type.replace(/_/g, " ");
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <div className="glass rounded-2xl border border-slate-800 p-8 text-center space-y-6">
          <div className="inline-flex p-3 bg-red-500/10 rounded-full border border-red-500/20 text-red-500">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-white">{t("authRequired")}</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            {t("authRequiredDesc")}
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-3 px-4 rounded-xl font-semibold bg-red-600 hover:bg-red-500 text-white transition flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/20"
          >
            <LogIn className="h-4 w-4" />
            {t("signInToReport")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="glass rounded-2xl border border-slate-800 p-8 z-10 relative">
        <div className="flex items-center gap-3 border-b border-slate-900 pb-5 mb-6">
          <div className="p-2.5 bg-red-500/10 rounded-lg text-red-500">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{t("reportTitle")}</h1>
            <p className="text-xs text-slate-400">
              {t("reportSub")}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm flex gap-2 items-center">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-sm flex gap-2 items-center">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Phone input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t("scamPhone")}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Phone className="h-4 w-4" />
              </span>
              <input
                type="text"
                required
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder={t("phonePlaceholder")}
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl outline-none text-white transition text-sm font-mono"
              />
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t("scamCategory")}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ScamType)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl outline-none text-white transition text-sm"
            >
              {Object.values(ScamType).map((type) => (
                <option key={type} value={type} className="bg-slate-950">
                  {t(type) || getCategoryLabel(type)}
                </option>
              ))}
            </select>
          </div>

          {/* Location details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
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
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl outline-none text-white transition text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t("districtLabel")}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <MapPin className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder={t("locationPlaceholderChamkarMon")}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl outline-none text-white transition text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
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
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl outline-none text-white transition text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t("villageLabel")}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <MapPin className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder={t("locationPlaceholderPhum1")}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl outline-none text-white transition text-sm"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t("fraudDesc")}
            </label>
            <div className="relative">
              <span className="absolute top-3 left-3.5 text-slate-500">
                <FileText className="h-4 w-4" />
              </span>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("fraudDescPlaceholder")}
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl outline-none text-white transition text-sm resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-semibold bg-red-600 hover:bg-red-500 text-white transition flex items-center justify-center gap-1.5 disabled:opacity-55 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
          >
            {loading ? t("submittingReport") : t("submitReportButton")}
            {!loading && <Send className="h-4 w-4" />}
          </button>

        </form>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { t } = useLanguage();

  return (
    <>
      <Navbar />
      <main className="flex-grow grid-bg relative flex items-center justify-center">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />
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

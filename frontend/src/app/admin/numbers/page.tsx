"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Phone, Search, Trash2, ShieldAlert, Globe, RefreshCw, Plus, Download } from "lucide-react";

interface PhoneNumberEntry {
  id: string;
  number: string;
  countryCode: string | null;
  riskScore: number;
  totalReport: number;
  createdAt: string;
}

export default function PhoneRegistry() {
  const { apiFetch } = useAuth();
  const { t } = useLanguage();

  const [numbers, setNumbers] = useState<PhoneNumberEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Manual Flagging State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [newCountryCode, setNewCountryCode] = useState("KH");
  const [newRiskScore, setNewRiskScore] = useState("80");
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadNumbers = async (pageNumber = page) => {
    setLoading(true);
    setError("");
    try {
      const numbersData = await apiFetch(`/admin/numbers?page=${pageNumber}&limit=20`);
      if (numbersData && numbersData.data) {
        setNumbers(numbersData.data);
        setTotalPages(numbersData.pages || 1);
      } else {
        setNumbers([]);
        setTotalPages(1);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load phone number registry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNumbers(page);
  }, [page]);

  const handleDeleteNumber = async (numberId: string) => {
    if (!window.confirm(t("confirmDeletePhone"))) return;

    try {
      await apiFetch(`/admin/numbers/${numberId}`, { method: "DELETE" });
      setNumbers((prev) => prev.filter((n) => n.id !== numberId));
    } catch (err: any) {
      alert(err.message || "Failed to delete phone number");
    }
  };

  const handleAddNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber.trim()) return;
    setSubmitting(true);
    try {
      const added = await apiFetch("/admin/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: newNumber.trim(),
          countryCode: newCountryCode.trim().toUpperCase() || null,
          riskScore: parseInt(newRiskScore) || 50,
        }),
      });
      setNumbers((prev) => [added, ...prev]);
      setShowAddModal(false);
      setNewNumber("");
      setNewCountryCode("KH");
      setNewRiskScore("80");
    } catch (err: any) {
      alert(err.message || "Failed to flag number");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const allNumbers = await apiFetch("/admin/numbers/export");
      if (!allNumbers || allNumbers.length === 0) {
        alert("No registered numbers to export.");
        return;
      }

      const headers = ["ID", "Phone Number", "Country Code", "Risk Score %", "Total Reports", "Flagged At"];
      const rows = allNumbers.map((n: any) => [
        n.id,
        n.number,
        n.countryCode || "UNKNOWN",
        n.riskScore,
        n.totalReport,
        new Date(n.createdAt).toISOString(),
      ]);

      const csvContent = 
        "data:text/csv;charset=utf-8,\uFEFF" + 
        [headers.join(","), ...rows.map((r: any) => r.map((val: any) => `"${val}"`).join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `scamshield_blacklist_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(err.message || "Failed to export phone registry");
    } finally {
      setExporting(false);
    }
  };

  const getRiskBadgeColor = (score: number) => {
    if (score >= 70) return "bg-red-500/10 border-red-500/20 text-red-400";
    if (score >= 30) return "bg-orange-500/10 border-orange-500/20 text-orange-400";
    return "bg-green-500/10 border-green-500/20 text-green-400";
  };

  const getRiskText = (score: number) => {
    if (score >= 70) return t("highRiskStatus") || "High Risk";
    if (score >= 30) return t("suspiciousStatus") || "Suspicious";
    return t("safeStatus") || "Safe";
  };

  const filteredNumbers = numbers.filter((n) => {
    const matchesSearch =
      n.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.countryCode && n.countryCode.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (riskFilter === "HIGH") return n.riskScore >= 70;
    if (riskFilter === "SUSPICIOUS") return n.riskScore >= 30 && n.riskScore < 70;
    if (riskFilter === "SAFE") return n.riskScore < 30;

    return true;
  });

  if (loading) {
    return (
      <div className="glass p-20 rounded-2xl border border-slate-800 text-center">
        <div className="h-8 w-8 border-4 border-slate-800 border-t-red-650 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">{t("syncRegistries")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Phone className="h-5 w-5 text-red-500" /> {t("phoneRegistry")}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global phone caller registry, risk engine scores, country code mappings, and record cleanup tools.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-lg shadow-red-600/10"
          >
            <Plus className="h-4 w-4" />
            Flag Number
          </button>
          <button
            disabled={exporting}
            onClick={handleExportCSV}
            className="p-2.5 px-4 rounded-xl border border-slate-800 bg-slate-900 text-slate-350 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? "Exporting..." : "Export Blacklist"}
          </button>
          <button
            onClick={() => loadNumbers(page)}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title={t("refreshData")}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="glass p-8 rounded-2xl border border-slate-800 text-center text-red-400 text-sm">
          {error}
        </div>
      )}

      {!error && (
        <div className="space-y-4">
          
          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search phone number or country..."
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-red-500 transition text-sm font-sans"
              />
            </div>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-red-500 transition text-sm cursor-pointer font-sans min-w-[160px]"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="HIGH">High Risk (≥ 70%)</option>
              <option value="SUSPICIOUS">Suspicious (30% - 69%)</option>
              <option value="SAFE">Safe (&lt; 30%)</option>
            </select>
          </div>

          <div className="glass rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-900 text-left text-sm">
                <thead className="bg-slate-950/40 text-slate-400 font-bold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4">{t("tablePhoneId")}</th>
                    <th className="px-6 py-4">{t("countryCode") || "Country"}</th>
                    <th className="px-6 py-4">{t("tableRiskScore")}</th>
                    <th className="px-6 py-4">{t("tableTotalReports")}</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-300">
                  {filteredNumbers.map((num) => (
                    <tr key={num.id} className="hover:bg-slate-900/40 transition">
                      <td className="px-6 py-4 font-mono font-bold text-white text-base">
                        {num.number}
                      </td>
                      <td className="px-6 py-4 flex items-center gap-1.5">
                        <Globe className="h-4 w-4 text-slate-500" />
                        <span className="font-mono text-xs text-slate-400">{num.countryCode || "UNKNOWN"}</span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-200">
                        {num.riskScore}%
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-slate-400">
                        {num.totalReport}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full font-mono uppercase border ${getRiskBadgeColor(num.riskScore)}`}>
                          <ShieldAlert className="h-3 w-3" />
                          {getRiskText(num.riskScore)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteNumber(num.id)}
                          className="p-1.5 px-2.5 rounded-lg bg-red-955/20 border border-red-500/10 text-red-400 hover:text-red-300 hover:bg-red-955/50 transition text-xs font-semibold cursor-pointer"
                          title="Delete number and reports"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredNumbers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        No phone numbers match search query or exist in registry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 bg-slate-950/20 border-t border-slate-900 text-xs">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 transition font-semibold cursor-pointer"
                >
                  {t("prev") || "Previous"}
                </button>
                <span className="text-slate-400 font-semibold font-mono">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 transition font-semibold cursor-pointer"
                >
                  {t("next") || "Next"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Flagging Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass rounded-2xl border border-slate-800 p-6 space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Phone className="h-5 w-5 text-red-500" />
              Flag Spam Phone Number
            </h3>
            
            <form onSubmit={handleAddNumber} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  placeholder="+855 12 345 678"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:border-red-500 transition text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Country Code (ISO 2-letter / digits)
                </label>
                <input
                  type="text"
                  required
                  value={newCountryCode}
                  onChange={(e) => setNewCountryCode(e.target.value)}
                  placeholder="KH"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:border-red-500 transition text-sm"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Risk Score ({newRiskScore}%)
                  </label>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={newRiskScore}
                  onChange={(e) => setNewRiskScore(e.target.value)}
                  className="w-full accent-red-600 h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer border border-slate-850"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-semibold font-mono">
                  <span>SAFE (0%)</span>
                  <span>SUSPICIOUS (30%)</span>
                  <span>HIGH (70%)</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 border border-slate-800 text-slate-350 hover:text-white transition cursor-pointer"
                >
                  {t("cancelBtn")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-650 hover:bg-red-600 text-white transition shadow-lg shadow-red-600/20 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Flagging..." : "Add to Blacklist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

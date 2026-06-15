"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Trash2, Pencil, AlertTriangle, FolderOpen, Calendar, RefreshCw, MapPin } from "lucide-react";

interface AdminReport {
  id: string;
  category: string;
  description: string | null;
  createdAt: string;
  province: string | null;
  district: string | null;
  commune: string | null;
  village: string | null;
  phoneNumber: {
    number: string;
    riskScore: number;
  };
  user: {
    email: string;
  };
}

const CATEGORIES = [
  "BANK_FRAUD",
  "FAKE_DELIVERY",
  "INVESTMENT",
  "LOTTERY",
  "GOVERNMENT",
  "ROMANCE",
  "TECH_SUPPORT",
  "OTHER",
];

export default function ModerationQueue() {
  const { apiFetch } = useAuth();
  const { t } = useLanguage();
  
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const [editingReport, setEditingReport] = useState<AdminReport | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const loadReports = async (pageNumber = page) => {
    setLoading(true);
    setError("");
    try {
      const reportsData = await apiFetch(`/admin/reports?page=${pageNumber}&limit=10`);
      if (reportsData && reportsData.data) {
        setReports(reportsData.data);
        setTotalPages(reportsData.pages || 1);
      } else {
        setReports([]);
        setTotalPages(1);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load moderation queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports(page);
  }, [page]);

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm(t("confirmDeleteReport"))) return;
    try {
      await apiFetch(`/admin/reports/${reportId}`, { method: "DELETE" });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err: any) {
      alert(err.message || "Failed to delete report");
    }
  };

  const handleOpenEditModal = (report: AdminReport) => {
    setEditingReport(report);
    setEditCategory(report.category);
    setEditDescription(report.description || "");
  };

  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;

    try {
      await apiFetch(`/admin/reports/${editingReport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: editCategory,
          description: editDescription,
        }),
      });

      setReports((prev) =>
        prev.map((r) =>
          r.id === editingReport.id
            ? { ...r, category: editCategory, description: editDescription }
            : r
        )
      );
      setEditingReport(null);
    } catch (err: any) {
      alert(err.message || "Failed to update report");
    }
  };

  const formatCategory = (cat: string) => {
    return cat.replace(/_/g, " ");
  };

  const filteredReports = reports.filter((r) => {
    if (categoryFilter !== "ALL" && r.category !== categoryFilter) {
      return false;
    }
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
            <AlertTriangle className="h-5 w-5 text-red-500" /> {t("moderationQueue")}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review, edit, and delete reports submitted by the community. Deleting recalculates risk indices instantly.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-350 focus:outline-none focus:border-red-500 transition text-xs font-semibold cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {t(cat) || formatCategory(cat)}
              </option>
            ))}
          </select>
          <button
            onClick={() => loadReports(page)}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("refreshData")}
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
          {filteredReports.length === 0 ? (
            <div className="glass p-16 rounded-2xl text-center text-slate-500 space-y-2">
              <FolderOpen className="h-8 w-8 mx-auto opacity-40 mb-2" />
              <h4 className="font-bold text-white text-sm">{t("queueClear")}</h4>
              <p className="text-xs max-w-xs mx-auto leading-relaxed">
                No reports fit current filtering criteria.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((r) => (
                <div key={r.id} className="glass p-5 rounded-xl border border-slate-800 space-y-3.5 relative overflow-hidden glass-hover font-sans">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900/60 pb-3">
                    <div>
                      <span className="font-mono text-base font-bold text-white tracking-wide mr-2">
                        {r.phoneNumber.number}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-900 text-slate-400 font-mono font-semibold uppercase">
                        {t(r.category) || formatCategory(r.category)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        onClick={() => handleOpenEditModal(r)}
                        className="p-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-330 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" /> {t("edit") || "Edit"}
                      </button>
                      <button
                        onClick={() => handleDeleteReport(r.id)}
                        className="p-2 px-3 rounded-lg bg-red-955/20 hover:bg-red-955/50 border border-red-500/20 text-red-400 hover:text-red-300 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> {t("deleteReportBtn")}
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/20 p-3.5 rounded-xl border border-slate-900/80">
                    {r.description || t("noDescription")}
                  </p>

                  {/* Location metadata display */}
                  {(r.province || r.district || r.commune || r.village) && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 bg-slate-950/40 p-2 px-3 rounded-lg border border-slate-900/60 w-fit">
                      <MapPin className="h-3.5 w-3.5 text-red-550" />
                      <span className="font-bold text-slate-300">Location:</span>
                      <span>
                        {[r.village, r.commune, r.district, r.province].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between text-[10px] text-slate-500 font-semibold uppercase tracking-wider gap-2 border-t border-slate-900/60 pt-3">
                    <span>{t("submittedBy")}{r.user.email}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
              
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-805 text-xs">
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
          )}
        </div>
      )}

      {/* Edit Modal Overlay */}
      {editingReport && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass rounded-2xl border border-slate-800 p-6 space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Pencil className="h-5 w-5 text-red-500" /> {t("editReportTitle")}
            </h3>
            
            <form onSubmit={handleUpdateReport} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  {t("categoryLabelOnly")}
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:border-red-500 transition text-sm cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-slate-950">
                      {t(cat) || formatCategory(cat)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  {t("descriptionLabel")}
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:border-red-500 transition text-sm"
                  placeholder={t("fraudDescPlaceholder")}
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 border border-slate-800 text-slate-350 hover:text-white transition cursor-pointer"
                >
                  {t("cancelBtn")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-650 hover:bg-red-600 text-white transition shadow-lg shadow-red-600/20 cursor-pointer"
                >
                  {t("saveChangesBtn")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

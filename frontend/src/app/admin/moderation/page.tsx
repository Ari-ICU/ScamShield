"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Trash2, Pencil, AlertTriangle, FolderOpen, Calendar, RefreshCw, MapPin } from "lucide-react";

interface Evidence {
  id: string;
  fileUrl: string;
  fileType: string;
}

interface AdminReport {
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
  const [editStatus, setEditStatus] = useState("");

  const STATUSES = ["PENDING", "UNDER_REVIEW", "CONFIRMED_SCAM", "INSUFFICIENT_EVIDENCE", "FALSE_REPORT"];

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
    setEditStatus(report.status);
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
          status: editStatus,
        }),
      });

      setReports((prev) =>
        prev.map((r) =>
          r.id === editingReport.id
            ? { ...r, category: editCategory, description: editDescription, status: editStatus }
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-bold text-white tracking-wide mr-2">
                        {r.phoneNumber.number}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-900 text-slate-400 font-mono font-semibold uppercase">
                        {t(r.category) || formatCategory(r.category)}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        r.status === "CONFIRMED_SCAM" || r.status === "APPROVED"
                          ? "bg-red-500/15 text-red-400 border border-red-500/20"
                          : r.status === "FALSE_REPORT" || r.status === "REJECTED"
                          ? "bg-slate-500/15 text-slate-400 border border-slate-500/20"
                          : r.status === "INSUFFICIENT_EVIDENCE"
                          ? "bg-orange-500/15 text-orange-400 border border-orange-500/20"
                          : r.status === "UNDER_REVIEW"
                          ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                          : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20"
                      }`}>
                        {r.status === "CONFIRMED_SCAM"
                          ? "Confirmed Scam"
                          : r.status === "FALSE_REPORT"
                          ? "False Report"
                          : r.status === "INSUFFICIENT_EVIDENCE"
                          ? "Insufficient Evidence"
                          : r.status === "UNDER_REVIEW"
                          ? "Under Review"
                          : r.status === "PENDING"
                          ? "Pending"
                          : r.status}
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

                  <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/20 p-3.5 rounded-xl border border-slate-900/80 font-medium">
                    {r.description || t("noDescription")}
                  </p>

                  {/* Evidence display section */}
                  {r.evidence && r.evidence.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Submitted Evidence Attachments:
                      </span>
                      <div className="flex flex-wrap gap-2.5">
                        {r.evidence.map((file) => {
                          const fullUrl = `${apiFetch.toString().includes("API_BASE") ? "http://localhost:4000" : ""}${file.fileUrl}`;
                          const rawUrl = file.fileUrl.startsWith("http") ? file.fileUrl : `http://localhost:4000${file.fileUrl}`;
                          
                          if (file.fileType.startsWith("image/")) {
                            return (
                              <a
                                key={file.id}
                                href={rawUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="group/thumb relative block shrink-0"
                              >
                                <img
                                  src={rawUrl}
                                  alt="Evidence"
                                  className="w-14 h-14 object-cover rounded-lg border border-slate-800 hover:border-slate-700 transition"
                                />
                              </a>
                            );
                          } else if (file.fileType.startsWith("audio/")) {
                            return (
                              <div key={file.id} className="w-full max-w-xs bg-slate-950 p-2.5 rounded-xl border border-slate-900 flex flex-col gap-1">
                                <span className="text-[10px] text-slate-400 font-semibold truncate">
                                  Audio Proof
                                </span>
                                <audio
                                  controls
                                  src={rawUrl}
                                  className="w-full h-8 text-xs accent-red-500"
                                />
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Location metadata display */}
                  {(r.province || r.district || r.commune || r.village) && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 bg-slate-950/40 p-2 px-3 rounded-lg border border-slate-900/60 w-fit">
                      <MapPin className="h-3.5 w-3.5 text-red-555" />
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
                  Report Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-850 text-white focus:outline-none focus:border-red-500 transition text-sm cursor-pointer"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status} className="bg-slate-955">
                      {status}
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

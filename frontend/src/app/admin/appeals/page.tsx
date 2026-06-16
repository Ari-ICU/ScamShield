"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Check, X, ShieldAlert, FolderOpen, Calendar, RefreshCw, Eye } from "lucide-react";

interface Appeal {
  id: string;
  reason: string;
  proofUrl: string | null;
  contactEmail: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  resolvedAt: string | null;
  phoneNumber: {
    number: string;
    riskScore: number;
    totalReport: number;
  };
}

export default function AppealsModeration() {
  const { apiFetch, accessToken } = useAuth();
  
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [viewingAppeal, setViewingAppeal] = useState<Appeal | null>(null);

  const loadAppeals = async (pageNumber = page) => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/admin/appeals?page=${pageNumber}&limit=10`);
      if (data && data.data) {
        setAppeals(data.data);
        setTotalPages(data.pages || 1);
      } else {
        setAppeals([]);
        setTotalPages(1);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load appeals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppeals(page);
  }, [page]);

  const handleResolveAppeal = async (appealId: string, status: "APPROVED" | "REJECTED") => {
    const confirmMsg = status === "APPROVED" 
      ? "Approving this appeal will REJECT all scam reports for this phone number and set its risk score to 0. Do you want to continue?"
      : "Are you sure you want to reject this appeal?";
      
    if (!window.confirm(confirmMsg)) return;

    try {
      await apiFetch(`/admin/appeals/${appealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      setAppeals((prev) =>
        prev.map((a) =>
          a.id === appealId
            ? { ...a, status, resolvedAt: new Date().toISOString() }
            : a
        )
      );
      if (viewingAppeal && viewingAppeal.id === appealId) {
        setViewingAppeal((prev) => prev ? { ...prev, status, resolvedAt: new Date().toISOString() } : null);
      }
    } catch (err: any) {
      alert(err.message || `Failed to resolve appeal as ${status}`);
    }
  };

  const filteredAppeals = appeals.filter((a) => {
    if (statusFilter !== "ALL" && a.status !== statusFilter) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="glass p-20 rounded-2xl border border-slate-800 text-center">
        <div className="h-8 w-8 border-4 border-slate-800 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Loading appeals queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-emerald-500" /> Appeals Moderation
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review dispute requests from phone owners. Approving resets the registry score for the contested number.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-350 focus:outline-none focus:border-emerald-500 transition text-xs font-semibold cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button
            onClick={() => loadAppeals(page)}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
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
          {filteredAppeals.length === 0 ? (
            <div className="glass p-16 rounded-2xl text-center text-slate-500 space-y-2">
              <FolderOpen className="h-8 w-8 mx-auto opacity-40 mb-2" />
              <h4 className="font-bold text-white text-sm">No appeals found</h4>
              <p className="text-xs max-w-xs mx-auto leading-relaxed">
                All disputes have been processed! No pending appeals in queue.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppeals.map((a) => (
                <div key={a.id} className="glass p-5 rounded-xl border border-slate-800 space-y-3.5 relative overflow-hidden glass-hover font-sans">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900/60 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-bold text-white tracking-wide mr-2">
                        {a.phoneNumber.number}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-900 text-slate-400 font-mono font-semibold">
                        Risk: {a.phoneNumber.riskScore}% ({a.phoneNumber.totalReport} reports)
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        a.status === "APPROVED"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                          : a.status === "REJECTED"
                          ? "bg-red-500/15 text-red-400 border border-red-500/20"
                          : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20"
                      }`}>
                        {a.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        onClick={() => setViewingAppeal(a)}
                        className="p-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-330 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" /> Details
                      </button>
                      {a.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleResolveAppeal(a.id, "APPROVED")}
                            className="p-2 px-3 rounded-lg bg-emerald-950/20 hover:bg-emerald-950/50 border border-emerald-500/20 text-emerald-400 hover:text-emerald-350 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleResolveAppeal(a.id, "REJECTED")}
                            className="p-2 px-3 rounded-lg bg-red-955/20 hover:bg-red-955/50 border border-red-500/20 text-red-400 hover:text-red-300 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/20 p-3.5 rounded-xl border border-slate-900/80 line-clamp-2">
                    {a.reason}
                  </p>

                  <div className="flex flex-col sm:flex-row justify-between text-[10px] text-slate-500 font-semibold uppercase tracking-wider gap-2 border-t border-slate-900/60 pt-3">
                    <span>Contact: {a.contactEmail}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(a.createdAt).toLocaleString()}
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
                    Previous
                  </button>
                  <span className="text-slate-400 font-semibold font-mono">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 transition font-semibold cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Appeal Details Modal Overlay */}
      {viewingAppeal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl glass rounded-2xl border border-slate-800 p-6 space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b border-slate-900 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white font-mono">
                  Appeal: {viewingAppeal.phoneNumber.number}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Submitted by {viewingAppeal.contactEmail}
                </p>
              </div>
              <button
                onClick={() => setViewingAppeal(null)}
                className="p-1 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Contested Number Details
                </span>
                <p className="text-slate-300">
                  Risk Score: <strong className="text-white">{viewingAppeal.phoneNumber.riskScore}%</strong> | Reports count: <strong className="text-white">{viewingAppeal.phoneNumber.totalReport}</strong>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Appeal Reason
                </span>
                <p className="text-slate-200 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-900/60 font-medium">
                  {viewingAppeal.reason}
                </p>
              </div>

              {viewingAppeal.proofUrl && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Proof Attachment Document
                  </span>
                  <a
                    href={`http://localhost:4000${viewingAppeal.proofUrl}?token=${accessToken}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 p-3 bg-slate-950 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 rounded-xl text-emerald-400 font-semibold transition"
                  >
                    <Eye className="h-4 w-4" />
                    View Uploaded Proof Document
                  </a>
                </div>
              )}

              {viewingAppeal.status !== "PENDING" && (
                <div className="space-y-1 border-t border-slate-900 pt-3 flex justify-between items-center text-xs text-slate-500">
                  <span>Resolved status: <strong className="text-white">{viewingAppeal.status}</strong></span>
                  {viewingAppeal.resolvedAt && (
                    <span>Resolved at: {new Date(viewingAppeal.resolvedAt).toLocaleString()}</span>
                  )}
                </div>
              )}
            </div>

            {viewingAppeal.status === "PENDING" && (
              <div className="flex justify-end gap-3 border-t border-slate-900 pt-4">
                <button
                  onClick={() => handleResolveAppeal(viewingAppeal.id, "REJECTED")}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-955/20 border border-red-500/20 text-red-400 hover:bg-red-955/50 hover:text-red-350 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="h-4 w-4" /> Reject Appeal
                </button>
                <button
                  onClick={() => handleResolveAppeal(viewingAppeal.id, "APPROVED")}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-650 hover:bg-emerald-600 text-white transition shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="h-4 w-4" /> Approve Appeal
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

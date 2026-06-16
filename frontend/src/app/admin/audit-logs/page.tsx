"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Calendar, RefreshCw, ShieldAlert, FolderOpen, Eye, EyeOff } from "lucide-react";

interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  entity: string;
  entityId: string;
  details: string | null;
  createdAt: string;
}

export default function AuditLogsDashboard() {
  const { apiFetch } = useAuth();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadLogs = async (pageNumber = page) => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/admin/audit-logs?page=${pageNumber}&limit=15`);
      if (data && data.data) {
        setLogs(data.data);
        setTotalPages(data.pages || 1);
      } else {
        setLogs([]);
        setTotalPages(1);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(page);
  }, [page]);

  const toggleDetails = (logId: string) => {
    setExpandedLogId((prev) => (prev === logId ? null : logId));
  };

  const renderDetails = (detailsStr: string | null) => {
    if (!detailsStr) return <span className="text-slate-500 italic">No additional details</span>;
    try {
      const parsed = JSON.parse(detailsStr);
      return (
        <pre className="text-[11px] font-mono text-slate-350 bg-slate-950/70 p-3 rounded-lg border border-slate-900 overflow-x-auto max-w-full leading-normal">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      return <p className="text-xs text-slate-350 font-mono">{detailsStr}</p>;
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.startsWith("DELETE")) return "bg-red-500/10 text-red-400 border border-red-500/20";
    if (action.startsWith("CREATE")) return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    if (action.startsWith("RESOLVE_APPEAL_APPROVED")) return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    if (action.startsWith("RESOLVE_APPEAL_REJECTED")) return "bg-red-500/10 text-red-400 border border-red-500/20";
    return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
  };

  if (loading) {
    return (
      <div className="glass p-20 rounded-2xl border border-slate-800 text-center">
        <div className="h-8 w-8 border-4 border-slate-800 border-t-red-650 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Loading audit logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" /> Admin Audit Logs
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse and search historical management records, administrative changes, and moderation updates.
          </p>
        </div>
        <button
          onClick={() => loadLogs(page)}
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="glass p-8 rounded-2xl border border-slate-800 text-center text-red-400 text-sm">
          {error}
        </div>
      )}

      {!error && (
        <div className="space-y-4">
          {logs.length === 0 ? (
            <div className="glass p-16 rounded-2xl text-center text-slate-500 space-y-2">
              <FolderOpen className="h-8 w-8 mx-auto opacity-40 mb-2" />
              <h4 className="font-bold text-white text-sm font-sans">No logs recorded</h4>
              <p className="text-xs max-w-xs mx-auto leading-relaxed">
                Management actions will start generating audit trails here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <div key={log.id} className="glass p-4 rounded-xl border border-slate-800 space-y-3 relative overflow-hidden font-sans text-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase tracking-wider ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="text-slate-300 font-semibold">
                          on {log.entity}
                        </span>
                        <span className="text-xs font-mono text-slate-500 truncate max-w-[120px] sm:max-w-none">
                          ({log.entityId})
                        </span>
                      </div>
                      
                      <button
                        onClick={() => toggleDetails(log.id)}
                        className="text-[11px] font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer self-start sm:self-auto bg-slate-900 border border-slate-800 p-1 px-2.5 rounded-lg"
                      >
                        {isExpanded ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" /> Hide Details
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" /> Show Details
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between text-[11px] text-slate-500 font-semibold gap-1.5">
                      <span>By: <strong className="text-slate-350">{log.adminEmail}</strong></span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-150 border-t border-slate-900/60 pt-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                          Audit Payload Details
                        </span>
                        {renderDetails(log.details)}
                      </div>
                    )}
                  </div>
                );
              })}

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

    </div>
  );
}

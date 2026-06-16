"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Users, Mail, Calendar, RefreshCw, Trash2, Shield, User, Search } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  reporterProfile?: {
    reputationScore: number;
    approvedReports: number;
    rejectedReports: number;
    verificationLevel: string;
  } | null;
  _count: {
    reports: number;
  };
}

export default function UserAccounts() {
  const { apiFetch, user } = useAuth();
  const { t } = useLanguage();
  
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadUsers = async (pageNumber = page) => {
    setLoading(true);
    setError("");
    try {
      const usersData = await apiFetch(`/admin/users?page=${pageNumber}&limit=20`);
      if (usersData && usersData.data) {
        setUsersList(usersData.data);
        setTotalPages(usersData.pages || 1);
      } else {
        setUsersList([]);
        setTotalPages(1);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load user accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(page);
  }, [page]);

  const handleToggleRole = async (targetUser: AdminUser) => {
    if (user?.id === targetUser.id) {
      alert("You cannot demote or modify your own role.");
      return;
    }

    const nextRole = targetUser.role === "ADMIN" ? "USER" : "ADMIN";
    try {
      await apiFetch(`/admin/users/${targetUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });

      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: nextRole } : u))
      );
    } catch (err: any) {
      alert(err.message || "Failed to modify role");
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (user?.id === targetUserId) {
      alert("You cannot delete your own account.");
      return;
    }

    if (!window.confirm(t("confirmDeleteUser"))) return;

    try {
      await apiFetch(`/admin/users/${targetUserId}`, { method: "DELETE" });
      setUsersList((prev) => prev.filter((u) => u.id !== targetUserId));
    } catch (err: any) {
      alert(err.message || "Failed to delete user account");
    }
  };

  const filteredUsers = usersList.filter((usr) => {
    const matchesSearch = usr.email.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (roleFilter !== "ALL" && usr.role !== roleFilter) {
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
            <Users className="h-5 w-5 text-red-500" /> {t("userAccounts")}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage registered accounts, toggle roles, view reports count, or delete accounts (with report cascade).
          </p>
        </div>
        <button
          onClick={() => loadUsers(page)}
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("refreshData")}
        </button>
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
                placeholder="Search user email..."
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-red-500 transition text-sm font-sans"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-350 focus:outline-none focus:border-red-500 transition text-sm cursor-pointer font-sans min-w-[160px]"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="USER">USER</option>
            </select>
          </div>

          <div className="glass rounded-2xl border border-slate-800 overflow-hidden font-sans">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-900 text-left text-sm">
                <thead className="bg-slate-950/40 text-slate-400 font-bold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4">{t("userEmailCol")}</th>
                    <th className="px-6 py-4">{t("roleCol")}</th>
                    <th className="px-6 py-4">Reputation / Level</th>
                    <th className="px-6 py-4">{t("totalReportsCol")}</th>
                    <th className="px-6 py-4">{t("joinDateCol")}</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-300">
                  {filteredUsers.map((usr) => (
                    <tr key={usr.id} className="hover:bg-slate-900/40 transition">
                      <td className="px-6 py-4 flex items-center gap-2 font-medium text-white">
                        <Mail className="h-4 w-4 text-slate-500" />
                        {usr.email}
                        {user?.id === usr.id && (
                          <span className="text-[9px] bg-slate-800 text-slate-400 font-bold px-1.5 py-0.5 rounded border border-slate-700 ml-1">
                            You
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          disabled={user?.id === usr.id}
                          onClick={() => handleToggleRole(usr)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full font-mono uppercase transition border cursor-pointer ${
                            usr.role === "ADMIN" 
                              ? "bg-red-500/10 border-red-500/35 text-red-455 hover:bg-red-500/20" 
                              : "bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-900 hover:text-white"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={user?.id === usr.id ? "Cannot toggle your own role" : "Click to switch role"}
                        >
                          {usr.role === "ADMIN" ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                          {usr.role}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        {usr.reporterProfile ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono font-bold text-white text-xs">
                              {usr.reporterProfile.reputationScore}%
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border w-fit ${
                              usr.reporterProfile.verificationLevel === "MODERATOR"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : usr.reporterProfile.verificationLevel === "VERIFIED"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : usr.reporterProfile.verificationLevel === "TRUSTED"
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                : "bg-slate-800 text-slate-400 border-slate-700"
                            }`}>
                              {usr.reporterProfile.verificationLevel.replace("_", " ")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold">{usr._count.reports}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(usr.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          disabled={user?.id === usr.id}
                          onClick={() => handleDeleteUser(usr.id)}
                          className="p-1.5 px-2.5 rounded-lg bg-red-955/20 border border-red-500/10 text-red-400 hover:text-red-300 hover:bg-red-955/50 transition text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          title={user?.id === usr.id ? "Cannot delete yourself" : "Delete user"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-500">
                        No user accounts match selection or search query.
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

    </div>
  );
}

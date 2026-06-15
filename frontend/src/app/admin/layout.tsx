"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  LayoutDashboard,
  AlertTriangle,
  Users,
  LogOut,
  LogIn,
  Menu,
  X,
  ShieldCheck,
  Globe,
  Lock,
  Phone
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sidebarLinks = [
    { href: "/admin", label: t("adminPanel"), icon: LayoutDashboard },
    { href: "/admin/moderation", label: t("moderationQueue"), icon: AlertTriangle },
    { href: "/admin/users", label: t("userAccounts"), icon: Users },
    { href: "/admin/numbers", label: t("phoneRegistry") || "Phone Registry", icon: Phone },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  // Enforce route guard in layout
  if (loading) {
    return (
      <main className="flex-grow grid-bg flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-4 border-slate-800 border-t-red-650 rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">{t("syncRegistries")}</p>
        </div>
      </main>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <main className="flex-grow flex items-center justify-center py-20 px-4 grid-bg relative min-h-screen bg-slate-950">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="w-full max-w-md glass rounded-2xl border border-slate-800 p-8 text-center space-y-6 z-10 relative">
          <div className="inline-flex p-3 bg-red-500/10 rounded-full border border-red-500/20 text-red-500">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-white">{t("accessDenied")}</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            {t("adminRequiredDesc")}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white transition flex items-center justify-center gap-2"
            >
              <Globe className="h-4 w-4" />
              {t("backToHome")}
            </Link>
            <Link
              href="/login"
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              {t("login")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex-grow flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-100">
      
      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 z-30">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <ShieldCheck className="h-5 w-5 text-red-500" />
          <span>Admin Workspace</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 rounded text-slate-400 hover:text-white"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Aside Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-slate-950/90 border-r border-slate-850 p-5 pt-20 md:pt-5 z-20 transform md:transform-none md:static md:w-64 transition-transform duration-300 flex flex-col justify-between shrink-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
          <div className="space-y-6">
            <div className="hidden md:flex items-center gap-2.5 px-3 py-2 border-b border-slate-900 mb-6">
              <ShieldCheck className="h-6 w-6 text-red-500" />
              <span className="font-extrabold text-sm tracking-wider uppercase text-white font-sans">
                Admin Console
              </span>
            </div>

            {/* Nav List */}
            <nav className="space-y-1.5">
              {sidebarLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition ${
                      active
                        ? "bg-red-500/10 text-red-400 border border-red-500/20 shadow shadow-red-500/5"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/60"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer Operations */}
          <div className="space-y-2 pt-6 border-t border-slate-900/80">
            <Link
              href="/"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              <Globe className="h-4 w-4" />
              <span>{t("backToHome")}</span>
            </Link>
            
            <button
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-400/80 hover:text-red-450 hover:bg-red-955/10 transition text-left"
            >
              <LogOut className="h-4 w-4" />
              <span>{t("logout")}</span>
            </button>
          </div>
        </aside>

        {/* Main Work Area Panel */}
        <main className="flex-grow p-4 sm:p-8 overflow-y-auto grid-bg relative z-10">
          <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="max-w-5xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
  );
}

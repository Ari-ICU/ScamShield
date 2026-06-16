"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import {
  ShieldAlert,
  LogIn,
  LogOut,
  Menu,
  X,
  Users,
  BarChart3,
  Search,
  AlertTriangle,
  ShieldCheck,
  Globe,
  PhoneCall,
  Eye,
  Bell
} from "lucide-react";
import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "@/lib/api";

export default function Navbar() {
  const { user, logout, apiFetch } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { showToast } = useToast();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Monitor scroll position to apply dynamic blurring
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 15) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    apiFetch("/notifications")
      .then((data) => setNotifications(data))
      .catch(() => {});

    const socket = io(SOCKET_URL);
    socket.emit("join_user", user.id);

    // In-app notification → dropdown + toast
    socket.on("notification", (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      showToast({
        type: notif.type === "WATCHLIST_UPDATE" ? "danger" : "info",
        title: notif.title ?? "New Notification",
        message: notif.message ?? "",
        duration: 6000,
      });
    });

    // Live community feed — new scam report broadcast
    socket.on("new_report", (report) => {
      showToast({
        type: "warning",
        title: `⚠️ New Scam Report: ${report.category?.replace(/_/g, " ")}`,
        message: `${report.number} — Risk ${report.riskScore ?? 0}%${report.province ? ` · ${report.province}` : ""}`,
        duration: 7000,
      });
    });

    // Risk threshold exceeded broadcast
    socket.on("risk_alert", (alert) => {
      showToast({
        type: "danger",
        title: `🚨 High-Risk Number Detected`,
        message: `${alert.number} has reached a risk score of ${alert.riskScore}% with ${alert.totalReports} report(s).`,
        duration: 8000,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user, showToast]);

  const handleMarkAllRead = async () => {
    try {
      await apiFetch("/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const navLinks = [
    { href: "/search", label: t("lookup"), icon: Search },
    { href: "/report", label: t("reportScam"), icon: AlertTriangle },
    { href: "/watchlist", label: language === "kh" ? "បញ្ជីតាមដាន" : "Watchlist", icon: Eye },
    { href: "/statistics", label: t("statistics"), icon: BarChart3 },
    { href: "/community", label: t("liveReports"), icon: Users },
    { href: "/call-tracker", label: t("callTracker") || "Call Tracker", icon: PhoneCall },
  ];

  const isActive = (href: string) => pathname === href;

  const renderLanguageSwitcher = (isMobile = false) => (
    <button
      onClick={() => setLanguage(language === "en" ? "kh" : "en")}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-905/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700/60 text-slate-350 hover:text-white transition duration-300 ease-out cursor-pointer shrink-0 shadow-inner ${
        isMobile ? "w-full justify-center py-2.5" : ""
      }`}
    >
      <Globe className="h-4 w-4 text-red-500 animate-spin-slow" />
      <span>{language === "en" ? "ខ្មែរ" : "English (EN)"}</span>
    </button>
  );

  const renderProfileDropdown = () => {
    if (!user) return null;
    return (
      <div className="relative">
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700/50 text-slate-200 hover:text-white transition duration-300 ease-out cursor-pointer select-none shadow-md"
        >
          <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-red-650 to-orange-500 text-white flex items-center justify-center font-extrabold text-[11px] font-mono uppercase shrink-0 shadow-lg shadow-red-655/15">
            {user.email[0]}
          </div>
          <span className="max-w-[110px] truncate text-slate-350 text-xs hidden lg:inline-block font-sans font-medium">
            {user.email}
          </span>
          <svg
            className={`h-3.5 w-3.5 text-slate-505 transition-transform duration-300 ${profileOpen ? "rotate-180 text-white" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {profileOpen && (
          <>
            <div className="fixed inset-0 z-40 cursor-default" onClick={() => setProfileOpen(false)} />
            <div className="absolute right-0 mt-2.5 w-60 glass border border-slate-800/80 rounded-2xl shadow-2xl p-2 space-y-1.5 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="px-3.5 py-2.5 border-b border-slate-900/60 bg-slate-950/20 rounded-t-xl">
                <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">
                  {language === "en" ? "Active User Account" : "គណនីប្រើប្រាស់"}
                </p>
                <p className="text-xs font-extrabold text-white truncate mt-0.5 font-mono">{user.email}</p>
              </div>
              
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900/80 border border-transparent hover:border-slate-800 transition duration-200"
                >
                  <ShieldCheck className="h-4 w-4 text-red-500 shadow-sm" />
                  {t("adminPanel")}
                </Link>
              )}

              <button
                onClick={() => {
                  setProfileOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-955/15 border border-transparent hover:border-red-900/10 transition duration-200 text-left cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                {t("logout")}
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderNotifications = () => {
    if (!user) return null;
    return (
      <div className="relative">
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          className={`relative p-2 px-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-805 hover:border-slate-700/65 text-slate-400 hover:text-white transition duration-300 ease-out cursor-pointer select-none ${unreadCount > 0 ? "shadow-md shadow-red-500/5 border-red-550/15" : ""}`}
        >
          <Bell className={`h-4.5 w-4.5 ${unreadCount > 0 ? "animate-wiggle text-red-400" : ""}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-655 text-[9px] font-black text-white border-2 border-slate-950 animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <>
            <div className="fixed inset-0 z-40 cursor-default" onClick={() => setNotifOpen(false)} />
            <div className="absolute right-0 mt-2.5 w-80 glass border border-slate-800/80 rounded-2xl shadow-2xl p-3.5 z-50 animate-in fade-in slide-in-from-top-3 duration-200 max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-900/60 mb-2.5">
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider font-sans">
                  {language === "en" ? "Recent Security Feed" : "សារជូនដំណឹង"}
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-bold text-red-500 hover:text-red-400 cursor-pointer transition"
                  >
                    {language === "en" ? "Mark all read" : "អានទាំងអស់"}
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-8 text-slate-555 text-xs italic">
                  {language === "en" ? "No notifications yet." : "មិនទាន់មានសារជូនដំណឹងទេ។"}
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkOneRead(n.id)}
                      className={`p-3 rounded-xl text-xs transition duration-200 cursor-pointer flex gap-3 items-start border ${
                        n.read
                          ? "bg-slate-900/30 text-slate-400 border-transparent hover:bg-slate-900/60"
                          : "bg-red-500/5 text-slate-200 border-red-500/10 hover:bg-red-500/10"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {n.type === "WATCHLIST_UPDATE" ? (
                          <ShieldAlert className="h-4.5 w-4.5 text-red-500" />
                        ) : n.type === "APPEAL" ? (
                          <PhoneCall className="h-4.5 w-4.5 text-yellow-500" />
                        ) : (
                          <Users className="h-4.5 w-4.5 text-orange-500" />
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="font-bold truncate text-[11px] text-white">{n.title}</p>
                        <p className="mt-1 leading-relaxed text-slate-400 text-[10px]">
                          {n.message}
                        </p>
                        <p className="mt-1.5 text-[9px] text-slate-600 font-medium font-mono">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {!n.read && (
                        <div className="h-2 w-2 rounded-full bg-red-500 mt-2 shrink-0 animate-pulse shadow-sm shadow-red-500/50" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderMenuDropdown = () => (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black bg-slate-900/60 hover:bg-slate-800/80 border border-slate-805 hover:border-slate-700/65 text-slate-200 hover:text-white transition duration-300 ease-out cursor-pointer select-none shadow-md active:scale-95"
      >
        {isOpen ? <X className="h-4.5 w-4.5 text-red-400" /> : <Menu className="h-4.5 w-4.5 text-orange-400" />}
        <span>{language === "en" ? "Menu" : "ម៉ឺនុយ"}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2.5 w-72 glass border border-slate-800/80 rounded-2xl shadow-2xl p-3 space-y-3.5 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
            
            {/* Main Links */}
            <div className="space-y-1">
              <div className="px-2 pb-1.5 border-b border-slate-900/65 mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {language === "en" ? "Navigation" : "ការរុករក"}
                </span>
              </div>
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition duration-200 border ${
                      isActive(link.href)
                        ? "bg-slate-900 border-slate-800 text-white shadow-inner"
                        : "text-slate-400 border-transparent hover:text-white hover:bg-slate-900/60 hover:border-slate-850/30"
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0 text-red-500" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Mobile-Only Options (Hidden on Desktop to prevent duplicates) */}
            <div className="md:hidden border-t border-slate-900/80 pt-3.5 space-y-3">
              <div className="px-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {language === "en" ? "Settings" : "ការកំណត់"}
                </span>
              </div>
              
              {/* Language switcher inside menu on mobile */}
              <div className="px-2">
                {renderLanguageSwitcher(true)}
              </div>

              {/* Login / Profile switcher inside menu on mobile */}
              <div className="px-2 border-t border-slate-900/50 pt-3">
                {user ? (
                  <div className="space-y-2">
                    <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900">
                      <p className="text-[9px] font-bold text-slate-550 uppercase tracking-wider">{language === "en" ? "Account" : "គណនី"}</p>
                      <p className="text-xs text-slate-200 font-extrabold truncate mt-0.5 font-mono">{user.email}</p>
                    </div>
                    {user.role === "ADMIN" && (
                      <Link
                        href="/admin"
                        onClick={() => setIsOpen(false)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-900 border border-slate-800 text-white"
                      >
                        <ShieldCheck className="h-4 w-4 text-red-550" />
                        <span>{t("adminPanel")}</span>
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-red-955/10 hover:bg-red-950/20 text-red-400 hover:text-red-300 border border-transparent hover:border-red-900/20 transition cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{t("logout")}</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-350 hover:text-white bg-slate-900 border border-slate-800 transition"
                    >
                      <LogIn className="h-4 w-4 text-slate-400" />
                      <span>{t("login")}</span>
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsOpen(false)}
                      className="w-full block text-center px-3 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-red-600 to-orange-500 text-white transition active:scale-95 shadow-md shadow-red-500/10"
                    >
                      {t("register")}
                    </Link>
                  </div>
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 border-b ${
      scrolled 
        ? "bg-slate-950/85 backdrop-blur-md border-slate-900/80 py-2" 
        : "bg-slate-950/95 border-slate-900/30 py-3"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="p-2.5 bg-gradient-to-tr from-red-650/10 to-orange-500/10 rounded-2xl group-hover:from-red-650/20 group-hover:to-orange-500/20 transition-all duration-300 border border-red-550/10 shadow-inner group-hover:scale-105">
                <ShieldAlert className="h-5.5 w-5.5 text-red-500" />
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-red-500 via-orange-400 to-yellow-400 bg-clip-text text-transparent font-sans group-hover:brightness-110 transition duration-300">
                ScamShield KH
              </span>
            </Link>
          </div>

          {/* Right Action Icons & Unified Menu Dropdown */}
          <div className="flex items-center gap-3 shrink-0 ml-auto">
            
            {/* Desktop-Only Lang switcher and login/profile to keep header lightweight on mobile */}
            <div className="hidden md:flex items-center gap-3">
              {renderLanguageSwitcher(false)}
              
              {user ? (
                renderProfileDropdown()
              ) : (
                <div className="flex items-center gap-2.5">
                  <Link
                    href="/login"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold text-slate-350 hover:text-white transition duration-200"
                  >
                    <LogIn className="h-4.5 w-4.5 text-slate-400" />
                    <span>{t("login")}</span>
                  </Link>
                  <Link
                    href="/register"
                    className="px-4.5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white transition-all duration-300 shadow-md shadow-red-500/10 hover:shadow-red-500/20 active:scale-95"
                  >
                    {t("register")}
                  </Link>
                </div>
              )}
            </div>

            {/* Notifications (Visible on both mobile & desktop) */}
            {renderNotifications()}

            {/* Unified Menu (Desktop + Mobile) */}
            {renderMenuDropdown()}
          </div>

        </div>
      </div>
    </nav>
  );
}

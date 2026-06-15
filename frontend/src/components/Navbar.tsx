"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
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
  PhoneCall
} from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const navLinks = [
    { href: "/search", label: t("lookup"), icon: Search },
    { href: "/report", label: t("reportScam"), icon: AlertTriangle },
    { href: "/statistics", label: t("statistics"), icon: BarChart3 },
    { href: "/community", label: t("liveReports"), icon: Users },
    { href: "/call-tracker", label: t("callTracker") || "Call Tracker", icon: PhoneCall },
  ];

  const isActive = (href: string) => pathname === href;

  const renderLanguageSwitcher = () => (
    <button
      onClick={() => setLanguage(language === "en" ? "kh" : "en")}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-350 hover:bg-slate-800 hover:text-white transition cursor-pointer shrink-0"
    >
      <Globe className="h-3.5 w-3.5" />
      <span>{language === "en" ? "ខ្មែរ" : "English"}</span>
    </button>
  );

  const renderProfileDropdown = () => {
    if (!user) return null;
    return (
      <div className="relative">
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white transition cursor-pointer select-none"
        >
          <div className="h-5 w-5 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center font-bold text-[10px] font-mono uppercase shrink-0">
            {user.email[0]}
          </div>
          <span className="max-w-[100px] truncate text-slate-300 text-xs hidden lg:inline-block">
            {user.email}
          </span>
          <svg
            className={`h-3.5 w-3.5 text-slate-500 transition-transform ${profileOpen ? "rotate-180" : ""}`}
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
            <div className="absolute right-0 mt-2 w-56 glass border border-slate-800 rounded-2xl shadow-2xl p-2 space-y-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-900">
                <p className="text-[9px] font-extrabold text-slate-550 uppercase tracking-widest">
                  {language === "en" ? "Account" : "គណនី"}
                </p>
                <p className="text-xs font-bold text-white truncate mt-0.5">{user.email}</p>
              </div>
              
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 transition"
                >
                  <ShieldCheck className="h-4 w-4 text-red-500" />
                  {t("adminPanel")}
                </Link>
              )}

              <button
                onClick={() => {
                  setProfileOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-955/10 transition text-left cursor-pointer"
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

  return (
    <nav className="sticky top-0 z-50 glass border-b border-slate-800 bg-slate-950/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="p-2 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition">
                <ShieldAlert className="h-5 w-5 text-red-500" />
              </div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-red-500 via-orange-400 to-yellow-400 bg-clip-text text-transparent font-sans">
                ScamShield KH
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1 overflow-x-auto py-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    isActive(link.href)
                      ? "bg-slate-900 border border-slate-800 text-white shadow shadow-black/10"
                      : "text-slate-400 hover:text-slate-205 hover:bg-slate-900/40"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Desktop Auth & Lang */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {renderLanguageSwitcher()}

            {user ? (
              renderProfileDropdown()
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-350 hover:text-white transition"
                >
                  <LogIn className="h-4 w-4" />
                  {t("login")}
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-650 hover:bg-red-600 text-white transition shadow-lg shadow-red-600/20"
                >
                  {t("register")}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none transition cursor-pointer"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden glass border-b border-slate-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition ${
                    isActive(link.href)
                      ? "bg-slate-900 border border-slate-800 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition ${
                  isActive("/admin")
                    ? "bg-red-500/10 text-red-400 border border-red-500/15"
                    : "text-red-450 hover:text-red-400 hover:bg-red-955/20"
                }`}
              >
                <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
                <span>{t("adminPanel")}</span>
              </Link>
            )}

            <div className="border-t border-slate-900 pt-4 pb-2 mt-2">
              <div className="px-3 mb-4 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{language === "en" ? "Language" : "ភាសា"}</span>
                {renderLanguageSwitcher()}
              </div>

              {user ? (
                <div className="px-3 space-y-2">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{language === "en" ? "Logged in as" : "គណនី"}</div>
                    <div className="text-xs text-slate-200 font-semibold truncate mt-0.5">
                      {user.email}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("logout")}
                  </button>
                </div>
              ) : (
                <div className="px-3 space-y-2">
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-350 hover:text-white hover:bg-slate-900 transition"
                  >
                    <LogIn className="h-4 w-4" />
                    {t("login")}
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setIsOpen(false)}
                    className="w-full block text-center px-4 py-2.5 rounded-xl text-xs font-semibold bg-red-650 hover:bg-red-600 text-white transition shadow-lg shadow-red-600/20"
                  >
                    {t("register")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

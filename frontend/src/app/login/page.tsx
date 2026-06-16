"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";
import { LogIn, Mail, Lock, ShieldAlert, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setShakeTrigger(false);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Failed to log in");
      setLoading(false);
      setShakeTrigger(true);
      // Reset shake after animation completes
      setTimeout(() => setShakeTrigger(false), 500);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-grow flex items-center justify-center py-20 px-4 grid-bg relative">
        {/* Glow effect */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />

        <div className={`w-full max-w-md bg-slate-950/45 backdrop-blur-xl rounded-2xl border border-white/5 p-8 z-10 relative overflow-hidden transition-all duration-300 hover:border-red-500/10 shadow-2xl shadow-black/80 ${shakeTrigger ? 'animate-shake border-red-500/30 shadow-red-950/10' : ''}`}>
          {/* Top colored accent line */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 via-rose-500 to-amber-500" />
          
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-red-500/10 rounded-2xl border border-red-500/20 mb-4 text-red-500 shadow-inner">
              <LogIn className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{t("welcomeBack")}</h1>
            <p className="text-slate-400 text-sm mt-1.5">
              {t("signInDesc")}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm flex gap-3 items-center animate-fade-up">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                {t("emailLabel")}
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 group-hover:text-slate-400 transition-colors">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 focus:border-red-500 focus:bg-slate-950/80 focus:ring-4 focus:ring-red-500/10 rounded-xl outline-none text-white transition duration-200 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                  {t("passwordLabel")}
                </label>
              </div>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 group-hover:text-slate-400 transition-colors">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="off"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 focus:border-red-500 focus:bg-slate-950/80 focus:ring-4 focus:ring-red-500/10 rounded-xl outline-none text-white transition duration-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-semibold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-900/30 active:scale-[0.98] cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4.5 h-4.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  {t("authenticating")}
                </>
              ) : (
                <>
                  {t("signInBtn")}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-400">
            {t("noAccount")}{" "}
            <Link href="/register" className="text-red-400 hover:text-red-300 font-semibold underline decoration-red-400/30 hover:decoration-red-300 transition-colors">
              {t("createAccountLink")}
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-900/60 flex items-center justify-center gap-4 text-[10px] font-bold text-slate-500 tracking-wider">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/80" />
              AES-256 SECURED
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
            <span>CAMBODIA SECURE NETWORK</span>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

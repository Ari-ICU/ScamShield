"use client";

import React, { useState } from "react";
import Link from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";
import { LogIn, Mail, Lock, ShieldAlert, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Failed to log in");
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-grow flex items-center justify-center py-16 px-4 grid-bg relative">
        {/* Glow effect */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />

        <div className="w-full max-w-md glass rounded-2xl border border-slate-800 p-8 z-10 relative">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-red-500/10 rounded-full border border-red-500/20 mb-3 text-red-500">
              <LogIn className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-white">{t("welcomeBack")}</h1>
            <p className="text-slate-400 text-sm mt-1">
              {t("signInDesc")}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm flex gap-2 items-center">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t("emailLabel")}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl outline-none text-white transition text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t("passwordLabel")}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl outline-none text-white transition text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-semibold bg-red-600 hover:bg-red-500 text-white transition flex items-center justify-center gap-1.5 disabled:opacity-55 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
            >
              {loading ? t("authenticating") : t("signInBtn")}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-400">
            {t("noAccount")}{" "}
            <a href="/register" className="text-red-400 hover:text-red-300 font-semibold underline">
              {t("createAccountLink")}
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

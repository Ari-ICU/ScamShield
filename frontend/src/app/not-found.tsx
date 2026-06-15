"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";
import { AlertTriangle, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <>
      <Navbar />
      <main className="flex-grow grid-bg relative flex flex-col items-center justify-center py-20 px-4 min-h-[75vh]">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[250px] h-[250px] bg-orange-500/5 rounded-full blur-[90px] pointer-events-none" />

        <div className="max-w-md w-full glass rounded-3xl border border-slate-800 p-8 text-center space-y-6 relative z-10 shadow-2xl">
          {/* Cyber Warning Graphic */}
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center bg-red-500/10 rounded-full border border-red-500/20 text-red-500 animate-pulse">
            <AlertTriangle className="h-12 w-12" />
            <div className="absolute -inset-1 rounded-full border border-red-500/10 animate-ping opacity-75" />
          </div>

          <div className="space-y-2.5">
            <h1 className="text-5xl font-extrabold text-white font-mono tracking-tight bg-gradient-to-r from-red-500 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
              404
            </h1>
            <h2 className="text-xl font-bold text-white tracking-wide">
              {t("notFoundTitle")}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
              {t("notFoundDesc")}
            </p>
          </div>

          {/* Navigation Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.back()}
              className="px-5 py-3 rounded-xl text-sm font-semibold bg-slate-900 border border-slate-800 text-slate-350 hover:bg-slate-800 hover:text-white transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
            <Link
              href="/"
              className="px-5 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-red-650 to-red-500 hover:from-red-550 hover:to-orange-500 text-white transition shadow-lg shadow-red-600/15 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Home className="h-4 w-4" />
              {t("returnHome")}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

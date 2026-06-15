"use client";

import Link from "next/link";
import { ShieldAlert, BookOpen, AlertCircle, Mail, Globe } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();

  return (
    <footer className="mt-auto border-t border-slate-900 bg-slate-950/60 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Main Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-red-500" />
              <span className="font-bold text-lg text-white">ScamShield Cambodia</span>
            </div>
            <p className="text-sm max-w-sm">
              {t("footerDesc")}
            </p>
            <div className="text-xs text-red-400 font-medium bg-red-950/20 border border-red-950 px-3 py-2 rounded-lg max-w-xs flex gap-2 items-start">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong className="font-bold">{t("footerDisclaimerTitle")}</strong>
                {t("footerDisclaimerText")}
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4 flex items-center gap-1.5 text-sm">
              <BookOpen className="h-4 w-4 text-orange-400" /> {t("resourcesTitle")}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/search" className="hover:text-white transition">{t("lookup")}</Link>
              </li>
              <li>
                <Link href="/report" className="hover:text-white transition">{t("reportScam")}</Link>
              </li>
              <li>
                <Link href="/statistics" className="hover:text-white transition">{t("statistics")}</Link>
              </li>
              <li>
                <Link href="/community" className="hover:text-white transition">{t("liveReports")}</Link>
              </li>
            </ul>
          </div>

          {/* Contacts & Support */}
          <div>
            <h3 className="font-semibold text-white mb-4 flex items-center gap-1.5 text-sm">
              <Globe className="h-4 w-4 text-emerald-400" /> {t("authoritiesTitle")}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-slate-500" />
                <a href="https://www.trc.gov.kh" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                  TRC Cambodia
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-slate-500" />
                <a href="https://www.mptc.gov.kh" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                  MPTC Cambodia
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                <a href="mailto:support@scamshield.gov.kh" className="hover:text-white transition">
                  {t("reportToSupport")}
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-slate-900 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <div>
            &copy; {currentYear} ScamShield Cambodia. {t("allRightsReserved")}
          </div>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-white transition">{t("privacyPolicy")}</Link>
            <span>&bull;</span>
            <Link href="#" className="hover:text-white transition">{t("termsOfService")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

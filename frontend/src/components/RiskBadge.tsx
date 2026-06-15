"use client";

import React from "react";
import { ShieldCheck, AlertTriangle, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface RiskBadgeProps {
  score: number;
}

export default function RiskBadge({ score }: RiskBadgeProps) {
  const { t } = useLanguage();

  let label = t("safeNumber");
  let colorClass = "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 shadow-emerald-500/5";
  let Icon = ShieldCheck;
  let description = t("safeNumberDesc");

  if (score >= 75) {
    label = t("highRiskScam");
    colorClass = "border-red-500/30 text-red-400 bg-red-500/10 shadow-red-500/5 animate-pulse";
    Icon = ShieldAlert;
    description = t("highRiskScamDesc");
  } else if (score >= 30) {
    label = t("suspicious");
    colorClass = "border-orange-500/30 text-orange-400 bg-orange-500/10 shadow-orange-500/5";
    Icon = AlertTriangle;
    description = t("suspiciousDesc");
  }

  return (
    <div className={`p-4 rounded-xl border flex flex-col sm:flex-row gap-4 items-start sm:items-center shadow-lg ${colorClass}`}>
      <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-base tracking-wide uppercase">{label}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-black/40 font-mono font-bold">
            {t("scoreLabel")}{score}/100
          </span>
        </div>
        <p className="text-sm mt-1 opacity-80 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

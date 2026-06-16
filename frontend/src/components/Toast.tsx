"use client";

import { useEffect, useRef, useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  Bell,
} from "lucide-react";
import { useToast, type Toast, type ToastType } from "@/context/ToastContext";

// ── Colour & icon map ─────────────────────────────────────────────────────────
const CONFIG: Record<
  ToastType,
  {
    bg: string;
    border: string;
    bar: string;
    text: string;
    icon: React.ElementType;
    iconColor: string;
  }
> = {
  danger: {
    bg: "bg-slate-950/95",
    border: "border-red-500/30",
    bar: "bg-red-500",
    text: "text-red-400",
    icon: ShieldAlert,
    iconColor: "text-red-500",
  },
  warning: {
    bg: "bg-slate-950/95",
    border: "border-amber-500/30",
    bar: "bg-amber-500",
    text: "text-amber-400",
    icon: AlertTriangle,
    iconColor: "text-amber-400",
  },
  success: {
    bg: "bg-slate-950/95",
    border: "border-emerald-500/30",
    bar: "bg-emerald-500",
    text: "text-emerald-400",
    icon: CheckCircle2,
    iconColor: "text-emerald-400",
  },
  info: {
    bg: "bg-slate-950/95",
    border: "border-blue-500/30",
    bar: "bg-blue-500",
    text: "text-blue-400",
    icon: Info,
    iconColor: "text-blue-400",
  },
};

// ── Single Toast item ─────────────────────────────────────────────────────────
function ToastItem({ toast }: { toast: Toast }) {
  const { dismissToast } = useToast();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cfg = CONFIG[toast.type];
  const Icon = cfg.icon;
  const duration = toast.duration ?? 5000;

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Progress bar countdown
  useEffect(() => {
    if (duration <= 0) return;
    const step = 50; // ms
    const decrement = (step / duration) * 100;
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev - decrement;
        if (next <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return next;
      });
    }, step);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [duration]);

  const handleDismiss = () => {
    setLeaving(true);
    setTimeout(() => dismissToast(toast.id), 300);
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        relative w-80 overflow-hidden rounded-2xl border shadow-2xl shadow-black/40
        backdrop-blur-xl select-none transition-all duration-300 ease-out
        ${cfg.bg} ${cfg.border}
        ${visible && !leaving ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"}
      `}
    >
      {/* Content */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <div className={`mt-0.5 shrink-0 ${cfg.iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${cfg.text}`}>{toast.title}</p>
          <p className="mt-0.5 text-xs text-slate-400 leading-relaxed line-clamp-3">
            {toast.message}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-slate-600 hover:text-slate-300 transition mt-0.5"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="h-0.5 w-full bg-slate-900">
          <div
            className={`h-full ${cfg.bar} transition-all duration-75 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ── Toast container (bottom-right fixed) ──────────────────────────────────────
export default function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      id="toast-container"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-3 pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}

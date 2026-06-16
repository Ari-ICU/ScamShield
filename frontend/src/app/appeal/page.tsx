"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";
import { API_BASE } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Phone,
  FileText,
  Send,
  ArrowLeft,
  Mail,
  Upload,
  X,
  Image,
  CheckCircle2
} from "lucide-react";

function AppealFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();

  const phoneParam = searchParams.get("phone") || "";

  const [number, setNumber] = useState(phoneParam);
  const [reason, setReason] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (phoneParam) {
      setNumber(phoneParam);
    }
  }, [phoneParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!number.trim()) {
      setError("Phone number is required");
      setLoading(false);
      return;
    }
    if (!reason.trim() || reason.length < 10) {
      setError("Please provide a detailed reason (at least 10 characters)");
      setLoading(false);
      return;
    }
    if (!contactEmail.trim()) {
      setError("Contact email is required");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("number", number.trim());
      formData.append("reason", reason.trim());
      formData.append("contactEmail", contactEmail.trim());
      if (proofFile) {
        formData.append("proof", proofFile);
      }

      const res = await fetch(`${API_BASE}/appeals`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }

      setSuccess("Appeal submitted successfully! Administrators will review your request shortly.");
      setTimeout(() => {
        router.push(`/search?phone=${encodeURIComponent(number.trim())}`);
      }, 2000);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to submit appeal";
      setError(errMsg);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 relative z-10">
      <button
        onClick={() => router.push(number ? `/search?phone=${encodeURIComponent(number)}` : "/")}
        className="flex items-center gap-1.5 text-slate-400 hover:text-white transition text-sm font-medium mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Lookup
      </button>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass rounded-2xl border border-slate-800 p-6 sm:p-8 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

        <div className="flex items-center gap-4 border-b border-slate-900 pb-5 mb-6">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <ShieldAlert className="h-6.5 w-6.5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Appeal Scam Rating</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Submit an appeal if you believe a phone number was reported falsely.
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm flex gap-3 items-center"
            >
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-sm flex gap-3 items-center"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Target Phone number */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Flagged Phone Number
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Phone className="h-4.5 w-4.5" />
              </span>
              <input
                type="text"
                required
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="e.g. 012 345 678"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950/70 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl outline-none text-white transition-all text-sm font-mono focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Contact Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Mail className="h-4.5 w-4.5" />
              </span>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="your.email@domain.com"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950/70 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl outline-none text-white transition-all text-sm focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Appeal Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Reason for Appeal
            </label>
            <div className="relative">
              <span className="absolute top-3.5 left-3.5 text-slate-500">
                <FileText className="h-4.5 w-4.5" />
              </span>
              <textarea
                required
                rows={5}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide detailed explanation and evidence proving that this phone number is not associated with scams..."
                className="w-full pl-11 pr-4 py-3 bg-slate-955 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl outline-none text-white transition-all text-sm resize-none focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Proof Upload */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Supporting Proof (Company Registry, Verification document)
            </label>
            {!proofFile ? (
              <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/20 rounded-xl p-6 text-center cursor-pointer transition relative">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setProofFile(e.target.files[0]);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="p-3 bg-slate-900 rounded-full text-slate-400">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Upload proof document or screenshot</p>
                    <p className="text-xs text-slate-500 mt-1">Allowed: JPG, PNG, WEBP, PDF (Max 10MB)</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3.5 bg-slate-900/50 border border-slate-850 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    <Image className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate max-w-[250px] sm:max-w-[400px]">
                      {proofFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(proofFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProofFile(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.01 }}
            whileTap={{ scale: loading ? 1 : 0.99 }}
            className="w-full py-4 px-4 rounded-xl font-bold bg-gradient-to-r from-emerald-650 to-emerald-550 hover:from-emerald-550 hover:to-teal-500 text-white transition flex items-center justify-center gap-2 disabled:opacity-55 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            {loading ? "Submitting Appeal..." : "Submit Appeal"}
            {!loading && <Send className="h-4.5 w-4.5" />}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

export default function AppealPage() {
  return (
    <>
      <Navbar />
      <main className="flex-grow grid-bg relative flex items-center justify-center min-h-[calc(100vh-140px)]">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <Suspense fallback={
          <div className="max-w-2xl mx-auto py-24 text-center">
            <div className="h-8 w-8 border-4 border-slate-800 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm">Loading context...</p>
          </div>
        }>
          <AppealFormContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";
import { 
  Eye, 
  Trash2, 
  Search, 
  Bell, 
  AlertTriangle, 
  ShieldAlert, 
  TrendingUp, 
  Calendar,
  PhoneCall
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WatchedNumber {
  id: string;
  numberId: string;
  number: string;
  riskScore: number;
  totalReport: number;
  createdAt: string;
  lastReportDate: string | null;
  lastReportCategory: string | null;
}

export default function WatchlistPage() {
  const { user, apiFetch, loading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const router = useRouter();

  const [watchlist, setWatchlist] = useState<WatchedNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const fetchWatchlist = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await apiFetch("/watchlist");
      setWatchlist(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(language === "kh" ? "មិនអាចទាញយកទិន្នន័យបញ្ជីតាមដានបានទេ" : "Failed to load watchlist data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, [user]);

  const handleUnwatch = async (numberId: string) => {
    try {
      await apiFetch(`/watchlist/${numberId}`, {
        method: "DELETE",
      });
      // Remove item from state with animation
      setWatchlist((prev) => prev.filter((item) => item.numberId !== numberId));
    } catch (err: any) {
      console.error(err);
      alert(language === "kh" ? "ការលុបបានបរាជ័យ" : "Failed to remove number from watchlist.");
    }
  };

  const handleSearchClick = (number: string) => {
    router.push(`/search?phone=${encodeURIComponent(number)}`);
  };

  const filteredList = watchlist.filter((item) =>
    item.number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || (!user && authLoading)) {
    return (
      <div className="min-h-screen bg-[#0d0e12] text-white flex flex-col justify-between">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-red-500"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0e12] text-slate-100 flex flex-col justify-between selection:bg-red-500/35">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="mb-10 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center justify-center sm:justify-start gap-3">
              <Eye className="w-8 h-8 text-red-500 animate-pulse" />
              {language === "kh" ? "បញ្ជីតាមដានរបស់ខ្ញុំ" : "My Watchlist"}
            </h1>
            <p className="mt-2 text-slate-400 text-sm sm:text-base">
              {language === "kh" 
                ? "រក្សាទុកលេខទូរស័ព្ទសង្ស័យ ដើម្បីទទួលសារព្រមាននៅពេលពិន្ទុហានិភ័យផ្លាស់ប្តូរ" 
                : "Save suspicious phone numbers to track details and receive alerts on changes."}
            </p>
          </div>
          
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder={language === "kh" ? "ស្វែងរកលេខក្នុងបញ្ជីតាមដាន..." : "Search watched numbers..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#14161d] border border-slate-800 rounded-xl focus:outline-none focus:border-red-500/50 text-white placeholder-slate-500 transition-colors"
            />
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-red-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl flex items-center gap-4">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-[#14161d]/50 backdrop-blur-md border border-slate-900 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-2xl">
            <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Bell className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchTerm 
                ? (language === "kh" ? "រកមិនឃើញលេខទូរស័ព្ទ" : "No results match search") 
                : (language === "kh" ? "មិនទាន់មានលេខតាមដានទេ" : "Your watchlist is empty")}
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              {searchTerm 
                ? (language === "kh" ? "សូមព្យាយាមស្វែងរកម្តងទៀតជាមួយលេខផ្សេង" : "Try searching for a different number string.")
                : (language === "kh" ? "ស្វែងរកលេខសង្ស័យ រួចចុច 'តាមដានលេខ' ដើម្បីរក្សាទុក" : "Search a caller ID and click 'Watch' to save it here.")}
            </p>
            {!searchTerm && (
              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-medium rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-red-600/20 text-sm"
              >
                <Search className="w-4 h-4" />
                {language === "kh" ? "ស្វែងរកលេខសង្ស័យ" : "Search Suspicious Numbers"}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredList.map((item) => {
                // Determine if there was recent activity
                const isRecent = item.lastReportDate && 
                  (Date.now() - new Date(item.lastReportDate).getTime()) < (24 * 60 * 60 * 1000);

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25 }}
                    className="relative bg-[#14161d] hover:bg-[#181a24] border border-slate-900 hover:border-slate-800 rounded-2xl p-6 transition-all duration-300 group flex flex-col justify-between shadow-lg"
                  >
                    {/* Live Update Indicator Dot */}
                    {isRecent && (
                      <span className="absolute top-4 right-4 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                      </span>
                    )}

                    <div>
                      {/* Top stats */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2 text-slate-500 text-xs">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {new Date(item.createdAt).toLocaleDateString(
                              language === "kh" ? "km-KH" : "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </span>
                        </div>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold font-mono tracking-wider border shrink-0 ${
                          item.riskScore >= 75
                            ? "bg-red-500/10 border-red-500/20 text-red-400"
                            : item.riskScore >= 30
                            ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        }`}>
                          {item.riskScore}% {t(item.riskScore >= 75 ? "highRiskScam" : item.riskScore >= 30 ? "suspicious" : "safeStatus") || "Safe"}
                        </span>
                      </div>

                      {/* Number */}
                      <h2 className="text-xl font-bold text-white tracking-wide mb-2 font-mono group-hover:text-red-500 transition-colors">
                        {item.number}
                      </h2>

                      {/* Updates details */}
                      <div className="space-y-2 mt-4 pt-4 border-t border-slate-900/60">
                        <div className="flex items-center justify-between text-sm text-slate-400">
                          <span>{language === "kh" ? "រាយការណ៍សរុប៖" : "Total Reports:"}</span>
                          <span className="text-white font-semibold flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4 text-red-500/70" />
                            {item.totalReport}
                          </span>
                        </div>

                        {item.lastReportDate ? (
                          <div className="text-xs space-y-1 mt-2.5 p-2.5 rounded-lg bg-[#0d0e12]/60 border border-slate-900/40">
                            <div className="flex justify-between text-slate-500">
                              <span>{language === "kh" ? "រាយការណ៍ចុងក្រោយ៖" : "Last Activity:"}</span>
                              <span className="text-slate-400">
                                {new Date(item.lastReportDate).toLocaleDateString(
                                  language === "kh" ? "km-KH" : "en-US",
                                  { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>{language === "kh" ? "ប្រភេទឆបោក៖" : "Category:"}</span>
                              <span className="text-red-400/90 font-medium">
                                {t(item.lastReportCategory || "OTHER")}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 italic py-2">
                            {language === "kh" ? "មិនមានសកម្មភាពថ្មីៗទេ" : "No recent report activities."}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-6 pt-4 border-t border-slate-900/30">
                      <button
                        onClick={() => handleSearchClick(item.number)}
                        className="flex-grow flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors active:scale-[0.97]"
                      >
                        <Search className="w-3.5 h-3.5" />
                        {language === "kh" ? "វិភាគលម្អិត" : "Inspect"}
                      </button>

                      <button
                        onClick={() => handleUnwatch(item.numberId)}
                        className="flex-shrink-0 p-2.5 bg-red-950/20 hover:bg-red-900/30 text-red-400/90 hover:text-red-400 rounded-xl transition-all active:scale-[0.97] border border-red-950/30"
                        title={language === "kh" ? "លុបចេញពីបញ្ជីតាមដាន" : "Remove from watchlist"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

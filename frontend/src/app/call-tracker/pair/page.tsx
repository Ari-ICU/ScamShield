"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { API_BASE, SOCKET_URL } from "@/lib/api";

import {
  Smartphone,
  Radio,
  PhoneCall,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";

export default function MobilePairPage() {
  const { language } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"IDLE" | "SUCCESS" | "ERROR">("IDLE");
  const [testNumber, setTestNumber] = useState("0969551630");
  const [testCategory, setTestCategory] = useState("BANK_FRAUD");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "active" | "error">("idle");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const [activeNumber, setActiveNumber] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeRiskScore, setActiveRiskScore] = useState<number | null>(null);
  const [pairingToken, setPairingToken] = useState<string | null>(null);
  const pairingTokenRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    pairingTokenRef.current = pairingToken;
  }, [pairingToken]);

  const localIp = typeof window !== "undefined" ? window.location.hostname : "localhost";

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
    }, 0);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const numParam = params.get("number");
      const tokenParam = params.get("token");
      if (tokenParam) {
        setTimeout(() => {
          setPairingToken(tokenParam);
        }, 0);
      }
      if (numParam) {
        setTimeout(() => {
          setActiveNumber(numParam);
          setActiveCategory(params.get("category") || "OTHER");
          setActiveRiskScore(Number(params.get("riskScore") || "0"));
        }, 0);
      }
    }
  }, []);

  // 1. Poll active call status from backend continuously (detect start and hangup)
  useEffect(() => {
    if (!mounted) return;

    const checkActiveCall = () => {
      fetch(`${API_BASE}/calls/active`)
        .then((res) => res.json())
        .then((data) => {
          if (data.activeCall) {
            const ac = data.activeCall;
            setActiveNumber(ac.number);
            setActiveCategory(ac.category);
            setActiveRiskScore(ac.riskScore);
            if (ac.pairingToken) {
              setPairingToken(ac.pairingToken);
            }
          } else {
            // Only clear states if we don't have active parameters in url that haven't been cleared
            setActiveNumber(null);
            setActiveCategory(null);
            setActiveRiskScore(null);
            setPairingToken(null);
          }
        })
        .catch(() => {});
    };

    // Run immediately
    checkActiveCall();

    const statusInterval = setInterval(checkActiveCall, 3000);

    return () => clearInterval(statusInterval);
  }, [mounted]);

  // 2. Geolocation Watcher effect (only active when paired call is locked)
  useEffect(() => {
    if (!activeNumber || !pairingToken) {
      setTimeout(() => {
        setGpsStatus("idle");
        setGpsCoords(null);
      }, 0);
      return;
    }

    const sendLocationUpdate = (lat: number, lng: number) => {
      fetch(`${API_BASE}/calls/active/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, token: pairingTokenRef.current }),
      }).catch((err) => console.error("Error sending GPS location:", err));
    };

    let watchId: number | null = null;

    if (typeof window !== "undefined" && navigator.geolocation) {
      setTimeout(() => {
        setGpsStatus("idle");
      }, 0);
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsStatus("active");
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          sendLocationUpdate(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          setGpsStatus("error");
          console.warn("GPS watch error:", err.code, err.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        }
      );
    } else {
      setTimeout(() => {
        setGpsStatus("error");
      }, 0);
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [activeNumber, pairingToken]);

  const webhookUrl = `${SOCKET_URL.replace("/api", "")}/api/calls/detect`;

  const copyToClipboard = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(webhookUrl)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => {
          console.warn("Failed to copy using clipboard API, trying fallback:", err);
          fallbackCopyText(webhookUrl);
        });
    } else {
      fallbackCopyText(webhookUrl);
    }
  };

  const fallbackCopyText = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed"; // avoid scrolling to bottom
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Fallback copy failed:", err);
    }
    document.body.removeChild(textArea);
  };

  const handleTriggerMockCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testNumber.trim()) return;
    setSubmitting(true);
    setSubmitStatus("IDLE");

    // Build the correct backend URL dynamically from current hostname
    // (avoids localhost:4000 being unreachable from mobile browsers)
    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const detectUrl = `http://${hostname}:4000/api/calls/detect`;

    let lat: number | undefined;
    let lng: number | undefined;

    if (typeof window !== "undefined" && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (err) {
        console.warn("Could not retrieve location for mock call:", err);
      }
    }

    try {
      const response = await fetch(detectUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: testNumber.trim(),
          category: testCategory,
          lat,
          lng,
          locationSource: lat && lng ? "GPS Cellular Lock" : "Carrier Network (Estimated)"
        }),
      });
      if (!response.ok) throw new Error("Mock call broadcast failed");
      const resData = await response.json();
      const ac = resData.data;

      setSubmitStatus("SUCCESS");
      setActiveNumber(testNumber.trim());
      setActiveCategory(testCategory);
      setActiveRiskScore(85);
      if (ac && ac.pairingToken) {
        setPairingToken(ac.pairingToken);
      }

      setTimeout(() => setSubmitStatus("IDLE"), 4000);
    } catch {
      setSubmitStatus("ERROR");
    } finally {
      setSubmitting(false);
    }
  };

  const t = (en: string, kh: string) => (language === "kh" ? kh : en);


  return (
    <>
      <Navbar />
      <main className="flex-grow grid-bg py-10 px-4 flex flex-col justify-center min-h-screen relative overflow-hidden">

        {/* Ambient glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-red-600/6 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-10 left-1/4 w-[250px] h-[250px] bg-orange-600/4 rounded-full blur-[80px] pointer-events-none" />

        <div className="max-w-md w-full mx-auto space-y-5 relative z-10">

          {/* ── Header ── */}
          <div className="text-center space-y-3">
            <div className="relative inline-flex items-center justify-center mb-1">
              {/* Pulsing rings */}
              <div className="absolute w-20 h-20 rounded-full border border-red-500/15 animate-ping" style={{ animationDuration: "2s" }} />
              <div className="absolute w-14 h-14 rounded-full border border-red-500/20 animate-ping" style={{ animationDuration: "1.5s" }} />
              <div className="p-3.5 bg-red-500/10 border border-red-500/25 text-red-400 rounded-2xl relative z-10">
                <Smartphone className="h-6 w-6" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {t("Pair Your Device", "ភ្ជាប់ឧបករណ៍ទូរស័ព្ទ")}
            </h1>
            <p className="text-slate-500 text-xs max-w-xs mx-auto leading-relaxed">
              {t(
                "Configure call forwarding or trigger test signals to broadcast live alerts to your browser tracker.",
                "កំណត់មុខងារបញ្ជូនការខលចូលទៅកាន់ Tracker ឬសាកល្បងបញ្ជូនសញ្ញាតេស្ត។"
              )}
            </p>

            {/* Status badges */}
            <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Bridge Active
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <span className="text-[9px]">📶</span>
                {localIp}
              </div>
            </div>
          </div>

          {/* ── Active Geolocation Tracking Status ── */}
          {activeNumber && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-emerald-500/20 bg-emerald-500/10">
                <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
                <h3 className="text-xs font-bold uppercase text-emerald-400 tracking-wider flex-1">
                  {t("Active Call Location Lock", "កំពុងចាក់សោទីតាំងការខល")}
                </h3>
                <span className="h-2 w-2 bg-emerald-400 rounded-full animate-ping" />
              </div>
              <div className="p-5 text-center space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t(
                    "Your phone is streaming GPS coordinates to the Call Tracker dashboard in real-time.",
                    "ទូរស័ព្ទរបស់អ្នកកំពុងបញ្ជូនកូអរដោនេ GPS ផ្ទាល់ទៅ Call Tracker នៅលើកុំព្យូទ័ររបស់អ្នក។"
                  )}
                </p>

                {/* GPS status indicator */}
                <div className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${
                  gpsStatus === "active"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : gpsStatus === "error"
                    ? "bg-red-500/10 border-red-500/30 text-red-400"
                    : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    gpsStatus === "active" ? "bg-emerald-400 animate-pulse" :
                    gpsStatus === "error" ? "bg-red-400" : "bg-yellow-400 animate-pulse"
                  }`} />
                  {gpsStatus === "active"
                    ? t("GPS Active — Streaming Real Coordinates", "GPS កំពុងដំណើរការ — បញ្ជូនកូអរដោនេពិតប្រាកដ")
                    : gpsStatus === "error"
                    ? t("GPS Unavailable — Check browser permissions", "GPS មិនដំណើរការ — ពិនិត្យការអនុញ្ញាត")
                    : t("Acquiring GPS signal…", "កំពុងទទួលសញ្ញា GPS…")
                  }
                </div>

                {/* Live GPS coordinates */}
                {gpsCoords && (
                  <div className="flex items-center justify-center gap-2 font-mono text-[11px] text-emerald-300 bg-black/40 border border-emerald-500/20 px-3 py-2 rounded-xl">
                    <span className="text-slate-500">LAT</span>
                    <span className="font-bold">{gpsCoords.lat.toFixed(6)}</span>
                    <span className="text-slate-700">|</span>
                    <span className="text-slate-500">LNG</span>
                    <span className="font-bold">{gpsCoords.lng.toFixed(6)}</span>
                  </div>
                )}

                {gpsStatus === "error" && (
                  <div className="text-[10px] text-slate-500 leading-relaxed bg-black/30 border border-white/5 rounded-xl px-3 py-2 text-left space-y-1">
                    <p className="font-bold text-slate-400">{t("Troubleshooting:", "ការដោះស្រាយ:")}</p>
                    <p>• {t("Allow location permission when browser asks", "អនុញ្ញាតទីតាំងនៅពេលកម្មវិធីរុករកសួរ")}</p>
                    <p>• {t("Use HTTPS for precise GPS on mobile", "ប្រើ HTTPS ដើម្បីទទួល GPS ច្បាស់លាស់")}</p>
                    <p>• {t("Go outside if GPS signal is weak indoors", "ចេញខ្លះប្រសិនបើ GPS ខ្សោយក្នុងផ្ទះ")}</p>
                  </div>
                )}

                <div className="flex flex-wrap justify-center gap-3">
                  <div className="inline-flex flex-col items-center p-3 bg-black/40 border border-white/5 rounded-xl font-mono">
                    <span className="text-[10px] text-slate-500">{t("TARGET PHONE", "លេខទូរស័ព្ទ")}</span>
                    <span className="text-emerald-400 font-bold text-sm">{activeNumber}</span>
                  </div>
                  {activeCategory && (
                    <div className="inline-flex flex-col items-center p-3 bg-black/40 border border-white/5 rounded-xl font-mono">
                      <span className="text-[10px] text-slate-500">{t("CATEGORY", "ប្រភេទ")}</span>
                      <span className="text-amber-400 font-bold text-sm">{activeCategory.replace(/_/g, " ")}</span>
                    </div>
                  )}
                  {activeRiskScore !== null && activeRiskScore > 0 && (
                    <div className="inline-flex flex-col items-center p-3 bg-black/40 border border-white/5 rounded-xl font-mono">
                      <span className="text-[10px] text-slate-500">{t("RISK SCORE", "ហានិភ័យ")}</span>
                      <span className="text-red-400 font-bold text-sm">{activeRiskScore}%</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 justify-center text-[10px] text-slate-400">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  {t("Streaming GPS locks to desktop dashboard", "កំពុងបញ្ជូនទីតាំងកូអរដោនេ GPS ផ្ទាល់...")}
                </div>
              </div>
            </div>
          )}


          {/* ── Webhook Connection Card ── */}
          <div className="rounded-2xl border border-white/5 bg-[rgba(13,18,30,0.88)] overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5 bg-white/[0.02]">
              <Smartphone className="h-4 w-4 text-orange-500 animate-pulse" />
              <h3 className="text-xs font-bold uppercase text-white tracking-wider">
                {t("Webhook Connection", "ការភ្ជាប់តាម Webhook")}
              </h3>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-slate-500 text-[11px] leading-relaxed">
                {t(
                  "Use this Webhook URL to integrate with your custom automation tools or apps to send call data directly to this dashboard.",
                  "ប្រើប្រាស់ Webhook URL នេះដើម្បីភ្ជាប់ជាមួយឧបករណ៍ស្វ័យប្រវត្តិកម្មផ្ទាល់ខ្លួន ឬកម្មវិធីផ្សេងៗ ដើម្បីផ្ញើទិន្នន័យខលមកកាន់ផ្ទាំងគ្រប់គ្រងនេះ។"
                )}
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-widest">
                  {t("Your Webhook URL", "Webhook URL របស់អ្នក")}
                </label>
                <div className="flex items-center gap-2 bg-black/40 border border-white/8 rounded-xl p-2 pl-3.5 pr-2">
                  <span className="font-mono text-xs text-slate-300 break-all select-all flex-grow">
                    {webhookUrl}
                  </span>
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition shrink-0 cursor-pointer active:scale-95"
                    title={t("Copy to Clipboard", "ចម្លងទៅ Clipboard")}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Signal Simulator Card ── */}
          <div className="rounded-2xl border border-white/5 bg-[rgba(13,18,30,0.88)] overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5 bg-white/[0.02]">
              <Radio className="h-4 w-4 text-red-500 animate-pulse" />
              <h3 className="text-xs font-bold uppercase text-white tracking-wider">
                {t("Phone Signal Simulator", "ប្រព័ន្ធតេស្តសាកល្បងសញ្ញា")}
              </h3>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-slate-500 text-[11px] leading-relaxed">
                {t(
                  "Enter a number below and tap the button to simulate a live call intercept. Watch the tracker overlay lock instantly on your computer.",
                  "បញ្ចូលលេខទូរស័ព្ទខាងក្រោម រួចចុចប៊ូតុង ដើម្បីធ្វើការសាកល្បងខល ហើយពិនិត្យមើលអេក្រង់ Tracker នៅកុំព្យូទ័ររបស់អ្នក។"
                )}
              </p>

              <form onSubmit={handleTriggerMockCall} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-widest">
                    {t("Phone Number to Simulate", "លេខទូរស័ព្ទតេស្ត")}
                  </label>
                  <input
                    type="text"
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                    placeholder="e.g. 0969551630"
                    className="w-full px-3.5 py-2.5 bg-black/30 border border-white/8 rounded-xl text-sm text-white placeholder:text-slate-700 focus:outline-none focus:border-red-500/50 transition font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-widest">
                    {t("Scam Category", "ប្រភេទការឆបោក")}
                  </label>
                  <select
                    value={testCategory}
                    onChange={(e) => setTestCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/30 border border-white/8 rounded-xl text-xs text-white focus:outline-none focus:border-red-500/50 transition appearance-none cursor-pointer"
                  >
                    <option value="BANK_FRAUD">{t("Bank Fraud", "ការបោកប្រាស់តាមធនាគារ")}</option>
                    <option value="FAKE_DELIVERY">{t("Fake Delivery", "បន្លំភ្នាក់ងារដឹកជញ្ជូន")}</option>
                    <option value="LOTTERY">{t("Lottery Scam", "ឈ្នះរង្វាន់ឡូតូ")}</option>
                    <option value="INVESTMENT">{t("Investment Fraud", "បោកប្រាស់វិនិយោគ")}</option>
                    <option value="OTHER">{t("Other Scams", "ប្រភេទឆបោកផ្សេងៗ")}</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t("Sending…", "កំពុងបញ្ជូន…")}
                    </>
                  ) : (
                    <>
                      <PhoneCall className="h-4 w-4" />
                      {t("Trigger Call Overlay", "បញ្ជូនសញ្ញាតេស្តខល")}
                      <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-60" />
                    </>
                  )}
                </button>
              </form>

              {/* Success state */}
              {submitStatus === "SUCCESS" && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs rounded-xl flex gap-2.5 items-start animate-in fade-in zoom-in-95 duration-300">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white mb-0.5">{t("Signal Broadcasted!", "សញ្ញាត្រូវបានបញ្ជូន!")}</p>
                    <p className="text-emerald-400/80">{t("Check your desktop Call Tracker for the live alert overlay.", "សូមពិនិត្យ Call Tracker នៅកុំព្យូទ័ររបស់អ្នក។")}</p>
                  </div>
                </div>
              )}

              {/* Error state */}
              {submitStatus === "ERROR" && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-xl flex gap-2.5 items-start animate-in fade-in zoom-in-95 duration-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white mb-0.5">{t("Connection Failed", "ការតភ្ជាប់បរាជ័យ")}</p>
                    <p className="text-red-400/80">{t("Make sure your phone is on the same Wi-Fi as your computer.", "ប្រាកដថាទូរស័ព្ទ និងកុំព្យូទ័ររបស់អ្នកភ្ជាប់ Wi-Fi តែមួយ។")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>


        </div>
      </main>
      <Footer />
    </>
  );
}

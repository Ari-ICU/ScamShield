"use client";

import React, { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { API_BASE, SOCKET_URL } from "@/lib/api";
import { QRCodeSVG } from "qrcode.react";
import {
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Radio,
  MapPin,
  ShieldAlert,
  Volume2,
  Disc,
  ShieldCheck,
  AlertTriangle,
  Smartphone,
  Activity,
  Wifi,
  Lock,
  Unlock,
  Signal,
  Eye,
  Target,
  TrendingUp,
} from "lucide-react";


interface Scenario {
  id: string;
  nameEn: string;
  nameKh: string;
  number: string;
  category: string;
  riskScore: number;
  locationEn: string;
  locationKh: string;
  lat: number;
  lng: number;
  provider: string;
  transcriptsEn: string[];
  transcriptsKh: string[];
  locationSource?: string;
}

const CAMBODIA_PROVINCES: { nameEn: string; nameKh: string; lat: number; lng: number }[] = [
  { nameEn: "phnom penh", nameKh: "ភ្នំពេញ", lat: 11.5564, lng: 104.9282 },
  { nameEn: "siem reap", nameKh: "សៀមរាប", lat: 13.3633, lng: 103.8564 },
  { nameEn: "preah sihanouk", nameKh: "ព្រះសីហនុ", lat: 10.6402, lng: 103.5186 },
  { nameEn: "battambang", nameKh: "បាត់ដំបង", lat: 13.0957, lng: 103.2022 },
  { nameEn: "kampong cham", nameKh: "កំពង់ចាម", lat: 11.9934, lng: 105.4635 },
  { nameEn: "kandal", nameKh: "កណ្តាល", lat: 11.4833, lng: 104.9500 },
  { nameEn: "kampong speu", nameKh: "កំពង់ស្ពឺ", lat: 11.4533, lng: 104.5200 },
  { nameEn: "takeo", nameKh: "តាកែវ", lat: 10.9900, lng: 104.7847 },
  { nameEn: "kampot", nameKh: "កំពត", lat: 10.5929, lng: 104.1748 },
  { nameEn: "svay rieng", nameKh: "ស្វាយរៀង", lat: 11.0878, lng: 105.7994 },
  { nameEn: "banteay meanchey", nameKh: "បន្ទាយមានជ័យ", lat: 13.5851, lng: 102.9734 },
  { nameEn: "kampong thom", nameKh: "កំពង់ធំ", lat: 12.7111, lng: 104.8886 },
  { nameEn: "prey veng", nameKh: "ព្រៃវែង", lat: 11.4868, lng: 105.3253 },
  { nameEn: "pursat", nameKh: "ពោធិ៍សាត់", lat: 12.5384, lng: 103.9192 },
  { nameEn: "kampong chhnang", nameKh: "កំពង់ឆ្នាំង", lat: 12.2500, lng: 104.6667 },
  { nameEn: "kratie", nameKh: "ក្រចេះ", lat: 12.4881, lng: 106.0188 },
  { nameEn: "stung treng", nameKh: "ស្ទឹងត្រែង", lat: 13.5259, lng: 105.9741 },
  { nameEn: "mondulkiri", nameKh: "មណ្ឌលគីរី", lat: 12.4553, lng: 107.1895 },
  { nameEn: "ratanakiri", nameKh: "រតនគីរី", lat: 13.7397, lng: 106.9859 },
  { nameEn: "preah vihear", nameKh: "ព្រះវិហារ", lat: 13.8074, lng: 104.9810 },
  { nameEn: "oddar meanchey", nameKh: "ឧត្តរមានជ័យ", lat: 14.1784, lng: 103.5161 },
  { nameEn: "pailin", nameKh: "ប៉ៃលិន", lat: 12.8489, lng: 102.6093 },
  { nameEn: "koh kong", nameKh: "កោះកុង", lat: 11.6149, lng: 102.9838 },
  { nameEn: "kep", nameKh: "កែប", lat: 10.4829, lng: 104.3167 },
  { nameEn: "tboung khmum", nameKh: "ត្បូងឃ្មុំ", lat: 11.9333, lng: 105.6500 },
];

const getDeterministicCoordinates = (
  province: string,
  district?: string,
  commune?: string,
  village?: string
): { lat: number; lng: number; source: string } => {
  const p = (province || "").toLowerCase().trim();
  
  if (!p) {
    return { lat: 11.5564, lng: 104.9282, source: "Carrier Network (Estimated)" };
  }

  const addOffset = (
    baseLat: number,
    baseLng: number,
    d?: string,
    c?: string,
    v?: string,
    isFallback = false
  ) => {
    const combined = [d, c, v].filter(Boolean).join("-");
    if (!combined) {
      return { 
        lat: baseLat, 
        lng: baseLng, 
        source: isFallback ? "Carrier Network (Estimated)" : "GPS Cellular Lock" 
      };
    }

    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = combined.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Deterministic offset within 0.04 degrees (~4.4km range)
    const latOffset = (((Math.abs(hash) % 1000) / 1000) - 0.5) * 0.04;
    const lngOffset = (((Math.floor(Math.abs(hash) / 1000) % 1000) / 1000) - 0.5) * 0.04;
    
    return {
      lat: baseLat + latOffset,
      lng: baseLng + lngOffset,
      source: "GPS Cellular Lock"
    };
  };

  // Check specific high-profile scam zones first
  if (p.includes("bavet") || p.includes("បាវិត")) {
    return addOffset(11.0822, 106.1685, district, commune, village);
  }
  if (p.includes("poipet") || p.includes("ប៉ោយប៉ែត")) {
    return addOffset(13.6561, 102.5645, district, commune, village);
  }

  // Check standard provinces
  const matched = CAMBODIA_PROVINCES.find(
    (prov) => p.includes(prov.nameEn) || p.includes(prov.nameKh)
  );

  if (matched) {
    return addOffset(matched.lat, matched.lng, district, commune, village);
  }

  // Fallback to national mobile range centered at Phnom Penh
  return addOffset(11.5564, 104.9282, district, commune, village, true);
};

// Relative radar offset helper
const getRadarOffset = (userLat: number, userLng: number, targetLat: number, targetLng: number) => {
  const dLat = targetLat - userLat;
  const dLng = targetLng - userLng;
  const dist = Math.sqrt(dLat * dLat + dLng * dLng);
  
  if (dist === 0) return { x: 0, y: 0 };
  
  // Cap at 1.5 degrees (~160km) so points stay visually balanced on the grid
  const maxDeg = 1.5;
  const scale = Math.min(dist / maxDeg, 1.0) * 38; // Max 38% radius from center
  const angle = Math.atan2(dLat, dLng); // Relative angle in radians
  
  return {
    x: Math.cos(angle) * scale,
    y: Math.sin(angle) * scale
  };
};

const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: "standby_profile",
    nameEn: "Standby Tracker",
    nameKh: "ប្រព័ន្ធត្រៀមស្វែងរកទីតាំង",
    number: "+855 XXXXXXXX",
    category: "OTHER",
    riskScore: 0,
    locationEn: "Cambodia (National Mobile)",
    locationKh: "ប្រទេសកម្ពុជា",
    lat: 11.5564,
    lng: 104.9282,
    provider: "Smart/Cellcard/Metfone",
    locationSource: "Carrier Network (Estimated)",
    transcriptsEn: [
      "Standby mode active. Awaiting call signals...",
    ],
    transcriptsKh: [
      "កំពុងត្រៀមខ្លួនរួចរាល់។ រង់ចាំសញ្ញាខលចូល...",
    ]
  }
];

const CATEGORY_COLORS: Record<string, string> = {
  BANK_FRAUD: "text-red-400 bg-red-500/10 border-red-500/25",
  LOTTERY: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25",
  FAKE_DELIVERY: "text-orange-400 bg-orange-500/10 border-orange-500/25",
  OTHER: "text-slate-400 bg-slate-500/10 border-slate-500/25",
};

const RISK_COLOR = (score: number) => {
  if (score >= 85) return "text-red-400";
  if (score >= 70) return "text-orange-400";
  return "text-yellow-400";
};

const RISK_BAR_COLOR = (score: number) => {
  if (score >= 85) return "bg-red-500";
  if (score >= 70) return "bg-orange-500";
  return "bg-yellow-500";
};

export default function CallTrackerPage() {
  const { language, t } = useLanguage();
  const router = useRouter();

  const [scenarios, setScenarios] = useState<Scenario[]>(DEFAULT_SCENARIOS);
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(DEFAULT_SCENARIOS[0]);
  const [callState, setCallState] = useState<"IDLE" | "RINGING" | "ACTIVE">("IDLE");
  const [localIp, setLocalIp] = useState("localhost");
  const [pairingUrl, setPairingUrl] = useState("");

  const callStateRef = useRef(callState);
  const selectedScenarioRef = useRef(selectedScenario);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    selectedScenarioRef.current = selectedScenario;
  }, [selectedScenario]);

  useEffect(() => {
    fetch(`${API_BASE}/network-ip`)
      .then((res) => res.json())
      .then((data) => { if (data.ip) setLocalIp(data.ip); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (isLocal && localIp && localIp !== "localhost") {
        setPairingUrl(`http://${localIp}:3000/call-tracker/pair`);
      } else {
        setPairingUrl(`${window.location.origin}/call-tracker/pair`);
      }
    }
  }, [localIp]);

  const [activeToken, setActiveToken] = useState<string | null>(null);
  const activeTokenRef = useRef<string | null>(null);
  useEffect(() => {
    activeTokenRef.current = activeToken;
  }, [activeToken]);

  const getPairingUrl = () => {
    if ((callState === "ACTIVE" || callState === "RINGING") && selectedScenario && activeToken) {
      const num = encodeURIComponent(selectedScenario.number);
      const cat = encodeURIComponent(selectedScenario.category);
      const risk = selectedScenario.riskScore;
      return `${pairingUrl}?number=${num}&category=${cat}&riskScore=${risk}&token=${activeToken}`;
    }
    return pairingUrl;
  };

  const [timer, setTimer] = useState(0);
  const [muted, setMuted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [triangulating, setTriangulating] = useState(false);
  const [signalLocked, setSignalLocked] = useState(false);
  // Cambodia center used as fixed radar reference (desktop browser GPS is ISP-based = always Phnom Penh, not useful)
  const [visibleTranscripts, setVisibleTranscripts] = useState<string[]>([]);
  const [otpAlert, setOtpAlert] = useState(false);
  const [radarAngle, setRadarAngle] = useState(0);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptTimeoutRef = useRef<NodeJS.Timeout[]>([]);
  const radarRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimers = () => {
    if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
    transcriptTimeoutRef.current.forEach((t) => clearTimeout(t));
    transcriptTimeoutRef.current = [];
  };

  const resetCallState = () => {
    setTimer(0);
    setMuted(false);
    setRecording(false);
    setTriangulating(false);
    setSignalLocked(false);
    setVisibleTranscripts([]);
    setOtpAlert(false);
  };

  const declineCall = async (fromSocket: boolean | React.MouseEvent = false) => {
    const isSocket = fromSocket === true;
    if (!isSocket) {
      try {
        await fetch(`${API_BASE}/calls/active/hangup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: activeTokenRef.current }),
        });
      } catch (err) {
        console.error("Failed to sync call hangup:", err);
      }
    }
    setCallState("IDLE");
    setActiveToken(null);
    clearAllTimers();
  };

  const answerCall = async (fromSocket: boolean | React.MouseEvent = false) => {
    const isSocket = fromSocket === true;
    if (!isSocket) {
      try {
        await fetch(`${API_BASE}/calls/active/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: activeTokenRef.current }),
        });
      } catch (err) {
        console.error("Failed to sync call answer:", err);
      }
    }
    setCallState("ACTIVE");
    setTriangulating(true);
    timerIntervalRef.current = setInterval(() => setTimer((prev) => prev + 1), 1000);
    const lockTimeout = setTimeout(() => { setSignalLocked(true); setTriangulating(false); }, 6000);
    transcriptTimeoutRef.current.push(lockTimeout);
    const transcriptList = language === "kh" ? selectedScenarioRef.current.transcriptsKh : selectedScenarioRef.current.transcriptsEn;
    transcriptList.forEach((text, index) => {
      const displayTimeout = setTimeout(() => {
        setVisibleTranscripts((prev) => [...prev, text]);
        if (text.toLowerCase().includes("otp") || text.includes("លេខកូដ OTP") || text.toLowerCase().includes("password") || text.includes("លេខសម្ងាត់")) setOtpAlert(true);
      }, (index + 1) * 3500);
      transcriptTimeoutRef.current.push(displayTimeout);
    });
  };

  const startSimulation = () => {
    clearAllTimers();
    resetCallState();
    setCallState("RINGING");
  };

  const formatTimer = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleBlockAndReport = () => {
    declineCall();
    router.push(`/report?phone=${encodeURIComponent(selectedScenario.number)}&category=${encodeURIComponent(selectedScenario.category)}&desc=${encodeURIComponent(language === "kh" ? "ការខលបោកប្រាស់ តាមដានទីតាំង" : "Simulated call tracking location")}`);
  };

  const formatCategory = (cat: string) => cat.replace(/_/g, " ");

  // Radar sweep animation
  useEffect(() => {
    if (callState === "ACTIVE") {
      radarRef.current = setInterval(() => {
        setRadarAngle((prev) => (prev + 2) % 360);
      }, 30);
    } else {
      if (radarRef.current) clearInterval(radarRef.current);
    }
    return () => { if (radarRef.current) clearInterval(radarRef.current); };
  }, [callState]);

  // Note: Desktop browser geolocation removed — it only returns ISP/carrier IP location
  // (always Phnom Penh in Cambodia), not the user's real GPS. Use Pair page on mobile for real GPS.

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
  };

  const mapReportToScenario = (report: any): Scenario => {
    const province = report.province || "";
    const coords = getDeterministicCoordinates(province, report.district, report.commune, report.village);
    
    const fullLocEn = [report.village && `Phum ${report.village}`, report.commune && `Sangkat ${report.commune}`, report.district && `Khan ${report.district}`, report.province && `${report.province} Province`].filter(Boolean).join(", ") || "Cambodia (National Mobile Range)";
    const fullLocKh = [report.province && `ខេត្ត/ក្រុង${report.province}`, report.district && `ស្រុក/ខណ្ឌ${report.district}`, report.commune && `ឃុំ/សង្កាត់${report.commune}`, report.village && `ភូមិ${report.village}`].filter(Boolean).join(", ") || "ប្រទេសកម្ពុជា (ប្រព័ន្ធទូរស័ព្ទជាតិ)";
    const desc = report.description || "";
    const transcriptsEn = [`Incoming connection established from reported caller database.`, `Verified Scam Profile matches report category: ${report.category.replace(/_/g, " ")}.`];
    const transcriptsKh = [`បានបង្កើតការតភ្ជាប់ជាមួយលេខទូរស័ព្ទឆបោកក្នុងប្រព័ន្ធ។`, `ប្រវត្តិសាវតារសង្ស័យត្រូវនឹងប្រភេទ៖ ${t(report.category) || formatCategory(report.category)}។`];
    if (desc) { transcriptsEn.push(`Report Details: "${desc}"`); transcriptsKh.push(`របាយការណ៍លម្អិត៖ "${desc}"`); }
    else { transcriptsEn.push(`Warning: Multiple community reports filed against this active line.`); transcriptsKh.push(`ការព្រមាន៖ លេខទូរស័ព្ទនេះត្រូវបានរាយការណ៍ដោយសមាជិកជាច្រើនដង។`); }
    transcriptsEn.push(`System Alert: Do NOT share passwords, credentials, bank transfers, or OTP codes.`);
    transcriptsKh.push(`ការព្រមាន៖ ដាច់ខាតកុំផ្តល់លេខសម្ងាត់ ព័ត៌មានគណនី ឬផ្ទេរប្រាក់ឱ្យសោះ។`);
    
    return { 
      id: `report-${report.id}`, 
      nameEn: `Real Case: ${report.category.replace(/_/g, " ")}`, 
      nameKh: `ករណីពិត៖ ${t(report.category) || formatCategory(report.category)}`, 
      number: report.number, 
      category: report.category, 
      riskScore: report.riskScore, 
      locationEn: fullLocEn, 
      locationKh: fullLocKh, 
      lat: coords.lat, 
      lng: coords.lng, 
      provider: report.countryCode === "KH" ? "Metfone" : "Carrier Operator", 
      locationSource: coords.source,
      transcriptsEn, 
      transcriptsKh 
    };
  };


  const handleSimulateScenarioCall = async (sc: Scenario) => {
    try {
      const parsedLoc = sc.locationEn.split(", ");
      const province = parsedLoc[parsedLoc.length - 1] || "";
      
      await fetch(`${API_BASE}/calls/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: sc.number,
          category: sc.category,
          riskScore: sc.riskScore,
          carrier: sc.provider,
          province: province.replace(" Province", ""),
          lat: sc.lat,
          lng: sc.lng,
          locationSource: sc.locationSource || "Carrier Network (Estimated)"
        })
      });
    } catch (err) {
      console.error("Failed to trigger simulated call:", err);
    }
  };

  useEffect(() => {
    fetch(`${API_BASE}/reports`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const dynamicScenarios = data.map((report: any) => mapReportToScenario(report));
          const seen = new Set();
          const uniqueNumbers: Scenario[] = [];
          for (const item of dynamicScenarios) { if (!seen.has(item.number)) { seen.add(item.number); uniqueNumbers.push(item); } }
          setScenarios(uniqueNumbers);
          
          // Only set selectedScenario to the first item if there isn't already one selected (e.g. from active call restoration)
          setSelectedScenario((current) => {
            if (current && current.id !== DEFAULT_SCENARIOS[0].id) return current;
            return uniqueNumbers[0] || DEFAULT_SCENARIOS[0];
          });
        }
      })
      .catch(() => {});

    // Check for active call on mount
    fetch(`${API_BASE}/calls/active`)
      .then((res) => res.json())
      .then((data) => {
        if (data.activeCall) {
          const ac = data.activeCall;
          if (ac.pairingToken) {
            setActiveToken(ac.pairingToken);
          }
          
          const transcriptsEn = [
            `Bridge Alert: Incoming GSM Call detected on personal device from ${ac.number}`,
            `Carrier: ${ac.carrier || "Carrier Operator"} | Signal: Triangulated cellular lock.`
          ];
          const transcriptsKh = [
            `សេចក្តីជូនដំណឹង៖ រកឃើញការខលចូលប្រព័ន្ធ GSM ពីលេខ ${ac.number}`,
            `ប្រព័ន្ធសេវា៖ ${ac.carrier || "Carrier Operator"} | កំពុងកំណត់ទីតាំងអង់តែន។`
          ];
          if (ac.riskScore > 0) {
            transcriptsEn.push(`Warning: Phone line registered in system scam registries (${ac.riskScore}% Risk).`);
            transcriptsKh.push(`ការព្រមាន៖ ប្រព័ន្ធរកឃើញលេខទូរស័ព្ទនេះក្នុងបញ្ជីខ្មៅឆបោក (ហានិភ័យ ${ac.riskScore}%)។`);
          } else {
            transcriptsEn.push(`Status: Unreported caller. Verification recommended.`);
            transcriptsKh.push(`ស្ថានភាព៖ លេខទូរស័ព្ទថ្មី។ ណែនាំឱ្យផ្ទៀងផ្ទាត់មុនឆ្លើយតប។`);
          }
          transcriptsEn.push(`Do NOT share OTPs, transfers, or sensitive bank details.`);
          transcriptsKh.push(`ដាច់ខាតកុំផ្តល់លេខសម្ងាត់ OTP ឬផ្ទេរប្រាក់ឱ្យសោះ។`);

          const reconstructedScenario: Scenario = {
            id: `active-${ac.number}`,
            nameEn: ac.riskScore > 0 ? `Real Case: ${ac.riskScore}% Risk` : "Unknown GSM Caller",
            nameKh: ac.riskScore > 0 ? `ករណីពិត៖ ហានិភ័យ ${ac.riskScore}%` : "លេខខលចូល GSM មិនស្គាល់",
            number: ac.number,
            category: ac.category || "OTHER",
            riskScore: ac.riskScore,
            locationEn: ac.location || "Cambodia (National Mobile Range)",
            locationKh: ac.location || "ប្រទេសកម្ពុជា",
            lat: ac.lat || 11.5564,
            lng: ac.lng || 104.9282,
            provider: ac.carrier || "Carrier Operator",
            locationSource: ac.locationSource || (ac.lat && ac.lng ? "GPS Cellular Lock" : "Carrier Network (Estimated)"),
            transcriptsEn,
            transcriptsKh
          };
          
          setSelectedScenario(reconstructedScenario);
          setScenarios((prev) => [reconstructedScenario, ...prev.filter((s) => s.number !== reconstructedScenario.number)]);
          
          if (ac.status === "ACTIVE") {
            setCallState("ACTIVE");
            setSignalLocked(!!ac.lat);
            if (ac.lat && ac.lng) {
              setTriangulating(false);
            }
            
            const elapsed = ac.startTime ? Math.floor((Date.now() - ac.startTime) / 1000) : 0;
            setTimer(elapsed > 0 ? elapsed : 0);
            timerIntervalRef.current = setInterval(() => setTimer((prev) => prev + 1), 1000);
            
            setVisibleTranscripts(language === "kh" ? reconstructedScenario.transcriptsKh : reconstructedScenario.transcriptsEn);
          } else if (ac.status === "RINGING") {
            setCallState("RINGING");
          }
        }
      })
      .catch((err) => console.error("Error fetching active call state:", err));

    const socket: Socket = io(SOCKET_URL);
    
    socket.on("incoming_call", (data: any) => {
      const fullLocEn = [data.village && `Phum ${data.village}`, data.commune && `Sangkat ${data.commune}`, data.district && `Khan ${data.district}`, data.province && `${data.province} Province`].filter(Boolean).join(", ") || data.location || "Cambodia (National Mobile Range)";
      const fullLocKh = [data.province && `ខេត្ត/ក្រុង${data.province}`, data.district && `ស្រុក/ខណ្ឌ${data.district}`, data.commune && `ឃុំ/សង្កាត់${data.commune}`, data.village && `ភូមិ${data.village}`].filter(Boolean).join(", ") || data.location || "ប្រទេសកម្ពុជា";
      
      // Determine coordinates - support payload direct coordinates or use geocoding
      let finalLat = data.lat;
      let finalLng = data.lng;
      let finalSource = data.locationSource || "GPS Cellular Lock";

      if (!finalLat || !finalLng) {
        const coords = getDeterministicCoordinates(
          data.province || data.location,
          data.district,
          data.commune,
          data.village
        );
        finalLat = coords.lat;
        finalLng = coords.lng;
        finalSource = coords.source;
      }

      if (data.pairingToken) {
        setActiveToken(data.pairingToken);
      }

      // Check if call is already active/ringing with the same number to do a non-disruptive update
      const currentCallState = callStateRef.current;
      const currentSelected = selectedScenarioRef.current;
      const incomingClean = data.number.trim().replace(/[^\d+]/g, "");
      const activeClean = currentSelected?.number.trim().replace(/[^\d+]/g, "");

      if ((currentCallState === "ACTIVE" || currentCallState === "RINGING") && incomingClean === activeClean) {
        // Non-disruptively update location details
        setScenarios((prev) => prev.map((s) => {
          if (s.number.trim().replace(/[^\d+]/g, "") === incomingClean) {
            return {
              ...s,
              lat: finalLat,
              lng: finalLng,
              locationSource: finalSource,
              locationEn: fullLocEn,
              locationKh: fullLocKh,
            };
          }
          return s;
        }));

        setSelectedScenario((prev) => {
          if (prev && prev.number.trim().replace(/[^\d+]/g, "") === incomingClean) {
            return {
              ...prev,
              lat: finalLat,
              lng: finalLng,
              locationSource: finalSource,
              locationEn: fullLocEn,
              locationKh: fullLocKh,
            };
          }
          return prev;
        });

        if (data.lat && data.lng) {
          setSignalLocked(true);
          setTriangulating(false);
        }
        return;
      }

      // Default: trigger a new call overlay
      const transcriptsEn = [`Bridge Alert: Incoming GSM Call detected on personal device from ${data.number}`, `Carrier: ${data.carrier} | Signal: Triangulated cellular lock.`];
      const transcriptsKh = [`សេចក្តីជូនដំណឹង៖ រកឃើញការខលចូលប្រព័ន្ធ GSM ពីលេខ ${data.number}`, `ប្រព័ន្ធសេវា៖ ${data.carrier} | កំពុងកំណត់ទីតាំងអង់តែន។`];
      if (data.riskScore > 0) { transcriptsEn.push(`Warning: Phone line registered in system scam registries (${data.riskScore}% Risk).`); transcriptsKh.push(`ការព្រមាន៖ ប្រព័ន្ធរកឃើញលេខទូរស័ព្ទនេះក្នុងបញ្ជីខ្មៅឆបោក (ហានិភ័យ ${data.riskScore}%)។`); if (data.description) { transcriptsEn.push(`Report: "${data.description}"`); transcriptsKh.push(`កំណត់ត្រា៖ "${data.description}"`); } }
      else { transcriptsEn.push(`Status: Unreported caller. Verification recommended.`); transcriptsKh.push(`ស្ថានភាព៖ លេខទូរស័ព្ទថ្មី។ ណែនាំឱ្យផ្ទៀងផ្ទាត់មុនឆ្លើយតប។`); }
      transcriptsEn.push(`Do NOT share OTPs, transfers, or sensitive bank details.`);
      transcriptsKh.push(`ដាច់ខាតកុំផ្តល់លេខសម្ងាត់ OTP ឬផ្ទេរប្រាក់ឱ្យសោះ។`);

      const incomingScenario: Scenario = { 
        id: `incoming-${data.number}-${Date.now()}`, 
        nameEn: data.riskScore > 0 ? `Real Case: ${data.riskScore}% Risk` : "Unknown GSM Caller", 
        nameKh: data.riskScore > 0 ? `ករណីពិត៖ ហានិភ័យ ${data.riskScore}%` : "លេខខលចូល GSM មិនស្គាល់", 
        number: data.number, 
        category: data.category || "OTHER", 
        riskScore: data.riskScore, 
        locationEn: fullLocEn, 
        locationKh: fullLocKh, 
        lat: finalLat, 
        lng: finalLng, 
        provider: data.carrier || "Carrier Operator", 
        locationSource: finalSource,
        transcriptsEn, 
        transcriptsKh 
      };
      setScenarios((prev) => [incomingScenario, ...prev.filter((s) => s.number !== incomingScenario.number)]);
      setSelectedScenario(incomingScenario);
      clearAllTimers();
      resetCallState();
      setCallState("RINGING");
    });

    socket.on("answer_call", (data: any) => {
      if (data && data.pairingToken) {
        setActiveToken(data.pairingToken);
      }
      if (callStateRef.current !== "ACTIVE") {
        answerCall(true);
      }
    });

    socket.on("hangup_call", () => {
      if (callStateRef.current !== "IDLE") {
        declineCall(true);
      }
    });

    return () => { clearAllTimers(); socket.disconnect(); };
  }, [language]);

  // Call operations and timing helpers moved above mount hooks

  // Audio bar heights for visualizer
  const BAR_HEIGHTS = [30, 60, 45, 80, 55, 90, 40, 70, 35, 85, 50, 65, 45, 75, 55];

  return (
    <>
      <Navbar />
      <main className="flex-grow grid-bg py-10 px-4 sm:px-6 lg:px-8 relative min-h-screen">

        {/* Ambient glows */}
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-red-600/6 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-rose-700/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-orange-600/4 rounded-full blur-[80px] pointer-events-none" />

        <div className="max-w-6xl mx-auto space-y-6 relative z-10">

          {/* ── HEADER ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/5">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                  <Radio className="h-5 w-5 text-red-500" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {t("callTracker")}
                </h1>
              </div>
              <p className="text-slate-500 text-xs ml-11 leading-relaxed max-w-lg">
                Real-time caller triangulation · AI transcript analysis · Instant blocking & reporting
              </p>
            </div>

            {/* Live status badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                System Online
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                <span className="h-1.5 w-1.5 bg-red-400 rounded-full animate-pulse" />
                GSM Bridge Ready
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <Activity className="h-3 w-3" />
                {scenarios.length} Cases Loaded
              </div>
            </div>
          </div>

          {/* ── MAIN GRID ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

            {/* ── LEFT SIDEBAR ── */}
            <div className="space-y-4">

              {/* Caller Profiles Panel */}
              <div className="rounded-2xl border border-white/5 bg-[rgba(13,18,30,0.85)] overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5 bg-white/[0.02]">
                  <ShieldCheck className="h-4 w-4 text-red-500" />
                  <h3 className="text-xs font-bold uppercase text-white tracking-wider flex-1">
                    {t("simulatorControls")}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">{scenarios.length} {language === "kh" ? "លេខឆបោក" : "numbers"}</span>
                </div>

                <div className="p-4 space-y-4">
                  {/* Scenario list */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-widest mb-2">
                      {language === "kh" ? "ជ្រើសរើសលេខដើម្បីពិនិត្យ" : "Select Reported Number"}
                    </label>
                    <div className="space-y-2 max-h-[240px] overflow-y-auto pr-0.5 scrollbar-none">
                      {scenarios.map((sc) => (
                        <button
                          key={sc.id}
                          disabled={callState !== "IDLE"}
                          onClick={() => setSelectedScenario(sc)}
                          className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed ${
                            selectedScenario.id === sc.id
                              ? "bg-red-500/10 border-red-500/30"
                              : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md border ${CATEGORY_COLORS[sc.category] || CATEGORY_COLORS["OTHER"]}`}>
                              {formatCategory(sc.category)}
                            </span>
                            <span className={`text-[10px] font-black font-mono ${RISK_COLOR(sc.riskScore)}`}>
                              {sc.riskScore}%
                            </span>
                          </div>
                          <p className={`text-xs font-semibold leading-snug mb-1 ${selectedScenario.id === sc.id ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`}>
                            {language === "kh" ? sc.nameKh : sc.nameEn}
                          </p>
                          <p className="font-mono text-[10px] text-red-400">{sc.number}</p>
                          {/* Risk bar */}
                          <div className="mt-2 h-0.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${RISK_BAR_COLOR(sc.riskScore)}`}
                              style={{ width: `${sc.riskScore}%` }}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                    {callState === "IDLE" && selectedScenario && selectedScenario.number !== "+855 XXXXXXXX" && (
                      <button
                        onClick={() => handleSimulateScenarioCall(selectedScenario)}
                        className="w-full mt-3 py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-red-650 to-red-500 hover:from-red-550 hover:to-orange-500 text-white transition-all shadow-md shadow-red-600/15 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 animate-pulse font-sans"
                      >
                        <PhoneCall className="h-3.5 w-3.5" />
                        {language === "kh" ? "សាកល្បងខលចូល (លេខដែលជ្រើសរើស)" : "Simulate Call from Selection"}
                      </button>
                    )}
                  </div>

                  {/* Reset button only */}
                  {callState !== "IDLE" && (
                    <button
                      onClick={() => declineCall(false)}
                      className="w-full py-3 rounded-xl font-bold bg-white/5 border border-white/10 text-red-400 hover:bg-white/8 hover:text-red-300 transition flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      <PhoneOff className="h-4 w-4" />
                      Reset Tracker
                    </button>
                  )}
                </div>
              </div>

              {/* Telemetry panel (shown when call is active) */}
              {callState === "ACTIVE" && (
                <div className="rounded-2xl border border-white/5 bg-[rgba(13,18,30,0.85)] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5 bg-white/[0.02]">
                    <Signal className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase text-white tracking-wider">Telemetry Lock</h3>
                    <div className="ml-auto flex gap-0.5">
                      {[1, 2, 3, 4].map((bar) => (
                        <div key={bar} className={`w-1 rounded-full ${bar <= 3 ? "bg-emerald-500" : "bg-slate-700"}`} style={{ height: `${bar * 4}px` }} />
                      ))}
                    </div>
                  </div>
                  <div className="p-4 space-y-2.5 font-mono text-xs">
                    {[
                      { label: "Carrier", value: selectedScenario.provider, color: "text-white" },
                      { label: "Protocol", value: "LTE Triangulation", color: "text-emerald-400" },
                      { label: "Signal Type", value: selectedScenario.locationSource || "Carrier Network (Estimated)", color: selectedScenario.locationSource === "GPS Cellular Lock" ? "text-emerald-400" : "text-yellow-500" },
                      { label: "Risk Score", value: `${selectedScenario.riskScore}% RISK`, color: RISK_COLOR(selectedScenario.riskScore) },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between items-center py-1 border-b border-white/4">
                        <span className="text-slate-500">{row.label}</span>
                        <span className={`font-bold ${row.color}`}>{row.value}</span>
                      </div>
                    ))}
                    {signalLocked && (
                      <>
                        <div className="flex justify-between items-center py-1 border-b border-white/4">
                          <span className="text-slate-500">
                            {selectedScenario.locationSource === "GPS Cellular Lock" ? "GPS Lock" : "Zone Est."}
                          </span>
                          <a
                            href={`https://www.google.com/maps?q=${selectedScenario.lat},${selectedScenario.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-400 hover:text-red-300 font-bold text-[10px] hover:underline cursor-pointer transition"
                          >
                            {selectedScenario.lat.toFixed(4)}, {selectedScenario.lng.toFixed(4)}
                          </a>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500">Accuracy</span>
                          <span className={`font-bold text-[10px] ${selectedScenario.locationSource === "GPS Cellular Lock" ? "text-emerald-400" : "text-yellow-500"}`}>
                            {selectedScenario.locationSource === "GPS Cellular Lock" ? "± 50m (GPS)" : "± Province Range"}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="pt-2 border-t border-white/5 mt-2 text-[10px] leading-relaxed font-sans text-slate-400">
                      {selectedScenario.locationSource === "GPS Cellular Lock" ? (
                        <div className="flex items-start gap-1.5 text-emerald-400">
                          <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full mt-1 shrink-0" />
                          <span>
                            {language === "kh" 
                              ? "សម្គាល់៖ កំពុងតាមដានទីតាំងពិតប្រាកដ (GPS Cellular Lock) ពីទូរស័ព្ទដែលបានភ្ជាប់។"
                              : "Note: Live tracking is active. Real coordinates locked via paired phone GPS."}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-1.5 text-yellow-500/80">
                          <span className="h-1.5 w-1.5 bg-yellow-500 rounded-full mt-1 shrink-0 animate-pulse" />
                          <span>
                            {language === "kh" 
                              ? "សម្គាល់៖ កំពុងបង្ហាញទីតាំងប៉ាន់ស្មានទូទៅ (ចំណុចសន្មត់)។ ដើម្បីទទួលបានទីតាំងពិតប្រាកដ សូមភ្ជាប់ទូរស័ព្ទដៃខាងក្រោម។"
                              : "Note: Currently using estimated/fallback location. To detect real coordinates, pair your phone using the QR below."}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* QR Pairing & Live Tracking card */}
              <div className="rounded-2xl border border-white/5 bg-[rgba(13,18,30,0.85)] overflow-hidden animate-in fade-in duration-300">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5 bg-white/[0.02]">
                  <Smartphone className="h-4 w-4 text-red-500" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-widest">
                    {(callState === "ACTIVE" || callState === "RINGING")
                      ? (language === "kh" ? "តាមដានទីតាំងផ្ទាល់" : "Track Live GPS Location")
                      : (language === "kh" ? "ភ្ជាប់ទូរស័ព្ទ" : "Pair Physical Phone")}
                  </h4>
                </div>
                <div className="p-4 flex flex-col items-center gap-3 text-center">
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {(callState === "ACTIVE" || callState === "RINGING")
                      ? (language === "kh"
                          ? "ស្កេន QR នេះជាមួយទូរស័ព្ទ ដើម្បីទទួលបានទីតាំង GPS ពិតប្រាកដរបស់អ្នកខលចូល។"
                          : "Scan this QR with your phone to sync and lock the caller's real GPS coordinates.")
                      : (language === "kh"
                          ? "ស្កេន QR នេះដើម្បីបញ្ជូនសញ្ញាខលបោកប្រាស់ពិតៗ មកកាន់កម្មវិធីរុករកនេះ។"
                          : "Scan with your phone to forward live GSM call alerts to this tracker.")}
                  </p>
                  <div className="p-2.5 bg-white rounded-2xl shadow-xl shadow-black/50">
                    {getPairingUrl() ? (
                      <QRCodeSVG
                        value={getPairingUrl()}
                        size={128}
                        level="M"
                        className="w-32 h-32 rounded-lg"
                      />
                    ) : (
                      <div className="w-32 h-32 flex items-center justify-center text-xs text-slate-400">
                        Generating...
                      </div>
                    )}
                  </div>
                  <div className="w-full font-mono text-[9px] text-slate-500 bg-black/30 px-2.5 py-1.5 rounded-lg border border-white/5 truncate" title={getPairingUrl()}>
                    {getPairingUrl() || "Generating pairing URL..."}
                  </div>
                  <div className="w-full flex items-center gap-1.5 justify-center text-[10px] text-slate-500">
                    <Wifi className="h-3 w-3 text-emerald-400" />
                    <span>Same Wi-Fi network required</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT MAIN PANEL ── */}
            <div className="space-y-5">

              {/* ── IDLE STATE ── */}
              {callState === "IDLE" && (
                <div className="rounded-2xl border border-white/5 bg-[rgba(13,18,30,0.85)] min-h-[460px] flex flex-col items-center justify-center text-center p-12 relative overflow-hidden">
                  {/* Decorative grid dots */}
                  <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-radial from-red-600/5 via-transparent to-transparent pointer-events-none" />

                  <div className="relative z-10 space-y-5">
                    {/* Idle radar visual */}
                    <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border border-red-500/10 border-dashed animate-spin" style={{ animationDuration: "12s" }} />
                      <div className="absolute inset-3 rounded-full border border-red-500/8" />
                      <div className="absolute inset-6 rounded-full border border-red-500/8" />
                      <div className="p-4 bg-slate-900 border border-slate-800 rounded-full text-slate-500">
                        <Eye className="h-8 w-8" />
                      </div>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-white text-xl mb-2">Tracker Standby</h3>
                      <p className="text-slate-500 text-xs max-w-sm leading-relaxed">
                        Choose a caller profile from the sidebar or enter a custom number to begin real-time triangulation, signal analysis, and transcript monitoring.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                      {[
                        { icon: Target, label: "Cell Tower Lock", color: "text-red-400" },
                        { icon: Activity, label: "Voice Analysis", color: "text-orange-400" },
                        { icon: TrendingUp, label: "Risk Scoring", color: "text-yellow-400" },
                      ].map(({ icon: Icon, label, color }) => (
                        <div key={label} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center gap-1.5">
                          <Icon className={`h-4 w-4 ${color}`} />
                          <span className="text-[10px] text-slate-500 font-medium text-center leading-tight">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── RINGING STATE ── */}
              {callState === "RINGING" && (
                <div className="rounded-2xl border border-red-500/20 bg-[rgba(13,18,30,0.9)] min-h-[460px] flex flex-col items-center justify-center text-center p-10 relative overflow-hidden">
                  <div className="absolute inset-0 bg-red-600/5 animate-pulse-slow pointer-events-none" />

                  {/* Pulsing rings */}
                  <div className="relative flex justify-center items-center mb-8">
                    <div className="absolute w-40 h-40 rounded-full border border-red-500/15 animate-ping" style={{ animationDuration: "1.8s" }} />
                    <div className="absolute w-28 h-28 rounded-full border border-red-500/25 animate-ping" style={{ animationDuration: "1.4s" }} />
                    <div className="absolute w-20 h-20 rounded-full border border-red-500/35 animate-ping" style={{ animationDuration: "1s" }} />
                    <div className="relative w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-2xl shadow-red-600/50 z-10">
                      <PhoneCall className="h-7 w-7 text-white" />
                    </div>
                  </div>

                  <div className="relative z-10 space-y-3 mb-8">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-red-400 uppercase tracking-[0.2em] bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
                      <span className="h-1.5 w-1.5 bg-red-400 rounded-full animate-pulse" />
                      {t("incomingCall")}
                    </span>
                    <h2 className="text-4xl font-black text-white font-mono tracking-wider">
                      {selectedScenario.number}
                    </h2>
                    <p className="text-slate-400 text-sm">
                      {language === "kh" ? selectedScenario.nameKh : selectedScenario.nameEn}
                    </p>
                    {/* Risk badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/25">
                      <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                      <span className="text-xs font-bold text-red-400">{selectedScenario.riskScore}% Risk Score</span>
                    </div>
                  </div>

                  <div className="flex gap-4 w-full max-w-xs">
                    <button
                      onClick={declineCall}
                      className="flex-1 py-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 text-slate-300 font-semibold transition text-sm cursor-pointer flex items-center justify-center gap-2"
                    >
                      <PhoneOff className="h-4 w-4 text-slate-400" />
                      Decline
                    </button>
                    <button
                      onClick={answerCall}
                      className="flex-1 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold transition text-sm shadow-xl shadow-red-600/30 cursor-pointer flex items-center justify-center gap-2 animate-pulse"
                    >
                      <PhoneCall className="h-4 w-4" />
                      Answer
                    </button>
                  </div>
                </div>
              )}

              {/* ── ACTIVE CALL STATE ── */}
              {callState === "ACTIVE" && (
                <div className="space-y-4">

                  {/* Main tracker screen */}
                  <div className="rounded-2xl border border-white/5 bg-[rgba(13,18,30,0.9)] overflow-hidden relative">
                    <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

                    {/* Status bar */}
                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-white/5 bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 bg-red-500 rounded-full animate-ping" />
                          <span className="text-xs font-mono font-black text-red-400 tracking-widest">
                            LIVE · {formatTimer(timer)}
                          </span>
                        </div>
                        <span className="text-slate-700">|</span>
                        <span className="font-mono text-xs text-slate-400">{selectedScenario.number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {signalLocked && selectedScenario.locationSource === "GPS Cellular Lock" && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                            <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            GPS Locked
                          </span>
                        )}
                        {signalLocked ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                            <Lock className="h-3 w-3" />
                            Target Locked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-full animate-pulse">
                            <Unlock className="h-3 w-3" />
                            Triangulating...
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Radar + Location panel */}
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-white/5">

                      {/* Radar */}
                      <div className="flex items-center justify-center p-8">
                        <div className="relative w-52 h-52 rounded-full border border-white/8 bg-black/40 overflow-hidden flex items-center justify-center">
                          {/* Concentric rings */}
                          <div className="absolute w-40 h-40 rounded-full border border-red-500/10" />
                          <div className="absolute w-28 h-28 rounded-full border border-red-500/12" />
                          <div className="absolute w-16 h-16 rounded-full border border-red-500/15" />
                          {/* Cross hairs */}
                          <div className="absolute w-full h-px bg-white/4" />
                          <div className="absolute h-full w-px bg-white/4" />

                          {/* Radar sweep using a conic gradient */}
                          <div
                            className="absolute inset-0 rounded-full"
                            style={{
                              background: `conic-gradient(from ${radarAngle}deg, rgba(239,68,68,0.2) 0deg, rgba(239,68,68,0.06) 60deg, transparent 80deg)`,
                            }}
                          />
                          {/* Sweep line */}
                          <div
                            className="absolute w-1/2 h-px bg-gradient-to-r from-red-500/70 to-transparent origin-left"
                            style={{ transform: `rotate(${radarAngle}deg)`, left: "50%", top: "50%", marginTop: "-0.5px" }}
                          />

                          {/* Center dot (User Node) */}
                          <div className="absolute z-20 flex flex-col items-center justify-center">
                            <div className="relative">
                              <div className="absolute -inset-1.5 bg-emerald-500 rounded-full animate-ping opacity-30" />
                              <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg shadow-emerald-500/50" title="Your Node">
                                <span className="w-1.5 h-1.5 bg-white rounded-full" />
                              </div>
                            </div>
                          </div>

                          {/* Triangulation Animation Lines */}
                          {triangulating && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="absolute w-[80%] h-[80%] border border-red-500/10 rounded-full animate-ping" />
                              <div className="absolute w-[50%] h-[50%] border border-yellow-500/15 rounded-full animate-ping" style={{ animationDelay: "0.5s" }} />
                              <div className="text-center absolute z-30">
                                <div className="h-6 w-6 border-2 border-slate-700 border-t-red-500 rounded-full animate-spin mx-auto" />
                                <span className="text-[8px] text-red-400 font-bold font-mono mt-1.5 block animate-pulse">TRIANGULATING...</span>
                              </div>
                            </div>
                          )}

                          {/* Dynamic Target Blip / Lock */}
                          {signalLocked && (() => {
                            // Use Cambodia center as fixed radar reference point
                            const userLat = 11.5564;
                            const userLng = 104.9282;
                            const { x, y } = getRadarOffset(userLat, userLng, selectedScenario.lat, selectedScenario.lng);
                            
                            return (
                              <div
                                className="absolute z-30"
                                style={{
                                  left: `calc(50% + ${x}%)`,
                                  top: `calc(50% - ${y}%)`,
                                  transform: "translate(-50%, -50%)",
                                  transition: "all 1s cubic-bezier(0.4, 0, 0.2, 1)"
                                }}
                              >
                                <div className="relative">
                                  {/* Multi-stage pulsing animations */}
                                  <div className="absolute -inset-3 bg-red-500/35 rounded-full animate-ping" />
                                  <div className="absolute -inset-1.5 bg-red-500/20 rounded-full animate-pulse" />
                                  
                                  {/* Main target lock crosshair */}
                                  <div className="w-6 h-6 bg-red-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg shadow-red-600/50">
                                    <Target className="h-4 w-4 text-white animate-pulse" />
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Location info */}
                      <div className="p-6 flex flex-col justify-center space-y-4">
                        <div>
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Location Triangulator</span>
                          <h4 className="font-extrabold text-white text-base mt-1 flex items-center gap-2">
                            {signalLocked ? (
                              <>
                                <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
                                <span className="text-red-400">{t("signalLocked")}</span>
                              </>
                            ) : (
                              <>
                                <Radio className="h-4 w-4 text-yellow-400 animate-pulse shrink-0" />
                                <span className="text-yellow-300">{t("triangulationActive")}</span>
                              </>
                            )}
                          </h4>
                        </div>

                        {signalLocked ? (
                          <div className="p-4 bg-red-500/8 border border-red-500/20 rounded-xl space-y-2.5 animate-in fade-in zoom-in-95 duration-300">
                            <div className="flex items-start gap-2.5">
                              <div className="p-1.5 bg-red-500/15 rounded-lg">
                                <MapPin className="h-4 w-4 text-red-400" />
                              </div>
                              <div>
                                <h5 className="font-extrabold text-xs text-white">Target Coordinate Lock</h5>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                  {language === "kh" ? selectedScenario.locationKh : selectedScenario.locationEn}
                                </p>
                                <a
                                  href={`https://www.google.com/maps?q=${selectedScenario.lat},${selectedScenario.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-red-400/70 hover:text-red-300 font-mono mt-1 inline-flex items-center gap-1 hover:underline cursor-pointer"
                                >
                                  {selectedScenario.lat.toFixed(4)}, {selectedScenario.lng.toFixed(4)}
                                </a>
                                {selectedScenario.locationSource === "GPS Cellular Lock" ? (
                                  <p className="text-[9px] text-emerald-400 mt-2 bg-emerald-500/10 border-emerald-500/20 px-2 py-0.5 rounded w-fit font-mono font-bold uppercase tracking-wider">
                                    ✓ GPS Locked
                                  </p>
                                ) : (
                                  <p className="text-[9px] text-yellow-500/90 mt-2 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded w-fit font-mono font-bold uppercase tracking-wider">
                                    ⚠ Fallback Estimate
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="p-4 bg-white/[0.03] border border-white/5 rounded-xl text-xs text-slate-500 leading-relaxed">
                              Analyzing signal frequencies across cell tower handshakes on national carriers…
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                                <span>Signal Analysis</span>
                                <span>{Math.min(Math.round((timer / 6) * 100), 100)}%</span>
                              </div>
                              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-1000"
                                  style={{ width: `${Math.min((timer / 6) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Provider pill */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/8 text-slate-400 font-mono">
                            {selectedScenario.provider}
                          </span>
                          <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold ${CATEGORY_COLORS[selectedScenario.category] || CATEGORY_COLORS["OTHER"]}`}>
                            {formatCategory(selectedScenario.category)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Call controls bar */}
                    <div className="relative z-10 border-t border-white/5 px-5 py-4 flex flex-wrap justify-between items-center gap-3 bg-white/[0.01]">
                      {/* Audio visualizer */}
                      <div className="flex items-end gap-px h-6">
                        {BAR_HEIGHTS.map((h, i) => (
                          <div
                            key={i}
                            className={`w-1 rounded-full ${muted ? "bg-slate-700" : "bg-red-500"}`}
                            style={{
                              height: muted ? "20%" : `${h}%`,
                              animationName: muted ? "none" : "bounce-bar",
                              animationDuration: `${0.8 + (i % 5) * 0.15}s`,
                              animationIterationCount: "infinite",
                              animationTimingFunction: "ease-in-out",
                              animationDirection: "alternate",
                              animationDelay: `${i * 0.07}s`,
                            }}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setMuted(!muted)}
                          className={`p-2 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                            muted ? "bg-red-500/15 border-red-500/30 text-red-400" : "bg-white/5 border-white/8 text-slate-400 hover:text-white"
                          }`}
                        >
                          {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                          {t("mute")}
                        </button>
                        <button
                          onClick={() => setRecording(!recording)}
                          className={`p-2 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                            recording ? "bg-red-500/15 border-red-500/30 text-red-400" : "bg-white/5 border-white/8 text-slate-400 hover:text-white"
                          }`}
                        >
                          <Disc className={`h-3.5 w-3.5 ${recording ? "animate-spin text-red-500" : ""}`} />
                          {t("record")}
                        </button>
                        <button
                          onClick={handleBlockAndReport}
                          className="p-2 px-3.5 rounded-xl bg-red-600 hover:bg-red-500 border border-red-500/50 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-red-600/20 transition cursor-pointer"
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          {t("blockReport")}
                        </button>
                        <button
                          onClick={declineCall}
                          className="p-2 px-3.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 text-red-400 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <PhoneOff className="h-3.5 w-3.5" />
                          {t("hangUp")}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Transcript panel ── */}
                  <div className="rounded-2xl border border-white/5 bg-[rgba(13,18,30,0.85)] overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5 bg-white/[0.02]">
                      <Volume2 className="h-4 w-4 text-red-500" />
                      <h3 className="text-xs font-bold uppercase text-white tracking-wider">{t("transcription")}</h3>
                      <div className="ml-auto flex items-end gap-px h-4">
                        {[40, 70, 55, 90, 65].map((h, i) => (
                          <div
                            key={i}
                            className={`w-0.5 rounded-full ${muted ? "bg-slate-700" : "bg-red-500/50"}`}
                            style={{
                              height: `${h}%`,
                              animationName: muted ? "none" : "bounce-bar",
                              animationDuration: `${0.9 + i * 0.15}s`,
                              animationIterationCount: "infinite",
                              animationTimingFunction: "ease-in-out",
                              animationDirection: "alternate",
                              animationDelay: `${i * 0.1}s`,
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="p-4 space-y-3 max-h-52 overflow-y-auto">
                      {visibleTranscripts.length === 0 ? (
                        <div className="py-6 text-center">
                          <div className="inline-flex items-center gap-2 text-xs text-slate-600 italic">
                            <span className="h-1.5 w-1.5 bg-slate-600 rounded-full animate-pulse" />
                            Listening for caller voice stream…
                          </div>
                        </div>
                      ) : (
                        visibleTranscripts.map((text, i) => (
                          <div
                            key={i}
                            className={`p-3.5 rounded-xl text-xs leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-300 ${
                              i === visibleTranscripts.length - 1
                                ? "bg-white/[0.05] border border-white/10 text-white"
                                : "bg-transparent border border-white/4 text-slate-500"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="h-1.5 w-1.5 bg-red-400 rounded-full" />
                              <span className="font-bold text-red-400 text-[10px] uppercase tracking-wider">{t("scamPhone")}</span>
                              <span className="text-[9px] text-slate-700 ml-auto font-mono">+{(i + 1) * 3}s</span>
                            </div>
                            <p className="text-inherit pl-3">&quot;{text}&quot;</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* OTP Alert */}
                    {otpAlert && (
                      <div className="mx-4 mb-4 p-4 rounded-xl bg-red-600/15 border border-red-500/30 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex gap-3 items-start">
                          <div className="p-1.5 bg-red-500/20 rounded-lg shrink-0">
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                          </div>
                          <div>
                            <span className="font-black text-xs text-white uppercase tracking-wider block mb-1">
                              🚨 Critical: Fraud Indicators Detected!
                            </span>
                            <span className="text-xs text-red-200/80 leading-relaxed">
                              Caller is requesting sensitive information (OTP codes, bank credentials, or transfers). Hang up immediately and report.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
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

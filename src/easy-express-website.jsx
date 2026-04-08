import React, { useState, useEffect, useRef, useCallback } from "react";
import { registerUser, loginWithEmail, loginWithUsername, executeCloudScript, saveFullGameOwnership, checkFullGameOwnership } from './playfab';
import { sendOTPEmail } from './email';
import emailjs from '@emailjs/browser';
import { fetchTitleData } from './playfab';
  
/* ═══════════════════════════════════════════
   ERROR BOUNDARY
   ═══════════════════════════════════════════ */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("Easy Express render error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: "#0a0c10", color: "#ff3d71", minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "monospace", padding: 40, textAlign: "center" }}>
          <div>
            <h1 style={{ fontSize: 24, marginBottom: 16, color: "#00e5ff" }}>Easy Express - Render Error</h1>
            <pre style={{ background: "#12151c", padding: 20, borderRadius: 12, textAlign: "left", maxWidth: 600, overflow: "auto", fontSize: 13, lineHeight: 1.6, border: "1px solid #1e2333" }}>
              {String(this.state.error)}
            </pre>
            <p style={{ marginTop: 16, color: "#7a8399", fontSize: 13 }}>Press F12 and check Console tab for the full stack trace.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */
const A = "#00e5ff";
const A2 = "#ff3d71";
const BG = "#0a0c10";
const CARD = "#12151c";
const CARD2 = "#181c26";
const T = "#e0e6f0";
const TD = "#7a8399";
const BD = "#1e2333";
const OK = "#00e676";
const WN = "#ff9f1c";
const PU = "#7c4dff";
const F1 = "'Chakra Petch', sans-serif";
const F2 = "'Orbitron', sans-serif";

const PLAYFAB_TITLE_ID = "164227";
const TEAM = [
  { name: "Rafael Lawrence P. Garcia", role: "Lead Developer", av: "RM" },
  { name: "Darnell Zeth S. Rodrigues", role: "Game Designer", av: "JD" },
  { name: "Joshua D. Rodil", role: "UI/UX & Web", av: "KC" },
  { name: "Russel Ongonion", role: "QA & Research", av: "AL" },
];
const FEATURES = [
  { icon: "🔧", title: "Build PCs From Scratch", desc: "Learn real hardware assembly — CPUs, GPUs, RAM, PSUs, and more. Every slot, every cable, every thermal paste application matters.", tag: "LEARN" },
  { icon: "💰", title: "Run Your Own Shop", desc: "Manage budgets, stock inventory, price components, and serve walk-in customers. Balance profit margins with customer satisfaction.", tag: "MANAGE" },
  { icon: "🔍", title: "Diagnose & Troubleshoot", desc: "Face real-world PC issues — Blue Screens, boot failures, overheating, and misplaced components. Find the fault. Fix the machine.", tag: "FIX" },
  { icon: "🏪", title: "Realistic Retail Sim", desc: "Inspired by iconic Philippine PC shops like EasyPC and PC Express. Interact with NPCs, fulfill service jobs, and grow your store.", tag: "SIMULATE" },
];
const SCENARIOS = [
  { title: "Blue Screen of Death", desc: "Diagnose driver conflicts, faulty RAM, or corrupt system files causing the dreaded BSOD.", color: "#3d7aff" },
  { title: "No Boot — Misplaced RAM", desc: "A customer's PC won't POST. Find the unseated DIMM, reseat it, and bring the system back to life.", color: WN },
  { title: "Overheating & Shutdowns", desc: "Thermal paste dried up? Fan cable unplugged? Investigate thermals before the CPU throttles to death.", color: A2 },
  { title: "Dead PSU Swap", desc: "No power at all. Test, remove, and replace the power supply unit — and manage the cable mess.", color: PU },
];
const NEWS = [
  { id: 1, type: "UPDATE", date: "Mar 20, 2026", title: "Open Beta v0.9.2 Released", desc: "New GPU installation mechanics, improved NPC dialogue system, and 3 new customer scenarios added.", color: OK },
  { id: 2, type: "EVENT", date: "Mar 15, 2026", title: "Thesis Defense Countdown", desc: "Easy Express will be presented at the CS Department thesis defense panel. Wish us luck!", color: WN },
  { id: 3, type: "PATCH", date: "Mar 10, 2026", title: "Hotfix: RAM Slot Detection", desc: "Fixed an issue where DDR4 sticks were accepted in DDR5 slots. Compatibility checks are now accurate.", color: A },
  { id: 4, type: "NEW", date: "Mar 5, 2026", title: "Website Launch", desc: "The official Easy Express portal is now live! Create your account, download the game, and start building.", color: A2 },
];
const SPECS = {
  minimum: { os: "Windows 10 (64-bit)", cpu: "Intel Core i5-4460 / AMD FX-6300", ram: "8 GB RAM", gpu: "NVIDIA GTX 760 / AMD R7 260X", storage: "2 GB available space", dx: "DirectX 11" },
  recommended: { os: "Windows 10/11 (64-bit)", cpu: "Intel Core i7-8700 / AMD Ryzen 5 3600", ram: "16 GB RAM", gpu: "NVIDIA GTX 1060 / AMD RX 580", storage: "4 GB available space", dx: "DirectX 12" },
};
const FAQS = [
  { q: "Is Easy Express free to play?", a: "Yes! Easy Express is completely free. It's a thesis project built by Team 4R and is available for direct download — no Steam required." },
  { q: "Do I need an account to play?", a: "Yes, you'll need to create an account and verify your email before playing. This lets us save your progress and sync your shop data." },
  { q: "What happens after I sign up on the website?", a: "After verifying your email with the OTP code, download the game and log in with the same username and password." },
  { q: "I didn't receive my OTP email.", a: "Check your spam/junk folder. The email comes from easyexpress.4r@gmail.com. You can also click Resend Code on the verification screen." },
  { q: "Can I play on Mac or Linux?", a: "Currently, Easy Express is Windows-only (Windows 10/11). Mac and Linux support is not planned." },
  { q: "Is this affiliated with EasyPC or PC Express?", a: "No. Easy Express is an independent thesis project inspired by the Philippine PC retail scene. We are not affiliated with any real retailer." },
];

const GALLERY_ITEMS = [
  { type: "screenshot", title: "Shop Interior", desc: "Your fully customizable PC shop floor with workstations and customer counter.", src: "/gallery/Shopinterior.png" },
  { type: "screenshot", title: "PC Assembly", desc: "Hands-on component installation — CPU, RAM, GPU, all in first-person.", src: "/gallery/Diagnose.png" },
  { type: "video", title: "Gameplay Trailer", desc: "Watch a full walkthrough of the Easy Express beta experience.", src: "/gallery/Trailer.mp4" },
];

/* ═══════════════════════════════════════════
   PLAYFAB HELPERS
   ═══════════════════════════════════════════ */
const PLAYFAB_BASE = `https://${PLAYFAB_TITLE_ID}.playfabapi.com`;

async function pfAdmin(endpoint, body, secretKey) {
  const res = await fetch(`${PLAYFAB_BASE}/Admin/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.errorMessage || "PlayFab Admin error");
  return json.data;
}

async function pfServer(endpoint, body, secretKey) {
  const res = await fetch(`${PLAYFAB_BASE}/Server/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.errorMessage || "PlayFab Server error");
  return json.data;
}

/* ═══════════════════════════════════════════
   DOWNLOAD TRACKER
   ═══════════════════════════════════════════ */
async function trackDownload() {
  console.log("[EasyExpress] Download initiated at", new Date().toISOString());
  try {
    const loginRes = await fetch(`${PLAYFAB_BASE}/Client/LoginWithCustomID`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ TitleId: PLAYFAB_TITLE_ID, CustomId: localStorage.getItem("ee_guest_id") || "DL_Tracker_Fallback", CreateAccount: true })
    });
    const loginJson = await loginRes.json();
    if (loginJson.code === 200) {
      const ticket = loginJson.data.SessionTicket;
      await fetch(`${PLAYFAB_BASE}/Client/WritePlayerEvent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Authorization": ticket },
        body: JSON.stringify({ EventName: "game_downloaded", Body: { source: "website", timestamp: Date.now() } })
      });
      await fetch(`${PLAYFAB_BASE}/Client/ExecuteCloudScript`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Authorization": ticket },
        body: JSON.stringify({ FunctionName: "incrementDownloadCount", FunctionParameter: {}, GeneratePlayStreamEvent: true })
      }).catch(() => {});
    }
  } catch (e) {
    console.warn("[EasyExpress] Download tracking failed (non-blocking):", e);
  }
}

/* ═══════════════════════════════════════════
   TOAST SYSTEM
   ═══════════════════════════════════════════ */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const addToast = useCallback((t) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { ...t, id }]);
  }, []);
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);
  return { toasts, addToast, removeToast };
}

function ToastContainer({ toasts, removeToast }) {
  return (
    <div style={{ position: "fixed", top: 80, right: 20, zIndex: 300, display: "flex", flexDirection: "column", gap: 12, pointerEvents: "none", maxWidth: 400 }}>
      {toasts.map((t) => (
        <SingleToast key={t.id} toast={t} onDone={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function SingleToast({ toast, onDone }) {
  const [vis, setVis] = useState(false);
  const [out, setOut] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setVis(true));
    const timer = setTimeout(() => { setOut(true); setTimeout(onDone, 400); }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, []);
  const icons = { success: "✓", error: "✕", info: "ℹ", welcome: "👋" };
  const colors = { success: OK, error: A2, info: A, welcome: PU };
  const c = colors[toast.type] || A;
  return (
    <div style={{
      background: CARD, border: `1px solid ${c}40`, borderRadius: 14, padding: "16px 20px",
      pointerEvents: "auto", display: "flex", gap: 14, alignItems: "flex-start",
      boxShadow: `0 8px 32px ${BG}cc, 0 0 20px ${c}15`,
      transform: vis && !out ? "translateX(0)" : "translateX(120%)",
      opacity: vis && !out ? 1 : 0, transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
      overflow: "hidden", position: "relative",
    }}>
      <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, background: c, animation: `toastTimer ${(toast.duration || 4000) / 1000}s linear forwards` }} />
      <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${c}18`, border: `1px solid ${c}30`, display: "grid", placeItems: "center", color: c, fontSize: 16, fontWeight: 800, fontFamily: F2 }}>
        {icons[toast.type]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: F2, fontSize: 13, fontWeight: 700, color: T, marginBottom: 3 }}>{toast.title}</div>
        <div style={{ fontFamily: F1, fontSize: 12, color: TD, lineHeight: 1.5 }}>{toast.message}</div>
      </div>
      <button onClick={() => { setOut(true); setTimeout(onDone, 400); }} style={{ background: "none", border: "none", color: TD, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 4, flexShrink: 0 }}>
        {"✕"}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SCROLL ANIMATION HOOK
   ═══════════════════════════════════════════ */
function useScrollReveal(selector = ".ee-reveal") {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("ee-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(selector).forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [selector]);
}

/* ═══════════════════════════════════════════
   UI COMPONENTS
   ═══════════════════════════════════════════ */
function CircuitBG() {
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04, pointerEvents: "none" }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="circuit" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
          <path d="M0 60h40m10 0h20m10 0h40M60 0v40m0 10v20m0 10v40" stroke={A} strokeWidth="0.7" fill="none" />
          <circle cx="60" cy="60" r="3" fill={A} />
          <circle cx="40" cy="60" r="1.5" fill={A} />
          <circle cx="80" cy="60" r="1.5" fill={A} />
          <circle cx="60" cy="40" r="1.5" fill={A} />
          <circle cx="60" cy="80" r="1.5" fill={A} />
          <rect x="15" y="15" width="10" height="10" rx="1" stroke={A} strokeWidth="0.5" fill="none" />
          <rect x="95" y="95" width="10" height="10" rx="1" stroke={A} strokeWidth="0.5" fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#circuit)" />
    </svg>
  );
}

function GlowOrb({ color, size, top, left, delay = 0 }) {
  return (
    <div style={{ position: "absolute", top, left, width: size, height: size, borderRadius: "50%", background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`, filter: "blur(60px)", pointerEvents: "none", animation: `orbFloat 8s ease-in-out ${delay}s infinite alternate` }} />
  );
}

function PwStrength({ password }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = [
    { label: "WEAK", color: A2 },
    { label: "WEAK", color: A2 },
    { label: "FAIR", color: WN },
    { label: "GOOD", color: A },
    { label: "STRONG", color: OK },
    { label: "STRONG", color: OK },
  ];
  const s = levels[score];
  const level = Math.min(score, 4);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= level ? s.color : BD, transition: "background 0.3s" }} />
        ))}
      </div>
      <div style={{ fontFamily: F1, fontSize: 10, fontWeight: 700, color: s.color, letterSpacing: 1.5 }}>{s.label}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SERVER STATUS
   ═══════════════════════════════════════════ */
function ServerStatus() {
  const [status, setStatus] = useState("checking");
  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(`${PLAYFAB_BASE}/Client/LoginWithCustomID`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ TitleId: PLAYFAB_TITLE_ID, CustomId: "StatusCheck_Ping", CreateAccount: false })
        });
        const json = await res.json();
        if (!cancelled) setStatus(json.code === 200 || json.code === 400 || json.errorCode ? "online" : "offline");
      } catch {
        if (!cancelled) setStatus("offline");
      }
    }
    check();
    const interval = setInterval(check, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);
  const isOnline = status === "online";
  const dotColor = status === "checking" ? WN : isOnline ? OK : A2;
  const label = status === "checking" ? "Checking..." : isOnline ? "Online" : "Offline";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: `${dotColor}10`, border: `1px solid ${dotColor}25` }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%", background: dotColor,
        boxShadow: isOnline ? `0 0 6px ${OK}, 0 0 12px ${OK}40` : "none",
        animation: isOnline ? "serverPulse 2s ease-in-out infinite" : "none",
      }} />
      <span style={{ fontFamily: F1, fontSize: 10, fontWeight: 700, color: dotColor, letterSpacing: 1 }}>
        {label.toUpperCase()}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   NAV
   ═══════════════════════════════════════════ */
function Nav({ onAuth, activeSection, isAdmin, onAdminToggle, showAdmin, currentUser, onLogout }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
  const links = ["features", "scenarios", "gallery", "news", "leaderboards", "specs", "faq", "support", "about"];
  return (
    <nav className="ee-nav" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: scrolled ? `${BG}f0` : `${BG}cc`, backdropFilter: "blur(20px)", borderBottom: `1px solid ${scrolled ? BD : "transparent"}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 clamp(1rem,4vw,3rem)", height: 64, fontFamily: F1, transition: "all 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <a href="#hero" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: `linear-gradient(135deg,${A},${A2})`, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14, color: BG, fontFamily: F1 }}>EE</div>
          <span style={{ color: T, fontWeight: 700, fontSize: 16, letterSpacing: 1 }}>EASY EXPRESS</span>
        </a>
        <ServerStatus />
      </div>

      <div className="ee-nav-links" style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {links.map((l) => (
          <a key={l} href={`#${l}`} style={{ color: activeSection === l ? A : TD, textDecoration: "none", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, transition: "color 0.3s" }}>{l}</a>
        ))}
        {isAdmin && (
          <button onClick={onAdminToggle} style={{ color: showAdmin ? A2 : WN, background: showAdmin ? `${A2}15` : "transparent", border: `1px solid ${showAdmin ? A2 + "40" : WN + "40"}`, padding: "6px 14px", borderRadius: 6, fontFamily: F1, fontWeight: 700, fontSize: 11, cursor: "pointer", letterSpacing: 1.5, transition: "all 0.3s" }}>
            ⚙ ADMIN
          </button>
        )}
        <div style={{ width: 1, height: 20, background: BD, margin: "0 4px" }} />
        
        {currentUser ? (
          <button onClick={onLogout} className="ee-btn-outline" style={{ background: "transparent", border: `1px solid ${A2}40`, color: A2, padding: "7px 18px", borderRadius: 6, fontFamily: F1, fontWeight: 600, fontSize: 13, cursor: "pointer", letterSpacing: 1 }}>LOG OUT</button>
        ) : (
          <>
            <button onClick={() => onAuth("login")} className="ee-btn-outline" style={{ background: "transparent", border: `1px solid ${A}40`, color: A, padding: "7px 18px", borderRadius: 6, fontFamily: F1, fontWeight: 600, fontSize: 13, cursor: "pointer", letterSpacing: 1 }}>LOG IN</button>
            <button onClick={() => onAuth("signup")} className="ee-btn-glow" style={{ background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", color: BG, padding: "8px 20px", borderRadius: 6, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: 1 }}>SIGN UP</button>
          </>
        )}
      </div>

      <button className="ee-hamburger" onClick={() => setMobileOpen(!mobileOpen)} style={{ display: "none", background: "none", border: "none", color: T, fontSize: 24, cursor: "pointer", padding: 4 }}>
        {mobileOpen ? "✕" : "☰"}
      </button>

      {mobileOpen && (
        <div className="ee-mobile-menu" style={{ position: "absolute", top: 64, left: 0, right: 0, background: CARD, borderBottom: `1px solid ${BD}`, padding: "12px 20px", display: "flex", flexDirection: "column", gap: 4, zIndex: 99 }}>
          {links.map((l) => (
            <a key={l} href={`#${l}`} onClick={() => setMobileOpen(false)} style={{ color: TD, textDecoration: "none", fontSize: 13, fontWeight: 600, padding: "10px 0", borderBottom: `1px solid ${BD}`, textTransform: "uppercase", letterSpacing: 1.5 }}>{l}</a>
          ))}
          {isAdmin && (
            <button onClick={() => { onAdminToggle(); setMobileOpen(false); }} style={{ color: WN, background: "none", border: "none", fontFamily: F1, fontWeight: 700, fontSize: 13, padding: "10px 0", textAlign: "left", cursor: "pointer" }}>⚙ ADMIN PANEL</button>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {currentUser ? (
               <button onClick={() => { onLogout(); setMobileOpen(false); }} style={{ flex: 1, background: "transparent", border: `1px solid ${A2}40`, color: A2, padding: "10px", borderRadius: 6, fontFamily: F1, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>LOG OUT</button>
            ) : (
              <>
                <button onClick={() => { onAuth("login"); setMobileOpen(false); }} style={{ flex: 1, background: "transparent", border: `1px solid ${A}40`, color: A, padding: "10px", borderRadius: 6, fontFamily: F1, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>LOG IN</button>
                <button onClick={() => { onAuth("signup"); setMobileOpen(false); }} style={{ flex: 1, background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", color: BG, padding: "10px", borderRadius: 6, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>SIGN UP</button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

/* ═══════════════════════════════════════════
   SECTIONS
   ═══════════════════════════════════════════ */
function Hero({ onAuth, ownsGame, onBuyClick }) {
  const handleDownload = (isFull) => {
    trackDownload();
    const url = isFull
      ? "https://your-cdn.com/EasyExpress_Full_Setup.exe"
      : "https://your-cdn.com/EasyExpress_Demo_Setup.exe";
    window.open(url, "_blank");
  };

  return (
    <section id="hero" style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 1.5rem 80px", overflow: "hidden" }}>
      <CircuitBG />
      <GlowOrb color={A} size="500px" top="-10%" left="-10%" />
      <GlowOrb color={A2} size="400px" top="60%" left="70%" delay={3} />
      <GlowOrb color={PU} size="350px" top="20%" left="80%" delay={5} />
      <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 20, background: `${A}12`, border: `1px solid ${A}30`, color: A, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 28, fontFamily: F1, animation: "fadeSlideUp 0.8s ease-out" }}>
        {"🎮 A 4R THESIS PROJECT"}
      </div>
      <h1 style={{ fontFamily: F2, fontSize: "clamp(2.8rem,7vw,5.5rem)", fontWeight: 900, lineHeight: 1.05, background: `linear-gradient(135deg,${T} 0%,${A} 50%,${A2} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "0 0 24px", maxWidth: 900, animation: "fadeSlideUp 0.8s ease-out 0.15s both" }}>
        {"YOUR DREAM"}<br />{"TECH SHOP"}<br />{"STARTS HERE"}
      </h1>
      <p style={{ color: TD, fontSize: "clamp(1rem,2vw,1.25rem)", maxWidth: 620, lineHeight: 1.7, margin: "0 0 40px", fontFamily: F1, animation: "fadeSlideUp 0.8s ease-out 0.3s both" }}>
        {"Build PCs. Run a shop. Diagnose real hardware problems."}<br />
        <span style={{ color: T }}>Easy Express</span>{" is the PC shop simulator that teaches you everything from thermal paste to profit margins."}
      </p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", animation: "fadeSlideUp 0.8s ease-out 0.45s both" }}>
        {ownsGame ? (
          <button onClick={() => handleDownload(true)} className="ee-download-btn" style={{ background: `linear-gradient(135deg,${OK},${A})`, border: "none", color: BG, padding: "16px 36px", borderRadius: 10, fontFamily: F1, fontWeight: 800, fontSize: 16, cursor: "pointer", letterSpacing: 1, boxShadow: `0 0 40px ${OK}30`, display: "flex", alignItems: "center", gap: 10 }}>
            {"⬇ DOWNLOAD FULL VERSION"} <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 600 }}>Windows .exe</span>
          </button>
        ) : (
          <>
            <button onClick={() => handleDownload(false)} className="ee-download-btn" style={{ background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", color: BG, padding: "16px 36px", borderRadius: 10, fontFamily: F1, fontWeight: 800, fontSize: 16, cursor: "pointer", letterSpacing: 1, boxShadow: `0 0 40px ${A}30`, display: "flex", alignItems: "center", gap: 10 }}>
              {"⬇ DOWNLOAD DEMO"} <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 600 }}>Free • Windows</span>
            </button>
            <button onClick={onBuyClick} className="ee-btn-glow" style={{ background: `linear-gradient(135deg,${PU},${A2})`, border: "none", color: T, padding: "16px 32px", borderRadius: 10, fontFamily: F1, fontWeight: 800, fontSize: 15, cursor: "pointer", letterSpacing: 1, boxShadow: `0 0 32px ${PU}25`, display: "flex", alignItems: "center", gap: 8 }}>
              {"🛒 BUY FULL GAME"} <span style={{ fontSize: 13, fontWeight: 700, color: A }}>₱1</span>
            </button>
          </>
        )}
        <button onClick={() => onAuth("signup")} className="ee-btn-outline" style={{ background: CARD, border: `1px solid ${BD}`, color: T, padding: "16px 32px", borderRadius: 10, fontFamily: F1, fontWeight: 700, fontSize: 15, cursor: "pointer", letterSpacing: 1 }}>
          CREATE ACCOUNT
        </button>
      </div>
      {!ownsGame && (
        <div style={{ marginTop: 16, padding: "8px 18px", borderRadius: 20, background: `${PU}10`, border: `1px solid ${PU}25`, animation: "fadeSlideUp 0.8s ease-out 0.5s both" }}>
          <span style={{ fontFamily: F1, fontSize: 12, color: TD }}>Demo includes 2 scenarios. </span>
          <span style={{ fontFamily: F1, fontSize: 12, color: PU, fontWeight: 700 }}>Full game unlocks all 12+ scenarios, full shop management, and leaderboards.</span>
        </div>
      )}
      <div style={{ marginTop: 36, display: "flex", gap: 40, color: TD, fontFamily: F1, fontSize: 13, fontWeight: 600, animation: "fadeSlideUp 0.8s ease-out 0.6s both", flexWrap: "wrap", justifyContent: "center" }}>
        {["Windows 10/11", ownsGame ? "Full Version" : "Demo Free / Full ₱1", "One-Time Purchase"].map((t) => (
          <span key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: A, fontSize: 16 }}>{"✓"}</span> {t}
          </span>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 30, animation: "bounce 2s ease-in-out infinite", color: TD, fontSize: 24 }}>{"↓"}</div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" style={{ position: "relative", padding: "100px clamp(1rem,4vw,3rem)", maxWidth: 1200, margin: "0 auto" }}>
      <div className="ee-reveal" style={{ textAlign: "center", marginBottom: 64 }}>
        <span style={{ color: A, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>WHAT YOU WILL DO</span>
        <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 800, color: T, margin: "12px 0 16px" }}>Learn. Manage. Fix. Repeat.</h2>
        <p style={{ color: TD, maxWidth: 560, margin: "0 auto", lineHeight: 1.7, fontFamily: F1, fontSize: 15 }}>Easy Express is a hands-on crash course in PC hardware, retail operations, and technical problem-solving.</p>
      </div>
      <div className="ee-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
        {FEATURES.map((f, i) => (
          <div key={i} className="ee-reveal ee-stagger ee-card-hover" style={{ "--stagger": i, background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: "32px 28px", cursor: "default", position: "relative", overflow: "hidden" }}>
            <span style={{ position: "absolute", top: 16, right: 16, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: A, fontFamily: F1, background: `${A}12`, padding: "3px 10px", borderRadius: 4 }}>{f.tag}</span>
            <div style={{ fontSize: 36, marginBottom: 16 }}>{f.icon}</div>
            <h3 style={{ fontFamily: F2, fontSize: 17, fontWeight: 700, color: T, margin: "0 0 10px" }}>{f.title}</h3>
            <p style={{ color: TD, fontSize: 14, lineHeight: 1.7, fontFamily: F1, margin: 0 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Scenarios() {
  return (
    <section id="scenarios" style={{ position: "relative", padding: "100px clamp(1rem,4vw,3rem)", background: `linear-gradient(180deg,transparent 0%,${CARD}40 50%,transparent 100%)` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="ee-reveal" style={{ textAlign: "center", marginBottom: 64 }}>
          <span style={{ color: A2, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>THE SIMULATION</span>
          <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 800, color: T, margin: "12px 0 16px" }}>Real Problems. Real Fixes.</h2>
          <p style={{ color: TD, maxWidth: 560, margin: "0 auto", lineHeight: 1.7, fontFamily: F1, fontSize: 15 }}>Every customer walks in with a unique hardware headache. Your job? Figure it out, hands-on.</p>
        </div>
        <div className="ee-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {SCENARIOS.map((s, i) => (
            <div key={i} className="ee-reveal ee-stagger ee-card-hover" style={{ "--stagger": i, background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: "28px 24px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${s.color},transparent)` }} />
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}15`, border: `1px solid ${s.color}30`, display: "grid", placeItems: "center", marginBottom: 16, fontSize: 18, color: s.color, fontFamily: F2, fontWeight: 800 }}>{String(i + 1).padStart(2, "0")}</div>
              <h3 style={{ fontFamily: F2, fontSize: 16, fontWeight: 700, color: T, margin: "0 0 8px" }}>{s.title}</h3>
              <p style={{ color: TD, fontSize: 13, lineHeight: 1.7, fontFamily: F1, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="ee-how-it-plays" style={{ marginTop: 48, background: CARD2, border: `1px solid ${BD}`, borderRadius: 16, padding: "36px 40px", display: "flex", flexWrap: "wrap", gap: 40, alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontFamily: F2, fontSize: 20, fontWeight: 700, color: T, margin: "0 0 8px" }}>How It Plays</h3>
            <p style={{ color: TD, fontSize: 14, lineHeight: 1.8, fontFamily: F1, margin: 0, maxWidth: 520 }}>Walk around your shop in first-person. Pick up boxes, unpack PCs onto workstations, open cases and swap out faulty components. Interact with NPCs on the street to attract new customers, then manage orders through your in-shop computer OS.</p>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[{ v: "50+", l: "Components" }, { v: "12+", l: "Scenarios" }, { v: "\u221E", l: "Replayability" }].map((s) => (
              <div key={s.l} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: F2, fontSize: 28, fontWeight: 900, color: A }}>{s.v}</div>
                <div style={{ fontFamily: F1, fontSize: 11, color: TD, fontWeight: 600, letterSpacing: 1, marginTop: 4 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function GallerySection() {
  const [playingVideo, setPlayingVideo] = useState(null);
  const modalVideoRef = useRef(null);
  const closeModal = () => setPlayingVideo(null);
  return (
    <section id="gallery" style={{ padding: "100px clamp(1rem,4vw,3rem)", maxWidth: 1200, margin: "0 auto" }}>
      <div className="ee-reveal" style={{ textAlign: "center", marginBottom: 64 }}>
        <span style={{ color: WN, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>MEDIA</span>
        <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, color: T, margin: "12px 0 16px" }}>Gallery</h2>
        <p style={{ color: TD, maxWidth: 520, margin: "0 auto", lineHeight: 1.7, fontFamily: F1, fontSize: 15 }}>Screenshots and footage from the Easy Express beta. See the shop, the builds, and the chaos.</p>
      </div>
      <div className="ee-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
        {GALLERY_ITEMS.map((item, i) => (
          <div key={i} className="ee-reveal ee-stagger ee-gallery-hover" style={{ "--stagger": i, background: CARD, border: `1px solid ${BD}`, borderRadius: 14, overflow: "hidden" }}>
            <div
              className="ee-gallery-thumb"
              onClick={() => { if (item.type === "video") setPlayingVideo(item.src); }}
              style={{ height: 180, background: `linear-gradient(135deg, ${BG}, ${CARD2})`, borderBottom: `1px solid ${BD}`, position: "relative", overflow: "hidden", cursor: item.type === "video" ? "pointer" : "default" }}
            >
              {item.type === "video" ? (
                <video src={item.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
              ) : (
                <img src={item.src} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
              {item.type === "video" && (
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.4)" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${A}cc`, display: "grid", placeItems: "center" }}>
                    <span style={{ fontSize: 28, color: BG, marginLeft: 4 }}>▶</span>
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: "20px 20px 24px" }}>
              <h3 style={{ fontFamily: F2, fontSize: 14, fontWeight: 700, color: T, margin: "0 0 6px" }}>{item.title}</h3>
              <p style={{ color: TD, fontSize: 12, lineHeight: 1.6, fontFamily: F1, margin: 0 }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
      {playingVideo && (
        <div onClick={closeModal} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.92)", display: "grid", placeItems: "center", cursor: "pointer", animation: "fadeIn 0.3s ease-out" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "90%", maxWidth: 900, position: "relative" }}>
            <button onClick={closeModal} style={{ position: "absolute", top: -44, right: 0, background: "none", border: "none", color: T, fontSize: 28, cursor: "pointer", fontFamily: F1, lineHeight: 1 }}>✕</button>
            <video ref={modalVideoRef} key={playingVideo} src={playingVideo} controls onLoadedMetadata={() => { if (modalVideoRef.current) { modalVideoRef.current.muted = false; modalVideoRef.current.volume = 1; } }} style={{ width: "100%", borderRadius: 12, boxShadow: `0 0 60px ${A}20`, display: "block" }} />
          </div>
        </div>
      )}
    </section>
  );
}
  
function NewsSection({ liveNews }) {
  const displayNews = liveNews && liveNews.length > 0 ? liveNews : NEWS;
  return (
    <section id="news" style={{ padding: "100px clamp(1rem,4vw,3rem)", maxWidth: 1200, margin: "0 auto" }}>
      <div className="ee-reveal" style={{ textAlign: "center", marginBottom: 64 }}>
        <span style={{ color: WN, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>LATEST</span>
        <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 800, color: T, margin: "12px 0 16px" }}>News and Updates</h2>
        <p style={{ color: TD, maxWidth: 520, margin: "0 auto", lineHeight: 1.7, fontFamily: F1, fontSize: 15 }}>Stay up to date with the latest patches, features, and announcements from Team 4R.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {displayNews.map((n, i) => (
          <div key={n.id} className="ee-reveal ee-stagger ee-news-hover" style={{ "--stagger": i, background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: "24px 28px", display: "flex", gap: 20, alignItems: "flex-start", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: n.color }} />
            <div style={{ minWidth: 52, height: 52, borderRadius: 12, background: `${n.color}12`, border: `1px solid ${n.color}25`, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: F2, fontSize: 10, fontWeight: 800, color: n.color, letterSpacing: 1 }}>{n.type}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div className="ee-news-header" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <h3 style={{ fontFamily: F2, fontSize: 15, fontWeight: 700, color: T, margin: 0 }}>{n.title}</h3>
                <span style={{ fontFamily: F1, fontSize: 11, color: TD, fontWeight: 600 }}>{n.date}</span>
              </div>
              <p style={{ fontFamily: F1, fontSize: 13, color: TD, lineHeight: 1.6, margin: 0 }}>{n.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PublicLeaderboards() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionTicket, setSessionTicket] = useState(null);

  useEffect(() => {
    async function silentLogin() {
      let guestId = localStorage.getItem("ee_guest_id");
      if (!guestId) { guestId = "WebGuest_" + Math.random().toString(36).slice(2) + Date.now(); localStorage.setItem("ee_guest_id", guestId); }
      const cachedTicket = sessionStorage.getItem("ee_lb_ticket");
      if (cachedTicket) { setSessionTicket(cachedTicket); return; }
      try {
        const loginRes = await fetch(`https://${PLAYFAB_TITLE_ID}.playfabapi.com/Client/LoginWithCustomID`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ TitleId: PLAYFAB_TITLE_ID, CustomId: guestId, CreateAccount: true }) });
        const loginJson = await loginRes.json();
        if (loginJson.code === 200) { setSessionTicket(loginJson.data.SessionTicket); sessionStorage.setItem("ee_lb_ticket", loginJson.data.SessionTicket); }
        else setError(`Login Failed: ${loginJson.errorMessage}`);
      } catch (e) { setError(`Login Network Error: ${e.message}`); }
    }
    silentLogin();
  }, []);

  useEffect(() => {
    if (!sessionTicket) return;
    async function fetchLeaderboard() {
      setIsLoading(true); setError(null);
      try {
        const lbRes = await fetch(`https://${PLAYFAB_TITLE_ID}.playfabapi.com/Client/GetLeaderboard`, { method: "POST", headers: { "Content-Type": "application/json", "X-Authorization": sessionTicket }, body: JSON.stringify({ StatisticName: "Gold", StartPosition: 0, MaxResultsCount: 10 }) });
        const lbJson = await lbRes.json();
        if (lbJson.code === 200) setLeaderboard(lbJson.data.Leaderboard || []);
        else setError(`Data Error: ${lbJson.errorMessage}`);
      } catch (e) { setError(`Fetch Error: ${e.message}`); }
      finally { setIsLoading(false); }
    }
    fetchLeaderboard();
  }, [sessionTicket]);

  return (
    <section id="leaderboards" style={{ padding: "100px clamp(1rem,4vw,3rem)", maxWidth: 900, margin: "0 auto" }}>
      <div className="ee-reveal" style={{ textAlign: "center", marginBottom: 40 }}>
        <span style={{ color: A, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>RANKINGS</span>
        <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, color: T, margin: "12px 0 16px" }}>Global Leaderboards</h2>
        <p style={{ color: TD, fontSize: 13, fontFamily: F1, lineHeight: 1.6 }}>💰 Top Wealth — who's stacking the most gold?</p>
      </div>
      <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 16, overflow: "hidden", boxShadow: `0 20px 40px ${BG}ee` }}>
        {error ? ( <div style={{ padding: 60, textAlign: "center", color: A2, fontFamily: F1, lineHeight: 1.6 }}>{error}</div>
        ) : isLoading || !sessionTicket ? ( <div style={{ padding: 60, textAlign: "center", color: TD, fontFamily: F1 }}>Loading leaderboard...</div>
        ) : leaderboard.length === 0 ? ( <div style={{ padding: 60, textAlign: "center", color: TD, fontFamily: F1 }}>No players found.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", padding: "16px 24px", background: CARD2, borderBottom: `1px solid ${BD}` }}>
              <span style={{ flex: 0.5, fontFamily: F2, fontSize: 10, fontWeight: 700, color: TD, letterSpacing: 1 }}>RANK</span>
              <span style={{ flex: 2, fontFamily: F2, fontSize: 10, fontWeight: 700, color: TD, letterSpacing: 1 }}>PLAYER</span>
              <span style={{ flex: 1, fontFamily: F2, fontSize: 10, fontWeight: 700, color: TD, letterSpacing: 1, textAlign: "right" }}>GOLD</span>
            </div>
            {leaderboard.map((p) => (
              <div key={p.PlayFabId} className="ee-lb-row" style={{ display: "flex", padding: "18px 24px", borderBottom: `1px solid ${BD}`, justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ flex: 0.5, fontFamily: F2, fontSize: 16, fontWeight: 800, color: p.Position < 3 ? A : TD }}>{p.Position + 1}</span>
                <span style={{ flex: 2, fontFamily: F1, fontSize: 15, color: T, fontWeight: 600 }}>{p.DisplayName || "Anonymous"}</span>
                <span style={{ flex: 1, color: A, fontFamily: F2, fontWeight: 700, textAlign: "right" }}>{p.StatValue.toLocaleString()} G</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SystemRequirements() {
  const [tab, setTab] = useState("minimum");
  const specs = SPECS[tab];
  const labels = { os: "Operating System", cpu: "Processor", ram: "Memory", gpu: "Graphics", storage: "Storage", dx: "DirectX" };
  const specKeys = Object.keys(specs);
  return (
    <section id="specs" style={{ padding: "100px clamp(1rem,4vw,3rem)", background: `linear-gradient(180deg,transparent 0%,${CARD}40 50%,transparent 100%)` }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div className="ee-reveal" style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ color: PU, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>REQUIREMENTS</span>
          <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, color: T, margin: "12px 0 16px" }}>System Specs</h2>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 32 }}>
          {["minimum", "recommended"].map((t) => ( <button key={t} className="ee-tab-btn" onClick={() => setTab(t)} style={{ padding: "10px 28px", borderRadius: 8, background: tab === t ? `${A}18` : "transparent", border: `1px solid ${tab === t ? A + "50" : BD}`, color: tab === t ? A : TD, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase", transition: "all 0.3s" }}>{t}</button> ))}
        </div>
        <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 16, overflow: "hidden" }}>
          {specKeys.map((key, i) => ( <div key={key} className="ee-spec-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: i < specKeys.length - 1 ? `1px solid ${BD}` : "none" }}><span style={{ fontFamily: F1, fontSize: 13, color: TD, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{labels[key]}</span><span style={{ fontFamily: F1, fontSize: 14, color: T, fontWeight: 600, textAlign: "right" }}>{specs[key]}</span></div> ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const [openIdx, setOpenIdx] = useState(null);
  return (
    <section id="faq" style={{ padding: "100px clamp(1rem,4vw,3rem)", maxWidth: 800, margin: "0 auto" }}>
      <div className="ee-reveal" style={{ textAlign: "center", marginBottom: 48 }}>
        <span style={{ color: A, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>HELP</span>
        <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, color: T, margin: "12px 0 0" }}>FAQ</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {FAQS.map((f, i) => {
          const isOpen = openIdx === i;
          return (
            <div key={i} className="ee-faq-hover" style={{ background: CARD, border: `1px solid ${isOpen ? A + "40" : BD}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.3s" }}>
              <button onClick={() => setOpenIdx(isOpen ? null : i)} style={{ width: "100%", padding: "18px 24px", background: "none", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontFamily: F1, fontSize: 14, fontWeight: 700, color: isOpen ? A : T }}>{f.q}</span>
                <span style={{ color: isOpen ? A : TD, fontSize: 18, fontWeight: 300, transition: "transform 0.3s", display: "inline-block", transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
              </button>
              <div style={{ maxHeight: isOpen ? 200 : 0, overflow: "hidden", transition: "max-height 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
                <div style={{ padding: "0 24px 18px 24px" }}><p style={{ fontFamily: F1, fontSize: 13, color: TD, lineHeight: 1.7, margin: 0 }}>{f.a}</p></div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SupportSection({ addToast }) {
  const [formData, setFormData] = useState({ email: "", category: "BUG", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputStyle = { width: "100%", padding: "12px 14px", background: BG, border: `1px solid ${BD}`, borderRadius: 8, color: T, fontSize: 14, fontFamily: F1, outline: "none", transition: "border-color 0.3s", boxSizing: "border-box" };
  const labelStyle = { display: "block", marginBottom: 6, color: TD, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, fontFamily: F1, textTransform: "uppercase" };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.message.trim()) { addToast({ type: "error", title: "Incomplete", message: "Please fill out your email and message." }); return; }
    setIsSubmitting(true);
    emailjs.send('service_3ixsdwk', 'template_wo458oj', { from_email: formData.email, category: formData.category, message: formData.message }, '3LQw31VLjecEmrw0D')
      .then(() => { setIsSubmitting(false); setFormData({ email: "", category: "BUG", message: "" }); addToast({ type: "success", title: "Transmission Sent!", message: "Thanks for reaching out! Team 4R will review your message." }); })
      .catch((error) => { setIsSubmitting(false); console.error("EmailJS Error:", error); addToast({ type: "error", title: "Transmission Failed", message: "Something went wrong. Please try again." }); });
  };
  return (
    <section id="support" style={{ padding: "100px clamp(1rem,4vw,3rem)", background: `linear-gradient(180deg,transparent 0%,${CARD}40 50%,transparent 100%)` }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div className="ee-reveal" style={{ textAlign: "center", marginBottom: 40 }}>
          <span style={{ color: A2, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>GET IN TOUCH</span>
          <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, color: T, margin: "12px 0 16px" }}>Report an Issue</h2>
          <p style={{ color: TD, lineHeight: 1.7, fontFamily: F1, fontSize: 15 }}>Found a bug in the simulation? Have a suggestion for a new PC part? Drop Team 4R a message below.</p>
        </div>
        <form onSubmit={handleSubmit} style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 16, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div><label style={labelStyle}>Your Email</label><input type="email" style={inputStyle} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="builder@email.com" /></div>
            <div><label style={labelStyle}>Topic</label><select style={{ ...inputStyle, cursor: "pointer" }} value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}><option value="BUG">🐛 Bug Report</option><option value="FEEDBACK">💡 Feedback / Idea</option><option value="HELP">🆘 Need Help</option><option value="OTHER">✉️ Other</option></select></div>
          </div>
          <div><label style={labelStyle}>Message</label><textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="Describe what happened..." /></div>
          <button type="submit" disabled={isSubmitting} className="ee-btn-danger" style={{ width: "100%", padding: 14, background: `linear-gradient(135deg,${A2},${WN})`, border: "none", borderRadius: 10, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 14, cursor: isSubmitting ? "not-allowed" : "pointer", letterSpacing: 1, opacity: isSubmitting ? 0.7 : 1, transition: "opacity 0.3s" }}>{isSubmitting ? "SENDING..." : "SUBMIT TICKET"}</button>
        </form>
        <div className="ee-reveal" style={{ marginTop: 32, background: CARD, border: `1px solid ${PU}30`, borderRadius: 16, padding: "28px 28px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${PU},${A})` }} />
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `${PU}15`, border: `1px solid ${PU}30`, display: "grid", placeItems: "center", margin: "0 auto 16px", fontSize: 22 }}>📋</div>
          <h3 style={{ fontFamily: F2, fontSize: 16, fontWeight: 800, color: T, margin: "0 0 8px" }}>Thesis Evaluation</h3>
          <p style={{ fontFamily: F1, fontSize: 13, color: TD, lineHeight: 1.6, margin: "0 0 20px", maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>Help us improve Easy Express! As beta testers, your structured feedback directly contributes to our thesis research and defense documentation.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="https://forms.gle/YOUR_GOOGLE_FORM_ID_HERE" target="_blank" rel="noopener noreferrer" className="ee-btn-glow" style={{ display: "inline-block", padding: "12px 28px", background: `linear-gradient(135deg,${PU},${A})`, border: "none", borderRadius: 10, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 13, cursor: "pointer", letterSpacing: 1, textDecoration: "none" }}>📝 TAKE THE SURVEY</a>
            <a href="mailto:easyexpress.4r@gmail.com?subject=Beta%20Feedback" className="ee-btn-outline" style={{ display: "inline-block", padding: "12px 28px", background: "transparent", border: `1px solid ${BD}`, borderRadius: 10, color: TD, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: 0.5, textDecoration: "none" }}>✉ EMAIL FEEDBACK</a>
          </div>
          <p style={{ fontFamily: F1, fontSize: 10, color: TD, marginTop: 16, opacity: 0.7 }}>Your responses are anonymous and used solely for academic purposes.</p>
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" style={{ padding: "100px clamp(1rem,4vw,3rem)", maxWidth: 1200, margin: "0 auto" }}>
      <div className="ee-reveal" style={{ textAlign: "center", marginBottom: 48 }}>
        <span style={{ color: PU, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>THE TEAM</span>
        <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, color: T, margin: "12px 0 16px" }}>Built by 4R</h2>
        <p style={{ color: TD, maxWidth: 520, margin: "0 auto", lineHeight: 1.7, fontFamily: F1, fontSize: 15 }}>Four Computer Science students who believe the best way to learn hardware is by getting your virtual hands dirty. Easy Express is our thesis project and our love letter to the Philippine PC retail scene.</p>
      </div>
      <div className="ee-grid-team" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, maxWidth: 860, margin: "0 auto" }}>
        {TEAM.map((m, i) => (
          <div key={i} className="ee-reveal ee-stagger ee-team-hover" style={{ "--stagger": i, background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: "24px 20px", textAlign: "center" }}>
            <div className="ee-team-avatar" style={{ width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg,${PU}30,${A}30)`, margin: "0 auto 12px", display: "grid", placeItems: "center", fontFamily: F2, fontWeight: 800, fontSize: 16, color: PU }}>{m.av}</div>
            <div style={{ fontFamily: F2, fontSize: 14, fontWeight: 700, color: T, marginBottom: 4 }}>{m.name}</div>
            <div style={{ fontFamily: F1, fontSize: 12, color: TD, fontWeight: 600 }}>{m.role}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  const navLinks = ["features", "scenarios", "gallery", "news", "leaderboards", "specs", "faq", "support", "about"];
  const legalLinks = [
    { slug: "terms",   label: "Terms of Service" },
    { slug: "privacy", label: "Privacy Policy" },
    { slug: "refunds", label: "Refund Policy" },
  ];
  return (
    <footer style={{ borderTop: `1px solid ${BD}`, padding: "48px clamp(1rem,4vw,3rem) 32px" }}>
      <div className="ee-footer-grid" style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 40, marginBottom: 40 }}>
        <div style={{ maxWidth: 300 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 5, background: `linear-gradient(135deg,${A},${A2})`, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 11, color: BG, fontFamily: F1 }}>EE</div>
            <span style={{ color: T, fontWeight: 700, fontSize: 14, letterSpacing: 1, fontFamily: F1 }}>EASY EXPRESS</span>
          </div>
          <p style={{ fontFamily: F1, fontSize: 12, color: TD, lineHeight: 1.7 }}>A PC shop simulator and educational game by Team 4R. Built with Unity for our Computer Science thesis.</p>
        </div>
        <div>
          <div style={{ fontFamily: F2, fontSize: 11, fontWeight: 700, color: T, letterSpacing: 2, marginBottom: 12 }}>QUICK LINKS</div>
          {navLinks.map((l) => (
            <a key={l} href={"#" + l} style={{ display: "block", fontFamily: F1, fontSize: 13, color: TD, textDecoration: "none", marginBottom: 8, textTransform: "capitalize" }}>{l}</a>
          ))}
          {legalLinks.map((l) => (
            <a key={l.slug} href={"#/" + l.slug} style={{ display: "block", fontFamily: F1, fontSize: 13, color: TD, textDecoration: "none", marginBottom: 8 }}>{l.label}</a>
          ))}
        </div>
        <div>
          <div style={{ fontFamily: F2, fontSize: 11, fontWeight: 700, color: T, letterSpacing: 2, marginBottom: 12 }}>CONTACT</div>
          <p style={{ fontFamily: F1, fontSize: 13, color: A, marginBottom: 6 }}>easyexpress.4r@gmail.com</p>
          <p style={{ fontFamily: F1, fontSize: 12, color: TD, lineHeight: 1.6 }}>For bug reports, feedback, or thesis inquiries.</p>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${BD}`, paddingTop: 20, textAlign: "center" }}>
        <div style={{ fontFamily: F1, color: TD, fontSize: 12 }}>
          <span style={{ color: A, fontWeight: 700 }}>Easy Express</span>{" \u00A9 2026 \u2014 A thesis project by "}<span style={{ color: T }}>Team 4R</span>{". Built with Unity."}
        </div>
        <div style={{ marginTop: 6, fontFamily: F1, color: `${TD}80`, fontSize: 11 }}>Inspired by the Philippine PC retail experience. Not affiliated with EasyPC or PC Express.</div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════
   AUTH — News Sidebar, Success View, Otp View
   ═══════════════════════════════════════════ */
function AuthNewsSidebar({ liveNews }) {
  const displayNews = liveNews && liveNews.length > 0 ? liveNews : NEWS;
  return (
    <div className="ee-auth-sidebar" style={{ width: 260, background: BG, borderRight: `1px solid ${BD}`, padding: "28px 20px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <div style={{ width: 24, height: 24, borderRadius: 4, background: `linear-gradient(135deg,${A},${A2})`, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 9, color: BG, fontFamily: F1 }}>EE</div>
        <span style={{ fontFamily: F2, fontSize: 11, fontWeight: 700, color: T, letterSpacing: 1 }}>NEWS FEED</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {displayNews.slice(0, 4).map((n) => (
          <div key={n.id} style={{ padding: 12, background: CARD, borderRadius: 10, border: `1px solid ${BD}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 8, fontWeight: 800, fontFamily: F2, color: n.color, letterSpacing: 1, background: `${n.color}15`, padding: "2px 6px", borderRadius: 3 }}>{n.type}</span>
              <span style={{ fontSize: 10, color: TD, fontFamily: F1 }}>{n.date}</span>
            </div>
            <div style={{ fontFamily: F1, fontSize: 12, fontWeight: 700, color: T, marginBottom: 4, lineHeight: 1.3 }}>{n.title}</div>
            <div style={{ fontFamily: F1, fontSize: 11, color: TD, lineHeight: 1.4 }}>{n.desc.slice(0, 80) + "..."}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: 12, background: `${A}08`, borderRadius: 10, border: `1px solid ${A}20` }}>
        <div style={{ fontFamily: F1, fontSize: 11, color: A, fontWeight: 700, marginBottom: 4 }}>{"🎮 Game Sync"}</div>
        <div style={{ fontFamily: F1, fontSize: 10, color: TD, lineHeight: 1.5 }}>Your web account works in the game client. Log in once, play everywhere.</div>
      </div>
    </div>
  );
}

function SuccessView({ successType, username, onClose }) {
  const isSignup = successType === "signup";
  const nextSteps = ["Download Easy Express using the button below", "Launch the game on your PC", "Log in with the same username and password", "Start building your dream tech shop!"];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: `${BG}dd`, backdropFilter: "blur(24px)", display: "grid", placeItems: "center", padding: 20, animation: "fadeIn 0.3s ease-out" }} onClick={onClose}>
      <div style={{ background: CARD, border: `1px solid ${OK}30`, borderRadius: 20, padding: "48px 40px", width: "100%", maxWidth: 440, textAlign: "center", animation: "modalSlideUp 0.5s cubic-bezier(0.16,1,0.3,1)", position: "relative", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${OK},${A})` }} />
        <div style={{ width: 80, height: 80, borderRadius: "50%", margin: "0 auto 24px", background: `${OK}12`, border: `2px solid ${OK}40`, display: "grid", placeItems: "center", animation: "successPop 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both" }}>
          <span style={{ fontSize: 36, color: OK, animation: "successCheck 0.4s ease-out 0.5s both" }}>{"✓"}</span>
        </div>
        <h2 style={{ fontFamily: F2, fontSize: 24, fontWeight: 800, color: T, margin: "0 0 8px", animation: "fadeSlideUp 0.5s ease-out 0.3s both" }}>{isSignup ? "Account Activated!" : "Welcome Back!"}</h2>
        <p style={{ fontFamily: F1, fontSize: 14, color: TD, lineHeight: 1.6, margin: "0 0 8px", animation: "fadeSlideUp 0.5s ease-out 0.4s both" }}>{isSignup ? `Your account "${username}" has been verified and is ready to go.` : "Good to see you again! Your shop is waiting."}</p>
        {isSignup && (
          <div style={{ margin: "20px 0", padding: "16px 20px", background: BG, borderRadius: 12, border: `1px solid ${BD}`, textAlign: "left", animation: "fadeSlideUp 0.5s ease-out 0.5s both" }}>
            <div style={{ fontFamily: F2, fontSize: 11, fontWeight: 700, color: A, letterSpacing: 2, marginBottom: 10 }}>{"WHAT'S NEXT"}</div>
            {nextSteps.map((step, i) => ( <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: i < 3 ? 8 : 0 }}><span style={{ fontFamily: F2, fontSize: 10, fontWeight: 800, color: A, background: `${A}15`, padding: "2px 7px", borderRadius: 4, flexShrink: 0 }}>{i + 1}</span><span style={{ fontFamily: F1, fontSize: 12, color: TD, lineHeight: 1.5 }}>{step}</span></div> ))}
          </div>
        )}
        <button onClick={onClose} style={{ width: "100%", padding: 14, background: `linear-gradient(135deg,${OK},${A})`, border: "none", borderRadius: 10, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 14, cursor: "pointer", letterSpacing: 1, animation: "fadeSlideUp 0.5s ease-out 0.6s both" }}>{isSignup ? "DOWNLOAD GAME" : "CONTINUE"}</button>
      </div>
    </div>
  );
}

function OtpView({ formData, otpCode, setOtpCode, otpRefs, handleVerifyOTP, handleResendOTP, loading }) {
  const handleOtpChange = (index, value) => { if (!/^\d*$/.test(value)) return;
  const next = [...otpCode]; next[index] = value.slice(-1); setOtpCode(next); if (value && index < 5 && otpRefs.current[index + 1]) otpRefs.current[index + 1].focus();
  };
  const handleOtpKeyDown = (index, e) => { if (e.key === "Backspace" && !otpCode[index] && index > 0 && otpRefs.current[index - 1]) otpRefs.current[index - 1].focus();
  };
  return (
    <div style={{ textAlign: "center", paddingTop: 20 }}>
      <div style={{ width: 60, height: 60, borderRadius: 14, background: `${A}12`, border: `1px solid ${A}25`, display: "grid", placeItems: "center", margin: "0 auto 20px", fontSize: 28 }}>{"📧"}</div>
      <h2 style={{ fontFamily: F2, fontSize: 20, fontWeight: 800, color: T, margin: "0 0 6px" }}>Check Your Inbox</h2>
      <p style={{ color: TD, fontSize: 13, fontFamily: F1, lineHeight: 1.6, margin: "0 0 6px" }}>We sent a 6-digit code to</p>
      <p style={{ color: A, fontSize: 14, fontFamily: F1, fontWeight: 700, margin: "0 0 28px" }}>{formData.email}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
        {otpCode.map((d, i) => ( <input key={i} ref={(el) => { otpRefs.current[i] = el; }} type="text" maxLength={1} value={d} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(i, e)} style={{ width: 46, height: 54, textAlign: "center", background: BG, border: `1px solid ${d ? A : BD}`, borderRadius: 10, color: T, fontSize: 22, fontFamily: F2, fontWeight: 700, outline: "none", transition: "border-color 0.3s" }} /> ))}
      </div>
      <button onClick={handleVerifyOTP} disabled={loading} style={{ width: "100%", padding: 14, background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", borderRadius: 10, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 15, cursor: "pointer", letterSpacing: 1, opacity: loading ? 0.7 : 1 }}>{loading ? "VERIFYING..." : "VERIFY & ACTIVATE"}</button>
      <p style={{ color: TD, fontSize: 12, marginTop: 14, fontFamily: F1 }}>{"Didn't receive it? "}<button onClick={handleResendOTP} disabled={loading} style={{ background: "none", border: "none", color: A, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>Resend Code</button></p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   CHECKOUT MODAL
   ═══════════════════════════════════════════ */
function CheckoutModal({ onClose, onSuccess, addToast, sessionTicket, playFabId }) {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState(null);
  const [cardData, setCardData] = useState({ name: "", number: "", expiry: "", cvv: "" });
  const [gcashNumber, setGcashNumber] = useState("");
  const [error, setError] = useState("");

  const PRICE = "1.00";
  const GAME_TITLE = "Easy Express — Full Game";

  const inputStyle = {
    width: "100%", padding: "12px 14px", background: BG,
    border: `1px solid ${BD}`, borderRadius: 8, color: T,
    fontSize: 14, fontFamily: F1, outline: "none",
    transition: "border-color 0.3s", boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block", marginBottom: 6, color: TD,
    fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
    fontFamily: F1, textTransform: "uppercase",
  };

  const formatCardNumber = (v) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (v) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length >= 3 ? d.slice(0, 2) + "/" + d.slice(2) : d; };

  const handleProceed = async () => {
    setError("");
    if (!method) { setError("Please select a payment method."); return; }
    if (method === "gcash") {
      if (!/^09\d{9}$/.test(gcashNumber.replace(/\s/g, ""))) {
        setError("Enter a valid GCash number (e.g. 09XXXXXXXXX).");
        return;
      }
    }
    if (method === "card") {
      if (!cardData.name.trim()) { setError("Enter the cardholder name."); return; }
      if (cardData.number.replace(/\s/g, "").length < 16) { setError("Enter a valid 16-digit card number."); return; }
      if (cardData.expiry.length < 5) { setError("Enter a valid expiry date (MM/YY)."); return; }
      if (cardData.cvv.length < 3) { setError("Enter a valid CVV."); return; }
    }
    if (!playFabId) {
      setError("Account error. Please log out and log back in.");
      return;
    }

    setStep(3);

    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, playFabId }),
      });
      const data = await res.json();

      if (!res.ok || !data.checkoutUrl) {
        setStep(2);
        setError(data.error || "Could not start payment. Please try again.");
        return;
      }

      window.location.href = data.checkoutUrl;

    } catch (e) {
      setStep(2);
      setError("Network error. Check your connection and try again.");
    }
  };

  const OrderSummary = () => (
    <div style={{ width: 220, background: BG, borderRight: `1px solid ${BD}`, padding: "28px 20px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ fontFamily: F2, fontSize: 10, fontWeight: 700, color: A, letterSpacing: 2, marginBottom: 16 }}>ORDER SUMMARY</div>
      <div style={{ flex: 1 }}>
        <div style={{ padding: "14px", background: CARD, borderRadius: 10, border: `1px solid ${BD}`, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: `linear-gradient(135deg,${A},${A2})`, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14, color: BG, fontFamily: F1, marginBottom: 10 }}>EE</div>
          <div style={{ fontFamily: F2, fontSize: 12, fontWeight: 700, color: T, marginBottom: 4 }}>{GAME_TITLE}</div>
          <div style={{ fontFamily: F1, fontSize: 11, color: TD, lineHeight: 1.5 }}>Full game license. One-time purchase. All future updates included.</div>
        </div>
        {[{ l: "Game", v: "Easy Express" }, { l: "Edition", v: "Full Version" }, { l: "Platform", v: "Windows PC" }].map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${BD}` }}>
            <span style={{ fontFamily: F1, fontSize: 11, color: TD }}>{r.l}</span>
            <span style={{ fontFamily: F1, fontSize: 11, color: T, fontWeight: 600 }}>{r.v}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${BD}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: F1, fontSize: 12, color: TD, fontWeight: 700 }}>TOTAL</span>
          <span style={{ fontFamily: F2, fontSize: 20, fontWeight: 900, color: A }}>{PRICE}</span>
        </div>
        <div style={{ fontFamily: F1, fontSize: 10, color: TD, marginTop: 6, opacity: 0.7 }}>One-time payment. No subscription.</div>
      </div>
      <div style={{ marginTop: 16, padding: "10px 12px", background: `${OK}08`, borderRadius: 8, border: `1px solid ${OK}20` }}>
        <div style={{ fontFamily: F1, fontSize: 10, color: OK, fontWeight: 700, marginBottom: 3 }}>🔒 Secure Checkout</div>
        <div style={{ fontFamily: F1, fontSize: 10, color: TD, lineHeight: 1.4 }}>Your payment info is encrypted and never stored.</div>
      </div>
    </div>
  );

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, background: `${BG}dd`, backdropFilter: "blur(24px)", display: "grid", placeItems: "center", padding: 20, animation: "fadeIn 0.3s ease-out" }}
      onClick={step !== 3 ? onClose : undefined}
    >
      <div
        style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 20, width: "100%", maxWidth: 680, position: "relative", overflow: "hidden", animation: "modalSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)", display: "flex", minHeight: 480 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: step === 4 ? `linear-gradient(90deg,${OK},${A})` : `linear-gradient(90deg,${PU},${A})`, zIndex: 1 }} />
        {step !== 4 && <OrderSummary />}
        <div style={{ flex: 1, padding: "36px 32px", position: "relative", overflowY: "auto" }}>
          {step !== 3 && step !== 4 && (
            <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: TD, fontSize: 18, cursor: "pointer" }}>✕</button>
          )}

          {(step === 1 || step === 2) && (
            <div style={{ animation: "fadeSlideUp 0.3s ease-out" }}>
              <h2 style={{ fontFamily: F2, fontSize: 19, fontWeight: 800, color: T, margin: "0 0 4px" }}>Complete Purchase</h2>
              <p style={{ color: TD, fontSize: 12, fontFamily: F1, margin: "0 0 24px" }}>Select your payment method to unlock the full game.</p>
              {error && (
                <div style={{ color: A2, fontSize: 12, marginBottom: 16, fontFamily: F1, padding: "10px 14px", background: `${A2}0a`, borderRadius: 10, border: `1px solid ${A2}25`, display: "flex", gap: 8, alignItems: "center" }}>
                  <span>⚠</span> {error}
                </div>
              )}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Payment Method</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { id: "qrph", label: "QRPh (Scan)", icon: "📷", color: OK },
                    { id: "gcash", label: "GCash", icon: "📱", color: "#007AFF" },
                    { id: "card", label: "Credit / Debit", icon: "💳", color: A },
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setMethod(m.id); setStep(2); setError(""); }}
                      style={{
                        flex: 1, padding: "14px 10px", borderRadius: 10, cursor: "pointer",
                        background: method === m.id ? `${m.color}15` : BG,
                        border: `2px solid ${method === m.id ? m.color : BD}`,
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                        transition: "all 0.25s",
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{m.icon}</span>
                      <span style={{ fontFamily: F1, fontSize: 12, fontWeight: 700, color: method === m.id ? T : TD }}>{m.label}</span>
                      {method === m.id && <span style={{ fontFamily: F2, fontSize: 8, color: m.color, letterSpacing: 1 }}>SELECTED</span>}
                    </button>
                  ))}
                </div>
              </div>

              {method === "gcash" && (
                <div style={{ animation: "fadeSlideUp 0.25s ease-out", marginBottom: 16 }}>
                  <div style={{ padding: "12px 14px", background: `#007AFF10`, border: `1px solid #007AFF30`, borderRadius: 10, marginBottom: 16 }}>
                    <div style={{ fontFamily: F1, fontSize: 11, color: "#007AFF", fontWeight: 700, marginBottom: 2 }}>📱 GCash Instructions</div>
                    <div style={{ fontFamily: F1, fontSize: 11, color: TD, lineHeight: 1.5 }}>Enter your registered GCash number. You will receive a payment prompt on your GCash app.</div>
                  </div>
                  <label style={labelStyle}>GCash Mobile Number</label>
                  <input style={inputStyle} value={gcashNumber} onChange={e => { setGcashNumber(e.target.value.replace(/\D/g, "").slice(0, 11)); setError(""); }} placeholder="09XXXXXXXXX" maxLength={11} />
                </div>
              )}

              {method === "card" && (
                <div style={{ animation: "fadeSlideUp 0.25s ease-out", display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Cardholder Name</label>
                    <input style={inputStyle} value={cardData.name} onChange={e => { setCardData(p => ({ ...p, name: e.target.value })); setError(""); }} placeholder="Juan Dela Cruz" />
                  </div>
                  <div>
                    <label style={labelStyle}>Card Number</label>
                    <input style={inputStyle} value={cardData.number} onChange={e => { setCardData(p => ({ ...p, number: formatCardNumber(e.target.value) })); setError(""); }} placeholder="1234 5678 9012 3456" maxLength={19} />
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Expiry Date</label>
                      <input style={inputStyle} value={cardData.expiry} onChange={e => { setCardData(p => ({ ...p, expiry: formatExpiry(e.target.value) })); setError(""); }} placeholder="MM/YY" maxLength={5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>CVV</label>
                      <input style={{ ...inputStyle, letterSpacing: 4 }} value={cardData.cvv} onChange={e => { setCardData(p => ({ ...p, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })); setError(""); }} placeholder="•••" maxLength={4} type="password" />
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleProceed}
                disabled={!method}
                style={{
                  width: "100%", padding: 14, marginTop: 8,
                  background: method ? `linear-gradient(135deg,${PU},${A})` : BD,
                  border: "none", borderRadius: 10,
                  color: method ? BG : TD,
                  fontFamily: F1, fontWeight: 800, fontSize: 15,
                  cursor: method ? "pointer" : "not-allowed",
                  letterSpacing: 1, transition: "all 0.3s",
                }}
              >
                {`PAY ${PRICE}`}
              </button>
              <p style={{ color: TD, fontSize: 11, fontFamily: F1, textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
                🔒 Secured by PayMongo. You will be redirected to complete payment.
              </p>
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: "center", padding: "40px 0", animation: "fadeSlideUp 0.3s ease-out" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: `${PU}15`, border: `2px solid ${PU}40`, display: "grid", placeItems: "center", margin: "0 auto 24px", animation: "serverPulse 1s ease-in-out infinite" }}>
                <span style={{ fontSize: 32 }}>⚡</span>
              </div>
              <h2 style={{ fontFamily: F2, fontSize: 20, fontWeight: 800, color: T, margin: "0 0 10px" }}>Processing Payment</h2>
              <p style={{ color: TD, fontSize: 13, fontFamily: F1, lineHeight: 1.6, marginBottom: 28 }}>
                {method === "gcash" ? "Connecting to GCash..." : "Contacting payment gateway..."}<br />
                Please do not close this window.
              </p>
              <div style={{ height: 4, background: BD, borderRadius: 2, overflow: "hidden", maxWidth: 260, margin: "0 auto" }}>
                <div style={{ height: "100%", background: `linear-gradient(90deg,${PU},${A})`, borderRadius: 2, animation: "processingBar 2.2s linear forwards" }} />
              </div>
              <style>{`@keyframes processingBar { from { width: 0% } to { width: 100% } }`}</style>
            </div>
          )}

          {step === 4 && (
            <div style={{ textAlign: "center", padding: "20px 0", animation: "fadeSlideUp 0.4s ease-out", width: "100%" }}>
              <div style={{ width: 88, height: 88, borderRadius: "50%", background: `${OK}12`, border: `2px solid ${OK}40`, display: "grid", placeItems: "center", margin: "0 auto 24px", animation: "successPop 0.6s cubic-bezier(0.16,1,0.3,1) both" }}>
                <span style={{ fontSize: 44, color: OK }}>✓</span>
              </div>
              <h2 style={{ fontFamily: F2, fontSize: 22, fontWeight: 800, color: T, margin: "0 0 8px" }}>Payment Successful!</h2>
              <p style={{ color: TD, fontSize: 13, fontFamily: F1, lineHeight: 1.7, marginBottom: 8 }}>Thank you for your purchase!</p>
              <p style={{ color: A, fontSize: 14, fontFamily: F1, fontWeight: 700, marginBottom: 28 }}>{GAME_TITLE}</p>
              <div style={{ textAlign: "left", padding: "16px 20px", background: BG, borderRadius: 12, border: `1px solid ${BD}`, marginBottom: 24 }}>
                <div style={{ fontFamily: F2, fontSize: 10, fontWeight: 700, color: A, letterSpacing: 2, marginBottom: 12 }}>WHAT'S NEXT</div>
                {["Your account is now flagged as Full Game Owner.", "Click the button below to download the full version.", "Log in with your account in-game to unlock all content."].map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: i < 2 ? 8 : 0 }}>
                    <span style={{ fontFamily: F2, fontSize: 9, fontWeight: 800, color: OK, background: `${OK}15`, padding: "2px 7px", borderRadius: 4, flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontFamily: F1, fontSize: 12, color: TD, lineHeight: 1.5 }}>{s}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => { onClose(); window.open("https://your-cdn.com/EasyExpress_Full_Setup.exe", "_blank"); }} style={{ width: "100%", padding: 14, background: `linear-gradient(135deg,${OK},${A})`, border: "none", borderRadius: 10, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 15, cursor: "pointer", letterSpacing: 1 }}>
                ⬇ DOWNLOAD FULL GAME
              </button>
              <button onClick={onClose} style={{ width: "100%", marginTop: 10, padding: 12, background: "transparent", border: `1px solid ${BD}`, borderRadius: 10, color: TD, fontFamily: F1, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   AUTH MODAL
   ═══════════════════════════════════════════ */
function AuthModal({ mode, setMode, onClose, addToast, onLoginSuccess, liveNews }) {
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);
  const [signupStep, setSignupStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successType, setSuccessType] = useState("");
  const [formData, setFormData] = useState({ firstName: "", lastName: "", username: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionTicket, setSessionTicket] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);
  const handleChange = (field) => (e) => { setFormData((p) => ({ ...p, [field]: e.target.value })); setError(""); };
  const inputStyle = { width: "100%", padding: "12px 14px", background: BG, border: `1px solid ${BD}`, borderRadius: 8, color: T, fontSize: 14, fontFamily: F1, outline: "none", transition: "border-color 0.3s", boxSizing: "border-box" };
  const labelStyle = { display: "block", marginBottom: 6, color: TD, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, fontFamily: F1, textTransform: "uppercase" };
  const pwToggleStyle = (active) => ({ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: active ? A : TD, cursor: "pointer", fontFamily: F1, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, padding: 0, lineHeight: 1 });

  const handleSignUp = async () => {
    if (!agreeTerms) { setError("You must agree to the terms"); return; }
    setLoading(true); setError("");
    try {
      const result = await registerUser({ username: formData.username, email: formData.email, password: formData.password, displayName: formData.firstName + " " + formData.lastName });
      setSessionTicket(result.SessionTicket);
      const otpResult = await executeCloudScript({ sessionTicket: result.SessionTicket, functionName: "sendOTP", functionParameter: {} });
      if (!otpResult.FunctionResult || !otpResult.FunctionResult.code) throw new Error(otpResult.FunctionResult?.error || "CloudScript 'sendOTP' did not return a code.");
      await sendOTPEmail(formData.email, otpResult.FunctionResult.code, formData.username);
      setOtpSent(true);
      addToast({ type: "info", title: "OTP Sent!", message: "Verification code sent to " + formData.email, duration: 5000 });
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    const code = otpCode.join("");
    if (code.length < 6) { setError("Enter the full 6-digit code"); return; }
    setLoading(true); setError("");
    try {
      const r = await executeCloudScript({ sessionTicket, functionName: "verifyOTP", functionParameter: { code } });
      if (r.FunctionResult?.success) { setSuccessType("signup"); setShowSuccess(true); addToast({ type: "success", title: "Account Created!", message: "Welcome to Easy Express, " + formData.username + "!", duration: 6000 }); }
      else setError(r.FunctionResult?.error || "Verification failed.");
    } catch (err) { setError(err.message); }
    setLoading(false);
  };
  
  const handleResendOTP = async () => {
    setLoading(true); setError("");
    try {
      const r = await executeCloudScript({ sessionTicket, functionName: "sendOTP", functionParameter: {} });
      if (!r.FunctionResult || !r.FunctionResult.code) throw new Error(r.FunctionResult?.error || "CloudScript 'sendOTP' did not return a code.");
      await sendOTPEmail(formData.email, r.FunctionResult.code, formData.username);
      addToast({ type: "info", title: "Code Resent", message: "A new verification code has been sent.", duration: 4000 });
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!formData.email.trim() || !formData.password.trim()) { setError("Please fill in all fields"); return; }
    setLoading(true); setError("");
    try {
      const isEmail = formData.email.includes("@");
      const loginResult = isEmail
        ? await loginWithEmail({ email: formData.email, password: formData.password })
        : await loginWithUsername({ username: formData.email, password: formData.password });
      setSuccessType("login"); setShowSuccess(true);
      addToast({ type: "welcome", title: "Welcome Back!", message: "Launch the game to continue your shop.", duration: 5000 });
      localStorage.setItem("ee_session_ticket", loginResult.SessionTicket);
      if (onLoginSuccess) onLoginSuccess(formData.email, loginResult.SessionTicket, loginResult.PlayFabId);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleNextStep = () => {
    setError("");
    if (signupStep === 1) {
      if (!formData.firstName.trim()) { setError("First name is required"); return; }
      if (!formData.lastName.trim()) { setError("Last name is required"); return; }
      if (!formData.username.trim() || formData.username.length < 3) { setError("Username must be at least 3 characters"); return; }
      setSignupStep(2);
    } else if (signupStep === 2) {
      if (!formData.email.includes("@")) { setError("Enter a valid email address"); return; }
      if (formData.password.length < 8) { setError("Password must be at least 8 characters"); return; }
      if (formData.password !== formData.confirmPassword) { setError("Passwords don't match"); return; }
      setSignupStep(3);
    }
  };
  
  if (showSuccess) return <SuccessView successType={successType} username={formData.username} onClose={onClose} />;
  const stepNames = ["Identity", "Credentials", "Confirm"];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: `${BG}dd`, backdropFilter: "blur(24px)", display: "grid", placeItems: "center", padding: 20, animation: "fadeIn 0.3s ease-out" }} onClick={onClose}>
      <div className="ee-auth-modal" style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 20, width: "100%", maxWidth: 700, position: "relative", overflow: "hidden", animation: "modalSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)", display: "flex", minHeight: 520 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${A},${A2})`, zIndex: 1 }} />
        <AuthNewsSidebar liveNews={liveNews} />
        <div style={{ flex: 1, padding: "36px 32px", position: "relative", overflowY: "auto" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: TD, fontSize: 18, cursor: "pointer", lineHeight: 1, zIndex: 2 }}>{"✕"}</button>
          {error && (
            <div style={{ color: A2, fontSize: 12, marginBottom: 16, fontFamily: F1, padding: "10px 14px", background: `${A2}0a`, borderRadius: 10, border: `1px solid ${A2}25`, display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 14 }}>{"⚠"}</span> {error}
            </div>
          )}
          {otpSent ? (
            <OtpView formData={formData} otpCode={otpCode} setOtpCode={setOtpCode} otpRefs={otpRefs} handleVerifyOTP={handleVerifyOTP} handleResendOTP={handleResendOTP} loading={loading} />
          ) : mode === "signup" ? (
            <div>
              <h2 style={{ fontFamily: F2, fontSize: 20, fontWeight: 800, color: T, margin: "0 0 4px" }}>Create Your Account</h2>
              <p style={{ color: TD, fontSize: 12, fontFamily: F1, margin: "0 0 20px" }}>Join Easy Express — it only takes a minute.</p>
              <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
                {stepNames.map((label, i) => {
                  const step = i + 1; const active = signupStep >= step; const current = signupStep === step;
                  return (
                    <React.Fragment key={i}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: active ? `${A}20` : "transparent", border: `2px solid ${active ? A : BD}`, display: "grid", placeItems: "center", fontFamily: F2, fontSize: 11, fontWeight: 800, color: active ? A : TD, transition: "all 0.3s" }}>{signupStep > step ? "✓" : step}</div>
                        <span style={{ fontFamily: F1, fontSize: 11, fontWeight: 700, color: current ? A : active ? T : TD, letterSpacing: 1 }}>{label}</span>
                      </div>
                      {i < 2 && <div style={{ flex: 1, height: 2, background: active && signupStep > step ? A : BD, margin: "0 12px", borderRadius: 1, transition: "background 0.3s" }} />}
                    </React.Fragment>
                  );
                })}
              </div>
              {signupStep === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeSlideUp 0.3s ease-out" }}>
                  <div className="ee-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={labelStyle}>First Name</label><input style={inputStyle} value={formData.firstName} onChange={handleChange("firstName")} placeholder="Juan" /></div>
                    <div><label style={labelStyle}>Last Name</label><input style={inputStyle} value={formData.lastName} onChange={handleChange("lastName")} placeholder="Dela Cruz" /></div>
                  </div>
                  <div><label style={labelStyle}>Username</label><input style={inputStyle} value={formData.username} onChange={handleChange("username")} placeholder="techshop_pro" /><p style={{ fontFamily: F1, fontSize: 10, color: TD, marginTop: 6 }}>This is your in-game display name. 3+ characters, no spaces.</p></div>
                  <button onClick={handleNextStep} style={{ width: "100%", padding: 14, marginTop: 8, background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", borderRadius: 10, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 14, cursor: "pointer", letterSpacing: 1 }}>{"NEXT →"}</button>
                </div>
              )}
              {signupStep === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeSlideUp 0.3s ease-out" }}>
                  <div><label style={labelStyle}>Email Address</label><input type="email" style={inputStyle} value={formData.email} onChange={handleChange("email")} placeholder="you@email.com" /><p style={{ fontFamily: F1, fontSize: 10, color: TD, marginTop: 6 }}>We will send a verification code to this email.</p></div>
                  <div><label style={labelStyle}>Password</label><div style={{ position: "relative" }}><input type={showPw ? "text" : "password"} style={{ ...inputStyle, paddingRight: 48 }} value={formData.password} onChange={handleChange("password")} placeholder="Min. 8 characters" /><button type="button" onClick={() => setShowPw(!showPw)} style={pwToggleStyle(showPw)}>{showPw ? "HIDE" : "SHOW"}</button></div><PwStrength password={formData.password} /></div>
                  <div><label style={labelStyle}>Confirm Password</label><div style={{ position: "relative" }}><input type={showConfirmPw ? "text" : "password"} style={{ ...inputStyle, paddingRight: 48 }} value={formData.confirmPassword} onChange={handleChange("confirmPassword")} placeholder="Re-enter password" /><button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} style={pwToggleStyle(showConfirmPw)}>{showConfirmPw ? "HIDE" : "SHOW"}</button></div></div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => { setSignupStep(1); setError(""); }} style={{ padding: "14px 20px", background: "transparent", border: `1px solid ${BD}`, borderRadius: 10, color: TD, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{"← BACK"}</button>
                    <button onClick={handleNextStep} style={{ flex: 1, padding: 14, background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", borderRadius: 10, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 14, cursor: "pointer", letterSpacing: 1 }}>{"NEXT →"}</button>
                  </div>
                </div>
              )}
              {signupStep === 3 && (
                <div style={{ animation: "fadeSlideUp 0.3s ease-out" }}>
                  <div style={{ background: BG, borderRadius: 12, padding: "16px 20px", marginBottom: 20, border: `1px solid ${BD}` }}>
                    <div style={{ fontFamily: F2, fontSize: 10, fontWeight: 700, color: A, letterSpacing: 2, marginBottom: 12 }}>REVIEW YOUR DETAILS</div>
                    {[{ l: "Name", v: formData.firstName + " " + formData.lastName }, { l: "Username", v: formData.username }, { l: "Email", v: formData.email }, { l: "Password", v: "\u2022".repeat(formData.password.length) }].map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 3 ? `1px solid ${BD}` : "none" }}>
                        <span style={{ fontFamily: F1, fontSize: 12, color: TD, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{r.l}</span>
                        <span style={{ fontFamily: F1, fontSize: 13, color: T, fontWeight: 600 }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                  <div onClick={() => setAgreeTerms(!agreeTerms)} style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", marginBottom: 20 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1, background: agreeTerms ? A : "transparent", border: `2px solid ${agreeTerms ? A : BD}`, display: "grid", placeItems: "center", transition: "all 0.2s", color: BG, fontSize: 12, fontWeight: 800 }}>{agreeTerms ? "✓" : ""}</div>
                    <span style={{ fontFamily: F1, fontSize: 12, color: TD, lineHeight: 1.5 }}>I agree to the Easy Express terms of service and understand that this is a thesis project by Team 4R. My data is used solely for game account management.</span>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => { setSignupStep(2); setError(""); }} style={{ padding: "14px 20px", background: "transparent", border: `1px solid ${BD}`, borderRadius: 10, color: TD, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{"← BACK"}</button>
                    <button onClick={handleSignUp} disabled={loading || !agreeTerms} style={{ flex: 1, padding: 14, background: agreeTerms ? `linear-gradient(135deg,${A},#00b8d4)` : BD, border: "none", borderRadius: 10, color: agreeTerms ? BG : TD, fontFamily: F1, fontWeight: 800, fontSize: 14, cursor: agreeTerms ? "pointer" : "not-allowed", letterSpacing: 1, opacity: loading ? 0.7 : 1 }}>{loading ? "CREATING ACCOUNT..." : "CREATE & VERIFY"}</button>
                  </div>
                </div>
              )}
              <p style={{ color: TD, fontSize: 12, marginTop: 20, textAlign: "center", fontFamily: F1 }}>{"Already have an account? "}<button onClick={() => { setMode("login"); setSignupStep(1); setError(""); }} style={{ background: "none", border: "none", color: A, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>Log In</button></p>
            </div>
          ) : (
            <div>
              <h2 style={{ fontFamily: F2, fontSize: 20, fontWeight: 800, color: T, margin: "0 0 4px" }}>Welcome Back</h2>
              <p style={{ color: TD, fontSize: 12, fontFamily: F1, margin: "0 0 24px" }}>Log in to access your shop and continue your progress.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div><label style={labelStyle}>Username or Email</label><input style={inputStyle} value={formData.email} onChange={handleChange("email")} placeholder="techshop_pro or you@email.com" onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }} /></div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input type={showLoginPw ? "text" : "password"} style={{ ...inputStyle, paddingRight: 48 }} value={formData.password} onChange={handleChange("password")} placeholder="Enter your password" onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }} />
                    <button type="button" onClick={() => setShowLoginPw(!showLoginPw)} style={pwToggleStyle(showLoginPw)}>{showLoginPw ? "HIDE" : "SHOW"}</button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                    <a href="#/reset-password" onClick={() => onClose()} style={{ background: "none", border: "none", color: A, cursor: "pointer", fontFamily: F1, fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                      Forgot Password?
                    </a>
                  </div>
                </div>
              </div>
              <button onClick={handleLogin} disabled={loading} className="ee-btn-glow" style={{ width: "100%", padding: 14, marginTop: 20, background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", borderRadius: 10, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 15, cursor: "pointer", letterSpacing: 1, opacity: loading ? 0.7 : 1 }}>{loading ? "LOGGING IN..." : "LOG IN"}</button>
              <div style={{ marginTop: 20, padding: "12px 14px", background: BG, border: `1px solid ${BD}`, borderRadius: 10, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{"🎮"}</span>
                <div><div style={{ fontFamily: F1, fontSize: 11, color: A, fontWeight: 700, marginBottom: 2 }}>Game Client Sync</div><div style={{ fontFamily: F1, fontSize: 11, color: TD, lineHeight: 1.5 }}>After logging in, launch the Easy Express client. The game uses the same account.</div></div>
              </div>
              <p style={{ color: TD, fontSize: 12, marginTop: 20, textAlign: "center", fontFamily: F1 }}>{"Don't have an account? "}<button onClick={() => { setMode("signup"); setError(""); }} style={{ background: "none", border: "none", color: A, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>Sign Up</button></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ADMIN DASHBOARD
   ═══════════════════════════════════════════════════════════ */
function AdminDashboard({ addToast, onClose, adminKey, setAdminKey, authed, setAuthed, liveNews, onNewsUpdated }) {
  const [activeTab, setActiveTab] = useState("players");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchErr, setSearchErr] = useState("");
  const [editData, setEditData] = useState({});
  const [editMsg, setEditMsg] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banMsg, setBanMsg] = useState("");
  const [banDuration, setBanDuration] = useState("permanent");
  const displayNews = liveNews && liveNews.length > 0 ? liveNews : NEWS;
  const [newsTitle, setNewsTitle] = useState("");
  const [newsBody, setNewsBody] = useState("");
  const [newsType, setNewsType] = useState("UPDATE");
  const [newsMsg, setNewsMsg] = useState("");
  const [lbStat, setLbStat] = useState("Gold");
  const [lbData, setLbData] = useState([]);
  const [lbErr, setLbErr] = useState("");
  const [logEntries, setLogEntries] = useState([]);
  const [gameRevenue, setGameRevenue] = useState(null);
  const [revenueMsg, setRevenueMsg] = useState("");
  const [revenueLoaded, setRevenueLoaded] = useState(false);
  const [playerStats, setPlayerStats] = useState(null);
  const inputStyle = { width: "100%", padding: "12px 14px", background: BG, border: `1px solid ${BD}`, borderRadius: 8, color: T, fontSize: 14, fontFamily: F1, outline: "none", transition: "border-color 0.3s", boxSizing: "border-box" };
  const labelStyle = { display: "block", marginBottom: 6, color: TD, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, fontFamily: F1, textTransform: "uppercase" };
  const BAN_DURATIONS = [{ value: "24", label: "24 Hours" },{ value: "168", label: "7 Days" },{ value: "720", label: "30 Days" },{ value: "permanent", label: "Permanent" }];

  if (!authed) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 200, background: `${BG}dd`, backdropFilter: "blur(24px)", display: "grid", placeItems: "center", padding: 20, animation: "fadeIn 0.3s ease-out" }} onClick={onClose}>
        <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 20, padding: "48px 40px", width: "100%", maxWidth: 440, animation: "modalSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)", position: "relative" }} onClick={e => e.stopPropagation()}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${A2},${WN})` }} />
          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: TD, fontSize: 18, cursor: "pointer" }}>✕</button>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: `${A2}15`, border: `1px solid ${A2}30`, display: "grid", placeItems: "center", margin: "0 auto 20px", fontSize: 24 }}>⚙</div>
          <h2 style={{ fontFamily: F2, fontSize: 20, fontWeight: 800, color: T, textAlign: "center", margin: "0 0 6px" }}>Admin Authentication</h2>
          <p style={{ fontFamily: F1, fontSize: 12, color: TD, textAlign: "center", margin: "0 0 24px" }}>Enter your PlayFab Secret Key to access admin tools.</p>
          <label style={labelStyle}>Secret Key</label>
          <input type="password" style={inputStyle} value={adminKey} onChange={e => setAdminKey(e.target.value)} placeholder="Enter PlayFab Secret Key" onKeyDown={e => { if (e.key === "Enter" && adminKey.length > 10) setAuthed(true); }} />
          <button onClick={() => { if (adminKey.length > 10) setAuthed(true); else addToast({ type: "error", title: "Invalid Key", message: "Secret key is too short." }); }} style={{ width: "100%", padding: 14, marginTop: 16, background: `linear-gradient(135deg,${A2},${WN})`, border: "none", borderRadius: 10, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 14, cursor: "pointer", letterSpacing: 1 }}>AUTHENTICATE</button>
        </div>
      </div>
    );
  }

  const searchPlayer = async () => { setSearchErr(""); setSearchResult(null); setEditMsg(""); setBanMsg(""); setPlayerStats(null);
    try { const res = await pfAdmin("GetUserAccountInfo", { Email: searchQuery.includes("@") ? searchQuery : undefined, PlayFabId: !searchQuery.includes("@") ? searchQuery : undefined }, adminKey);
    const info = res.UserInfo; const dataRes = await pfServer("GetUserData", { PlayFabId: info.PlayFabId }, adminKey); const userData = {};
    Object.entries(dataRes.Data || {}).forEach(([k, v]) => { userData[k] = v.Value; });
    try { const statsRes = await pfServer("GetPlayerStatistics", { PlayFabId: info.PlayFabId, StatisticNames: ["Gold"] }, adminKey); const statsMap = {};
    (statsRes.Statistics || []).forEach(s => { statsMap[s.StatisticName] = s.Value; }); setPlayerStats(statsMap); } catch (e) { setPlayerStats(null);
    } setSearchResult({ id: info.PlayFabId, email: info.PrivateInfo?.Email || "N/A", displayName: info.TitleInfo?.DisplayName || "N/A", created: info.TitleInfo?.Created || "", banned: info.TitleInfo?.isBanned || false });
    setEditData(userData); addToast({ type: "success", title: "Player Found", message: `Loaded data for ${info.PlayFabId}` }); } catch (e) { setSearchErr(e.message); } };
  const updatePlayerData = async () => { if (!searchResult) return; setEditMsg("");
    try { await pfAdmin("UpdateUserData", { PlayFabId: searchResult.id, Data: editData }, adminKey); setEditMsg("✅ Player data updated!");
    addToast({ type: "success", title: "Data Saved", message: `Updated data for ${searchResult.id}` }); } catch (e) { setEditMsg("❌ " + e.message); } };
  const banPlayer = async () => { if (!searchResult) return; setBanMsg("");
    try { const banPayload = { PlayFabId: searchResult.id, Reason: banReason || "Admin action" };
    if (banDuration !== "permanent") banPayload.DurationInHours = parseInt(banDuration, 10); await pfAdmin("BanUsers", { Bans: [banPayload] }, adminKey);
    const durationLabel = BAN_DURATIONS.find(d => d.value === banDuration)?.label || banDuration; setBanMsg(`✅ Player banned (${durationLabel}).`);
    setSearchResult(prev => ({ ...prev, banned: true })); addToast({ type: "info", title: "Player Banned", message: `${searchResult.id} — ${durationLabel}` });
    } catch (e) { setBanMsg("❌ " + e.message); } };
  const unbanPlayer = async () => { if (!searchResult) return; setBanMsg("");
    try { await pfAdmin("RevokeAllBansForUser", { PlayFabId: searchResult.id }, adminKey); setBanMsg("✅ All bans revoked.");
    setSearchResult(prev => ({ ...prev, banned: false })); addToast({ type: "success", title: "Player Unbanned", message: searchResult.id + " has been unbanned." });
    } catch (e) { setBanMsg("❌ " + e.message); } };
  const addNewsItem = async () => { if (!newsTitle.trim() || !newsBody.trim()) { setNewsMsg("Fill in title and body."); return; } setNewsMsg("");
    const newItem = { id: Date.now(), type: newsType, date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), title: newsTitle, desc: newsBody, color: newsType === "UPDATE" ? OK : newsType === "EVENT" ? WN : newsType === "PATCH" ? A : A2 };
    const updated = [newItem, ...displayNews];
    try { await pfAdmin("SetTitleData", { Key: "GameNews", Value: JSON.stringify(updated) }, adminKey); onNewsUpdated(updated); setNewsTitle(""); setNewsBody("");
    setNewsMsg("✅ News published!"); addToast({ type: "success", title: "News Published", message: newsTitle }); } catch (e) { setNewsMsg("❌ " + e.message); } };
  const deleteNewsItem = async (id) => { const updated = displayNews.filter(n => n.id !== id);
    try { await pfAdmin("SetTitleData", { Key: "GameNews", Value: JSON.stringify(updated) }, adminKey); onNewsUpdated(updated);
    addToast({ type: "info", title: "News Deleted", message: "Item removed." }); } catch (e) { setNewsMsg("❌ " + e.message); } };
  const fetchLeaderboard = async () => { if (!lbStat) { setLbErr("Please enter a statistic name."); return; } setLbErr(""); setLbData([]);
    try { const res = await pfServer("GetLeaderboard", { StatisticName: lbStat, StartPosition: 0, MaxResultsCount: 100 }, adminKey); setLbData(res.Leaderboard || []);
    addToast({ type: "success", title: "Leaderboard Loaded", message: `Fetched top players for ${lbStat}` }); } catch (e) { setLbErr(e.message); } };
  const fetchLogs = async () => { setLogEntries([{ time: new Date().toLocaleString(), event: "System", msg: "PlayFab event logging requires Insights. Configure PlayStream rules in your dashboard." }, { time: "", event: "Tip", msg: "Use Admin/GetUserAccountInfo or Admin/GetPlayerStatistics for per-player auditing." }]);
    addToast({ type: "info", title: "Logs", message: "Event system info loaded." }); };
  const loadRevenue = async () => { try { const res = await pfAdmin("GetTitleData", { Keys: ["GameRevenue"] }, adminKey);
    if (res.Data?.GameRevenue) setGameRevenue(JSON.parse(res.Data.GameRevenue)); else setGameRevenue({ total: "0", donations: "0", note: "No revenue data yet." }); setRevenueLoaded(true);
    } catch (e) { setRevenueMsg("❌ " + e.message); setGameRevenue({ total: "0", donations: "0", note: "" }); setRevenueLoaded(true); } };
  const saveRevenue = async () => { setRevenueMsg(""); try { await pfAdmin("SetTitleData", { Key: "GameRevenue", Value: JSON.stringify(gameRevenue) }, adminKey);
    setRevenueMsg("✅ Revenue data saved!"); addToast({ type: "success", title: "Revenue Updated", message: "Game revenue data saved." });
    } catch (e) { setRevenueMsg("❌ " + e.message); } };

  const tabs = [{ id: "players", label: "👥 Players" },{ id: "news", label: "📰 News Editor" },{ id: "leaderboard", label: "🏆 Leaderboards" },{ id: "revenue", label: "💵 Revenue" },{ id: "logs", label: "📋 Event Logs" }];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: `${BG}f5`, backdropFilter: "blur(8px)", overflowY: "auto", animation: "fadeIn 0.3s ease-out" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: `${CARD}f0`, backdropFilter: "blur(16px)", borderBottom: `1px solid ${BD}`, padding: "0 clamp(1rem,4vw,3rem)", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: `linear-gradient(135deg,${A2},${WN})`, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 11, color: BG, fontFamily: F1 }}>⚙</div>
          <span style={{ fontFamily: F2, fontSize: 14, fontWeight: 700, color: T, letterSpacing: 1 }}>ADMIN DASHBOARD</span>
        </div>
        <button onClick={onClose} style={{ background: `${A2}15`, border: `1px solid ${A2}30`, color: A2, padding: "6px 16px", borderRadius: 6, fontFamily: F1, fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: 1 }}>✕ CLOSE</button>
      </div>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px clamp(1rem,4vw,3rem)" }}>
        <div className="ee-admin-tabs" style={{ display: "flex", gap: 6, marginBottom: 28, flexWrap: "wrap" }}>
          {tabs.map(t => (<button key={t.id} className="ee-tab-btn" onClick={() => setActiveTab(t.id)} style={{ padding: "10px 20px", borderRadius: 8, fontFamily: F1, fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: 1, transition: "all 0.3s", background: activeTab === t.id ? `${A}15` : CARD, border: `1px solid ${activeTab === t.id ? A + "40" : BD}`, color: activeTab === t.id ? A : TD }}>{t.label}</button>))}
        </div>
        <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 16, padding: "28px 28px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${A},transparent)` }} />

          {activeTab === "players" && (
            <div style={{ animation: "fadeSlideUp 0.3s ease-out" }}>
              <h3 style={{ fontFamily: F2, fontSize: 16, fontWeight: 700, color: T, margin: "0 0 20px" }}>Player Lookup</h3>
              <div className="ee-admin-search" style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <input style={{ ...inputStyle, flex: 1 }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Email address or PlayFab ID" onKeyDown={e => { if (e.key === "Enter") searchPlayer(); }} />
                <button onClick={searchPlayer} style={{ padding: "12px 24px", background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", borderRadius: 8, color: BG, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>SEARCH</button>
              </div>
              {searchErr && <div style={{ color: A2, fontFamily: F1, fontSize: 13, marginBottom: 16, padding: "10px 14px", background: `${A2}0a`, borderRadius: 8, border: `1px solid ${A2}25` }}>❌ {searchErr}</div>}
              {searchResult && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ background: BG, borderRadius: 12, padding: "20px 24px", border: `1px solid ${BD}` }}>
                    <div style={{ fontFamily: F2, fontSize: 11, fontWeight: 700, color: A, letterSpacing: 2, marginBottom: 14 }}>ACCOUNT INFO</div>
                    {[{ l: "PlayFab ID", v: searchResult.id }, { l: "Email", v: searchResult.email }, { l: "Display Name", v: searchResult.displayName }, { l: "Status", v: searchResult.banned ? "🚫 BANNED" : "✅ Active" }].map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 3 ? `1px solid ${BD}` : "none" }}>
                        <span style={{ fontFamily: F1, fontSize: 12, color: TD, fontWeight: 600 }}>{r.l}</span>
                        <span style={{ fontFamily: F1, fontSize: 13, color: r.l === "Status" ? (searchResult.banned ? A2 : OK) : T, fontWeight: 600 }}>{r.v}</span>
                      </div>
                    ))}
                    {playerStats && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BD}` }}>
                        <span style={{ fontFamily: F1, fontSize: 12, color: TD, fontWeight: 600 }}>Gold</span>
                        <span style={{ fontFamily: F1, fontSize: 13, color: WN, fontWeight: 700, float: "right" }}>{(playerStats.Gold || 0).toLocaleString()} G</span>
                      </div>
                    )}
                  </div>
                  <div style={{ background: BG, borderRadius: 12, padding: "20px 24px", border: `1px solid ${BD}` }}>
                    <div style={{ fontFamily: F2, fontSize: 11, fontWeight: 700, color: A, letterSpacing: 2, marginBottom: 14 }}>PLAYER DATA</div>
                    {Object.entries(editData).map(([k, v]) => (
                      <div key={k} style={{ marginBottom: 10 }}>
                        <label style={labelStyle}>{k}</label>
                        <input style={inputStyle} value={v} onChange={e => setEditData(prev => ({ ...prev, [k]: e.target.value }))} />
                      </div>
                    ))}
                    {editMsg && <div style={{ fontFamily: F1, fontSize: 13, color: editMsg.startsWith("✅") ? OK : A2, marginBottom: 10 }}>{editMsg}</div>}
                    <button onClick={updatePlayerData} style={{ padding: "10px 20px", background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", borderRadius: 8, color: BG, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>SAVE CHANGES</button>
                  </div>
                  <div style={{ background: BG, borderRadius: 12, padding: "20px 24px", border: `1px solid ${A2}20` }}>
                    <div style={{ fontFamily: F2, fontSize: 11, fontWeight: 700, color: A2, letterSpacing: 2, marginBottom: 14 }}>BAN PLAYER</div>
                    <div className="ee-admin-search" style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                      <input style={{ ...inputStyle, flex: 1 }} value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Reason for ban..." />
                      <select style={{ ...inputStyle, width: "auto", cursor: "pointer" }} value={banDuration} onChange={e => setBanDuration(e.target.value)}>
                        {BAN_DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                    {banMsg && <div style={{ fontFamily: F1, fontSize: 13, color: banMsg.startsWith("✅") ? OK : A2, marginBottom: 10 }}>{banMsg}</div>}
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={banPlayer} style={{ padding: "10px 20px", background: `linear-gradient(135deg,${A2},${WN})`, border: "none", borderRadius: 8, color: BG, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>BAN PLAYER</button>
                      <button onClick={unbanPlayer} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${OK}40`, color: OK, borderRadius: 8, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>UNBAN PLAYER</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "news" && (
            <div style={{ animation: "fadeSlideUp 0.3s ease-out" }}>
              <h3 style={{ fontFamily: F2, fontSize: 16, fontWeight: 700, color: T, margin: "0 0 20px" }}>News Editor</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                <div className="ee-admin-search" style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}><label style={labelStyle}>Title</label><input style={inputStyle} value={newsTitle} onChange={e => setNewsTitle(e.target.value)} placeholder="News headline..." /></div>
                  <div><label style={labelStyle}>Type</label><select style={{ ...inputStyle, cursor: "pointer" }} value={newsType} onChange={e => setNewsType(e.target.value)}><option value="UPDATE">UPDATE</option><option value="EVENT">EVENT</option><option value="PATCH">PATCH</option><option value="NEW">NEW</option></select></div>
                </div>
                <div><label style={labelStyle}>Body</label><textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={newsBody} onChange={e => setNewsBody(e.target.value)} placeholder="News content..." /></div>
                {newsMsg && <div style={{ fontFamily: F1, fontSize: 13, color: newsMsg.startsWith("✅") ? OK : A2 }}>{newsMsg}</div>}
                <button onClick={addNewsItem} style={{ alignSelf: "flex-start", padding: "10px 24px", background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", borderRadius: 8, color: BG, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>PUBLISH NEWS</button>
              </div>
              <div style={{ fontFamily: F2, fontSize: 11, fontWeight: 700, color: TD, letterSpacing: 2, marginBottom: 12 }}>EXISTING NEWS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {displayNews.map(n => (
                  <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: BG, borderRadius: 8, border: `1px solid ${BD}` }}>
                    <div>
                      <span style={{ fontFamily: F2, fontSize: 10, color: n.color, marginRight: 8 }}>{n.type}</span>
                      <span style={{ fontFamily: F1, fontSize: 13, color: T }}>{n.title}</span>
                    </div>
                    <button onClick={() => deleteNewsItem(n.id)} style={{ background: `${A2}15`, border: `1px solid ${A2}30`, color: A2, padding: "4px 12px", borderRadius: 6, fontFamily: F1, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>DELETE</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "leaderboard" && (
            <div style={{ animation: "fadeSlideUp 0.3s ease-out" }}>
              <h3 style={{ fontFamily: F2, fontSize: 16, fontWeight: 700, color: T, margin: "0 0 20px" }}>Leaderboard Viewer</h3>
              <div className="ee-admin-search" style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <input style={{ ...inputStyle, flex: 1 }} value={lbStat} onChange={e => setLbStat(e.target.value)} placeholder="Statistic name (e.g. Gold)" />
                <button onClick={fetchLeaderboard} style={{ padding: "12px 24px", background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", borderRadius: 8, color: BG, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>LOAD</button>
              </div>
              {lbErr && <div style={{ color: A2, fontFamily: F1, fontSize: 13, marginBottom: 16 }}>❌ {lbErr}</div>}
              {lbData.length > 0 && (
                <div style={{ background: BG, borderRadius: 12, overflow: "hidden", border: `1px solid ${BD}` }}>
                  {lbData.map((p, i) => (
                    <div key={p.PlayFabId} style={{ display: "flex", padding: "14px 20px", borderBottom: i < lbData.length - 1 ? `1px solid ${BD}` : "none", alignItems: "center", gap: 16 }}>
                      <span style={{ fontFamily: F2, fontSize: 14, fontWeight: 800, color: p.Position < 3 ? A : TD, minWidth: 32 }}>{p.Position + 1}</span>
                      <span style={{ fontFamily: F1, fontSize: 14, color: T, flex: 1 }}>{p.DisplayName || "Anonymous"}</span>
                      <span style={{ fontFamily: F1, fontSize: 12, color: TD, flex: 1 }}>{p.PlayFabId}</span>
                      <span style={{ fontFamily: F2, fontSize: 14, color: WN, fontWeight: 700 }}>{p.StatValue.toLocaleString()} G</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "revenue" && (
            <div style={{ animation: "fadeSlideUp 0.3s ease-out" }}>
              <h3 style={{ fontFamily: F2, fontSize: 16, fontWeight: 700, color: T, margin: "0 0 20px" }}>Revenue Tracker</h3>
              {!revenueLoaded ? (
                <button onClick={loadRevenue} style={{ padding: "12px 24px", background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", borderRadius: 8, color: BG, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>LOAD REVENUE DATA</button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {gameRevenue && Object.entries(gameRevenue).map(([k, v]) => (
                    <div key={k}><label style={labelStyle}>{k}</label><input style={inputStyle} value={v} onChange={e => setGameRevenue(prev => ({ ...prev, [k]: e.target.value }))} /></div>
                  ))}
                  {revenueMsg && <div style={{ fontFamily: F1, fontSize: 13, color: revenueMsg.startsWith("✅") ? OK : A2 }}>{revenueMsg}</div>}
                  <button onClick={saveRevenue} style={{ alignSelf: "flex-start", padding: "10px 24px", background: `linear-gradient(135deg,${OK},${A})`, border: "none", borderRadius: 8, color: BG, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>SAVE</button>
                </div>
              )}
            </div>
          )}

          {activeTab === "logs" && (
            <div style={{ animation: "fadeSlideUp 0.3s ease-out" }}>
              <h3 style={{ fontFamily: F2, fontSize: 16, fontWeight: 700, color: T, margin: "0 0 20px" }}>Event Logs</h3>
              <button onClick={fetchLogs} style={{ padding: "10px 24px", background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", borderRadius: 8, color: BG, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 20 }}>LOAD LOGS</button>
              {logEntries.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {logEntries.map((log, i) => (
                    <div key={i} style={{ padding: "12px 16px", background: BG, borderRadius: 8, border: `1px solid ${BD}` }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontFamily: F2, fontSize: 10, color: A, fontWeight: 700 }}>{log.event}</span>
                        {log.time && <span style={{ fontFamily: F1, fontSize: 10, color: TD }}>{log.time}</span>}
                      </div>
                      <p style={{ fontFamily: F1, fontSize: 12, color: TD, margin: 0, lineHeight: 1.5 }}>{log.msg}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */
export default function EasyExpressSite() {
  const [authModal, setAuthModal] = useState(null);
  const [activeSection, setActiveSection] = useState("");
  const { toasts, addToast, removeToast } = useToasts();
  const [currentUser, setCurrentUser] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [ownsGame, setOwnsGame] = useState(false);
  const [sessionTicket, setSessionTicket] = useState(localStorage.getItem("ee_session_ticket") || null);
  const [playFabId, setPlayFabId] = useState(localStorage.getItem("ee_auth_pfid") || null);
  const [liveNews, setLiveNews] = useState(NEWS);
  const SPECIFIC_ADMIN_ACCOUNT = "masteradmin";
  const isAdmin = currentUser === SPECIFIC_ADMIN_ACCOUNT;
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [adminAuthed, setAdminAuthed] = useState(false);

  // Fetch live news on mount
  useEffect(() => {
    async function fetchLiveNews() {
      try {
        const titleData = await fetchTitleData(["GameNews"]);
        if (titleData.GameNews && titleData.GameNews.trim() !== "") {
          setLiveNews(JSON.parse(titleData.GameNews));
        }
      } catch (e) {
        console.error("Failed to load live news:", e);
      }
    }
    fetchLiveNews();
  }, []);

  // Handle PayMongo redirect back after payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");

    if (paymentStatus === "success") {
      window.history.replaceState({}, "", window.location.pathname + window.location.hash);
      setOwnsGame(true);
      addToast({
        type: "success",
        title: "Purchase Complete! 🎉",
        message: "Easy Express Full Game is now unlocked. Download the full version!",
        duration: 8000,
      });
    }
    if (paymentStatus === "cancelled") {
      window.history.replaceState({}, "", window.location.pathname + window.location.hash);
      addToast({
        type: "warning",
        title: "Payment Cancelled",
        message: "Your payment was not completed. No charge was made.",
        duration: 5000,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useScrollReveal();

  const handleLogout = () => {
    setCurrentUser(null);
    setSessionTicket(null);
    setPlayFabId(null);
    setShowAdmin(false);
    setAdminAuthed(false);
    setAdminKey("");
    setOwnsGame(false);
    localStorage.removeItem("ee_session_ticket");
    localStorage.removeItem("ee_auth_pfid");
    localStorage.removeItem("ee_auth_username");
    addToast({ type: "info", title: "Logged Out", message: "You have been logged out of the web portal." });
  };

  return (
    <ErrorBoundary>
      <div style={{ background: BG, color: T, minHeight: "100vh", fontFamily: F1 }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Orbitron:wght@700;800;900&display=swap');
          *,*::before,*::after{box-sizing:border-box;margin:0}
          html{scroll-behavior:smooth}
          body{background:${BG}}
          ::selection{background:${A}40;color:${T}}
          ::-webkit-scrollbar{width:6px}
          ::-webkit-scrollbar-track{background:${BG}}
          ::-webkit-scrollbar-thumb{background:${BD};border-radius:3px}
          ::-webkit-scrollbar-thumb:hover{background:${A}40}
          @keyframes fadeSlideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
          @keyframes fadeIn{from{opacity:0}to{opacity:1}}
          @keyframes modalSlideUp{from{opacity:0;transform:translateY(32px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
          @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(8px)}}
          @keyframes orbFloat{0%{transform:translate(0,0)}100%{transform:translate(30px,-20px)}}
          @keyframes successPop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
          @keyframes successCheck{from{opacity:0;transform:scale(0.5)}to{opacity:1;transform:scale(1)}}
          @keyframes toastTimer{from{width:100%}to{width:0%}}
          @keyframes serverPulse{0%,100%{opacity:1;box-shadow:0 0 6px ${OK},0 0 12px ${OK}40}50%{opacity:0.6;box-shadow:0 0 3px ${OK}}}
          input::placeholder{color:${TD}60}
          input:focus{border-color:${A} !important;box-shadow:0 0 0 3px ${A}12 !important}
          textarea::placeholder{color:${TD}60}
          textarea:focus{border-color:${A} !important;box-shadow:0 0 0 3px ${A}12 !important}
          select:focus{border-color:${A} !important;box-shadow:0 0 0 3px ${A}12 !important}
          .ee-reveal{opacity:0;transform:translateY(24px);transition:opacity 0.7s cubic-bezier(0.16,1,0.3,1),transform 0.7s cubic-bezier(0.16,1,0.3,1)}
          .ee-reveal.ee-visible{opacity:1;transform:translateY(0)}
          .ee-reveal.ee-stagger{transition-delay:calc(var(--stagger,0)*0.1s)}
          .ee-card-hover{transition:transform 0.35s cubic-bezier(0.16,1,0.3,1),border-color 0.35s,box-shadow 0.35s}
          .ee-card-hover:hover{transform:translateY(-6px);border-color:${A}40 !important;box-shadow:0 12px 40px ${BG}cc,0 0 20px ${A}10}
          .ee-gallery-hover{transition:transform 0.35s cubic-bezier(0.16,1,0.3,1),border-color 0.35s,box-shadow 0.35s}
          .ee-gallery-hover:hover{transform:translateY(-6px) scale(1.01);border-color:${WN}40 !important;box-shadow:0 16px 48px ${BG}cc}
          .ee-gallery-hover:hover .ee-gallery-thumb{transform:scale(1.05)}
          .ee-gallery-thumb{transition:transform 0.5s cubic-bezier(0.16,1,0.3,1)}
          .ee-news-hover{transition:transform 0.3s,border-color 0.3s,box-shadow 0.3s}
          .ee-news-hover:hover{transform:translateX(6px);border-color:${A}30 !important;box-shadow:0 8px 24px ${BG}bb}
          .ee-team-hover{transition:transform 0.35s cubic-bezier(0.16,1,0.3,1),border-color 0.35s,box-shadow 0.35s}
          .ee-team-hover:hover{transform:translateY(-6px);border-color:${PU}40 !important;box-shadow:0 12px 32px ${BG}cc}
          .ee-team-hover:hover .ee-team-avatar{transform:scale(1.1);box-shadow:0 0 16px ${PU}30}
          .ee-team-avatar{transition:transform 0.35s cubic-bezier(0.16,1,0.3,1),box-shadow 0.35s}
          .ee-faq-hover{transition:transform 0.25s,box-shadow 0.25s}
          .ee-faq-hover:hover{transform:translateX(4px);box-shadow:0 4px 16px ${BG}aa}
          .ee-lb-row{transition:background 0.25s,transform 0.25s}
          .ee-lb-row:hover{background:${CARD2} !important;transform:translateX(4px)}
          .ee-btn-glow{transition:transform 0.25s,box-shadow 0.35s,filter 0.25s}
          .ee-btn-glow:hover{transform:translateY(-2px);box-shadow:0 8px 28px ${A}35;filter:brightness(1.1)}
          .ee-btn-glow:active{transform:translateY(0);box-shadow:0 2px 8px ${A}20}
          .ee-btn-outline{transition:transform 0.2s,border-color 0.3s,color 0.3s,background 0.3s}
          .ee-btn-outline:hover{border-color:${A}60 !important;color:${A} !important;background:${A}08 !important;transform:translateY(-1px)}
          .ee-btn-danger{transition:transform 0.2s,box-shadow 0.3s,filter 0.2s}
          .ee-btn-danger:hover{transform:translateY(-2px);box-shadow:0 6px 20px ${A2}30;filter:brightness(1.15)}
          .ee-nav-links a{position:relative;transition:color 0.3s}
          .ee-nav-links a::after{content:'';position:absolute;bottom:-4px;left:0;width:0;height:2px;background:${A};border-radius:1px;transition:width 0.3s cubic-bezier(0.16,1,0.3,1)}
          .ee-nav-links a:hover::after{width:100%}
          .ee-nav-links a:hover{color:${A} !important}
          .ee-tab-btn{transition:all 0.25s cubic-bezier(0.16,1,0.3,1) !important}
          .ee-tab-btn:hover{transform:translateY(-2px);box-shadow:0 4px 12px ${BG}cc}
          .ee-spec-row{transition:background 0.25s,padding-left 0.25s}
          .ee-spec-row:hover{background:${CARD2}60;padding-left:28px !important}
          .ee-download-btn{position:relative;overflow:hidden;transition:transform 0.3s,box-shadow 0.4s}
          .ee-download-btn::before{content:'';position:absolute;top:50%;left:50%;width:0;height:0;background:rgba(255,255,255,0.15);border-radius:50%;transform:translate(-50%,-50%);transition:width 0.5s,height 0.5s}
          .ee-download-btn:hover{transform:translateY(-3px) scale(1.02);box-shadow:0 12px 40px ${A}40}
          .ee-download-btn:hover::before{width:300px;height:300px}
          .ee-download-btn:active{transform:translateY(0) scale(0.98)}
          .ee-footer-grid a{transition:color 0.25s,padding-left 0.25s}
          .ee-footer-grid a:hover{color:${A} !important;padding-left:6px}
          @media (max-width: 1024px) { .ee-how-it-plays { flex-direction: column !important; } .ee-footer-grid { flex-direction: column !important; gap: 24px !important; } }
          @media (max-width: 768px) { .ee-nav-links { display: none !important; } .ee-hamburger { display: flex !important; align-items: center; justify-content: center; } .ee-auth-modal { flex-direction: column !important; max-width: 95vw !important; min-height: auto !important; max-height: 90vh !important; } .ee-auth-sidebar { display: none !important; } .ee-news-item { flex-direction: column !important; gap: 10px !important; } .ee-news-header { flex-direction: column !important; gap: 4px !important; } .ee-spec-row { flex-direction: column !important; gap: 4px !important; align-items: flex-start !important; } .ee-grid-4 { grid-template-columns: 1fr !important; } .ee-grid-team { grid-template-columns: repeat(2, 1fr) !important; } .ee-admin-search { flex-direction: column !important; } .ee-admin-tabs { flex-direction: column !important; } .ee-data-grid { grid-template-columns: 1fr !important; } .ee-form-row { grid-template-columns: 1fr !important; } }
          @media (max-width: 480px) { .ee-grid-team { grid-template-columns: 1fr !important; } }
        `}</style>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <Nav onAuth={setAuthModal} activeSection={activeSection} isAdmin={isAdmin} onAdminToggle={() => setShowAdmin(!showAdmin)} showAdmin={showAdmin} currentUser={currentUser} onLogout={handleLogout} />
        
        <Hero
          onAuth={setAuthModal}
          ownsGame={ownsGame}
          onBuyClick={() => {
            if (!currentUser) {
              addToast({ type: "info", title: "Login Required", message: "Please log in or create an account before purchasing.", duration: 4000 });
              setAuthModal("login");
            } else {
              setShowCheckout(true);
            }
          }}
        />

        <Features />
        <Scenarios />
        <GallerySection />
        <NewsSection liveNews={liveNews} />
        <PublicLeaderboards />
        <SystemRequirements />
        <FaqSection />
        <SupportSection addToast={addToast} />
        <About />
        <Footer />

        {authModal && (
          <AuthModal
            mode={authModal}
            setMode={setAuthModal}
            onClose={() => setAuthModal(null)}
            addToast={addToast}
            liveNews={liveNews}
            onLoginSuccess={(username, ticket, pfId) => {
              setCurrentUser(username);
              setSessionTicket(ticket);
              setPlayFabId(pfId);
              setAuthModal(null);
              if (ticket) localStorage.setItem("ee_session_ticket", ticket);
              if (pfId)   localStorage.setItem("ee_auth_pfid", pfId);
              if (username) localStorage.setItem("ee_auth_username", username);
              if (ticket) {
                checkFullGameOwnership(ticket).then(owned => {
                  if (owned) setOwnsGame(true);
                }).catch(() => {});
              }
            }}
          />
        )}

        {showCheckout && (
          <CheckoutModal
            onClose={() => setShowCheckout(false)}
            onSuccess={() => setOwnsGame(true)}
            addToast={addToast}
            sessionTicket={sessionTicket}
            playFabId={playFabId}
          />
        )}

        {showAdmin && isAdmin && (
          <AdminDashboard
            addToast={addToast}
            onClose={() => setShowAdmin(false)}
            adminKey={adminKey}
            setAdminKey={setAdminKey}
            authed={adminAuthed}
            setAuthed={setAdminAuthed}
            liveNews={liveNews}
            onNewsUpdated={setLiveNews}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
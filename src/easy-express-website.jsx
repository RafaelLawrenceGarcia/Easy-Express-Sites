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
    // Reuse an already-cached session ticket so we never do a concurrent
    // LoginWithCustomID that could collide with the leaderboard guest login.
    let ticket = localStorage.getItem("ee_session_ticket")
               || sessionStorage.getItem("ee_session_ticket")
               || sessionStorage.getItem("ee_lb_ticket");

    if (!ticket) {
      // No cached ticket — generate a download-specific guest ID so it never
      // clashes with the leaderboard guest ID (ee_guest_id).
      const dlId = "DL_" + Math.random().toString(36).slice(2) + "_" + Date.now();
      const loginRes = await fetch(`${PLAYFAB_BASE}/Client/LoginWithCustomID`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ TitleId: PLAYFAB_TITLE_ID, CustomId: dlId, CreateAccount: true })
      });
      const loginJson = await loginRes.json();
      if (loginJson.code !== 200) return;
      ticket = loginJson.data.SessionTicket;
    }

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
        // Use a random ID per check + CreateAccount:false — never creates a real
        // player, so two visitors can never clash on the same account.
        const pingId = "Ping_" + Math.random().toString(36).slice(2);
        const res = await fetch(`${PLAYFAB_BASE}/Client/LoginWithCustomID`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ TitleId: PLAYFAB_TITLE_ID, CustomId: pingId, CreateAccount: false })
        });
        const json = await res.json();
        // Any valid PlayFab JSON response (200 or 400/error) means the server is up
        if (!cancelled) setStatus(json.code || json.errorCode ? "online" : "offline");
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
function Hero({ onAuth, ownsGame, onBuyClick, currentUser }) {
  const handleDownload = (isFull) => {
    trackDownload();
    const url = isFull
      ? "https://your-cdn.com/EasyExpress_Full_Setup.exe"
      : "https://your-cdn.com/EasyExpress_Demo_Setup.exe";
    window.open(url, "_blank");
  };

  return (
    <section id="hero" style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "stretch", overflow: "hidden" }}>

      {/* ── Right side: game screenshot background ── */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url('/gallery/Shopinterior.png')",
        backgroundSize: "cover", backgroundPosition: "center right",
        zIndex: 0,
      }} />
      {/* Diagonal dark overlay — covers left 60%, fades diagonally to the right */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: `linear-gradient(105deg, ${BG} 0%, ${BG} 48%, ${BG}cc 58%, ${BG}66 70%, transparent 85%)`,
      }} />
      {/* Bottom fade so sections below blend in */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 220, zIndex: 2, background: `linear-gradient(to top, ${BG}, transparent)` }} />
      {/* Subtle top vignette */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 120, zIndex: 2, background: `linear-gradient(to bottom, ${BG}cc, transparent)` }} />

      {/* Glow accents */}
      <GlowOrb color={A}  size="420px" top="10%"  left="-8%"  />
      <GlowOrb color={PU} size="320px" top="55%"  left="5%"   delay={4} />
      <GlowOrb color={A2} size="260px" top="30%"  left="50%"  delay={2} />
      <CircuitBG />

      {/* ── Left side: content ── */}
      <div style={{ position: "relative", zIndex: 3, display: "flex", flexDirection: "column", justifyContent: "center", padding: "130px clamp(1.5rem,6vw,5rem) 100px", maxWidth: 720, width: "100%" }}>

        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 20, background: `${A}12`, border: `1px solid ${A}30`, color: A, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 28, fontFamily: F1, width: "fit-content", animation: "fadeSlideUp 0.8s ease-out both" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: A, boxShadow: `0 0 8px ${A}` }} />
          {"A 4R THESIS PROJECT · NOW IN BETA"}
        </div>

        {/* Title */}
        <h1 style={{ fontFamily: F2, fontSize: "clamp(2.6rem,6vw,5rem)", fontWeight: 900, lineHeight: 1.05, color: T, margin: "0 0 8px", animation: "fadeSlideUp 0.8s ease-out 0.1s both" }}>
          {"YOUR DREAM"}
        </h1>
        <h1 style={{ fontFamily: F2, fontSize: "clamp(2.6rem,6vw,5rem)", fontWeight: 900, lineHeight: 1.05, background: `linear-gradient(90deg,${A},#00b8d4)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "0 0 8px", animation: "fadeSlideUp 0.8s ease-out 0.18s both" }}>
          {"TECH SHOP"}
        </h1>
        <h1 style={{ fontFamily: F2, fontSize: "clamp(2.6rem,6vw,5rem)", fontWeight: 900, lineHeight: 1.05, color: T, margin: "0 0 28px", animation: "fadeSlideUp 0.8s ease-out 0.26s both" }}>
          {"STARTS HERE"}
        </h1>

        <p style={{ color: TD, fontSize: "clamp(0.95rem,1.6vw,1.15rem)", maxWidth: 520, lineHeight: 1.75, margin: "0 0 36px", fontFamily: F1, animation: "fadeSlideUp 0.8s ease-out 0.34s both" }}>
          Build PCs. Run a shop. Diagnose real hardware problems.{" "}
          <span style={{ color: T, fontWeight: 600 }}>Easy Express</span> is the PC shop simulator that teaches you everything from thermal paste to profit margins.
        </p>

        {/* CTA buttons */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", animation: "fadeSlideUp 0.8s ease-out 0.44s both" }}>
          {ownsGame ? (
            <button onClick={() => handleDownload(true)} className="ee-download-btn" style={{ background: `linear-gradient(135deg,${OK},${A})`, border: "none", color: BG, padding: "15px 34px", borderRadius: 10, fontFamily: F1, fontWeight: 800, fontSize: 15, cursor: "pointer", letterSpacing: 1, boxShadow: `0 0 32px ${OK}35`, display: "flex", alignItems: "center", gap: 10 }}>
              ⬇ DOWNLOAD FULL VERSION <span style={{ fontSize: 10, opacity: 0.7 }}>Windows .exe</span>
            </button>
          ) : (
            <>
              <button onClick={() => handleDownload(false)} className="ee-download-btn" style={{ background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", color: BG, padding: "15px 34px", borderRadius: 10, fontFamily: F1, fontWeight: 800, fontSize: 15, cursor: "pointer", letterSpacing: 1, boxShadow: `0 0 32px ${A}35`, display: "flex", alignItems: "center", gap: 10 }}>
                ⬇ DOWNLOAD DEMO <span style={{ fontSize: 10, opacity: 0.7 }}>Free · Windows</span>
              </button>
              <button onClick={onBuyClick} className="ee-btn-glow" style={{ background: `linear-gradient(135deg,${PU},${A2})`, border: "none", color: T, padding: "15px 28px", borderRadius: 10, fontFamily: F1, fontWeight: 800, fontSize: 14, cursor: "pointer", letterSpacing: 1, boxShadow: `0 0 28px ${PU}28`, display: "flex", alignItems: "center", gap: 8 }}>
                🛒 BUY FULL GAME <span style={{ fontSize: 13, fontWeight: 700, color: A }}>₱299</span>
              </button>
            </>
          )}
          {!currentUser && (
            <button onClick={() => onAuth("signup")} className="ee-btn-outline" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BD}`, color: T, padding: "15px 28px", borderRadius: 10, fontFamily: F1, fontWeight: 700, fontSize: 14, cursor: "pointer", letterSpacing: 1, backdropFilter: "blur(8px)" }}>
              CREATE ACCOUNT
            </button>
          )}
        </div>

        {!ownsGame && (
          <div style={{ marginTop: 16, display: "inline-flex", padding: "7px 16px", borderRadius: 20, background: `${PU}10`, border: `1px solid ${PU}25`, width: "fit-content", animation: "fadeSlideUp 0.8s ease-out 0.52s both" }}>
            <span style={{ fontFamily: F1, fontSize: 12, color: TD }}>Demo: 2 scenarios. </span>
            <span style={{ fontFamily: F1, fontSize: 12, color: PU, fontWeight: 700 }}>&nbsp;Full game: 12+ scenarios + shop + leaderboards.</span>
          </div>
        )}

        {/* Stats row */}
        <div style={{ marginTop: 40, display: "flex", gap: 32, flexWrap: "wrap", animation: "fadeSlideUp 0.8s ease-out 0.58s both" }}>
          {[{ icon: "🖥", val: "Windows 10/11" }, { icon: "🎓", val: "CS Thesis Project" }, { icon: "💰", val: ownsGame ? "Full Version" : "Demo Free / Full ₱299" }].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <span style={{ fontFamily: F1, fontSize: 13, fontWeight: 600, color: TD }}>{s.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll hint */}
      <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 3, animation: "bounce 2s ease-in-out infinite", color: TD, fontSize: 22 }}>↓</div>
    </section>
  );
}

function Features() {
  const STAT_ROW = [
    { val: "20+", label: "PC Components", color: A },
    { val: "5+",  label: "Game Scenarios", color: WN },
    { val: "4",   label: "Core Mechanics", color: PU },
    { val: "∞",   label: "Replayability",  color: OK },
  ];
  return (
    <section id="features" style={{ position: "relative", padding: "100px clamp(1rem,4vw,3rem)", maxWidth: 1200, margin: "0 auto" }}>
      {/* Section header */}
      <div className="ee-reveal" style={{ textAlign: "center", marginBottom: 64 }}>
        <span style={{ color: A, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>WHAT YOU WILL DO</span>
        <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 800, color: T, margin: "12px 0 16px" }}>Learn. Manage. Fix. Repeat.</h2>
        <p style={{ color: TD, maxWidth: 560, margin: "0 auto", lineHeight: 1.7, fontFamily: F1, fontSize: 15 }}>Easy Express is a hands-on crash course in PC hardware, retail operations, and technical problem-solving.</p>
      </div>

      {/* Stats strip */}
      <div className="ee-reveal" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, marginBottom: 48, background: BD, borderRadius: 16, overflow: "hidden", border: `1px solid ${BD}` }}>
        {STAT_ROW.map((s, i) => (
          <div key={i} style={{ background: CARD, padding: "24px 20px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${s.color},transparent)` }} />
            <div style={{ fontFamily: F2, fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 900, color: s.color, marginBottom: 4 }}>{s.val}</div>
            <div style={{ fontFamily: F1, fontSize: 11, color: TD, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Feature cards — forced 2×2 grid */}
      <div className="ee-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
        {FEATURES.map((f, i) => (
          <div key={i} className="ee-reveal ee-stagger ee-card-hover" style={{
            "--stagger": i, background: CARD, borderRadius: 16,
            padding: "32px 28px", cursor: "default", position: "relative", overflow: "hidden",
            border: `1px solid ${BD}`,
          }}>
            {/* Colored top bar */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: [
              `linear-gradient(90deg,${A},transparent)`,
              `linear-gradient(90deg,${WN},transparent)`,
              `linear-gradient(90deg,${A2},transparent)`,
              `linear-gradient(90deg,${PU},transparent)`,
            ][i % 4] }} />
            {/* Tag */}
            <span style={{ position: "absolute", top: 16, right: 16, fontSize: 10, fontWeight: 800, letterSpacing: 2, color: [A,WN,A2,PU][i%4], fontFamily: F1, background: `${[A,WN,A2,PU][i%4]}14`, padding: "3px 10px", borderRadius: 4 }}>{f.tag}</span>
            {/* Icon */}
            <div style={{ width: 56, height: 56, borderRadius: 14, background: `${[A,WN,A2,PU][i%4]}12`, border: `1px solid ${[A,WN,A2,PU][i%4]}25`, display: "grid", placeItems: "center", marginBottom: 20, fontSize: 26 }}>{f.icon}</div>
            <h3 style={{ fontFamily: F2, fontSize: 17, fontWeight: 700, color: T, margin: "0 0 10px" }}>{f.title}</h3>
            <p style={{ color: TD, fontSize: 14, lineHeight: 1.75, fontFamily: F1, margin: 0 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Scenarios() {
  const ICONS = ["💀", "🔧", "🌡️", "⚡"];
  return (
    <section id="scenarios" style={{ position: "relative", padding: "100px clamp(1rem,4vw,3rem)", background: `linear-gradient(180deg,transparent 0%,${CARD}50 50%,transparent 100%)` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="ee-reveal" style={{ textAlign: "center", marginBottom: 64 }}>
          <span style={{ color: A2, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>THE SIMULATION</span>
          <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 800, color: T, margin: "12px 0 16px" }}>Real Problems. Real Fixes.</h2>
          <p style={{ color: TD, maxWidth: 560, margin: "0 auto", lineHeight: 1.7, fontFamily: F1, fontSize: 15 }}>Every customer walks in with a unique hardware headache. Your job? Figure it out, hands-on.</p>
        </div>

        {/* Horizontal scenario cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {SCENARIOS.map((s, i) => (
            <div key={i} className="ee-reveal ee-stagger ee-card-hover" style={{
              "--stagger": i, background: CARD, border: `1px solid ${BD}`,
              borderRadius: 16, padding: "28px 32px", position: "relative", overflow: "hidden",
              display: "flex", alignItems: "center", gap: 28,
            }}>
              {/* Left accent bar */}
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg,${s.color},${s.color}40)` }} />
              {/* Number badge */}
              <div style={{ flexShrink: 0, width: 64, height: 64, borderRadius: 16, background: `${s.color}12`, border: `2px solid ${s.color}30`, display: "grid", placeItems: "center", fontSize: 26 }}>
                {ICONS[i]}
              </div>
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                  <span style={{ fontFamily: F2, fontSize: 10, fontWeight: 900, color: s.color, letterSpacing: 2, background: `${s.color}14`, padding: "3px 10px", borderRadius: 4 }}>SCENARIO {String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 style={{ fontFamily: F2, fontSize: 17, fontWeight: 700, color: T, margin: "0 0 6px" }}>{s.title}</h3>
                <p style={{ color: TD, fontSize: 13, lineHeight: 1.6, fontFamily: F1, margin: 0 }}>{s.desc}</p>
              </div>
              {/* Right glow */}
              <div style={{ position: "absolute", right: -40, top: "50%", transform: "translateY(-50%)", width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle, ${s.color}12 0%, transparent 70%)`, pointerEvents: "none" }} />
            </div>
          ))}
        </div>

        {/* How It Plays — redesigned */}
        <div className="ee-how-it-plays ee-reveal" style={{ marginTop: 40, borderRadius: 20, overflow: "hidden", border: `1px solid ${BD}`, display: "flex", flexWrap: "wrap" }}>
          <div style={{ flex: 2, minWidth: 280, background: CARD2, padding: "40px 40px", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${A},${PU},transparent)` }} />
            <div style={{ fontFamily: F2, fontSize: 11, color: A, fontWeight: 700, letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>🎮 How It Plays</div>
            <h3 style={{ fontFamily: F2, fontSize: 22, fontWeight: 800, color: T, margin: "0 0 14px", lineHeight: 1.2 }}>First-Person<br />PC Shop Sim</h3>
            <p style={{ color: TD, fontSize: 14, lineHeight: 1.8, fontFamily: F1, margin: 0, maxWidth: 480 }}>Walk around your shop in first-person. Pick up boxes, unpack PCs onto workstations, open cases and swap out faulty components. Interact with NPCs on the street to attract new customers, then manage orders through your in-shop computer OS.</p>
          </div>
          <div style={{ flex: 1, minWidth: 200, background: `linear-gradient(135deg,${CARD}cc,${BG}cc)`, padding: "40px 32px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
            {[{ v: "20+", l: "PC Components", c: A }, { v: "5+", l: "Scenarios", c: WN }, { v: "∞", l: "Replayability", c: PU }].map((s) => (
              <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontFamily: F2, fontSize: 28, fontWeight: 900, color: s.c, minWidth: 60 }}>{s.v}</div>
                <div>
                  <div style={{ fontFamily: F1, fontSize: 12, color: T, fontWeight: 700 }}>{s.l}</div>
                  <div style={{ width: 40, height: 2, background: s.c, borderRadius: 1, marginTop: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function GallerySection() {
  const [lightbox, setLightbox] = useState(null); // the clicked item
  const modalVideoRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [lightbox]);

  return (
    <section id="gallery" style={{ padding: "100px clamp(1rem,4vw,3rem)", maxWidth: 1200, margin: "0 auto" }}>
      <div className="ee-reveal" style={{ textAlign: "center", marginBottom: 64 }}>
        <span style={{ color: WN, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>MEDIA</span>
        <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, color: T, margin: "12px 0 16px" }}>Gallery</h2>
        <p style={{ color: TD, maxWidth: 520, margin: "0 auto", lineHeight: 1.7, fontFamily: F1, fontSize: 15 }}>Screenshots and footage from the Easy Express beta. See the shop, the builds, and the chaos.</p>
      </div>

      <div className="ee-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
        {GALLERY_ITEMS.map((item, i) => (
          <div
            key={i}
            className="ee-reveal ee-stagger"
            style={{
              "--stagger": i, background: CARD, border: `1px solid ${BD}`,
              borderRadius: 14, overflow: "hidden", cursor: "pointer",
              transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1), border-color 0.35s, box-shadow 0.35s",
            }}
            onClick={() => setLightbox(item)}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "scale(1.04)";
              e.currentTarget.style.borderColor = `${WN}60`;
              e.currentTarget.style.boxShadow = `0 20px 60px ${BG}cc, 0 0 30px ${WN}18`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.borderColor = BD;
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div className="ee-gallery-thumb" style={{ height: 180, position: "relative", overflow: "hidden" }}>
              {item.type === "video" ? (
                <video src={item.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
              ) : (
                <img src={item.src} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s cubic-bezier(0.16,1,0.3,1)" }} />
              )}
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.28)", display: "grid", placeItems: "center" }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: `2px solid ${item.type === "video" ? A : WN}`, display: "grid", placeItems: "center" }}>
                  <span style={{ color: item.type === "video" ? A : WN, fontSize: 18, marginLeft: item.type === "video" ? 3 : 0 }}>
                    {item.type === "video" ? "▶" : "⤢"}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ padding: "20px 20px 24px" }}>
              <h3 style={{ fontFamily: F2, fontSize: 14, fontWeight: 700, color: T, margin: "0 0 6px" }}>{item.title}</h3>
              <p style={{ color: TD, fontSize: 12, lineHeight: 1.6, fontFamily: F1, margin: 0 }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Fullscreen Lightbox ── */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.96)", backdropFilter: "blur(14px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.2s ease-out" }}
        >
          {/* X button */}
          <button
            onClick={() => setLightbox(null)}
            style={{ position: "fixed", top: 20, right: 24, width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: `1px solid rgba(255,255,255,0.2)`, color: T, fontSize: 20, cursor: "pointer", display: "grid", placeItems: "center", zIndex: 401, transition: "background 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = A2 + "99"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
          >✕</button>

          {/* Title + desc */}
          <div style={{ textAlign: "center", marginBottom: 16, zIndex: 401 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: F2, fontSize: 16, fontWeight: 700, color: T, marginBottom: 4 }}>{lightbox.title}</div>
            <div style={{ fontFamily: F1, fontSize: 13, color: TD }}>{lightbox.desc}</div>
          </div>

          {/* Media */}
          <div onClick={e => e.stopPropagation()} style={{ width: "95vw", maxWidth: 1100, maxHeight: "82vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {lightbox.type === "video" ? (
              <video
                ref={modalVideoRef}
                key={lightbox.src}
                src={lightbox.src}
                controls
                autoPlay
                onLoadedMetadata={() => { if (modalVideoRef.current) { modalVideoRef.current.muted = false; modalVideoRef.current.volume = 1; } }}
                style={{ width: "100%", maxHeight: "82vh", borderRadius: 12, boxShadow: `0 0 80px ${A}25`, display: "block" }}
              />
            ) : (
              <img
                src={lightbox.src}
                alt={lightbox.title}
                style={{ maxWidth: "100%", maxHeight: "82vh", borderRadius: 12, boxShadow: `0 0 80px ${WN}20`, display: "block", objectFit: "contain" }}
              />
            )}
          </div>

          <div style={{ marginTop: 14, fontFamily: F1, fontSize: 11, color: TD, opacity: 0.6 }}>Press ESC or click outside to close</div>
        </div>
      )}
    </section>
  );
}
  
function NewsSection({ liveNews }) {
  const displayNews = liveNews && liveNews.length > 0 ? liveNews : NEWS;

  // Re-observe reveal elements whenever the news list changes.
  // useScrollReveal only runs once on mount, so dynamically added items
  // (e.g. from the admin panel) would stay invisible without this.
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
      { threshold: 0.1, rootMargin: "0px 0px -20px 0px" }
    );
    // Only target cards inside the news section
    document.querySelectorAll("#news .ee-reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [displayNews]);
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

function PublicLeaderboards({ sessionTicket: propTicket, currentUser }) {
  const PAGE_SIZE = 25;
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const [myRank, setMyRank] = useState(null);   // { Position, StatValue, DisplayName }
  const [sessionTicket, setSessionTicket] = useState(
    () => propTicket || sessionStorage.getItem("ee_lb_ticket") || null
  );
  const isLoggedIn = !!propTicket;

  // ── Guest login if needed ──────────────────────────────────────────────────
  useEffect(() => {
    if (sessionTicket) return;
    let cancelled = false;
    async function silentLogin(attempt = 0) {
      let guestId = localStorage.getItem("ee_guest_id");
      if (!guestId) {
        guestId = "WebGuest_" + Math.random().toString(36).slice(2) + Date.now();
        localStorage.setItem("ee_guest_id", guestId);
      }
      try {
        const loginRes = await fetch(
          `https://${PLAYFAB_TITLE_ID}.playfabapi.com/Client/LoginWithCustomID`,
          { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ TitleId: PLAYFAB_TITLE_ID, CustomId: guestId, CreateAccount: true }) }
        );
        const loginJson = await loginRes.json();
        if (cancelled) return;
        if (loginJson.code === 200) {
          sessionStorage.setItem("ee_lb_ticket", loginJson.data.SessionTicket);
          setSessionTicket(loginJson.data.SessionTicket);
        } else if (loginJson.errorCode === 1227 && attempt < 3) {
          setTimeout(() => silentLogin(attempt + 1), 800 + Math.random() * 600);
        } else {
          if (!cancelled) { setError(`Login Failed: ${loginJson.errorMessage}`); setIsLoading(false); }
        }
      } catch (e) {
        if (!cancelled) { setError(`Network Error: ${e.message}`); setIsLoading(false); }
      }
    }
    const t = setTimeout(() => silentLogin(), Math.random() * 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (propTicket && propTicket !== sessionTicket) setSessionTicket(propTicket);
  }, [propTicket]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initial fetch: top 25 + personal rank ─────────────────────────────────
  useEffect(() => {
    if (!sessionTicket) return;
    let cancelled = false;

    async function fetchAll() {
      setIsLoading(true); setError(null);
      try {
        // Step 1: fetch the top list
        const lbRes = await fetch(`https://${PLAYFAB_TITLE_ID}.playfabapi.com/Client/GetLeaderboard`, {
          method: "POST", headers: { "Content-Type": "application/json", "X-Authorization": sessionTicket },
          body: JSON.stringify({ StatisticName: "Gold", StartPosition: 0, MaxResultsCount: PAGE_SIZE })
        });
        const lbJson = await lbRes.json();
        if (cancelled) return;
        if (lbJson.code !== 200) { setError(`Data Error: ${lbJson.errorMessage}`); return; }
        const rows = lbJson.data.Leaderboard || [];
        setLeaderboard(rows);
        setHasMore(rows.length === PAGE_SIZE);

        // Step 2: personal rank — runs AFTER the top list is done, never concurrent
        // Also wrapped in its own try/catch so a failure here never breaks the board
        if (isLoggedIn && !cancelled) {
          try {
            // Small gap so PlayFab doesn't see two requests from the same player at once
            await new Promise(r => setTimeout(r, 300));
            if (cancelled) return;
            const myRes = await fetch(`https://${PLAYFAB_TITLE_ID}.playfabapi.com/Client/GetLeaderboardAroundPlayer`, {
              method: "POST", headers: { "Content-Type": "application/json", "X-Authorization": sessionTicket },
              body: JSON.stringify({ StatisticName: "Gold", MaxResultsCount: 1 })
            });
            const myJson = await myRes.json();
            if (!cancelled && myJson.code === 200 && myJson.data?.Leaderboard?.length) {
              const me = myJson.data.Leaderboard.find(p => p.PlayFabId === myJson.data.PlayFabId)
                       || myJson.data.Leaderboard[Math.floor(myJson.data.Leaderboard.length / 2)];
              if (me) setMyRank(me);
            }
          } catch { /* personal rank failure is non-fatal — board still shows */ }
        }
      } catch (e) {
        if (!cancelled) setError(`Fetch Error: ${e.message}`);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    // Delay the whole fetch so EasyExpressSite's re-verify useEffect (checkFullGameOwnership)
    // can finish first. Without this, all three PlayFab calls share the same ticket at the
    // same millisecond → PlayFab error 1227 (concurrent edit conflict).
    const delay = isLoggedIn ? 650 : Math.random() * 400;
    const t = setTimeout(fetchAll, delay);
    return () => { cancelled = true; clearTimeout(t); };
  }, [sessionTicket, isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load more ──────────────────────────────────────────────────────────────
  const loadMore = async () => {
    if (!sessionTicket || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const nextStart = leaderboard.length;
      const res = await fetch(`https://${PLAYFAB_TITLE_ID}.playfabapi.com/Client/GetLeaderboard`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-Authorization": sessionTicket },
        body: JSON.stringify({ StatisticName: "Gold", StartPosition: nextStart, MaxResultsCount: PAGE_SIZE })
      });
      const json = await res.json();
      if (json.code === 200) {
        const newRows = json.data.Leaderboard || [];
        setLeaderboard(prev => [...prev, ...newRows]);
        setHasMore(newRows.length === PAGE_SIZE);
      }
    } catch (e) { /* silent */ }
    finally { setIsLoadingMore(false); }
  };

  const MEDALS = ["🥇", "🥈", "🥉"];
  const MEDAL_COLORS = [WN, "#b0b8c8", "#cd7f32"];

  // Is the logged-in player already visible in the top list?
  const myRankVisibleInList = myRank && leaderboard.some(p => p.PlayFabId === myRank.PlayFabId);

  return (
    <section id="leaderboards" style={{ padding: "100px clamp(1rem,4vw,3rem)", maxWidth: 900, margin: "0 auto" }}>
      <div className="ee-reveal" style={{ textAlign: "center", marginBottom: 48 }}>
        <span style={{ color: A, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>RANKINGS</span>
        <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, color: T, margin: "12px 0 16px" }}>Global Leaderboards</h2>
        <p style={{ color: TD, fontSize: 13, fontFamily: F1, lineHeight: 1.6 }}>💰 Top Wealth — who's stacking the most gold?</p>
      </div>

      {/* ── Your Rank card (logged-in only) ── */}
      {isLoggedIn && myRank && !myRankVisibleInList && (
        <div style={{ marginBottom: 20, padding: "18px 24px", background: `linear-gradient(135deg,${A}10,${PU}08)`, border: `1px solid ${A}30`, borderRadius: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${A}18`, border: `1px solid ${A}30`, display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0 }}>🧑‍💻</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F2, fontSize: 10, color: A, fontWeight: 700, letterSpacing: 2, marginBottom: 3 }}>YOUR RANK</div>
            <div style={{ fontFamily: F1, fontSize: 14, color: T, fontWeight: 700 }}>{myRank.DisplayName || currentUser || "You"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: F2, fontSize: 22, fontWeight: 900, color: A }}>#{myRank.Position + 1}</div>
            <div style={{ fontFamily: F1, fontSize: 12, color: WN, fontWeight: 700 }}>{(myRank.StatValue || 0).toLocaleString()} G</div>
          </div>
          <div style={{ fontFamily: F1, fontSize: 11, color: TD, width: "100%", marginTop: -4 }}>
            You're not in the top {leaderboard.length} yet — keep playing to climb the board!
          </div>
        </div>
      )}
      {isLoggedIn && myRank && myRankVisibleInList && (
        <div style={{ marginBottom: 20, padding: "12px 20px", background: `${A}08`, border: `1px solid ${A}25`, borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>✓</span>
          <span style={{ fontFamily: F1, fontSize: 13, color: A, fontWeight: 700 }}>You're on the board! Rank #{myRank.Position + 1} — {(myRank.StatValue || 0).toLocaleString()} G</span>
        </div>
      )}

      {/* ── Main leaderboard card ── */}
      <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 20, overflow: "hidden", boxShadow: `0 24px 48px ${BG}ee` }}>
        <div style={{ height: 3, background: `linear-gradient(90deg,${WN},${A},transparent)` }} />
        {error ? (
          <div style={{ padding: 60, textAlign: "center", color: A2, fontFamily: F1, fontSize: 13, lineHeight: 1.7 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>{error}
          </div>
        ) : isLoading || !sessionTicket ? (
          <div style={{ padding: 60, textAlign: "center", color: TD, fontFamily: F1, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ width: 32, height: 32, border: `3px solid ${A}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
            Loading rankings...
          </div>
        ) : leaderboard.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: TD, fontFamily: F1 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>No players on the board yet. Be the first!
          </div>
        ) : (
          <div>
            {/* Top 3 podium */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 1, background: BD }}>
              {leaderboard.slice(0, 3).map((p, i) => (
                <div key={p.PlayFabId} style={{ background: i === 0 ? `linear-gradient(160deg,${WN}10,${CARD})` : CARD, padding: "28px 24px", textAlign: "center", position: "relative" }}>
                  {i === 0 && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,transparent,${WN},transparent)` }} />}
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{MEDALS[i]}</div>
                  <div style={{ fontFamily: F2, fontSize: i === 0 ? 15 : 13, fontWeight: 800, color: i === 0 ? WN : MEDAL_COLORS[i], marginBottom: 4 }}>{p.DisplayName || "Anonymous"}</div>
                  <div style={{ fontFamily: F2, fontSize: i === 0 ? 22 : 18, fontWeight: 900, color: T }}>{p.StatValue.toLocaleString()}<span style={{ fontSize: 12, color: WN, marginLeft: 4 }}>G</span></div>
                </div>
              ))}
            </div>

            {/* Ranks 4+ table */}
            {leaderboard.length > 3 && (
              <div>
                <div style={{ display: "flex", padding: "12px 24px", background: CARD2, borderTop: `1px solid ${BD}` }}>
                  <span style={{ flex: 0.5, fontFamily: F2, fontSize: 9, fontWeight: 700, color: TD, letterSpacing: 1.5 }}>RANK</span>
                  <span style={{ flex: 2, fontFamily: F2, fontSize: 9, fontWeight: 700, color: TD, letterSpacing: 1.5 }}>PLAYER</span>
                  <span style={{ flex: 1, fontFamily: F2, fontSize: 9, fontWeight: 700, color: TD, letterSpacing: 1.5, textAlign: "right" }}>GOLD</span>
                </div>
                {leaderboard.slice(3).map((p) => {
                  const isMe = myRank && p.PlayFabId === myRank.PlayFabId;
                  return (
                    <div key={p.PlayFabId} className="ee-lb-row" style={{ display: "flex", padding: "16px 24px", borderTop: `1px solid ${BD}`, alignItems: "center", background: isMe ? `${A}07` : "transparent" }}>
                      <span style={{ flex: 0.5, fontFamily: F2, fontSize: 14, fontWeight: 800, color: isMe ? A : TD }}>#{p.Position + 1}</span>
                      <span style={{ flex: 2, fontFamily: F1, fontSize: 14, color: isMe ? A : T, fontWeight: isMe ? 800 : 600 }}>
                        {p.DisplayName || "Anonymous"}{isMe && <span style={{ fontFamily: F1, fontSize: 10, color: A, marginLeft: 8, background: `${A}18`, padding: "2px 8px", borderRadius: 4 }}>YOU</span>}
                      </span>
                      <span style={{ flex: 1, color: WN, fontFamily: F2, fontWeight: 700, textAlign: "right", fontSize: 13 }}>{p.StatValue.toLocaleString()} G</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Load More button */}
            {hasMore && (
              <div style={{ padding: "20px 24px", borderTop: `1px solid ${BD}`, textAlign: "center" }}>
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="ee-btn-outline"
                  style={{ padding: "11px 32px", background: "transparent", border: `1px solid ${A}40`, color: A, borderRadius: 10, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: isLoadingMore ? "not-allowed" : "pointer", letterSpacing: 1, display: "inline-flex", alignItems: "center", gap: 8, opacity: isLoadingMore ? 0.6 : 1 }}
                >
                  {isLoadingMore ? (
                    <><div style={{ width: 14, height: 14, border: `2px solid ${A}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Loading...</>
                  ) : (
                    `↓ Load More (showing ${leaderboard.length})`
                  )}
                </button>
              </div>
            )}
            {!hasMore && leaderboard.length > 3 && (
              <div style={{ padding: "14px 24px", borderTop: `1px solid ${BD}`, textAlign: "center" }}>
                <span style={{ fontFamily: F1, fontSize: 11, color: TD }}>All {leaderboard.length} ranked players shown</span>
              </div>
            )}
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
  const icons  = { os: "🪟", cpu: "⚡", ram: "💾", gpu: "🖥", storage: "📀", dx: "🎮" };
  const specKeys = Object.keys(specs);
  return (
    <section id="specs" style={{ padding: "100px clamp(1rem,4vw,3rem)", background: `linear-gradient(180deg,transparent 0%,${CARD}50 50%,transparent 100%)` }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div className="ee-reveal" style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ color: PU, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>REQUIREMENTS</span>
          <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, color: T, margin: "12px 0 16px" }}>System Specs</h2>
          <p style={{ color: TD, fontFamily: F1, fontSize: 14 }}>Check if your PC can run Easy Express before downloading.</p>
        </div>
        {/* Toggle tabs */}
        <div style={{ display: "flex", gap: 0, justifyContent: "center", marginBottom: 32, background: CARD, borderRadius: 12, padding: 4, maxWidth: 320, marginLeft: "auto", marginRight: "auto", border: `1px solid ${BD}` }}>
          {["minimum", "recommended"].map((t) => (
            <button key={t} className="ee-tab-btn" onClick={() => setTab(t)} style={{ flex: 1, padding: "10px 20px", borderRadius: 9, background: tab === t ? `linear-gradient(135deg,${PU},${A})` : "transparent", border: "none", color: tab === t ? BG : TD, fontFamily: F1, fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase", transition: "all 0.3s" }}>{t}</button>
          ))}
        </div>
        <div style={{ background: CARD, border: `1px solid ${tab === "recommended" ? PU + "40" : BD}`, borderRadius: 20, overflow: "hidden", transition: "border-color 0.3s" }}>
          <div style={{ height: 3, background: tab === "recommended" ? `linear-gradient(90deg,${PU},${A})` : `linear-gradient(90deg,${BD},transparent)` }} />
          {specKeys.map((key, i) => (
            <div key={key} className="ee-spec-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 28px", borderBottom: i < specKeys.length - 1 ? `1px solid ${BD}` : "none", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 160 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{icons[key]}</span>
                <span style={{ fontFamily: F1, fontSize: 12, color: TD, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{labels[key]}</span>
              </div>
              <span style={{ fontFamily: F1, fontSize: 14, color: T, fontWeight: 600, textAlign: "right" }}>{specs[key]}</span>
            </div>
          ))}
        </div>
        {tab === "recommended" && (
          <div style={{ marginTop: 16, padding: "12px 20px", background: `${PU}0a`, border: `1px solid ${PU}25`, borderRadius: 10, textAlign: "center" }}>
            <span style={{ fontFamily: F1, fontSize: 12, color: PU, fontWeight: 700 }}>✓ Recommended specs give you the best 60fps+ experience with max texture quality.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function FaqSection() {
  const [openIdx, setOpenIdx] = useState(null);
  return (
    <section id="faq" style={{ padding: "100px clamp(1rem,4vw,3rem)", maxWidth: 860, margin: "0 auto" }}>
      <div className="ee-reveal" style={{ textAlign: "center", marginBottom: 56 }}>
        <span style={{ color: A, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>HELP CENTER</span>
        <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, color: T, margin: "12px 0 14px" }}>Frequently Asked Questions</h2>
        <p style={{ color: TD, fontFamily: F1, fontSize: 14 }}>Can't find an answer? Email us at <span style={{ color: A }}>easyexpress.4r@gmail.com</span></p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {FAQS.map((f, i) => {
          const isOpen = openIdx === i;
          return (
            <div key={i} className="ee-faq-hover" style={{ background: isOpen ? `${A}06` : CARD, border: `1px solid ${isOpen ? A + "35" : BD}`, borderRadius: 14, overflow: "hidden", transition: "all 0.3s" }}>
              <button onClick={() => setOpenIdx(isOpen ? null : i)} style={{ width: "100%", padding: "20px 28px", background: "none", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", textAlign: "left", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: isOpen ? A : BD, flexShrink: 0, transition: "background 0.3s", boxShadow: isOpen ? `0 0 8px ${A}` : "none" }} />
                  <span style={{ fontFamily: F1, fontSize: 14, fontWeight: 700, color: isOpen ? A : T }}>{f.q}</span>
                </div>
                <span style={{ color: isOpen ? A : TD, fontSize: 20, fontWeight: 300, transition: "transform 0.35s", display: "inline-block", transform: isOpen ? "rotate(45deg)" : "rotate(0deg)", flexShrink: 0 }}>+</span>
              </button>
              <div style={{ maxHeight: isOpen ? 200 : 0, overflow: "hidden", transition: "max-height 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
                <div style={{ padding: "0 28px 22px 50px" }}>
                  <p style={{ fontFamily: F1, fontSize: 13, color: TD, lineHeight: 1.8, margin: 0 }}>{f.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   SURVEY MODAL
   ═══════════════════════════════════════════ */
function SurveyModal({ onClose, addToast }) {
  const QUESTIONS = [
    { id: "q1", type: "rating", label: "How would you rate Easy Express overall?", required: true },
    { id: "q2", type: "rating", label: "How intuitive was the PC building mechanic?", required: true },
    { id: "q3", type: "rating", label: "How educational was the game content?", required: true },
    { id: "q4", type: "rating", label: "How would you rate the overall UI and visuals?", required: true },
    { id: "q5", type: "rating", label: "How likely are you to recommend Easy Express?", required: true },
    { id: "q6", type: "choice", label: "Which feature did you enjoy the most?", required: true,
      options: ["PC Assembly", "Shop Management", "Troubleshooting / Diagnosing", "Customer Scenarios", "Story / Progression"] },
    { id: "q7", type: "choice", label: "How long did you play the beta?", required: true,
      options: ["Less than 30 minutes", "30 min – 1 hour", "1–2 hours", "More than 2 hours"] },
    { id: "q8", type: "choice", label: "Did the game help you learn about PC hardware?", required: true,
      options: ["Yes, a lot!", "Somewhat", "A little", "Not really"] },
    { id: "q9", type: "text", label: "What did you like most about Easy Express?", required: false, placeholder: "Tell us what stood out..." },
    { id: "q10", type: "text", label: "What should we improve or add?", required: false, placeholder: "Any bugs, suggestions, or ideas..." },
    { id: "q11", type: "text", label: "Any final comments for Team 4R?", required: false, placeholder: "Anything else you'd like to say..." },
  ];

  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0); // 0 = intro, 1-N = questions, N+1 = done
  const [submitting, setSubmitting] = useState(false);
  const TOTAL = QUESTIONS.length;
  const currentQ = QUESTIONS[step - 1];

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, []);

  const setAnswer = (id, val) => setAnswers(prev => ({ ...prev, [id]: val }));

  const canAdvance = () => {
    if (step === 0) return true;
    if (step > TOTAL) return true;
    const q = QUESTIONS[step - 1];
    if (!q.required) return true;
    return !!answers[q.id];
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const lines = QUESTIONS.map(q => `${q.label}\n→ ${answers[q.id] || "(skipped)"}`).join("\n\n");
    try {
      await emailjs.send(
        'service_3ixsdwk',
        'template_wo458oj',
        { from_email: "survey@easyexpress", category: "SURVEY", message: `📋 THESIS EVALUATION SURVEY\n\n${lines}` },
        '3LQw31VLjecEmrw0D'
      );
      setStep(TOTAL + 1);
    } catch (e) {
      addToast({ type: "error", title: "Submission Failed", message: "Could not send survey. Please try again." });
    }
    setSubmitting(false);
  };

  const progress = step === 0 ? 0 : Math.round((step / TOTAL) * 100);

  const inputStyle = { width: "100%", padding: "12px 14px", background: BG, border: `1px solid ${BD}`, borderRadius: 8, color: T, fontSize: 14, fontFamily: F1, outline: "none", boxSizing: "border-box", resize: "vertical" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "fadeIn 0.2s ease-out" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: CARD, border: `1px solid ${PU}40`, borderRadius: 20, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", position: "relative", animation: "modalSlideUp 0.35s cubic-bezier(0.16,1,0.3,1)" }}>

        {/* Top gradient bar */}
        <div style={{ position: "sticky", top: 0, zIndex: 2, background: CARD, borderRadius: "20px 20px 0 0", borderBottom: `1px solid ${BD}`, padding: "20px 28px 16px" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "20px 20px 0 0", background: `linear-gradient(90deg,${PU},${A})` }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: step > 0 && step <= TOTAL ? 12 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${PU}20`, border: `1px solid ${PU}40`, display: "grid", placeItems: "center", fontSize: 16 }}>📋</div>
              <span style={{ fontFamily: F2, fontSize: 13, fontWeight: 700, color: T, letterSpacing: 1 }}>THESIS EVALUATION</span>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: `1px solid ${BD}`, color: TD, fontSize: 16, cursor: "pointer", display: "grid", placeItems: "center" }}>✕</button>
          </div>
          {/* Progress bar */}
          {step > 0 && step <= TOTAL && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: F1, fontSize: 10, color: TD }}>Question {step} of {TOTAL}</span>
                <span style={{ fontFamily: F1, fontSize: 10, color: PU, fontWeight: 700 }}>{progress}%</span>
              </div>
              <div style={{ height: 4, background: BD, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg,${PU},${A})`, borderRadius: 2, transition: "width 0.4s cubic-bezier(0.16,1,0.3,1)" }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "28px 28px 32px" }}>

          {/* ── Intro ── */}
          {step === 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
              <h2 style={{ fontFamily: F2, fontSize: 20, fontWeight: 800, color: T, margin: "0 0 12px" }}>Help Us Graduate!</h2>
              <p style={{ fontFamily: F1, fontSize: 13, color: TD, lineHeight: 1.7, margin: "0 0 8px" }}>
                This survey is part of our CS thesis defense evaluation for <span style={{ color: A, fontWeight: 700 }}>Easy Express</span>. It takes about <span style={{ color: WN, fontWeight: 700 }}>2–3 minutes</span>.
              </p>
              <p style={{ fontFamily: F1, fontSize: 12, color: TD, lineHeight: 1.6, margin: "0 0 28px", opacity: 0.7 }}>
                Your responses are anonymous and used solely for academic research. There are {TOTAL} questions.
              </p>
              <button onClick={() => setStep(1)} className="ee-btn-glow" style={{ width: "100%", padding: 14, background: `linear-gradient(135deg,${PU},${A})`, border: "none", borderRadius: 10, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 15, cursor: "pointer", letterSpacing: 1 }}>
                START SURVEY →
              </button>
            </div>
          )}

          {/* ── Questions ── */}
          {step >= 1 && step <= TOTAL && currentQ && (
            <div style={{ animation: "fadeSlideUp 0.3s ease-out" }}>
              <p style={{ fontFamily: F1, fontSize: 11, color: PU, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
                {currentQ.required ? "Required" : "Optional"}
              </p>
              <h3 style={{ fontFamily: F2, fontSize: 17, fontWeight: 700, color: T, margin: "0 0 24px", lineHeight: 1.4 }}>
                {currentQ.label}
              </h3>

              {/* Star Rating */}
              {currentQ.type === "rating" && (
                <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 8 }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => setAnswer(currentQ.id, star)}
                      style={{ width: 52, height: 52, borderRadius: 12, background: answers[currentQ.id] >= star ? `${WN}25` : BG, border: `2px solid ${answers[currentQ.id] >= star ? WN : BD}`, fontSize: 26, cursor: "pointer", transition: "all 0.2s", transform: answers[currentQ.id] >= star ? "scale(1.1)" : "scale(1)" }}>
                      {answers[currentQ.id] >= star ? "⭐" : "☆"}
                    </button>
                  ))}
                </div>
              )}
              {answers[currentQ.id] && currentQ.type === "rating" && (
                <div style={{ textAlign: "center", fontFamily: F1, fontSize: 12, color: WN, fontWeight: 700, marginBottom: 4 }}>
                  {["", "Poor", "Fair", "Good", "Great", "Excellent!"][answers[currentQ.id]]}
                </div>
              )}

              {/* Multiple Choice */}
              {currentQ.type === "choice" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {currentQ.options.map(opt => (
                    <button key={opt} onClick={() => setAnswer(currentQ.id, opt)}
                      style={{ padding: "12px 16px", borderRadius: 10, background: answers[currentQ.id] === opt ? `${PU}18` : BG, border: `2px solid ${answers[currentQ.id] === opt ? PU : BD}`, color: answers[currentQ.id] === opt ? T : TD, fontFamily: F1, fontSize: 13, fontWeight: answers[currentQ.id] === opt ? 700 : 400, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                      {answers[currentQ.id] === opt ? "✓ " : ""}{opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Open Text */}
              {currentQ.type === "text" && (
                <textarea rows={4} style={inputStyle} placeholder={currentQ.placeholder} value={answers[currentQ.id] || ""} onChange={e => setAnswer(currentQ.id, e.target.value)} />
              )}

              {/* Navigation */}
              <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
                <button onClick={() => setStep(s => s - 1)} style={{ padding: "12px 20px", background: "transparent", border: `1px solid ${BD}`, borderRadius: 10, color: TD, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>← BACK</button>
                {step < TOTAL ? (
                  <button onClick={() => { if (canAdvance()) setStep(s => s + 1); }} disabled={currentQ.required && !answers[currentQ.id]}
                    style={{ flex: 1, padding: 13, background: canAdvance() ? `linear-gradient(135deg,${PU},${A})` : BD, border: "none", borderRadius: 10, color: canAdvance() ? BG : TD, fontFamily: F1, fontWeight: 800, fontSize: 14, cursor: canAdvance() ? "pointer" : "not-allowed", letterSpacing: 1, transition: "all 0.2s" }}>
                    NEXT →
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={submitting || (currentQ.required && !answers[currentQ.id])}
                    style={{ flex: 1, padding: 13, background: `linear-gradient(135deg,${OK},${A})`, border: "none", borderRadius: 10, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 14, cursor: submitting ? "not-allowed" : "pointer", letterSpacing: 1, opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? "SUBMITTING..." : "SUBMIT ✓"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Done ── */}
          {step === TOTAL + 1 && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: `${OK}15`, border: `2px solid ${OK}40`, display: "grid", placeItems: "center", margin: "0 auto 20px", animation: "successPop 0.6s cubic-bezier(0.16,1,0.3,1) both" }}>
                <span style={{ fontSize: 40 }}>✓</span>
              </div>
              <h2 style={{ fontFamily: F2, fontSize: 20, fontWeight: 800, color: OK, margin: "0 0 10px" }}>Thank You!</h2>
              <p style={{ fontFamily: F1, fontSize: 14, color: TD, lineHeight: 1.7, margin: "0 0 8px" }}>
                Your feedback has been submitted to <span style={{ color: A, fontWeight: 700 }}>Team 4R</span>.
              </p>
              <p style={{ fontFamily: F1, fontSize: 13, color: TD, lineHeight: 1.6, marginBottom: 28, opacity: 0.8 }}>
                It will directly contribute to our thesis defense documentation. We really appreciate your time! 🎓
              </p>
              <button onClick={onClose} style={{ width: "100%", padding: 14, background: `linear-gradient(135deg,${OK},${A})`, border: "none", borderRadius: 10, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 14, cursor: "pointer", letterSpacing: 1 }}>
                CLOSE
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function SupportSection({ addToast }) {
  const [formData, setFormData] = useState({ email: "", category: "BUG", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
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
            <a href="https://forms.gle/YOUR_GOOGLE_FORM_ID_HERE" target="_blank" rel="noopener noreferrer" className="ee-btn-glow" style={{ display: "inline-block", padding: "12px 28px", background: `linear-gradient(135deg,${PU},${A})`, border: "none", borderRadius: 10, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 13, cursor: "pointer", letterSpacing: 1, textDecoration: "none" }} onClick={e => { e.preventDefault(); setShowSurvey(true); }}>📝 TAKE THE SURVEY</a>
            <a href="mailto:easyexpress.4r@gmail.com?subject=Beta%20Feedback" className="ee-btn-outline" style={{ display: "inline-block", padding: "12px 28px", background: "transparent", border: `1px solid ${BD}`, borderRadius: 10, color: TD, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: 0.5, textDecoration: "none" }}>✉ EMAIL FEEDBACK</a>
          </div>
          <p style={{ fontFamily: F1, fontSize: 10, color: TD, marginTop: 16, opacity: 0.7 }}>Your responses are anonymous and used solely for academic purposes.</p>
        </div>
      </div>
      {showSurvey && <SurveyModal onClose={() => setShowSurvey(false)} addToast={addToast} />}
    </section>
  );
}

function About() {
  const ROLE_COLORS = [A, PU, WN, OK];
  const ROLE_ICONS  = ["💻", "🎮", "🎨", "🔍"];
  return (
    <section id="about" style={{ padding: "100px clamp(1rem,4vw,3rem)", maxWidth: 1200, margin: "0 auto" }}>
      <div className="ee-reveal" style={{ textAlign: "center", marginBottom: 56 }}>
        <span style={{ color: PU, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>THE TEAM</span>
        <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, color: T, margin: "12px 0 16px" }}>Built by 4R</h2>
        <p style={{ color: TD, maxWidth: 520, margin: "0 auto", lineHeight: 1.7, fontFamily: F1, fontSize: 15 }}>Four Computer Science students building the PC shop simulator they wish existed. Easy Express is our thesis — and our love letter to the Philippine tech retail scene.</p>
      </div>

      {/* Team grid */}
      <div className="ee-grid-team" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, maxWidth: 960, margin: "0 auto" }}>
        {TEAM.map((m, i) => (
          <div key={i} className="ee-reveal ee-stagger ee-team-hover" style={{ "--stagger": i, background: CARD, border: `1px solid ${BD}`, borderRadius: 16, padding: "28px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${ROLE_COLORS[i]},transparent)` }} />
            {/* Avatar */}
            <div className="ee-team-avatar" style={{
              width: 64, height: 64, borderRadius: "50%",
              background: `linear-gradient(135deg,${ROLE_COLORS[i]}30,${ROLE_COLORS[i]}10)`,
              border: `2px solid ${ROLE_COLORS[i]}40`,
              margin: "0 auto 16px", display: "grid", placeItems: "center",
              fontFamily: F2, fontWeight: 900, fontSize: 22, color: ROLE_COLORS[i],
            }}>{ROLE_ICONS[i]}</div>
            <div style={{ fontFamily: F2, fontSize: 13, fontWeight: 700, color: T, marginBottom: 6, lineHeight: 1.3 }}>{m.name}</div>
            <div style={{ display: "inline-block", fontFamily: F1, fontSize: 11, color: ROLE_COLORS[i], fontWeight: 700, background: `${ROLE_COLORS[i]}14`, padding: "3px 12px", borderRadius: 20, letterSpacing: 0.5 }}>{m.role}</div>
          </div>
        ))}
      </div>

      {/* Thesis badge */}
      <div className="ee-reveal" style={{ marginTop: 48, maxWidth: 700, margin: "48px auto 0", background: `linear-gradient(135deg,${CARD} 60%,${PU}08)`, border: `1px solid ${PU}30`, borderRadius: 20, padding: "32px 36px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontFamily: F2, fontSize: 11, color: PU, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>🎓 THESIS PROJECT</div>
          <div style={{ fontFamily: F2, fontSize: 18, fontWeight: 800, color: T, marginBottom: 8 }}>CS Thesis — AY 2025–2026</div>
          <p style={{ fontFamily: F1, fontSize: 13, color: TD, lineHeight: 1.7, margin: 0 }}>Easy Express is submitted as a thesis project for the Bachelor of Science in Computer Science program. All game content, code, and assets are original work by Team 4R.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
          {[{ icon: "🏫", text: "CS Department" }, { icon: "🛠", text: "Built with Unity" }, { icon: "📅", text: "Defense 2026" }].map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", background: BG, borderRadius: 8, border: `1px solid ${BD}` }}>
              <span style={{ fontSize: 16 }}>{b.icon}</span>
              <span style={{ fontFamily: F1, fontSize: 12, color: T, fontWeight: 600 }}>{b.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   LEGAL MODAL
   ═══════════════════════════════════════════ */
const LEGAL_CONTENT = {
  terms: {
    title: "Terms of Service",
    icon: "📄",
    color: A,
    lastUpdated: "April 9, 2026",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        body: "By creating an account, downloading, or playing Easy Express, you agree to be bound by these Terms of Service. Easy Express is a thesis project developed by Team 4R as part of their Bachelor of Science in Computer Science program. If you do not agree to these terms, please do not use the game or this website.",
      },
      {
        heading: "2. Account Registration",
        body: "You must create an account to access Easy Express. You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate information during registration, including a valid email address for OTP verification. You may not share, sell, or transfer your account to another person. Team 4R reserves the right to suspend or terminate accounts that violate these terms.",
      },
      {
        heading: "3. Use of the Game",
        body: "Easy Express is licensed to you for personal, non-commercial use only. You may not reverse-engineer, decompile, or modify the game files. You may not use any cheats, exploits, or third-party software to gain an unfair advantage in the leaderboards. Attempting to disrupt or overload our servers or PlayFab services is strictly prohibited.",
      },
      {
        heading: "4. User-Generated Content & Conduct",
        body: "Easy Express does not currently support user-generated content. Players are expected to conduct themselves respectfully within the game community. Harassment, hate speech, or abusive behavior toward other players will result in account suspension. Team 4R reserves the right to ban any player whose conduct is deemed harmful to the community.",
      },
      {
        heading: "5. Purchases & Payments",
        body: "The Full Game license is a one-time purchase of ₱299.00 (Philippine Pesos) processed via PayMongo. By purchasing, you agree to PayMongo's terms of service. All transactions are final unless they qualify under our Refund Policy. Team 4R is not responsible for payment failures caused by your bank or payment provider.",
      },
      {
        heading: "6. Intellectual Property",
        body: "Easy Express, including its game engine, assets, code, and website, is the intellectual property of Team 4R. The game is built using Unity Engine. The name 'Easy Express' and all related logos are original works created for this thesis project. We are not affiliated with EasyPC, PC Express, or any other commercial PC retailer.",
      },
      {
        heading: "7. Disclaimer of Warranties",
        body: "Easy Express is provided 'as is' as an academic thesis project. Team 4R makes no warranties, expressed or implied, regarding the game's fitness for any particular purpose or uninterrupted availability. As a student project, the game may contain bugs or experience downtime without prior notice.",
      },
      {
        heading: "8. Limitation of Liability",
        body: "To the maximum extent permitted by law, Team 4R and its members shall not be liable for any indirect, incidental, or consequential damages arising from your use of Easy Express. Our total liability to you shall not exceed the amount you paid for the Full Game license.",
      },
      {
        heading: "9. Changes to Terms",
        body: "Team 4R may update these Terms of Service at any time. Continued use of Easy Express after changes are posted constitutes acceptance of the new terms. We will notify users of significant changes via the News section of this website.",
      },
      {
        heading: "10. Contact",
        body: "For questions regarding these Terms of Service, please contact us at easyexpress.4r@gmail.com.",
      },
    ],
  },

  privacy: {
    title: "Privacy Policy",
    icon: "🔒",
    color: PU,
    lastUpdated: "April 9, 2026",
    sections: [
      {
        heading: "1. Introduction",
        body: "Team 4R is committed to protecting your privacy. This Privacy Policy explains what personal data we collect, how we use it, and your rights regarding that data. Easy Express is an academic thesis project. Your data is used solely for game account management and research purposes.",
      },
      {
        heading: "2. Data We Collect",
        body: "We collect the following information when you register: your full name, username, email address, and password (stored encrypted via PlayFab). During gameplay, we collect your in-game statistics (Gold earned, scenarios completed), playtime data, and download events. We do not collect your physical address, phone number, or financial information beyond what PayMongo processes independently for payments.",
      },
      {
        heading: "3. How We Use Your Data",
        body: "Your data is used to: authenticate your account and maintain your login session; save and sync your in-game progress across devices; display your rank on the Global Leaderboard; send OTP verification emails during registration; process and verify your Full Game purchase; and compile anonymized statistics for our CS thesis research and defense documentation.",
      },
      {
        heading: "4. Third-Party Services",
        body: "We use the following third-party services to operate Easy Express: PlayFab (Microsoft) for game backend, account storage, and leaderboards; EmailJS for sending OTP and support emails; PayMongo for payment processing; Vercel for website hosting. Each of these services has their own privacy policies. We encourage you to review them. We do not sell your personal data to any third party.",
      },
      {
        heading: "5. Data Storage & Security",
        body: "Your account data is stored securely on Microsoft PlayFab servers. Passwords are never stored in plaintext — they are hashed and managed by PlayFab's authentication system. We use HTTPS for all data transmission. While we implement industry-standard security practices, no system is 100% secure. Please use a strong, unique password for your account.",
      },
      {
        heading: "6. Leaderboard Visibility",
        body: "Your display name and Gold statistic are publicly visible on the Global Leaderboard. Your email address is never displayed publicly. If you wish to be removed from the leaderboard, you may contact us to delete your account.",
      },
      {
        heading: "7. Survey Data",
        body: "The Thesis Evaluation survey is entirely voluntary and anonymous. Survey responses are sent directly to our team email and used solely for academic research and defense documentation. We do not link survey responses to your account.",
      },
      {
        heading: "8. Children's Privacy",
        body: "Easy Express is not directed at children under 13 years of age. We do not knowingly collect personal data from children under 13. If you believe a child has provided us with personal data, please contact us immediately at easyexpress.4r@gmail.com.",
      },
      {
        heading: "9. Your Rights",
        body: "You have the right to access the personal data we hold about you, request correction of inaccurate data, request deletion of your account and associated data, and withdraw consent for data processing. To exercise any of these rights, email us at easyexpress.4r@gmail.com.",
      },
      {
        heading: "10. Contact",
        body: "For privacy-related concerns, contact Team 4R at easyexpress.4r@gmail.com. We will respond within 7 business days.",
      },
    ],
  },

  refunds: {
    title: "Refund Policy",
    icon: "💳",
    color: OK,
    lastUpdated: "April 9, 2026",
    sections: [
      {
        heading: "1. Overview",
        body: "Easy Express offers a Full Game license for a one-time purchase of ₱299.00 (Philippine Pesos) processed via PayMongo (QR Ph / InstaPay). We want you to be satisfied with your purchase. Please read this Refund Policy carefully before completing your purchase.",
      },
      {
        heading: "2. Eligibility for Refund",
        body: "You may be eligible for a full refund if: you were charged but your account was not unlocked (payment processing error); you were charged multiple times for the same purchase; the game is completely unplayable on a system that meets our minimum specifications and the issue cannot be resolved by our support team. Refund requests must be submitted within 7 days of purchase.",
      },
      {
        heading: "3. Non-Refundable Situations",
        body: "Refunds will NOT be issued in the following cases: you changed your mind after purchase; you no longer want to play the game; you purchased the Full Game when a free Demo was available; your account was suspended or banned for violating our Terms of Service; you experienced minor bugs or issues that do not prevent gameplay; technical issues caused by hardware that does not meet our minimum system requirements.",
      },
      {
        heading: "4. How to Request a Refund",
        body: "To request a refund, email easyexpress.4r@gmail.com with the subject line 'Refund Request'. Include your registered email address, your PlayFab ID (visible in your account), the date of purchase, the PayMongo transaction reference number, and a description of the issue. We will review your request within 5 business days.",
      },
      {
        heading: "5. Refund Processing",
        body: "Approved refunds will be processed through PayMongo back to your original payment method. Depending on your bank or e-wallet provider, refunds may take 3–10 business days to appear. Team 4R does not control the speed of your bank or payment provider's processing time.",
      },
      {
        heading: "6. Demo Version",
        body: "We strongly encourage all users to try the free Demo version before purchasing the Full Game. The Demo includes full access to 2 scenarios so you can evaluate the game before committing. Purchasing the Full Game after playing the Demo constitutes informed acceptance of the product.",
      },
      {
        heading: "7. Payment Provider",
        body: "Payments are processed by PayMongo, a PCI-DSS compliant payment gateway. Team 4R does not store your payment card details or GCash information. If you experience issues with a payment charge that Team 4R cannot resolve, you may contact PayMongo directly or dispute the charge with your bank.",
      },
      {
        heading: "8. Contact",
        body: "For all refund requests and payment-related concerns, contact us at easyexpress.4r@gmail.com. Please allow up to 5 business days for a response. We are a student team and appreciate your patience.",
      },
    ],
  },
};

function LegalModal({ page, onClose }) {
  const content = LEGAL_CONTENT[page];
  if (!content) return null;

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, []);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", animation: "fadeIn 0.2s ease-out" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: CARD, border: `1px solid ${content.color}30`, borderRadius: 20, width: "100%", maxWidth: 680, maxHeight: "88vh", display: "flex", flexDirection: "column", animation: "modalSlideUp 0.35s cubic-bezier(0.16,1,0.3,1)", overflow: "hidden" }}>

        {/* Sticky header */}
        <div style={{ flexShrink: 0, padding: "22px 28px 18px", borderBottom: `1px solid ${BD}`, position: "relative", background: CARD }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${content.color},${content.color}40,transparent)`, borderRadius: "20px 20px 0 0" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${content.color}15`, border: `1px solid ${content.color}30`, display: "grid", placeItems: "center", fontSize: 18 }}>{content.icon}</div>
              <div>
                <div style={{ fontFamily: F2, fontSize: 16, fontWeight: 800, color: T }}>{content.title}</div>
                <div style={{ fontFamily: F1, fontSize: 10, color: TD, marginTop: 2 }}>Last updated: {content.lastUpdated} · Easy Express by Team 4R</div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: `1px solid ${BD}`, color: TD, fontSize: 16, cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>✕</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px 32px" }}>
          {content.sections.map((s, i) => (
            <div key={i} style={{ marginBottom: i < content.sections.length - 1 ? 28 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 4, height: 18, borderRadius: 2, background: content.color, flexShrink: 0 }} />
                <h3 style={{ fontFamily: F2, fontSize: 13, fontWeight: 700, color: content.color, margin: 0, letterSpacing: 0.5 }}>{s.heading}</h3>
              </div>
              <p style={{ fontFamily: F1, fontSize: 13, color: TD, lineHeight: 1.85, margin: "0 0 0 14px" }}>{s.body}</p>
            </div>
          ))}

          {/* Footer note */}
          <div style={{ marginTop: 32, padding: "16px 20px", background: BG, borderRadius: 12, border: `1px solid ${BD}` }}>
            <div style={{ fontFamily: F1, fontSize: 11, color: TD, lineHeight: 1.7 }}>
              <span style={{ color: content.color, fontWeight: 700 }}>Easy Express</span> is an academic thesis project by Team 4R, Bachelor of Science in Computer Science, AY 2025–2026. For questions or concerns, contact us at <span style={{ color: A }}>easyexpress.4r@gmail.com</span>.
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div style={{ flexShrink: 0, padding: "16px 28px", borderTop: `1px solid ${BD}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          {Object.entries(LEGAL_CONTENT).filter(([k]) => k !== page).map(([k, v]) => (
            <button key={k} onClick={() => { onClose(); setTimeout(() => window.dispatchEvent(new CustomEvent("ee-open-legal", { detail: k })), 50); }}
              style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${BD}`, borderRadius: 8, color: TD, fontFamily: F1, fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5 }}>
              {v.title}
            </button>
          ))}
          <button onClick={onClose} style={{ padding: "8px 20px", background: `linear-gradient(135deg,${content.color},${content.color}aa)`, border: "none", borderRadius: 8, color: BG, fontFamily: F1, fontSize: 12, fontWeight: 800, cursor: "pointer", letterSpacing: 1 }}>CLOSE</button>
        </div>
      </div>
    </div>
  );
}

function Footer({ onLegalOpen }) {
  const navLinks = ["features", "scenarios", "gallery", "news", "leaderboards", "specs", "faq", "support", "about"];
  const legalLinks = [
    { slug: "terms",   label: "Terms of Service" },
    { slug: "privacy", label: "Privacy Policy" },
    { slug: "refunds", label: "Refund Policy" },
  ];
  return (
    <footer style={{ background: `linear-gradient(180deg,transparent,${CARD}60)`, borderTop: `1px solid ${BD}`, padding: "64px clamp(1rem,4vw,3rem) 36px", position: "relative", overflow: "hidden" }}>
      {/* Background glow */}
      <div style={{ position: "absolute", bottom: -80, left: "50%", transform: "translateX(-50%)", width: 600, height: 200, borderRadius: "50%", background: `radial-gradient(ellipse, ${A}06 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
        {/* Top section */}
        <div className="ee-footer-grid" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 48, marginBottom: 48 }}>
          {/* Brand */}
          <div style={{ maxWidth: 320 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg,${A},${A2})`, display: "grid", placeItems: "center", fontWeight: 900, fontSize: 16, color: BG, fontFamily: F2, boxShadow: `0 0 20px ${A}30` }}>EE</div>
              <div>
                <div style={{ color: T, fontWeight: 800, fontSize: 16, letterSpacing: 1, fontFamily: F2 }}>EASY EXPRESS</div>
                <div style={{ color: TD, fontSize: 10, fontFamily: F1, letterSpacing: 1.5 }}>PC SHOP SIMULATOR</div>
              </div>
            </div>
            <p style={{ fontFamily: F1, fontSize: 13, color: TD, lineHeight: 1.7, marginBottom: 20 }}>A PC shop simulator and educational game by Team 4R. Built with Unity for our CS thesis.</p>
            {/* Email CTA */}
            <a href="mailto:easyexpress.4r@gmail.com" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", background: `${A}10`, border: `1px solid ${A}30`, borderRadius: 8, color: A, fontFamily: F1, fontSize: 12, fontWeight: 700, textDecoration: "none", letterSpacing: 0.5 }}>
              ✉ easyexpress.4r@gmail.com
            </a>
          </div>

          {/* Quick Links */}
          <div>
            <div style={{ fontFamily: F2, fontSize: 10, fontWeight: 700, color: A, letterSpacing: 2.5, marginBottom: 16, textTransform: "uppercase" }}>Navigation</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px" }}>
              {navLinks.map((l) => (
                <a key={l} href={"#" + l} style={{ fontFamily: F1, fontSize: 12, color: TD, textDecoration: "none", textTransform: "capitalize", transition: "color 0.2s" }}
                  onMouseEnter={e => e.target.style.color = A} onMouseLeave={e => e.target.style.color = TD}>{l}</a>
              ))}
            </div>
          </div>

          {/* Legal & Platform */}
          <div>
            <div style={{ fontFamily: F2, fontSize: 10, fontWeight: 700, color: WN, letterSpacing: 2.5, marginBottom: 16, textTransform: "uppercase" }}>Legal</div>
            {legalLinks.map((l) => (
              <button key={l.slug} onClick={() => onLegalOpen(l.slug)}
                style={{ display: "block", fontFamily: F1, fontSize: 12, color: TD, textDecoration: "none", marginBottom: 8, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
                onMouseEnter={e => e.target.style.color = T} onMouseLeave={e => e.target.style.color = TD}>{l.label}</button>
            ))}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontFamily: F2, fontSize: 10, fontWeight: 700, color: OK, letterSpacing: 2.5, marginBottom: 12, textTransform: "uppercase" }}>Platform</div>
              <div style={{ padding: "8px 14px", background: `${OK}0a`, border: `1px solid ${OK}20`, borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>🪟</span>
                <span style={{ fontFamily: F1, fontSize: 12, color: OK, fontWeight: 700 }}>Windows 10 / 11</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: `1px solid ${BD}`, paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontFamily: F1, color: TD, fontSize: 12 }}>
            <span style={{ color: A, fontWeight: 700 }}>Easy Express</span>{" © 2026 — A thesis project by "}<span style={{ color: T, fontWeight: 600 }}>Team 4R</span>{". Built with Unity."}
          </div>
          <div style={{ fontFamily: F1, color: `${TD}70`, fontSize: 11 }}>Not affiliated with EasyPC or PC Express.</div>
        </div>
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
  const [method] = useState("qrph");  // QRPH only — GCash and Card removed
  const [error, setError] = useState("");

  const PRICE = "₱299.00";
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

  const handleProceed = async () => {
    setError("");
    if (!playFabId) { setError("Account error. Please log out and log back in."); return; }
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
              <p style={{ color: TD, fontSize: 12, fontFamily: F1, margin: "0 0 24px" }}>Pay securely using QR Ph. Open any banking app or e-wallet that supports InstaPay QR.</p>
              {error && (
                <div style={{ color: A2, fontSize: 12, marginBottom: 16, fontFamily: F1, padding: "10px 14px", background: `${A2}0a`, borderRadius: 10, border: `1px solid ${A2}25`, display: "flex", gap: 8, alignItems: "center" }}>
                  <span>⚠</span> {error}
                </div>
              )}

              {/* QRPh info card */}
              <div style={{ padding: "16px 18px", background: `${OK}08`, border: `1px solid ${OK}25`, borderRadius: 12, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>📷</span>
                  <div style={{ fontFamily: F1, fontSize: 13, fontWeight: 700, color: OK }}>QR Ph — InstaPay</div>
                </div>
                <div style={{ fontFamily: F1, fontSize: 12, color: TD, lineHeight: 1.6 }}>
                  Works with <strong style={{ color: T }}>BDO, BPI, UnionBank, Maya, GCash, ShopeePay</strong> and all InstaPay-enabled apps. No card needed — just scan.
                </div>
              </div>

              <button
                onClick={handleProceed}
                className="ee-btn-glow"
                style={{
                  width: "100%", padding: 14, marginTop: 8,
                  background: `linear-gradient(135deg,${OK},${A})`,
                  border: "none", borderRadius: 10, color: BG,
                  fontFamily: F1, fontWeight: 800, fontSize: 15,
                  cursor: "pointer", letterSpacing: 1,
                }}
              >
                📷 PAY ₱{PRICE} VIA QR PH
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
                {method === "qrph" ? "Generating QR code..." : "Contacting payment gateway..."}<br />
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
  const [rememberMe, setRememberMe] = useState(false);
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

      // Task 2 — Remember Me: persist to localStorage (survives refresh) or sessionStorage (tab-scoped)
      const store = rememberMe ? localStorage : sessionStorage;
      store.setItem("ee_session_ticket", loginResult.SessionTicket);
      store.setItem("ee_auth_pfid",      loginResult.PlayFabId);
      store.setItem("ee_auth_username",  formData.email);

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
              {/* Task 2 — Remember Me checkbox */}
              <div
                onClick={() => setRememberMe(r => !r)}
                style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: 4 }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  background: rememberMe ? A : "transparent",
                  border: `2px solid ${rememberMe ? A : BD}`,
                  display: "grid", placeItems: "center",
                  transition: "all 0.2s", color: BG, fontSize: 11, fontWeight: 800,
                }}>
                  {rememberMe ? "✓" : ""}
                </div>
                <span style={{ fontFamily: F1, fontSize: 12, color: TD, userSelect: "none" }}>
                  Remember me on this device
                </span>
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
/* ═══════════════════════════════════════════════════════════
   ADMIN DASHBOARD
   ═══════════════════════════════════════════════════════════ */
function AdminDashboard({ addToast, onClose, adminKey, setAdminKey, authed, setAuthed, liveNews, onNewsUpdated }) {
  useEffect(() => {
    setAuthed(true); // Automatically authorize
    if (!adminKey) {
      // Hardcode your PlayFab Secret Key here to bypass all prompts
      const envKey = import.meta.env.VITE_PLAYFAB_SECRET_KEY || "YOUR_SECRET_KEY_HERE";
      setAdminKey(envKey);
    }
  }, []);
  // eslint-disable-line react-hooks/exhaustive-deps
  
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
      addToast({ type: "success", title: "Data Saved", message: `Updated data for ${searchResult.id}` }); } catch (e) { setEditMsg("❌ " + e.message);
    } };
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
    onNewsUpdated(updated);
    setNewsTitle(""); setNewsBody(""); setNewsMsg("✅ News published!");
    addToast({ type: "success", title: "News Published", message: newsTitle });
    try { await pfAdmin("SetTitleData", { Key: "GameNews", Value: JSON.stringify(updated) }, adminKey);
    } catch (e) { setNewsMsg("⚠ Shown locally but PlayFab save failed: " + e.message); } };
  const deleteNewsItem = async (id) => { const updated = displayNews.filter(n => n.id !== id);
    onNewsUpdated(updated);
    try { await pfAdmin("SetTitleData", { Key: "GameNews", Value: JSON.stringify(updated) }, adminKey);
      addToast({ type: "info", title: "News Deleted", message: "Item removed." });
    } catch (e) { setNewsMsg("⚠ Removed locally but PlayFab save failed: " + e.message); } };
  const fetchLeaderboard = async () => { if (!lbStat) { setLbErr("Please enter a statistic name."); return; } setLbErr(""); setLbData([]);
    try { const res = await pfServer("GetLeaderboard", { StatisticName: lbStat, StartPosition: 0, MaxResultsCount: 100 }, adminKey); setLbData(res.Leaderboard || []);
      addToast({ type: "success", title: "Leaderboard Loaded", message: `Fetched top players for ${lbStat}` }); } catch (e) { setLbErr(e.message); } };
  const fetchLogs = async () => { setLogEntries([{ time: new Date().toLocaleString(), event: "System", msg: "PlayFab event logging requires Insights. Configure PlayStream rules in your dashboard." }, { time: "", event: "Tip", msg: "Use Admin/GetUserAccountInfo or Admin/GetPlayerStatistics for per-player auditing." }]);
    addToast({ type: "info", title: "Logs", message: "Event system info loaded." }); };
  const loadRevenue = async () => {
    setRevenueMsg(""); setRevenueLoaded(false);
    try {
      const td = await pfAdmin("GetTitleData", { Keys: ["GameRevenue"] }, adminKey);
      if (td.Data?.GameRevenue) {
        const parsed = JSON.parse(td.Data.GameRevenue);
        const { donations: _d, ...rest } = parsed; 
        setGameRevenue({ total: rest.total || "0", purchases: rest.purchases || "0", note: rest.note || "" });
      } else {
        setGameRevenue({ total: "0", purchases: "0", note: "" });
      }
    } catch (e) {
      setGameRevenue({ total: "0", purchases: "0", note: "" });
      setRevenueMsg("⚠ Could not load from PlayFab (" + e.message + "). Enter values manually and click Save.");
    }
    setRevenueLoaded(true);
  };
  const saveRevenue = async () => {
    setRevenueMsg("");
    try {
      await pfAdmin("SetTitleData", { Key: "GameRevenue", Value: JSON.stringify({ total: gameRevenue.total, purchases: gameRevenue.purchases, note: gameRevenue.note }) }, adminKey);
      setRevenueMsg("✅ Saved to PlayFab!");
      addToast({ type: "success", title: "Revenue Saved", message: `₱${gameRevenue.total} recorded.` });
    } catch (e) {
      setRevenueMsg("⚠ PlayFab save failed (" + e.message + "). Check VITE_PLAYFAB_SECRET_KEY in .env.local");
    }
  };

  const tabs = [{ id: "players", label: "👥 Players" },{ id: "news", label: "📰 News Editor" },{ id: "leaderboard", label: "🏆 Leaderboards" },{ id: "revenue", label: "💵 Revenue" },{ id: "logs", label: "📋 Event Logs" }];
  
  useEffect(() => {
    if (activeTab === "revenue" && !revenueLoaded) loadRevenue();
  }, [activeTab]);
  // eslint-disable-line react-hooks/exhaustive-deps

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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontFamily: F2, fontSize: 16, fontWeight: 700, color: T, margin: 0 }}>Revenue Tracker</h3>
                <button onClick={loadRevenue} style={{ padding: "8px 18px", background: `${A}15`, border: `1px solid ${A}30`, borderRadius: 8, color: A, fontFamily: F1, fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: 1 }}>↻ REFRESH</button>
              </div>
              {!revenueLoaded ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: TD, fontFamily: F1, fontSize: 13 }}>
                  <div style={{ width: 16, height: 16, border: `2px solid ${A}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  Loading revenue data...
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Summary cards */}
                  <div className="ee-data-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 6 }}>
                    <div style={{ padding: "20px 24px", background: BG, borderRadius: 12, border: `1px solid ${OK}25` }}>
                      <div style={{ fontFamily: F1, fontSize: 10, color: TD, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Total Revenue</div>
                      <div style={{ fontFamily: F2, fontSize: 26, fontWeight: 800, color: OK }}>
                        ₱{parseFloat(gameRevenue?.total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div style={{ padding: "20px 24px", background: BG, borderRadius: 12, border: `1px solid ${A}25` }}>
                      <div style={{ fontFamily: F1, fontSize: 10, color: TD, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Full Game Purchases</div>
                      <div style={{ fontFamily: F2, fontSize: 26, fontWeight: 800, color: A }}>{gameRevenue?.purchases || "0"}</div>
                    </div>
                  </div>

                  {/* Editable total (manual override) */}
                  <div>
                    <label style={labelStyle}>Total Revenue (PHP) — Manual Override</label>
                    <input style={inputStyle} value={gameRevenue?.total || ""} onChange={e => setGameRevenue(prev => ({ ...prev, total: e.target.value }))} placeholder="e.g. 5.90" />
                    <p style={{ fontFamily: F1, fontSize: 10, color: TD, marginTop: 4 }}>
                      Auto-calculated from purchase_log title data. Edit only if correcting manually.
                    </p>
                  </div>
                  <div>
                    <label style={labelStyle}>Notes</label>
                    <input style={inputStyle} value={gameRevenue?.note || ""} onChange={e => setGameRevenue(prev => ({ ...prev, note: e.target.value }))} placeholder="e.g. PayMongo live mode, thesis period only" />
                  </div>

                  {revenueMsg && (
                    <div style={{ fontFamily: F1, fontSize: 12, color: revenueMsg.startsWith("✅") ? OK : revenueMsg.startsWith("ℹ") ? A : A2, padding: "10px 14px", background: revenueMsg.startsWith("✅") ? `${OK}0a` : revenueMsg.startsWith("ℹ") ? `${A}0a` : `${A2}0a`, borderRadius: 8, border: `1px solid ${revenueMsg.startsWith("✅") ? OK : revenueMsg.startsWith("ℹ") ? A : A2}25` }}>
                      {revenueMsg}
                    </div>
                  )}
                  <button onClick={saveRevenue} style={{ alignSelf: "flex-start", padding: "10px 24px", background: `linear-gradient(135deg,${OK},${A})`, border: "none", borderRadius: 8, color: BG, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>SAVE NOTES</button>
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
  const [currentUser, setCurrentUser] = useState(
    () => localStorage.getItem("ee_auth_username") || sessionStorage.getItem("ee_auth_username") || null
  );
  const [showCheckout, setShowCheckout] = useState(false);
  const [ownsGame, setOwnsGame] = useState(false);
  const [sessionTicket, setSessionTicket] = useState(
    () => localStorage.getItem("ee_session_ticket") || sessionStorage.getItem("ee_session_ticket") || null
  );
  const [playFabId, setPlayFabId] = useState(
    () => localStorage.getItem("ee_auth_pfid") || sessionStorage.getItem("ee_auth_pfid") || null
  );
  const [liveNews, setLiveNews] = useState(NEWS);
  const SPECIFIC_ADMIN_ACCOUNT = "masteradmin";
  const isAdmin = currentUser === SPECIFIC_ADMIN_ACCOUNT;
  const [showAdmin, setShowAdmin] = useState(false);
  // Pre-populate the secret key from the Vite env so admin API calls always have a key
  const [adminKey, setAdminKey] = useState(() => import.meta.env.VITE_PLAYFAB_SECRET_KEY || "");
  // Pre-authenticate if the stored user is already masteradmin (survives refresh)
  const [adminAuthed, setAdminAuthed] = useState(() => {
    const u = localStorage.getItem("ee_auth_username") || sessionStorage.getItem("ee_auth_username") || "";
    return u === "masteradmin";
  });
  // Keep adminAuthed in sync — also covers fresh login within the same session
  useEffect(() => { if (isAdmin) setAdminAuthed(true); }, [isAdmin]);

  // Legal modal state
  const [legalPage, setLegalPage] = useState(null); // "terms" | "privacy" | "refunds" | null

  // Listen for cross-link navigation between legal pages (footer buttons in LegalModal)
  useEffect(() => {
    const handler = (e) => setLegalPage(e.detail);
    window.addEventListener("ee-open-legal", handler);
    return () => window.removeEventListener("ee-open-legal", handler);
  }, []);

  // Fetch live news on mount
  useEffect(() => {
  let isFetching = false;
  async function fetchLiveNews() {
    if (isFetching) return;
    isFetching = true;
    try {
      const titleData = await fetchTitleData(["GameNews"]);
      if (titleData.GameNews && titleData.GameNews.trim() !== "") {
        setLiveNews(JSON.parse(titleData.GameNews));
      }
    } catch (e) {
      console.error("Failed to load live news:", e);
    } finally {
      isFetching = false;
    }
  }
  fetchLiveNews();
  const interval = setInterval(fetchLiveNews, 60000);
  return () => clearInterval(interval);
}, []);

  // ── Session persistence: re-verify token on mount so the UI is immediately correct ──
  useEffect(() => {
    const storedTicket = localStorage.getItem("ee_session_ticket") || sessionStorage.getItem("ee_session_ticket");
    const storedUser   = localStorage.getItem("ee_auth_username")  || sessionStorage.getItem("ee_auth_username");
    const storedPfId   = localStorage.getItem("ee_auth_pfid")      || sessionStorage.getItem("ee_auth_pfid");
    if (!storedTicket || !storedUser) return;

    // Restore state immediately so the Nav shows the logged-in user without a flicker
    setCurrentUser(storedUser);
    setSessionTicket(storedTicket);
    setPlayFabId(storedPfId);

    // Re-verify the token and re-check fullGameOwned in the background
    checkFullGameOwnership(storedTicket)
      .then(owned => { if (owned) setOwnsGame(true); })
      .catch(() => {
        // Token is stale — quietly log out
        setCurrentUser(null);
        setSessionTicket(null);
        setPlayFabId(null);
        setOwnsGame(false);
        localStorage.removeItem("ee_session_ticket");
        localStorage.removeItem("ee_auth_pfid");
        localStorage.removeItem("ee_auth_username");
        sessionStorage.removeItem("ee_session_ticket");
        sessionStorage.removeItem("ee_auth_pfid");
        sessionStorage.removeItem("ee_auth_username");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const paymentStatus = params.get("payment");
  // ... rest of existing code

    if (paymentStatus === "success") {
  window.history.replaceState({}, "", window.location.pathname + window.location.hash);
  const ticket = localStorage.getItem("ee_session_ticket");
  if (ticket) {
    checkFullGameOwnership(ticket).then(owned => {
      if (owned) {
        setOwnsGame(true);
        addToast({
          type: "success",
          title: "Purchase Complete! 🎉",
          message: "Easy Express Full Game is now unlocked. Download the full version!",
          duration: 8000,
        });
      }
    }).catch(() => {});
  }
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
    sessionStorage.removeItem("ee_session_ticket");
    sessionStorage.removeItem("ee_auth_pfid");
    sessionStorage.removeItem("ee_auth_username");
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
          @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
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
          @media (max-width: 768px) { .ee-nav-links { display: none !important; } .ee-hamburger { display: flex !important; align-items: center; justify-content: center; } .ee-auth-modal { flex-direction: column !important; max-width: 95vw !important; min-height: auto !important; max-height: 90vh !important; } .ee-auth-sidebar { display: none !important; } .ee-news-item { flex-direction: column !important; gap: 10px !important; } .ee-news-header { flex-direction: column !important; gap: 4px !important; } .ee-spec-row { flex-direction: column !important; gap: 4px !important; align-items: flex-start !important; } .ee-grid-4 { grid-template-columns: 1fr !important; } .ee-features-grid { grid-template-columns: 1fr !important; } .ee-grid-team { grid-template-columns: repeat(2, 1fr) !important; } .ee-admin-search { flex-direction: column !important; } .ee-admin-tabs { flex-direction: column !important; } .ee-data-grid { grid-template-columns: 1fr !important; } .ee-form-row { grid-template-columns: 1fr !important; } }
          @media (max-width: 480px) { .ee-grid-team { grid-template-columns: 1fr !important; } }
        `}</style>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <Nav onAuth={setAuthModal} activeSection={activeSection} isAdmin={isAdmin} onAdminToggle={() => setShowAdmin(!showAdmin)} showAdmin={showAdmin} currentUser={currentUser} onLogout={handleLogout} />
        
        <Hero
          onAuth={setAuthModal}
          ownsGame={ownsGame}
          currentUser={currentUser}
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
        <PublicLeaderboards sessionTicket={sessionTicket} currentUser={currentUser} />
        <SystemRequirements />
        <FaqSection />
        <SupportSection addToast={addToast} />
        <About />
        <Footer onLegalOpen={setLegalPage} />

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
        {legalPage && <LegalModal page={legalPage} onClose={() => setLegalPage(null)} />}
      </div>
    </ErrorBoundary>
  );
}
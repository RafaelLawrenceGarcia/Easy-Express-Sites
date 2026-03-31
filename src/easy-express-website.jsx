import React, { useState, useEffect, useRef, useCallback } from "react";
import { registerUser, loginWithEmail, loginWithUsername, executeCloudScript } from './playfab';
import { sendOTPEmail } from './email';

/* ═══════════════════════════════════════════
   ERROR BOUNDARY — catches crashes, shows error
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

const TEAM = [
  { name: "Member 1", role: "Lead Developer", av: "RM" },
  { name: "Member 2", role: "Game Designer", av: "JD" },
  { name: "Member 3", role: "UI/UX & Web", av: "KC" },
  { name: "Member 4", role: "QA & Research", av: "AL" },
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
  { id: 5, type: "UPDATE", date: "Feb 28, 2026", title: "New Shop Customization", desc: "Decorate your store with shelving units, neon signs, and custom workstation layouts.", color: PU },
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
   SMALL REUSABLE BITS
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
   NAV
   ═══════════════════════════════════════════ */
function Nav({ onAuth, activeSection }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
  const links = ["features", "scenarios", "news", "specs", "faq", "about"];
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: scrolled ? `${BG}f0` : `${BG}cc`, backdropFilter: "blur(20px)", borderBottom: `1px solid ${scrolled ? BD : "transparent"}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 clamp(1rem,4vw,3rem)", height: 64, fontFamily: F1, transition: "all 0.3s" }}>
      <a href="#hero" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 6, background: `linear-gradient(135deg,${A},${A2})`, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14, color: BG, fontFamily: F1 }}>EE</div>
        <span style={{ color: T, fontWeight: 700, fontSize: 16, letterSpacing: 1 }}>EASY EXPRESS</span>
      </a>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {links.map((l) => (
          <a key={l} href={`#${l}`} style={{ color: activeSection === l ? A : TD, textDecoration: "none", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, transition: "color 0.3s" }}>{l}</a>
        ))}
        <div style={{ width: 1, height: 20, background: BD, margin: "0 4px" }} />
        <button onClick={() => onAuth("login")} style={{ background: "transparent", border: `1px solid ${A}40`, color: A, padding: "7px 18px", borderRadius: 6, fontFamily: F1, fontWeight: 600, fontSize: 13, cursor: "pointer", letterSpacing: 1 }}>LOG IN</button>
        <button onClick={() => onAuth("signup")} style={{ background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", color: BG, padding: "8px 20px", borderRadius: 6, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: 1 }}>SIGN UP</button>
      </div>
    </nav>
  );
}

/* ═══════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════ */
function Hero({ onAuth }) {
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
        <button style={{ background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", color: BG, padding: "16px 36px", borderRadius: 10, fontFamily: F1, fontWeight: 800, fontSize: 16, cursor: "pointer", letterSpacing: 1, boxShadow: `0 0 40px ${A}30`, display: "flex", alignItems: "center", gap: 10 }}>
          {"⬇ DOWNLOAD NOW"} <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 600 }}>Windows .exe</span>
        </button>
        <button onClick={() => onAuth("signup")} style={{ background: CARD, border: `1px solid ${BD}`, color: T, padding: "16px 32px", borderRadius: 10, fontFamily: F1, fontWeight: 700, fontSize: 15, cursor: "pointer", letterSpacing: 1 }}>
          CREATE ACCOUNT
        </button>
      </div>
      <div style={{ marginTop: 48, display: "flex", gap: 40, color: TD, fontFamily: F1, fontSize: 13, fontWeight: 600, animation: "fadeSlideUp 0.8s ease-out 0.6s both" }}>
        {["Windows 10/11", "~2 GB Download", "Free to Play"].map((t) => (
          <span key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: A, fontSize: 16 }}>{"✓"}</span> {t}
          </span>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 30, animation: "bounce 2s ease-in-out infinite", color: TD, fontSize: 24 }}>{"↓"}</div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   FEATURES
   ═══════════════════════════════════════════ */
function Features() {
  return (
    <section id="features" style={{ position: "relative", padding: "100px clamp(1rem,4vw,3rem)", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <span style={{ color: A, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>WHAT YOU WILL DO</span>
        <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 800, color: T, margin: "12px 0 16px" }}>Learn. Manage. Fix. Repeat.</h2>
        <p style={{ color: TD, maxWidth: 560, margin: "0 auto", lineHeight: 1.7, fontFamily: F1, fontSize: 15 }}>Easy Express is a hands-on crash course in PC hardware, retail operations, and technical problem-solving.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
        {FEATURES.map((f, i) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: "32px 28px", transition: "transform 0.3s, border-color 0.3s", cursor: "default", position: "relative", overflow: "hidden" }}>
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

/* ═══════════════════════════════════════════
   SCENARIOS
   ═══════════════════════════════════════════ */
function Scenarios() {
  return (
    <section id="scenarios" style={{ position: "relative", padding: "100px clamp(1rem,4vw,3rem)", background: `linear-gradient(180deg,transparent 0%,${CARD}40 50%,transparent 100%)` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <span style={{ color: A2, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>THE SIMULATION</span>
          <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 800, color: T, margin: "12px 0 16px" }}>Real Problems. Real Fixes.</h2>
          <p style={{ color: TD, maxWidth: 560, margin: "0 auto", lineHeight: 1.7, fontFamily: F1, fontSize: 15 }}>Every customer walks in with a unique hardware headache. Your job? Figure it out, hands-on.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {SCENARIOS.map((s, i) => (
            <div key={i} style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: "28px 24px", position: "relative", overflow: "hidden", transition: "transform 0.3s" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${s.color},transparent)` }} />
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}15`, border: `1px solid ${s.color}30`, display: "grid", placeItems: "center", marginBottom: 16, fontSize: 18, color: s.color, fontFamily: F2, fontWeight: 800 }}>{String(i + 1).padStart(2, "0")}</div>
              <h3 style={{ fontFamily: F2, fontSize: 16, fontWeight: 700, color: T, margin: "0 0 8px" }}>{s.title}</h3>
              <p style={{ color: TD, fontSize: 13, lineHeight: 1.7, fontFamily: F1, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 48, background: CARD2, border: `1px solid ${BD}`, borderRadius: 16, padding: "36px 40px", display: "flex", flexWrap: "wrap", gap: 40, alignItems: "center", justifyContent: "space-between" }}>
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

/* ═══════════════════════════════════════════
   NEWS SECTION
   ═══════════════════════════════════════════ */
function NewsSection() {
  return (
    <section id="news" style={{ padding: "100px clamp(1rem,4vw,3rem)", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <span style={{ color: WN, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>LATEST</span>
        <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 800, color: T, margin: "12px 0 16px" }}>News and Updates</h2>
        <p style={{ color: TD, maxWidth: 520, margin: "0 auto", lineHeight: 1.7, fontFamily: F1, fontSize: 15 }}>Stay up to date with the latest patches, features, and announcements from Team 4R.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {NEWS.map((n) => (
          <div key={n.id} style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: "24px 28px", display: "flex", gap: 20, alignItems: "flex-start", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: n.color }} />
            <div style={{ minWidth: 52, height: 52, borderRadius: 12, background: `${n.color}12`, border: `1px solid ${n.color}25`, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: F2, fontSize: 10, fontWeight: 800, color: n.color, letterSpacing: 1 }}>{n.type}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
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

/* ═══════════════════════════════════════════
   SYSTEM REQUIREMENTS
   ═══════════════════════════════════════════ */
function SystemRequirements() {
  const [tab, setTab] = useState("minimum");
  const specs = SPECS[tab];
  const labels = { os: "Operating System", cpu: "Processor", ram: "Memory", gpu: "Graphics", storage: "Storage", dx: "DirectX" };
  const specKeys = Object.keys(specs);
  return (
    <section id="specs" style={{ padding: "100px clamp(1rem,4vw,3rem)", background: `linear-gradient(180deg,transparent 0%,${CARD}40 50%,transparent 100%)` }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ color: PU, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>REQUIREMENTS</span>
          <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, color: T, margin: "12px 0 16px" }}>System Specs</h2>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 32 }}>
          {["minimum", "recommended"].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 28px", borderRadius: 8, background: tab === t ? `${A}18` : "transparent", border: `1px solid ${tab === t ? A + "50" : BD}`, color: tab === t ? A : TD, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase", transition: "all 0.3s" }}>{t}</button>
          ))}
        </div>
        <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 16, overflow: "hidden" }}>
          {specKeys.map((key, i) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: i < specKeys.length - 1 ? `1px solid ${BD}` : "none" }}>
              <span style={{ fontFamily: F1, fontSize: 13, color: TD, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{labels[key]}</span>
              <span style={{ fontFamily: F1, fontSize: 14, color: T, fontWeight: 600, textAlign: "right" }}>{specs[key]}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   FAQ
   ═══════════════════════════════════════════ */
function FaqSection() {
  const [openIdx, setOpenIdx] = useState(null);
  return (
    <section id="faq" style={{ padding: "100px clamp(1rem,4vw,3rem)", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <span style={{ color: A, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>HELP</span>
        <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, color: T, margin: "12px 0 0" }}>FAQ</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {FAQS.map((f, i) => {
          const isOpen = openIdx === i;
          return (
            <div key={i} style={{ background: CARD, border: `1px solid ${isOpen ? A + "40" : BD}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.3s" }}>
              <button onClick={() => setOpenIdx(isOpen ? null : i)} style={{ width: "100%", padding: "18px 24px", background: "none", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontFamily: F1, fontSize: 14, fontWeight: 700, color: isOpen ? A : T }}>{f.q}</span>
                <span style={{ color: isOpen ? A : TD, fontSize: 18, fontWeight: 300, transition: "transform 0.3s", display: "inline-block", transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
              </button>
              <div style={{ maxHeight: isOpen ? 200 : 0, overflow: "hidden", transition: "max-height 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
                <div style={{ padding: "0 24px 18px 24px" }}>
                  <p style={{ fontFamily: F1, fontSize: 13, color: TD, lineHeight: 1.7, margin: 0 }}>{f.a}</p>
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
   ABOUT
   ═══════════════════════════════════════════ */
function About() {
  return (
    <section id="about" style={{ padding: "100px clamp(1rem,4vw,3rem)", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <span style={{ color: PU, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: F1 }}>THE TEAM</span>
        <h2 style={{ fontFamily: F2, fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, color: T, margin: "12px 0 16px" }}>Built by 4R</h2>
        <p style={{ color: TD, maxWidth: 520, margin: "0 auto", lineHeight: 1.7, fontFamily: F1, fontSize: 15 }}>Four Computer Science students who believe the best way to learn hardware is by getting your virtual hands dirty. Easy Express is our thesis project and our love letter to the Philippine PC retail scene.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, maxWidth: 860, margin: "0 auto" }}>
        {TEAM.map((m, i) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: "24px 20px", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg,${PU}30,${A}30)`, margin: "0 auto 12px", display: "grid", placeItems: "center", fontFamily: F2, fontWeight: 800, fontSize: 16, color: PU }}>{m.av}</div>
            <div style={{ fontFamily: F2, fontSize: 14, fontWeight: 700, color: T, marginBottom: 4 }}>{m.name}</div>
            <div style={{ fontFamily: F1, fontSize: 12, color: TD, fontWeight: 600 }}>{m.role}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════ */
function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${BD}`, padding: "48px clamp(1rem,4vw,3rem) 32px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 40, marginBottom: 40 }}>
        <div style={{ maxWidth: 300 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 5, background: `linear-gradient(135deg,${A},${A2})`, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 11, color: BG, fontFamily: F1 }}>EE</div>
            <span style={{ color: T, fontWeight: 700, fontSize: 14, letterSpacing: 1, fontFamily: F1 }}>EASY EXPRESS</span>
          </div>
          <p style={{ fontFamily: F1, fontSize: 12, color: TD, lineHeight: 1.7 }}>A PC shop simulator and educational game by Team 4R. Built with Unity for our Computer Science thesis.</p>
        </div>
        <div>
          <div style={{ fontFamily: F2, fontSize: 11, fontWeight: 700, color: T, letterSpacing: 2, marginBottom: 12 }}>QUICK LINKS</div>
          {["features", "scenarios", "news", "specs", "faq", "about"].map((l) => (
            <a key={l} href={"#" + l} style={{ display: "block", fontFamily: F1, fontSize: 13, color: TD, textDecoration: "none", marginBottom: 8, textTransform: "capitalize" }}>{l}</a>
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
   AUTH MODAL — NEWS SIDEBAR
   ═══════════════════════════════════════════ */
function AuthNewsSidebar() {
  return (
    <div style={{ width: 260, background: BG, borderRight: `1px solid ${BD}`, padding: "28px 20px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <div style={{ width: 24, height: 24, borderRadius: 4, background: `linear-gradient(135deg,${A},${A2})`, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 9, color: BG, fontFamily: F1 }}>EE</div>
        <span style={{ fontFamily: F2, fontSize: 11, fontWeight: 700, color: T, letterSpacing: 1 }}>NEWS FEED</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {NEWS.slice(0, 4).map((n) => (
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

/* ═══════════════════════════════════════════
   AUTH MODAL — SUB-VIEWS (broken out to avoid deep ternary nesting)
   ═══════════════════════════════════════════ */

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
        <h2 style={{ fontFamily: F2, fontSize: 24, fontWeight: 800, color: T, margin: "0 0 8px", animation: "fadeSlideUp 0.5s ease-out 0.3s both" }}>
          {isSignup ? "Account Activated!" : "Welcome Back!"}
        </h2>
        <p style={{ fontFamily: F1, fontSize: 14, color: TD, lineHeight: 1.6, margin: "0 0 8px", animation: "fadeSlideUp 0.5s ease-out 0.4s both" }}>
          {isSignup ? `Your account "${username}" has been verified and is ready to go.` : "Good to see you again! Your shop is waiting."}
        </p>
        {isSignup && (
          <div style={{ margin: "20px 0", padding: "16px 20px", background: BG, borderRadius: 12, border: `1px solid ${BD}`, textAlign: "left", animation: "fadeSlideUp 0.5s ease-out 0.5s both" }}>
            <div style={{ fontFamily: F2, fontSize: 11, fontWeight: 700, color: A, letterSpacing: 2, marginBottom: 10 }}>{"WHAT'S NEXT"}</div>
            {nextSteps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: i < 3 ? 8 : 0 }}>
                <span style={{ fontFamily: F2, fontSize: 10, fontWeight: 800, color: A, background: `${A}15`, padding: "2px 7px", borderRadius: 4, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontFamily: F1, fontSize: 12, color: TD, lineHeight: 1.5 }}>{step}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} style={{ width: "100%", padding: 14, background: `linear-gradient(135deg,${OK},${A})`, border: "none", borderRadius: 10, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 14, cursor: "pointer", letterSpacing: 1, animation: "fadeSlideUp 0.5s ease-out 0.6s both" }}>
          {isSignup ? "DOWNLOAD GAME" : "CONTINUE"}
        </button>
        {isSignup && (
          <button onClick={onClose} style={{ marginTop: 12, background: "none", border: "none", color: TD, fontFamily: F1, fontSize: 12, cursor: "pointer" }}>{"I'll download later"}</button>
        )}
      </div>
    </div>
  );
}

function OtpView({ formData, otpCode, setOtpCode, otpRefs, handleVerifyOTP, handleResendOTP, loading }) {
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otpCode];
    next[index] = value.slice(-1);
    setOtpCode(next);
    if (value && index < 5 && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1].focus();
    }
  };
  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0 && otpRefs.current[index - 1]) {
      otpRefs.current[index - 1].focus();
    }
  };
  return (
    <div style={{ textAlign: "center", paddingTop: 20 }}>
      <div style={{ width: 60, height: 60, borderRadius: 14, background: `${A}12`, border: `1px solid ${A}25`, display: "grid", placeItems: "center", margin: "0 auto 20px", fontSize: 28 }}>{"📧"}</div>
      <h2 style={{ fontFamily: F2, fontSize: 20, fontWeight: 800, color: T, margin: "0 0 6px" }}>Check Your Inbox</h2>
      <p style={{ color: TD, fontSize: 13, fontFamily: F1, lineHeight: 1.6, margin: "0 0 6px" }}>We sent a 6-digit code to</p>
      <p style={{ color: A, fontSize: 14, fontFamily: F1, fontWeight: 700, margin: "0 0 28px" }}>{formData.email}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
        {otpCode.map((d, i) => (
          <input
            key={i}
            ref={(el) => { otpRefs.current[i] = el; }}
            type="text"
            maxLength={1}
            value={d}
            onChange={(e) => handleOtpChange(i, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(i, e)}
            style={{ width: 46, height: 54, textAlign: "center", background: BG, border: `1px solid ${d ? A : BD}`, borderRadius: 10, color: T, fontSize: 22, fontFamily: F2, fontWeight: 700, outline: "none", transition: "border-color 0.3s" }}
          />
        ))}
      </div>
      <button onClick={handleVerifyOTP} disabled={loading} style={{ width: "100%", padding: 14, background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", borderRadius: 10, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 15, cursor: "pointer", letterSpacing: 1, opacity: loading ? 0.7 : 1 }}>
        {loading ? "VERIFYING..." : "VERIFY & ACTIVATE"}
      </button>
      <p style={{ color: TD, fontSize: 12, marginTop: 14, fontFamily: F1 }}>
        {"Didn't receive it? "}
        <button onClick={handleResendOTP} disabled={loading} style={{ background: "none", border: "none", color: A, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>Resend Code</button>
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   AUTH MODAL — MAIN
   ═══════════════════════════════════════════ */
function AuthModal({ mode, setMode, onClose, addToast }) {
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

  const handleChange = (field) => (e) => { setFormData((p) => ({ ...p, [field]: e.target.value })); setError(""); };

  const inputStyle = { width: "100%", padding: "12px 14px", background: BG, border: `1px solid ${BD}`, borderRadius: 8, color: T, fontSize: 14, fontFamily: F1, outline: "none", transition: "border-color 0.3s" };
  const labelStyle = { display: "block", marginBottom: 6, color: TD, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, fontFamily: F1, textTransform: "uppercase" };

  // --- Handlers ---
  const handleSignUp = async () => {
    if (!agreeTerms) { setError("You must agree to the terms"); return; }
    setLoading(true); setError("");
    try {
      const result = await registerUser({ username: formData.username, email: formData.email, password: formData.password, displayName: formData.firstName + " " + formData.lastName });
      setSessionTicket(result.SessionTicket);
      const otpResult = await executeCloudScript({ sessionTicket: result.SessionTicket, functionName: "sendOTP", functionParameter: {} });
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
      if (r.FunctionResult.success) {
        setSuccessType("signup"); setShowSuccess(true);
        addToast({ type: "success", title: "Account Created!", message: "Welcome to Easy Express, " + formData.username + "!", duration: 6000 });
      } else { setError(r.FunctionResult.error); }
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleResendOTP = async () => {
    setLoading(true); setError("");
    try {
      const r = await executeCloudScript({ sessionTicket, functionName: "sendOTP", functionParameter: {} });
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
      if (isEmail) { await loginWithEmail({ email: formData.email, password: formData.password }); }
      else { await loginWithUsername({ username: formData.email, password: formData.password }); }
      setSuccessType("login"); setShowSuccess(true);
      addToast({ type: "welcome", title: "Welcome Back!", message: "Launch the game to continue your shop.", duration: 5000 });
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

  // --- Success Screen ---
  if (showSuccess) {
    return <SuccessView successType={successType} username={formData.username} onClose={onClose} />;
  }

  // --- Step indicator for signup ---
  const stepNames = ["Identity", "Credentials", "Confirm"];

  // --- Render ---
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: `${BG}dd`, backdropFilter: "blur(24px)", display: "grid", placeItems: "center", padding: 20, animation: "fadeIn 0.3s ease-out" }} onClick={onClose}>
      <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 20, width: "100%", maxWidth: 700, position: "relative", overflow: "hidden", animation: "modalSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)", display: "flex", minHeight: 520 }} onClick={(e) => e.stopPropagation()}>

        {/* Top accent bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${A},${A2})`, zIndex: 1 }} />

        {/* Sidebar */}
        <AuthNewsSidebar />

        {/* Form area */}
        <div style={{ flex: 1, padding: "36px 32px", position: "relative", overflowY: "auto" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: TD, fontSize: 18, cursor: "pointer", lineHeight: 1, zIndex: 2 }}>{"✕"}</button>

          {/* Error */}
          {error && (
            <div style={{ color: A2, fontSize: 12, marginBottom: 16, fontFamily: F1, padding: "10px 14px", background: `${A2}0a`, borderRadius: 10, border: `1px solid ${A2}25`, display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 14 }}>{"⚠"}</span> {error}
            </div>
          )}

          {/* OTP View */}
          {otpSent ? (
            <OtpView formData={formData} otpCode={otpCode} setOtpCode={setOtpCode} otpRefs={otpRefs} handleVerifyOTP={handleVerifyOTP} handleResendOTP={handleResendOTP} loading={loading} />

          ) : mode === "signup" ? (
            /* SIGNUP */
            <div>
              <h2 style={{ fontFamily: F2, fontSize: 20, fontWeight: 800, color: T, margin: "0 0 4px" }}>Create Your Account</h2>
              <p style={{ color: TD, fontSize: 12, fontFamily: F1, margin: "0 0 20px" }}>Join Easy Express — it only takes a minute.</p>

              {/* Step indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
                {stepNames.map((label, i) => {
                  const step = i + 1;
                  const active = signupStep >= step;
                  const current = signupStep === step;
                  return (
                    <React.Fragment key={i}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: active ? `${A}20` : "transparent", border: `2px solid ${active ? A : BD}`, display: "grid", placeItems: "center", fontFamily: F2, fontSize: 11, fontWeight: 800, color: active ? A : TD, transition: "all 0.3s" }}>
                          {signupStep > step ? "✓" : step}
                        </div>
                        <span style={{ fontFamily: F1, fontSize: 11, fontWeight: 700, color: current ? A : active ? T : TD, letterSpacing: 1 }}>{label}</span>
                      </div>
                      {i < 2 && (
                        <div style={{ flex: 1, height: 2, background: active && signupStep > step ? A : BD, margin: "0 12px", borderRadius: 1, transition: "background 0.3s" }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Step 1 */}
              {signupStep === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeSlideUp 0.3s ease-out" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={labelStyle}>First Name</label><input style={inputStyle} value={formData.firstName} onChange={handleChange("firstName")} placeholder="Juan" /></div>
                    <div><label style={labelStyle}>Last Name</label><input style={inputStyle} value={formData.lastName} onChange={handleChange("lastName")} placeholder="Dela Cruz" /></div>
                  </div>
                  <div>
                    <label style={labelStyle}>Username</label>
                    <input style={inputStyle} value={formData.username} onChange={handleChange("username")} placeholder="techshop_pro" />
                    <p style={{ fontFamily: F1, fontSize: 10, color: TD, marginTop: 6 }}>This is your in-game display name. 3+ characters, no spaces.</p>
                  </div>
                  <button onClick={handleNextStep} style={{ width: "100%", padding: 14, marginTop: 8, background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", borderRadius: 10, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 14, cursor: "pointer", letterSpacing: 1 }}>{"NEXT →"}</button>
                </div>
              )}

              {/* Step 2 */}
              {signupStep === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeSlideUp 0.3s ease-out" }}>
                  <div>
                    <label style={labelStyle}>Email Address</label>
                    <input type="email" style={inputStyle} value={formData.email} onChange={handleChange("email")} placeholder="you@email.com" />
                    <p style={{ fontFamily: F1, fontSize: 10, color: TD, marginTop: 6 }}>We will send a verification code to this email.</p>
                  </div>
                  <div>
                    <label style={labelStyle}>Password</label>
                    <input type="password" style={inputStyle} value={formData.password} onChange={handleChange("password")} placeholder="Min. 8 characters" />
                    <PwStrength password={formData.password} />
                  </div>
                  <div>
                    <label style={labelStyle}>Confirm Password</label>
                    <input type="password" style={inputStyle} value={formData.confirmPassword} onChange={handleChange("confirmPassword")} placeholder="Re-enter password" />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => { setSignupStep(1); setError(""); }} style={{ padding: "14px 20px", background: "transparent", border: `1px solid ${BD}`, borderRadius: 10, color: TD, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{"← BACK"}</button>
                    <button onClick={handleNextStep} style={{ flex: 1, padding: 14, background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", borderRadius: 10, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 14, cursor: "pointer", letterSpacing: 1 }}>{"NEXT →"}</button>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {signupStep === 3 && (
                <div style={{ animation: "fadeSlideUp 0.3s ease-out" }}>
                  <div style={{ background: BG, borderRadius: 12, padding: "16px 20px", marginBottom: 20, border: `1px solid ${BD}` }}>
                    <div style={{ fontFamily: F2, fontSize: 10, fontWeight: 700, color: A, letterSpacing: 2, marginBottom: 12 }}>REVIEW YOUR DETAILS</div>
                    {[
                      { l: "Name", v: formData.firstName + " " + formData.lastName },
                      { l: "Username", v: formData.username },
                      { l: "Email", v: formData.email },
                      { l: "Password", v: "\u2022".repeat(formData.password.length) },
                    ].map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 3 ? `1px solid ${BD}` : "none" }}>
                        <span style={{ fontFamily: F1, fontSize: 12, color: TD, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{r.l}</span>
                        <span style={{ fontFamily: F1, fontSize: 13, color: T, fontWeight: 600 }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                  <div onClick={() => setAgreeTerms(!agreeTerms)} style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", marginBottom: 20 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1, background: agreeTerms ? A : "transparent", border: `2px solid ${agreeTerms ? A : BD}`, display: "grid", placeItems: "center", transition: "all 0.2s", color: BG, fontSize: 12, fontWeight: 800 }}>
                      {agreeTerms ? "✓" : ""}
                    </div>
                    <span style={{ fontFamily: F1, fontSize: 12, color: TD, lineHeight: 1.5 }}>I agree to the Easy Express terms of service and understand that this is a thesis project by Team 4R. My data is used solely for game account management.</span>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => { setSignupStep(2); setError(""); }} style={{ padding: "14px 20px", background: "transparent", border: `1px solid ${BD}`, borderRadius: 10, color: TD, fontFamily: F1, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{"← BACK"}</button>
                    <button onClick={handleSignUp} disabled={loading || !agreeTerms} style={{ flex: 1, padding: 14, background: agreeTerms ? `linear-gradient(135deg,${A},#00b8d4)` : BD, border: "none", borderRadius: 10, color: agreeTerms ? BG : TD, fontFamily: F1, fontWeight: 800, fontSize: 14, cursor: agreeTerms ? "pointer" : "not-allowed", letterSpacing: 1, opacity: loading ? 0.7 : 1 }}>
                      {loading ? "CREATING ACCOUNT..." : "CREATE & VERIFY"}
                    </button>
                  </div>
                </div>
              )}

              <p style={{ color: TD, fontSize: 12, marginTop: 20, textAlign: "center", fontFamily: F1 }}>
                {"Already have an account? "}
                <button onClick={() => { setMode("login"); setSignupStep(1); setError(""); }} style={{ background: "none", border: "none", color: A, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>Log In</button>
              </p>
            </div>

          ) : (
            /* LOGIN */
            <div>
              <h2 style={{ fontFamily: F2, fontSize: 20, fontWeight: 800, color: T, margin: "0 0 4px" }}>Welcome Back</h2>
              <p style={{ color: TD, fontSize: 12, fontFamily: F1, margin: "0 0 24px" }}>Log in to access your shop and continue your progress.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Username or Email</label>
                  <input style={inputStyle} value={formData.email} onChange={handleChange("email")} placeholder="techshop_pro or you@email.com" onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }} />
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <input type="password" style={inputStyle} value={formData.password} onChange={handleChange("password")} placeholder="Enter your password" onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }} />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                    <button style={{ background: "none", border: "none", color: A, cursor: "pointer", fontFamily: F1, fontSize: 11, fontWeight: 600 }}>Forgot Password?</button>
                  </div>
                </div>
              </div>
              <button onClick={handleLogin} disabled={loading} style={{ width: "100%", padding: 14, marginTop: 20, background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", borderRadius: 10, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 15, cursor: "pointer", letterSpacing: 1, opacity: loading ? 0.7 : 1 }}>
                {loading ? "LOGGING IN..." : "LOG IN"}
              </button>
              <div style={{ marginTop: 20, padding: "12px 14px", background: BG, border: `1px solid ${BD}`, borderRadius: 10, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{"🎮"}</span>
                <div>
                  <div style={{ fontFamily: F1, fontSize: 11, color: A, fontWeight: 700, marginBottom: 2 }}>Game Client Sync</div>
                  <div style={{ fontFamily: F1, fontSize: 11, color: TD, lineHeight: 1.5 }}>After logging in, launch the Easy Express client. The game uses the same account.</div>
                </div>
              </div>
              <p style={{ color: TD, fontSize: 12, marginTop: 20, textAlign: "center", fontFamily: F1 }}>
                {"Don't have an account? "}
                <button onClick={() => { setMode("signup"); setError(""); }} style={{ background: "none", border: "none", color: A, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>Sign Up</button>
              </p>
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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((entry) => { if (entry.isIntersecting) setActiveSection(entry.target.id); }); },
      { threshold: 0.3 }
    );
    ["features", "scenarios", "news", "specs", "faq", "about"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

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
          input::placeholder{color:${TD}60}
          input:focus{border-color:${A} !important;box-shadow:0 0 0 3px ${A}12 !important}
        `}</style>

        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <Nav onAuth={setAuthModal} activeSection={activeSection} />
        <Hero onAuth={setAuthModal} />
        <Features />
        <Scenarios />
        <NewsSection />
        <SystemRequirements />
        <FaqSection />
        <About />
        <Footer />

        {authModal && (
          <AuthModal mode={authModal} setMode={setAuthModal} onClose={() => setAuthModal(null)} addToast={addToast} />
        )}
      </div>
    </ErrorBoundary>
  );
}
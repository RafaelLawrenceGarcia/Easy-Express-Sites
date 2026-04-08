// src/UserDashboard.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  Self-service user dashboard. Shows:
//   • Profile (username, email, PlayFab ID)
//   • Transaction receipt (if fullGameOwned)
//   • A permanent Download button (only active when fullGameOwned === true)
//
//  Reads session from localStorage keys written at login:
//    ee_auth_ticket    → PlayFab session ticket
//    ee_auth_pfid      → PlayFab ID
//    ee_auth_username  → display username
//
//  Route: #/dashboard  (add to App.jsx)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { getUserData } from "./playfab.js";

// ── Design tokens (mirror easy-express-website.jsx) ──────────────────────────
const A   = "#00e5ff";
const A2  = "#ff3d71";
const BG  = "#0a0c10";
const CARD= "#12151c";
const T   = "#e0e6f0";
const TD  = "#7a8399";
const BD  = "#1e2333";
const OK  = "#00e676";
const PU  = "#7c4dff";
const F1  = "'Chakra Petch', sans-serif";
const F2  = "'Orbitron', sans-serif";

const FULL_GAME_DOWNLOAD_URL = "https://your-cdn.com/EasyExpress_Full_Setup.exe"; // ← update this

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(isoStr) {
  if (!isoStr) return "—";
  try {
    return new Date(isoStr).toLocaleString("en-PH", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return isoStr; }
}

function formatAmount(centavos) {
  if (!centavos) return "1.00";
  const pesos = parseInt(centavos, 10) / 100;
  return `₱${pesos.toFixed(2)}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatBadge({ label, value, accent }) {
  return (
    <div style={{ padding: "14px 18px", background: BG, borderRadius: 10, border: `1px solid ${BD}`, flex: 1, minWidth: 120 }}>
      <div style={{ fontFamily: F1, fontSize: 10, color: TD, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: F2, fontSize: 14, fontWeight: 800, color: accent || T, wordBreak: "break-all" }}>{value || "—"}</div>
    </div>
  );
}

function SectionHeader({ children }) {
  return (
    <div style={{ fontFamily: F2, fontSize: 11, fontWeight: 700, color: A, letterSpacing: 2.5, marginBottom: 14, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, ${A}30, transparent)` }} />
      {children}
      <div style={{ height: 1, flex: 1, background: `linear-gradient(270deg, ${A}30, transparent)` }} />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function UserDashboard() {
  const [profile,      setProfile]      = useState(null);
  const [ownsGame,     setOwnsGame]      = useState(false);
  const [receipt,      setReceipt]       = useState(null);
  const [loading,      setLoading]       = useState(true);
  const [error,        setError]         = useState("");
  const [downloading,  setDownloading]   = useState(false);
  const [copySuccess,  setCopySuccess]   = useState(false);

  const ticket   = localStorage.getItem("ee_auth_ticket");
  const pfId     = localStorage.getItem("ee_auth_pfid");
  const username = localStorage.getItem("ee_auth_username");

  useEffect(() => {
    if (!ticket) { setLoading(false); return; }

    getUserData(ticket, ["fullGameOwned", "purchaseDate", "paymentId", "amountPaid", "paymentMethod"])
      .then((data) => {
        const owned = data?.fullGameOwned?.Value === "true";
        setOwnsGame(owned);
        if (owned) {
          setReceipt({
            purchaseDate:  data?.purchaseDate?.Value || null,
            paymentId:     data?.paymentId?.Value    || null,
            amountPaid:    data?.amountPaid?.Value   || null,
            paymentMethod: data?.paymentMethod?.Value || null,
          });
        }
        setProfile({ username, pfId });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [ticket, username, pfId]);

  const handleDownload = () => {
    if (!ownsGame) return;
    setDownloading(true);
    // Brief animation, then open download
    setTimeout(() => {
      window.open(FULL_GAME_DOWNLOAD_URL, "_blank");
      setDownloading(false);
    }, 800);
  };

  const handleCopyId = () => {
    if (!pfId) return;
    navigator.clipboard.writeText(pfId).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!ticket) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "grid", placeItems: "center", fontFamily: F1, padding: 20 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontFamily: F2, fontSize: 22, color: T, marginBottom: 10 }}>Login Required</h2>
          <p style={{ color: TD, fontSize: 14, marginBottom: 24 }}>You must be logged in to view your dashboard.</p>
          <a href="#/" style={{ padding: "14px 28px", background: `linear-gradient(135deg,${A},#00b8d4)`, borderRadius: 10, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 14, textDecoration: "none", letterSpacing: 1 }}>
            ← BACK TO EASY EXPRESS
          </a>
        </div>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;700;800&family=Orbitron:wght@700;800&display=swap');`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: F1, padding: "0 0 60px" }}>

      {/* ── Top accent bar ──────────────────────────────────────────── */}
      <div style={{ height: 3, background: `linear-gradient(90deg,${A},${PU},${A2})` }} />

      {/* ── Nav bar ─────────────────────────────────────────────────── */}
      <nav style={{ padding: "16px clamp(1rem,4vw,3rem)", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${BD}` }}>
        <a href="#/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg,${A},${A2})`, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13, color: BG, fontFamily: F1 }}>EE</div>
          <span style={{ color: T, fontWeight: 700, fontSize: 15, letterSpacing: 1.5, fontFamily: F1 }}>EASY EXPRESS</span>
        </a>
        <a href="#/" style={{ fontFamily: F1, fontSize: 12, color: TD, textDecoration: "none", fontWeight: 700, letterSpacing: 1 }}>← BACK TO SITE</a>
      </nav>

      {/* ── Page content ─────────────────────────────────────────────── */}
      <main style={{ maxWidth: 820, margin: "0 auto", padding: "40px clamp(1rem,4vw,2rem)" }}>

        {/* Page title */}
        <div style={{ marginBottom: 36 }}>
          <span style={{ fontFamily: F1, fontSize: 11, fontWeight: 700, color: A, letterSpacing: 2.5, textTransform: "uppercase" }}>USER DASHBOARD</span>
          <h1 style={{ fontFamily: F2, fontSize: "clamp(1.6rem,4vw,2.2rem)", fontWeight: 900, color: T, margin: "8px 0 4px" }}>
            Your Account
          </h1>
          <p style={{ color: TD, fontFamily: F1, fontSize: 13 }}>Manage your Easy Express profile and game access.</p>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: TD, fontFamily: F1 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", border: `2px solid ${BD}`, borderTop: `2px solid ${A}`, margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
            Loading your profile...
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: "14px 18px", background: `${A2}0a`, border: `1px solid ${A2}25`, borderRadius: 12, color: A2, fontFamily: F1, fontSize: 13, marginBottom: 24 }}>
            ⚠ {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Profile Card ───────────────────────────────────────── */}
            <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 16, padding: "28px 28px", marginBottom: 24, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${A},${PU})` }} />
              <SectionHeader>PROFILE</SectionHeader>

              <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24, flexWrap: "wrap" }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: `linear-gradient(135deg,${A}20,${PU}20)`, border: `2px solid ${A}30`, display: "grid", placeItems: "center", fontSize: 28, flexShrink: 0 }}>
                  👤
                </div>
                <div>
                  <div style={{ fontFamily: F2, fontSize: 18, fontWeight: 800, color: T }}>{username || "Player"}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <span style={{ fontFamily: F1, fontSize: 11, color: TD }}>PlayFab ID:</span>
                    <code style={{ fontFamily: F2, fontSize: 10, color: A, background: `${A}10`, padding: "2px 8px", borderRadius: 4 }}>{pfId || "—"}</code>
                    <button onClick={handleCopyId} style={{ background: "none", border: "none", color: copySuccess ? OK : TD, cursor: "pointer", fontFamily: F1, fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: 0 }}>
                      {copySuccess ? "✓ COPIED" : "COPY"}
                    </button>
                  </div>
                </div>

                {/* Game ownership badge */}
                <div style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 20, background: ownsGame ? `${OK}12` : `${TD}10`, border: `1px solid ${ownsGame ? OK + "40" : BD}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 14 }}>{ownsGame ? "🎮" : "🔒"}</span>
                  <div>
                    <div style={{ fontFamily: F2, fontSize: 9, fontWeight: 800, color: ownsGame ? OK : TD, letterSpacing: 1.5 }}>{ownsGame ? "FULL GAME" : "DEMO ONLY"}</div>
                    <div style={{ fontFamily: F1, fontSize: 9, color: TD }}>{ownsGame ? "All content unlocked" : "Upgrade to unlock all"}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <StatBadge label="Username"  value={username} accent={A} />
                <StatBadge label="Account Type" value={ownsGame ? "Full Game Owner" : "Demo User"} accent={ownsGame ? OK : TD} />
                <StatBadge label="Player ID" value={pfId ? pfId.slice(0, 8) + "..." : "—"} />
              </div>
            </div>

            {/* ── Transaction Receipt ────────────────────────────────── */}
            <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 16, padding: "28px 28px", marginBottom: 24, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${OK},${A})` }} />
              <SectionHeader>TRANSACTION HISTORY</SectionHeader>

              {ownsGame && receipt ? (
                <div>
                  {/* Receipt card */}
                  <div style={{ background: BG, borderRadius: 12, border: `1px solid ${OK}20`, overflow: "hidden" }}>
                    <div style={{ padding: "12px 18px", background: `${OK}08`, borderBottom: `1px solid ${OK}15`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontFamily: F2, fontSize: 11, color: OK, fontWeight: 800, letterSpacing: 1 }}>PURCHASE RECEIPT</div>
                      <div style={{ fontFamily: F1, fontSize: 10, color: TD }}>#{receipt.paymentId?.slice(-8)?.toUpperCase() || "XXXXXXXX"}</div>
                    </div>
                    <div style={{ padding: "18px 18px" }}>
                      {[
                        { label: "Product",        value: "Easy Express — Full Game" },
                        { label: "License Type",   value: "One-Time Purchase, Lifetime" },
                        { label: "Amount Paid",    value: formatAmount(receipt.amountPaid),   accent: OK },
                        { label: "Payment Method", value: (receipt.paymentMethod || "GCash / Card").toUpperCase() },
                        { label: "Date & Time",    value: formatDate(receipt.purchaseDate) },
                        { label: "Transaction ID", value: receipt.paymentId || "—" },
                        { label: "Status",         value: "✓ COMPLETED", accent: OK },
                      ].map((row, i, arr) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${BD}` : "none" }}>
                          <span style={{ fontFamily: F1, fontSize: 12, color: TD, fontWeight: 600 }}>{row.label}</span>
                          <span style={{ fontFamily: F1, fontSize: 12, color: row.accent || T, fontWeight: 700, textAlign: "right", maxWidth: "55%" }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p style={{ fontFamily: F1, fontSize: 11, color: TD, marginTop: 12, lineHeight: 1.6 }}>
                    ✉ A receipt was sent to your registered email address by PayMongo.
                  </p>
                </div>
              ) : (
                <div style={{ padding: "28px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🧾</div>
                  <p style={{ fontFamily: F1, fontSize: 13, color: TD, lineHeight: 1.6 }}>
                    No transactions yet. Purchase the full game to see your receipt here.
                  </p>
                  <a href="#/" style={{ display: "inline-block", marginTop: 16, padding: "10px 22px", background: `linear-gradient(135deg,${PU},${A2})`, borderRadius: 8, color: T, fontFamily: F1, fontWeight: 800, fontSize: 12, textDecoration: "none", letterSpacing: 1 }}>
                    🛒 BUY FULL GAME — ₱1
                  </a>
                </div>
              )}
            </div>

            {/* ── Download Section ──────────────────────────────────── */}
            <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 16, padding: "28px 28px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: ownsGame ? `linear-gradient(90deg,${OK},${A})` : `linear-gradient(90deg,${BD},${BD})` }} />
              <SectionHeader>DOWNLOAD</SectionHeader>

              <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontFamily: F2, fontSize: 15, fontWeight: 800, color: T, marginBottom: 6 }}>Easy Express</div>
                  <div style={{ fontFamily: F1, fontSize: 12, color: TD, lineHeight: 1.6 }}>
                    {ownsGame
                      ? "You own the full game. Download and play on any Windows PC."
                      : "Purchase the full game to unlock this download. The demo is available on the main page."}
                  </div>
                  {ownsGame && (
                    <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {["Windows 10/11", "~450 MB", "v1.0"].map((t) => (
                        <span key={t} style={{ fontFamily: F1, fontSize: 10, color: A, background: `${A}10`, padding: "3px 10px", borderRadius: 20 }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleDownload}
                  disabled={!ownsGame || downloading}
                  title={!ownsGame ? "Purchase the full game to unlock this download." : ""}
                  style={{
                    padding: "16px 28px",
                    borderRadius: 12,
                    border: "none",
                    fontFamily: F1,
                    fontWeight: 800,
                    fontSize: 14,
                    letterSpacing: 1,
                    cursor: ownsGame ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
                    transition: "all 0.3s",
                    background: ownsGame
                      ? `linear-gradient(135deg, ${OK}, ${A})`
                      : BD,
                    color: ownsGame ? BG : TD,
                    boxShadow: ownsGame ? `0 0 32px ${OK}25` : "none",
                    opacity: downloading ? 0.8 : 1,
                  }}
                >
                  {downloading
                    ? <><span style={{ animation: "spin 0.8s linear infinite", display: "inline-block" }}>⟳</span> STARTING...</>
                    : ownsGame
                      ? <>⬇ DOWNLOAD FULL GAME <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 600 }}>.exe</span></>
                      : <>🔒 PURCHASE TO UNLOCK</>}
                </button>
              </div>

              {/* Demo download always available */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BD}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <span style={{ fontFamily: F1, fontSize: 12, color: TD }}>Demo version (2 free scenarios) is always available:</span>
                <a href="https://your-cdn.com/EasyExpress_Demo_Setup.exe" target="_blank" rel="noreferrer"
                  style={{ fontFamily: F1, fontSize: 12, color: A, fontWeight: 700, textDecoration: "none" }}>
                  ⬇ Download Demo (Free)
                </a>
              </div>
            </div>
          </>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;600;700;800&family=Orbitron:wght@700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${BG}; }
        @keyframes spin    { from { transform: rotate(0deg)   } to { transform: rotate(360deg) } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}
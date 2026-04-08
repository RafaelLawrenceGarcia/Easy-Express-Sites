// ============================================================
//  ResetPasswordPage.jsx — FINAL
//  Easy Express – Thesis Project
// ============================================================
//  Step 1: Enter email → OTP sent via EmailJS
//  Step 2: Enter OTP → verified via CloudScript
//  Step 3: Identity verified → sends PlayFab recovery email
//  Step 4: Success — user clicks link in email to set password
// ============================================================

import React, { useState, useRef, useEffect } from "react";

const TITLE_ID = "164227";
const BASE_URL = `https://${TITLE_ID}.playfabapi.com`;

const EMAILJS_SERVICE_ID  = "service_3ixsdwk";
const EMAILJS_TEMPLATE_ID = "template_glp9rof";
const EMAILJS_PUBLIC_KEY  = "3LQw31VLjecEmrw0D";

const A    = "#00e5ff";
const A2   = "#ff3d71";
const BG   = "#0a0c10";
const CARD = "#12151c";
const T    = "#e0e6f0";
const TD   = "#7a8399";
const BD   = "#1e2333";
const OK   = "#00e676";
const WN   = "#ff9f1c";
const PU   = "#7c4dff";
const F1   = "'Chakra Petch', sans-serif";
const F2   = "'Orbitron', sans-serif";

// ── Helper: Guest login ──────────────────────────────────────
async function getGuestTicket() {
  let guestId = localStorage.getItem("ee_guest_id");
  if (!guestId) {
    guestId = "WG_" + Math.random().toString(36).substring(2, 14);
    localStorage.setItem("ee_guest_id", guestId);
  }
  const res = await fetch(`${BASE_URL}/Client/LoginWithCustomID`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ TitleId: TITLE_ID, CustomId: guestId, CreateAccount: true }),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.errorMessage || "Guest login failed");
  return json.data.SessionTicket;
}

// ── Helper: Execute CloudScript ──────────────────────────────
async function runCloudScript(ticket, functionName, params) {
  const res = await fetch(`${BASE_URL}/Client/ExecuteCloudScript`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Authorization": ticket },
    body: JSON.stringify({
      FunctionName: functionName,
      FunctionParameter: params,
      GeneratePlayStreamEvent: true,
    }),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.errorMessage || "CloudScript failed");
  return json.data;
}

// ── Helper: Send OTP via EmailJS ─────────────────────────────
async function sendOTPviaEmailJS(toEmail, otpCode) {
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: toEmail,
        player_name: "Player",
        otp_code: otpCode,
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("EmailJS failed: " + text);
  }
}

// ── Helper: Get Admin Key from Title Data ────────────────────
async function getAdminKey(ticket) {
  const res = await fetch(`${BASE_URL}/Client/GetTitleData`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Authorization": ticket },
    body: JSON.stringify({ Keys: ["AdminSecretKey"] }),
  });
  const json = await res.json();
  if (json.code === 200 && json.data?.Data?.AdminSecretKey) {
    return json.data.Data.AdminSecretKey;
  }
  throw new Error("AdminSecretKey not found in Title Data");
}

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function ResetPasswordPage() {
  const [step, setStep]       = useState(1);
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [ticket, setTicket]   = useState("");
  const [resultMsg, setResultMsg] = useState("");

  // OTP
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);
  const emailRef = useRef(null);

  useEffect(() => {
    if (step === 1 && emailRef.current) emailRef.current.focus();
    if (step === 2 && otpRefs.current[0]) otpRefs.current[0].focus();
  }, [step]);

  // ── Shared Styles ──────────────────────────────────────────
  const inputStyle = {
    width: "100%", padding: "14px 16px", background: BG,
    border: `1px solid ${BD}`, borderRadius: 10, color: T,
    fontSize: 15, fontFamily: F1, outline: "none",
    boxSizing: "border-box", transition: "border-color 0.3s",
  };

  const btnPrimary = {
    width: "100%", padding: 16,
    background: `linear-gradient(135deg, ${A}, #00b8d4)`,
    border: "none", borderRadius: 12, color: BG,
    fontFamily: F1, fontWeight: 800, fontSize: 15,
    cursor: "pointer", letterSpacing: 1.5, marginTop: 12,
    transition: "all 0.3s",
  };

  const btnSecondary = {
    background: "transparent", border: `1px solid ${BD}`,
    borderRadius: 10, color: TD, fontFamily: F1, fontSize: 13,
    fontWeight: 600, cursor: "pointer", padding: "12px 24px",
    letterSpacing: 0.5, transition: "all 0.3s", width: "100%",
    marginTop: 10,
  };

  const labelStyle = {
    display: "block", marginBottom: 8, color: TD,
    fontSize: 11, fontWeight: 700, letterSpacing: 2,
    fontFamily: F1, textTransform: "uppercase",
  };

  const errorBox = error ? (
    <div style={{
      color: A2, fontSize: 13, marginBottom: 20, fontFamily: F1,
      padding: "12px 16px", background: `${A2}08`, borderRadius: 12,
      border: `1px solid ${A2}20`, display: "flex", gap: 10,
      alignItems: "center", textAlign: "left", lineHeight: 1.5,
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>⚠</span>
      <span>{error}</span>
    </div>
  ) : null;

  // ── Step 1: Submit Email ───────────────────────────────────
  const handleSubmitEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const t = await getGuestTicket();
      setTicket(t);

      const csResult = await runCloudScript(t, "sendPasswordResetOTP", { email: trimmed });

      if (csResult.Error) {
        throw new Error(csResult.Error.Message || "CloudScript error");
      }

      const otpResult = csResult.FunctionResult;
      if (!otpResult || typeof otpResult.code === "undefined") {
        throw new Error(otpResult?.error || "CloudScript did not return a code.");
      }

      await sendOTPviaEmailJS(trimmed, otpResult.code);

      setLoading(false);
      setStep(2);
    } catch (err) {
      setLoading(false);
      setError(err.message || "Something went wrong. Please try again.");
    }
  };

  // ── Step 2: OTP Input ──────────────────────────────────────
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

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtpCode(pasted.split(""));
      if (otpRefs.current[5]) otpRefs.current[5].focus();
    }
  };

  const handleVerifyOTP = async () => {
    const code = otpCode.join("");
    if (code.length < 6) {
      setError("Enter the full 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await runCloudScript(ticket, "verifyPasswordResetOTPOnly", {
        email: email.trim().toLowerCase(),
        code,
      });
      if (r.FunctionResult?.success) {
        setLoading(false);
        setStep(3);
      } else {
        throw new Error(r.FunctionResult?.error || "Invalid or expired code.");
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || "Verification failed.");
    }
  };

  const handleResend = () => {
    setOtpCode(["", "", "", "", "", ""]);
    setError("");
    setStep(1);
  };

  // ── Step 3: Send PlayFab Recovery Email ────────────────────
  const handleSendResetLink = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/Client/SendAccountRecoveryEmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ TitleId: TITLE_ID, Email: email.trim().toLowerCase(), EmailTemplateId: "E9E106DF609D5116" }),
      });
      const json = await res.json();
      if (json.code !== 200) {
        throw new Error(json.errorMessage || "Failed to send reset email.");
      }

      setLoading(false);
      setResultMsg("A password reset link has been sent to your email. Click the link to set your new password — it will work in both the website and the game.");
      setStep(4);
    } catch (err) {
      setLoading(false);
      setError(err.message || "Failed to send reset email.");
    }
  };

  // ── Step Indicator ─────────────────────────────────────────
  const stepLabels = ["Email", "Verify", "Reset Link", "Done"];
  const StepIndicator = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 36 }}>
      {stepLabels.map((label, i) => {
        const s = i + 1;
        const active = step >= s;
        const current = step === s;
        const done = step > s;
        return (
          <React.Fragment key={i}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 56 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: done ? `${OK}20` : active ? `${A}20` : "transparent",
                border: `2px solid ${done ? OK : active ? A : BD}`,
                display: "grid", placeItems: "center",
                fontFamily: F2, fontSize: 12, fontWeight: 800,
                color: done ? OK : active ? A : TD,
                transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
              }}>
                {done ? "✓" : s}
              </div>
              <span style={{
                fontFamily: F1, fontSize: 9, fontWeight: 700,
                color: current ? A : active ? T : TD,
                letterSpacing: 1.5, textTransform: "uppercase",
              }}>{label}</span>
            </div>
            {i < 3 && (
              <div style={{
                flex: 1, height: 2, minWidth: 20, maxWidth: 48,
                background: step > s ? OK : step === s ? A : BD,
                margin: "0 4px", marginBottom: 20, borderRadius: 1,
                transition: "background 0.4s",
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ══════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div style={{
      minHeight: "100vh", background: BG, display: "flex",
      alignItems: "center", justifyContent: "center",
      padding: "40px 20px", fontFamily: F1, position: "relative",
      overflow: "hidden",
    }}>
      {/* Background Effects */}
      <div style={{
        position: "absolute", top: "-20%", left: "-10%",
        width: 600, height: 600, borderRadius: "50%",
        background: `radial-gradient(circle, ${A}10 0%, transparent 70%)`,
        filter: "blur(80px)", pointerEvents: "none",
        animation: "orbFloat 10s ease-in-out infinite alternate",
      }} />
      <div style={{
        position: "absolute", bottom: "-15%", right: "-5%",
        width: 500, height: 500, borderRadius: "50%",
        background: `radial-gradient(circle, ${PU}10 0%, transparent 70%)`,
        filter: "blur(80px)", pointerEvents: "none",
        animation: "orbFloat 8s ease-in-out 3s infinite alternate",
      }} />

      {/* Circuit Background */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.03, pointerEvents: "none" }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="circuit-reset" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
            <path d="M0 60h40m10 0h20m10 0h40M60 0v40m0 10v20m0 10v40" stroke={A} strokeWidth="0.7" fill="none" />
            <circle cx="60" cy="60" r="3" fill={A} />
            <circle cx="40" cy="60" r="1.5" fill={A} />
            <circle cx="80" cy="60" r="1.5" fill={A} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit-reset)" />
      </svg>

      <div style={{
        width: "100%", maxWidth: 480, position: "relative", zIndex: 1,
        animation: "modalSlideUp 0.5s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* Logo Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <a href="#/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: `linear-gradient(135deg,${A},${A2})`,
              display: "grid", placeItems: "center",
              fontWeight: 800, fontSize: 14, color: BG, fontFamily: F1,
            }}>EE</div>
            <span style={{ color: T, fontWeight: 700, fontSize: 18, letterSpacing: 1.5, fontFamily: F1 }}>
              EASY EXPRESS
            </span>
          </a>
        </div>

        {/* Main Card */}
        <div style={{
          background: CARD, border: `1px solid ${BD}`, borderRadius: 20,
          padding: "40px 36px", position: "relative", overflow: "hidden",
          boxShadow: `0 24px 80px ${BG}cc, 0 0 40px ${A}06`,
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3,
            background: step === 4
              ? `linear-gradient(90deg,${OK},${A})`
              : `linear-gradient(90deg,${A},${PU})`,
            transition: "background 0.5s",
          }} />

          <StepIndicator />
          {errorBox}

          {/* ── STEP 1: EMAIL ──────────────────────────── */}
          {step === 1 && (
            <div style={{ animation: "fadeSlideUp 0.4s ease-out" }}>
              <div style={{
                width: 72, height: 72, borderRadius: 18,
                background: `${A}10`, border: `1px solid ${A}20`,
                display: "grid", placeItems: "center",
                margin: "0 auto 24px", fontSize: 36,
              }}>🔑</div>

              <h1 style={{
                fontFamily: F2, fontSize: 22, fontWeight: 800,
                color: T, textAlign: "center", margin: "0 0 8px",
              }}>Reset Your Password</h1>
              <p style={{
                color: TD, fontSize: 14, fontFamily: F1, lineHeight: 1.7,
                textAlign: "center", margin: "0 0 32px",
              }}>
                Enter the email linked to your Easy Express account.
                We'll send you a verification code.
              </p>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Email Address</label>
                <input
                  ref={emailRef}
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !loading) handleSubmitEmail(); }}
                  style={{
                    ...inputStyle,
                    borderColor: error ? A2 : email.includes("@") ? A : BD,
                  }}
                />
              </div>

              <button
                onClick={handleSubmitEmail}
                disabled={loading}
                style={{
                  ...btnPrimary,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "SENDING CODE..." : "SEND VERIFICATION CODE"}
              </button>

              <a
                href="#/"
                style={{
                  display: "block", textAlign: "center", marginTop: 20,
                  color: TD, fontSize: 13, fontFamily: F1, fontWeight: 600,
                  textDecoration: "none", transition: "color 0.3s",
                }}
              >
                ← Back to Easy Express
              </a>

              <div style={{
                marginTop: 24, padding: "12px 16px",
                background: `${A}06`, borderRadius: 10,
                border: `1px solid ${A}12`,
              }}>
                <p style={{ fontFamily: F1, fontSize: 11, color: TD, lineHeight: 1.6, margin: 0, textAlign: "center" }}>
                  ℹ For security, we always show this confirmation whether or not an account exists with that email.
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 2: OTP VERIFICATION ───────────────── */}
          {step === 2 && (
            <div style={{ textAlign: "center", animation: "fadeSlideUp 0.4s ease-out" }}>
              <div style={{
                width: 68, height: 68, borderRadius: 16,
                background: `${A}10`, border: `1px solid ${A}20`,
                display: "grid", placeItems: "center",
                margin: "0 auto 24px", fontSize: 32,
              }}>📧</div>

              <h2 style={{ fontFamily: F2, fontSize: 22, fontWeight: 800, color: T, margin: "0 0 8px" }}>
                Check Your Inbox
              </h2>
              <p style={{ color: TD, fontSize: 14, fontFamily: F1, lineHeight: 1.6, margin: "0 0 6px" }}>
                We sent a 6-digit code to
              </p>
              <p style={{ color: A, fontSize: 15, fontFamily: F1, fontWeight: 700, margin: "0 0 32px" }}>
                {email}
              </p>

              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 28 }}>
                {otpCode.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                    style={{
                      width: 50, height: 60, textAlign: "center",
                      background: BG,
                      border: `2px solid ${d ? A : BD}`,
                      borderRadius: 12, color: T,
                      fontSize: 24, fontFamily: F2, fontWeight: 700,
                      outline: "none",
                      transition: "border-color 0.3s, box-shadow 0.3s",
                      boxShadow: d ? `0 0 12px ${A}15` : "none",
                    }}
                  />
                ))}
              </div>

              <button
                onClick={handleVerifyOTP}
                disabled={loading}
                style={{
                  ...btnPrimary,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "VERIFYING..." : "VERIFY CODE"}
              </button>

              <p style={{ color: TD, fontSize: 13, marginTop: 16, fontFamily: F1 }}>
                {"Didn't receive it? "}
                <button
                  onClick={handleResend}
                  disabled={loading}
                  style={{
                    background: "none", border: "none", color: A,
                    cursor: "pointer", fontFamily: "inherit",
                    fontSize: 13, fontWeight: 700,
                  }}
                >
                  Resend Code
                </button>
              </p>

              <button
                onClick={() => { setStep(1); setError(""); setOtpCode(["","","","","",""]); }}
                style={{ ...btnSecondary, marginTop: 12 }}
              >
                ← Change Email
              </button>
            </div>
          )}

          {/* ── STEP 3: IDENTITY VERIFIED — SEND RESET LINK ── */}
          {step === 3 && (
            <div style={{ textAlign: "center", animation: "fadeSlideUp 0.4s ease-out" }}>
              <div style={{
                width: 72, height: 72, borderRadius: 18,
                background: `${OK}10`, border: `1px solid ${OK}20`,
                display: "grid", placeItems: "center",
                margin: "0 auto 24px", fontSize: 36,
              }}>✓</div>

              <h2 style={{
                fontFamily: F2, fontSize: 22, fontWeight: 800,
                color: T, margin: "0 0 8px",
              }}>Identity Verified!</h2>

              <p style={{
                color: TD, fontSize: 14, fontFamily: F1, lineHeight: 1.7,
                textAlign: "center", margin: "0 0 8px",
              }}>
                We'll send a secure reset link to
              </p>
              <p style={{
                color: A, fontSize: 15, fontFamily: F1, fontWeight: 700,
                margin: "0 0 32px",
              }}>{email}</p>

              <button
                onClick={handleSendResetLink}
                disabled={loading}
                style={{
                  ...btnPrimary,
                  background: `linear-gradient(135deg, ${OK}, ${A})`,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "SENDING RESET LINK..." : "SEND PASSWORD RESET LINK"}
              </button>

              <p style={{
                color: TD, fontSize: 12, fontFamily: F1,
                marginTop: 16, lineHeight: 1.6,
              }}>
                You'll receive an email from PlayFab with a link to set your new password.
                This works for both the website and the game.
              </p>

              <button
                onClick={() => { setStep(1); setError(""); setOtpCode(["","","","","",""]); setEmail(""); }}
                style={{ ...btnSecondary, marginTop: 16 }}
              >
                ← Start Over
              </button>
            </div>
          )}

          {/* ── STEP 4: SUCCESS ────────────────────────── */}
          {step === 4 && (
            <div style={{ textAlign: "center", animation: "fadeSlideUp 0.4s ease-out" }}>
              <div style={{
                width: 88, height: 88, borderRadius: "50%",
                background: `${OK}10`, border: `2px solid ${OK}35`,
                display: "grid", placeItems: "center",
                margin: "0 auto 28px",
                animation: "successPop 0.6s cubic-bezier(0.16,1,0.3,1) both",
              }}>
                <span style={{ fontSize: 44, color: OK }}>✓</span>
              </div>

              <h2 style={{
                fontFamily: F2, fontSize: 24, fontWeight: 800,
                color: T, margin: "0 0 10px",
              }}>Reset Link Sent!</h2>
              <p style={{
                color: TD, fontSize: 14, fontFamily: F1, lineHeight: 1.7,
                margin: "0 0 8px",
              }}>
                {resultMsg || "A password reset link has been sent to your email."}
              </p>
              <p style={{
                color: A, fontSize: 15, fontFamily: F1, fontWeight: 700,
                margin: "0 0 32px",
              }}>
                {email}
              </p>

              {/* Next steps */}
              <div style={{
                textAlign: "left", padding: "20px 22px",
                background: BG, borderRadius: 14,
                border: `1px solid ${BD}`, marginBottom: 28,
              }}>
                <div style={{
                  fontFamily: F2, fontSize: 11, fontWeight: 700,
                  color: A, letterSpacing: 2, marginBottom: 14,
                }}>WHAT TO DO NEXT</div>
                {[
                  "Check your email for the reset link from PlayFab",
                  "Click the link and set your new password",
                  "Log in on the website with your new password",
                  "Launch the game and log in there too",
                ].map((s, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 12, alignItems: "flex-start",
                    marginBottom: i < 3 ? 10 : 0,
                  }}>
                    <span style={{
                      fontFamily: F2, fontSize: 10, fontWeight: 800,
                      color: OK, background: `${OK}15`,
                      padding: "3px 8px", borderRadius: 5, flexShrink: 0,
                    }}>{i + 1}</span>
                    <span style={{
                      fontFamily: F1, fontSize: 13, color: TD, lineHeight: 1.5,
                    }}>{s}</span>
                  </div>
                ))}
              </div>

              {/* Spam note */}
              <p style={{
                color: TD, fontSize: 11, fontFamily: F1, lineHeight: 1.6, marginBottom: 20,
              }}>
                {"Didn't receive it? Check your "}
                <strong style={{ color: T }}>Spam</strong>
                {" or "}
                <strong style={{ color: T }}>Junk</strong>
                {" folder. The email may take 1–2 minutes to arrive."}
              </p>

              <a
                href="#/"
                style={{
                  display: "block", width: "100%", padding: 16,
                  background: `linear-gradient(135deg, ${OK}, ${A})`,
                  border: "none", borderRadius: 12, color: BG,
                  fontFamily: F1, fontWeight: 800, fontSize: 15,
                  cursor: "pointer", letterSpacing: 1.5,
                  textDecoration: "none", textAlign: "center",
                }}
              >
                GO TO EASY EXPRESS
              </a>

              <button
                onClick={() => {
                  setStep(1); setEmail(""); setError("");
                  setOtpCode(["","","","","",""]); setResultMsg("");
                }}
                style={{ ...btnSecondary, marginTop: 12 }}
              >
                Reset Another Account
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: "center", marginTop: 32,
          fontFamily: F1, fontSize: 12, color: `${TD}80`,
        }}>
          <span style={{ color: A, fontWeight: 700 }}>Easy Express</span>
          {" © 2026 — "}
          <span style={{ color: `${T}80` }}>Team 4R</span>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700;800&family=Orbitron:wght@700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: ${BG}; }
        ::selection { background: ${A}40; color: ${T}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${BG}; }
        ::-webkit-scrollbar-thumb { background: ${BD}; border-radius: 3px; }
        input::placeholder { color: ${TD}50; }
        input:focus { border-color: ${A} !important; box-shadow: 0 0 0 3px ${A}12 !important; }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes successPop {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes orbFloat {
          0%   { transform: translate(0, 0); }
          100% { transform: translate(30px, -20px); }
        }
      `}</style>
    </div>
  );
}
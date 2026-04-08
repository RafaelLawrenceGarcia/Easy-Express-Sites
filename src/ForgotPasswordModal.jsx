// ============================================================
//  ForgotPasswordModal.jsx — FIXED
//  Easy Express – Thesis Project
// ============================================================
//  4-step forgot-password flow:
//    Step 1 — Enter email → OTP sent via EmailJS
//    Step 2 — Enter 6-digit OTP → CloudScript verifies
//    Step 3 — Enter new password → CloudScript changes it
//    Step 4 — Success confirmation
//
//  FIXES:
//    • CloudScript now uses Admin API for email lookup
//      (server.GetUserAccountInfo only accepts PlayFabId)
//    • No longer relies on PlayFab's recovery email
//    • Direct password change after OTP verification
// ============================================================

import React, { useState, useRef, useEffect } from "react";
import { executeCloudScript, getGuestSessionTicket } from "./playfab";
import { sendForgotPasswordOTP } from "./email";

const A    = "#00e5ff";
const A2   = "#ff3d71";
const BG   = "#0a0c10";
const CARD = "#12151c";
const T    = "#e0e6f0";
const TD   = "#7a8399";
const BD   = "#1e2333";
const OK   = "#00e676";
const WN   = "#ff9f1c";
const F1   = "'Chakra Petch', sans-serif";
const F2   = "'Orbitron', sans-serif";

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

export function ForgotPasswordModal({ onBack, addToast }) {
  const [step, setStep]       = useState(1); // 1=email, 2=OTP, 3=new password, 4=success
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const inputRef              = useRef(null);

  // OTP state (Step 2)
  const [otpCode, setOtpCode]               = useState(["", "", "", "", "", ""]);
  const otpRefs                              = useRef([]);
  const [sessionTicket, setSessionTicket]    = useState("");

  // New password state (Step 3)
  const [newPassword, setNewPassword]       = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw]           = useState(false);
  const [showConfPw, setShowConfPw]         = useState(false);

  useEffect(() => {
    if (step === 1 && inputRef.current) inputRef.current.focus();
    if (step === 2 && otpRefs.current[0]) otpRefs.current[0].focus();
  }, [step]);

  // ── Shared styles ──────────────────────────────────────────
  const inputStyle = {
    width: "100%", padding: "13px 16px", background: BG,
    border: `1px solid ${BD}`, borderRadius: 8, color: T,
    fontSize: 14, fontFamily: F1, outline: "none",
    boxSizing: "border-box", transition: "border-color 0.2s",
  };

  const btnPrimary = {
    width: "100%", padding: 14,
    background: `linear-gradient(135deg, ${A}, #00b8d4)`,
    border: "none", borderRadius: 10, color: BG,
    fontFamily: F1, fontWeight: 800, fontSize: 15,
    cursor: "pointer", letterSpacing: 1, marginTop: 8,
    transition: "opacity 0.2s",
  };

  const btnSecondary = {
    background: "transparent", border: `1px solid ${BD}`,
    borderRadius: 8, color: TD, fontFamily: F1, fontSize: 13,
    fontWeight: 600, cursor: "pointer", padding: "10px 20px",
    letterSpacing: 0.5, transition: "all 0.2s",
  };

  const labelStyle = {
    display: "block", marginBottom: 6, color: TD,
    fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
    fontFamily: F1, textTransform: "uppercase",
  };

  const pwToggleStyle = (active) => ({
    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", color: active ? A : TD,
    cursor: "pointer", fontFamily: F1, fontSize: 11, fontWeight: 700,
    letterSpacing: 0.5, padding: 0, lineHeight: 1,
  });

  // ── Step 1: Submit email → CloudScript generates OTP → EmailJS sends it ──

  const handleSubmitEmail = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");

    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError("Request timed out. Please check your connection and try again.");
    }, 15000);

    try {
      console.log("[ForgotPassword] Step 1: Getting guest session...");
      const ticket = await getGuestSessionTicket();
      setSessionTicket(ticket);
      console.log("[ForgotPassword] Step 2: Got ticket, calling CloudScript...");

      const csResult = await executeCloudScript({
        sessionTicket: ticket,
        functionName: "sendPasswordResetOTP",
        functionParameter: { email: trimmedEmail },
      });

      console.log("[ForgotPassword] Step 3: CloudScript response:", JSON.stringify(csResult));

      if (csResult.Error) {
        throw new Error("CloudScript error: " + (csResult.Error.Message || csResult.Error.Error || JSON.stringify(csResult.Error)));
      }

      if (csResult.Logs && csResult.Logs.length > 0) {
        csResult.Logs.forEach(log => console.warn("[CloudScript Log]", log.Level, log.Message));
      }

      const otpResult = csResult.FunctionResult;
      if (!otpResult || typeof otpResult.code === "undefined") {
        throw new Error(
          otpResult?.error ||
          "CloudScript 'sendPasswordResetOTP' did not return a code. Make sure the UPDATED CloudScript is deployed and AdminSecretKey is set in Title Internal Data."
        );
      }

      console.log("[ForgotPassword] Step 4: Got OTP, sending email...");

      // Send OTP email via EmailJS
      try {
        await sendForgotPasswordOTP(trimmedEmail, otpResult.code, "Player");
      } catch (emailErr) {
        console.error("[ForgotPassword] EmailJS error:", emailErr);
        const emailMsg = emailErr?.text || emailErr?.message || JSON.stringify(emailErr);
        throw new Error("EmailJS failed: " + emailMsg);
      }

      console.log("[ForgotPassword] Step 5: Email sent, moving to step 2");

      clearTimeout(timeoutId);
      setLoading(false);
      setStep(2);

      if (addToast) {
        addToast({
          type: "info",
          title: "OTP Sent!",
          message: "Check your inbox for the 6-digit verification code.",
          duration: 5000,
        });
      }
    } catch (err) {
      clearTimeout(timeoutId);
      setLoading(false);
      console.error("[ForgotPassword] Full error:", err);
      
      let msg;
      if (typeof err === "string") msg = err;
      else if (err && typeof err.message === "string") msg = err.message;
      else if (err && typeof err.text === "string") msg = err.text;
      else { try { msg = JSON.stringify(err); } catch (_) { msg = "Unknown error"; } }
      
      console.error("[ForgotPassword] Error message:", msg);
      setError(msg || "Unknown error. Check browser console (F12).");
    }
  };

  // ── Step 2: Verify OTP (no PlayFab email — just authorization) ──

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
      const r = await executeCloudScript({
        sessionTicket,
        functionName: "verifyPasswordResetOTPOnly",
        functionParameter: { email: email.trim().toLowerCase(), code },
      });
      if (r.FunctionResult?.success) {
        setLoading(false);
        setStep(3); // Go to new password step

        if (addToast) {
          addToast({
            type: "success",
            title: "Identity Verified!",
            message: "You can now set a new password.",
            duration: 5000,
          });
        }
      } else {
        throw new Error(r.FunctionResult?.error || "Invalid or expired code.");
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || "Verification failed.");
    }
  };

  const handleResendOTP = () => {
    setOtpCode(["", "", "", "", "", ""]);
    setError("");
    setStep(1);
  };

  // ── Step 3: Change password ──

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await executeCloudScript({
        sessionTicket,
        functionName: "changePassword",
        functionParameter: {
          email: email.trim().toLowerCase(),
          newPassword: newPassword,
        },
      });
      if (r.FunctionResult?.success) {
        setLoading(false);
        setStep(4); // Go to success

        if (addToast) {
          addToast({
            type: "success",
            title: "Password Changed!",
            message: r.FunctionResult.message || "Your password has been updated.",
            duration: 6000,
          });
        }
      } else {
        throw new Error(r.FunctionResult?.error || "Password change failed.");
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || "Something went wrong.");
    }
  };

  // ─────────────────────────────────────────────────────────────
  //  RENDER: STEP 1 — Email Input
  // ─────────────────────────────────────────────────────────────

  if (step === 1) {
    return (
      <div style={{ textAlign: "center", paddingTop: 8 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: `${A}12`, border: `1px solid ${A}25`, display: "grid", placeItems: "center", margin: "0 auto 24px", fontSize: 32 }}>
          🔐
        </div>

        <h2 style={{ fontFamily: F2, fontSize: 20, fontWeight: 800, color: T, margin: "0 0 8px" }}>
          Forgot Password?
        </h2>
        <p style={{ color: TD, fontSize: 13, fontFamily: F1, lineHeight: 1.6, margin: "0 0 28px" }}>
          Enter the email address linked to your account.
          We'll send you a 6-digit verification code.
        </p>

        {error && (
          <div style={{ color: A2, fontSize: 12, marginBottom: 16, fontFamily: F1, padding: "10px 14px", background: `${A2}0a`, borderRadius: 10, border: `1px solid ${A2}25`, display: "flex", gap: 8, alignItems: "center", textAlign: "left" }}>
            <span style={{ fontSize: 14 }}>⚠</span>{error}
          </div>
        )}

        <div style={{ textAlign: "left", marginBottom: 20 }}>
          <label style={labelStyle}>Email Address</label>
          <input
            ref={inputRef} type="email" placeholder="your@email.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !loading) handleSubmitEmail(); }}
            autoFocus
            style={{ ...inputStyle, borderColor: error ? A2 : email.includes("@") ? A : BD }}
          />
        </div>

        <button onClick={handleSubmitEmail} disabled={loading}
          style={{ ...btnPrimary, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "SENDING..." : "SEND VERIFICATION CODE"}
        </button>

        <div style={{ marginTop: 20 }}>
          <button onClick={onBack} disabled={loading} style={btnSecondary}>← Back to Login</button>
        </div>

        <p style={{ color: TD, fontSize: 11, fontFamily: F1, marginTop: 20, lineHeight: 1.6, padding: "10px 14px", background: `${A}06`, borderRadius: 8, border: `1px solid ${A}15` }}>
          ℹ For security, we always show this confirmation message whether or not an account exists with that email.
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  RENDER: STEP 2 — OTP Input
  // ─────────────────────────────────────────────────────────────

  if (step === 2) {
    return (
      <div style={{ textAlign: "center", paddingTop: 20 }}>
        <div style={{ width: 60, height: 60, borderRadius: 14, background: `${A}12`, border: `1px solid ${A}25`, display: "grid", placeItems: "center", margin: "0 auto 20px", fontSize: 28 }}>
          📧
        </div>

        <h2 style={{ fontFamily: F2, fontSize: 20, fontWeight: 800, color: T, margin: "0 0 6px" }}>Enter Verification Code</h2>
        <p style={{ color: TD, fontSize: 13, fontFamily: F1, lineHeight: 1.6, margin: "0 0 6px" }}>We sent a 6-digit code to</p>
        <p style={{ color: A, fontSize: 14, fontFamily: F1, fontWeight: 700, margin: "0 0 28px" }}>{email}</p>

        {error && (
          <div style={{ color: A2, fontSize: 12, marginBottom: 16, fontFamily: F1, padding: "10px 14px", background: `${A2}0a`, borderRadius: 10, border: `1px solid ${A2}25`, display: "flex", gap: 8, alignItems: "center", textAlign: "left" }}>
            <span style={{ fontSize: 14 }}>⚠</span>{error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
          {otpCode.map((d, i) => (
            <input key={i} ref={(el) => { otpRefs.current[i] = el; }}
              type="text" inputMode="numeric" maxLength={1} value={d}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              onPaste={i === 0 ? handleOtpPaste : undefined}
              style={{ width: 46, height: 54, textAlign: "center", background: BG, border: `1px solid ${d ? A : BD}`, borderRadius: 10, color: T, fontSize: 22, fontFamily: F2, fontWeight: 700, outline: "none", transition: "border-color 0.3s" }}
            />
          ))}
        </div>

        <button onClick={handleVerifyOTP} disabled={loading}
          style={{ ...btnPrimary, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "VERIFYING..." : "VERIFY CODE"}
        </button>

        <p style={{ color: TD, fontSize: 12, marginTop: 14, fontFamily: F1 }}>
          {"Didn't receive it? "}
          <button onClick={handleResendOTP} disabled={loading}
            style={{ background: "none", border: "none", color: A, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>
            Resend Code
          </button>
        </p>

        <div style={{ marginTop: 16 }}>
          <button onClick={onBack} style={btnSecondary}>← Back to Login</button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  RENDER: STEP 3 — New Password
  // ─────────────────────────────────────────────────────────────

  if (step === 3) {
    return (
      <div style={{ textAlign: "center", paddingTop: 12 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: `${OK}12`, border: `1px solid ${OK}25`, display: "grid", placeItems: "center", margin: "0 auto 24px", fontSize: 32 }}>
          🔒
        </div>

        <h2 style={{ fontFamily: F2, fontSize: 20, fontWeight: 800, color: T, margin: "0 0 8px" }}>
          Create New Password
        </h2>
        <p style={{ color: TD, fontSize: 13, fontFamily: F1, lineHeight: 1.6, margin: "0 0 6px" }}>
          Your identity has been verified. Choose a new password for
        </p>
        <p style={{ color: A, fontSize: 14, fontFamily: F1, fontWeight: 700, margin: "0 0 24px" }}>{email}</p>

        {error && (
          <div style={{ color: A2, fontSize: 12, marginBottom: 16, fontFamily: F1, padding: "10px 14px", background: `${A2}0a`, borderRadius: 10, border: `1px solid ${A2}25`, display: "flex", gap: 8, alignItems: "center", textAlign: "left" }}>
            <span style={{ fontSize: 14 }}>⚠</span>{error}
          </div>
        )}

        <div style={{ textAlign: "left", marginBottom: 16 }}>
          <label style={labelStyle}>New Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showNewPw ? "text" : "password"}
              placeholder="Minimum 8 characters"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
              style={{ ...inputStyle, paddingRight: 48 }}
            />
            <button type="button" onClick={() => setShowNewPw(!showNewPw)}
              style={pwToggleStyle(showNewPw)}>
              {showNewPw ? "HIDE" : "SHOW"}
            </button>
          </div>
          <PwStrength password={newPassword} />
        </div>

        <div style={{ textAlign: "left", marginBottom: 16 }}>
          <label style={labelStyle}>Confirm New Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showConfPw ? "text" : "password"}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !loading) handleChangePassword(); }}
              style={{
                ...inputStyle,
                paddingRight: 48,
                borderColor: confirmPassword
                  ? confirmPassword === newPassword ? OK : A2
                  : BD,
              }}
            />
            <button type="button" onClick={() => setShowConfPw(!showConfPw)}
              style={pwToggleStyle(showConfPw)}>
              {showConfPw ? "HIDE" : "SHOW"}
            </button>
          </div>
          {confirmPassword && confirmPassword !== newPassword && (
            <p style={{ fontFamily: F1, fontSize: 11, color: A2, marginTop: 6, fontWeight: 600 }}>
              Passwords do not match
            </p>
          )}
          {confirmPassword && confirmPassword === newPassword && (
            <p style={{ fontFamily: F1, fontSize: 11, color: OK, marginTop: 6, fontWeight: 600 }}>
              ✓ Passwords match
            </p>
          )}
        </div>

        {/* Password requirements */}
        <div style={{
          textAlign: "left", padding: "12px 14px", marginBottom: 16,
          background: BG, borderRadius: 10, border: `1px solid ${BD}`,
        }}>
          <div style={{ fontFamily: F2, fontSize: 9, fontWeight: 700, color: A, letterSpacing: 2, marginBottom: 8 }}>
            REQUIREMENTS
          </div>
          {[
            { ok: newPassword.length >= 8, text: "At least 8 characters" },
            { ok: /[A-Z]/.test(newPassword), text: "One uppercase letter" },
            { ok: /[0-9]/.test(newPassword), text: "One number" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: i < 2 ? 4 : 0 }}>
              <span style={{ fontSize: 11, color: r.ok ? OK : TD }}>{r.ok ? "✓" : "○"}</span>
              <span style={{ fontFamily: F1, fontSize: 11, color: r.ok ? T : TD }}>{r.text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleChangePassword}
          disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
          style={{
            ...btnPrimary,
            background: newPassword.length >= 8 && newPassword === confirmPassword
              ? `linear-gradient(135deg, ${OK}, ${A})`
              : BD,
            color: newPassword.length >= 8 && newPassword === confirmPassword ? BG : TD,
            opacity: loading ? 0.7 : 1,
            cursor: loading || newPassword.length < 8 || newPassword !== confirmPassword
              ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "CHANGING PASSWORD..." : "CHANGE PASSWORD"}
        </button>

        <div style={{ marginTop: 16 }}>
          <button onClick={onBack} style={btnSecondary}>← Back to Login</button>
        </div>

        <p style={{ color: TD, fontSize: 11, fontFamily: F1, marginTop: 16, lineHeight: 1.6, padding: "10px 14px", background: `${A}06`, borderRadius: 8, border: `1px solid ${A}15` }}>
          ⏱ You have 15 minutes to set your new password after OTP verification.
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  RENDER: STEP 4 — Success
  // ─────────────────────────────────────────────────────────────

  return (
    <div style={{ textAlign: "center", paddingTop: 12 }}>

      {/* Success icon */}
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: `${OK}12`, border: `2px solid ${OK}40`,
        display: "grid", placeItems: "center",
        margin: "0 auto 28px",
        animation: "successPop 0.6s cubic-bezier(0.16,1,0.3,1) both",
      }}>
        <span style={{ fontSize: 40, color: OK }}>✓</span>
      </div>

      <h2 style={{ fontFamily: F2, fontSize: 20, fontWeight: 800, color: T, margin: "0 0 8px" }}>
        Password Changed!
      </h2>
      <p style={{ color: TD, fontSize: 13, fontFamily: F1, lineHeight: 1.6, margin: "0 0 6px" }}>
        Your password has been updated successfully for
      </p>
      <p style={{ color: A, fontSize: 15, fontFamily: F1, fontWeight: 700, margin: "0 0 28px" }}>
        {email}
      </p>

      {/* Steps */}
      <div style={{
        textAlign: "left", padding: "18px 20px",
        background: BG, borderRadius: 12,
        border: `1px solid ${BD}`, marginBottom: 24,
      }}>
        <div style={{
          fontFamily: F2, fontSize: 11, fontWeight: 700,
          color: A, letterSpacing: 2, marginBottom: 12,
        }}>
          WHAT TO DO NEXT
        </div>

        {[
          "Close this dialog and click \"Log In\".",
          "Enter your email/username and your new password.",
          "Launch the Easy Express game client.",
          "Log in with the same new password. Start building!",
        ].map((s, i) => (
          <div key={i} style={{
            display: "flex", gap: 12, alignItems: "flex-start",
            marginBottom: i < 3 ? 10 : 0,
          }}>
            <span style={{
              fontFamily: F2, fontSize: 10, fontWeight: 800,
              color: OK, background: `${OK}15`,
              padding: "2px 8px", borderRadius: 4, flexShrink: 0,
            }}>
              {i + 1}
            </span>
            <span style={{ fontFamily: F1, fontSize: 12, color: TD, lineHeight: 1.5 }}>
              {s}
            </span>
          </div>
        ))}
      </div>

      {/* Back to Login */}
      <button onClick={onBack} style={{
        ...btnPrimary,
        background: `linear-gradient(135deg, ${OK}, ${A})`,
      }}>
        ← BACK TO LOGIN
      </button>

      {/* Try another email */}
      <button
        onClick={() => {
          setStep(1); setEmail(""); setError("");
          setOtpCode(["", "", "", "", "", ""]);
          setNewPassword(""); setConfirmPassword("");
        }}
        style={{ ...btnSecondary, display: "block", width: "100%", marginTop: 12, textAlign: "center" }}
      >
        Reset Another Account
      </button>
    </div>
  );
}

export default ForgotPasswordModal;
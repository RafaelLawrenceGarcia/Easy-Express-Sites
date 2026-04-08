import React, { useState, useEffect } from "react";

const TITLE_ID = "164227";
const BASE_URL = `https://${TITLE_ID}.playfabapi.com`;
const A = "#00e5ff"; const A2 = "#ff3d71"; const BG = "#0a0c10";
const CARD = "#12151c"; const T = "#e0e6f0"; const TD = "#7a8399";
const BD = "#1e2333"; const OK = "#00e676"; const F1 = "'Chakra Petch', sans-serif";
const F2 = "'Orbitron', sans-serif";

export default function ResetConfirmPage() {
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
    else setError("No reset token found in URL. Please request a new password reset.");
  }, []);

  const handleReset = async () => {
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE_URL}/Client/ResetPassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ TitleId: TITLE_ID, Token: token, Password: newPassword }),
      });
      const json = await res.json();
      if (json.code !== 200) throw new Error(json.errorMessage || "Password reset failed.");
      setDone(true);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const inputStyle = { width: "100%", padding: "14px 16px", background: BG, border: `1px solid ${BD}`, borderRadius: 10, color: T, fontSize: 15, fontFamily: F1, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: F1 }}>
      <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 20, padding: "40px 36px", width: "100%", maxWidth: 440, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: done ? `linear-gradient(90deg,${OK},${A})` : `linear-gradient(90deg,${A},${A2})` }} />

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <a href="#/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 7, background: `linear-gradient(135deg,${A},${A2})`, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13, color: BG, fontFamily: F1 }}>EE</div>
            <span style={{ color: T, fontWeight: 700, fontSize: 16, letterSpacing: 1.5 }}>EASY EXPRESS</span>
          </a>
        </div>

        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✓</div>
            <h2 style={{ fontFamily: F2, fontSize: 22, color: OK, marginBottom: 12 }}>Password Changed!</h2>
            <p style={{ color: TD, fontFamily: F1, fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>Your password has been updated. You can now log in with your new password on the website and in the game.</p>
            <a href="#/" style={{ display: "block", padding: 14, background: `linear-gradient(135deg,${OK},${A})`, borderRadius: 12, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 15, textDecoration: "none", textAlign: "center", letterSpacing: 1 }}>GO TO EASY EXPRESS</a>
          </div>
        ) : (
          <div>
            <h2 style={{ fontFamily: F2, fontSize: 22, fontWeight: 800, color: T, margin: "0 0 8px" }}>Set New Password</h2>
            <p style={{ color: TD, fontSize: 13, fontFamily: F1, marginBottom: 28, lineHeight: 1.6 }}>Choose a new password for your Easy Express account.</p>

            {error && (
              <div style={{ color: A2, fontSize: 13, marginBottom: 20, padding: "12px 16px", background: `${A2}08`, borderRadius: 10, border: `1px solid ${A2}20` }}>
                ⚠ {error}
              </div>
            )}

            {!token && !error ? (
              <p style={{ color: TD, fontFamily: F1 }}>Reading reset token...</p>
            ) : token && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 8, color: TD, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>New Password</label>
                  <input type="password" style={inputStyle} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 8 characters" />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", marginBottom: 8, color: TD, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Confirm Password</label>
                  <input type="password" style={{ ...inputStyle, borderColor: confirmPassword ? (confirmPassword === newPassword ? OK : A2) : BD }} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" onKeyDown={e => { if (e.key === "Enter" && !loading) handleReset(); }} />
                </div>
                <button onClick={handleReset} disabled={loading} style={{ width: "100%", padding: 15, background: `linear-gradient(135deg,${A},#00b8d4)`, border: "none", borderRadius: 12, color: BG, fontFamily: F1, fontWeight: 800, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, letterSpacing: 1 }}>
                  {loading ? "SAVING..." : "SET NEW PASSWORD"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;600;700;800&family=Orbitron:wght@700;800&display=swap'); *{box-sizing:border-box;margin:0} input::placeholder{color:#7a839960} input:focus{border-color:${A}!important;box-shadow:0 0 0 3px ${A}12!important;outline:none}`}</style>
    </div>
  );
}
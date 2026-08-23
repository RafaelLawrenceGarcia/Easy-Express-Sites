import { useMemo, useState } from "react";

const TITLE_ID = "164227";

export default function ResetConfirmPage() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") || "", []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const valid = password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password) && password === confirm;
  const submit = async (event) => {
    event.preventDefault();
    if (!token) return setError("This recovery link is missing its secure token. Request a new link.");
    if (!valid) return setError("Use at least 8 characters with one uppercase letter and one number, then confirm it exactly.");
    setLoading(true); setError("");
    try {
      const response = await fetch(`https://${TITLE_ID}.playfabapi.com/Client/ResetPassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ TitleId: TITLE_ID, Token: token, Password: password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || (payload.code && payload.code !== 200)) throw new Error(payload.errorMessage || "This recovery link is invalid or expired.");
      setDone(true);
    } catch (err) {
      setError(err.message || "Password reset failed. Request a new recovery link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="recovery-page">
      <div className="recovery-visual"><a className="recovery-brand" href="#/"><span>EE</span><strong>Easy Express</strong></a><div><small>PLAYER SERVICES</small><h1>A fresh key<br />for your shop.</h1><p>Choose a strong password you do not use on another website or game.</p></div><div className="recovery-note">Your reset link is single-use and may expire.</div></div>
      <section className="recovery-card">
        <a className="recovery-back" href="#/">← Back to website</a>
        {!token && !done ? <div className="recovery-success recovery-invalid"><span>!</span><small className="section-kicker">Invalid link</small><h2>Request a new link.</h2><p>This recovery URL is incomplete or has expired.</p><a className="button" href="#/reset-password">Start account recovery <b>→</b></a></div> : done ? <div className="recovery-success"><span>✓</span><small className="section-kicker">Password updated</small><h2>You’re ready to log in.</h2><p>Your new password now works on this website and inside the Easy Express game.</p><a className="button" href="#/">Return and log in <b>→</b></a></div> : <form onSubmit={submit}><span className="section-kicker">New password</span><h2>Secure your account.</h2><p>Use at least 8 characters, one uppercase letter, and one number.</p>{error && <div className="form-alert" role="alert">{error}</div>}<label>New password<div className="recovery-password"><input autoFocus type={show ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="Create a strong password" /><button type="button" onClick={() => setShow((value) => !value)}>{show ? "Hide" : "Show"}</button></div></label><ul className="password-rules"><li className={password.length >= 8 ? "met" : ""}>8+ characters</li><li className={/[A-Z]/.test(password) ? "met" : ""}>Uppercase letter</li><li className={/\d/.test(password) ? "met" : ""}>Number</li></ul><label>Confirm password<input type="password" autoComplete="new-password" value={confirm} onChange={(event) => { setConfirm(event.target.value); setError(""); }} placeholder="Type it again" /></label><button className="button" disabled={loading || !valid}>{loading ? "Updating…" : "Set new password"}<b>→</b></button></form>}
      </section>
    </main>
  );
}

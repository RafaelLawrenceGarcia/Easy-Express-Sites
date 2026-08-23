import { useState } from "react";
import { sendPasswordRecoveryEmail } from "./playfab";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return setError("Enter a valid email address.");
    setLoading(true); setError("");
    try {
      await sendPasswordRecoveryEmail(value);
      setSent(true);
    } catch (err) {
      setError(err.message || "We could not send the recovery email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="recovery-page">
      <div className="recovery-visual"><a className="recovery-brand" href="#/"><span>EE</span><strong>Easy Express</strong></a><div><small>PLAYER SERVICES</small><h1>Get back<br />to the shop.</h1><p>A secure PlayFab recovery link will let you choose a new password.</p></div><div className="recovery-note">Never share your password or recovery link with anyone.</div></div>
      <section className="recovery-card">
        <a className="recovery-back" href="#/">← Back to website</a>
        {!sent ? <form onSubmit={submit}><span className="section-kicker">Account recovery</span><h2>Reset your password.</h2><p>Enter the email connected to your Easy Express account. For privacy, the confirmation looks the same whether an account exists or not.</p>{error && <div className="form-alert" role="alert">{error}</div>}<label>Email address<input autoFocus type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="you@email.com" /></label><button className="button" disabled={loading}>{loading ? "Sending…" : "Send recovery link"}<b>→</b></button></form> : <div className="recovery-success"><span>✓</span><small className="section-kicker">Email sent</small><h2>Check your inbox.</h2><p>If an Easy Express account uses <strong>{email}</strong>, PlayFab has sent a secure password-reset link. Check Spam or Junk if it does not appear soon.</p><a className="button" href="#/">Return to Easy Express <b>→</b></a></div>}
      </section>
    </main>
  );
}

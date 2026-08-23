import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkFullGameOwnership,
  fetchTitleData,
  getAccountInfo,
  loginWithEmail,
  loginWithUsername,
  registerUser,
} from "./playfab";

const DEMO_URL = import.meta.env.VITE_DEMO_DOWNLOAD_URL || "https://5vjqsakcfsmagarc.public.blob.vercel-storage.com/downloads/Easy-Express-Demo.rar";
const FULL_URL = import.meta.env.VITE_FULL_GAME_DOWNLOAD_URL || "";

const FEATURES = [
  { number: "01", title: "Build real PCs", text: "Seat processors, route cables, install GPUs, and learn why every connection matters." },
  { number: "02", title: "Diagnose the problem", text: "Read symptoms, test components, and solve believable faults instead of clicking a magic repair button." },
  { number: "03", title: "Run the counter", text: "Manage orders, inventory, budgets, and customer expectations while your shop grows." },
  { number: "04", title: "Learn by doing", text: "Practice PC hardware fundamentals inside a friendly simulator designed for students and first-time builders." },
];

const FALLBACK_NEWS = [
  { id: 1, type: "BUILD UPDATE", date: "August 2026", title: "Easy Express is getting sharper", desc: "Refined interactions, clearer objectives, and a smoother shop workflow are now in development." },
  { id: 2, type: "TEAM 4R", date: "2026", title: "Made as a computer science thesis", desc: "A learning-focused PC shop simulator built in Unity by Team 4R." },
];

const FAQS = [
  ["Do I use the same account in the game?", "Yes. Create your account here, verify your email, then use the same username and password inside Easy Express."],
  ["What platform does Easy Express support?", "The current build is made for 64-bit Windows 10 and Windows 11."],
  ["Why is email verification required?", "It protects account recovery and helps keep your saved game progress connected to the right player."],
  ["I did not receive a verification code.", "Check Spam or Junk first, then use Resend code. Resending is limited briefly to prevent accidental duplicate emails."],
  ["Is this connected to EasyPC or PC Express?", "Yes. Easy Express is connected with both EasyPC and PC Express as part of the project."],
];

const FRIENDLY_ERRORS = {
  "User not found": "We could not find that account.",
  "Invalid username or password": "The username/email or password is incorrect.",
  "Invalid input parameters": "One or more account details are invalid. Check the highlighted rules and try again.",
  "Username contains invalid characters": "Usernames can contain only letters and numbers—no spaces, dashes, or underscores.",
  "Invalid username": "Use a username containing 3–20 letters and numbers only.",
  "Invalid email address": "Enter a valid email address.",
  "Invalid password": "Use at least 8 characters with one uppercase letter and one number.",
  "Email address not available": "That email is already connected to an account.",
  "Username not available": "That username is already taken.",
  "Name not available": "That profile name could not be used. Choose a different name.",
  "display name entered is not available": "That profile name could not be used. Choose a different name.",
  "Profane display name": "Please use a different player name.",
};

function friendlyError(error, fallback = "Something went wrong. Please try again.") {
  const message = String(error?.message || error || fallback);
  const match = Object.entries(FRIENDLY_ERRORS).find(([key]) => message.toLowerCase().includes(key.toLowerCase()));
  return match ? match[1] : message;
}

async function apiRequest(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Request failed. Please try again.");
  return payload;
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const notify = useCallback((message, tone = "info") => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items, { id, message, tone }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4200);
  }, []);
  return { toasts, notify };
}

function Brand({ compact = false }) {
  return (
    <a className="brand" href="#top" aria-label="Easy Express home">
      <span className="brand-mark"><i /><i /><i /></span>
      <span className="brand-copy"><strong>Easy Express</strong>{!compact && <small>PC shop simulator</small>}</span>
    </a>
  );
}

function Toasts({ items }) {
  return (
    <div className="toast-stack" aria-live="polite">
      {items.map((item) => <div className={`toast toast-${item.tone}`} key={item.id}><span />{item.message}</div>)}
    </div>
  );
}

function Header({ account, isAdmin, onAuth, onAccount, onAdmin }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header className="site-header">
      <div className="nav-shell">
        <Brand />
        <button className="menu-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Toggle navigation"><span /><span /></button>
        <nav className={open ? "nav-links nav-open" : "nav-links"} aria-label="Main navigation">
          <a href="#game" onClick={close}>The game</a>
          <a href="#gameplay" onClick={close}>Gameplay</a>
          <a href="#media" onClick={close}>Media</a>
          <a href="#requirements" onClick={close}>Requirements</a>
          {isAdmin && <button className="nav-admin" onClick={() => { close(); onAdmin(); }}>Admin</button>}
          {account ? (
            <button className="account-chip" onClick={() => { close(); onAccount(); }}><span>{account.username?.slice(0, 1).toUpperCase()}</span>{account.username}</button>
          ) : (
            <div className="nav-actions"><button className="text-button" onClick={() => onAuth("login")}>Log in</button><button className="button button-small" onClick={() => onAuth("signup")}>Create account</button></div>
          )}
        </nav>
      </div>
    </header>
  );
}

function Hero({ account, ownsGame, onAuth, onAccount, onDownload }) {
  return (
    <main id="top">
      <section className="hero">
        <img
          className="hero-image"
          src="/gallery/hero-workshop-v2.jpg?v=20260823"
          alt="A professionally equipped Easy Express PC workshop with a custom gaming computer on the repair bench"
          fetchPriority="high"
        />
        <div className="hero-shade" />
        <div className="hero-grid" />
        <div className="page-shell hero-content">
          <div className="eyebrow"><span />PC building, without the guesswork</div>
          <h1>Build the PC.<br /><em>Earn the trust.</em><br />Run the shop.</h1>
          <p className="hero-lede">Easy Express turns real PC hardware skills into a hands-on shop simulation—approachable for beginners, satisfying for builders.</p>
          <div className="hero-actions">
            {account ? <button className="button" onClick={onAccount}>{ownsGame ? "Open your game access" : "Open your account"}<b>→</b></button> : <button className="button" onClick={() => onAuth("signup")}>Create your player account <b>→</b></button>}
            <button className="button button-ghost" onClick={() => document.querySelector("#media")?.scrollIntoView({ behavior: "smooth" })}>Watch gameplay</button>
          </div>
          <div className="hero-meta">
            <div><small>Platform</small><strong>Windows 10 / 11</strong></div>
            <div><small>Made with</small><strong>Unity</strong></div>
            <div><small>Project</small><strong>Team 4R thesis</strong></div>
          </div>
          <button className="download-inline" onClick={() => onDownload(ownsGame)}>{ownsGame ? "Download full version" : "Download demo"}<span>{(ownsGame ? FULL_URL : DEMO_URL) ? "Ready" : "Link pending"}</span></button>
        </div>
        <div className="hero-stamp"><span>EE</span><small>Learn • Build • Repair</small></div>
      </section>

      <section className="intro-section" id="game">
        <div className="page-shell intro-grid">
          <div><span className="section-kicker">More than assembly</span><h2>Your first day behind the counter starts here.</h2></div>
          <div><p>Customers arrive with budgets, symptoms, and expectations. You decide what to inspect, which parts fit, and how to finish the job properly.</p><p className="muted">No prior PC-building experience required. The game explains the essentials as you work.</p></div>
        </div>
        <div className="page-shell feature-grid">
          {FEATURES.map((feature) => <article className="feature-card" key={feature.number}><span>{feature.number}</span><h3>{feature.title}</h3><p>{feature.text}</p></article>)}
        </div>
      </section>

      <section className="gameplay-section" id="gameplay">
        <div className="page-shell gameplay-layout">
          <div className="gameplay-image"><img src="/gallery/Diagnose.png" alt="Diagnosing a PC in Easy Express" /><div className="image-label"><span>Workshop view</span><strong>Diagnose before you replace.</strong></div></div>
          <div className="gameplay-copy"><span className="section-kicker">A readable game loop</span><h2>Inspect. Decide. Repair. Deliver.</h2><p>Easy Express keeps the workflow clear without flattening the challenge. Each job gives you enough context to think like a technician.</p>
            <ol className="process-list"><li><span>1</span><div><strong>Read the job</strong><small>Understand the customer’s symptoms and budget.</small></div></li><li><span>2</span><div><strong>Test your theory</strong><small>Inspect parts and isolate the real fault.</small></div></li><li><span>3</span><div><strong>Finish the build</strong><small>Install, verify, and return a working machine.</small></div></li></ol>
          </div>
        </div>
      </section>

      <MediaSection />
      <NewsSection />
      <Requirements />
      <Faq />
      <section className="account-cta"><div className="page-shell"><span className="section-kicker">Your progress follows you</span><h2>One account for the website and the game.</h2><p>Register once, verify your email, then sign in inside Easy Express with the same credentials.</p><button className="button button-light" onClick={() => account ? onAccount() : onAuth("signup")}>{account ? "View my account" : "Create my account"}<b>→</b></button></div></section>
    </main>
  );
}

function MediaSection() {
  const [active, setActive] = useState("video");
  return (
    <section className="media-section" id="media"><div className="page-shell"><div className="section-heading"><div><span className="section-kicker">From inside the shop</span><h2>See the workbench in action.</h2></div><div className="segmented"><button className={active === "video" ? "active" : ""} onClick={() => setActive("video")}>Trailer</button><button className={active === "shop" ? "active" : ""} onClick={() => setActive("shop")}>Shop</button><button className={active === "diagnose" ? "active" : ""} onClick={() => setActive("diagnose")}>Diagnosis</button></div></div>
      <div className="media-frame">{active === "video" ? <video controls preload="metadata" poster="/gallery/Shopinterior.png"><source src="/gallery/Trailer.mp4" type="video/mp4" /></video> : <img src={active === "shop" ? "/gallery/Shopinterior.png" : "/gallery/Diagnose.png"} alt={active === "shop" ? "Easy Express shop interior" : "Easy Express diagnosis gameplay"} />}</div></div></section>
  );
}

function NewsSection() {
  const [news, setNews] = useState(FALLBACK_NEWS);
  useEffect(() => {
    let active = true;
    fetchTitleData(["GameNews"]).then((data) => {
      if (!active || !data.GameNews) return;
      const parsed = JSON.parse(data.GameNews);
      if (Array.isArray(parsed) && parsed.length) setNews(parsed.slice(0, 3));
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  return <section className="news-section"><div className="page-shell"><div className="section-heading"><div><span className="section-kicker">Development log</span><h2>What’s happening at the shop.</h2></div></div><div className="news-list">{news.map((item, index) => <article key={item.id || index}><div><span>{item.type || "UPDATE"}</span><small>{item.date || "2026"}</small></div><h3>{item.title}</h3><p>{item.desc}</p></article>)}</div></div></section>;
}

function Requirements() {
  return <section className="requirements-section" id="requirements"><div className="page-shell requirements-layout"><div><span className="section-kicker">Before you install</span><h2>Built for everyday Windows PCs.</h2><p>Final download size and performance requirements may change while the game is refined.</p></div><div className="spec-card"><div><small>Operating system</small><strong>Windows 10 / 11, 64-bit</strong></div><div><small>Processor</small><strong>Intel Core i5 or AMD equivalent</strong></div><div><small>Memory</small><strong>8 GB RAM</strong></div><div><small>Graphics</small><strong>DirectX 11 compatible GPU</strong></div><div><small>Storage</small><strong>4 GB available space</strong></div><div><small>Input</small><strong>Keyboard & mouse</strong></div></div></div></section>;
}

function Faq() {
  return <section className="faq-section" id="faq"><div className="page-shell faq-layout"><div><span className="section-kicker">Quick answers</span><h2>Good to know before you play.</h2><a href="mailto:easyexpress.4r@gmail.com">Still need help? Contact Team 4R →</a></div><div className="faq-list">{FAQS.map(([question, answer], index) => <details key={question} open={index === 0}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></div></section>;
}

function Footer() {
  return <footer><div className="page-shell footer-grid"><div><Brand /><p>A friendly, hands-on PC shop simulator by Team 4R.</p></div><div><small>Explore</small><a href="#game">The game</a><a href="#gameplay">Gameplay</a><a href="#requirements">Requirements</a></div><div><small>Support</small><a href="mailto:easyexpress.4r@gmail.com">Email the team</a><a href="#faq">Frequently asked questions</a></div></div><div className="page-shell footer-bottom"><span>© 2026 Team 4R. Academic project.</span><span>Connected with EasyPC and PC Express.</span></div></footer>;
}

function AuthDialog({ initialMode, onClose, onSuccess, notify }) {
  const pending = (() => { try { return JSON.parse(sessionStorage.getItem("ee_pending_registration") || "null"); } catch { return null; } })();
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ firstName: "", lastName: "", username: "", email: "", password: "", confirm: "", loginId: "", loginPassword: "" });
  const [remember, setRemember] = useState(false);
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [registration, setRegistration] = useState(pending);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const firstInput = useRef(null);

  useEffect(() => { firstInput.current?.focus(); }, [mode, step]);
  const update = (key) => (event) => { setForm((value) => ({ ...value, [key]: event.target.value })); setError(""); };
  const switchMode = (next) => { setMode(next); setStep(1); setError(""); };
  const validateStep = () => {
    if (step === 1) {
      if (!form.firstName.trim() || !form.lastName.trim()) return setError("Enter your first and last name.");
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.replace(/\s+/g, " ");
      if (fullName.length > 25) return setError("Keep your first and last name to 25 characters total.");
      if (!/^[A-Za-z0-9]{3,20}$/.test(form.username.trim())) return setError("Username must be 3–20 letters and numbers only—no spaces, dashes, or underscores.");
      setStep(2);
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError("Enter a valid email address.");
      if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/\d/.test(form.password)) return setError("Use at least 8 characters with one uppercase letter and one number.");
      if (form.password !== form.confirm) return setError("The passwords do not match.");
      setStep(3);
    }
  };

  const sendVerification = async (details) => {
    // Once PlayFab creates the account, always move to verification—even if
    // the mail provider needs a retry. Re-registering would only report that
    // the username/email is already taken.
    setMode("verify");
    await apiRequest("/api/registration-verification", { action: "send", sessionTicket: details.sessionTicket, email: details.email, username: details.username });
    notify(`Verification code sent to ${details.email}.`);
  };

  const signUp = async () => {
    if (!terms) return setError("Please accept the Terms and Privacy Notice to continue.");
    setLoading(true); setError("");
    try {
      const username = form.username.trim();
      const email = form.email.trim().toLowerCase();
      const displayName = `${form.firstName.trim()} ${form.lastName.trim()}`.replace(/\s+/g, " ");
      const result = await registerUser({ username, email, password: form.password, displayName });
      const details = { sessionTicket: result.SessionTicket, playFabId: result.PlayFabId, username, email };
      setRegistration(details);
      sessionStorage.setItem("ee_pending_registration", JSON.stringify(details));
      await sendVerification(details);
    } catch (err) { setError(friendlyError(err)); }
    finally { setLoading(false); }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(otp)) return setError("Enter the complete 6-digit code.");
    setLoading(true); setError("");
    try {
      await apiRequest("/api/registration-verification", { action: "verify", sessionTicket: registration.sessionTicket, code: otp });
      const identity = await getAccountInfo(registration.sessionTicket);
      sessionStorage.removeItem("ee_pending_registration");
      onSuccess({ ...identity, playFabId: identity.playFabId || registration.playFabId }, registration.sessionTicket, true);
      notify("Account verified. Welcome to Easy Express!", "success");
      onClose();
    } catch (err) { setError(friendlyError(err)); }
    finally { setLoading(false); }
  };

  const login = async (event) => {
    event?.preventDefault();
    if (!form.loginId.trim() || !form.loginPassword) return setError("Enter your username/email and password.");
    setLoading(true); setError("");
    try {
      const result = form.loginId.includes("@") ? await loginWithEmail({ email: form.loginId.trim().toLowerCase(), password: form.loginPassword }) : await loginWithUsername({ username: form.loginId.trim(), password: form.loginPassword });
      const identity = await getAccountInfo(result.SessionTicket);
      onSuccess(identity, result.SessionTicket, remember);
      notify(`Welcome back, ${identity.displayName || identity.username}.`, "success");
      onClose();
    } catch (err) { setError(friendlyError(err)); }
    finally { setLoading(false); }
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title"><aside><Brand /><div><span className="section-kicker">Player services</span><h2>One login.<br />Every repair.</h2><p>Your verified web account is the account you use inside the game.</p></div><ul><li><span>✓</span> Sync your game identity</li><li><span>✓</span> Recover access safely</li><li><span>✓</span> Keep purchases attached</li></ul></aside><section><button className="modal-close" onClick={onClose} aria-label="Close">×</button>
    {error && <div className="form-alert" role="alert">{error}</div>}
    {mode === "login" && <form onSubmit={login}><div className="form-heading"><span>Player login</span><h2 id="auth-title">Welcome back.</h2><p>Use the same credentials you use in Easy Express.</p></div><label>Username or email<input ref={firstInput} autoComplete="username" value={form.loginId} onChange={update("loginId")} placeholder="playername or you@email.com" /></label><label>Password<div className="password-field"><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={form.loginPassword} onChange={update("loginPassword")} placeholder="Your password" /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button></div></label><div className="form-row"><label className="check-label"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />Remember me on this device</label><a href="#/reset-password" onClick={onClose}>Forgot password?</a></div><button className="button form-submit" disabled={loading}>{loading ? "Signing in…" : "Log in"}<b>→</b></button><p className="form-switch">New to Easy Express? <button type="button" onClick={() => switchMode("signup")}>Create an account</button></p></form>}
    {mode === "signup" && <div><div className="form-heading"><span>Create account</span><h2 id="auth-title">Start your shop.</h2><p>Step {step} of 3 · {step === 1 ? "Your player identity" : step === 2 ? "Secure credentials" : "Review and verify"}</p></div><div className="step-track"><i className="done" /><i className={step >= 2 ? "done" : ""} /><i className={step >= 3 ? "done" : ""} /></div>
      {pending && step === 1 && <button className="pending-registration" onClick={() => { setRegistration(pending); setMode("verify"); setError(""); }}>Resume verification for <strong>{pending.username}</strong><span>→</span></button>}
      {step === 1 && <div className="form-fields"><div className="two-columns"><label>First name<input ref={firstInput} autoComplete="given-name" maxLength="24" value={form.firstName} onChange={update("firstName")} placeholder="Juan" /></label><label>Last name<input autoComplete="family-name" maxLength="24" value={form.lastName} onChange={update("lastName")} placeholder="Dela Cruz" /></label></div><label>Player username<input autoComplete="username" autoCapitalize="none" spellCheck="false" maxLength="20" value={form.username} onChange={update("username")} placeholder="juanbuilds" /><small>3–20 characters. Letters and numbers only—no spaces or symbols.</small></label><button className="button form-submit" onClick={validateStep}>Continue <b>→</b></button></div>}
      {step === 2 && <div className="form-fields"><label>Email address<input ref={firstInput} type="email" autoComplete="email" value={form.email} onChange={update("email")} placeholder="you@email.com" /><small>We will send your 6-digit verification code here.</small></label><label>Password<div className="password-field"><input type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={update("password")} placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button></div><small>Use one uppercase letter and one number.</small></label><label>Confirm password<input type="password" autoComplete="new-password" value={form.confirm} onChange={update("confirm")} placeholder="Type it again" /></label><div className="button-pair"><button className="button button-ghost" onClick={() => setStep(1)}>Back</button><button className="button" onClick={validateStep}>Review <b>→</b></button></div></div>}
      {step === 3 && <div className="review-card"><div><small>Name</small><strong>{form.firstName} {form.lastName}</strong></div><div><small>Username</small><strong>{form.username}</strong></div><div><small>Email</small><strong>{form.email}</strong></div><label className="check-label terms-check"><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />I agree to the Terms of Service and Privacy Notice.</label><div className="button-pair"><button className="button button-ghost" onClick={() => setStep(2)}>Back</button><button className="button" onClick={signUp} disabled={loading}>{loading ? "Creating account…" : "Create & send code"}</button></div></div>}
      <p className="form-switch">Already have an account? <button onClick={() => switchMode("login")}>Log in</button></p></div>}
    {mode === "verify" && <div className="verify-view"><div className="mail-symbol">@</div><div className="form-heading"><span>Email verification</span><h2 id="auth-title">Check your inbox.</h2><p>Enter the code sent to <strong>{registration?.email}</strong>.</p></div><label>6-digit code<input ref={firstInput} className="otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" /></label><button className="button form-submit" onClick={verify} disabled={loading || otp.length !== 6}>{loading ? "Verifying…" : "Verify account"}<b>→</b></button><button className="resend-button" disabled={loading} onClick={async () => { setLoading(true); setError(""); try { await sendVerification(registration); } catch (err) { setError(friendlyError(err)); } finally { setLoading(false); } }}>Resend code</button><p className="verification-note">You can close this window and resume verification later on this device.</p></div>}
  </section></div></div>;
}

function AccountDialog({ account, ownsGame, onClose, onLogout, onPurchase, onDownload }) {
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title"><button className="modal-close" onClick={onClose} aria-label="Close">×</button><div className="account-header"><span className="account-avatar">{account.username?.slice(0, 1).toUpperCase()}</span><div><small>Player account</small><h2 id="account-title">{account.displayName || account.username}</h2><p>@{account.username}</p></div><span className={ownsGame ? "license license-full" : "license"}>{ownsGame ? "Full game" : "Demo access"}</span></div><div className="account-details"><div><small>PlayFab ID</small><strong>{account.playFabId || "Unavailable"}</strong></div><div><small>Account sync</small><strong className="status-good">Active</strong></div><div><small>Game access</small><strong>{ownsGame ? "Full version" : "Demo version"}</strong></div></div><div className="account-actions">{ownsGame ? <button className="button" onClick={() => onDownload(true)}>Download full version <b>↓</b></button> : <><button className="button" onClick={onPurchase}>Buy full game · ₱299</button><button className="button button-ghost" onClick={() => onDownload(false)}>Download demo</button></>}<a href="#/reset-password" onClick={onClose}>Change or recover password</a></div><div className="account-footer"><button onClick={onLogout}>Log out of this device</button><span>Signed in securely</span></div></div></div>;
}

async function adminRequest(sessionTicket, service, endpoint, body) {
  const result = await apiRequest("/api/admin", { sessionTicket, service, endpoint, body });
  return result.data;
}

async function checkAdminStatus(sessionTicket) {
  const result = await adminRequest(sessionTicket, "Meta", "GetAdminStatus", {});
  return Boolean(result?.isAdmin);
}

function AdminDashboard({ sessionTicket, news, setNews, onClose, notify }) {
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [player, setPlayer] = useState(null);
  const [playerData, setPlayerData] = useState({});
  const [gold, setGold] = useState("0");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState({ title: "", desc: "", type: "UPDATE" });
  const [leaderboard, setLeaderboard] = useState([]);

  const run = async (work) => { setLoading(true); setMessage(""); try { await work(); } catch (err) { setMessage(friendlyError(err)); } finally { setLoading(false); } };
  const search = () => run(async () => {
    if (!query.trim()) throw new Error("Enter a player email or PlayFab ID.");
    const infoResult = await adminRequest(sessionTicket, "Admin", "GetUserAccountInfo", query.includes("@") ? { Email: query.trim() } : { PlayFabId: query.trim() });
    const info = infoResult.UserInfo;
    const [dataResult, statsResult] = await Promise.all([
      adminRequest(sessionTicket, "Server", "GetUserData", { PlayFabId: info.PlayFabId }),
      adminRequest(sessionTicket, "Server", "GetPlayerStatistics", { PlayFabId: info.PlayFabId, StatisticNames: ["Gold"] }),
    ]);
    const values = {}; Object.entries(dataResult.Data || {}).forEach(([key, value]) => { values[key] = value.Value; });
    setPlayer({ id: info.PlayFabId, email: info.PrivateInfo?.Email || "Not available", name: info.TitleInfo?.DisplayName || info.Username || "Unnamed player", banned: Boolean(info.TitleInfo?.isBanned) });
    setPlayerData(values); setGold(String(statsResult.Statistics?.find((item) => item.StatisticName === "Gold")?.Value || 0));
  });
  const savePlayer = () => run(async () => { await Promise.all([adminRequest(sessionTicket, "Admin", "UpdateUserData", { PlayFabId: player.id, Data: playerData }), adminRequest(sessionTicket, "Server", "UpdatePlayerStatistics", { PlayFabId: player.id, Statistics: [{ StatisticName: "Gold", Value: Number.parseInt(gold, 10) || 0 }] })]); notify("Player data saved.", "success"); });
  const toggleBan = () => run(async () => { if (!window.confirm(`${player.banned ? "Unban" : "Ban"} ${player.name}?`)) return; if (player.banned) await adminRequest(sessionTicket, "Admin", "RevokeAllBansForUser", { PlayFabId: player.id }); else await adminRequest(sessionTicket, "Admin", "BanUsers", { Bans: [{ PlayFabId: player.id, Reason: "Admin action" }] }); setPlayer((value) => ({ ...value, banned: !value.banned })); notify(player.banned ? "Player unbanned." : "Player banned.", "success"); });
  const publishNews = () => run(async () => { if (!draft.title.trim() || !draft.desc.trim()) throw new Error("Add a title and summary first."); const item = { id: Date.now(), type: draft.type, date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), title: draft.title.trim(), desc: draft.desc.trim() }; const updated = [item, ...news]; await adminRequest(sessionTicket, "Admin", "SetTitleData", { Key: "GameNews", Value: JSON.stringify(updated) }); setNews(updated); setDraft({ title: "", desc: "", type: "UPDATE" }); notify("News update published.", "success"); });
  const removeNews = (id) => run(async () => { if (!window.confirm("Delete this news item?")) return; const updated = news.filter((item) => item.id !== id); await adminRequest(sessionTicket, "Admin", "SetTitleData", { Key: "GameNews", Value: JSON.stringify(updated) }); setNews(updated); });
  const loadLeaderboard = () => run(async () => { const result = await adminRequest(sessionTicket, "Server", "GetLeaderboard", { StatisticName: "Gold", StartPosition: 0, MaxResultsCount: 50 }); setLeaderboard(result.Leaderboard || []); });

  const tabs = [["overview", "Overview"], ["players", "Players"], ["news", "News"], ["leaderboard", "Leaderboard"]];
  return <div className="admin-app"><aside className="admin-sidebar"><Brand compact /><div className="admin-label">Admin workspace</div><nav>{tabs.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><span>{id === "overview" ? "01" : id === "players" ? "02" : id === "news" ? "03" : "04"}</span>{label}</button>)}</nav><div className="admin-secure"><span>●</span><div><strong>Server-secured</strong><small>Admin key stays private</small></div></div><button className="admin-exit" onClick={onClose}>← Back to website</button></aside><main className="admin-main"><header><div><small>Easy Express control room</small><h1>{tabs.find(([id]) => id === tab)?.[1]}</h1></div><div className="admin-profile"><span>M</span><div><strong>Master admin</strong><small>Full access</small></div></div></header>{message && <div className="admin-message">{message}</div>}
    {tab === "overview" && <section className="admin-content"><div className="admin-hero"><div><span>System overview</span><h2>Everything important,<br />without the clutter.</h2><p>Manage players, publish news, and review the game economy from one protected workspace.</p></div><div className="admin-health"><small>Service status</small><strong><i /> Operational</strong><p>PlayFab admin actions are routed through the server.</p></div></div><div className="metric-grid"><article><span>AUTH</span><strong>Protected</strong><p>Canonical account verification</p></article><article><span>CONTENT</span><strong>{news.length}</strong><p>Published news entries</p></article><article><span>ECONOMY</span><strong>Gold</strong><p>Primary tracked statistic</p></article></div><div className="admin-callout"><div><span>Security change</span><h3>No secret keys in the browser.</h3></div><p>Every sensitive PlayFab request now checks the signed-in admin account on the server before it runs.</p></div></section>}
    {tab === "players" && <section className="admin-content"><div className="tool-heading"><div><span>Player directory</span><h2>Find and manage an account.</h2></div><div className="search-bar"><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Email address or PlayFab ID" /><button onClick={search} disabled={loading}>{loading ? "Searching…" : "Search"}</button></div></div>{player ? <div className="player-layout"><article className="player-profile"><span className="large-avatar">{player.name.slice(0, 1).toUpperCase()}</span><h3>{player.name}</h3><p>{player.email}</p><dl><div><dt>PlayFab ID</dt><dd>{player.id}</dd></div><div><dt>Status</dt><dd className={player.banned ? "danger" : "good"}>{player.banned ? "Banned" : "Active"}</dd></div></dl><button className={player.banned ? "safe-action" : "danger-action"} onClick={toggleBan}>{player.banned ? "Unban player" : "Ban player"}</button></article><article className="player-editor"><div className="card-title"><div><span>Game data</span><h3>Edit player values</h3></div><button onClick={savePlayer} disabled={loading}>Save changes</button></div><label>Gold balance<input type="number" value={gold} onChange={(e) => setGold(e.target.value)} /></label>{Object.keys(playerData).length ? Object.entries(playerData).map(([key, value]) => <label key={key}>{key}<input value={value} onChange={(e) => setPlayerData((data) => ({ ...data, [key]: e.target.value }))} /></label>) : <p className="empty-state">No custom player data has been saved yet.</p>}</article></div> : <div className="admin-empty"><span>EE</span><h3>Search for a player to begin.</h3><p>Use their registered email address or exact PlayFab ID.</p></div>}</section>}
    {tab === "news" && <section className="admin-content"><div className="news-admin-grid"><article className="publish-card"><span>New post</span><h2>Publish a game update.</h2><label>Category<select value={draft.type} onChange={(e) => setDraft((value) => ({ ...value, type: e.target.value }))}><option>UPDATE</option><option>PATCH</option><option>EVENT</option><option>NEW</option></select></label><label>Headline<input value={draft.title} onChange={(e) => setDraft((value) => ({ ...value, title: e.target.value }))} placeholder="What changed?" /></label><label>Summary<textarea value={draft.desc} onChange={(e) => setDraft((value) => ({ ...value, desc: e.target.value }))} placeholder="Give players the useful details." /></label><button className="button" onClick={publishNews} disabled={loading}>Publish update</button></article><article className="published-card"><div className="card-title"><div><span>Live content</span><h3>{news.length} published posts</h3></div></div>{news.map((item) => <div className="published-row" key={item.id}><div><small>{item.type} · {item.date}</small><strong>{item.title}</strong></div><button onClick={() => removeNews(item.id)}>Delete</button></div>)}</article></div></section>}
    {tab === "leaderboard" && <section className="admin-content"><div className="tool-heading"><div><span>Game economy</span><h2>Gold leaderboard.</h2></div><button className="button button-small" onClick={loadLeaderboard} disabled={loading}>{loading ? "Loading…" : "Refresh data"}</button></div><div className="admin-table"><div className="table-row table-head"><span>Rank</span><span>Player</span><span>PlayFab ID</span><span>Gold</span></div>{leaderboard.length ? leaderboard.map((item) => <div className="table-row" key={item.PlayFabId}><span>#{item.Position + 1}</span><strong>{item.DisplayName || "Unnamed player"}</strong><code>{item.PlayFabId}</code><b>{item.StatValue.toLocaleString()}</b></div>) : <div className="table-empty">Load the leaderboard to view player standings.</div>}</div></section>}
  </main></div>;
}

export default function EasyExpressSite() {
  const [authMode, setAuthMode] = useState(null);
  const [showAccount, setShowAccount] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [account, setAccount] = useState(null);
  const [sessionTicket, setSessionTicket] = useState("");
  const [ownsGame, setOwnsGame] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [news, setNews] = useState(FALLBACK_NEWS);
  const { toasts, notify } = useToasts();

  const clearSession = useCallback((announce = false) => {
    [localStorage, sessionStorage].forEach((storage) => ["ee_session_ticket", "ee_auth_pfid", "ee_auth_username", "ee_account"].forEach((key) => storage.removeItem(key)));
    setAccount(null); setSessionTicket(""); setOwnsGame(false); setIsAdmin(false); setShowAccount(false); setShowAdmin(false);
    if (announce) notify("You have been logged out.");
  }, [notify]);

  const saveSession = useCallback((identity, ticket, persistent) => {
    const storage = persistent ? localStorage : sessionStorage;
    const other = persistent ? sessionStorage : localStorage;
    ["ee_session_ticket", "ee_auth_pfid", "ee_auth_username", "ee_account"].forEach((key) => other.removeItem(key));
    storage.setItem("ee_session_ticket", ticket); storage.setItem("ee_auth_pfid", identity.playFabId || ""); storage.setItem("ee_auth_username", identity.username || ""); storage.setItem("ee_account", JSON.stringify(identity));
    setAccount(identity); setSessionTicket(ticket);
    checkFullGameOwnership(ticket).then(setOwnsGame).catch(() => setOwnsGame(false));
    checkAdminStatus(ticket).then(setIsAdmin).catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    const ticket = localStorage.getItem("ee_session_ticket") || sessionStorage.getItem("ee_session_ticket");
    if (!ticket) return;
    getAccountInfo(ticket).then((identity) => {
      setAccount(identity);
      setSessionTicket(ticket);
      return Promise.all([
        checkFullGameOwnership(ticket).catch(() => false),
        checkAdminStatus(ticket).catch(() => false),
      ]);
    }).then(([hasFullGame, hasAdminAccess]) => {
      setOwnsGame(hasFullGame);
      setIsAdmin(hasAdminAccess);
    }).catch(() => clearSession(false));
  }, [clearSession]);

  useEffect(() => { fetchTitleData(["GameNews"]).then((data) => { if (data.GameNews) { const parsed = JSON.parse(data.GameNews); if (Array.isArray(parsed)) setNews(parsed); } }).catch(() => {}); }, []);

  const download = (full) => { const url = full ? FULL_URL : DEMO_URL; if (!url) return notify(`${full ? "Full game" : "Demo"} download link has not been configured yet.`, "warning"); window.location.assign(url); };
  const purchase = async () => { if (!sessionTicket) { setShowAccount(false); setAuthMode("login"); return; } try { notify("Preparing secure checkout…"); const result = await apiRequest("/api/create-checkout", { method: "qrph", sessionTicket }); window.location.href = result.checkoutUrl; } catch (err) { notify(friendlyError(err), "warning"); } };

  if (showAdmin && isAdmin) return <AdminDashboard sessionTicket={sessionTicket} news={news} setNews={setNews} onClose={() => setShowAdmin(false)} notify={notify} />;

  return <div className="site-root"><Toasts items={toasts} /><Header account={account} isAdmin={isAdmin} onAuth={setAuthMode} onAccount={() => setShowAccount(true)} onAdmin={() => setShowAdmin(true)} /><Hero account={account} ownsGame={ownsGame} onAuth={setAuthMode} onAccount={() => setShowAccount(true)} onDownload={download} /><Footer />{authMode && <AuthDialog initialMode={authMode} onClose={() => setAuthMode(null)} onSuccess={saveSession} notify={notify} />}{showAccount && account && <AccountDialog account={account} ownsGame={ownsGame} onClose={() => setShowAccount(false)} onLogout={() => clearSession(true)} onPurchase={purchase} onDownload={download} />}</div>;
}

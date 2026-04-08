// ============================================================
//  ResetPasswordPage.jsx — FINAL
//  Step 1: Enter email → OTP sent via EmailJS
//  Step 2: Verify OTP via CloudScript
//  Step 3: Enter new password → POST to /api/reset-password
//  Step 4: Success
// ============================================================

import React, { useState, useRef, useEffect } from "react";

const TITLE_ID = "164227";
const BASE_URL = `https://${TITLE_ID}.playfabapi.com`;
const EMAILJS_SERVICE_ID  = "service_3ixsdwk";
const EMAILJS_TEMPLATE_ID = "template_glp9rof";
const EMAILJS_PUBLIC_KEY  = "3LQw31VLjecEmrw0D";

const A = "#00e5ff"; const A2 = "#ff3d71"; const BG = "#0a0c10";
const CARD = "#12151c"; const T = "#e0e6f0"; const TD = "#7a8399";
const BD = "#1e2333"; const OK = "#00e676"; const WN = "#ff9f1c";
const PU = "#7c4dff";
const F1 = "'Chakra Petch', sans-serif";
const F2 = "'Orbitron', sans-serif";

async function getGuestTicket() {
  let guestId = localStorage.getItem("ee_guest_id");
  if (!guestId) { guestId = "WG_" + Math.random().toString(36).substring(2, 14); localStorage.setItem("ee_guest_id", guestId); }
  const res = await fetch(`${BASE_URL}/Client/LoginWithCustomID`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ TitleId: TITLE_ID, CustomId: guestId, CreateAccount: true }) });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.errorMessage || "Guest login failed");
  return json.data.SessionTicket;
}

async function runCloudScript(ticket, functionName, params) {
  const res = await fetch(`${BASE_URL}/Client/ExecuteCloudScript`, { method: "POST", headers: { "Content-Type": "application/json", "X-Authorization": ticket }, body: JSON.stringify({ FunctionName: functionName, FunctionParameter: params, GeneratePlayStreamEvent: true }) });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.errorMessage || "CloudScript failed");
  return json.data;
}

async function sendOTPviaEmailJS(toEmail, otpCode) {
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ service_id: EMAILJS_SERVICE_ID, template_id: EMAILJS_TEMPLATE_ID, user_id: EMAILJS_PUBLIC_KEY, template_params: { to_email: toEmail, player_name: "Player", otp_code: otpCode } }) });
  if (!res.ok) throw new Error("EmailJS failed: " + await res.text());
}

function PwStrength({ password }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = [{ label:"WEAK",color:A2},{label:"WEAK",color:A2},{label:"FAIR",color:WN},{label:"GOOD",color:A},{label:"STRONG",color:OK},{label:"STRONG",color:OK}];
  const s = levels[score];
  return (
    <div style={{marginTop:8}}>
      <div style={{display:"flex",gap:4,marginBottom:4}}>{[1,2,3,4].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=Math.min(score,4)?s.color:BD}}/>)}</div>
      <div style={{fontFamily:F1,fontSize:10,fontWeight:700,color:s.color,letterSpacing:1.5}}>{s.label}</div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const [step, setStep]       = useState(1);
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [ticket, setTicket]   = useState("");
  const [otpCode, setOtpCode] = useState(["","","","","",""]);
  const otpRefs  = useRef([]);
  const emailRef = useRef(null);
  const [newPassword, setNewPassword]     = useState("");
  const [confirmPw, setConfirmPw]         = useState("");
  const [showNew, setShowNew]             = useState(false);
  const [showConf, setShowConf]           = useState(false);

  useEffect(() => {
    if (step === 1 && emailRef.current) emailRef.current.focus();
    if (step === 2 && otpRefs.current[0]) otpRefs.current[0].focus();
  }, [step]);

  const inputStyle = { width:"100%",padding:"14px 16px",background:BG,border:`1px solid ${BD}`,borderRadius:10,color:T,fontSize:15,fontFamily:F1,outline:"none",boxSizing:"border-box",transition:"border-color 0.3s" };
  const btnPrimary = { width:"100%",padding:16,background:`linear-gradient(135deg,${A},#00b8d4)`,border:"none",borderRadius:12,color:BG,fontFamily:F1,fontWeight:800,fontSize:15,cursor:"pointer",letterSpacing:1.5,marginTop:12 };
  const btnSec     = { background:"transparent",border:`1px solid ${BD}`,borderRadius:10,color:TD,fontFamily:F1,fontSize:13,fontWeight:600,cursor:"pointer",padding:"12px 24px",width:"100%",marginTop:10 };
  const labelSt    = { display:"block",marginBottom:8,color:TD,fontSize:11,fontWeight:700,letterSpacing:2,fontFamily:F1,textTransform:"uppercase" };
  const pwToggle   = (a) => ({ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:a?A:TD,cursor:"pointer",fontFamily:F1,fontSize:11,fontWeight:700,padding:0 });

  const Err = () => error ? (
    <div style={{color:A2,fontSize:13,marginBottom:20,fontFamily:F1,padding:"12px 16px",background:`${A2}08`,borderRadius:12,border:`1px solid ${A2}20`,display:"flex",gap:10,alignItems:"center",lineHeight:1.5}}>
      <span style={{fontSize:16,flexShrink:0}}>⚠</span><span>{error}</span>
    </div>
  ) : null;

  // Step 1
  const handleSubmitEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) { setError("Please enter a valid email address."); return; }
    setLoading(true); setError("");
    try {
      const t = await getGuestTicket(); setTicket(t);
      const cs = await runCloudScript(t, "sendPasswordResetOTP", { email: trimmed });
      const r = cs.FunctionResult;
      if (!r || r.error) throw new Error(r?.error || "Server error.");
      await sendOTPviaEmailJS(trimmed, r.code);
      setLoading(false); setStep(2);
    } catch (err) { setLoading(false); setError(err.message); }
  };

  // Step 2
  const handleOtpChange = (i,v) => { if(!/^\d*$/.test(v))return; const n=[...otpCode];n[i]=v.slice(-1);setOtpCode(n); if(v&&i<5&&otpRefs.current[i+1])otpRefs.current[i+1].focus(); };
  const handleOtpKey   = (i,e) => { if(e.key==="Backspace"&&!otpCode[i]&&i>0&&otpRefs.current[i-1])otpRefs.current[i-1].focus(); };
  const handleOtpPaste = (e) => { e.preventDefault();const p=e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);if(p.length===6){setOtpCode(p.split(""));if(otpRefs.current[5])otpRefs.current[5].focus();} };

  const handleVerifyOTP = async () => {
    const code = otpCode.join("");
    if (code.length < 6) { setError("Enter the full 6-digit code."); return; }
    setLoading(true); setError("");
    try {
      const r = await runCloudScript(ticket, "verifyPasswordResetOTPOnly", { email: email.trim().toLowerCase(), code });
      if (!r.FunctionResult?.success) throw new Error(r.FunctionResult?.error || "Invalid or expired code.");
      setLoading(false); setStep(3);
    } catch (err) { setLoading(false); setError(err.message); }
  };

  // Step 3 — calls Vercel serverless function
  const handleChangePassword = async () => {
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPw) { setError("Passwords do not match."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), newPassword })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Password reset failed.");
      setLoading(false); setStep(4);
    } catch (err) { setLoading(false); setError(err.message); }
  };

  const stepLabels = ["Email","Verify","New Password","Done"];
  const Steps = () => (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",marginBottom:36}}>
      {stepLabels.map((label,i) => {
        const s=i+1,active=step>=s,done=step>s,current=step===s;
        return (
          <React.Fragment key={i}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,minWidth:56}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:done?`${OK}20`:active?`${A}20`:"transparent",border:`2px solid ${done?OK:active?A:BD}`,display:"grid",placeItems:"center",fontFamily:F2,fontSize:12,fontWeight:800,color:done?OK:active?A:TD}}>
                {done?"✓":s}
              </div>
              <span style={{fontFamily:F1,fontSize:9,fontWeight:700,color:current?A:active?T:TD,letterSpacing:1.5,textTransform:"uppercase"}}>{label}</span>
            </div>
            {i<3&&<div style={{flex:1,height:2,minWidth:20,maxWidth:48,background:step>s?OK:step===s?A:BD,margin:"0 4px",marginBottom:20,borderRadius:1}}/>}
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 20px",fontFamily:F1,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:"-20%",left:"-10%",width:600,height:600,borderRadius:"50%",background:`radial-gradient(circle,${A}10 0%,transparent 70%)`,filter:"blur(80px)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"-15%",right:"-5%",width:500,height:500,borderRadius:"50%",background:`radial-gradient(circle,${PU}10 0%,transparent 70%)`,filter:"blur(80px)",pointerEvents:"none"}}/>

      <div style={{width:"100%",maxWidth:480,position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <a href="#/" style={{textDecoration:"none",display:"inline-flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:8,background:`linear-gradient(135deg,${A},${A2})`,display:"grid",placeItems:"center",fontWeight:800,fontSize:14,color:BG,fontFamily:F1}}>EE</div>
            <span style={{color:T,fontWeight:700,fontSize:18,letterSpacing:1.5,fontFamily:F1}}>EASY EXPRESS</span>
          </a>
        </div>

        <div style={{background:CARD,border:`1px solid ${BD}`,borderRadius:20,padding:"40px 36px",position:"relative",overflow:"hidden",boxShadow:`0 24px 80px ${BG}cc`}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:step===4?`linear-gradient(90deg,${OK},${A})`:`linear-gradient(90deg,${A},${PU})`}}/>
          <Steps/>
          <Err/>

          {/* STEP 1 */}
          {step===1&&(
            <div style={{animation:"fadeSlideUp 0.4s ease-out"}}>
              <div style={{width:72,height:72,borderRadius:18,background:`${A}10`,border:`1px solid ${A}20`,display:"grid",placeItems:"center",margin:"0 auto 24px",fontSize:36}}>🔑</div>
              <h1 style={{fontFamily:F2,fontSize:22,fontWeight:800,color:T,textAlign:"center",margin:"0 0 8px"}}>Reset Your Password</h1>
              <p style={{color:TD,fontSize:14,fontFamily:F1,lineHeight:1.7,textAlign:"center",margin:"0 0 32px"}}>Enter your account email. We'll verify it with a code first.</p>
              <div style={{marginBottom:20}}>
                <label style={labelSt}>Email Address</label>
                <input ref={emailRef} type="email" placeholder="your@email.com" value={email}
                  onChange={e=>{setEmail(e.target.value);setError("");}}
                  onKeyDown={e=>{if(e.key==="Enter"&&!loading)handleSubmitEmail();}}
                  style={{...inputStyle,borderColor:error?A2:email.includes("@")?A:BD}}/>
              </div>
              <button onClick={handleSubmitEmail} disabled={loading} style={{...btnPrimary,opacity:loading?0.7:1,cursor:loading?"not-allowed":"pointer"}}>
                {loading?"SENDING CODE...":"SEND VERIFICATION CODE"}
              </button>
              <a href="#/" style={{display:"block",textAlign:"center",marginTop:20,color:TD,fontSize:13,fontFamily:F1,fontWeight:600,textDecoration:"none"}}>← Back to Easy Express</a>
            </div>
          )}

          {/* STEP 2 */}
          {step===2&&(
            <div style={{textAlign:"center",animation:"fadeSlideUp 0.4s ease-out"}}>
              <div style={{width:68,height:68,borderRadius:16,background:`${A}10`,border:`1px solid ${A}20`,display:"grid",placeItems:"center",margin:"0 auto 24px",fontSize:32}}>📧</div>
              <h2 style={{fontFamily:F2,fontSize:22,fontWeight:800,color:T,margin:"0 0 8px"}}>Check Your Inbox</h2>
              <p style={{color:TD,fontSize:14,fontFamily:F1,margin:"0 0 6px"}}>We sent a 6-digit code to</p>
              <p style={{color:A,fontSize:15,fontFamily:F1,fontWeight:700,margin:"0 0 32px"}}>{email}</p>
              <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:28}}>
                {otpCode.map((d,i)=>(
                  <input key={i} ref={el=>{otpRefs.current[i]=el;}} type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={e=>handleOtpChange(i,e.target.value)} onKeyDown={e=>handleOtpKey(i,e)}
                    onPaste={i===0?handleOtpPaste:undefined}
                    style={{width:50,height:60,textAlign:"center",background:BG,border:`2px solid ${d?A:BD}`,borderRadius:12,color:T,fontSize:24,fontFamily:F2,fontWeight:700,outline:"none",boxShadow:d?`0 0 12px ${A}15`:"none"}}/>
                ))}
              </div>
              <button onClick={handleVerifyOTP} disabled={loading} style={{...btnPrimary,opacity:loading?0.7:1,cursor:loading?"not-allowed":"pointer"}}>
                {loading?"VERIFYING...":"VERIFY CODE"}
              </button>
              <p style={{color:TD,fontSize:13,marginTop:16,fontFamily:F1}}>
                {"Didn't receive it? "}
                <button onClick={()=>{setOtpCode(["","","","","",""]);setError("");setStep(1);}} disabled={loading}
                  style={{background:"none",border:"none",color:A,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700}}>Resend Code</button>
              </p>
              <button onClick={()=>{setStep(1);setError("");setOtpCode(["","","","","",""]);}} style={{...btnSec,marginTop:12}}>← Change Email</button>
            </div>
          )}

          {/* STEP 3 */}
          {step===3&&(
            <div style={{animation:"fadeSlideUp 0.4s ease-out"}}>
              <div style={{width:72,height:72,borderRadius:18,background:`${OK}10`,border:`1px solid ${OK}20`,display:"grid",placeItems:"center",margin:"0 auto 24px",fontSize:36}}>🔒</div>
              <h2 style={{fontFamily:F2,fontSize:22,fontWeight:800,color:T,margin:"0 0 8px",textAlign:"center"}}>Create New Password</h2>
              <p style={{color:TD,fontSize:14,fontFamily:F1,lineHeight:1.6,textAlign:"center",margin:"0 0 6px"}}>Identity verified. Choose a new password for</p>
              <p style={{color:A,fontSize:14,fontFamily:F1,fontWeight:700,textAlign:"center",margin:"0 0 24px"}}>{email}</p>
              <div style={{marginBottom:16}}>
                <label style={labelSt}>New Password</label>
                <div style={{position:"relative"}}>
                  <input type={showNew?"text":"password"} placeholder="Minimum 8 characters" value={newPassword}
                    onChange={e=>{setNewPassword(e.target.value);setError("");}}
                    style={{...inputStyle,paddingRight:52}}/>
                  <button type="button" onClick={()=>setShowNew(!showNew)} style={pwToggle(showNew)}>{showNew?"HIDE":"SHOW"}</button>
                </div>
                <PwStrength password={newPassword}/>
              </div>
              <div style={{marginBottom:16}}>
                <label style={labelSt}>Confirm Password</label>
                <div style={{position:"relative"}}>
                  <input type={showConf?"text":"password"} placeholder="Re-enter password" value={confirmPw}
                    onChange={e=>{setConfirmPw(e.target.value);setError("");}}
                    onKeyDown={e=>{if(e.key==="Enter"&&!loading)handleChangePassword();}}
                    style={{...inputStyle,paddingRight:52,borderColor:confirmPw?(confirmPw===newPassword?OK:A2):BD}}/>
                  <button type="button" onClick={()=>setShowConf(!showConf)} style={pwToggle(showConf)}>{showConf?"HIDE":"SHOW"}</button>
                </div>
                {confirmPw&&confirmPw!==newPassword&&<p style={{fontFamily:F1,fontSize:11,color:A2,marginTop:6,fontWeight:600}}>Passwords do not match</p>}
                {confirmPw&&confirmPw===newPassword&&<p style={{fontFamily:F1,fontSize:11,color:OK,marginTop:6,fontWeight:600}}>✓ Passwords match</p>}
              </div>
              <div style={{padding:"12px 14px",marginBottom:16,background:BG,borderRadius:10,border:`1px solid ${BD}`}}>
                <div style={{fontFamily:F2,fontSize:9,fontWeight:700,color:A,letterSpacing:2,marginBottom:8}}>REQUIREMENTS</div>
                {[{ok:newPassword.length>=8,text:"At least 8 characters"},{ok:/[A-Z]/.test(newPassword),text:"One uppercase letter"},{ok:/[0-9]/.test(newPassword),text:"One number"}].map((r,i)=>(
                  <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:i<2?4:0}}>
                    <span style={{fontSize:11,color:r.ok?OK:TD}}>{r.ok?"✓":"○"}</span>
                    <span style={{fontFamily:F1,fontSize:11,color:r.ok?T:TD}}>{r.text}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleChangePassword}
                disabled={loading||newPassword.length<8||newPassword!==confirmPw}
                style={{...btnPrimary,background:newPassword.length>=8&&newPassword===confirmPw?`linear-gradient(135deg,${OK},${A})`:BD,color:newPassword.length>=8&&newPassword===confirmPw?BG:TD,opacity:loading?0.7:1,cursor:loading||newPassword.length<8||newPassword!==confirmPw?"not-allowed":"pointer"}}>
                {loading?"CHANGING PASSWORD...":"SET NEW PASSWORD"}
              </button>
            </div>
          )}

          {/* STEP 4 */}
          {step===4&&(
            <div style={{textAlign:"center",animation:"fadeSlideUp 0.4s ease-out"}}>
              <div style={{width:88,height:88,borderRadius:"50%",background:`${OK}10`,border:`2px solid ${OK}35`,display:"grid",placeItems:"center",margin:"0 auto 28px",animation:"successPop 0.6s cubic-bezier(0.16,1,0.3,1) both"}}>
                <span style={{fontSize:44,color:OK}}>✓</span>
              </div>
              <h2 style={{fontFamily:F2,fontSize:24,fontWeight:800,color:T,margin:"0 0 10px"}}>Password Changed!</h2>
              <p style={{color:TD,fontSize:14,fontFamily:F1,lineHeight:1.7,margin:"0 0 8px"}}>Your password has been updated for</p>
              <p style={{color:A,fontSize:15,fontFamily:F1,fontWeight:700,margin:"0 0 32px"}}>{email}</p>
              <a href="#/" style={{display:"block",padding:16,background:`linear-gradient(135deg,${OK},${A})`,borderRadius:12,color:BG,fontFamily:F1,fontWeight:800,fontSize:15,textDecoration:"none",textAlign:"center",letterSpacing:1.5}}>
                GO TO EASY EXPRESS
              </a>
            </div>
          )}
        </div>

        <div style={{textAlign:"center",marginTop:32,fontFamily:F1,fontSize:12,color:`${TD}80`}}>
          <span style={{color:A,fontWeight:700}}>Easy Express</span>{" © 2026 — "}<span style={{color:`${T}80`}}>Team 4R</span>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700;800&family=Orbitron:wght@700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:${BG};}
        input::placeholder{color:${TD}50;}
        input:focus{border-color:${A}!important;box-shadow:0 0 0 3px ${A}12!important;outline:none;}
        @keyframes fadeSlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes successPop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
      `}</style>
    </div>
  );
}
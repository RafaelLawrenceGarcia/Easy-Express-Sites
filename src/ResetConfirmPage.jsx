// ============================================================
//  ResetConfirmPage.jsx
//  User lands here after clicking PlayFab recovery email link.
//  URL: https://yoursite.com/?token=XXXX&lang=en#/reset-confirm
//  Reads token, posts to /api/reset-password (Vercel function)
//  which calls Admin/ResetUserPassword with the token.
// ============================================================

import React, { useState, useEffect } from "react";

const A = "#00e5ff"; const A2 = "#ff3d71"; const BG = "#0a0c10";
const CARD = "#12151c"; const T = "#e0e6f0"; const TD = "#7a8399";
const BD = "#1e2333"; const OK = "#00e676"; const WN = "#ff9f1c";
const PU = "#7c4dff";
const F1 = "'Chakra Petch', sans-serif";
const F2 = "'Orbitron', sans-serif";

function PwStrength({ password }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = [{label:"WEAK",color:A2},{label:"WEAK",color:A2},{label:"FAIR",color:WN},{label:"GOOD",color:A},{label:"STRONG",color:OK},{label:"STRONG",color:OK}];
  const s = levels[score];
  return (
    <div style={{marginTop:8}}>
      <div style={{display:"flex",gap:4,marginBottom:4}}>{[1,2,3,4].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=Math.min(score,4)?s.color:BD}}/>)}</div>
      <div style={{fontFamily:F1,fontSize:10,fontWeight:700,color:s.color,letterSpacing:1.5}}>{s.label}</div>
    </div>
  );
}

export default function ResetConfirmPage() {
  const [token, setToken]         = useState("");
  const [newPassword, setNewPw]   = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showNew, setShowNew]     = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [done, setDone]           = useState(false);
  const [noToken, setNoToken]     = useState(false);

  useEffect(() => {
  // Parse from full URL since hash router can interfere
  const fullUrl = window.location.href;
  const urlParams = new URLSearchParams(window.location.search);
  const t = urlParams.get("token");
  if (t) setToken(t);
  else setNoToken(true);
}, []);
  const inputStyle = { width:"100%",padding:"14px 16px",background:BG,border:`1px solid ${BD}`,borderRadius:10,color:T,fontSize:15,fontFamily:F1,outline:"none",boxSizing:"border-box",transition:"border-color 0.3s" };
  const pwToggle = (a) => ({ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:a?A:TD,cursor:"pointer",fontFamily:F1,fontSize:11,fontWeight:700,padding:0 });

  const handleSubmit = async () => {
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPw) { setError("Passwords do not match."); return; }
    if (!token) { setError("No reset token found. Please request a new link."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("https://164227.playfabapi.com/Client/ResetPassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ TitleId: "164227", Token: token, Password: newPassword })
      });
      const text = await res.text();
      // PlayFab returns empty body or 200 on success
      if (res.ok || text === "" || text.includes('"code":200')) {
        setDone(true);
      } else {
        try {
          const json = JSON.parse(text);
          throw new Error(json.errorMessage || `Error ${res.status}`);
        } catch(e) {
          if (e.message.startsWith("Error")) throw e;
          throw new Error(`HTTP ${res.status}`);
        }
      }
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 20px",fontFamily:F1,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:"-20%",left:"-10%",width:600,height:600,borderRadius:"50%",background:`radial-gradient(circle,${A}10 0%,transparent 70%)`,filter:"blur(80px)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"-15%",right:"-5%",width:500,height:500,borderRadius:"50%",background:`radial-gradient(circle,${PU}10 0%,transparent 70%)`,filter:"blur(80px)",pointerEvents:"none"}}/>

      <div style={{width:"100%",maxWidth:460,position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <a href="#/" style={{textDecoration:"none",display:"inline-flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:8,background:`linear-gradient(135deg,${A},${A2})`,display:"grid",placeItems:"center",fontWeight:800,fontSize:14,color:BG,fontFamily:F1}}>EE</div>
            <span style={{color:T,fontWeight:700,fontSize:18,letterSpacing:1.5,fontFamily:F1}}>EASY EXPRESS</span>
          </a>
        </div>

        <div style={{background:CARD,border:`1px solid ${BD}`,borderRadius:20,padding:"40px 36px",position:"relative",overflow:"hidden",boxShadow:`0 24px 80px ${BG}cc`}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:done?`linear-gradient(90deg,${OK},${A})`:`linear-gradient(90deg,${A},${PU})`}}/>

          {noToken && !done && (
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:48,marginBottom:20}}>⚠️</div>
              <h2 style={{fontFamily:F2,fontSize:20,fontWeight:800,color:A2,margin:"0 0 12px"}}>Invalid Reset Link</h2>
              <p style={{color:TD,fontSize:14,fontFamily:F1,lineHeight:1.7,marginBottom:28}}>No reset token found. This link may have expired or already been used.</p>
              <a href="#/reset-password" style={{display:"block",padding:16,background:`linear-gradient(135deg,${A},#00b8d4)`,borderRadius:12,color:BG,fontFamily:F1,fontWeight:800,fontSize:14,textDecoration:"none",textAlign:"center",letterSpacing:1.5}}>
                REQUEST A NEW LINK
              </a>
            </div>
          )}

          {!noToken && !done && (
            <div style={{animation:"fadeSlideUp 0.4s ease-out"}}>
              <div style={{width:72,height:72,borderRadius:18,background:`${A}10`,border:`1px solid ${A}20`,display:"grid",placeItems:"center",margin:"0 auto 24px",fontSize:36}}>🔒</div>
              <h1 style={{fontFamily:F2,fontSize:22,fontWeight:800,color:T,textAlign:"center",margin:"0 0 8px"}}>Set New Password</h1>
              <p style={{color:TD,fontSize:14,fontFamily:F1,lineHeight:1.7,textAlign:"center",margin:"0 0 32px"}}>Choose a new password for your Easy Express account.</p>

              {error && (
                <div style={{color:A2,fontSize:13,marginBottom:20,fontFamily:F1,padding:"12px 16px",background:`${A2}08`,borderRadius:12,border:`1px solid ${A2}20`,display:"flex",gap:10,alignItems:"center",lineHeight:1.5}}>
                  <span style={{fontSize:16,flexShrink:0}}>⚠</span><span>{error}</span>
                </div>
              )}

              <div style={{marginBottom:16}}>
                <label style={{display:"block",marginBottom:8,color:TD,fontSize:11,fontWeight:700,letterSpacing:2,fontFamily:F1,textTransform:"uppercase"}}>New Password</label>
                <div style={{position:"relative"}}>
                  <input type={showNew?"text":"password"} placeholder="Minimum 8 characters" value={newPassword}
                    onChange={e=>{setNewPw(e.target.value);setError("");}}
                    style={{...inputStyle,paddingRight:52}}/>
                  <button type="button" onClick={()=>setShowNew(!showNew)} style={pwToggle(showNew)}>{showNew?"HIDE":"SHOW"}</button>
                </div>
                <PwStrength password={newPassword}/>
              </div>

              <div style={{marginBottom:20}}>
                <label style={{display:"block",marginBottom:8,color:TD,fontSize:11,fontWeight:700,letterSpacing:2,fontFamily:F1,textTransform:"uppercase"}}>Confirm Password</label>
                <div style={{position:"relative"}}>
                  <input type={showConf?"text":"password"} placeholder="Re-enter password" value={confirmPw}
                    onChange={e=>{setConfirmPw(e.target.value);setError("");}}
                    onKeyDown={e=>{if(e.key==="Enter"&&!loading)handleSubmit();}}
                    style={{...inputStyle,paddingRight:52,borderColor:confirmPw?(confirmPw===newPassword?OK:A2):BD}}/>
                  <button type="button" onClick={()=>setShowConf(!showConf)} style={pwToggle(showConf)}>{showConf?"HIDE":"SHOW"}</button>
                </div>
                {confirmPw&&confirmPw!==newPassword&&<p style={{fontFamily:F1,fontSize:11,color:A2,marginTop:6,fontWeight:600}}>Passwords do not match</p>}
                {confirmPw&&confirmPw===newPassword&&<p style={{fontFamily:F1,fontSize:11,color:OK,marginTop:6,fontWeight:600}}>✓ Passwords match</p>}
              </div>

              <div style={{padding:"12px 14px",marginBottom:20,background:BG,borderRadius:10,border:`1px solid ${BD}`}}>
                <div style={{fontFamily:F2,fontSize:9,fontWeight:700,color:A,letterSpacing:2,marginBottom:8}}>REQUIREMENTS</div>
                {[{ok:newPassword.length>=8,text:"At least 8 characters"},{ok:/[A-Z]/.test(newPassword),text:"One uppercase letter"},{ok:/[0-9]/.test(newPassword),text:"One number"}].map((r,i)=>(
                  <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:i<2?4:0}}>
                    <span style={{fontSize:11,color:r.ok?OK:TD}}>{r.ok?"✓":"○"}</span>
                    <span style={{fontFamily:F1,fontSize:11,color:r.ok?T:TD}}>{r.text}</span>
                  </div>
                ))}
              </div>

              <button onClick={handleSubmit}
                disabled={loading||newPassword.length<8||newPassword!==confirmPw}
                style={{width:"100%",padding:16,border:"none",borderRadius:12,background:newPassword.length>=8&&newPassword===confirmPw?`linear-gradient(135deg,${OK},${A})`:BD,color:newPassword.length>=8&&newPassword===confirmPw?BG:TD,fontFamily:F1,fontWeight:800,fontSize:15,letterSpacing:1.5,cursor:loading||newPassword.length<8||newPassword!==confirmPw?"not-allowed":"pointer",opacity:loading?0.7:1}}>
                {loading?"SETTING PASSWORD...":"SET NEW PASSWORD"}
              </button>
            </div>
          )}

          {done && (
            <div style={{textAlign:"center",animation:"fadeSlideUp 0.4s ease-out"}}>
              <div style={{width:88,height:88,borderRadius:"50%",background:`${OK}10`,border:`2px solid ${OK}35`,display:"grid",placeItems:"center",margin:"0 auto 28px",animation:"successPop 0.6s cubic-bezier(0.16,1,0.3,1) both"}}>
                <span style={{fontSize:44,color:OK}}>✓</span>
              </div>
              <h2 style={{fontFamily:F2,fontSize:24,fontWeight:800,color:T,margin:"0 0 12px"}}>Password Changed!</h2>
              <p style={{color:TD,fontSize:14,fontFamily:F1,lineHeight:1.7,marginBottom:32}}>Your password has been updated. You can now log in with your new password.</p>
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
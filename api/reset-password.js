// api/reset-password.js
// Vercel serverless function — runs server-side, secret key never exposed.
// Add PLAYFAB_SECRET_KEY to Vercel environment variables.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, newPassword } = req.body;
  const SECRET_KEY = process.env.PLAYFAB_SECRET_KEY;
  const TITLE_ID = "164227";
  const BASE = `https://${TITLE_ID}.playfabapi.com`;

  if (!email || !newPassword)
    return res.status(400).json({ error: "Email and password are required." });
  if (newPassword.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  if (!SECRET_KEY)
    return res.status(500).json({ error: "Server not configured." });

  // 1 — Verify OTP authorization stored by CloudScript
  const authKey = "pwauth_" + email.toLowerCase().replace(/[^a-z0-9]/g, "_");
  try {
    const authRes = await fetch(`${BASE}/Admin/GetTitleInternalData`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-SecretKey": SECRET_KEY },
      body: JSON.stringify({ Keys: [authKey] })
    });
    const authData = await authRes.json();
    const rawAuth = authData.data?.Data?.[authKey];
    if (!rawAuth) return res.status(401).json({ error: "Not authorized. Please verify your identity first." });

    const auth = JSON.parse(rawAuth);
    if (!auth.authorized || Date.now() > auth.expiry)
      return res.status(401).json({ error: "Authorization expired. Please start over." });
  } catch (e) {
    return res.status(500).json({ error: "Auth check failed: " + e.message });
  }

  // 2 — Look up account by email, get both PlayFabId and Username
  let playFabId, username;
  try {
    const lookupRes = await fetch(`${BASE}/Admin/GetUserAccountInfo`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-SecretKey": SECRET_KEY },
      body: JSON.stringify({ Email: email.toLowerCase() })
    });
    const lookupData = await lookupRes.json();
    if (lookupData.code !== 200)
      return res.status(400).json({ error: "No account found with that email." });
    playFabId = lookupData.data.UserInfo.PlayFabId;
    username  = lookupData.data.UserInfo.Username;
  } catch (e) {
    return res.status(500).json({ error: "Account lookup failed: " + e.message });
  }

  // 3 — Reset password — try Username first, fall back to PlayFabId
  try {
    const resetBody = username
      ? { Username: username, Password: newPassword }
      : { PlayFabId: playFabId, Password: newPassword };
    const resetRes = await fetch(`${BASE}/Admin/ResetUserPassword`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-SecretKey": SECRET_KEY },
      body: JSON.stringify(resetBody)
    });
    const resetText = await resetRes.text();
    // Success = 200 status (body may be empty or JSON)
    if (resetRes.status !== 200) {
      let errMsg = `HTTP ${resetRes.status}`;
      try { errMsg = JSON.parse(resetText).errorMessage || errMsg; } catch(e) { errMsg = resetText || errMsg; }
      return res.status(400).json({ error: "Reset failed: " + errMsg });
    }
    // 200 = success, fall through
  } catch (e) {
    return res.status(500).json({ error: "Reset failed: " + e.message });
  }

  // 4 — Clean up auth token
  try {
    await fetch(`${BASE}/Admin/SetTitleInternalData`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-SecretKey": SECRET_KEY },
      body: JSON.stringify({ Key: authKey, Value: null })
    });
  } catch (e) { /* non-critical */ }

  return res.status(200).json({ success: true });
}
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { token, newPassword } = req.body;
  const SECRET_KEY = process.env.PLAYFAB_SECRET_KEY;
  const TITLE_ID   = "164227";
  const BASE       = `https://${TITLE_ID}.playfabapi.com`;

  if (!token || !newPassword)
    return res.status(400).json({ error: "Token and password are required." });
  if (newPassword.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  if (!SECRET_KEY)
    return res.status(500).json({ error: "Server not configured. PLAYFAB_SECRET_KEY missing." });

  try {
    const resetRes  = await fetch(`${BASE}/Admin/ResetUserPassword`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-SecretKey": SECRET_KEY },
      body: JSON.stringify({ Token: token, Password: newPassword })
    });
    const resetText = await resetRes.text();
    if (resetRes.status !== 200) {
      let errMsg = `HTTP ${resetRes.status}`;
      try { errMsg = JSON.parse(resetText).errorMessage || errMsg; } catch(e) { errMsg = resetText || errMsg; }
      return res.status(400).json({ error: errMsg });
    }
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
const TITLE_ID = process.env.PLAYFAB_TITLE_ID || "164227";
const PLAYFAB_BASE = `https://${TITLE_ID}.playfabapi.com`;

// Public pages may request only content that is intentionally safe to expose.
// This endpoint keeps the PlayFab secret and all player authentication out of
// the browser, so viewing the website cannot create a title-player account.
const PUBLIC_KEYS = new Set(["GameNews"]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const secret = process.env.PLAYFAB_SECRET_KEY;
  if (!secret) {
    return res.status(503).json({ error: "Public content service is not configured." });
  }

  const requested = Array.isArray(req.body?.Keys) ? req.body.Keys : [];
  const keys = requested
    .filter((key) => typeof key === "string" && PUBLIC_KEYS.has(key))
    .slice(0, 10);
  if (!keys.length) return res.status(200).json({ data: {} });

  try {
    const response = await fetch(`${PLAYFAB_BASE}/Admin/GetTitleData`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-SecretKey": secret },
      body: JSON.stringify({ Keys: keys }),
    });
    const payload = await response.json();
    if (payload.code !== 200) {
      return res.status(502).json({ error: payload.errorMessage || "TitleData fetch failed." });
    }

    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ data: payload.data?.Data || {} });
  } catch {
    return res.status(502).json({ error: "PlayFab content is temporarily unavailable." });
  }
}

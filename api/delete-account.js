const TITLE_ID = process.env.PLAYFAB_TITLE_ID || "164227";
const PLAYFAB_BASE = `https://${TITLE_ID}.playfabapi.com`;

async function identify(sessionTicket) {
  const response = await fetch(`${PLAYFAB_BASE}/Client/GetAccountInfo`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Authorization": sessionTicket },
    body: "{}",
  });
  const payload = await response.json();
  if (payload.code !== 200) throw new Error("Your session expired. Sign in again.");
  return payload.data?.AccountInfo;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const secret = process.env.PLAYFAB_SECRET_KEY;
  if (!secret) return res.status(503).json({ error: "Account deletion is not configured." });

  const { sessionTicket, confirmation } = req.body || {};
  if (!sessionTicket || confirmation !== "DELETE") {
    return res.status(400).json({ error: "Type DELETE to confirm permanent account deletion." });
  }

  try {
    const account = await identify(sessionTicket);
    if (!account?.PlayFabId) throw new Error("The signed-in account could not be identified.");

    const response = await fetch(`${PLAYFAB_BASE}/Admin/DeletePlayer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-SecretKey": secret },
      body: JSON.stringify({ PlayFabId: account.PlayFabId }),
    });
    const payload = await response.json();
    if (payload.code !== 200) {
      return res.status(400).json({ error: payload.errorMessage || "Account deletion failed." });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(401).json({ error: error.message || "Account deletion failed." });
  }
}

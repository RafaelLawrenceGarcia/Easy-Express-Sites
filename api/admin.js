const TITLE_ID = process.env.PLAYFAB_TITLE_ID || "164227";
const PLAYFAB_BASE = `https://${TITLE_ID}.playfabapi.com`;
const ADMIN_PLAYFAB_IDS = new Set(
  (process.env.EASY_EXPRESS_ADMIN_PLAYFAB_IDS || "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean),
);

const ALLOWED = {
  Admin: new Set([
    "GetUserAccountInfo",
    "UpdateUserData",
    "BanUsers",
    "RevokeAllBansForUser",
    "GetTitleData",
    "SetTitleData",
  ]),
  Server: new Set([
    "GetUserData",
    "GetPlayerStatistics",
    "UpdatePlayerStatistics",
    "GetLeaderboard",
  ]),
};

async function identify(sessionTicket) {
  const response = await fetch(`${PLAYFAB_BASE}/Client/GetAccountInfo`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Authorization": sessionTicket },
    body: "{}",
  });
  const payload = await response.json();
  if (payload.code !== 200) throw new Error("Session expired.");
  return payload.data?.AccountInfo;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  const secret = process.env.PLAYFAB_SECRET_KEY;
  if (!secret) return res.status(503).json({ error: "Admin service is not configured." });

  const { sessionTicket, service, endpoint, body = {} } = req.body || {};
  if (!sessionTicket) return res.status(401).json({ error: "Sign in is required." });
  const isStatusRequest = service === "Meta" && endpoint === "GetAdminStatus";
  if (!isStatusRequest && !ALLOWED[service]?.has(endpoint)) {
    return res.status(400).json({ error: "Admin operation is not allowed." });
  }

  try {
    const account = await identify(sessionTicket);
    const isAdmin = Boolean(
      account?.PlayFabId
      && ADMIN_PLAYFAB_IDS.has(String(account.PlayFabId).toUpperCase()),
    );

    if (isStatusRequest) return res.status(200).json({ data: { isAdmin } });

    if (!isAdmin) {
      return res.status(403).json({ error: "This account does not have admin access." });
    }

    const response = await fetch(`${PLAYFAB_BASE}/${service}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-SecretKey": secret },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (payload.code !== 200) {
      return res.status(400).json({ error: payload.errorMessage || `${endpoint} failed.` });
    }
    return res.status(200).json({ data: payload.data });
  } catch (error) {
    return res.status(401).json({ error: error.message || "Admin request failed." });
  }
}

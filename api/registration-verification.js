const TITLE_ID = process.env.PLAYFAB_TITLE_ID || "164227";
const PLAYFAB_BASE = `https://${TITLE_ID}.playfabapi.com`;

const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || "service_3ixsdwk";
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || "template_glp9rof";
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || "3LQw31VLjecEmrw0D";
const SITE_URL = process.env.SITE_URL || "https://easy-express-sites-izwi.vercel.app";

const recentSends = new Map();

async function playFabClient(endpoint, sessionTicket, body = {}) {
  const response = await fetch(`${PLAYFAB_BASE}/Client/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Authorization": sessionTicket,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (payload.code !== 200) {
    throw new Error(payload.errorMessage || `PlayFab ${endpoint} failed.`);
  }
  return payload.data;
}

function validEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { action, sessionTicket, email, username, code } = req.body || {};
  if (!sessionTicket || typeof sessionTicket !== "string") {
    return res.status(401).json({ error: "Your registration session expired. Please sign up again." });
  }

  try {
    const accountResult = await playFabClient("GetAccountInfo", sessionTicket);
    const account = accountResult.AccountInfo || {};
    const accountEmail = account.PrivateInfo?.Email || "";

    if (action === "send") {
      if (!validEmail(email)) return res.status(400).json({ error: "Enter a valid email address." });
      if (accountEmail && accountEmail.toLowerCase() !== email.toLowerCase()) {
        return res.status(403).json({ error: "That email does not belong to this account." });
      }

      const key = `${account.PlayFabId}:${email.toLowerCase()}`;
      const lastSent = recentSends.get(key) || 0;
      const remaining = 45_000 - (Date.now() - lastSent);
      if (remaining > 0) {
        return res.status(429).json({ error: `Please wait ${Math.ceil(remaining / 1000)} seconds before resending.` });
      }

      const cloudResult = await playFabClient("ExecuteCloudScript", sessionTicket, {
        FunctionName: "sendOTP",
        FunctionParameter: {},
        GeneratePlayStreamEvent: true,
      });
      const result = cloudResult.FunctionResult;
      if (!result?.code) throw new Error(result?.error || "Verification service is not configured.");

      const mailResponse = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: SITE_URL,
          Referer: `${SITE_URL}/`,
        },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: {
            to_email: email.trim().toLowerCase(),
            player_name: username || account.Username || "Player",
            otp_code: String(result.code),
          },
        }),
      });
      if (!mailResponse.ok) {
        console.error(`EmailJS rejected a verification message with status ${mailResponse.status}.`);
        throw new Error("The verification email could not be sent. Please try again.");
      }

      recentSends.set(key, Date.now());
      return res.status(200).json({ success: true });
    }

    if (action === "verify") {
      if (!/^\d{6}$/.test(String(code || ""))) {
        return res.status(400).json({ error: "Enter the complete 6-digit code." });
      }
      const cloudResult = await playFabClient("ExecuteCloudScript", sessionTicket, {
        FunctionName: "verifyOTP",
        FunctionParameter: { code: String(code) },
        GeneratePlayStreamEvent: true,
      });
      const result = cloudResult.FunctionResult;
      if (!result?.success) {
        return res.status(400).json({ error: result?.error || "That code is invalid or expired." });
      }
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Unknown verification action." });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Verification failed." });
  }
}

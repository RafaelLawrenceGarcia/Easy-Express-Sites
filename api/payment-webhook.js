// api/payment-webhook.js
// ─────────────────────────────────────────────────────────────────────────────
//  PayMongo fires a POST to this endpoint when a payment clears.
//  Security chain:
//    1. HMAC-SHA256 signature check (PayMongo signs every event)
//    2. Only the "checkout_session.payment.paid" event triggers PlayFab update
//    3. PlayFab is updated via Admin API (secret key) — the client can NEVER
//       call this directly. This prevents anyone from calling saveFullGameOwnership
//       from the browser console without a real payment.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from "crypto";

// Vercel: disable body parsing so we can read the raw body for HMAC verification
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end",  () => resolve(body));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const rawBody   = await getRawBody(req);
  const sigHeader = req.headers["paymongo-signature"] || "";

  // ── Step 1: Verify HMAC signature ─────────────────────────────────────────
  const WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("[webhook] PAYMONGO_WEBHOOK_SECRET not set");
    return res.status(500).end();
  }

  try {
    // Signature format: "t=<unix_ts>,te=<hmac_for_test>,li=<hmac_for_live>"
    const parts = Object.fromEntries(
      sigHeader.split(",").map((part) => {
        const eqIdx = part.indexOf("=");
        return [part.slice(0, eqIdx), part.slice(eqIdx + 1)];
      })
    );

    const timestamp = parts.t;
    if (!timestamp) throw new Error("Missing timestamp in signature");

    const message  = `${timestamp}.${rawBody}`;
    const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(message).digest("hex");
    const testSig  = parts.te; // used in test mode
    const liveSig  = parts.li; // used in live mode

    const isValid = (testSig && crypto.timingSafeEqual(Buffer.from(testSig), Buffer.from(expected)))
                 || (liveSig && crypto.timingSafeEqual(Buffer.from(liveSig),  Buffer.from(expected)));

    if (!isValid) {
      console.warn("[webhook] Invalid PayMongo signature — possible spoofed request");
      return res.status(401).json({ error: "Invalid signature" });
    }
  } catch (e) {
    console.warn("[webhook] Signature verification error:", e.message);
    return res.status(400).json({ error: "Malformed signature header" });
  }

  // ── Step 2: Parse and filter events ───────────────────────────────────────
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const eventType = event?.data?.attributes?.type;
  console.log(`[webhook] Received event: ${eventType}`);

  // We only care about successful checkout payments
  if (eventType !== "checkout_session.payment.paid") {
    return res.status(200).json({ received: true, skipped: true });
  }

  // ── Step 3: Extract metadata ───────────────────────────────────────────────
  const sessionAttrs = event.data.attributes.data?.attributes || {};
  const metadata     = sessionAttrs.metadata || {};
  const playFabId    = metadata.playfab_id;
  const paymentId    = event.data.attributes.data?.id || "pm_unknown";
  const amountPaid   = sessionAttrs.amount;          // centavos, e.g. 29900
  const paidAt       = new Date().toISOString();

  if (!playFabId) {
    console.error("[webhook] No playfab_id in metadata. Cannot update account.", { metadata });
    // Return 200 so PayMongo doesn't keep retrying — but log for manual follow-up
    return res.status(200).json({ warning: "No playfab_id in metadata" });
  }

  // ── Step 4: Update PlayFab via Admin API (server-authoritative) ───────────
  const TITLE_ID       = process.env.PLAYFAB_TITLE_ID   || "164227";
  const PLAYFAB_SECRET = process.env.PLAYFAB_SECRET_KEY;
  const BASE           = `https://${TITLE_ID}.playfabapi.com`;

  if (!PLAYFAB_SECRET) {
    console.error("[webhook] PLAYFAB_SECRET_KEY not set");
    return res.status(500).json({ error: "Server not configured" });
  }

  try {
    const pfRes = await fetch(`${BASE}/Admin/UpdateUserData`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SecretKey":  PLAYFAB_SECRET,   // Admin API — never exposed to client
      },
      body: JSON.stringify({
        PlayFabId: playFabId,
        Data: {
          fullGameOwned: "true",
          purchaseDate:  paidAt,
          paymentId:     paymentId,
          amountPaid:    String(amountPaid),   // ₱299.00 → "29900"
          paymentMethod: sessionAttrs.payment_method_used || "unknown",
        },
        Permission: "Public",
      }),
    });

    const pfData = await pfRes.json();

    if (pfData.code !== 200) {
      console.error("[webhook] PlayFab Admin UpdateUserData failed:", pfData);
      // Return 500 so PayMongo retries the webhook
      return res.status(500).json({ error: "PlayFab update failed" });
    }

    console.log(
      `[webhook] ✅ fullGameOwned unlocked | PlayFabId: ${playFabId} | paymentId: ${paymentId}`
    );
    return res.status(200).json({ success: true });

  } catch (e) {
    console.error("[webhook] Error calling PlayFab Admin API:", e);
    return res.status(500).json({ error: e.message });
  }
}
// api/create-checkout.js
// ─────────────────────────────────────────────────────────────────────────────
//  Creates a PayMongo Checkout Session for GCash or Card.
//  Returns { checkoutUrl, sessionId } to the frontend.
//  The frontend then redirects the user to checkoutUrl (PayMongo's hosted page).
//
//  HOW MONEY IS ROUTED:
//  PayMongo deposits funds directly into the bank account / e-wallet you link
//  in your PayMongo dashboard (Settings → Bank Accounts). All ₱299 payments go
//  to that account, minus PayMongo's fee (~1.5% + ₱15 for GCash, ~2.9% for cards).
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const SITE_URL = process.env.SITE_URL || "https://easy-express.vercel.app";

  res.setHeader("Access-Control-Allow-Origin", SITE_URL);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { method, playFabId } = req.body;

  // ── Input validation ───────────────────────────────────────────────────────
  if (!method || !["gcash", "card", "qrph"].includes(method))
    return res.status(400).json({ error: "Invalid payment method. Choose GCash or Card." });
  if (!playFabId || typeof playFabId !== "string" || playFabId.length < 10)
    return res.status(400).json({ error: "A valid logged-in account is required to purchase." });

  const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET_KEY;
  if (!PAYMONGO_SECRET)
    return res.status(500).json({ error: "Payment gateway is not configured. Contact support." });

  // ── Build PayMongo Checkout Session payload ────────────────────────────────
  const payload = {
    data: {
      attributes: {
        send_email_receipt: true,
        show_description: true,
        show_line_items: true,
        line_items: [
          {
            currency: "PHP",
            amount: 100, // ₱299.00 in centavos (PayMongo requires integers)
            name: "Easy Express — Full Game",
            description: "Full game license. One-time purchase. All future updates included.",
            quantity: 1,
          },
        ],
        payment_method_types: [method],
        description: "Easy Express Full Game — Team 4R Thesis Project",
        // After payment, PayMongo redirects to these URLs.
        // The playFabId is in the URL so the return page can re-verify state.
        // The webhook (not this redirect) is the authoritative source of truth.
        success_url: `${SITE_URL}/?payment=success&pfid=${encodeURIComponent(playFabId)}#/`,
        cancel_url:  `${SITE_URL}/?payment=cancelled#/`,
        // Metadata is passed through to the webhook payload — this is how
        // the webhook knows which PlayFab account to unlock.
        metadata: {
          playfab_id: playFabId,
          product:    "easy_express_full_game",
          version:    "1.0",
        },
      },
    },
  };

  try {
    const pmRes = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        // PayMongo uses HTTP Basic Auth with the secret key as the username
        Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET + ":").toString("base64")}`,
      },
      body: JSON.stringify(payload),
    });

    const pmData = await pmRes.json();

    if (!pmRes.ok) {
      // ── Map PayMongo error codes to user-friendly messages ────────────────
      const errDetail = pmData.errors?.[0] || {};
      const errorMap = {
        "parameter_invalid":               "Invalid payment details. Please check your information.",
        "payment_method_type_not_allowed": "This payment method is temporarily unavailable. Try another.",
        "insufficient_funds":              "Insufficient balance. Please top up your GCash or use a different card.",
        "card_declined":                   "Your card was declined. Please try a different card.",
        "invalid_cvv":                     "Invalid CVV. Please double-check the 3-digit code on your card.",
        "expired_card":                    "Your card has expired. Please use a different card.",
        "do_not_honor":                    "Transaction blocked by your bank. Please contact your bank or try another card.",
        "generic_decline":                 "Payment was declined. Please try a different payment method.",
      };
      const friendlyMessage = errorMap[errDetail.code] 
        || errDetail.detail 
        || "Payment gateway error. Please try again in a moment.";

      return res.status(400).json({ error: friendlyMessage, code: errDetail.code });
    }

    const sessionId    = pmData.data.id;
    const checkoutUrl  = pmData.data.attributes.checkout_url;

    return res.status(200).json({ checkoutUrl, sessionId });

  } catch (e) {
    console.error("[create-checkout] Unexpected error:", e);
    return res.status(500).json({ error: "Could not connect to payment gateway. Check your connection and try again." });
  }
}
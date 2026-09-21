import { randomBytes } from "node:crypto";
import { requirePack } from "../_lib/catalog.js";
import { bearerToken, sendError } from "../_lib/http.js";
import { payMongoRequest } from "../_lib/paymongo.js";
import { authenticateSessionTicket, getOwnedEntitlements, savePendingDlcCheckout } from "../_lib/playfab.js";

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed." });
  try {
    if (!process.env.PAYMONGO_SECRET_KEY || !process.env.SITE_URL) {
      const error = new Error("Secure checkout is not configured yet.");
      error.statusCode = 503;
      throw error;
    }
    const packId = request.body?.packId;
    const pack = requirePack(packId);
    const playFabId = await authenticateSessionTicket(bearerToken(request));
    const owned = await getOwnedEntitlements(playFabId);
    if (owned.includes(pack.entitlement)) return response.status(409).json({ error: "This DLC pack is already owned." });

    const orderId = randomBytes(16).toString("hex");
    const siteUrl = process.env.SITE_URL.replace(/\/$/, "");
    const pendingCheckout = {
      status: "pending",
      packId,
      entitlement: pack.entitlement,
      amount: pack.amount,
      currency: pack.currency,
      createdAt: new Date().toISOString(),
    };
    await savePendingDlcCheckout(playFabId, orderId, pendingCheckout);

    const checkout = await payMongoRequest("/checkout_sessions", {
      method: "POST",
      body: {
        data: {
          attributes: {
            cancel_url: `${siteUrl}/?purchase=cancelled&pack=${encodeURIComponent(packId)}#dlc-store`,
            success_url: `${siteUrl}/?purchase=pending&pack=${encodeURIComponent(packId)}#dlc-store`,
            description: `${pack.name} for Easy Express`,
            line_items: [{ amount: pack.amount, currency: pack.currency, description: pack.description, name: pack.name, quantity: 1 }],
            payment_method_types: ["qrph"],
            reference_number: `ee_dlc_${orderId}`,
            metadata: {
              playfab_id: playFabId,
              product: "easy_express_dlc",
              pack_id: packId,
              entitlement: pack.entitlement,
              order_id: orderId,
            },
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
          },
        },
      },
    });
    await savePendingDlcCheckout(playFabId, orderId, { ...pendingCheckout, checkoutSessionId: checkout.id });
    const checkoutUrl = checkout?.attributes?.checkout_url;
    if (!checkoutUrl) throw new Error("The payment provider did not return a checkout URL.");
    response.status(200).json({ checkoutUrl });
  } catch (error) {
    sendError(response, error);
  }
}

import { requirePack } from "../_lib/catalog.js";
import { readRawBody, sendError } from "../_lib/http.js";
import { verifyPayMongoSignature } from "../_lib/paymongo.js";
import { getPendingDlcCheckout, processVerifiedPurchase, savePendingDlcCheckout } from "../_lib/playfab.js";

export const config = { api: { bodyParser: false } };

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed." });
  try {
    const rawBody = await readRawBody(request);
    if (!verifyPayMongoSignature(rawBody, request.headers["paymongo-signature"])) {
      return response.status(400).json({ error: "Invalid webhook signature." });
    }

    const event = JSON.parse(rawBody.toString("utf8"));
    if (event?.data?.attributes?.type !== "checkout_session.payment.paid") {
      return response.status(200).json({ received: true, skipped: true });
    }

    const checkout = event.data.attributes.data;
    const attributes = checkout?.attributes || {};
    const metadata = attributes.metadata || {};
    if (metadata.product !== "easy_express_dlc") {
      return response.status(200).json({ received: true, skipped: true });
    }

    const { playfab_id: playFabId, pack_id: packId, entitlement, order_id: orderId } = metadata;
    if (!playFabId || !packId || !entitlement || !/^[a-f0-9]{32}$/.test(orderId || "")) {
      throw new Error("Checkout metadata is invalid.");
    }
    const pack = requirePack(packId);
    const pending = await getPendingDlcCheckout(playFabId, orderId);
    if (!pending) throw new Error("Pending checkout was not found.");
    if (pending.status === "completed") return response.status(200).json({ received: true, duplicate: true });
    if (
      entitlement !== pack.entitlement
      || pending.packId !== packId
      || pending.entitlement !== pack.entitlement
      || pending.amount !== pack.amount
      || pending.currency !== pack.currency
      || pending.checkoutSessionId !== checkout.id
      || (attributes.amount != null && Number(attributes.amount) !== pack.amount)
    ) throw new Error("Checkout verification failed.");

    await processVerifiedPurchase({
      playFabId,
      packId,
      entitlement,
      orderId: checkout.id,
      providerEventId: event.data.id,
    });
    await savePendingDlcCheckout(playFabId, orderId, {
      ...pending,
      status: "completed",
      providerEventId: event.data.id,
      completedAt: new Date().toISOString(),
    });
    response.status(200).json({ received: true });
  } catch (error) {
    sendError(response, error);
  }
}

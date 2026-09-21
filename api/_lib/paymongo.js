import { createHmac, timingSafeEqual } from "node:crypto";

const PAYMONGO_API = "https://api.paymongo.com/v1";

function requirePayMongoSecret() {
  if (!process.env.PAYMONGO_SECRET_KEY) {
    const error = new Error("Secure checkout is not configured.");
    error.statusCode = 503;
    throw error;
  }
  return process.env.PAYMONGO_SECRET_KEY;
}

export async function payMongoRequest(path, { method = "GET", body } = {}) {
  const secret = requirePayMongoSecret();
  const response = await fetch(`${PAYMONGO_API}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = payload?.errors?.[0]?.detail;
    const error = new Error(providerMessage || "The payment provider rejected the request.");
    error.statusCode = response.status >= 500 ? 502 : 400;
    throw error;
  }
  return payload.data;
}

export function verifyPayMongoSignature(rawBody, signatureHeader) {
  const webhookSecret = process.env.PAYMONGO_DLC_WEBHOOK_SECRET;
  if (!webhookSecret || !signatureHeader) return false;
  const components = Object.fromEntries(
    String(signatureHeader).split(",").map((part) => {
      const [key, ...value] = part.trim().split("=");
      return [key, value.join("=")];
    }),
  );
  const timestamp = components.t;
  const signatureName = process.env.PAYMONGO_SECRET_KEY?.startsWith("sk_live_") ? "li" : "te";
  const supplied = components[signatureName];
  if (!timestamp || !supplied || !/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const expected = createHmac("sha256", webhookSecret).update(`${timestamp}.${rawBody.toString("utf8")}`).digest("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(supplied, "hex"));
}

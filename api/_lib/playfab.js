const titleId = process.env.PLAYFAB_TITLE_ID || "164227";
const baseUrl = `https://${titleId}.playfabapi.com`;

function requireSecret() {
  const secretKey = process.env.PLAYFAB_TITLE_SECRET_KEY || process.env.PLAYFAB_SECRET_KEY;
  if (!secretKey) {
    const error = new Error("DLC purchases are not configured yet.");
    error.statusCode = 503;
    throw error;
  }
  return secretKey;
}

async function playFabServer(path, body) {
  const response = await fetch(`${baseUrl}/Server/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-SecretKey": requireSecret() },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok || payload.code !== 200) {
    const error = new Error(payload.errorMessage || "PlayFab request failed.");
    error.statusCode = response.status >= 400 ? response.status : 502;
    throw error;
  }
  return payload.data;
}

export async function authenticateSessionTicket(sessionTicket) {
  if (!sessionTicket) {
    const error = new Error("Sign in with your Easy Express account first.");
    error.statusCode = 401;
    throw error;
  }
  const result = await playFabServer("AuthenticateSessionTicket", { SessionTicket: sessionTicket });
  if (!result?.UserInfo?.PlayFabId) {
    const error = new Error("The Easy Express session could not be verified.");
    error.statusCode = 401;
    throw error;
  }
  return result.UserInfo.PlayFabId;
}

function parseEntitlements(record) {
  if (!record?.Value) return [];
  try {
    const parsed = JSON.parse(record.Value);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export async function getOwnedEntitlements(playFabId) {
  const result = await playFabServer("GetUserReadOnlyData", { PlayFabId: playFabId, Keys: ["DLC_ENTITLEMENTS"] });
  return parseEntitlements(result?.Data?.DLC_ENTITLEMENTS);
}

function checkoutKey(orderId) {
  if (!/^[a-f0-9]{32}$/.test(orderId || "")) throw new Error("Checkout reference is invalid.");
  return `DLC_CHECKOUT_${orderId}`;
}

export async function savePendingDlcCheckout(playFabId, orderId, checkout) {
  await playFabServer("UpdateUserInternalData", {
    PlayFabId: playFabId,
    Data: { [checkoutKey(orderId)]: JSON.stringify(checkout) },
  });
}

export async function getPendingDlcCheckout(playFabId, orderId) {
  const key = checkoutKey(orderId);
  const result = await playFabServer("GetUserInternalData", { PlayFabId: playFabId, Keys: [key] });
  const value = result?.Data?.[key]?.Value;
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

export async function processVerifiedPurchase({ playFabId, packId, entitlement, orderId, providerEventId }) {
  const orderKey = `DLC_ORDER_${orderId}`;
  const existing = await playFabServer("GetUserInternalData", { PlayFabId: playFabId, Keys: [orderKey] });
  if (existing?.Data?.[orderKey]?.Value) return { alreadyProcessed: true };

  const owned = new Set(await getOwnedEntitlements(playFabId));
  owned.add(entitlement);
  await playFabServer("UpdateUserReadOnlyData", {
    PlayFabId: playFabId,
    Data: { DLC_ENTITLEMENTS: JSON.stringify([...owned].sort()) },
    Permission: "Private",
  });
  await playFabServer("UpdateUserInternalData", {
    PlayFabId: playFabId,
    Data: { [orderKey]: JSON.stringify({ packId, entitlement, providerEventId, grantedAt: new Date().toISOString() }) },
  });
  return { alreadyProcessed: false };
}

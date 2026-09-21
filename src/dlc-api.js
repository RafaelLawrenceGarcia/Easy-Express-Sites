async function request(path, sessionTicket, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionTicket}`,
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "The DLC service is unavailable.");
  return payload;
}

export function getOwnedDlc(sessionTicket) {
  return request("/api/dlc/owned", sessionTicket);
}

export function createDlcCheckout(sessionTicket, packId) {
  return request("/api/dlc/checkout", sessionTicket, {
    method: "POST",
    body: JSON.stringify({ packId }),
  });
}

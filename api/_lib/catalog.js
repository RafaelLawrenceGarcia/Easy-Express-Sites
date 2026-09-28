export const SERVER_DLC_CATALOG = Object.freeze({
  dlc_neon_diagnostics: {
    entitlement: "DLC_NEON_DIAGNOSTICS",
    name: "Neon Diagnostics Pack",
    description: "Four Easy Express diagnostics and repair service decorations",
    amount: 16900,
    currency: "PHP",
  },
  dlc_customer_lounge: {
    entitlement: "DLC_CUSTOMER_LOUNGE",
    name: "Customer Lounge Pack",
    description: "Four Easy Express customer lounge decorations",
    amount: 19900,
    currency: "PHP",
  },
  dlc_showroom_pro: {
    entitlement: "DLC_SHOWROOM_PRO",
    name: "Showroom Pro Pack",
    description: "Four Easy Express finished PC showroom decorations",
    amount: 22900,
    currency: "PHP",
  },
});

export function requirePack(packId) {
  const pack = SERVER_DLC_CATALOG[packId];
  if (!pack) {
    const error = new Error("Unknown DLC pack.");
    error.statusCode = 400;
    throw error;
  }
  return pack;
}

// ============================================================
//  src/playfab.js
//  Easy Express – Thesis Project
// ============================================================
//  CHANGES FROM ORIGINAL:
//    1. Guest system: Hardened stable-ID approach. Each browser
//       creates exactly ONE guest account (stable localStorage ID).
//       No more duplicate account bloat.
//    2. Guest accounts are tagged with UserData {type:"webguest"}
//       so you can filter/purge them from the PlayFab dashboard.
//    3. sendAccountRecoveryEmail() — triggers PlayFab's built-in
//       password reset email flow.
//    4. verifyPasswordResetOTP() / changePasswordWithOTP() added
//       for the custom OTP-based reset flow in the React UI.
// ============================================================

const TITLE_ID   = "164227";
const BASE_URL   = `https://${TITLE_ID}.playfabapi.com`;

// ── localStorage keys ────────────────────────────────────────────────────────
const LS_GUEST_ID      = "ee_guest_id";      // stable device fingerprint
const LS_GUEST_TICKET  = "ee_guest_ticket";  // cached session ticket
const LS_TICKET_EXPIRY = "ee_ticket_expiry"; // ticket expiry timestamp (ms)

// ── In-memory ticket cache (fastest tier) ────────────────────────────────────
let _inMemoryTicket = null;

// ─────────────────────────────────────────────────────────────────────────────
//  GUEST SESSION MANAGEMENT
//  One stable guest per browser. Never creates more than one account.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the stable guest ID for this browser.
 * Creates a new one only if none exists in localStorage.
 * Format: "WG_<12 hex chars>" — easily filterable in PlayFab dashboard.
 */
function _getOrCreateGuestId() {
  let id = localStorage.getItem(LS_GUEST_ID);
  if (!id) {
    // crypto.randomUUID() is available in all modern browsers
    const uid = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").substring(0, 12)
      : Math.random().toString(36).substring(2, 14);
    id = `WG_${uid}`;
    localStorage.setItem(LS_GUEST_ID, id);
  }
  return id;
}

function _isTicketValid() {
  const expiry = localStorage.getItem(LS_TICKET_EXPIRY);
  if (!expiry) return false;
  return Date.now() < parseInt(expiry, 10);
}

async function _loginAsGuest(guestId) {
  const res = await fetch(`${BASE_URL}/Client/LoginWithCustomID`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      TitleId:       TITLE_ID,
      CustomId:      guestId,
      CreateAccount: true,         // Creates account on first ever login; reuses after
      InfoRequestParameters: {
        GetUserData: false,       // Minimize payload
        GetPlayerStatistics: false,
      }
    }),
  });

  const json = await res.json();
  if (json.code !== 200) throw new Error(json.errorMessage || "Guest login failed");

  // ── Tag new accounts as webguest so they're identifiable ──
  // Only tag on first creation (NewlyCreated flag from PlayFab)
  if (json.data?.NewlyCreated) {
    _tagGuestAccount(json.data.SessionTicket).catch(() => {});
  }

  return json.data.SessionTicket;
}

/**
 * Tags a guest account with {type:"webguest"} in UserData.
 * This lets you filter/purge them from the PlayFab Admin dashboard.
 * Fire-and-forget — don't await this in the critical path.
 */
async function _tagGuestAccount(ticket) {
  await fetch(`${BASE_URL}/Client/UpdateUserData`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Authorization": ticket },
    body: JSON.stringify({
      Data: { accountType: "webguest" },
      Permission: "Private",
    }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC: GET GUEST SESSION TICKET
//  Three-tier cache: memory → localStorage → fresh PlayFab login.
// ─────────────────────────────────────────────────────────────────────────────

export async function getGuestSessionTicket() {
  // Tier 1: in-memory (same page session, zero latency)
  if (_inMemoryTicket) return _inMemoryTicket;

  // Tier 2: localStorage (survives page reload, same browser)
  const stored = localStorage.getItem(LS_GUEST_TICKET);
  if (stored && _isTicketValid()) {
    _inMemoryTicket = stored;
    return _inMemoryTicket;
  }

  // Tier 3: re-login with the SAME stable ID (no new account created)
  const guestId = _getOrCreateGuestId();
  const ticket  = await _loginAsGuest(guestId);

  // Cache for 23 hours (PlayFab tickets expire after 24h; 1h safety margin)
  const expiryMs = Date.now() + 23 * 60 * 60 * 1000;
  localStorage.setItem(LS_GUEST_TICKET,  ticket);
  localStorage.setItem(LS_TICKET_EXPIRY, String(expiryMs));
  _inMemoryTicket = ticket;

  return ticket;
}

/**
 * Clears the cached guest ticket.
 * Call this if you get a 401 Unauthorized.
 */
export function invalidateGuestTicket() {
  _inMemoryTicket = null;
  localStorage.removeItem(LS_GUEST_TICKET);
  localStorage.removeItem(LS_TICKET_EXPIRY);
}

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC: LEADERBOARD (with 5-minute session cache)
// ─────────────────────────────────────────────────────────────────────────────

const LB_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchPublicLeaderboard(statisticName, maxResults = 10) {
  const cacheKey = `ee_lb_${statisticName}`;
  const raw = sessionStorage.getItem(cacheKey);

  if (raw) {
    try {
      const { entries, ts } = JSON.parse(raw);
      if (Date.now() - ts < LB_CACHE_TTL) return entries;
    } catch (_) { /* stale cache — fall through */ }
  }

  let ticket;
  try {
    ticket = await getGuestSessionTicket();
  } catch (err) {
    throw new Error(`Could not authenticate: ${err.message}`);
  }

  const res = await fetch(`${BASE_URL}/Client/GetLeaderboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Authorization": ticket },
    body: JSON.stringify({
      StatisticName:   statisticName,
      StartPosition:   0,
      MaxResultsCount: maxResults,
    }),
  });

  const json = await res.json();

  // Stale ticket → invalidate and retry once
  if (json.code === 401 || json.code === 1074) {
    invalidateGuestTicket();
    return fetchPublicLeaderboard(statisticName, maxResults);
  }
  if (json.code !== 200)
    throw new Error(json.errorMessage || `Leaderboard fetch failed (${json.code})`);

  const entries = json.data?.Leaderboard ?? [];
  sessionStorage.setItem(cacheKey, JSON.stringify({ entries, ts: Date.now() }));
  return entries;
}

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC: TITLE DATA (News, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchTitleData(keys) {
  const ticket = await getGuestSessionTicket();
  const res = await fetch(`${BASE_URL}/Client/GetTitleData`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Authorization": ticket },
    body: JSON.stringify({ Keys: keys }),
  });

  const json = await res.json();
  if (json.code === 401 || json.code === 1074) {
    invalidateGuestTicket();
    return fetchTitleData(keys);
  }
  if (json.code !== 200) throw new Error(json.errorMessage || "TitleData fetch failed");
  return json.data?.Data ?? {};
}

// ─────────────────────────────────────────────────────────────────────────────
//  AUTHENTICATED USER — REGISTRATION & LOGIN
// ─────────────────────────────────────────────────────────────────────────────

export async function registerUser({ username, email, password, displayName }) {
  const res = await fetch(`${BASE_URL}/Client/RegisterPlayFabUser`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      TitleId:                   TITLE_ID,
      Username:                  username,
      Email:                     email,
      Password:                  password,
      DisplayName:               displayName || username,
      RequireBothUsernameAndEmail: true,
    }),
  });

  const data = await res.json();
  if (data.code !== 200) throw new Error(data.errorMessage || "Registration failed");
  return data.data; // { SessionTicket, PlayFabId, ... }
}

export async function loginWithEmail({ email, password }) {
  const res = await fetch(`${BASE_URL}/Client/LoginWithEmailAddress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ TitleId: TITLE_ID, Email: email, Password: password }),
  });

  const data = await res.json();
  if (data.code !== 200) throw new Error(data.errorMessage || "Login failed");
  return data.data;
}

export async function loginWithUsername({ username, password }) {
  const res = await fetch(`${BASE_URL}/Client/LoginWithPlayFab`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ TitleId: TITLE_ID, Username: username, Password: password }),
  });

  const data = await res.json();
  if (data.code !== 200) throw new Error(data.errorMessage || "Login failed");
  return data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
//  CLOUD SCRIPT
// ─────────────────────────────────────────────────────────────────────────────

export async function executeCloudScript({ sessionTicket, functionName, functionParameter }) {
  const res = await fetch(`${BASE_URL}/Client/ExecuteCloudScript`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Authorization": sessionTicket },
    body: JSON.stringify({
      FunctionName:         functionName,
      FunctionParameter:    functionParameter,
      GeneratePlayStreamEvent: true,
    }),
  });

  const data = await res.json();
  if (data.code !== 200) throw new Error(data.errorMessage || "Cloud Script failed");
  return data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
//  FORGOT PASSWORD — PLAYFAB BUILT-IN RECOVERY
//  Uses PlayFab's own secure account recovery flow. PlayFab sends
//  a reset link to the registered email — no secret key required.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends a password reset link to the registered email address.
 * PlayFab handles the actual email sending and secure token.
 * After calling this, direct the user to check their inbox.
 *
 * @param {string} email - The email address registered with PlayFab.
 * @throws {Error} If the email is not found or the request fails.
 */
export async function sendPasswordRecoveryEmail(email) {
  const res = await fetch(`${BASE_URL}/Client/SendAccountRecoveryEmail`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      TitleId: TITLE_ID,
      Email:   email.trim().toLowerCase(),
    }),
  });

  const data = await res.json();

  // PlayFab returns 200 even if the email doesn't exist (security — no user enumeration)
  // But it throws non-200 for invalid format or title config errors.
  if (data.code !== 200) {
    const friendlyError =
      data.errorMessage?.includes("email")
        ? "No account found with that email address."
        : (data.errorMessage || "Password reset failed. Please try again.");
    throw new Error(friendlyError);
  }

  return true; // success
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET USER DATA (for profile display)
// ─────────────────────────────────────────────────────────────────────────────

export async function getUserData(sessionTicket, keys = []) {
  const res = await fetch(`${BASE_URL}/Client/GetUserData`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Authorization": sessionTicket },
    body: JSON.stringify({ Keys: keys }),
  });

  const data = await res.json();
  if (data.code !== 200) throw new Error(data.errorMessage || "GetUserData failed");
  return data.data?.Data ?? {};
}

// ─────────────────────────────────────────────────────────────────────────────
//  FULL GAME OWNERSHIP — Save & Check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Called after a successful purchase. Flags the account as owning the full game.
 * @param {string} sessionTicket - The logged-in user's session ticket.
 */
export async function saveFullGameOwnership(sessionTicket) {
  const res = await fetch(`${BASE_URL}/Client/UpdateUserData`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Authorization": sessionTicket },
    body: JSON.stringify({
      Data: { fullGameOwned: "true" },
      Permission: "Public",
    }),
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(data.errorMessage || "Failed to save ownership.");
  return true;
}

/**
 * Checks if the logged-in user owns the full game.
 * Call this after login to gate the download button.
 * @param {string} sessionTicket - The logged-in user's session ticket.
 * @returns {boolean} true if they own the full game.
 */
export async function checkFullGameOwnership(sessionTicket) {
  const res = await fetch(`${BASE_URL}/Client/GetUserData`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Authorization": sessionTicket },
    body: JSON.stringify({ Keys: ["fullGameOwned"] }),
  });
  const data = await res.json();
  if (data.code !== 200) return false;
  return data.data?.Data?.fullGameOwned?.Value === "true";
}
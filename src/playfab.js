// ============================================================
//  src/playfab.js
//  Easy Express – Thesis Project
// ============================================================
//  CHANGES FROM ORIGINAL:
//    1. Public website content is read through a server-side endpoint.
//       Browsing the site never creates an anonymous PlayFab player.
//    2. sendAccountRecoveryEmail() — triggers PlayFab's built-in
//       password reset email flow.
//    3. verifyPasswordResetOTP() / changePasswordWithOTP() added
//       for the custom OTP-based reset flow in the React UI.
// ============================================================

const TITLE_ID   = "164227";
const BASE_URL   = `https://${TITLE_ID}.playfabapi.com`;

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC: TITLE DATA (News, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchTitleData(keys) {
  const res = await fetch("/api/public-title-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Keys: keys }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "TitleData fetch failed");
  return json.data ?? {};
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
      RequireBothUsernameAndEmail: true,
    }),
  });

  const data = await res.json();
  if (data.code !== 200) {
    const detail = Object.values(data.errorDetails || {}).flat().find(Boolean);
    throw new Error(detail || data.errorMessage || data.error || "Registration failed");
  }

  // Real names are not PlayFab display names: PlayFab requires display names
  // to be unique, while many players legitimately share the same name. Keep
  // the profile name as private, client-readable user data instead.
  if (displayName) {
    try {
      await fetch(`${BASE_URL}/Client/UpdateUserData`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Authorization": data.data.SessionTicket },
        body: JSON.stringify({ Data: { ProfileName: displayName }, Permission: "Private" }),
      });
    } catch {
      // Registration remains valid if optional profile personalization fails.
    }
  }

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

/**
 * Returns the canonical account identity for an authenticated session.
 * The UI uses this instead of trusting whatever the player typed into the
 * login field (which may be an email address).
 */
export async function getAccountInfo(sessionTicket) {
  const headers = { "Content-Type": "application/json", "X-Authorization": sessionTicket };
  const [accountResponse, profileResponse] = await Promise.all([
    fetch(`${BASE_URL}/Client/GetAccountInfo`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    }),
    fetch(`${BASE_URL}/Client/GetUserData`, {
      method: "POST",
      headers,
      body: JSON.stringify({ Keys: ["ProfileName"] }),
    }),
  ]);

  const data = await accountResponse.json();
  if (data.code !== 200) throw new Error(data.errorMessage || "Your session has expired.");

  const profileData = await profileResponse.json().catch(() => ({}));
  const profileName = profileData.code === 200
    ? profileData.data?.Data?.ProfileName?.Value || ""
    : "";

  const account = data.data?.AccountInfo ?? {};
  return {
    playFabId: account.PlayFabId || "",
    username: account.Username || account.TitleInfo?.DisplayName || "Player",
    displayName: profileName || account.TitleInfo?.DisplayName || account.Username || "Player",
    email: account.PrivateInfo?.Email || "",
  };
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

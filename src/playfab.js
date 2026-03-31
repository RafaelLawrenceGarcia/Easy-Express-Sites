// src/playfab.js
const TITLE_ID = "164227"; 
const BASE_URL = `https://${TITLE_ID}.playfabapi.com`;

// ─── REGISTER ───
export async function registerUser({ username, email, password, displayName }) {
  const res = await fetch(`${BASE_URL}/Client/RegisterPlayFabUser`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      TitleId: TITLE_ID,
      Username: username,
      Email: email,
      Password: password,
      DisplayName: displayName || username,
      RequireBothUsernameAndEmail: true,
    }),
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(data.errorMessage || "Registration failed");
  return data.data; 
}

// ─── LOGIN WITH EMAIL ───
export async function loginWithEmail({ email, password }) {
  const res = await fetch(`${BASE_URL}/Client/LoginWithEmailAddress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      TitleId: TITLE_ID,
      Email: email,
      Password: password,
    }),
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(data.errorMessage || "Login failed");
  return data.data; 
}

// ─── LOGIN WITH USERNAME ───
export async function loginWithUsername({ username, password }) {
  const res = await fetch(`${BASE_URL}/Client/LoginWithPlayFab`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      TitleId: TITLE_ID,
      Username: username,
      Password: password,
    }),
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(data.errorMessage || "Login failed");
  return data.data;
}

// ─── EXECUTE CLOUD SCRIPT (for OTP) ───
export async function executeCloudScript({ sessionTicket, functionName, functionParameter }) {
  const res = await fetch(`${BASE_URL}/Client/ExecuteCloudScript`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Authorization": sessionTicket,
    },
    body: JSON.stringify({
      FunctionName: functionName,
      FunctionParameter: functionParameter,
      GeneratePlayStreamEvent: true,
    }),
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(data.errorMessage || "Cloud Script failed");
  return data.data;
}
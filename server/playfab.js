import { fail } from './core.js';
export async function playfab(endpoint, body, ticket) {
  const title = process.env.PLAYFAB_TITLE_ID || '164227';
  if (!/^[A-F0-9]+$/i.test(title)) fail('PlayFab title configuration is invalid.', 503);
  let response;
  try {
    response = await fetch(`https://${title}.playfabapi.com/Client/${endpoint}`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(ticket ? { 'X-Authorization': ticket } : {}) },
      body: JSON.stringify({ TitleId: title, ...body }), signal: AbortSignal.timeout(15000) });
  } catch { fail('PlayFab is temporarily unavailable. Please try again.', 503); }
  const p = await response.json();
  if (p.code !== 200) {
    const messages = {
      EmailAddressNotAvailable: 'This email is still attached to an existing PlayFab login. Deleting game data does not release the login. Use the existing account, or wait until its full account deletion is confirmed before registering again.',
      UsernameNotAvailable: 'This game username is already attached to a PlayFab login. Choose another username or sign in to that account.',
      AccountDeleted: 'PlayFab is still completing this account’s deletion. Wait for deletion to finish before registering again.',
    };
    const message = messages[p.error] || p.errorMessage || 'PlayFab request failed.';
    const status = messages[p.error] ? 409 : p.code === 401 || /password|not found|credentials/i.test(p.errorMessage || '') ? 401 : 502;
    throw Object.assign(new Error(message), { status, providerError: p.error });
  }
  return p.data;
}
export async function identity(ticket) {
  if (typeof ticket !== 'string' || ticket.length < 10 || ticket.length > 4096) fail('Sign in is required.', 401);
  const p = await playfab('GetAccountInfo', {}, ticket);
  const account = p.AccountInfo;
  if (!account?.PlayFabId) fail('Your session has expired.', 401);
  return { id: account.PlayFabId.toUpperCase(), name: account.TitleInfo?.DisplayName || account.Username || 'Employee', email: account.PrivateInfo?.Email || '' };
}
export function isCEO(id) { return id === (process.env.EASY_EXPRESS_CEO_PLAYFAB_ID || '').trim().toUpperCase(); }

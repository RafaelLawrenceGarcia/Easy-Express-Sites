export async function sendPasswordRecoveryEmail(email) {
  const r = await fetch('/api/training', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'recover', email }) });
  const p = await r.json(); if (!r.ok) throw new Error(p.error || 'Account recovery is unavailable.'); return true;
}

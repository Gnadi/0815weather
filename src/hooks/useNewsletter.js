export async function subscribeEmail(email) {
  const res = await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.error ?? 'Request failed');

  return data; // { ok: true } or { ok: false, reason: 'already_subscribed' }
}

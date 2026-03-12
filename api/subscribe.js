const BIN_URL = `https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BIN_ID}`;
const HEADERS = {
  'Content-Type': 'application/json',
  'X-Access-Key': process.env.JSONBIN_ACCESS_KEY,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body ?? {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const normalized = email.trim().toLowerCase();

  // Fetch current list
  const getRes = await fetch(BIN_URL, { headers: HEADERS });
  if (!getRes.ok) return res.status(502).json({ error: 'Storage unavailable' });

  const { record } = await getRes.json();
  const subscribers = record.subscribers ?? [];

  if (subscribers.includes(normalized)) {
    return res.status(200).json({ ok: false, reason: 'already_subscribed' });
  }

  // Write updated list
  const putRes = await fetch(BIN_URL, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify({ subscribers: [...subscribers, normalized] }),
  });

  if (!putRes.ok) return res.status(502).json({ error: 'Storage write failed' });

  return res.status(200).json({ ok: true });
}

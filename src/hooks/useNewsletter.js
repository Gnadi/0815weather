const LS_KEY = 'newsletter_subscribers';

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocal(emails) {
  localStorage.setItem(LS_KEY, JSON.stringify(emails));
}

async function persistToJsonBin(emails) {
  const binId = import.meta.env.VITE_JSONBIN_BIN_ID;
  const key = import.meta.env.VITE_JSONBIN_ACCESS_KEY;
  if (!binId || !key) return;

  await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Access-Key': key,
    },
    body: JSON.stringify({ subscribers: emails }),
  });
}

export async function subscribeEmail(email) {
  const existing = loadLocal();
  if (existing.includes(email)) {
    return { ok: false, reason: 'already_subscribed' };
  }
  const updated = [...existing, email];
  saveLocal(updated);
  // fire-and-forget — don't block the UI on network
  persistToJsonBin(updated).catch(() => {});
  return { ok: true };
}

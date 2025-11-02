// Cloudflare Worker — menerima data harga dari GitHub Action, simpan KV, kirim Telegram

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 🔐 Ambil token dari environment secrets (GitHub)
    const BOT_TOKEN = env.BOT_TOKEN;
    const CHAT_ID = env.CHAT_ID;

    // === Endpoint untuk update harga ===
    if (url.pathname === '/update' && request.method === 'POST') {
      const data = await request.json();
      const key = `price_${data.product}`;
      const last = await env.era_tracker.get(key);
      await env.era_tracker.put(key, data.price.toString());

      let notify = false;
      if (!last || data.price < parseInt(last)) notify = true;

      if (notify) {
        await sendTelegram(
          BOT_TOKEN,
          CHAT_ID,
          `🔔 ${data.product}\n💰 Rp ${data.price.toLocaleString('id-ID')}\n🔗 ${data.url}`
        );
      }

      return new Response('OK');
    }

    // === Endpoint untuk cek harga terakhir ===
    const last = await env.era_tracker.get('price_HONOR 400 5G');
    return new Response(`Last price: Rp ${parseInt(last || '0').toLocaleString('id-ID')}`);
  },
};

// === Fungsi kirim pesan ke Telegram ===
async function sendTelegram(BOT_TOKEN, CHAT_ID, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body = new URLSearchParams({
    chat_id: CHAT_ID,
    text,
    parse_mode: "HTML",
  });
  await fetch(url, { method: "POST", body });
}

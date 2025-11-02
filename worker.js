// Cloudflare Worker — menerima data harga dari GitHub Action, simpan KV, kirim Telegram

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Endpoint untuk GitHub Action mengirim harga
    if (url.pathname === '/update' && request.method === 'POST') {
      const data = await request.json();
      const key = `price_${data.product}`;
      const last = await env.PRICES.get(key);
      await env.PRICES.put(key, data.price.toString());

      let notify = false;
      if (!last || data.price < parseInt(last)) notify = true;

      if (notify) {
        await sendTelegram(env, `🔔 ${data.product}\n💰 Rp ${data.price.toLocaleString('id-ID')}\n🔗 ${data.url}`);
      }

      return new Response('OK');
    }

    // Endpoint cek manual
    const last = await env.PRICES.get('price_HONOR 400 5G');
    return new Response(`Last price: Rp ${parseInt(last || '0').toLocaleString('id-ID')}`);
  },
};

async function sendTelegram(env, text) {
  const url = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;
  const body = new URLSearchParams({
    chat_id: env.CHAT_ID,
    text,
    parse_mode: "HTML",
  });
  await fetch(url, { method: "POST", body });
}

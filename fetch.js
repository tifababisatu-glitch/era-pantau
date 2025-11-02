import { chromium } from 'playwright';
import fetch from 'node-fetch';

const PRODUCT = {
  name: 'HONOR 400 5G',
  url: 'https://eraspace.com/eraspace/produk/honor-400-5g',
};

// ✅ Worker URL kamu
const WORKER_ENDPOINT = 'https://pantau-era.tifababisatu.workers.dev/update';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(PRODUCT.url, { waitUntil: 'networkidle' });

  // Ambil seluruh HTML setelah render
  const html = await page.content();

  // Cari harga dengan 2 pola: JSON ("price":) atau teks ("Rp ...")
  const match = html.match(/"price"\s*:\s*"(\d+)"/i) || html.match(/Rp\s*([\d\.]+)/i);
  if (!match) {
    console.error('❌ Harga tidak ditemukan di halaman Eraspace.');
    await browser.close();
    process.exit(1);
  }

  // Bersihkan dan ubah ke angka
  const price = parseInt(match[1].replace(/\./g, ''), 10);
  console.log(`✅ ${PRODUCT.name}: Rp ${price.toLocaleString('id-ID')}`);

  // Kirim ke Cloudflare Worker
  await fetch(WORKER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product: PRODUCT.name, price, url: PRODUCT.url }),
  });

  await browser.close();
})();

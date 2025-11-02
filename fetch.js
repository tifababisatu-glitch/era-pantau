import { chromium } from 'playwright';
import fetch from 'node-fetch';

// URL produk
const PRODUCT_URL = 'https://eraspace.com/eraspace/produk/honor-400-5g';

// URL endpoint Cloudflare Worker kamu
const WORKER_ENDPOINT = 'https://price-watcher-yourname.workers.dev/update'; 

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(PRODUCT_URL, { waitUntil: 'networkidle' });

  // Cari teks harga yang ada "Rp"
  const html = await page.content();
  const match = html.match(/Rp\s*([\d\.]+)/i);
  if (!match) {
    console.error('❌ Harga tidak ditemukan');
    process.exit(1);
  }

  const price = parseInt(match[1].replace(/\./g, ''), 10);
  console.log('✅ Harga ditemukan:', price);

  // Kirim ke Cloudflare Worker
  await fetch(WORKER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product: 'HONOR 400 5G', price })
  });

  await browser.close();
})();

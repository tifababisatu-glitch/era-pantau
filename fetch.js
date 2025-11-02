import { chromium } from 'playwright';
import fetch from 'node-fetch';

const PRODUCT = {
  name: 'HONOR 400 5G',
  url: 'https://eraspace.com/eraspace/produk/honor-400-5g',
};

const WORKER_ENDPOINT = 'https://price-watcher-yourname.workers.dev/update';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(PRODUCT.url, { waitUntil: 'networkidle' });

  // Ambil harga dari halaman render penuh
  const html = await page.content();
  const match = html.match(/Rp\s*([\d\.]+)/i);
  if (!match) {
    console.error('❌ Harga tidak ditemukan');
    process.exit(1);
  }

  const price = parseInt(match[1].replace(/\./g, ''), 10);
  console.log(`✅ ${PRODUCT.name}: Rp ${price.toLocaleString('id-ID')}`);

  await fetch(WORKER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product: PRODUCT.name, price, url: PRODUCT.url }),
  });

  await browser.close();
})();

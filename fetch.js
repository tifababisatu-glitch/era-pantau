import { chromium } from "playwright";
import fetch from "node-fetch";

const PRODUCT = {
  name: "HONOR 400 5G",
  url: "https://eraspace.com/eraspace/produk/honor-400-5g",
};

// ✅ Worker endpoint kamu
const WORKER_ENDPOINT =
  "https://pantau-era.tifababisatu.workers.dev/update";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  console.log("🌐 Membuka halaman:", PRODUCT.url);

  await page.goto(PRODUCT.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(5000); // 🕒 tunggu 5 detik biar harga muncul

  const html = await page.content();

  // Cari harga dari JSON atau teks biasa
  const match =
    html.match(/"price"\s*:\s*"(\d+)"/i) || html.match(/Rp\s*([\d\.\,]+)/i);

  if (!match) {
    console.error("❌ Harga tidak ditemukan di halaman Eraspace.");
    await browser.close();
    process.exit(1);
  }

  const price = parseInt(match[1].replace(/\./g, "").replace(/,/g, ""), 10);
  console.log(`✅ ${PRODUCT.name}: Rp ${price.toLocaleString("id-ID")}`);

  // Kirim hasil ke Worker
  const res = await fetch(WORKER_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product: PRODUCT.name,
      price,
      url: PRODUCT.url,
    }),
  });

  console.log("📡 Kirim ke Worker:", res.status, await res.text());

  await browser.close();
})();

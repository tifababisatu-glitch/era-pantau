import { chromium } from "playwright";
import fetch from "node-fetch";

const PRODUCT = {
  name: "HONOR 400 5G",
  url: "https://eraspace.com/eraspace/produk/honor-400-5g",
};

const WORKER_ENDPOINT = "https://pantau-era.tifababisatu.workers.dev/update";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("🌐 Membuka halaman:", PRODUCT.url);
  await page.goto(PRODUCT.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(8000); // tunggu 8 detik agar harga render

  const html = await page.content();
  const match =
    html.match(/"price"\s*:\s*"(\d+)"/i) || html.match(/Rp\s*([\d\.\,]+)/i);

  if (!match) {
    console.error("❌ Harga tidak ditemukan di halaman Eraspace.");
    await browser.close();
    process.exit(1);
  }

  const price = parseInt(match[1].replace(/\./g, "").replace(/,/g, ""), 10);
  console.log(`✅ ${PRODUCT.name}: Rp ${price.toLocaleString("id-ID")}`);

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

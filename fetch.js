/**
 *  🔍 ERA-PANTAU — Fetch harga dari Eraspace & kirim ke Cloudflare Worker
 *  versi: 2025-11-03
 */

import { chromium } from "playwright";
import fetch from "node-fetch";

const PRODUCT = {
  name: "HONOR 400 5G",
  url: "https://eraspace.com/eraspace/produk/honor-400-5g",
};

// Worker endpoint kamu
const WORKER_ENDPOINT = "https://pantau-era.tifababisatu.workers.dev/update";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("🌐 Membuka halaman:", PRODUCT.url);

  // --- 1. Kunjungi halaman dengan timeout lebih lama ---
  try {
    await page.goto(PRODUCT.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000, // 60 detik
    });
  } catch (e) {
    console.warn("⚠️ Timeout, coba ulang sekali...");
    await page.waitForTimeout(5000);
    try {
      await page.goto(PRODUCT.url, {
        waitUntil: "load",
        timeout: 60000,
      });
    } catch (e2) {
      console.error("❌ Gagal memuat halaman:", e2.message);
      await browser.close();
      process.exit(1);
    }
  }

  // --- 2. Tunggu tambahan agar script halaman sempat render ---
  await page.waitForTimeout(8000);

  // Cetak judul halaman & waktu load
  const title = await page.title();
  console.log("🕓 Halaman terbuka:", title);

  // --- 3. Ambil HTML dan cari harga ---
  const html = await page.content();
  const match =
    html.match(/"price"\s*:\s*"(\d+)"/i) ||
    html.match(/Rp\s*([\d\.\,]+)/i);

  if (!match) {
    console.error("❌ Harga tidak ditemukan di halaman Eraspace.");
    await browser.close();
    process.exit(1);
  }

  const price = parseInt(match[1].replace(/\./g, "").replace(/,/g, ""), 10);
  console.log(`✅ ${PRODUCT.name}: Rp ${price.toLocaleString("id-ID")}`);

  // --- 4. Kirim ke Cloudflare Worker ---
  try {
    const res = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: PRODUCT.name,
        price,
        url: PRODUCT.url,
      }),
    });

    const text = await res.text();
    console.log("📡 Kirim ke Worker:", res.status, text);
  } catch (err) {
    console.error("❌ Gagal mengirim data ke Worker:", err.message);
  }

  await browser.close();
  console.log("🏁 Selesai — fetch.js");
})();

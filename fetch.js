import { chromium } from "playwright";
import fetch from "node-fetch";
import fs from "fs";

const PRODUCT = {
  name: "HONOR 400 5G",
  url: "https://eraspace.com/eraspace/produk/honor-400-5g",
};
const WORKER_ENDPOINT = "https://pantau-era.tifababisatu.workers.dev/update";

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();

  console.log("🌐 Membuka halaman:", PRODUCT.url);

  // --- STEP 1: Buka halaman dengan timeout panjang dan retry ---
  try {
    await page.goto(PRODUCT.url, { waitUntil: "domcontentloaded", timeout: 90000 });
  } catch (e) {
    console.warn("⚠️ Timeout pertama, reload ulang:", e.message);
    try {
      await page.reload({ waitUntil: "load", timeout: 90000 });
    } catch (e2) {
      console.error("❌ Gagal memuat halaman:", e2.message);
      await page.screenshot({ path: "debug_page.png", fullPage: true });
      await browser.close();
      process.exit(1);
    }
  }

  // --- STEP 2: Tunggu agar JavaScript halaman selesai render ---
  await page.waitForTimeout(15000);
  const title = await page.title();
  console.log("🕓 Halaman terbuka:", title);

  // --- STEP 3: Simpan HTML dan Screenshot untuk debug ---
  const html = await page.content();
  fs.writeFileSync("debug_page.html", html, "utf-8");
  await page.screenshot({ path: "debug_page.png", fullPage: true });
  console.log("📸 Screenshot dan HTML disimpan untuk debug.");

  // --- STEP 4: Cari harga dari berbagai pola ---
  const match =
    html.match(/"price"\s*:\s*"(\d+)"/i) ||
    html.match(/"selling_price"\s*:\s*(\d+)/i) ||
    html.match(/"normal_price"\s*:\s*"(\d+)"/i) ||
    html.match(/Rp\s*([\d\.\,]+)/i);

  if (!match) {
    console.error("❌ Tidak ditemukan harga. Lihat debug_page.html.");
    await browser.close();
    process.exit(1);
  }

  const price = parseInt(match[1].replace(/[^\d]/g, ""), 10);
  console.log(`✅ ${PRODUCT.name}: Rp ${price.toLocaleString("id-ID")}`);

  // --- STEP 5: Kirim data ke Cloudflare Worker ---
  try {
    const res = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: PRODUCT.name, price, url: PRODUCT.url }),
    });
    console.log("📡 Kirim ke Worker:", res.status, await res.text());
  } catch (err) {
    console.error("❌ Gagal kirim ke Worker:", err.message);
  }

  await browser.close();
  console.log("🏁 Selesai — debug fetch.js");
})();

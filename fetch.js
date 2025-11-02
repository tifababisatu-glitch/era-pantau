// ===============================
// ERA TRACKER (GitHub + Cloudflare)
// ===============================

import puppeteer from "puppeteer";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ERA_URL = "https://eraspace.com/eraspace/produk/honor-400-5g";
const DEBUG_FILE = "debug_page.html";

// ===============================
// 🔧 Helper Functions
// ===============================
async function sendTelegram(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "Markdown",
    }),
  });
  console.log("📩 Telegram sent:", message);
}

// ===============================
// 🧠 Main Function
// ===============================
async function main() {
  console.log(`🌐 Mengambil halaman: ${ERA_URL}`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto(ERA_URL, { waitUntil: "networkidle2", timeout: 60000 });

  // Tunggu kemungkinan render harga dinamis
  await page.waitForTimeout(5000);

  const html = await page.content();
  fs.writeFileSync(DEBUG_FILE, html); // simpan untuk debug kalau gagal

  // Coba ambil meta tag harga (server-rendered)
  let price =
    (await page
      .$eval('meta[property="product:price:amount"]', (el) => el.content)
      .catch(() => null)) || null;

  // Jika meta tidak ada, coba ambil dari elemen UI (client-rendered)
  if (!price) {
    const priceSelectorCandidates = [
      '[class*="price"]',
      '[data-testid*="price"]',
      "span:has(text('Rp'))",
      ".text-primary",
      ".text-price",
    ];

    for (const selector of priceSelectorCandidates) {
      price = await page
        .$eval(selector, (el) => el.textContent)
        .catch(() => null);
      if (price && price.includes("Rp")) break;
    }
  }

  if (!price) {
    console.log("❌ Tidak ditemukan meta harga dalam HTML (cek debug_page.html)");
    await sendTelegram("❌ HONOR 400 5G (Eraspace): Harga tidak ditemukan");
    await browser.close();
    process.exit(1);
  }

  // Bersihkan format harga
  const numericPrice = price.replace(/[^\d]/g, "");
  const displayPrice = `Rp ${numericPrice.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    "."
  )}`;

  console.log(`💰 Harga ditemukan: ${displayPrice}`);

  await sendTelegram(`✅ HONOR 400 5G (Eraspace): *${displayPrice}*`);
  await browser.close();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  sendTelegram(`⚠️ Gagal memproses harga: ${err.message}`);
  process.exit(1);
});

// ========================================
// ERA PANTAU — Harga Otomatis Eraspace
// ========================================

import puppeteer from "puppeteer";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// ===============================
// 🔧 Konfigurasi
// ===============================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const PRODUCT_URL = "https://eraspace.com/eraspace/produk/honor-400-5g";
const DEBUG_FILE = "debug_page.html";

// ===============================
// 📤 Kirim Notifikasi Telegram
// ===============================
async function sendTelegram(message) {
  const apiUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  try {
    await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    });
    console.log("📩 Telegram terkirim:", message);
  } catch (err) {
    console.error("⚠️ Gagal kirim Telegram:", err.message);
  }
}

// ===============================
// 🚀 Main Function
// ===============================
async function main() {
  console.log(`🌐 Mengambil halaman: ${PRODUCT_URL}`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Buka halaman dan tunggu JS selesai render
  await page.goto(PRODUCT_URL, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForTimeout(5000);

  const html = await page.content();
  fs.writeFileSync(DEBUG_FILE, html);

  // ===============================
  // 🎯 Ambil harga dari berbagai kemungkinan
  // ===============================
  let price = null;

  // 1️⃣ Coba meta tag OG
  try {
    price = await page.$eval(
      'meta[property="product:price:amount"]',
      (el) => el.content
    );
  } catch {}

  // 2️⃣ Coba elemen HTML yang mengandung “Rp”
  if (!price) {
    const selectors = [
      '[class*="price"]',
      '[data-testid*="price"]',
      "span:has-text('Rp')",
      ".text-primary",
      ".text-price",
    ];

    for (const selector of selectors) {
      try {
        const val = await page.$eval(selector, (el) => el.textContent.trim());
        if (val && val.includes("Rp")) {
          price = val;
          break;
        }
      } catch {}
    }
  }

  // ===============================
  // 💰 Jika tidak ada harga
  // ===============================
  if (!price) {
    console.log("❌ Tidak ditemukan harga (cek debug_page.html)");
    await sendTelegram("❌ HONOR 400 5G (Eraspace): Harga tidak ditemukan");
    await browser.close();
    process.exit(1);
  }

  // ===============================
  // 🧮 Format harga
  // ===============================
  const clean = price.replace(/[^\d]/g, "");
  const formatted = `Rp ${clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  console.log(`✅ Harga ditemukan: ${formatted}`);

  await sendTelegram(`✅ HONOR 400 5G (Eraspace): *${formatted}*`);
  await browser.close();
}

main().catch((err) => {
  console.error("💥 Error:", err);
  sendTelegram(`⚠️ Gagal memproses harga: ${err.message}`);
  process.exit(1);
});

import puppeteer from "puppeteer";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const url = "https://eraspace.com/eraspace/produk/honor-400-5g";
const token = process.env.TELEGRAM_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

// helper agar kompatibel di semua versi Puppeteer
async function safeWait(page, ms) {
  if (typeof page.waitForTimeout === "function") {
    await page.waitForTimeout(ms);
  } else {
    await new Promise(r => setTimeout(r, ms));
  }
}

async function main() {
  console.log("🌐 Mengambil halaman:", url);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Tunggu JS render dan scroll agar produk muncul penuh
    await safeWait(page, 6000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await safeWait(page, 3000);

    // Ambil seluruh HTML untuk debug
    const html = await page.content();
    fs.writeFileSync("debug_page.html", html);

    // Coba ambil harga dari beberapa kemungkinan selector
    const harga = await page.evaluate(() => {
      const possibleSelectors = [
        "[class*='price']",
        "[data-testid*='price']",
        "div[class*='Price']",
        "span[class*='Price']",
        ".text-price",
        ".product-price",
        "p:contains('Rp')"
      ];
      for (const sel of possibleSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText && el.innerText.includes("Rp")) {
          return el.innerText.trim();
        }
      }
      return null;
    });

    if (!harga) {
      console.log("❌ Tidak ditemukan meta harga dalam HTML (cek debug_page.html)");
      throw new Error("Harga tidak ditemukan di halaman");
    }

    console.log("💰 Harga ditemukan:", harga);
    await sendTelegram(`✅ HONOR 400 5G: ${harga}`);
  } catch (err) {
    console.error("💥 Error:", err);
    await sendTelegram(`❌ Gagal mengambil harga: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function sendTelegram(msg) {
  if (!token || !chatId) {
    console.error("⚠️ TELEGRAM_TOKEN atau TELEGRAM_CHAT_ID tidak diset di .env");
    return;
  }
  const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(telegramUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: msg }),
  });
}

main();

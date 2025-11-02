import fetch from "node-fetch";
import fs from "fs";

const PRODUCT = {
  name: "HONOR 400 5G",
  url: "https://eraspace.com/eraspace/produk/honor-400-5g",
};

const WORKER_ENDPOINT = "https://pantau-era.tifababisatu.workers.dev/update";

(async () => {
  console.log("🌐 Mengambil halaman:", PRODUCT.url);

  try {
    const res = await fetch(PRODUCT.url, { timeout: 60000 });
    const html = await res.text();

    // Simpan untuk debug
    fs.writeFileSync("debug_page.html", html, "utf-8");

    // Ambil harga dari meta tag
    const match =
      html.match(/<meta[^>]+property=["']product:price:amount["'][^>]+content=["'](\d+)["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:data1["'][^>]+content=["'][^0-9]*([\d\.\,]+)/i);

    if (!match) {
      console.error("❌ Tidak ditemukan meta harga dalam HTML (cek debug_page.html)");
      process.exit(1);
    }

    const price = parseInt(match[1].replace(/[^\d]/g, ""), 10);
    console.log(`✅ ${PRODUCT.name}: Rp ${price.toLocaleString("id-ID")}`);

    // Kirim ke Worker
    const payload = {
      product: PRODUCT.name,
      price,
      url: PRODUCT.url,
    };

    const response = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.text();
    console.log("📡 Kirim ke Worker:", response.status, result);
  } catch (err) {
    console.error("❌ Gagal ambil atau kirim data:", err.message);
  }
})();

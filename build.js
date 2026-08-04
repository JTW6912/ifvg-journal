// Vercel 构建时执行：把环境变量 SUPABASE_URL / SUPABASE_ANON_KEY 写成 config.js
// 本地开发不需要跑这个，直接复制 config.example.js 为 config.js 手动填值即可。
const fs = require("fs");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variable.");
  process.exit(1);
}

const content = `window.IFVG_CONFIG = ${JSON.stringify({ url, key }, null, 2)};\n`;
fs.writeFileSync(require("path").join(__dirname, "config.js"), content, "utf8");
console.log("config.js generated.");

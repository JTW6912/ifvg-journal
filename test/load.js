// 把 i18n.js 和 src/ 里挑出来的文件加载进一个隔离的 vm 上下文（和浏览器里一样是同一个全局作用域），
// 用来测那些不碰 DOM 的纯函数。顶层 const/let 不会挂到 globalThis 上，所以用 run() 在上下文里取值。
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const noop = () => {};

function makeContext(files, overrides) {
  const storage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
  const el = () => ({ addEventListener: noop, style: {}, classList: { add: noop, remove: noop }, dataset: {} });
  const sandbox = {
    console,
    window: { addEventListener: noop },
    localStorage: storage(),
    sessionStorage: storage(),
    navigator: { language: "zh-CN" },
    document: { documentElement: { dataset: {}, lang: "" }, addEventListener: noop, getElementById: () => null, createElement: el, body: el() },
    supabase: { createClient: () => ({}) },
    setTimeout, clearTimeout,
    ...overrides,
  };
  sandbox.window.IFVG_CONFIG = { url: "", key: "" };
  vm.createContext(sandbox);
  // 浏览器里 app.js 是一整个脚本，函数声明会提升到整个文件（03-state 顶层就在调 07 里的函数），
  // 所以这里也拼成一个脚本再跑，不能一个文件一个文件地 runInContext
  const source = files.map((f) => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
  vm.runInContext(source, sandbox, { filename: "bundle" });
  return {
    sandbox,
    run: (code) => vm.runInContext(code, sandbox),
    // 往上下文里塞一个值并赋给某个顶层变量：set("schema", [...])
    set(name, value) { sandbox.__v = JSON.parse(JSON.stringify(value)); vm.runInContext(`${name} = __v`, sandbox); },
  };
}

// 全部源码，只去掉 16-init（它一加载就会跑 bootstrapAuth + render）
const ENGINE_FILES = [
  "i18n.js",
  ...fs.readdirSync(path.join(ROOT, "src")).filter((f) => f.endsWith(".js") && !f.startsWith("16-")).sort().map((f) => "src/" + f),
];

module.exports = { makeContext, ENGINE_FILES };

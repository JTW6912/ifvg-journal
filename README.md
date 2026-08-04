# IFVG Trade Journal

多用户交易日记网页应用。自定义记录字段、区分回测/实盘、统计分析、月历查看交易分布。管理员后台可管理用户、只读查看任意用户数据。

## 技术栈

- 前端：纯静态文件（`index.html` + `style.css` + `app.js`），无框架、无构建步骤
- 后端：[Supabase](https://supabase.com)（Postgres + Auth），前端直接调用 Supabase JS client
- 部署：任意静态托管均可（Vercel / Netlify / GitHub Pages 等）

## 本地运行 / 部署

1. 复制 `config.example.js` 为 `config.js`
2. 在 [Supabase 后台](https://supabase.com/dashboard) → Settings → API，把 Project URL 和 anon/publishable key 填进 `config.js`
3. 用任意静态服务器打开 `index.html` 即可（例如 VS Code 的 Live Server，或 `python -m http.server`）
4. 数据库表结构、RLS 策略、迁移方式见 [DATABASE.md](DATABASE.md)（如果仓库里有）或找项目维护者要 SQL 初始化脚本

`config.js` 已被 `.gitignore` 排除，不会提交到仓库——每个部署者用自己的 Supabase 项目，互不影响。

## 安全说明

- `config.js` 里的 anon/publishable key 设计上就是可以公开的（Supabase 官方文档也是这么说的），真正的访问控制由数据库的 Row Level Security（RLS）策略负责，不是靠隐藏这个 key。
- 千万不要把 Supabase 的 `service_role` / secret key 放进任何前端代码，那个 key 能绕过所有 RLS。

## License

未附带开源许可证，默认保留所有权利。

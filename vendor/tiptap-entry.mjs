// 复盘编辑器用到的 Tiptap 全家桶，打成一个同源的 ESM 文件（vendor/tiptap.js）。
// app.js 在第一次打开编辑器时才 import() 它，平时不占首屏。
//
// 为什么不直接走 CDN：Tiptap 拆成二十几个包，esm.sh 那种按包加载要串起几十个请求，
// 而且各包必须共用同一份 prosemirror，版本稍微错开就会出现
// 「Can not convert <> to a Fragment」这种很难查的错。打成一个文件、锁死版本最省心。
//
// 重新生成（所有 @tiptap 包必须同一个版本，升级时一起改）：
//   mkdir tt && cd tt && npm init -y
//   npm i esbuild @tiptap/core@3.31.3 @tiptap/pm@3.31.3 @tiptap/starter-kit@3.31.3 \
//     @tiptap/extension-list@3.31.3 @tiptap/extension-table@3.31.3 \
//     @tiptap/extensions@3.31.3 @tiptap/extension-image@3.31.3
//   cp <项目>/vendor/tiptap-entry.mjs entry.mjs
//   npx esbuild entry.mjs --bundle --format=esm --minify --legal-comments=none \
//     --banner:js="// Tiptap 3.31.3 + ProseMirror (MIT). Generated from vendor/tiptap-entry.mjs, do not edit." \
//     --outfile=<项目>/vendor/tiptap.js
// 升级完记得把 app.js 里 TIPTAP_URL 的 ?v= 一起改掉，否则浏览器会继续用缓存里的旧版。
export { Editor, Node, Mark, Extension, mergeAttributes, InputRule, nodeInputRule, markInputRule } from "@tiptap/core";
export { StarterKit } from "@tiptap/starter-kit";
export { TaskList, TaskItem, ListItem } from "@tiptap/extension-list";
export { Blockquote } from "@tiptap/extension-blockquote";
export { Image } from "@tiptap/extension-image";
export { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
export { Placeholder } from "@tiptap/extensions";
export { Plugin, PluginKey, NodeSelection, TextSelection } from "@tiptap/pm/state";

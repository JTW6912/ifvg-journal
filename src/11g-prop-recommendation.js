/* 推荐语：受限的轻量文本格式，不使用完整复盘 Markdown（不加载图片、链接或私人交易引用）。
   HTML路径先esc()，再生成受限文本标签；[[icon:ID]]仅映射固定可信SVG，不接受HTML。 */
function propReviewInline(text, plain, depth = 0) {
  if (depth >= 4) return text;
  return text.replace(/(\*\*|==)([^\n]+?)\1/g, (match, token, inner) => {
    const content = propReviewInline(inner, plain, depth + 1);
    const tag = token === "**" ? "strong" : "mark";
    return plain ? content : `<${tag}>${content}</${tag}>`;
  });
}
function propReviewHtml(value) {
  const lines = esc(String(value || "")).replace(/\r\n?/g, "\n").split("\n");
  const bullet = (line) => line.match(/^\s*[-•]\s+(.*)$/);
  const inline = (line) => propReviewIcons(propReviewInline(line, false));
  let html = "", i = 0;
  while (i < lines.length) {
    if (!lines[i].trim()) { i++; continue; }
    const list = !!bullet(lines[i]), block = [];
    while (i < lines.length && lines[i].trim() && !!bullet(lines[i]) === list) {
      block.push(inline(list ? bullet(lines[i])[1] : lines[i])); i++;
    }
    html += list ? `<ul>${block.map((line) => `<li>${line}</li>`).join("")}</ul>` : `<p>${block.join("<br>")}</p>`;
  }
  return html;
}
/* 只返回纯文本；放回 HTML 的调用者仍须 esc()。用于经典卡片和管理列表的短说明。 */
function propReviewPlainText(value) {
  return propReviewIcons(propReviewInline(String(value || "").replace(/\r\n?/g, "\n"), true), true).replace(/^\s*[-•]\s+/gm, "• ");
}

/* 格式编辑是纯字符串变换，便于覆盖选区边界和不丢字的回归测试。 */
function propReviewFormatEdit(value, start, end, kind) {
  value = String(value || "");
  start = Math.max(0, Math.min(value.length, start));
  end = Math.max(start, Math.min(value.length, end));
  let from = start, to = end, text = value.slice(start, end), inset = 0;
  if (kind === "list") {
    from = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    if (start === 0) from = 0;
    const next = value.indexOf("\n", end);
    to = end > start && value[end - 1] === "\n" ? end - 1 : next < 0 ? value.length : next;
    const lines = value.slice(from, to).split("\n");
    const remove = lines.filter((line) => line.trim()).length > 0 && lines.filter((line) => line.trim()).every((line) => /^\s*[-•]\s+/.test(line));
    text = lines.map((line) => {
      if (remove) return line.replace(/^\s*[-•]\s+/, "");
      if (!line.trim() && lines.length > 1) return line;
      return /^\s*[-•]\s+/.test(line) ? line : "- " + (line || T("prop.review.insertText"));
    }).join("\n");
  } else if (kind === "bold" || kind === "highlight") {
    const token = kind === "bold" ? "**" : "==";
    if (start >= 2 && value.slice(start - 2, start) === token && value.slice(end, end + 2) === token) {
      from -= 2; to += 2;
    } else {
      const lines = (text || T("prop.review.insertText")).split("\n");
      const remove = lines.filter((line) => line.trim()).every((line) => line.startsWith(token) && line.endsWith(token) && line.length > 4);
      text = lines.map((line) => !line.trim() ? line : remove ? line.slice(2, -2) : token + line + token).join("\n");
      if (!remove && lines.length === 1) inset = 2;
    }
  }
  return { value: value.slice(0, from) + text + value.slice(to), from, to, text, selectionStart: from + inset, selectionEnd: from + text.length - inset };
}
function propReviewEditorHtml(value) {
  const text = String(value || "");
  return `<div class="field propReviewEditor">
    <div class="propReviewEditorHead"><label class="fieldLabel" for="propFirmReview">${esc(T("prop.adm.review"))}</label><span class="propHint" id="propFirmReviewCount">${esc(T("prop.review.characters", { n: text.length }))}</span></div>
    <div class="propReviewToolbar" role="group" aria-label="${esc(T("prop.review.formatTools"))}">
      ${["bold", "highlight", "list"].map((kind) => `<button type="button" class="btn btn-sm" data-action="prop-adm-review-format" data-format="${kind}">${esc(T("prop.review." + kind))}</button>`).join("")}
    </div>
    ${isModernLayout() ? propContentToolbarHtml("propFirmReview", { key: !!propFirmEditor }) : ""}
    <textarea class="input propReviewInput" id="propFirmReview" data-prop-field="review" rows="6" aria-describedby="propFirmReviewHint">${esc(text)}</textarea>
    <div class="propHint" id="propFirmReviewHint">${esc(T("prop.review.editHint"))}</div>
    <div class="propReviewPreview"><div class="propReviewPreviewLabel">${esc(T("prop.review.preview"))}</div>
      <div class="propRichText" id="propFirmReviewPreview" tabindex="0" role="region" aria-label="${esc(T("prop.review.preview"))}"${isModernLayout() ? " data-prop-copy-protected" : ""}>${propReviewHtml(text) || `<p class="propReviewEmpty">${esc(T("prop.cat.noReview"))}</p>`}</div>
    </div>
  </div>`;
}
function propUpdateReviewPreview() {
  const input = document.getElementById("propFirmReview"), m = propFirmEditContext(input);
  if (!input || !m || m.busy || !propIsAdmin()) return;
  m.draft.review = input.value;
  propFirmEditorChanged();
  const preview = document.getElementById("propFirmReviewPreview"), count = document.getElementById("propFirmReviewCount");
  if (preview) preview.innerHTML = propReviewHtml(input.value) || `<p class="propReviewEmpty">${esc(T("prop.cat.noReview"))}</p>`;
  if (count) count.textContent = T("prop.review.characters", { n: input.value.length });
}
function propApplyReviewFormat(kind) {
  const input = document.getElementById("propFirmReview"), m = propFirmEditContext(input);
  if (!input || !m || m.busy || !propIsAdmin()) return;
  const edit = propReviewFormatEdit(input.value, input.selectionStart, input.selectionEnd, kind);
  input.setRangeText(edit.text, edit.from, edit.to, "select");
  input.focus({ preventScroll: true });
  input.setSelectionRange(edit.selectionStart, edit.selectionEnd);
  propUpdateReviewPreview();
}
/* 不重建弹窗：打字只更新预览，点击格式按钮也不会丢掉其他输入或滚动位置。 */
document.addEventListener("input", (e) => { if (e.target.id === "propFirmReview") propUpdateReviewPreview(); });
document.addEventListener("change", (e) => { if (e.target.id === "propFirmReview") propUpdateReviewPreview(); });
document.addEventListener("mousedown", (e) => {
  if (e.target.closest('[data-action="prop-adm-review-format"]')) e.preventDefault();
});

/* 按真实排版高度决定是否需要展开；展开状态只保留在当前会话，不写用户配置。 */
let propReviewObserver = null;
function propMeasureReviewBody(body) {
  if (!body.isConnected) return;
  const id = body.dataset.propReviewId, notes = body.dataset.propPreviewKind === "notes";
  const expanded = (notes ? propFirmNotesExpanded : propReviewExpanded).has(id);
  // 用折叠后的真实高度判断溢出，避免段落间距被误算成额外文字行。
  body.classList.remove("isExpanded");
  const overflow = body.scrollHeight > body.clientHeight + 1;
  body.classList.toggle("isExpanded", expanded);
  body.classList.toggle("isClamped", overflow && !expanded);
  const toggle = body.parentElement.querySelector(".propReviewToggle");
  if (toggle) {
    toggle.hidden = !overflow;
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.textContent = T(notes ? (expanded ? "prop.firmInfo.notesCollapse" : "prop.firmInfo.notesExpand") : (expanded ? "prop.review.collapse" : "prop.review.expand"));
  }
}
function propSyncReviewCards() {
  if (propReviewObserver) propReviewObserver.disconnect();
  if (!document.querySelectorAll) return;
  const bodies = [...document.querySelectorAll("[data-prop-review-id]")];
  bodies.forEach(propMeasureReviewBody);
  if (typeof ResizeObserver !== "undefined") {
    if (!propReviewObserver) propReviewObserver = new ResizeObserver((entries) => entries.forEach((entry) => propMeasureReviewBody(entry.target)));
    bodies.forEach((body) => propReviewObserver.observe(body));
  }
  if (document.fonts && bodies.length) document.fonts.ready.then(() => bodies.forEach(propMeasureReviewBody));
}
function propToggleReview(id, kind = "review") {
  const state = kind === "notes" ? propFirmNotesExpanded : propReviewExpanded;
  if (state.has(id)) state.delete(id); else state.add(id);
  document.querySelectorAll("[data-prop-review-id]").forEach((body) => {
    if (body.dataset.propReviewId !== id || (body.dataset.propPreviewKind || "review") !== kind) return;
    propMeasureReviewBody(body);
    const toggle = body.parentElement.querySelector(".propReviewToggle");
    if (!state.has(id) && toggle && toggle.getBoundingClientRect().top < 0) toggle.scrollIntoView({ block: "nearest" });
  });
}

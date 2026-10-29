/* 公共目录的展示配置，仍在prop_firms.data里。颜色只接受六位HEX，图标来自固定白名单。
   不执行用户HTML/CSS；复制限制只是界面措施，不是版权/数据访问控制。 */
const PROP_CONTENT_ICONS = ['star', 'alert', 'check', 'tag', 'shield', 'clock', 'chart', 'wallet', 'calendar'];
const PROP_PRESENTATION_PRESETS = {
  theme: null,
  gold: { border: '#e9b34b', fill: '#ffe2a1', button: '#9c6719' },
  sky: { border: '#7eafe8', fill: '#cce5ff', button: '#2463b4' },
  violet: { border: '#ac8be0', fill: '#e5d5ff', button: '#7143b7' },
  mint: { border: '#62bca0', fill: '#c4f0df', button: '#187a60' },
  rose: { border: '#e392a4', fill: '#ffdae3', button: '#a83b60' },
  custom: null,
};
function propPresentationObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
function propPresentationClone(v) { return v == null ? {} : JSON.parse(JSON.stringify(v)); }
function propHexColor(v) { return typeof v === 'string' && /^#[a-f\d]{6}$/i.test(v) ? v : ''; }
function propPresentationStyleValid(v) {
  if (v == null) return true;
  if (!propPresentationObject(v)) return false;
  if (v.preset !== undefined && !Object.prototype.hasOwnProperty.call(PROP_PRESENTATION_PRESETS, v.preset)) return false;
  return ['border', 'fill', 'button'].every(k => v[k] === undefined || v[k] === '' || !!propHexColor(v[k]));
}
function propPresentationColors(style) {
  const s = propPresentationObject(style) ? style : {};
  const preset = Object.prototype.hasOwnProperty.call(PROP_PRESENTATION_PRESETS, s.preset) ? s.preset : 'theme';
  const colors = { ...(PROP_PRESENTATION_PRESETS[preset] || {}) };
  ['border', 'fill', 'button'].forEach(k => { if (propHexColor(s[k])) colors[k] = s[k]; });
  return colors;
}
function propButtonInk(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return c[0] * .2126 + c[1] * .7152 + c[2] * .0722 > .179 ? '#111111' : '#ffffff';
}
function propPresentationStyleAttr(style) {
  const c = propPresentationColors(style), parts = [];
  if (c.border) parts.push('--propEdge:' + c.border);
  if (c.fill) parts.push('--propTint:' + c.fill);
  if (c.button) parts.push('--propBtn:' + c.button, '--propBtnInk:' + propButtonInk(c.button));
  return parts.length ? ` style="${parts.join(';')}"` : '';
}
function propContentIconHtml(icon) {
  if (!PROP_CONTENT_ICONS.includes(icon)) return '';
  return `<span class="propInlineIcon" aria-hidden="true">${icon === 'star' ? ICONS.starFill : ICONS[icon]}</span>`;
}
function propReviewIcons(text, plain = false) {
  return text.replace(/\[\[icon:([a-z]+)\]\]/g, (full, id) => PROP_CONTENT_ICONS.includes(id) ? plain ? '' : propContentIconHtml(id) : full);
}
function propPromoUrl(value) {
  if (typeof value !== 'string' || !value.trim() || !value.startsWith('https://')) return '';
  return propIconUrl(value); // 同一公开HTTPS安全边界，但不允许本地路径作外部领取链接。
}
function propPresentationTextValid(value, max) { return value === undefined || (typeof value === 'string' && value.length <= max); }
function propCalloutValid(c) {
  return propPresentationObject(c) && typeof c.text === 'string' && c.text.trim().length > 0 && c.text.length <= 8000
    && (c.icon === undefined || c.icon === '' || PROP_CONTENT_ICONS.includes(c.icon)) && propPresentationStyleValid(c.style);
}
function propValidatePresentation(firm) {
  const errors = [], key = firm?.keySentence, promo = firm?.promo;
  if (key != null && (!propPresentationObject(key) || !propPresentationTextValid(key.text, 800)
    || (key.icon !== undefined && key.icon !== '' && !PROP_CONTENT_ICONS.includes(key.icon)) || !propPresentationStyleValid(key.style))) errors.push(T('prop.design.invalidKey'));
  if (promo != null && (!propPresentationObject(promo) || !propPresentationTextValid(promo.code, 100)
    || !propPresentationTextValid(promo.buttonText, 80) || !propPresentationTextValid(promo.text, Infinity)
    || (promo.hot !== undefined && typeof promo.hot !== 'boolean')
    || (promo.icon !== undefined && promo.icon !== '' && !PROP_CONTENT_ICONS.includes(promo.icon))
    || (promo.url !== undefined && promo.url !== '' && !propPromoUrl(promo.url)) || !propPresentationStyleValid(promo.style))) errors.push(T('prop.design.invalidPromo'));
  return errors;
}
function propUpdatePresentationValid(u) {
  if (!propPresentationStyleValid(u.style)) return false;
  if (u.callouts !== undefined && !Array.isArray(u.callouts)) return false;
  const boxes = u.callouts || [], ids = new Set();
  if (boxes.length > 20) return false;
  for (const b of boxes) {
    if (!propCalloutValid(b) || typeof b.id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(b.id) || ids.has(b.id)) return false;
    ids.add(b.id);
  }
  const refs = [...String(u.text || '').matchAll(/\[\[box:([^\]\n]*)\]\]/g)].map(m => m[1]);
  if (refs.length !== new Set(refs).size || refs.some(id => !ids.has(id)) || boxes.some(b => !refs.includes(b.id) || /\[\[box:/.test(b.text))) return false;
  // 框占一整行，避免在列表/加粗内部生成非法块级HTML。
  return String(u.text || '').split(/\r?\n/).every(line => !line.includes('[[box:') || /^\s*\[\[box:[A-Za-z0-9_-]{1,80}\]\]\s*$/.test(line));
}
function propKeySentenceHtml(firm) {
  const key = firm?.keySentence;
  if (!propPresentationObject(key) || typeof key.text !== 'string' || !key.text.trim()) return '';
  return `<div class="propKeySentence propGlassSurface" data-prop-copy-protected${propPresentationStyleAttr(key.style)}>${propContentIconHtml(key.icon === undefined ? 'star' : key.icon)}<div class="propRichText">${propReviewHtml(key.text)}</div></div>`;
}
function propCouponHtml(firm) {
  const p = propPresentationObject(firm?.promo) ? firm.promo : {};
  const code = typeof p.code === 'string' ? p.code : '', url = propPromoUrl(p.url);
  return `<aside class="propRecommendDeal propCoupon propGlassSurface" data-prop-copy-protected role="note" aria-label="${esc(T('prop.adm.promoDiscount'))}"${propPresentationStyleAttr(p.style)}>
    <div class="propRecommendDealHead"><span class="propRecommendLabel">${propContentIconHtml(p.icon === undefined ? 'tag' : p.icon)}${esc(T('prop.adm.promoDiscount'))}${p.hot === true ? '<span class="propCouponHot">HOT</span>' : ''}</span>${p.discount ? `<strong class="propRecommendDiscount">${esc(T('prop.cat.off', { v: p.discount }))}</strong>` : ''}</div>
    ${p.text ? `<div class="propCouponDescription propRecommendDealText propRichText">${propReviewHtml(p.text)}</div>` : !p.discount && !code && !url ? `<span class="propRecommendText isEmpty">${esc(T('prop.cat.noPromo'))}</span>` : ''}
    ${code || url ? `<div class="propCouponActions">${code ? `<button type="button" class="propCouponCode" data-action="prop-copy-coupon" data-code="${esc(code)}" aria-label="${esc(T('prop.design.copyCodeValue', { code }))}" title="${esc(T('prop.design.copyCode'))}">${propContentIconHtml('tag')}<code>${esc(code)}</code><span class="propCouponCopyMark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="7" width="12" height="15" rx="2"/><path d="M16 7V4a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h3"/></svg></span></button>` : ''}${url ? `<a class="propCouponLink" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(p.buttonText || T('prop.design.claim'))}<span aria-hidden="true">→</span></a>` : ''}</div>` : ''}
  </aside>`;
}
function propCalloutHtml(box) {
  return `<div class="propCallout propGlassSurface"${propPresentationStyleAttr(box.style)}>${propContentIconHtml(box.icon === undefined ? 'alert' : box.icon)}<div class="propRichText">${propReviewHtml(box.text)}</div></div>`;
}
function propUpdateBodyHtml(update) {
  const text = typeof update?.text === 'string' ? update.text : '', boxes = Array.isArray(update?.callouts) ? update.callouts : [];
  const rendered = new Set(), parts = [], lines = text.replace(/\r\n?/g, '\n').split('\n'); let normal = [];
  const flush = () => { if (normal.length) { parts.push(propReviewHtml(normal.join('\n'))); normal = []; } };
  lines.forEach(line => {
    const id = line.match(/^\s*\[\[box:([A-Za-z0-9_-]{1,80})\]\]\s*$/)?.[1], box = boxes.find(b => b?.id === id && typeof b.text === 'string');
    if (box) { flush(); parts.push(propCalloutHtml(box)); rendered.add(id); } else normal.push(line);
  });
  flush();
  // 非法旧导入不能在显示层吞掉未引用文字，保存校验仍明确报错。
  boxes.filter(b => b && typeof b.text === 'string' && !rendered.has(b.id)).forEach(b => parts.push(propCalloutHtml(b)));
  return parts.join('');
}
function propUpdateCardHtml(update, compact = false) {
  const date = propFirmUpdateDateOk(update.date) ? update.date : '', type = PROP_FIRM_UPDATE_TYPES.includes(update.type) ? update.type : 'notice';
  return `<div class="propUpdateGlass propGlassSurface" data-prop-copy-protected${propPresentationStyleAttr(update.style)}><div class="propFirmUpdateMeta"><time${date ? ` datetime="${date}"` : ''}>${esc(date || T('prop.updates.noDate'))}</time><span class="propFirmUpdateType">${esc(T('prop.updates.type.' + type))}</span></div>
    <div class="propFirmUpdateText propRichText${compact ? ' propUpdateCompact' : ''}">${propUpdateBodyHtml(update) || `<p class="propReviewEmpty">${esc(T('prop.updates.noText'))}</p>`}</div></div>`;
}
function propCalloutInsert(update, start, end, id) {
  const text = String(update.text || ''), boxes = Array.isArray(update.callouts) ? update.callouts.map(b => ({ ...b })) : [];
  start = Math.max(0, Math.min(text.length, start)); end = Math.max(start, Math.min(text.length, end));
  for (let n = 0; n < 4; n++) {
    const token = ['**', '=='].find(t => start >= 2 && text.slice(start - 2, start) === t && text.slice(end, end + 2) === t);
    if (!token) break; start -= 2; end += 2;
  }
  const intersects = [...text.matchAll(/\[\[box:[^\]\n]*\]\]/g)].some(m => start < m.index + m[0].length && end > m.index || start === end && start > m.index && start < m.index + m[0].length);
  if (intersects) return null;
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id) || boxes.length >= 20 || boxes.some(b => b.id === id) || /\[\[box:/.test(text.slice(start, end))) return null;
  const box = { id, text: text.slice(start, end) || T('prop.design.calloutPlaceholder'), icon: 'alert', style: { preset: 'theme' } };
  return { ...update, text: text.slice(0, start) + '\n\n[[box:' + id + ']]\n\n' + text.slice(end), callouts: [...boxes, box] };
}
function propCalloutRemove(update, id) {
  const boxes = Array.isArray(update.callouts) ? update.callouts : [], box = boxes.find(b => b.id === id);
  if (!box) return update;
  const text = String(update.text || ''), token = '[[box:' + id + ']]';
  return { ...update, text: text.includes(token) ? text.split(token).join(String(box.text || '')) : text + '\n\n' + String(box.text || ''), callouts: boxes.filter(b => b.id !== id) };
}
function propDraftPresentation(d) {
  return { keySentence: d.keySentence, promo: d.promoDesign != null && !propPresentationObject(d.promoDesign) ? d.promoDesign : { ...(d.promoDesign || {}), discount: d.promoDiscount, text: d.promoText } };
}
async function propCopyCoupon(code) {
  if (typeof code !== 'string' || !code || code.length > 100) return false;
  try { await navigator.clipboard.writeText(code); propToast(T('prop.design.copied')); return true; }
  catch (_) { propToast(T('prop.design.copyFailed')); return false; }
}
document.addEventListener('click', e => {
  const button = e.target.closest?.('[data-action="prop-copy-coupon"]');
  if (button) propCopyCoupon(button.dataset.code);
});
function propCopyProtected(e) {
  const editable = n => { const el = n?.nodeType === 3 ? n.parentElement : n; return !!el?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[data-prop-copy-exempt]'); };
  if (editable(e.target) || editable(document.activeElement)) return false;
  const protectedNode = n => { const el = n?.nodeType === 3 ? n.parentElement : n; return el?.closest?.('[data-prop-copy-protected]'); };
  const selection = window.getSelection?.();
  if (protectedNode(e.target) || selection && !selection.isCollapsed && (protectedNode(selection.anchorNode) || protectedNode(selection.focusNode))) return true;
  if (selection && !selection.isCollapsed && selection.rangeCount) {
    const range = selection.getRangeAt(0);
    return [...document.querySelectorAll('[data-prop-copy-protected]')].some(el => { try { return (!el.getClientRects || el.getClientRects().length > 0) && range.intersectsNode(el); } catch (_) { return false; } });
  }
  return false;
}
document.addEventListener('copy', e => { if (propCopyProtected(e)) { e.preventDefault(); e.clipboardData?.setData('text/plain', ''); } });
document.addEventListener('cut', e => { if (propCopyProtected(e)) { e.preventDefault(); e.clipboardData?.setData('text/plain', ''); } });
document.addEventListener('dragstart', e => {
  if (e.target.closest?.('[data-prop-copy-protected]') && !e.target.closest?.('a,button,input,textarea,[contenteditable="true"]')) e.preventDefault();
});

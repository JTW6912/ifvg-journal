/* 共享选项图标：仅公共目录元数据，不读取个人交易/证件，不复制开发包的非官方品牌重绘。
   选项原始文本仍存公司数组；图标用「字段 + 规范化名称」匹配。只渲染可信内置SVG或安全<img>。 */
const PROP_OPTION_GLYPHS = {
  monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  chart: '<path d="M3 3v18h18M6 15l4-5 4 3 6-8"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18"/>',
  bank: '<path d="M3 9l9-6 9 6H3zM4 21h16M6 10v7M12 10v7M18 10v7"/>',
  wallet: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8h18M21 12h-6v5h6"/><path d="M17 14.5h.01"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M15 8h-4a2 2 0 000 4h2a2 2 0 010 4H9M12 6v12"/>',
  exchange: '<path d="M3 7h17l-4-4M21 17H4l4 4M20 7l-4 4M4 17l4-4"/>',
  id: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="10" r="2"/><path d="M5 16c0-4 6-4 6 0M14 9h4M14 13h4"/>',
  passport: '<rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="10" r="4"/><path d="M8 10h8M12 6v8M9 18h6"/>',
  license: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M5 14l1-4h5l1 4M5 14h7M6 14v2M11 14v2M15 9h4M15 13h4"/>',
  home: '<path d="M3 10l9-7 9 7M5 9v12h14V9M10 21v-7h4v7"/>',
  face: '<path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5M8 9h.01M16 9h.01M8 15q4 4 8 0M12 9v4"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3"/>',
  shield: '<path d="M12 2l9 4v6c0 5-9 10-9 10S3 17 3 12V6zM8 12l3 3 5-6"/>',
  tag: '<path d="M3 3h9l9 9-9 9-9-9z"/><circle cx="8" cy="8" r="1"/>',
  puzzle: '<path d="M4 4h6c-2 6 6 6 4 0h6v6c-6-2-6 6 0 4v6h-6c2-6-6-6-4 0H4v-6c6 2 6-6 0-4z"/>',
  document: '<path d="M5 2h9l5 5v15H5zM14 2v6h5M8 12h8M8 16h8"/>',
};
const PROP_ICON_DEFAULTS = new Map([
  ['payoutMethods:bank transfer', 'bank'], ['paymentMethods:bank transfer', 'bank'],
  ['paymentMethods:cryptocurrency', 'coin'], ['kycRequirements:national id', 'id'],
  ['kycRequirements:passport', 'passport'], ["kycRequirements:driver's license", 'license'],
  ['kycRequirements:proof of address', 'home'], ['kycRequirements:selfie verification', 'face'],
  ['kycRequirements:video verification', 'video'], ['kycRequirements:before payout', 'shield'],
]);
function propIconKey(field, value) {
  if (!PROP_FIRM_CHOICE_FIELDS.includes(field) || typeof value !== 'string' || !value.trim()) return '';
  let key = value.trim().toLowerCase();
  for (const preset of PROP_FIRM_CHOICE_PRESETS[field]) {
    const labelKey = PROP_FIRM_CHOICE_LABELS.get(field + ':' + preset);
    const aliases = [preset, ...(labelKey ? ['zh', 'en'].map(l => I18N[l]['prop.firmInfo.option.' + labelKey]) : [])];
    if (aliases.some(v => typeof v === 'string' && v.toLowerCase() === key)) { key = preset.toLowerCase(); break; }
  }
  return field + ':' + key;
}
function propIconUrl(raw) {
  if (typeof raw !== 'string') return '';
  const value = raw.trim();
  if (!value || value.length > 2048 || /[\s<>"'\\\u0000-\u001f\u007f]/.test(value)) return '';
  if (/^\/img\/prop(?:-options)?\/[a-zA-Z0-9_/-]+\.(?:svg|webp|png|jpe?g)$/.test(value)) return value;
  if (!value.startsWith('https://')) return '';
  try {
    const u = new URL(value);
    if (u.username || u.password || (u.port && u.port !== '443')) return '';
    if (!/^(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/i.test(u.hostname)) return '';
    if (/\.(?:localhost|local|internal|lan|invalid|test)$/i.test(u.hostname)) return '';
    return value;
  } catch (_) { return ''; }
}
function propIconRow(field, label, kind, value) {
  const id = propIconKey(field, label);
  if (!id || label.trim().length > 512 || !['default', 'none', 'builtin', 'url'].includes(kind)) return null;
  value = typeof value === 'string' ? value.trim() : '';
  if (kind === 'builtin' && !Object.prototype.hasOwnProperty.call(PROP_OPTION_GLYPHS, value)) return null;
  if (kind === 'url' && !propIconUrl(value)) return null;
  if (kind === 'none' || kind === 'default') value = '';
  return { id, field, option_key: id.slice(field.length + 1), label: label.trim(), kind, value };
}
function propValidateOptionIcons(rows) {
  if (!Array.isArray(rows) || rows.length > 5000) return false;
  const ids = new Set();
  return rows.every(r => {
    if (!r || typeof r !== 'object') return false;
    const clean = propIconRow(r.field, r.label, r.kind, r.value);
    if (!clean || (r.id !== undefined && r.id !== clean.id) || (r.option_key !== undefined && r.option_key !== clean.option_key) || ids.has(clean.id)) return false;
    ids.add(clean.id); return true;
  });
}
function propIconConfig(field, value, rows = propOptionIcons) {
  const id = propIconKey(field, value), stored = rows.find(r => r.id === id);
  if (stored) {
    const safe = propIconRow(stored.field, stored.label, stored.kind, stored.value);
    if (!safe || safe.id !== id) return { kind: 'none', value: '' };
    if (safe.kind !== 'default') return safe;
  }
  const glyph = PROP_ICON_DEFAULTS.get(id);
  return { kind: glyph ? 'builtin' : 'none', value: glyph || '' };
}
function propBuiltinIconHtml(id) {
  if (!Object.prototype.hasOwnProperty.call(PROP_OPTION_GLYPHS, id)) return '';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PROP_OPTION_GLYPHS[id]}</svg>`;
}
function propChoiceIconHtml(field, value, rows = propOptionIcons) {
  const icon = propIconConfig(field, value, rows);
  if (icon.kind === 'builtin') return `<span class="propOptionIcon" aria-hidden="true">${propBuiltinIconHtml(icon.value)}</span>`;
  if (icon.kind === 'url') return `<span class="propOptionIcon propOptionImage" aria-hidden="true"><img src="${esc(icon.value)}" alt="" referrerpolicy="no-referrer" loading="lazy" decoding="async"></span>`;
  return '';
}
function propOptionIconExport() {
  return propOptionIcons.map(r => ({ id: r.id, field: r.field, option_key: r.option_key, label: r.label, kind: r.kind, value: r.value }));
}
function propMergeIconRows(base, changed) {
  const map = new Map(base.map(r => [r.id, r]));
  changed.forEach(r => map.set(r.id, { ...r }));
  return [...map.values()];
}
async function propSaveFirmWithIcons(firm, changes, createOnly = false) {
  if (!propIsAdmin() || !sb || !session || !propValidateOptionIcons(changes)) return false;
  const owner = session.user.id;
  try {
    const { data, error } = await sb.rpc('prop_save_firm_with_icons', { firm: { ...propFirmRow(firm), create_only: !!createOnly }, icon_changes: changes });
    if (error) throw error;
    if (!data || !Array.isArray(data.icons)) throw new Error(T('prop.icons.invalidResponse'));
    if (session?.user?.id !== owner || !propIsAdmin()) return false;
    propOptionIcons = propMergeIconRows(propOptionIcons, data.icons);
    return true;
  } catch (error) {
    propError = noteDbError(error) || error?.code === 'PGRST202' ? T('error.dbOutdated')
      : error?.message === 'prop_icon_conflict' ? T('prop.icons.conflict')
      : error?.message === 'prop_firm_conflict' ? T('prop.editor.firmConflict') : T('prop.saveFailed', { msg: error?.message || String(error) });
    if (error?.code === 'PGRST202') dbOutdated = true;
    return false;
  }
}
// 外链图只作为图片加载，不注入其SVG/HTML；失败隐藏装饰，文字标签始终保留。
document.addEventListener('error', e => {
  const img = e.target;
  if (img?.tagName === 'IMG' && img.closest?.('.propOptionImage')) img.parentElement.hidden = true;
}, true);

// Isolated field help. A shared, non-interactive tooltip is associated with
// only the currently active trigger; no data access or persistence.
(() => {
  const tip = document.getElementById('metricTooltip');
  const descriptions = {
    net: '所选时间范围内的已到账出金，减去投入（已扣除退款）。',
    spent: '所选时间范围内的费用合计，已扣除退款。',
    received: '仅统计所选时间范围内已到账的出金，不含待到账金额。',
    roi: '净收益 ÷ 投入。所选范围没有投入时显示“—”。',
    trend: '从所选区间起点0按日累计净收支，曲线终点与净收益一致。',
    accounts: '进行中包含考核中、待激活和资金账号。这里展示当前状态，不回放历史状态。',
  };
  let active = null, pending = null, hovered = null, overTip = false;
  let pinned = false, dismissed = null, openTimer = 0, closeTimer = 0;
  const buttons = [...document.querySelectorAll('[data-help]')];

  function hide(suppress = false) {
    clearTimeout(openTimer); clearTimeout(closeTimer);
    if (suppress) dismissed = active || pending;
    if (active) { active.removeAttribute('aria-describedby'); active.classList.remove('is-showing'); }
    active = null; pending = null; pinned = false; overTip = false;
    tip.hidden = true;
    delete tip.dataset.field;
  }
  function position() {
    if (!active || tip.hidden) return;
    const r = active.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) { hide(); return; }
    const w = tip.offsetWidth, h = tip.offsetHeight, gap = 8;
    const left = Math.max(12, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 12));
    const above = r.top - h - gap >= 12;
    const top = above ? r.top - h - gap : Math.min(r.bottom + gap, innerHeight - h - 12);
    tip.dataset.side = above ? 'top' : 'bottom';
    tip.style.left = left + 'px';
    tip.style.top = Math.max(12, top) + 'px';
    tip.style.setProperty('--tip-arrow-x', Math.max(12, Math.min(r.left + r.width / 2 - left, w - 12)) + 'px');
  }
  function show(button, pin = false) {
    const message = descriptions[button.dataset.help];
    if (!message || dismissed === button) return;
    clearTimeout(openTimer); clearTimeout(closeTimer); pending = null;
    if (active && active !== button) { active.removeAttribute('aria-describedby'); active.classList.remove('is-showing'); }
    active = button; pinned = pin;
    tip.textContent = message; tip.dataset.field = button.dataset.help; tip.hidden = false;
    button.setAttribute('aria-describedby', tip.id); button.classList.add('is-showing');
    position();
  }
  function heldOpen() {
    return active && (pinned || hovered === active || overTip ||
      (document.activeElement === active && active.matches(':focus-visible')));
  }
  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => { if (!heldOpen()) hide(); }, 160);
  }
  for (const button of buttons) {
    button.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      hovered = button; clearTimeout(closeTimer);
      if (dismissed === button) return;
      if (active === button) return;
      clearTimeout(openTimer); pending = button;
      openTimer = setTimeout(() => { if (hovered === button) show(button); }, 180);
    });
    button.addEventListener('pointerleave', () => {
      if (hovered === button) hovered = null;
      if (dismissed === button) dismissed = null;
      if (pending === button) { clearTimeout(openTimer); pending = null; }
      scheduleClose();
    });
    button.addEventListener('focus', () => {
      if (button.matches(':focus-visible')) { dismissed = null; show(button); }
    });
    button.addEventListener('blur', () => {
      if (dismissed === button) dismissed = null;
      if (active === button) { pinned = false; scheduleClose(); }
    });
    button.addEventListener('click', () => {
      if (active === button && pinned) hide(true);
      else { dismissed = null; show(button, true); }
    });
  }
  tip.addEventListener('pointerenter', () => { overTip = true; clearTimeout(closeTimer); });
  tip.addEventListener('pointerleave', () => { overTip = false; scheduleClose(); });
  document.addEventListener('pointerdown', event => {
    if ((active || pending) && !(active || pending).contains(event.target) && !tip.contains(event.target)) hide();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && (active || pending)) { event.preventDefault(); hide(true); }
  });
  document.addEventListener('preview:overlay-open', () => hide());
  addEventListener('resize', position);
  addEventListener('scroll', event => { if (!(event.target instanceof Node) || !tip.contains(event.target)) position(); }, true);
})();

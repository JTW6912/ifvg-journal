/* Prop 历史修正：纯检查/草稿/差异模型，与显式 owner-only 保存分开。
   诊断认可基于资金日期的考核通过证据，但不补写/排序/去重历史，不调用状态、续费或流水写入。 */
function propHistoryClone(value) { return JSON.parse(JSON.stringify(value)); }
function propHistoryObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function propHistoryJson(value) {
  if (Array.isArray(value)) return "[" + value.map(propHistoryJson).join(",") + "]";
  if (propHistoryObject(value)) return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + propHistoryJson(value[k])).join(",") + "}";
  return JSON.stringify(value);
}
function propHistoryDay(day) { return propOverviewDay(day) !== null && day >= "1990-01-01" && day <= "2099-12-31"; }
/* 仅内存证据：兼容旧消费者的 [] 不等于原始根结构有效，不能拿它覆盖原记录。 */
function propHistoryAccountFromRow(a) {
  const valid = Array.isArray(a.events);
  return { ...a, events: valid ? a.events : [], _historyInvalidRoot: !valid,
    ...(!valid ? { _historyRawEvents: a.events } : {}) };
}
function propHistoryIssues(a, entries = []) {
  const out = [], add = (code, level = "missing", index = null, extra = {}) => out.push({ code, level, index, ...extra });
  if (!propHistoryDay(a.bought_on)) add("purchaseDate");
  const invalidRoot = a._historyInvalidRoot || !Array.isArray(a.events);
  if (invalidRoot) add("invalidRoot", "blocked");
  const events = invalidRoot ? [] : a.events;
  let previous = null;
  events.forEach((e, index) => {
    const typeOk = propHistoryObject(e) && PROP_STATUSES.includes(e.to);
    const dateOk = propHistoryObject(e) && propHistoryDay(e.day);
    if (!typeOk) add("invalidType", "missing", index);
    if (!dateOk) add("invalidDate", "missing", index);
    if (dateOk) {
      if (propHistoryDay(a.bought_on) && e.day < a.bought_on) add("beforePurchase", "suspect", index);
      if (previous && e.day < previous) add("dateOrder", "suspect", index);
      previous = e.day;
    }
    if (typeOk && dateOk) {
      // 同日重置/重考是独立尝试；只有紧邻的同阶段同日记录提示核对，绝不自动合并。
      const prior = events[index - 1];
      if (prior?.to === e.to && prior.day === e.day) add("duplicate", "suspect", index);
    }
  });
  const own = entries.filter(e => e && e.account_id === a.id);
  own.forEach(e => { if (!propHistoryDay(e.day)) add("ledgerDate", "external", null, { entryId: e.id }); });
  if (!invalidRoot) {
    const has = to => events.some(e => e?.to === to && propHistoryDay(e.day));
    const paid = own.some(e => e.kind === "payout" && !e.pending && Number.isFinite(Number(e.amount)) && Number(e.amount) > 0 && propHistoryDay(e.day));
    const funded = ["funded", "blown"].includes(a.status) || has("funded") || paid || events.some(e => e?.to === "blown");
    if ((a.status === "passed" || (a.plan_snapshot?.type !== "instant" && funded)) && !propPassEvidence(a, propHistoryDay).days.length) add("missingPassed");
    if (funded && !has("funded")) add("missingFunded");
    if (a.status === "failed" && !has("failed")) add("missingFailed");
  }
  return out;
}
function propHistoryList(accounts, entries, tab = "pending", search = "") {
  const term = String(search).trim().toLocaleLowerCase();
  return accounts.map(account => ({ account, issues: propHistoryIssues(account, entries) }))
    .filter(row => (tab === "all" || row.issues.length) && (!term ||
      [row.account.id, row.account.nickname, row.account.firm_name, row.account.plan_name, row.account.group_name]
        .some(v => String(v || "").toLocaleLowerCase().includes(term))));
}
function propHistoryDraft(a) {
  const base = propHistoryClone(a);
  return { base, bought_on: a.bought_on, serial: 0, rows: (Array.isArray(a.events) ? a.events : []).map((value, source) =>
    ({ key: "original-" + source, source, value: propHistoryClone(value), removed: false })) };
}
/* 原有记录只能改 to/day。未知属性、未动的畸形成员和原记录次序均保留。
   删除使用 tombstone，不能靠缺失行隐式删除；新增记录必须明确指定插入位置。 */
function propHistoryPatch(d) {
  const fail = reason => ({ ok: false, reason, changes: [], removed: 0, changed: false });
  if (!d || !propHistoryObject(d.base) || d.base._historyInvalidRoot || !Array.isArray(d.base.events)) return fail("invalidRoot");
  if (!Array.isArray(d.rows)) return fail("invalidDraft");
  const purchaseChanged = d.bought_on !== d.base.bought_on;
  if (purchaseChanged && !propHistoryDay(d.bought_on)) return fail("invalidDate");
  const keys = new Set(), originals = new Set(), events = [], changes = [];
  let last = -1, removed = 0;
  if (purchaseChanged) changes.push({ kind: "purchase", before: d.base.bought_on, after: d.bought_on });
  for (const r of d.rows) {
    if (!r || typeof r.key !== "string" || !r.key || keys.has(r.key) || typeof r.removed !== "boolean") return fail("invalidDraft");
    keys.add(r.key);
    const added = r.source === null;
    if (!added) {
      if (!Number.isInteger(r.source) || r.source < 0 || r.source >= d.base.events.length || originals.has(r.source) || r.source <= last || r.key !== "original-" + r.source) return fail("invalidDraft");
      originals.add(r.source); last = r.source;
    }
    const before = added ? null : d.base.events[r.source];
    if (r.removed) {
      if (!added) { changes.push({ kind: "remove", key: r.key, before: propHistoryClone(before), after: null }); removed++; }
      continue;
    }
    const changed = added || propHistoryJson(before) !== propHistoryJson(r.value);
    if (changed) {
      if (!propHistoryObject(r.value) || !PROP_STATUSES.includes(r.value.to)) return fail("invalidType");
      if (!propHistoryDay(r.value.day)) return fail("invalidDate");
      const expected = { ...(!added && propHistoryObject(before) ? before : {}), to: r.value.to, day: r.value.day };
      if (propHistoryJson(expected) !== propHistoryJson(r.value)) return fail("invalidDraft");
      changes.push({ kind: added ? "add" : "edit", key: r.key, before: propHistoryClone(before), after: propHistoryClone(r.value) });
    }
    events.push(propHistoryClone(r.value));
  }
  if (originals.size !== d.base.events.length) return fail("invalidDraft");
  return { ok: true, changed: changes.length > 0, changes, removed, bought_on: d.bought_on, events };
}
function propHistorySameBase(a, b) {
  return !!a && !!b && a.id === b.id && a.user_id === b.user_id && a.bought_on === b.bought_on &&
    a.updated_at === b.updated_at && !!a._historyInvalidRoot === !!b._historyInvalidRoot && propHistoryJson(a.events) === propHistoryJson(b.events);
}
function propHistoryCanWrite() { return !!sb && !!session?.user?.id && !!currentProfile?.active && !authLoading && !viewingUserId; }
function propHistoryVersionValid(a) {
  return Object.prototype.hasOwnProperty.call(a, "updated_at") && (a.updated_at === null ||
    (typeof a.updated_at === "string" && Number.isFinite(Date.parse(a.updated_at)))) &&
    Object.prototype.hasOwnProperty.call(a, "bought_on") && (a.bought_on === null || typeof a.bought_on === "string");
}
const propHistoryPending = new Set();
/* 唯一修正写接口：一次 conditional UPDATE + RETURNING，不 upsert，不做自动重试。
   JSONB 比较以原始 JSON 序列化传给 PostgREST，且包含 nullable updated_at 条件。
   current 回调用来拒绝已关闭/失效的 UI；session/client 引用也防止身份 ABA。 */
async function propHistorySave(draft, options = {}) {
  const fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });
  if (!propHistoryCanWrite()) return fail("permission");
  const patch = propHistoryPatch(draft);
  if (!patch.ok) return fail(patch.reason);
  if (!patch.changed) return fail("unchanged");
  if (patch.removed && options.acknowledged !== true) return fail("acknowledgement");
  const base = propHistoryClone(draft.base), owner = session.user.id, client = sb, auth = session;
  if (base.user_id !== owner || !base.id || !propHistoryVersionValid(base)) return fail("invalidSnapshot");
  const cached = propAccounts.find(a => a.id === base.id && a.user_id === owner);
  if (!cached) return fail("gone");
  if (!propHistorySameBase(cached, base)) return fail("conflict");
  const current = () => propHistoryCanWrite() && session === auth && session.user.id === owner && sb === client &&
    (!options.current || options.current()) && propHistorySameBase(propAccounts.find(a => a.id === base.id && a.user_id === owner), base);
  if (!current()) return fail("stale");
  const key = owner + "|" + base.id;
  if (propHistoryPending.has(key)) return fail("busy");
  propHistoryPending.add(key);
  // Only submit fields actually changed. An untouched legacy unknown date is not
  // a request to write NULL into the current bought_on NOT NULL schema.
  const payload = { updated_at: new Date().toISOString() };
  if (patch.bought_on !== base.bought_on) payload.bought_on = patch.bought_on;
  if (propHistoryJson(patch.events) !== propHistoryJson(base.events)) payload.events = propHistoryClone(patch.events);
  try {
    let q = client.from("prop_accounts").update(payload).eq("id", base.id).eq("user_id", owner);
    q = base.updated_at === null ? q.is("updated_at", null) : q.eq("updated_at", base.updated_at);
    q = base.bought_on === null ? q.is("bought_on", null) : q.eq("bought_on", base.bought_on);
    const result = await q.eq("events", JSON.stringify(base.events)).select("id,user_id,bought_on,events,updated_at");
    if (!current()) return fail("stale", { mayHaveSaved: true });
    if (result?.error) return fail("error");
    if (!Array.isArray(result?.data)) return fail("unverified");
    if (!result.data.length) return fail("conflict");
    const row = result.data[0];
    if (result.data.length !== 1 || !row || row.id !== base.id || row.user_id !== owner || row.bought_on !== patch.bought_on ||
        !Array.isArray(row.events) || propHistoryJson(row.events) !== propHistoryJson(patch.events) ||
        typeof row.updated_at !== "string" || !Number.isFinite(Date.parse(row.updated_at)) ||
        Date.parse(row.updated_at) !== Date.parse(payload.updated_at)) return fail("unverified");
    propAccounts = propAccounts.map(a => a.id === base.id && a.user_id === owner ?
      { ...a, bought_on: row.bought_on, events: propHistoryClone(row.events), updated_at: row.updated_at } : a);
    return { ok: true, id: base.id, remaining: propHistoryIssues(propAccounts.find(a => a.id === base.id), propEntries) };
  } catch (_) {
    return current() ? fail("error") : fail("stale", { mayHaveSaved: true });
  } finally { propHistoryPending.delete(key); }
}
/* 冲突后仅由用户明确确认丢弃草稿时调用；不复用 loadPropData，避免触发续费。 */
async function propHistoryReload(id, options = {}) {
  const fail = reason => ({ ok: false, reason });
  if (!propHistoryCanWrite()) return fail("permission");
  const owner = session.user.id, auth = session, client = sb;
  const cached = propAccounts.find(a => a.id === id && a.user_id === owner);
  if (!cached) return fail("gone");
  const snapshot = propHistoryJson(cached);
  const current = () => propHistoryCanWrite() && session === auth && session.user.id === owner && sb === client && (!options.current || options.current());
  try {
    const result = await client.from("prop_accounts").select("*").eq("id", id).eq("user_id", owner);
    if (!current()) return fail("stale");
    if (result?.error) return fail("error");
    if (!Array.isArray(result?.data) || result.data.length !== 1 || result.data[0].id !== id || result.data[0].user_id !== owner) return fail("gone");
    // Reload replaces the full cache row. Do not let an older read completion
    // erase any newer same-scope update, including fields outside history.
    const latest = propAccounts.find(a => a.id === id && a.user_id === owner);
    if (!latest) return fail("gone");
    if (propHistoryJson(latest) !== snapshot) return fail("conflict");
    const row = propHistoryAccountFromRow(result.data[0]);
    propAccounts = propAccounts.map(a => a.id === id && a.user_id === owner ? row : a);
    return { ok: true, account: row };
  } catch (_) { return fail(current() ? "error" : "stale"); }
}

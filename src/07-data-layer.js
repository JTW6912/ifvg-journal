/* ============================================================
   DATA LAYER — Supabase
   ============================================================ */
/* ---------- 分页读取 ----------
   PostgREST 一次最多只回 1000 行（项目设置里的 Max rows，默认就是 1000），超出的部分**没有任何报错**，
   直接被截掉——回测模式随便就过 1000 笔，胜率 / PF / 回撤 / 显著性全都会悄悄基于残缺数据算。
   所以所有「要拿全表」的读取都必须走这里，不要再直接 await 一个没带 range 的 select。

   makeQuery 每页调用一次，必须返回一个**新的**、已经带好 order 的查询（builder 用过一次就不能复用）。
   ⚠ order 里必须有一个唯一列（id）兜底：只按 created_at 排的话，同一毫秒的两行在翻页时可能被重复或漏掉。
   总数靠第一页的 count: "exact" 拿：不能用「这页不满 PAGE_SIZE 就停」来判断，
   服务端的 Max rows 一旦被调小，第一页就会「不满」，后面全丢。 */
const PAGE_SIZE = 1000;
async function fetchAllRows(makeQuery) {
  const rows = [];
  let total = null;
  for (;;) {
    const from = rows.length;
    const { data, error, count } = await makeQuery().range(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    if (total === null && typeof count === "number") total = count;
    if (!data || !data.length) break;
    rows.push(...data);
    if (total !== null ? rows.length >= total : data.length < PAGE_SIZE) break;
  }
  return { data: rows, error: null };
}

async function loadProfile() {
  const { data, error } = await sb.from("profiles").select("*").eq("id", session.user.id).single();
  if (error) { console.error(error); currentProfile = null; return; }
  currentProfile = data;
  syncLangFromProfile();
  syncAppearanceFromProfile();
  sb.rpc("touch_last_seen").then(({ error: e }) => { if (e) console.error(e); });
}
/* 当前模式（回测 / 实盘）下的交易，拉全量（见 fetchAllRows）。出错直接抛，由调用方决定怎么提示 */
async function loadTrades(uid) {
  const { data: tradeRows, error } = await fetchAllRows(() => sb.from("trades").select("*", { count: "exact" })
    .eq("user_id", uid).eq("mode", recordMode).order("created_at", { ascending: true }).order("id", { ascending: true }));
  if (error) throw error;
  trades = (tradeRows || []).map(tradeFromRow);
}
function tradeFromRow(r) {
  return { id: r.id, _created_at: r.created_at, _updated_at: r.updated_at, ...r.data };
}
/* 切回测 / 实盘只需要换这两样：交易和复盘各有一套，字段配置、分析配置、更新日志两边共用，不用再拉一遍 */
async function reloadModeData() {
  if (!sb || !session) return;
  try {
    await loadTrades(viewingUserId || session.user.id);
    loadError = null;
  } catch (err) {
    console.error(err);
    loadError = T("error.loadData");
    trades = [];
  }
  try { await loadReviews(); } catch (e) { console.error(e); }
}
async function loadAll() {
  if (!sb || !session) return;
  try {
    const uid = viewingUserId || session.user.id;
    const { data: schemaRow, error: e1 } = await sb.from("journal_schema").select("*").eq("user_id", uid).single();
    if (e1 && e1.code !== "PGRST116") throw e1;
    if (!schemaRow || !schemaRow.fields || !schemaRow.fields.length) {
      // 新账号：按注册/首次登录时的界面语言把默认字段落库，之后就归用户所有
      const seeded = defaultSchema();
      schema = seeded;
      if (!viewingUserId) await sb.from("journal_schema").upsert({ user_id: uid, fields: seeded, card_fields: [] });
    } else {
      schema = schemaRow.fields;
    }
    cardFields = (schemaRow && Array.isArray(schemaRow.card_fields)) ? schemaRow.card_fields : [];
    /* focus_fields：从没配过时是 null → 用默认。
       ⚠ 这里只能判 Array.isArray，不能顺手加 .length：空数组是"用户主动清空了"，
       跟"没配过"是两回事，混在一起的话「清空额外字段」按下去下次刷新又变回默认 */
    focusFields = (schemaRow && Array.isArray(schemaRow.focus_fields))
      ? schemaRow.focus_fields : defaultFocusFields();
    analysisPrefs = normalizeAnalysisPrefs(schemaRow && schemaRow.analysis_prefs);
    reviewPrefs = normalizeReviewPrefs(schemaRow && schemaRow.review_prefs);
    await loadTrades(uid);
    loadError = null;

    try {
      const { data: logRows, error: e3 } = await fetchAllRows(() => sb.from("changelog").select("*", { count: "exact" })
        .order("created_at", { ascending: false }).order("id", { ascending: false }));
      if (!e3) changelog = logRows || [];
    } catch (e) { /* changelog table may not exist yet */ }

    // 复盘：表可能还没建，loadReviews 内部自己降级，不会影响这次 loadAll 的其他部分
    try { await loadReviews(); } catch (e) { console.error(e); }
    // 模型库跨回测/实盘只有一份，所以只在这里拉，切模式（reloadModeData）不用重拉
    try { await loadPlaybook(); } catch (e) { console.error(e); }

    // 分析页筛选：本地存过就用存的，没存过给默认（只看 Taken）。跟记录页那份各存各的，互不影响
    seedAnalysisFilters();

    if (!defaultFiltersSeeded && !viewingUserId) {
      defaultFiltersSeeded = true;
      const saved = loadSavedFilters();
      if (saved) {
        activeFilters = saved;
      } else {
        const modelF = roleField("model"), takenF = roleField("taken");
        const seed = [];
        if (modelF) seed.push(newFilterRow(modelF.id));
        if (takenF) seed.push(newFilterRow(takenF.id));
        if (seed.length) activeFilters = seed;
      }
    }
  } catch (err) {
    console.error(err);
    loadError = noteDbError(err) ? T("error.dbOutdated") : T("error.loadData");
    schema = defaultSchema(); trades = [];
  }
}
async function persistSchema(next) {
  if (viewingUserId) return;
  schema = next;
  render();
  if (!sb || !session) return;
  const { error } = await sb.from("journal_schema").update({ fields: next }).eq("user_id", session.user.id);
  if (error) console.error(error);
}
async function persistCardFields(next) {
  if (viewingUserId) return;
  cardFields = next;
  render();
  if (!sb || !session) return;
  const { error } = await sb.from("journal_schema").update({ card_fields: next }).eq("user_id", session.user.id);
  if (error) console.error(error);
}
/* 看图模式的字段选择。列没建的话这里会报错——只 console 一条，不弹窗：
   功能本身照常能用，只是这次的选择不跨设备、刷新后回到默认，
   为这个打断用户不值当（supabase/migrations 跑一下就好了） */
async function persistFocusFields(next) {
  if (viewingUserId) return;
  focusFields = next;
  render();
  if (!sb || !session) return;
  const { error } = await sb.from("journal_schema").update({ focus_fields: next }).eq("user_id", session.user.id);
  if (error) console.error("focus_fields 存不进去（多半是 supabase/migrations 还没跑完）:", error);
}
/* 保存 / 删除只改本地数组，不再 loadAll()：以前每存一笔就把 schema、全部交易、更新日志、复盘重新拉一遍，
   交易一多这就是每次保存好几个来回、外加整页重绘。本地怎么改要和 loadTrades 拉回来的形状一致
   （created_at 按升序排，新的在最后）。 */
/* 返回 true = 存进库了（表单保存之后要接着把勾选的笔记写进去，得知道这一步成没成） */
async function persistTrade(trade) {
  if (viewingUserId) return false;
  const clean = { ...trade };
  const id = clean.id; delete clean.id; delete clean._isNew; delete clean._resumedDraft;
  delete clean._created_at; delete clean._updated_at;
  if (!sb || !session) return false;
  const modeAtSave = recordMode;
  const { data, error } = await sb.from("trades")
    .upsert({ id, user_id: session.user.id, mode: modeAtSave, data: clean, updated_at: new Date().toISOString() })
    .select("id, created_at, updated_at, data").single();
  if (error) { console.error(error); alert(T("error.saveTrade", { msg: error.message })); return false; }
  if (modeAtSave !== recordMode) return true;   // 保存途中用户切了模式：这一笔不属于现在显示的这批
  applySavedTrade(tradeFromRow(data));
  render();
  return true;
}
function applySavedTrade(saved) {
  const i = trades.findIndex((t) => t.id === saved.id);
  if (i >= 0) trades[i] = saved; else trades.push(saved);
}
async function removeTrade(id) {
  if (viewingUserId) return;
  if (!sb || !session) return;
  const { error } = await sb.from("trades").delete().eq("id", id).eq("user_id", session.user.id);
  if (error) {
    // 删除没成功就别在界面上把它抹掉：从库里重新拉一次，让界面回到真实状态
    console.error(error);
    await reloadModeData();
    render();
    return;
  }
  trades = trades.filter((t) => t.id !== id);
  render();
}
async function addOptionToField(fieldId, opt) {
  if (viewingUserId) return;
  const next = schema.map((f) => (f.id === fieldId ? { ...f, options: [...(f.options || []), opt] } : f));
  await persistSchema(next);
}
const DRAFT_KEY = "journal_trade_draft";
function saveDraft() {
  if (!editingTrade || !editingTrade._isNew) return;
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(formDraft)); } catch (e) {}
}
function loadDraft() {
  try { const raw = localStorage.getItem(DRAFT_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
}
async function addChangelogEntry(text) {
  if (!sb || !text.trim()) return;
  const { data, error } = await sb.from("changelog").insert({ entry: text.trim() }).select().single();
  if (error) { alert(T("error.publish", { msg: error.message })); return; }
  changelog = [data, ...changelog];   // 列表按 created_at 倒序，新的在最前
  render();
}
async function removeChangelogEntry(id) {
  if (!sb) return;
  const { error } = await sb.from("changelog").delete().eq("id", id);
  if (error) { console.error(error); return; }
  changelog = changelog.filter((e) => e.id !== id);
  render();
}

/* ============================================================
   复盘分组 —— 配置层

   分组只有一级：一个分组里直接放复盘，没有二级分组。组合那边支持两级，
   这里刻意不支持——复盘是长文，两级会让"这篇到底在哪"变得难找。

   分组定义（id/名字/属于哪个模式/顺序）存 journal_schema.review_prefs，
   跟 analysis_prefs 一样是个 jsonb 个人配置列；数组顺序就是显示顺序。
   每篇复盘归属哪个组存在 journal_reviews.group_id 上——归属是数据不是配置，
   放在行上才不会出现"配置里记着某篇在 A 组、行却已经被删了"这种对不上的情况。
   ============================================================ */
function defaultReviewPrefs() { return { groups: [] }; }
function normalizeReviewPrefs(raw) {
  const out = defaultReviewPrefs();
  if (!raw || typeof raw !== "object") return out;
  if (Array.isArray(raw.groups)) {
    out.groups = raw.groups
      .filter((g) => g && typeof g.id === "string")
      .map((g) => ({
        id: g.id,
        name: typeof g.name === "string" ? g.name : "",
        // 老数据没有 mode，一律算实盘（分组功能上线前复盘本来就只有实盘）
        mode: g.mode === "backtest" ? "backtest" : "live",
      }));
  }
  return out;
}
function newReviewGroupId() { return "rg_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

/* 当前模式下的分组。回测和实盘各看各的一套，互不干扰 */
function reviewGroups() { return (reviewPrefs.groups || []).filter((g) => g.mode === recordMode); }
function findReviewGroup(id) { return (reviewPrefs.groups || []).find((g) => g.id === id) || null; }
/* 归属的分组已经被删掉时算未分组——引用失效要有个确定的落点，不能让整篇消失 */
function reviewEffectiveGroupId(r) {
  const gid = r.group_id || "";
  if (!gid) return "";
  const g = findReviewGroup(gid);
  return g && g.mode === recordMode ? gid : "";
}

async function writeReviewPrefs() {
  reviewPrefsSaveTimer = null;
  if (viewingUserId || !sb || !session) return;
  const { error } = await sb.from("journal_schema").update({ review_prefs: reviewPrefs }).eq("user_id", session.user.id);
  if (error) {
    console.error(error);
    reviewPrefsError = noteDbError(error) ? T("error.dbOutdated") : T("review.saveFailed", { msg: error.message });
    render();
  } else if (reviewPrefsError) {
    reviewPrefsError = null;
    render();
  }
}
function queueSaveReviewPrefs() {
  if (viewingUserId) return;
  if (reviewPrefsSaveTimer) clearTimeout(reviewPrefsSaveTimer);
  reviewPrefsSaveTimer = setTimeout(writeReviewPrefs, 600);
}
function flushReviewPrefs() {
  if (!reviewPrefsSaveTimer) return;
  clearTimeout(reviewPrefsSaveTimer);
  writeReviewPrefs();
}

/* 分组的增删改。删分组**不删里面的复盘**——组合那边是级联删的，但复盘是长文，
   顺手删掉一整组等于毁掉几个小时的记录，所以这里退回未分组。 */
function addReviewGroup(name) {
  reviewPrefs.groups.push({ id: newReviewGroupId(), name: name || "", mode: recordMode });
  queueSaveReviewPrefs();
}
function renameReviewGroup(id, name) {
  const g = findReviewGroup(id);
  if (!g) return;
  g.name = name || "";
  queueSaveReviewPrefs();
}
async function removeReviewGroup(id) {
  reviewPrefs.groups = (reviewPrefs.groups || []).filter((g) => g.id !== id);
  queueSaveReviewPrefs();
  const orphans = reviews.filter((r) => r.group_id === id);
  if (orphans.length) await moveReviewsToGroup(orphans.map((r) => r.id), "");
}
/* 拖分组换位置：只在当前模式这一批里挪，别的模式那几条在数组里原地不动 */
function moveReviewGroup(draggedId, targetId) {
  const all = reviewPrefs.groups || [];
  const mineIds = reviewGroups().map((g) => g.id);
  const from = mineIds.indexOf(draggedId), to = mineIds.indexOf(targetId);
  if (from === -1 || to === -1 || from === to) return;
  mineIds.splice(to, 0, mineIds.splice(from, 1)[0]);
  const byId = new Map(all.map((g) => [g.id, g]));
  let k = 0;
  reviewPrefs.groups = all.map((g) => (g.mode === recordMode ? byId.get(mineIds[k++]) : g));
  queueSaveReviewPrefs();
}

/* ---------- 分组归属与排序（存在 journal_reviews 的列上）----------
   sort_order 是 null 的复盘还没被排过，按 created_at 倒序兜底（新的在上面）。
   一旦用户在某个桶里拖过一次，就把那个桶整批写成 0,1,2…，之后语义就确定了。
   一个桶几十篇顶天了，一次 upsert 就够，不值得为它上分数索引那套。 */
function sortReviewsForDisplay(list) {
  return list.slice().sort((a, b) => {
    const ao = a.sort_order, bo = b.sort_order;
    const aHas = ao !== null && ao !== undefined, bHas = bo !== null && bo !== undefined;
    if (aHas && bHas) return ao - bo;
    if (aHas !== bHas) return aHas ? -1 : 1;          // 排过序的一律在前
    return (b.created_at || "") < (a.created_at || "") ? -1 : 1;
  });
}

/* 把若干篇复盘挪到某个分组，顺便把它们排到该组末尾 */
async function moveReviewsToGroup(ids, groupId) {
  if (viewingUserId || !sb || !session) return;
  const target = groupId || null;
  const moved = ids.map((id) => reviews.find((x) => x.id === id)).filter(Boolean);
  if (!moved.length) return;
  // 目标桶整批重编号，再把挪进来的接在后面。只给挪进来的那几条编号是不够的：
  // 桶里原有的可能还是 null（从没排过），而 null 在显示顺序里排最后，
  // 那样「挪到末尾」反而会显示在最前面
  const bucket = sortReviewsForDisplay(reviews.filter((r) => reviewEffectiveGroupId(r) === (groupId || "") && !ids.includes(r.id)));
  moved.forEach((r) => { r.group_id = target; });
  const rows = bucket.concat(moved).map((r, i) => { r.sort_order = i; return reviewRowPayload(r); });
  await upsertReviewRows(rows);
}

/* 在一个桶内换位置：把整桶重排成 0,1,2… 一次写回 */
async function reorderReviewInBucket(draggedId, targetId) {
  if (viewingUserId || !sb || !session) return;
  const dragged = reviews.find((r) => r.id === draggedId);
  const target = reviews.find((r) => r.id === targetId);
  if (!dragged || !target) return;
  const gid = reviewEffectiveGroupId(target);
  // 跨桶拖到别的卡片上 = 先归到那个桶，再插到目标位置
  const bucket = sortReviewsForDisplay(reviews.filter((r) => reviewEffectiveGroupId(r) === gid && r.id !== draggedId));
  const at = bucket.findIndex((r) => r.id === targetId);
  if (at === -1) return;
  bucket.splice(at, 0, dragged);
  dragged.group_id = gid || null;
  const rows = bucket.map((r, i) => { r.sort_order = i; return reviewRowPayload(r); });
  await upsertReviewRows(rows);
}

function reviewRowPayload(r) {
  return {
    id: r.id,
    user_id: session.user.id,
    title: r.title || "",
    body: r.body || "",
    week_start: r.week_start || null,
    day_date: r.day_date || null,
    linked_trade_ids: r.linked_trade_ids || extractTradeRefs(r.body),
    mode: r.mode || recordMode,
    group_id: r.group_id || null,
    sort_order: r.sort_order === undefined ? null : r.sort_order,
    updated_at: r.updated_at || new Date().toISOString(),
  };
}

/* 批量写（拖拽排序 / 换分组）。失败要让用户看得见，否则会是「拖了一下什么都没发生」 */
async function upsertReviewRows(rows) {
  const { error } = await sb.from("journal_reviews").upsert(rows);
  if (!error) { reviewPrefsError = null; return true; }
  console.error(error);
  if (noteDbError(error)) { render(); return false; }
  reviewSaveError = T("review.saveFailed", { msg: error.message });
  render();
  return false;
}

/* ============================================================
   复盘（REVIEWS）—— 数据层
   ============================================================ */
/* 库的结构比前端旧：表不存在（42P01 / PGRST205）、列不存在（42703 / PGRST204）。
   前端不再对这类错误做降级，统一提示去跑 supabase/migrations。 */
const SCHEMA_OUTDATED_CODES = ["42P01", "42703", "PGRST204", "PGRST205"];
function isSchemaOutdatedError(err) {
  return !!err && SCHEMA_OUTDATED_CODES.includes(err.code);
}
/* 是的话顺手把 dbOutdated 置上，返回 true；调用方据此决定文案 */
function noteDbError(err) {
  if (!isSchemaOutdatedError(err)) return false;
  dbOutdated = true;
  return true;
}
function newReviewId() { return "r_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

async function loadReviews() {
  if (!sb || !session) return;
  const uid = viewingUserId || session.user.id;
  const { data, error } = await fetchAllRows(() => sb.from("journal_reviews").select("*", { count: "exact" })
    .eq("user_id", uid).eq("mode", recordMode).order("created_at", { ascending: false }).order("id", { ascending: false }));
  if (error) {
    noteDbError(error);
    console.error(error);
    reviews = [];
    return;
  }
  reviews = data || [];
}

/* 正文里抽出所有 [[trade:xxx]]，存进 linked_trade_ids 当冗余索引。
   正文永远是唯一真相，这一列只是给「这笔交易被哪几篇提到」之类的反查用。 */
function extractTradeRefs(body) {
  const out = [];
  const re = /\[\[trade:([A-Za-z0-9_-]+)\]\]/g;
  let m;
  while ((m = re.exec(body || ""))) { if (!out.includes(m[1])) out.push(m[1]); }
  return out;
}

async function persistReview(rev, opts) {
  if (viewingUserId || !sb || !session) return false;
  // 模型库页面走自己的表，编辑器那一套（自动保存、草稿、已保存徽章）照旧
  if (isPbDoc(rev)) {
    // 位置（归属 / 排序 / 分支）以库里那份为准：拖拽、挪分支都是在编辑器外面改的，编辑器手里那份可能是旧的
    const lib = pbFind(rev.id);
    const ok = await persistPbPage(lib ? { ...rev, parent_id: lib.parent_id, sort_order: lib.sort_order, branch_of: lib.branch_of } : rev);
    if (ok) { reviewSaveError = null; if (!(opts && opts.silent)) clearReviewDraft(); }
    else reviewSaveError = pbError;
    return ok;
  }
  const row = {
    id: rev.id,
    user_id: session.user.id,
    title: rev.title || "",
    body: rev.body || "",
    week_start: rev.week_start || null,
    day_date: rev.day_date || null,
    linked_trade_ids: extractTradeRefs(rev.body),
    mode: rev.mode || recordMode,
    group_id: rev.group_id || null,
    sort_order: rev.sort_order === undefined ? null : rev.sort_order,
    updated_at: new Date().toISOString(),
  };
  const { error } = await sb.from("journal_reviews").upsert(row);
  if (error) {
    console.error(error);
    reviewSaveError = noteDbError(error) ? T("error.dbOutdated") : T("review.saveFailed", { msg: error.message });
    return false;
  }
  reviewSaveError = null;
  // 本地列表同步更新，不重新拉全表——编辑器开着时任何 loadAll 都是多余的网络往返
  const i = reviews.findIndex((r) => r.id === row.id);
  if (i >= 0) reviews[i] = { ...reviews[i], ...row };
  else reviews.unshift({ ...row, created_at: new Date().toISOString() });
  if (!(opts && opts.silent)) clearReviewDraft();
  return true;
}

async function deleteReview(id) {
  if (viewingUserId || !sb || !session) return;
  const { error } = await sb.from("journal_reviews").delete().eq("id", id).eq("user_id", session.user.id);
  if (error) { console.error(error); return; }
  reviews = reviews.filter((r) => r.id !== id);
}

/* ============================================================
   模型库（PLAYBOOK）—— 数据层。模型见 src/11b-playbook-data.js
   ============================================================ */
async function loadPlaybook() {
  if (!sb || !session) return;
  const uid = viewingUserId || session.user.id;
  const { data, error } = await fetchAllRows(() => sb.from("journal_playbook").select("*", { count: "exact" })
    .eq("user_id", uid).order("created_at", { ascending: true }).order("id", { ascending: true }));
  if (error) {
    noteDbError(error);
    console.error(error);
    pbPages = [];
    return;
  }
  pbPages = data || [];
}
function pbRowPayload(p) {
  const row = {
    id: p.id,
    user_id: session.user.id,
    kind: p.kind,
    parent_id: p.parent_id || null,
    title: p.title || "",
    body: p.body || "",
    linked_trade_ids: extractTradeRefs(p.body),
    sort_order: p.sort_order === undefined ? null : p.sort_order,
    updated_at: new Date().toISOString(),
  };
  // status 只有待验证用得上。只在待验证上写这一列：系统 / 策略 / 错题的保存不依赖它，
  // 迁移没跑之前那几样照常能存
  if (p.kind === "verify") row.status = pbVerifyStatus(p);
  // branch_of（笔记的分支，见 11b）：这一行本来就带着这一列才写（库里读出来是 null 也算带着），
  // 新建的页面不带就不写——插入时用默认值 null，更新时保持原值
  if (p.branch_of !== undefined) row.branch_of = p.branch_of || null;
  return row;
}
/* 写一页（新建、改名、改归属、往错题里加交易、编辑器自动保存都走这里）。本地数组同步更新，不重拉 */
/* 笔记 / 标签页面上每笔交易的标记（收藏 / 关联，见 11b 的 trade_marks）。
   单独 update 这一列：不带正文（笔记开在编辑器里时库里那份正文可能比编辑器旧，整行 upsert 会把它写回去），
   也不碰 updated_at（标一下不算「编辑过」）。先改本地再写库，写失败改回去 */
async function pbWriteMarks(pageId, marks) {
  const p = pbFind(pageId);
  if (!p || viewingUserId || !sb || !session) return false;
  const before = p.trade_marks;
  p.trade_marks = marks;
  const { error } = await sb.from("journal_playbook").update({ trade_marks: marks }).eq("id", pageId).eq("user_id", session.user.id);
  if (error) {
    console.error(error);
    p.trade_marks = before;
    pbError = noteDbError(error) ? T("error.dbOutdated") : T("review.saveFailed", { msg: error.message });
    return false;
  }
  return true;
}
async function persistPbPage(p) {
  if (viewingUserId || !sb || !session) return false;
  const row = pbRowPayload(p);
  const { error } = await sb.from("journal_playbook").upsert(row);
  if (error) {
    console.error(error);
    pbError = noteDbError(error) ? T("error.dbOutdated") : T("review.saveFailed", { msg: error.message });
    return false;
  }
  pbError = null;
  const i = pbPages.findIndex((x) => x.id === row.id);
  if (i >= 0) pbPages[i] = { ...pbPages[i], ...row };
  else pbPages.push({ ...row, folded_headings: p.folded_headings || [], created_at: new Date().toISOString() });
  return true;
}

/* 删一页。长文不能顺手连带删掉（跟删复盘分组不删里面的复盘同一个道理）：
   - 系统下面还有衍生策略：不让删，界面上会先拦住（这里再兜一次）
   - 这一页的笔记和标签挪到上一层（策略 → 所属系统；系统 → 通用）
   - 删的是标签：内存里打了这个标签的交易摘掉它（另一个模式的交易读的时候按不存在忽略）
   - 归在这一页的交易：策略的挪到所属系统（「说不清是哪个子策略」本来就归系统），系统的变回未归类
     交易只在实盘模式下归类，回测模式下内存里没有那批交易——那时候不改，读的时候按未归类算（见 pbTradePageId） */
async function deletePbPage(id) {
  if (viewingUserId || !sb || !session) return false;
  const p = pbFind(id);
  if (!p) return false;
  if (p.kind === "system" && pbStrategiesOf(p.id).length) return false;
  const up = p.kind === "strategy" ? (pbFind(p.parent_id) ? p.parent_id : null) : null;
  if (p.kind === "tag") {
    const tagged = trades.filter((t) => pbTradeTagIds(t).includes(p.id));
    if (tagged.length && !(await pbPatchTrades(tagged.map((t) => ({ id: t.id, patch: { [PB_TAGS_KEY]: pbTagsToggled(t, p.id) } }))))) return false;
  }
  // 删的是有分支的笔记：分支各自变回顶层的一条，不跟着删
  const branches = pbPages.filter((m) => m.branch_of === p.id);
  if (branches.length && !(await pbSaveStructure(branches.map((m) => ({ id: m.id, patch: { branch_of: null } }))))) return false;
  if (pbIsPage(p)) {
    const orphans = pbPages.filter((m) => pbIsChild(m) && m.parent_id === p.id);
    for (const m of orphans) { m.parent_id = up; if (!(await persistPbPage(m))) return false; }
    const affected = trades.filter((t) => t[PB_KEY] === p.id);
    if (affected.length) {
      const ok = await pbPatchTrades(affected.map((t) => ({ id: t.id, patch: up ? { [PB_KEY]: up } : { [PB_KEY]: undefined, [PB_STAR_KEY]: undefined } })));
      if (!ok) return false;
    }
  }
  const { error } = await sb.from("journal_playbook").delete().eq("id", id).eq("user_id", session.user.id);
  if (error) {
    console.error(error);
    pbError = noteDbError(error) ? T("error.dbOutdated") : T("review.saveFailed", { msg: error.message });
    return false;
  }
  pbPages = pbPages.filter((x) => x.id !== id);
  return true;
}

/* 改一批页面的位置：归属（parent_id）/ 排序（sort_order）/ 分支（branch_of）。拖拽、挪分支、合并都走这里。
   只 update 这几列：不带正文（编辑器开着的那页库里的正文可能是旧的），也不碰 updated_at（挪个位置不算「编辑过」）。
   先改本地再写库，有一行写失败就整批改回去。编辑器正开着其中一页的话，它手里那份归属也跟着改 */
async function pbSaveStructure(items) {
  if (viewingUserId || !sb || !session) return false;
  items = items.filter((it) => pbFind(it.id));
  if (!items.length) return true;
  const before = items.map((it) => { const p = pbFind(it.id); const b = {}; Object.keys(it.patch).forEach((k) => { b[k] = p[k]; }); return b; });
  const apply = (patches) => items.forEach((it, i) => {
    Object.assign(pbFind(it.id), patches[i]);
    if (editingReview && editingReview.id === it.id && "parent_id" in patches[i]) editingReview.parent_id = patches[i].parent_id;
  });
  apply(items.map((it) => it.patch));
  const res = await Promise.all(items.map((it) => sb.from("journal_playbook").update(it.patch).eq("id", it.id).eq("user_id", session.user.id)));
  const bad = res.find((r) => r.error);
  if (bad) {
    console.error(bad.error);
    apply(before);
    pbError = noteDbError(bad.error) ? T("error.dbOutdated") : T("review.saveFailed", { msg: bad.error.message });
    return false;
  }
  pbError = null;
  return true;
}

/* 改一批交易的模型库归属（归类、点星标、删页面时挪交易）。
   先改本地再写库：归类是一笔接一笔按键的节奏，等网络回来才动界面会很涩。写失败就把这批改回去并提示。
   patch 里值为 undefined 的键 = 删掉这个键（不留一堆 "__pb": null 在 data 里）。
   一次 upsert 整批写，不一笔一个请求。 */
async function pbPatchTrades(items) {
  if (viewingUserId || !sb || !session || !items.length) return false;
  const modeAtSave = recordMode;
  const before = [];
  const rows = [];
  items.forEach(({ id, patch }) => {
    const i = trades.findIndex((t) => t.id === id);
    if (i < 0) return;
    before.push(trades[i]);
    const next = { ...trades[i] };
    Object.keys(patch).forEach((k) => { if (patch[k] === undefined) delete next[k]; else next[k] = patch[k]; });
    trades[i] = next;
    const clean = { ...next };
    delete clean.id; delete clean._created_at; delete clean._updated_at;
    rows.push({ id, user_id: session.user.id, mode: modeAtSave, data: clean, updated_at: new Date().toISOString() });
  });
  if (!rows.length) return false;
  const { data, error } = await sb.from("trades").upsert(rows).select("id, created_at, updated_at, data");
  if (error) {
    console.error(error);
    if (modeAtSave === recordMode) before.forEach((t) => applySavedTrade(t));
    pbError = T("error.saveTrade", { msg: error.message });
    return false;
  }
  pbError = null;
  if (modeAtSave === recordMode) (data || []).forEach((r) => applySavedTrade(tradeFromRow(r)));
  return true;
}
function pbPatchTrade(id, patch) { return pbPatchTrades([{ id, patch }]); }

/* 本地草稿：数据库那边是 debounce 保存，中间这一秒断网/关标签页靠这个兜底。
   跟交易草稿（journal_trade_draft）各存各的，互不影响。 */
const REVIEW_DRAFT_KEY = "journal_review_draft";
function saveReviewDraft() {
  if (!editingReview) return;
  try { localStorage.setItem(REVIEW_DRAFT_KEY, JSON.stringify(editingReview)); } catch (e) {}
}
function loadReviewDraft() {
  try { const raw = localStorage.getItem(REVIEW_DRAFT_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function clearReviewDraft() {
  try { localStorage.removeItem(REVIEW_DRAFT_KEY); } catch (e) {}
}

/* ============================================================
   AUTH
   ============================================================ */
function friendlyAuthError(msg) {
  const m = (msg || "").toLowerCase();
  // 匹配的是 Supabase 返回的英文原文，跟界面语言无关；只有返回给用户看的那句要翻译
  if (m.includes("invalid login credentials")) return T("auth.err.badCredentials");
  if (m.includes("email not confirmed")) return T("auth.err.notConfirmed");
  if (m.includes("user already registered") || m.includes("already registered")) return T("auth.err.alreadyRegistered");
  if (m.includes("password") && m.includes("6")) return T("auth.err.passwordShort");
  if (m.includes("rate limit") || m.includes("too many")) return T("auth.err.rateLimit");
  if (m.includes("network") || m.includes("fetch")) return T("auth.err.network");
  return T("auth.err.generic");
}
async function doLogin(email, password, remember) {
  authBusy = true; authError = ""; authSuccess = ""; rememberMe = remember; render();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  authBusy = false;
  if (error) { authError = friendlyAuthError(error.message); render(); }
}
async function doRegister(email, password) {
  authBusy = true; authError = ""; authSuccess = ""; rememberMe = true; render();
  const { error } = await sb.auth.signUp({ email, password });
  authBusy = false;
  if (error) { authError = friendlyAuthError(error.message); render(); return; }
  authSuccess = T("auth.registerSuccess");
  authScreenMode = "login"; render();
}
async function doLogout() {
  await sb.auth.signOut();
}
async function loadAdminUsers() {
  if (!sb || !currentProfile || currentProfile.role !== "admin") return;
  const { data, error } = await fetchAllRows(() => sb.from("profiles").select("*", { count: "exact" })
    .order("created_at", { ascending: false }).order("id", { ascending: true }));
  if (error) { console.error(error); adminUsers = []; return; }
  adminUsers = data || [];
  try {
    const counts = await loadTradeCountsByUser();
    if (counts) adminUsers = adminUsers.map((u) => ({ ...u, tradeCount: counts[u.id] || 0 }));
  } catch (e) { console.error(e); }
}
/* 每个用户各有多少笔交易。优先走数据库里的聚合函数 admin_trade_counts()（supabase/migrations 里建的），
   一次请求只回「用户数」那么多行；函数还没建就退回分页拉全表的 user_id 在前端数——慢，但数是对的。 */
async function loadTradeCountsByUser() {
  const { data: agg, error: aggErr } = await sb.rpc("admin_trade_counts");
  if (!aggErr && Array.isArray(agg)) {
    const counts = {};
    agg.forEach((r) => { counts[r.user_id] = Number(r.n) || 0; });
    return counts;
  }
  const { data: rows, error } = await fetchAllRows(() => sb.from("trades").select("user_id", { count: "exact" }).order("id", { ascending: true }));
  if (error || !rows) return null;
  const counts = {};
  rows.forEach((r) => { counts[r.user_id] = (counts[r.user_id] || 0) + 1; });
  return counts;
}
function sortAdminUsers(list) {
  const key = adminUsersSortBy;
  const dir = adminUsersSortDir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    let av = a[key], bv = b[key];
    if (key === "tradeCount") { av = av || 0; bv = bv || 0; }
    else { av = av ? new Date(av).getTime() : 0; bv = bv ? new Date(bv).getTime() : 0; }
    return (av - bv) * dir;
  });
}
async function setUserActive(userId, active) {
  const { error } = await sb.from("profiles").update({ active }).eq("id", userId);
  if (error) { alert(T("error.action", { msg: error.message })); return; }
  await loadAdminUsers(); render();
}
async function setUserRole(userId, role) {
  const { error } = await sb.from("profiles").update({ role }).eq("id", userId);
  if (error) { alert(T("error.action", { msg: error.message })); return; }
  await loadAdminUsers(); render();
}

async function updateOwnProfile(displayName, gender) {
  profileBusy = true; profileError = ""; profileSuccess = ""; render(); renderSecondaryModals(true);
  const { error } = await sb.rpc("update_own_profile", { new_display_name: displayName, new_gender: gender || null });
  profileBusy = false;
  if (error) { profileError = T("profile.saveFailed"); render(); renderSecondaryModals(true); return; }
  await loadProfile();
  profileSuccess = T("profile.saved");
  render(); renderSecondaryModals(true);
}
async function changeOwnPassword(currentPw, newPw, confirmPw) {
  passwordError = ""; passwordSuccess = "";
  if (!currentPw || !newPw || !confirmPw) { passwordError = T("password.allRequired"); render(); renderSecondaryModals(true); return; }
  if (newPw.length < 6) { passwordError = T("password.tooShort"); render(); renderSecondaryModals(true); return; }
  if (newPw !== confirmPw) { passwordError = T("password.mismatch"); render(); renderSecondaryModals(true); return; }
  passwordBusy = true; render(); renderSecondaryModals(true);
  const { error: verifyErr } = await sb.auth.signInWithPassword({ email: session.user.email, password: currentPw });
  if (verifyErr) {
    passwordBusy = false; passwordError = T("password.currentWrong"); render(); renderSecondaryModals(true); return;
  }
  const { error: updateErr } = await sb.auth.updateUser({ password: newPw });
  passwordBusy = false;
  if (updateErr) { passwordError = T("password.changeFailed", { msg: updateErr.message }); render(); renderSecondaryModals(true); return; }
  passwordSuccess = T("password.changed");
  render(); renderSecondaryModals(true);
}


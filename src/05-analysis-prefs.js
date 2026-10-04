/* ============================================================
   ANALYSIS PREFS —— 分析页的拆解显示配置 / 组合 / 组合分组
   存在 journal_schema.analysis_prefs (jsonb) 这一列里，跨设备同步。
   分析页那套筛选条件(analysisFilters)不在这里——它是纯本地的"这次想看哪批交易"，
   只存 localStorage，不跨设备同步，见上面 ANALYSIS FILTERS 那一段。
   ============================================================ */
function defaultAnalysisPrefs() {
  return {
    breakdownHidden: [],   // 存「隐藏哪些」，新加的字段自动出现
    breakdownOrder: [],    // 只存用户排过序的，没排到的按 schema 顺序接在后面
    combos: [],
    comboGroups: [],        // {id, name, parentId} 扁平列表，parentId=null 是顶层分组，最多两层
    timeBuckets: DEFAULT_TIME_BUCKETS.slice(), // 时间字段拆解用的分段边界，见 TIME BUCKETS 那一段
    minSample: BREAKDOWN_MIN_SAMPLE,           // 低于多少笔就不算数，见 currentMinSample()
    pbScope: [],            // 模型库的成绩口径：哪些交易算进胜率 / R（筛选树，跟组合条件同构），见 11b 的 pbStats
  };
}
/* 「多少笔才算数」是方法论，不是设备偏好，所以跟 timeBuckets 一样进数据库跟着账号走，
   不放 localStorage。一个旋钮同时管：拆解行的降权折叠、显著性排序的准入、近期表现那四格。 */
function sanitizeMinSample(v) {
  const n = parseInt(v, 10);
  if (isNaN(n)) return BREAKDOWN_MIN_SAMPLE;
  return Math.max(1, Math.min(999, n));
}
function currentMinSample() {
  return sanitizeMinSample(analysisPrefs && analysisPrefs.minSample);
}
function normalizeAnalysisPrefs(raw) {
  const d = defaultAnalysisPrefs();
  if (!raw || typeof raw !== "object") return d;
  const groups = Array.isArray(raw.comboGroups) ? raw.comboGroups : [];
  const rootIds = new Set(groups.filter((g) => g && g.id && !g.parentId).map((g) => g.id));
  const comboGroups = groups
    .filter((g) => g && typeof g === "object" && g.id && typeof g.name === "string")
    // parentId 只能指向一个"没有父级"的分组，否则会出现三层，直接把它降级成顶层分组
    .map((g) => ({
      id: String(g.id), name: g.name,
      parentId: g.parentId && rootIds.has(g.parentId) && g.parentId !== g.id ? g.parentId : null,
      // 只有顶层分组会用到：它下面"未归入二级分组"的组合桶排在第几个位置（0=最前）。
      // 用下标而不是"挂在哪个二级分组前面"，是因为"前面"这种指针式定位天然够不到"最后一个"这个位置
      // （没有任何二级分组可以代表"我后面"）。下标越界（比如二级分组变少了）渲染时会自动夹到合法范围
      directOrder: typeof g.directOrder === "number" ? g.directOrder : null,
    }));
  return {
    breakdownHidden: Array.isArray(raw.breakdownHidden) ? raw.breakdownHidden.filter((x) => typeof x === "string") : [],
    breakdownOrder: Array.isArray(raw.breakdownOrder) ? raw.breakdownOrder.filter((x) => typeof x === "string") : [],
    combos: Array.isArray(raw.combos) ? raw.combos.map(normalizeCombo).filter(Boolean) : [],
    comboGroups,
    timeBuckets: sanitizeTimeBoundaries(raw.timeBuckets),
    minSample: sanitizeMinSample(raw.minSample),
    pbScope: normalizeFilterNodes(raw.pbScope),
  };
}
function normalizeCombo(c) {
  if (!c || typeof c !== "object" || !c.id) return null;
  let conditions = normalizeFilterNodes(c.conditions);
  // 老数据迁移：以前"只算Taken/排除人为错误"是组合自带的隐藏开关，现在改成用户自己在下面加条件。
  // 只在旧数据明确是 true（不是新组合缺这个字段）时才转成一条显式条件，避免升级后旧组合口径突然变宽
  if (c.scopeTaken === true) {
    const takenF = roleField("taken");
    if (takenF && !conditions.some((f) => f.fieldId === takenF.id)) {
      conditions = [{ ...newFilterRow(takenF.id), values: ["Taken"] }, ...conditions];
    }
  }
  if (c.scopeHE === true) {
    const heF = roleField("human_error");
    if (heF && !conditions.some((f) => f.fieldId === heF.id)) {
      conditions = [{ ...newFilterRow(heF.id), values: ["yes"], negate: true }, ...conditions];
    }
  }
  return {
    id: String(c.id),
    name: typeof c.name === "string" ? c.name : T("combo.untitled"),
    // tag 是旧版"可以做/要避免"标签留下的字段，功能已经被自定义分组取代，不再读它、不再给 UI 用，
    // 但也不主动清掉——老数据里如果还有值，原样保留，不强行丢用户的东西
    tag: c.tag === "do" || c.tag === "avoid" ? c.tag : "",
    // 指向 analysisPrefs.comboGroups 里的某个分组（顶层或二级都行）；""=未分组。
    // 这里不校验分组是否真的存在——分组被删掉后引用会变成"悬空"，渲染时按未分组处理，不会导致组合丢失
    groupId: typeof c.groupId === "string" ? c.groupId : "",
    conditions,
  };
}
function newComboId() { return "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function findCombo(id) { return analysisPrefs.combos.find((c) => c.id === id) || null; }

/* ---------- 组合分组：扁平列表 {id, name, parentId}，parentId=null 是顶层，最多两层 ---------- */
function newGroupId() { return "g_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function findComboGroup(id) { return (analysisPrefs.comboGroups || []).find((g) => g.id === id) || null; }
function comboGroupRoots() { return (analysisPrefs.comboGroups || []).filter((g) => !g.parentId); }
function comboGroupChildren(parentId) { return (analysisPrefs.comboGroups || []).filter((g) => g.parentId === parentId); }
// 组合实际归到哪：groupId 指向不存在的分组（比如分组被删了）一律按未分组处理，组合不会因此凭空消失
function comboEffectiveGroupId(combo) {
  return combo.groupId && findComboGroup(combo.groupId) ? combo.groupId : "";
}
// 删一个分组会连带删掉：它自己、它下面的二级分组、以及归在这些分组里的全部组合
function comboGroupCascadePreview(groupId) {
  const children = comboGroupChildren(groupId);
  const groupIds = new Set([groupId, ...children.map((g) => g.id)]);
  const combos = (analysisPrefs.combos || []).filter((c) => groupIds.has(comboEffectiveGroupId(c)));
  return { subgroupCount: children.length, comboCount: combos.length, comboIds: combos.map((c) => c.id) };
}
// 把顶层分组按 rootIdsInOrder 的顺序重建整个 comboGroups 数组，每个顶层后面紧跟着它自己的二级分组（保持各自原有相对顺序）
function rebuildComboGroupsOrder(rootIdsInOrder) {
  const next = [];
  rootIdsInOrder.forEach((rid) => {
    const root = findComboGroup(rid);
    if (root) next.push(root);
    comboGroupChildren(rid).forEach((sub) => next.push(sub));
  });
  analysisPrefs.comboGroups = next;
}
// 数组内两个元素换位置：把 draggedId 移到 targetId 原来所在的下标。
// 这个 splice 手法能够拖到"最后一个"——先把 dragged 移出数组会让它后面的元素整体前移一位，
// 这时再插入到 target 原始下标，如果 target 恰好是最后一个、dragged 排在它前面，就会正好落在数组末尾。
// （早期版本用的是"把 dragged 插到 target 前面"这种指针式模型，天生够不到最后一个位置，因为
//  没有任何东西能代表"排在最后一个的后面"——这就是这次要修的 bug 的根因）
function spliceReorder(ids, draggedId, targetId) {
  const fromIdx = ids.indexOf(draggedId), toIdx = ids.indexOf(targetId);
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return null;
  const next = [...ids];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next;
}
// "未归入二级分组"那个组合桶不是真的分组，没有自己的 id，用这个规律拼一个虚拟 key，
// 拖拽/收起状态复用跟真分组一样的机制（drag、collapsedComboGroups 都按普通字符串 key 处理）
const DIRECT_SUFFIX = "::direct";
function directGroupKey(rootId) { return rootId + DIRECT_SUFFIX; }
function parseDirectGroupKey(key) { return typeof key === "string" && key.endsWith(DIRECT_SUFFIX) ? key.slice(0, -DIRECT_SUFFIX.length) : null; }
function comboHasDirectCombos(rootId) { return (analysisPrefs.combos || []).some((c) => comboEffectiveGroupId(c) === rootId); }
// 某个顶层分组下"二级分组 + 未归入二级分组桶"的完整展示顺序，用一个 id 数组统一表示
// （虚拟桶用 directGroupKey 那个 key 代表自己），这样可以直接复用同一套 splice 重排逻辑
function comboSubgroupSlotIds(root, subgroups) {
  const ids = subgroups.map((s) => s.id);
  if (comboHasDirectCombos(root.id)) {
    let idx = root.directOrder;
    if (typeof idx !== "number" || idx < 0 || idx > ids.length) idx = ids.length;
    ids.splice(idx, 0, directGroupKey(root.id));
  }
  return ids;
}
// 某个顶层分组下，二级分组和虚拟桶之间的重排：统一走 spliceReorder，再拆回真实的二级分组顺序 + directOrder
function reorderComboSubgroupSlots(parentId, draggedId, targetId) {
  const root = findComboGroup(parentId);
  if (!root) return;
  const subgroups = comboGroupChildren(parentId);
  const next = spliceReorder(comboSubgroupSlotIds(root, subgroups), draggedId, targetId);
  if (!next) return;
  const dKey = directGroupKey(parentId);
  const newDirectIdx = next.indexOf(dKey);
  if (newDirectIdx !== -1) root.directOrder = newDirectIdx;
  const newSubIds = next.filter((id) => id !== dKey);
  const nextGroups = [];
  comboGroupRoots().forEach((r) => {
    nextGroups.push(r);
    if (r.id === parentId) newSubIds.forEach((sid) => { const s = findComboGroup(sid); if (s) nextGroups.push(s); });
    else comboGroupChildren(r.id).forEach((s) => nextGroups.push(s));
  });
  analysisPrefs.comboGroups = nextGroups;
}
// 拖一个分组标题到另一个上：只处理"同级"重排（两个都是顶层，或两个都在同一个顶层下面，
// 包括"未归入二级分组"这个虚拟桶）；跨级/换父不支持，直接忽略——不想因为拖拽手滑就把
// 二级分组挪到别的顶层下面
function moveComboGroup(draggedId, targetId) {
  const draggedRootId = parseDirectGroupKey(draggedId), targetRootId = parseDirectGroupKey(targetId);
  if (draggedRootId || targetRootId) {
    const dragged = findComboGroup(draggedId), target = findComboGroup(targetId);
    const parentId = draggedRootId || (dragged ? dragged.parentId : null);
    const targetParentId = targetRootId || (target ? target.parentId : null);
    if (!parentId || parentId !== targetParentId) return;
    reorderComboSubgroupSlots(parentId, draggedId, targetId);
    return;
  }
  const dragged = findComboGroup(draggedId), target = findComboGroup(targetId);
  if (!dragged || !target || dragged.parentId !== target.parentId) return;
  if (dragged.parentId === null) {
    const order = spliceReorder(comboGroupRoots().map((g) => g.id), draggedId, targetId);
    if (order) rebuildComboGroupsOrder(order);
  } else {
    reorderComboSubgroupSlots(dragged.parentId, draggedId, targetId);
  }
}

let analysisPrefsSaveTimer = null;
async function writeAnalysisPrefs() {
  analysisPrefsSaveTimer = null;
  if (viewingUserId || !sb || !session) return;
  const { error } = await sb.from("journal_schema").update({ analysis_prefs: analysisPrefs }).eq("user_id", session.user.id);
  if (error) {
    console.error(error);
    analysisPrefsError = noteDbError(error)
      ? T("error.dbOutdated")
      : T("prefs.saveError", { msg: error.message });
    render();
  } else if (analysisPrefsError) {
    analysisPrefsError = null;
    render();
  }
}
// 编辑组合时点一下选项就写一次库太吵，本地立刻生效、写库合并成 800ms 一次
function queueSaveAnalysisPrefs() {
  if (viewingUserId) return;
  if (analysisPrefsSaveTimer) clearTimeout(analysisPrefsSaveTimer);
  analysisPrefsSaveTimer = setTimeout(writeAnalysisPrefs, 800);
}
function flushAnalysisPrefs() {
  if (!analysisPrefsSaveTimer) return;
  clearTimeout(analysisPrefsSaveTimer);
  writeAnalysisPrefs();
}
async function saveAnalysisPrefsNow() {
  if (analysisPrefsSaveTimer) { clearTimeout(analysisPrefsSaveTimer); analysisPrefsSaveTimer = null; }
  await writeAnalysisPrefs();
}


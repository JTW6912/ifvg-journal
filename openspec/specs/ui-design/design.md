---
version: "1.0"
name: IFVG Journal UI Contract
description: Existing product theme contract and the approved modern Prop overview direction; no framework migration.
colors:
  primary: "var(--accent)"
  on-primary: "var(--onAccent)"
  foreground: "var(--text)"
  muted-foreground: "var(--muted)"
  background: "var(--bg)"
  surface: "var(--surface)"
  subtle-surface: "var(--surface2)"
  border: "var(--border)"
  focus: "var(--accent)"
  positive: "var(--pnlPos)"
  negative: "var(--pnlNeg)"
  positive-soft: "var(--pnlPosSoft)"
  negative-soft: "var(--pnlNegSoft)"
  destructive: "var(--neg)"
typography:
  heading:
    fontFamily: "var(--fontDisplay)"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 26px
  label:
    fontFamily: "var(--fontUI)"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
  copy:
    fontFamily: "var(--fontBody)"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 22px
  numeric:
    fontFamily: "var(--fontDisplay)"
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1.1
  helper:
    fontFamily: "var(--fontUI)"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.6
spacing:
  step: 4px
  small: 8px
  control-gap: 6px
  section: 16px
  panel: 24px
  large: 32px
rounded:
  small: 6px
  date-cell: 8px
  control: 10px
  prop-panel: 14px
components:
  outline-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: 36px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: 36px
  prop-summary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.prop-panel}"
    padding: "{spacing.panel}"
  field-tooltip:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    typography: "{typography.helper}"
    rounded: "{rounded.date-cell}"
---

# IFVG Journal Design System

## Overview

本规范记录已有项目规则和用户已批准的Prop概览设计，不引入新的产品风格。来源为AGENTS.md第6/10节、style.css、theme-modern.css、palettes.css、i18n.js和本会话的界面确认。用户已明确允许把最终预览进入开发。

项目是原生JavaScript字符串渲染，shadcn/ui仅作为组件设计/交互规范参考，不意味着安装React、Base UI或Tailwind。上面的新组件尺寸仅约束本次modern Prop组件，不能全局覆盖旧组件。

## Colors

布局、配色和明暗相互独立。gold使用基础CSS，另有sky/violet/rose/sunset/ocean/graphite；完整色值以palettes.css为准。light和dark共享同一语义token形状，切换只改变已有变量值。

盈亏必须使用pnlPos/pnlNeg及Soft；pos/neg保留给成功/错误/删除状态。账号个人calPos/calNeg覆盖通过已有ui_prefs同步，不在组件中硬编码。shadcn的accent表示hover表面，与本项目品牌accent不同，新组件须使用带命名空间的语义映射，不覆盖产品原变量。

## Typography

继承fontBody/fontUI/fontDisplay及现有中英字体栈。金额用tabular-nums并保留完整金额、符号和小数；字号允许响应式缩放，但不能以截断/省略号掩盖数值。主净收益约56px、ROI约30px，分区标题15–16px，辅助标识12–14px。

## Layout

classic+gold保持原有markup和像素；仅modern呈现新资金面板。桌面连续三分区：结果与走势、投入与到账、当前账号阶段；窄屏逐区纵向排列。基础节奏4px、主要内距24px。日期选择桌面双月+快捷侧栏，手机单月。375/390px、1280px和1600px均属于检查范围。

## Elevation & Depth

静态面板以细边框和间距分层，不新增深色主卡或重阴影。Tooltip/日期弹层通过body附属根呈现，不放在会裁切的父卡中；它们须让位于现有交易/账户编辑弹窗，不破坏既有z-index和Escape优先级。

## Motion

只允许轻量100–160ms的控件/弹层反馈，遵守prefers-reduced-motion。统计值不虚构动画或趋势；悬停说明允许短意图延迟但键盘焦点应立即可读。禁止动画导致金额或日期状态短暂不一致。

## Shapes

现代Prop采用shadcn/base-nova衍生的6/8/10/14px尺度，来自已批准预览。图标为统一细线SVG，标题图标与字段小圆i各司其职。经典布局的原圆角变量不修改。

## Components

资金面板保留真实财务口径、日期范围、收益走势图和当前账号阶段分布。净收益/投入/到账/ROI/走势/账号状态各配独立i提示，不设集中统计说明菜单，也不恢复“已回本”或每投入1美元的冗余小字。

日期触发器用outline按钮；快捷范围有明确选中/hover/focus/disabled状态。说明支持hover、可悬停阅读、focus、Escape和手机点击；手机目标44px。错误、空范围、零投入、正负收益必须有明确文字/数值表达，不能只靠颜色；金额/折线端点一致。

## Voice & Content

项目文案中英双份，统一通过T()，不能在生产markup中写死预览的中文说明或用户金额。文字简明、描述事实而非暗示未来收益。错误沿用既有dbOutdated/propError机制，不隐藏失败。统计口径说明放在字段附近按需查看。

## Theme & Internationalization

- Theme capability: `light-dark`。已有data-theme开关，不新增system模式。
- Theme toggle: `existing`。复用账户外观菜单/现有主题按钮；隔离原型可有预览专用开关，但不能把预览开关复制进资金面板。
- Internationalization: `enabled`，现有i18n.js及T()/localeTag()/setLang()。
- Supported locales: `zh`, `en`。
- Default locale: `en`为回退；已有journal_lang优先，否则浏览器zh开头选zh，其余en（i18n.js:3380–3424）。这不是固定强制英文。
- Prototype coverage expectation: light/dark、7配色与自定义盈亏色；中英长文案、日期按钮、字段提示和空态均需覆盖。

## Do's and Don'ts

- 保留用户已批准的三分区与可读字号，不另起五卡布局。
- 保留classic+gold，所有新样式命名空间化并限定modern。
- 文案、用户公司名及属性值经T()/esc()；使用现有主题变量而非拷贝截图色值。
- 保留可见键盘焦点，防止hover覆盖选中状态；基础/hover规则用低优先级:where()。
- 不把私人聚合金额、用户截图、认证配置纳入可提交的规范/测试样例；采用合成数据验证。
- 不把UI原型中的数据覆盖限制当成正式产品的日期限制。

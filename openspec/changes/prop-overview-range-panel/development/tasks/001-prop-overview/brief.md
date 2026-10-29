# Task Brief: 001-prop-overview

## Goal

用户能在原有公司/分组范围内查看准确的区间资金回报，通过日期控件和字段i理解结果，而不改动账本。

## Vertical Slice

从现代Prop总览入口，经本地日期选择、纯流水派生、主面板与字段解释，到可验证的显示结果。完整拥有tasks.md的1.1、1.2、1.3、1.4，不拆删或重编号基线任务。

## In Scope

实现requirements.md的R1–R10和acceptance.md的A1–A9；范围/累计点计算、现代面板、中英主题适配、日期/Tooltip生命周期、合成离线回归与审阅。

## Files Allowed

src/03-state.js；src/11d-prop-data.js；src/11e-prop-view.js；src/11g-prop-overview.js；src/14-main-render.js；src/15-events.js；theme-modern.css；i18n.js；test/prop-overview.test.js；dev/prop-overview-check/。详情以scope.json为准。

## Interfaces / Seams

propScoped提供已过滤账号与流水，propSum为口径真源。日期/走势函数为纯函数。新面板只在modern分支组合；全局render与Escape接入必须清理过期浮层并保护原表单。所有金额/说明共用同一派生数据。

## Component Reuse And Extraction

复用T/esc/localeTag/propUsd/propPct/ICONS、现有主题和区域渲染。新增Prop域内面板与日期控制器，六提示共享一个控制器。重复的日期规则和求和规则必须抽取，不能各组件另算。

## State Behavior

零/负投入与空范围如实显示，ROI只在投入大于0时可用。invalid day不可伪造曲线。当前账号不回放历史。已应用范围和选日草稿分离；未完成取消、身份切换、布局/页面切换和重绘均安全收尾。既有错误/加载处理不改。

## TDD Requirement

先增加合成数据的日期/金融/经典渲染回归测试并记录缺失能力导致的失败，再实现。浏览器只加载隔离真实源码，排除自动认证初始化、真实配置和网络。

## Verification Commands

- node --test test/prop-overview.test.js
- npm test
- npm run bundle
- node --check app.js
- node --check i18n.js
- agent_browser检查dev/prop-overview-check的合成页面、日期、提示、主题/中英/手机及classic回归。

## Stop Conditions

入口未通过；超出scope；改变已认可财务含义；需要真实业务写入；未解决测试或独立审阅问题。任何这些情况都不能勾选任务完成。

## Non Goals

不改目录、账号表单、续费、旧图表、经典布局和其他交易功能。不增加服务或运行依赖；不提交业务源码或推送。

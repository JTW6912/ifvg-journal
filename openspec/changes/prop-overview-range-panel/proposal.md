# Modern Prop overview with a unified financial range

## Why

用户已逐轮确认新的资金概览设计，并明确要求开始开发。现有五指标缺乏阅读主次，且没有统一日期范围下的收益积累视图。

## What Changes

仅替换modern总览顶部：净收益与ROI、真实累计走势、收支条形关系、当前账号阶段；增加本地日期范围和字段提示。保留所有既有财务口径及经典界面。

## Capabilities

### New Capabilities

- prop-overview-range: 本地范围统计、现代资金面板、日期与说明交互。

### Modified Capabilities

无持久化或远端接口变化。

## Impact

影响Prop领域纯函数、总览组合、新UI控制器、共享UI状态/渲染收尾、现代样式、中英词典和离线测试。无新的第三方运行依赖。用户只授权规范/任务本地基线提交，不授权推送或上线。

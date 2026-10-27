# 行知网站深度测试报告

测试时间：2026/10/27 18:41:20 至 2026/10/27 18:43:23（Asia/Shanghai）。目标：[行知线上站点](https://lht574.cn/XingZhi)。应用源码：[xingzhi-ai-planner](https://github.com/liangjie798/xingzhi-ai-planner)。

## 执行结果

| 检查 | 结果 |
| --- | --- |
| 本仓库线上自动化 | 118项；106通过，12失败，0跳过 |
| 原项目前端测试 | 84项；见原始日志 |
| 原项目后端测试 | 15项；见原始日志 |
| frontend-lint | 通过；退出码0 |
| frontend-build | 通过；退出码0 |
| publish-history | 通过；退出码0 |

失败保持为红色断言，未使用预期失败掩盖缺陷；失败用例数不等于独立缺陷数。详见[缺陷清单](../docs/DEFECTS.md)和[全部用例](../docs/TEST-CASES.md)。

## 当前能够确认

访客入口、六场景条件提取、大学生身份保留、非法人数和时长拒绝、绘图与活动条件分离、跨访客会话隔离、历史切换与刷新、浏览器后退、两日旅游排程及Markdown/Word下载已有执行断言。资料收藏、核对状态、费用小数和资源冲突记录进行了浏览器往返验证。删点与版本恢复以对应UI用例最终状态为准。

模型自报查询返回未配置/未成功时保持明确说明，规则方案没有被算作大模型成功。票价响应只代表执行当次返回的直达候选，不能将报告中的历史价格当作当前报价。四页axe检测只覆盖稳定页面的WCAG 2.1 A/AA自动规则，不代表人工无障碍认证。

## 失败项

- API-011 — API-011 /conversation-planner rejects JSON null without a server error（failed）
- API-012 — API-012 /tourism-planner rejects JSON null without a server error（failed）
- API-013 — API-013 /planning-evidence rejects JSON null without a server error（failed）
- API-016 — API-016 /model-gateway rejects JSON null without a server error（failed）
- API-035 — API-035 /model-gateway: numeric prompt（failed）
- API-043 — API-043 /tourism-planner: null hourly entry（failed）
- API-084 — API-084 per-group count never replaces total participants（failed）
- API-112 — API-112 invalid hourly calendar date returns a client error（failed）
- API-113 — API-113 impossible coordinate is rejected by the location gateway（failed）
- API-114 — API-114 missing coordinates are rejected instead of silently becoming zero（failed）
- UI-036 — UI-036 legacy dashboard bookmark redirects and keeps view query（failed）
- UI-047 — UI-047 hourly date uses Beijing calendar in a non-China browser timezone（failed）

## 版本和边界

本地源码提交：`070c1a67426790cd2431758a2ffd6440b4f90d8e`；检查时远端HEAD：`070c1a67426790cd2431758a2ffd6440b4f90d8e`。生产站点未暴露构建SHA，线上结果与本地源码结果分别报告，不宣称已证明线上构建与本地相同。

测试不是并发压测；没有线上普通用户/管理员完整凭据，不实施真实用户的增删改、密码重置、实际购票或预约。测试会话只包含QA生成内容。更多未覆盖项和后续人工验收见[测试计划](../docs/TEST-PLAN.md)与[人工用例](../docs/MANUAL-CASES.md)。

## 证据

[机器结果](execution.json)、[源码检查元数据](source-checks.json)、[源码原始日志](source/)、[业务响应与诊断](evidence/)、[页面截图](screenshots/)。原始网络trace、Cookie、鉴权头和浏览器存储未公开。公开目录另附SHA-256清单用于核对交付文件。

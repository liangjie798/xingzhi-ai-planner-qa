# 需求与测试映射

| 需求 | 自动化验收 | 证据 |
| --- | --- | --- |
| 访客、用户与独立管理入口 | UI-002/003/030/031/032；API-100至107 | 登录/访客截图；执行结果 |
| 多轮需求与人数、人群、日期 | API-070至089、120至125；UI-037/038 | tourism-intake、weather-answer、conversation-restored |
| 会话所有者隔离与刷新恢复 | API-108/109；UI-037/044/045 | 断言及恢复截图 |
| 天气、绘图与活动条件分离 | API-081/082/087/111/112；UI-039/047 | hourly-response、weather-answer、hourly-timezone |
| 地点解析与地图 | API-110/113/114/115；UI-038 | district-search、map-mobile |
| 完整时间排程和地点编辑 | UI-038/042/043；原项目tourism-scheduler测试 | live-tourism-route、duplicate-place-aliases、版本恢复截图 |
| 规则降级与真实执行轨迹 | API-085；UI-038 | model-status、browser-diagnostics |
| 文档导出 | UI-038 | markdown-export-check、word-export-check |
| 项目冲突、费用、资料、版本 | UI-043至046 | organizer-collision-budget、执行结果 |
| 响应式与无障碍 | UI-001至017；A11Y-001至004 | 七页移动端截图、四份axe结果 |
| 参数鲁棒性 | API-001至050、061至066、112至116 | 失败断言及缺陷复现步骤 |
| 发布质量 | 源码lint、84项前端测试、15项Java测试、构建、发布检查 | source-checks及source日志 |

编号不连续用于预留扩展空间，不代表缺少结果；实际数量以执行JSON中的用例数组为准。未执行范围单列在MANUAL-CASES，不能据此宣称需求已全部通过。

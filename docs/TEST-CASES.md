# 自动化测试用例与执行明细

运行目标：https://lht574.cn；时间：2026/10/27 22:45:36 至 2026/10/27 22:47:01（北京时间）。

共118项，通过118，失败0，跳过0。这只统计本仓库线上用例，不把应用自身单元测试重复算入。前置条件、操作及预期的组织方式见[测试计划](TEST-PLAN.md)；每项的完整输入与断言在链接的自动化源文件中。

所有接口用例默认独立匿名Cookie上下文；跨访客用例显式使用两个上下文。浏览器默认桌面1440×1000、中文、北京时间；移动端明确覆盖390×844。UI-039和040为明确模拟故障，UI-047使用合成客户端时钟；其余核心规划使用线上真实请求。

| 编号 | 用例与验收目标 | 实际状态 | 耗时ms | 输入、步骤和断言 |
| --- | --- | --- | ---: | --- |
| API-001 | API-001 /conversation-planner rejects malformed JSON | passed | 267 | [实现](../tests/api.spec.mjs) |
| API-011 | API-011 /conversation-planner rejects JSON null without a server error | passed | 38 | [实现](../tests/api.spec.mjs) |
| API-002 | API-002 /tourism-planner rejects malformed JSON | passed | 40 | [实现](../tests/api.spec.mjs) |
| API-012 | API-012 /tourism-planner rejects JSON null without a server error | passed | 32 | [实现](../tests/api.spec.mjs) |
| API-003 | API-003 /planning-evidence rejects malformed JSON | passed | 42 | [实现](../tests/api.spec.mjs) |
| API-013 | API-013 /planning-evidence rejects JSON null without a server error | passed | 32 | [实现](../tests/api.spec.mjs) |
| API-004 | API-004 /activity-venues rejects malformed JSON | passed | 37 | [实现](../tests/api.spec.mjs) |
| API-014 | API-014 /activity-venues rejects JSON null without a server error | passed | 34 | [实现](../tests/api.spec.mjs) |
| API-005 | API-005 /journey-search rejects malformed JSON | passed | 41 | [实现](../tests/api.spec.mjs) |
| API-015 | API-015 /journey-search rejects JSON null without a server error | passed | 33 | [实现](../tests/api.spec.mjs) |
| API-006 | API-006 /model-gateway rejects malformed JSON | passed | 39 | [实现](../tests/api.spec.mjs) |
| API-016 | API-016 /model-gateway rejects JSON null without a server error | passed | 28 | [实现](../tests/api.spec.mjs) |
| API-007 | API-007 /social-research rejects malformed JSON | passed | 37 | [实现](../tests/api.spec.mjs) |
| API-017 | API-017 /social-research rejects JSON null without a server error | passed | 29 | [实现](../tests/api.spec.mjs) |
| API-031 | API-031 /conversation-planner: missing message | passed | 27 | [实现](../tests/api.spec.mjs) |
| API-032 | API-032 /conversation-planner: blank message | passed | 32 | [实现](../tests/api.spec.mjs) |
| API-033 | API-033 /conversation-planner: numeric message | passed | 30 | [实现](../tests/api.spec.mjs) |
| API-034 | API-034 /model-gateway: missing prompt | passed | 40 | [实现](../tests/api.spec.mjs) |
| API-035 | API-035 /model-gateway: numeric prompt | passed | 28 | [实现](../tests/api.spec.mjs) |
| API-036 | API-036 /model-gateway: overlong prompt | passed | 35 | [实现](../tests/api.spec.mjs) |
| API-037 | API-037 /model-gateway: unsupported image | passed | 35 | [实现](../tests/api.spec.mjs) |
| API-038 | API-038 /model-gateway: non-string image | passed | 30 | [实现](../tests/api.spec.mjs) |
| API-039 | API-039 /tourism-planner: missing city and date | passed | 31 | [实现](../tests/api.spec.mjs) |
| API-040 | API-040 /tourism-planner: nonexistent calendar date | passed | 27 | [实现](../tests/api.spec.mjs) |
| API-041 | API-041 /tourism-planner: reversed date range | passed | 27 | [实现](../tests/api.spec.mjs) |
| API-042 | API-042 /tourism-planner: eight-day range | passed | 28 | [实现](../tests/api.spec.mjs) |
| API-043 | API-043 /tourism-planner: null hourly entry | passed | 34 | [实现](../tests/api.spec.mjs) |
| API-044 | API-044 /tourism-planner: non-array hours | passed | 27 | [实现](../tests/api.spec.mjs) |
| API-045 | API-045 /tourism-planner: reversed allowed hours | passed | 30 | [实现](../tests/api.spec.mjs) |
| API-046 | API-046 /planning-evidence: non-string place | passed | 28 | [实现](../tests/api.spec.mjs) |
| API-047 | API-047 /planning-evidence: more than 40 places | passed | 26 | [实现](../tests/api.spec.mjs) |
| API-048 | API-048 /activity-venues: unsupported scene | passed | 27 | [实现](../tests/api.spec.mjs) |
| API-049 | API-049 /journey-search: numeric departure | passed | 26 | [实现](../tests/api.spec.mjs) |
| API-050 | API-050 /journey-search: missing journey fields | passed | 29 | [实现](../tests/api.spec.mjs) |
| API-061 | API-061 image proxy rejects unsupported URL 0 | passed | 30 | [实现](../tests/api.spec.mjs) |
| API-062 | API-062 image proxy rejects unsupported URL 1 | passed | 28 | [实现](../tests/api.spec.mjs) |
| API-063 | API-063 image proxy rejects unsupported URL 2 | passed | 26 | [实现](../tests/api.spec.mjs) |
| API-064 | API-064 image proxy rejects unsupported URL 3 | passed | 25 | [实现](../tests/api.spec.mjs) |
| API-065 | API-065 image proxy rejects unsupported URL 4 | passed | 26 | [实现](../tests/api.spec.mjs) |
| API-066 | API-066 image proxy rejects unsupported URL 5 | passed | 27 | [实现](../tests/api.spec.mjs) |
| API-070 | API-070 complete tourism intake preserves seven university students | passed | 264 | [实现](../tests/api.spec.mjs) |
| API-071 | API-071 invalid revision: 人数改成0人，其他不变 | passed | 30 | [实现](../tests/api.spec.mjs) |
| API-072 | API-072 invalid revision: 人数改成-1人 | passed | 31 | [实现](../tests/api.spec.mjs) |
| API-073 | API-073 invalid revision: 人数改成1.5人 | passed | 33 | [实现](../tests/api.spec.mjs) |
| API-074 | API-074 invalid revision: 人数改成10000人 | passed | 29 | [实现](../tests/api.spec.mjs) |
| API-075 | API-075 invalid revision: 活动时长改成1.5小时，其他不变 | passed | 31 | [实现](../tests/api.spec.mjs) |
| API-076 | API-076 invalid revision: 活动时长改成0小时 | passed | 34 | [实现](../tests/api.spec.mjs) |
| API-077 | API-077 invalid revision: 活动时长改成9小时 | passed | 29 | [实现](../tests/api.spec.mjs) |
| API-078 | API-078 invalid revision: 日期改成2月30日，其他不变 | passed | 33 | [实现](../tests/api.spec.mjs) |
| API-080 | API-080 courtesy preserves conditions without another analysis | passed | 29 | [实现](../tests/api.spec.mjs) |
| API-081 | API-081 drawing two dates does not change the activity plan | passed | 30 | [实现](../tests/api.spec.mjs) |
| API-082 | API-082 drawing Beijing preserves the Hangzhou plan | passed | 29 | [实现](../tests/api.spec.mjs) |
| API-083 | API-083 explicit 14-16 window overrides a broad afternoon | passed | 30 | [实现](../tests/api.spec.mjs) |
| API-084 | API-084 per-group count never replaces total participants | passed | 28 | [实现](../tests/api.spec.mjs) |
| API-085 | API-085 model status reports explicit success or failure | passed | 40 | [实现](../tests/api.spec.mjs) |
| API-086 | API-086 journey keeps activity date separate and reports quote availability | passed | 572 | [实现](../tests/api.spec.mjs) |
| API-087 | API-087 weather is answered without triggering plan generation | passed | 2154 | [实现](../tests/api.spec.mjs) |
| API-088 | API-088 missing destination and date are clarified, not invented | passed | 31 | [实现](../tests/api.spec.mjs) |
| API-089 | API-089 client-supplied today cannot alter the server date | passed | 29 | [实现](../tests/api.spec.mjs) |
| API-100 | API-100 anonymous access denied: /api/v1/admin/overview | passed | 94 | [实现](../tests/api.spec.mjs) |
| API-101 | API-101 anonymous access denied: /api/v1/admin/users | passed | 30 | [实现](../tests/api.spec.mjs) |
| API-102 | API-102 anonymous access denied: /api/v1/admin/searches | passed | 30 | [实现](../tests/api.spec.mjs) |
| API-103 | API-103 anonymous access denied: /api/v1/admin/feedback | passed | 29 | [实现](../tests/api.spec.mjs) |
| API-104 | API-104 anonymous access denied: /api/v1/account/decisions | passed | 26 | [实现](../tests/api.spec.mjs) |
| API-105 | API-105 anonymous access denied: /api/v1/account/model-config/resolve | passed | 29 | [实现](../tests/api.spec.mjs) |
| API-106 | API-106 guest access to admin data is denied | passed | 156 | [实现](../tests/api.spec.mjs) |
| API-107 | API-107 writes without CSRF are rejected | passed | 34 | [实现](../tests/api.spec.mjs) |
| API-108 | API-108 two isolated anonymous sessions cannot read or overwrite each other | passed | 612 | [实现](../tests/api.spec.mjs) |
| API-109 | API-109 malformed conversation snapshot is rejected | passed | 66 | [实现](../tests/api.spec.mjs) |
| API-110 | API-110 nested district resolves to the requested parent | passed | 620 | [实现](../tests/api.spec.mjs) |
| API-111 | API-111 hourly response contains 24 unique, finite hours for the requested date | passed | 679 | [实现](../tests/api.spec.mjs) |
| API-112 | API-112 invalid hourly calendar date returns a client error | passed | 29 | [实现](../tests/api.spec.mjs) |
| API-113 | API-113 impossible coordinate is rejected by the location gateway | passed | 40 | [实现](../tests/api.spec.mjs) |
| API-114 | API-114 missing coordinates are rejected instead of silently becoming zero | passed | 27 | [实现](../tests/api.spec.mjs) |
| API-115 | API-115 unsupported position action returns a client error | passed | 26 | [实现](../tests/api.spec.mjs) |
| API-116 | API-116 wrong HTTP method is rejected without a server crash | passed | 26 | [实现](../tests/api.spec.mjs) |
| API-120 | API-120 scenario intake: 校园运动会 | passed | 32 | [实现](../tests/api.spec.mjs) |
| API-121 | API-121 scenario intake: 体育课 | passed | 33 | [实现](../tests/api.spec.mjs) |
| API-122 | API-122 scenario intake: 社区活动 | passed | 35 | [实现](../tests/api.spec.mjs) |
| API-123 | API-123 scenario intake: 户外训练 | passed | 31 | [实现](../tests/api.spec.mjs) |
| API-124 | API-124 scenario intake: 研学活动 | passed | 30 | [实现](../tests/api.spec.mjs) |
| API-125 | API-125 scenario intake: 旅游规划 | passed | 31 | [实现](../tests/api.spec.mjs) |
| UI-001 | UI-001 desktop route renders without uncaught exceptions: /welcome | passed | 2790 | [实现](../tests/ui.spec.mjs) |
| UI-011 | UI-011 mobile 390px route fits the viewport: /welcome | passed | 5652 | [实现](../tests/ui.spec.mjs) |
| UI-002 | UI-002 desktop route renders without uncaught exceptions: /login | passed | 2415 | [实现](../tests/ui.spec.mjs) |
| UI-012 | UI-012 mobile 390px route fits the viewport: /login | passed | 1226 | [实现](../tests/ui.spec.mjs) |
| UI-003 | UI-003 desktop route renders without uncaught exceptions: /admin/login | passed | 717 | [实现](../tests/ui.spec.mjs) |
| UI-013 | UI-013 mobile 390px route fits the viewport: /admin/login | passed | 3942 | [实现](../tests/ui.spec.mjs) |
| UI-004 | UI-004 desktop route renders without uncaught exceptions: /XingZhi | passed | 336 | [实现](../tests/ui.spec.mjs) |
| UI-014 | UI-014 mobile 390px route fits the viewport: /XingZhi | passed | 1304 | [实现](../tests/ui.spec.mjs) |
| UI-005 | UI-005 desktop route renders without uncaught exceptions: /hourly | passed | 432 | [实现](../tests/ui.spec.mjs) |
| UI-015 | UI-015 mobile 390px route fits the viewport: /hourly | passed | 1180 | [实现](../tests/ui.spec.mjs) |
| UI-006 | UI-006 desktop route renders without uncaught exceptions: /settings | passed | 793 | [实现](../tests/ui.spec.mjs) |
| UI-016 | UI-016 mobile 390px route fits the viewport: /settings | passed | 771 | [实现](../tests/ui.spec.mjs) |
| UI-007 | UI-007 desktop route renders without uncaught exceptions: /account | passed | 1163 | [实现](../tests/ui.spec.mjs) |
| UI-017 | UI-017 mobile 390px route fits the viewport: /account | passed | 723 | [实现](../tests/ui.spec.mjs) |
| A11Y-001 serious or critical WCAG 2.1 A/AA violations: /login | A11Y-001 serious or critical WCAG 2.1 A/AA violations: /login | passed | 2029 | [实现](../tests/ui.spec.mjs) |
| A11Y-002 serious or critical WCAG 2.1 A/AA violations: /XingZhi | A11Y-002 serious or critical WCAG 2.1 A/AA violations: /XingZhi | passed | 1507 | [实现](../tests/ui.spec.mjs) |
| A11Y-003 serious or critical WCAG 2.1 A/AA violations: /hourly | A11Y-003 serious or critical WCAG 2.1 A/AA violations: /hourly | passed | 1080 | [实现](../tests/ui.spec.mjs) |
| A11Y-004 serious or critical WCAG 2.1 A/AA violations: /settings | A11Y-004 serious or critical WCAG 2.1 A/AA violations: /settings | passed | 790 | [实现](../tests/ui.spec.mjs) |
| UI-030 | UI-030 guest login reaches a usable workspace | passed | 2605 | [实现](../tests/ui.spec.mjs) |
| UI-031 | UI-031 invalid login fields use browser validation | passed | 2903 | [实现](../tests/ui.spec.mjs) |
| UI-032 | UI-032 registration form exposes length and username constraints | passed | 2366 | [实现](../tests/ui.spec.mjs) |
| UI-033 | UI-033 empty or whitespace-only conversation cannot be submitted | passed | 1531 | [实现](../tests/ui.spec.mjs) |
| UI-034 | UI-034 Shift+Enter adds a newline without sending | passed | 793 | [实现](../tests/ui.spec.mjs) |
| UI-035 | UI-035 browser Back restores the previously selected workspace | passed | 1708 | [实现](../tests/ui.spec.mjs) |
| UI-036 | UI-036 legacy dashboard bookmark redirects and keeps view query | passed | 1356 | [实现](../tests/ui.spec.mjs) |
| UI-037 | UI-037 separate conversations survive switching and page reload | passed | 2473 | [实现](../tests/ui.spec.mjs) |
| UI-038 | UI-038 two-day tourism end-to-end exports a scheduled route | passed | 5871 | [实现](../tests/ui.spec.mjs) |
| UI-039 | UI-039 hourly data outage displays an error and clears stale data | passed | 597 | [实现](../tests/ui.spec.mjs) |
| UI-040 | UI-040 simulated geolocation and IP fallback failures produce an actionable message | passed | 1621 | [实现](../tests/ui.spec.mjs) |
| UI-041 | UI-041 no serious console animation warnings on fresh workspace | passed | 1435 | [实现](../tests/ui.spec.mjs) |
| UI-042 | UI-042 itinerary does not schedule the same restaurant twice under aliases | passed | 3186 | [实现](../tests/ui.spec.mjs) |
| UI-043 | UI-043 removing a stop updates the document and preserves a previous version | passed | 3615 | [实现](../tests/ui.spec.mjs) |
| UI-044 | UI-044 library create, mark verified, reload and delete only the QA material | passed | 2146 | [实现](../tests/ui.spec.mjs) |
| UI-045 | UI-045 organizer detects resource collisions and persists decimal expenses | passed | 4560 | [实现](../tests/ui.spec.mjs) |
| UI-046 | UI-046 organizer flags an event whose end precedes its start | passed | 4093 | [实现](../tests/ui.spec.mjs) |
| UI-047 | UI-047 hourly date uses Beijing calendar in a non-China browser timezone | passed | 2548 | [实现](../tests/ui.spec.mjs) |

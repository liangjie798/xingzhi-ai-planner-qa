# 已确认问题与复现步骤

> 修复后状态（2026-10-27）：QA-001至QA-007已在应用提交`9976603`修复并部署。原118项线上断言全部通过，未修改测试断言。原应用新增回归后88项前端和16项后端测试通过。下文保留修复前的复现过程，不表示这些错误仍在线上存在。修复对应关系及补充时序验证见[修复复测记录](FIX-VERIFICATION.md)。

本轮发现7类产品问题，均有实际执行依据。P2表示影响业务正确性或可靠性、应安排修复；本轮没有证据支持P0/P1故障判断。测试失败条数与缺陷种类不同：同一校验问题覆盖多条接口；间歇性问题在最后一次运行通过也不等于已修复。

| 编号 | 优先级 | 问题 | 对应自动化 | 复现情况 |
| --- | --- | --- | --- | --- |
| QA-001 | P2 | JSON null/字段类型错误引发500 | API-011/012/013/016/035/043 | 多次稳定复现 |
| QA-002 | P2 | 逐小时接口非法日期引发500 | API-112 | 多次稳定复现 |
| QA-003 | P2 | 缺失与越界坐标被当成有效位置 | API-113/114 | 多次稳定复现 |
| QA-004 | P2 | “器材10套”被静默忽略 | API-084 | 多次稳定复现 |
| QA-005 | P2 | 同一餐厅的别名进入多个行程站点 | UI-042 | 前次运行复现，末次未复现；依赖动态POI排序 |
| QA-006 | P2 | 非中国浏览器时区导致逐小时默认日期偏移 | UI-047 | 固定客户端时钟复现 |
| QA-007 | P2 | 旧入口深链接的查询参数与所显示工作区不一致 | UI-036 | 间歇复现，最后完整运行失败 |

## QA-001：非法输入造成未处理服务端错误

前置：无需登录。发送 `Content-Type: application/json`。

```sh
curl -i https://lht574.cn/conversation-planner -H 'Content-Type: application/json' --data 'null'
curl -i https://lht574.cn/model-gateway -H 'Content-Type: application/json' --data '{"prompt":123}'
```

实际：HTTP500；预期：HTTP400和结构化、可理解的参数错误，不进入业务/上游调用。同样JSON null发生于`/tourism-planner`、`/planning-evidence`、`/model-gateway`；旅游`hours:[null]`也返回500。

根因线索：解析JSON成功后直接访问`body.message`、`body.city`等，数字prompt直接`.trim()`，逐小时记录未判空；这些校验在业务异常捕获外。建议先校验根对象及每个字段/数组元素的类型，统一输出400。证据：[接口复现](../reports/evidence/boundary-reproduction.json)、[执行JSON](../reports/execution.json)。

## QA-002：不存在的日历日期返回500

```sh
curl -i 'https://lht574.cn/api/v1/cities/hourly?cityId=hangzhou&date=2026-02-30'
```

实际：HTTP500；预期：HTTP400并提示日期无效。调用者可以通过直接访问、脚本或被修改的表单发送这个输入，不能只依赖HTML日期控件。根因线索：`CityController.hourly`直接`LocalDate.parse(date)`，未转成参数错误。

## QA-003：坐标校验缺失

```sh
curl -i 'https://lht574.cn/location-gateway?action=reverse'
curl -i 'https://lht574.cn/location-gateway?action=reverse&longitude=999&latitude=999'
```

实际：均HTTP200；缺失坐标变成0、0，越界请求仍返回包含999的“位置对象”。预期：缺失或经度超出[-180,180]、纬度超出[-90,90]直接400，不调用位置上游，也不返回成功对象。根因线索：`Number(null)===0`；仅验证有限数字而不验证范围；上游空地址字段也未判定为无效。证据：[实际响应](../reports/evidence/boundary-reproduction.json)。

## QA-004：器材数量的常见语序未被识别

前置：已确认40人、明后天杭州校园运动会、14至16点、2小时、中强度。向对话补充：`每组5人，器材10套`。

实际：总人数40正确、teamSize=5正确，但equipmentCount缺失。预期：同时保留总人数40、每组5和器材10；无法判断时明确追问，不能静默丢弃。影响体育课的器材站与轮次计算。根因线索：只匹配`10套器材`等数量在前的形式，没有覆盖“器材10套”。源码已有正向语序测试，但没有该变体。

复跑：`npx playwright test -g API-084`。测试代码中保存了完整前置条件与输入。

## QA-005：同店别名重复推荐

1. 新建访客对话，输入`规划杭州明天到后天的旅游路线，七个大学生`。
2. 查看第一天午餐与晚餐，或检查`/tourism-planner`返回的stops。
3. 已观察到`楼外楼（西湖店）`和`楼外楼(杭州西湖风景名胜区店)`分别位于12:00和17:00，但两者地址相同，经纬度均为120.140723、30.250209。

预期：自动推荐的候选去重识别同一实体，除非用户明确要求重复，不因别名把同一店当成新站点。根因线索：内置候选与实时POI合并先按名称精确去重，后续核心名称仍保留不同的括号店名；校准后相同坐标未统一成实体ID。

这是动态数据相关问题；最后完整运行UI-042通过，前次失败观测单独保留在[同店别名证据](../reports/evidence/duplicate-place-observed.json)。不能把单次未出现解释为修复。建议以POI ID优先，名称归一化+近距离/地址作为补充，并加入稳定的别名回归数据。

## QA-006：逐小时页面没有统一使用北京时间

1. 以`America/Los_Angeles`创建浏览器上下文。
2. 将客户端时钟固定到运行当日北京时间00:30（明确合成时钟，未伪装成真实观测天气）。
3. 打开`/hourly`。

本轮预期2026-10-27，实际默认值和min为2026-10-26；max也整体偏移一天。接口和对话使用北京时间，但页面日期用客户端`getFullYear/getMonth/getDate`，导致前后端对“今天”不一致。建议使用统一的Asia/Shanghai日期函数，并核对预报范围两端的包含规则。

证据：[时区值](../reports/evidence/hourly-timezone.json)、[截图](../reports/screenshots/hourly-non-china-timezone.png)。复跑：`npx playwright test -g UI-047`。

## QA-007：旧入口重定向后深链接工作区被恢复过程覆盖

1. 在全新浏览器上下文访问`/dashboard?view=archive`。
2. 等待初始对话读取完成。
3. 检查URL和顶部工作区标题。

实际：URL正确为`/XingZhi?view=archive`，界面却显示“分析台”，而不是“活动档案”。前次运行可通过，最后完整运行稳定停留错误视图20秒。重定向本身成功，问题发生在URL读取与异步`restoreConversation(saved)`对workspaceView的覆盖顺序。

建议明确显式URL参数与已保存workspaceView的优先级，恢复完成后只进行一次统一决策。证据：[补充复现](../reports/evidence/legacy-link-probes.json)、[完整运行UI-036错误](../reports/execution.json)。

## 上轮问题的当前状态

- 学生身份：本轮API-070及实际导出保留“大学生”，原先语义丢失已通过验证。
- 固定09:00/11:30/14:30/18:00兜底：当前返回完整起止时间、交通/休息和营业待确认；旧结论不直接沿用。
- GSAP初始scope警告：UI-041及本轮核心浏览器流程未记录对应警告。
- 地图拥挤和证据关联质量：当前有按日地图和覆盖说明；本轮不把旧观察列为已确认的新缺陷。

## 复测原则

修复后重跑相关ID及主流程，不修改断言为错误现状。QA-005和007还应补充确定性数据/时序测试，避免仅以一次线上通过关闭。本文没有将缺少模型配置、仅返回一种交通报价、待确认开放信息或计划支持范围外的能力误记为系统故障。

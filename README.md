# 行知 · 独立测试与质量报告

[← 返回应用源码仓库](https://github.com/liangjie798/xingzhi-ai-planner) · [访问线上网站](https://lht574.cn/XingZhi) · [测试报告](reports/TEST-REPORT.md) · [缺陷清单](docs/DEFECTS.md)

本仓库专门存放行知网站的测试计划、可执行用例、结果、截图和缺陷记录，与业务源码独立维护。应用主仓库README也提供入口，可以在两个仓库之间直接跳转。

2026年10月31日本地交付：[Windows BAT启动与打包验收](reports/local-delivery-20261031/README.md)。前端119项、后端22项测试通过，lint、格式检查、Next.js和Storybook构建通过；BAT真实启动后健康检查为UP，ZIP解压启动检查通过。[同日12306与航司查询验收](reports/rail-speed-20261031/README.md)另列线上交通结果。

2026年10月27日修复后复测：**118项线上自动化，118通过、0失败、0跳过**；原应用**88项前端测试、16项后端测试、lint、生产构建与发布检查通过**。应用修复提交为`9976603`。修复前曾有106通过、12失败，共7类问题；原始复现步骤和同店别名观测仍保留在缺陷记录中。新增确定性回归覆盖器材语序、同店别名、北京时间和显式深链接优先级，另以750ms延迟会话响应验证三个深链接工作区。

2026年10月30日航司采集可行性实测：[逐家报告](reports/airlines-20261030/README.md)、[65项清单](reports/airlines-20261030/airline-matrix.csv)。本机核实16家具体航班展示报价；存在登录、验证码和未完成适配的站点，不能解读为全航司已接入。

## 查阅材料

| 内容 | 入口 |
| --- | --- |
| 范围、方法、环境与未覆盖项 | [测试计划](docs/TEST-PLAN.md) |
| 每条自动化用例、执行状态与代码入口 | [用例明细](docs/TEST-CASES.md) |
| 缺陷前置条件、步骤、预期/实际和建议 | [缺陷记录](docs/DEFECTS.md) |
| 需求覆盖对应关系 | [需求映射](docs/TRACEABILITY.md) |
| 需专用账户/真实设备的后续验收 | [人工用例](docs/MANUAL-CASES.md) |
| 总结与机器结果 | [测试报告](reports/TEST-REPORT.md)、[JSON](reports/execution.json) |
| 可离线打开筛选的结果页面 | [HTML](reports/index.html)，下载后在浏览器打开 |
| 脱敏业务响应与页面证据 | [JSON证据](reports/evidence/)、[截图](reports/screenshots/) |
| 原应用质量检查 | [元数据](reports/source-checks.json)、[原始日志](reports/source/) |

## 运行

需要Node.js22以上。

```sh
npm ci
npx playwright install chromium
npm test
npm run report
```

`npm test`发现真实问题时退出非零，结果仍写入`reports/execution.json`；之后单独执行`npm run report`生成明细。仅跑接口或界面可用`npm run test:api`、`npm run test:ui`；每次会覆盖当前执行快照，发布前用完整`npm test`获取整套结果。目标默认`https://lht574.cn`，可通过环境变量`BASE_URL`指定其他部署。

本轮Windows使用已安装的Google Chrome（`PW_CHANNEL=chrome`）；默认使用Playwright自带Chromium。日期按运行时北京时间生成；UI-047专门模拟非中国时区。单worker执行，不做并发压测。真实规划不使用假天气；天气503、定位失败和时区时钟的模拟用例分别明确标注。

源码回归在另一个clone中运行。设置`SOURCE_DIR`指向应用仓库、配置Java21后执行`npm run check:source`。此命令会运行原应用的测试，而不是把业务代码或原项目测试复制到本仓库。线上未提供构建SHA，本地提交与线上观测分别报告。

## GitHub Actions

在Actions中手动运行 **Manual live QA**。流程仅由`workflow_dispatch`触发，不自动定时请求生产站点；失败保持红色并上传报告Artifact。当前附带的结果来自本轮本机真实执行，不冒充GitHub Actions已运行结果。

公开前运行`npm run check:public`。原始trace、HAR、Cookie、存储状态和生产环境文件不进入公开仓库；下载文件只保存字节/内容校验结果，未公开整份二进制文档。报告中的票价与天气属于测试当时快照，不能作为当前出行报价或预测。

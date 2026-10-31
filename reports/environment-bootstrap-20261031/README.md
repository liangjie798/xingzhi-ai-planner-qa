# Windows 自动环境准备验收

日期：2026年10月31日。此轮升级已有 BAT 启动器，支持缺失或版本不符时自动下载所需环境，准备后直接启动后端。

## 实现

- 按 `backend/pom.xml` 检查 Java 主版本（21），按 Maven Wrapper 配置检查 Maven 精确版本（3.10.0）。同一 Java 主版本的补丁版本可复用，其他主版本或 CPU 架构不匹配时不使用。
- 匹配的系统安装、Maven Wrapper 缓存或项目私有安装可直接复用；缺失时从 Adoptium / Apache 官方 HTTPS 地址下载，显示百分比、文本进度条和下载大小。
- JDK 使用官方 SHA-256，Maven 使用官方 SHA-512 校验；验证后解压至 `.tools`，不需要管理员权限，不修改系统安装和永久环境变量。下载有重试，未通过校验不进入安装和启动。
- 提供 `-InstallOnly`、`-LocalEnvironment`；保留 `-Port`、`-UseJar`、`-CheckOnly`。`-CheckOnly` 不联网安装，`-UseJar` 不要求 Maven。
- 为 Windows PowerShell 5.1 使用 .NET 内置哈希及 ZIP 解压，避免依赖额外安装模块；增加安装锁，避免多个入口同时覆盖环境。

## 实际结果

| 检查 | 结果 |
| --- | --- |
| 已有系统环境 | 正确识别已有 JDK 21与 Maven 3.10.0，跳过下载 |
| 完整首次准备 | 使用 `-LocalEnvironment -InstallOnly` 实际下载约196 MiB JDK与9.6 MiB Maven，显示进度、完成校验和安装 |
| 本机安装结果 | Temurin JDK 21.0.13+9、Maven 3.10.0，均可执行 |
| 第二次运行 | 直接复用 `.tools` 环境，未重复下载 |
| 自动准备后启动 | 经 BAT 使用项目环境启动后端；测试端口18080健康接口返回 UP |
| 离线回归检查 | 8项通过，覆盖配置读取、版本不符、架构不符、缺失环境、缓存复用、无效校验信息、非HTTPS下载和ZIP路径越界 |

回归入口：业务仓库 `scripts/tests/backend-environment.Tests.ps1`。Windows GitHub Actions 已增加同一检查入口；本报告记录的是本机执行结果，不将未观察到的 Actions 运行作为已通过证据。

首次环境下载及后端 Maven 依赖解析需要网络。重用已安装工具可跳过工具下载，但不保证本地 Maven 缓存已包含所有依赖。`.tools` 不提交 Git，也不放入源码交付包；解压后的首次运行按需自动准备。

[本地启动说明](https://github.com/liangjie798/xingzhi-ai-planner/blob/main/docs/LOCAL-START.md) · [上一轮交付验收](../local-delivery-20261031/README.md)

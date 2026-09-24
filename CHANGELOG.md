# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-09-24

### Fixed

- 修复扩展升级后报错 `No view is registered with id: miniLeekFund.funds`：
  视图创建失败不再中断 `activate`，命令仍可正常注册，并在下一轮刷新时自动补建视图

### Changed

- README 移除写死的 1.0.0 版本号徽章，改为 Marketplace 入口链接
- 补充「从 Marketplace 安装」的具体步骤，删除「待发布」说明

## [1.0.1] - 2026-09-24

### Added

- 侧边栏新增「基金」视图，支持添加/删除基金、中文名称搜索
- 基金行情使用东方财富接口，展示估算净值与涨跌幅
- 新增「Mini Leek Fund」输出面板，行情获取失败时记录原因并提示

### Fixed

- 修复非交易时段新增股票不显示的问题（改为 60 秒刷新一次）
- 修复新浪行情响应无结尾换行时股票解析失败的问题
- 基金接口异常不再影响股票状态栏刷新
- 兼容手填的裸代码（`600519` 自动补全为 `sh600519`），不再整批请求失败
- 单个代码无效时降级为逐个请求，其余股票仍能正常显示
- 侧边栏与状态栏在数据为空时也会刷新，不再卡在旧数据
- 点击状态栏时即使没有行情数据也能列出自选股供切换

## [1.0.0] - 2026-09-11

### Added

- 侧边栏自选股视图，支持添加/删除股票
- 底部状态栏实时显示股票行情
- 支持股票代码和中文名称搜索
- MA5/MA10 均线数据，鼠标悬浮查看
- Blame 伪装功能，在代码行上方显示股票信息
- 右键菜单管理状态栏股票
- 点击状态栏股票快速切换
- 红涨绿跌配色方案（侧边栏）
- 白色涨灰色跌配色方案（状态栏）
- 交易时间自动刷新，非交易时间暂停

### Initial Release

- A股实时行情
- 自选股管理
- 状态栏快捷操作
- Blame 伪装模式

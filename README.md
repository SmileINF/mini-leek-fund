# Mini Leek Fund

📈 **A股自选股 VS Code 插件** - 在编辑器中实时监控股票行情

[![Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue.svg)](https://marketplace.visualstudio.com/items?itemName=smileinf.mini-leek-fund)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)


> 本项目基于 [leek-fund](https://github.com/LeekHub/leek-fund) 精简开发，遵循 BSD-3-Clause 协议。
## 功能特性

- 📊 **侧边栏自选股** - 实时显示股票价格、涨跌幅，红涨绿跌
- 📉 **底部状态栏** - 快速查看重要指数和自选股
- 🔍 **智能搜索** - 支持股票代码和中文名称搜索（如：600519、茅台）
- 📈 **MA5/MA10 指标** - 鼠标悬浮查看 5 日和 10 日均线数据
- 🎭 **Blame 伪装** - 在代码行上方显示股票信息，摸鱼神器
- ⚡ **实时更新** - 交易时间内自动轮询，默认 5 秒刷新

## 安装

### 从 VSIX 安装

1. 下载 `.vsix` 文件
2. 打开 VS Code
3. 按 `Cmd+Shift+P` (macOS) 或 `Ctrl+Shift+P` (Windows/Linux)
4. 输入 `Extensions: Install from VSIX...`
5. 选择下载的文件

### 从 Marketplace 安装

1. 打开 VS Code 扩展面板（`Ctrl+Shift+X` / `Cmd+Shift+X`）
2. 搜索 **Mini Leek Fund**
3. 点击 **Install**

或直接打开：<https://marketplace.visualstudio.com/items?itemName=smileinf.mini-leek-fund>

## 使用方法

### 添加自选股

1. 点击侧边栏的 **A股自选** 图标
2. 点击顶部的 **+** 按钮
3. 输入股票代码或名称（支持中文搜索）
4. 从搜索结果中选择添加

### 管理状态栏

- **添加到状态栏**：右键点击侧边栏股票 → 选择「添加到状态栏」
- **从状态栏移除**：右键点击侧边栏股票 → 选择「从状态栏移除」
- **状态栏交互**：点击底部状态栏的股票，弹出快捷菜单
  - 删除当前股票
  - 切换到其他自选股

### Blame 伪装功能

在代码行上方显示股票信息，看起来像 git blame，摸鱼必备。

1. **开启/关闭**：点击侧边栏顶部的眼睛图标
2. **切换股票**：点击侧边栏顶部的同步图标，循环切换自选股
3. **效果**：只在光标所在行显示，格式如：
   ```
   e44d1da - 贵州茅台 · 1分钟前 · 1888.00 (+1.58%)
   ```

## 配置

在 `settings.json` 中可自定义：

```json
{
  "miniLeekFund.stocks": ["sh000001", "sz399001", "sz399006"],
  "miniLeekFund.statusBarStocks": ["sh000001"],
  "miniLeekFund.interval": 5000
}
```

- `stocks`：自选股代码列表（沪市 `sh` 开头，深市 `sz` 开头）
- `statusBarStocks`：底部状态栏显示的股票
- `interval`：刷新间隔（毫秒），默认 5000

## 常用股票代码

- 上证指数：`sh000001`
- 深证成指：`sz399001`
- 创业板指：`sz399006`
- 沪深300：`sh000300`
- 上证50：`sh000016`

## 数据来源

- 实时行情：新浪财经 API
- K线数据：新浪财经 API
- 股票搜索：新浪股票建议 API

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run compile

# 监听模式
npm run watch

# 打包
vsce package
```

## 许可证

MIT License

## 致谢

- [LeekHub/leek-fund](https://github.com/LeekHub/leek-fund) - 灵感来源
- [新浪财经](https://finance.sina.com.cn/) - 数据接口

## 反馈

如有问题或建议，欢迎提交 Issue 或 Pull Request。

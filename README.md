# AutoTestX

AutoTestX 是一款极简主义、人工智能赋能的自动化探索性及回归测试工具。它允许 QA 与开发人员打破传统的脚本式 UI 测试，通过简单的自然语言即可驱动浏览器完成自动测试与验证。

## 🎯 项目目标与愿景 (Goals and Vision)

传统的 UI 自动化测试往往伴随着繁琐的元素定位（Selectors 定位符失效）、繁重的脚本代码维护（Test Scripts 衰退）以及极高的配置门槛。
AutoTestX 致力于**重新定义 UI 自动化**：
- **无代码交互**：不再编写枯燥的选择器代码。你想要它做什么操作，直接用自然语言描述。
- **动态寻址与自我纠错**：基于最前沿的大语言模型 (LLM) 和视觉能力，自动理解界面元素结构。只要按钮人眼能看见，大模型就能找到并点击。哪怕页面结构改版，只要业务流程没变，测试用例依旧能跑通！
- **可视化结果**：以原生桌面端的体验无缝运行测试，并记录完整操作日志以供审计和追踪。

## 特别鸣谢 (Acknowledgements)

AutoTestX 并不是凭空产生的，我们的开发极大地受惠于开源社区两个出色的项目。在此我们向它们背后的作者与贡献者表达真挚的感谢：

- **[ValueCell-ai/ClawX](https://github.com/ValueCell-ai/ClawX)**: 
  AutoTestX 的桌面端基石。ClawX 提供了一个无懈可击的跨平台 Electron + React 19 + TypeScript 的架构模板。得益于其精巧的前后端通信 (IPC) 设计、优雅的 UI 交互库以及完善的构建流，AutoTestX 在立项之初获得了极速起跑的动力。

- **[openclaw/openclaw](https://github.com/openclaw/openclaw)**:
  ClawX 能够大放异彩，离不开其底层的强大基建——OpenClaw。作为一个开源的 AI Agent 运行时环境，OpenClaw 为处理复杂的模型调度、工具调用乃至代理生命周期管理提供了卓越的范式。借助于这套体系的思想，AutoTestX 得以优雅地在本地融合 Electron 与 Browser Agent。
  
- **[browser-use/qa-use](https://github.com/browser-use/qa-use)**:
  AutoTestX 自动化能力的大脑与引擎。`qa-use` 作为构建于开源大模型测试先锋理念之上的库，以难以置信的简洁性封装了 Playwright 和 LLM (Agent)，让 "指挥浏览器" 变得像对话一样简单。没有它突破性的 Agent 机制，AutoTestX 的愿景将难以落地。

## 🚀 快速开始

### 前置条件
- Node.js (推荐 v20以上)
- pnpm (请使用 `corepack enable` 激活正确版本的 pnpm)

### 安装配置
1. **克隆代码库并初始化项目**：
   ```bash
   git clone https://github.com/YourUsername/AutoTestX.git
   cd AutoTestX
   pnpm run init
   ```
   *(注意: `init` 脚本不仅会安装 Node 依赖，还会为你自动下载配置 Python `uv` 等本地运行时所需的环境。)*

2. **配置 API 密钥并启动**：
   为了能够驱动强大的大语言模型，你需要一个 `OPENAI_API_KEY`。后续我们将支持基于界面的高级配置，但目前你可以通过环境变量注入：
   ```bash
   OPENAI_API_KEY="sk-..." pnpm dev
   ```

3. 运行后，AutoTestX 桌面客户端和附带的本地网关服务将同时开启。

### 构建与打包 (Build & Deployment)

如果你希望将 AutoTestX 打包为独立的单体应用散发或在正式环境中分发，你可以使用内置的构建命令。得益于 Electron 的跨平台特性，你可以在对应平台生成 macOS / Windows 的可执行包。

1. **构建与检查**
   打包前我们建议你先使用 TypeCheck 与代码校验确保代码健康：
   ```bash
   pnpm run typecheck
   pnpm lint
   ```

2. **完整打包应用**
   ```bash
   pnpm build
   ```
   **注意**: 首次运行打包可能需要下载平台所对应的 Electron 二进制外壳文件，视网络环境而定请耐心等待。
   打包完成后，你可以在根目录自动生成的 `release/` 或者 `dist/` 目录下找到你的特定平台安装程序 (如 `.dmg` 或 `.exe`)，然后双击正常安装即可。

### 如何使用
1. 在侧边栏导航到 **测试用例 (Test Cases)** 模块。
2. 点击新建用例，在步骤中输入如："跳转到 baidu.com，搜索 'AutoTestX'"。
3. 点击 **运行用例**，你可以看到 AI 代理自动弹出一个浏览器并执行你分配的任务。
4. 运行结束后，前往 **测试报告 (Reports)** 翻阅 AI 是如何思考并采取行动完成目标的详细日志。

## 🛠 技术栈
- **核心框架**: Electron 
- **前端呈现**: React 19 (Vite 构建), Tailwind CSS, shadcn/ui
- **驱动控制**: browser-use (Playwright via Agentic AI)
- **数据持久化**: better-sqlite3 (本地 SQLite 存储)
- **状态管理**: Zustand

## 📝 贡献
该项目正处于最初的 Alpha 草创阶段。欢迎一切形式的改进、Issue 与 PR 交流！

---
*AutoTestX - 测试未来，始于语言。*

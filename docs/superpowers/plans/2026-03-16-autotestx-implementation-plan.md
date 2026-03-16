# AutoTestX 实现计划

> **对于智能代理（Agentic Workers）：** 必填：使用 superpowers:subagent-driven-development（如果有子代理可用）或 superpowers:executing-plans 来实施此计划。实施步骤使用复选框（`- [ ]`）语法进行跟踪。

**目标：** 构建 AutoTestX 的第一阶段（MVP），这是一个自然语言驱动的 UI 测试自动化工具。通过将 BrowserUse 的能力集成到 ClawX 桌面应用的 fork 版本中来实现。

**架构：** 带有 React 前端的 Electron 桌面应用。主进程处理网关管理和 SQLite 数据库操作。浏览器执行使用 Electron 主进程中的 `browser-use` ，通过 `TestRunner` 类实现。

**技术栈：** Electron, React 19, TypeScript, Tailwind CSS, shadcn/ui, BrowserUse, better-sqlite3, Zustand。

---

## Chunk 1: 基础框架搭建和 Clone ClawX

**涉及文件：**
- 创建：`package.json`（基于 ClawX 修改）
- 创建：`electron/services/test-db.ts`
- 修改：`electron/gateway/manager.ts`
- 创建：`electron/gateway/test-runner.ts`

- [ ] **步骤 1：从 ClawX 复制基础文件**
运行：`cp -r refs/ClawX/* . && cp -r refs/ClawX/.* . 2>/dev/null || true`
预期结果：主代码库已填入 ClawX 的基础模板代码。

- [ ] **步骤 2：清理 Git 并安装初始依赖**
运行：`rm -rf .git && git init`
运行：`pnpm install better-sqlite3 browser-use`
运行：`pnpm install -D @types/better-sqlite3`

- [ ] **步骤 3：创建数据库服务 (`electron/services/test-db.ts`)**
编写最小化实现代码，初始化 SQLite 并创建 `test_cases`（测试用例）、`test_suites`（测试套件）和 `test_reports`（测试报告）数据表。

- [ ] **步骤 4：创建 Test Runner 基础存根 (`electron/gateway/test-runner.ts`)**
编写最小化实现代码，暴露一个包含空 `runTest` 方法的 `TestRunner` 类。

- [ ] **步骤 5：提交基础框架搭建代码**
运行：`git add . && git commit -m "chore: setup foundation and database"`

## Chunk 2: 测试用例管理 (数据层和状态层)

**涉及文件：**
- 修改：`electron/main/index.ts`（用于暴露数据库的 IPC 通信）
- 创建：`src/types/test.ts`
- 创建：`src/stores/test-store.ts`

- [ ] **步骤 1：定义 TypeScript 类型 (`src/types/test.ts`)**
定义 `TestCase`、`Assertion`、`TestResult` 和 `TestSuite`。

- [ ] **步骤 2：在主进程实现数据库的 IPC 处理程序**
暴露 `ipcMain.handle` 端点，例如 `test:createCase`，`test:listCases`。

- [ ] **步骤 3：实现前端状态管理 Store (`src/stores/test-store.ts`)**
为测试用例创建 Zustand store，通过 `window.ipcRenderer` 与主进程通信。

- [ ] **步骤 4：提交状态和 IPC 代码**
运行：`git add electron/main/index.ts src/types/test.ts src/stores/test-store.ts`
运行：`git commit -m "feat: ipc and state for test cases"`

## Chunk 3: 测试用例管理 (UI 层)

**涉及文件：**
- 创建：`src/pages/TestCase/index.tsx`
- 创建：`src/components/test-editor/index.tsx`
- 修改：`src/App.tsx`（添加 TestCase 页面的路由）

- [ ] **步骤 1：创建测试用例编辑器组件**
构建 `Textarea` 和输入框组件，用于编写自然语言步骤和断言。

- [ ] **步骤 2：创建测试用例页面**
列出现有的测试用例列表，并提供新增用例的按钮。

- [ ] **步骤 3：添加导航和路由**
在 ClawX 的侧边栏/导航栏中添加"测试用例"菜单项，并设置 React Router 路由。

- [ ] **步骤 4：提交 UI 代码**
运行：`git add src/pages/TestCase src/components/test-editor src/App.tsx`
运行：`git commit -m "feat: test case UI"`

## Chunk 4: BrowserUse 集成和执行引擎

**涉及文件：**
- 修改：`electron/gateway/test-runner.ts`
- 修改：`electron/main/index.ts`
- 修改：`src/stores/test-store.ts`

- [ ] **步骤 1：实现 TestRunner 执行逻辑**
集成 `browser-use` 的 `Agent`。实现 `runTest`，将 `TestCase.steps` 映射为 Agent 的提示词（prompts）。

- [ ] **步骤 2：执行引擎的 IPC 处理程序**
在主进程中添加 `test:run` IPC 处理程序，该程序调用 `TestRunner` 并通过 `webContents.send` 将实时执行日志发回渲染进程。

- [ ] **步骤 3：用于执行日志的前端 Store Hooks**
在前端 Zustand store 中实现监听器，用来捕获执行日志和状态。

- [ ] **步骤 4：提交执行引擎代码**
运行：`git add electron/gateway/test-runner.ts electron/main/index.ts src/stores/test-store.ts`
运行：`git commit -m "feat: browser-use test execution integration"`

## Chunk 5: 执行预览与报告 UI

**涉及文件：**
- 创建：`src/pages/Executor/index.tsx`
- 创建：`src/components/test-runner/index.tsx`
- 修改：`src/App.tsx`

- [ ] **步骤 1：创建执行预览组件**
构建专门的 UI，展示测试执行日志、当前状态，以及一个用于模拟浏览器窗口的占位区。

- [ ] **步骤 2：创建执行器页面**
集成预览组件，允许用户触发测试执行并查看实时结果。

- [ ] **步骤 3：链接到导航栏**
将执行器页面添加到应用主路由。

- [ ] **步骤 4：提交预览 UI 代码**
运行：`git add src/pages/Executor src/components/test-runner src/App.tsx`
运行：`git commit -m "feat: execution preview UI"`

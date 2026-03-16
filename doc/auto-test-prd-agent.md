# AutoTestX - AI自动化测试工具

## 目标

基于ClawX桌面客户端 + BrowserUse AI Agent，实现自然语言驱动的自动化测试工具。

## 技术栈（必须）

- **桌面框架**: Electron 40+ (直接fork ClawX改造)
- **前端**: React 19 + TypeScript + Tailwind + shadcn/ui
- **AI执行**: BrowserUse SDK (browser-use/qa-use的execution engine)
- **状态管理**: Zustand
- **数据库**: SQLite (本地) via better-sqlite3

## 核心架构

```
┌─────────────────────────────────────────┐
│           Electron Main Process         │
│  • Gateway进程管理 (复用ClawX)          │
│  • 浏览器实例池 (BrowserUse)            │
│  • Channel适配器 (Telegram/Discord/飞书)│
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│           React Renderer                │
│  • 测试用例/套件管理界面                │
│  • 执行预览窗口 (iframe/embedded)       │
│  • 报告查看器                          │
└─────────────────────────────────────────┘
```

## 文件结构（直接复用ClawX）

```
ClawX/
├── electron/
│   ├── gateway/           # 修改：注入BrowserUse测试执行器
│   │   └── test-runner.ts
│   ├── channels/          # 新增：测试命令handler
│   │   └── test-commands.ts
│   └── services/
│       └── test-db.ts     # 新增：SQLite测试数据
├── src/
│   ├── pages/
│   │   ├── TestCase/      # 新增：测试用例管理
│   │   ├── Suite/         # 新增：测试套件管理
│   │   ├── Executor/      # 新增：执行监控
│   │   └── Report/        # 新增：报告查看
│   ├── components/
│   │   ├── test-editor/   # 新增：用例编辑器
│   │   ├── test-runner/   # 新增：执行预览
│   │   └── report-view/   # 新增：报告组件
│   └── stores/
│       └── test-store.ts  # 新增：测试状态管理
├── skills/                # 新增：测试专用skill
│   └── test-assert/
└── tests/                 # 保留ClawX原有
```

## 实现顺序

### Phase 1: 基础设施

1. **Fork ClawX** - 直接clone，保留所有功能
2. **集成BrowserUse** - 在gateway进程中添加测试执行器
   ```typescript
   // electron/gateway/test-runner.ts
   import { BrowserUse } from 'browser-use';

   export class TestRunner {
     private browser = new BrowserUse();
     
     async runTest(testCase: TestCase): Promise<TestResult> {
       const agent = new Agent(this.browser);
       return await agent.execute(testCase.steps, testCase.assertions);
     }
   }
   ```
3. **创建测试数据表** - SQLite存储用例/套件/报告
   ```sql
   CREATE TABLE test_cases (
     id TEXT PRIMARY KEY,
     name TEXT,
     steps TEXT,  -- JSON
     assertions TEXT, -- JSON
     created_at INTEGER
   );
   
   CREATE TABLE test_suites (
     id TEXT PRIMARY KEY,
     name TEXT,
     case_ids TEXT, -- JSON array
     created_at INTEGER
   );
   
   CREATE TABLE test_reports (
     id TEXT PRIMARY KEY,
     suite_id TEXT,
     results TEXT, -- JSON
     status TEXT,
     created_at INTEGER
   );
   ```

### Phase 2: 核心功能

4. **测试用例页面** - CRUD界面
   - 自然语言编辑器（textarea + 实时解析预览）
   - 变量支持 `{{variable}}`
   - 断言条件编辑器

5. **测试套件页面** - 组织用例
   - 套件创建/编辑
   - 拖拽排序用例

6. **执行引擎集成**
   - BrowserUse执行测试
   - 实时日志输出到UI
   - 截图捕获

### Phase 3: 桌面集成

7. **系统Tray** - 快速执行测试
8. **通知** - 测试完成/失败系统通知

### Phase 4: Channel集成

9. **复用ClawX Channel模块** - 添加测试命令handler
   ```typescript
   // electron/channels/test-commands.ts
   export const testCommands = {
     '/run': async (suiteName: string) => {
       const suite = db.getSuite(suiteName);
       return await testRunner.runSuite(suite);
     },
     '/runone': async (caseName: string) => {
       const testCase = db.getTestCase(caseName);
       return await testRunner.runTest(testCase);
     },
     '/report': async (id: string) => {
       return db.getReport(id);
     },
     '/list': async () => {
       return db.listSuites();
     }
   };
   ```
10. **飞书/Discord/Telegram适配** - 复用现有channel代码

## 关键接口

### TestRunner API
```typescript
interface TestCase {
  id: string;
  name: string;
  steps: string[];        // 自然语言步骤
  assertions: Assertion[];
  variables: Record<string, string>;
}

interface Assertion {
  type: 'text' | 'visible' | 'count' | 'screenshot';
  expected: string;
  timeout?: number;
}

interface TestResult {
  caseId: string;
  status: 'pass' | 'fail' | 'error';
  duration: number;
  screenshots: string[];
  logs: string[];
  error?: string;
}

interface TestSuite {
  id: string;
  name: string;
  caseIds: string[];
  concurrency: number;
  retryOnFail: number;
}
```

### Channel消息格式
```typescript
// 命令
'/run 冒烟测试' → 执行名为"冒烟测试"的套件

// 响应
'▶ 执行中: 登录测试 (1/5)...'
'✅ 登录测试 - 通过 (2.3s)'
'❌ 商品搜索 - 失败: 元素未找到'
'📊 报告: http://localhost:3000/report/xxx'
```

## 需要复用的ClawX能力

| 能力 | 复用方式 |
|------|----------|
| Gateway进程管理 | 直接使用 |
| Channel模块 | 扩展command handler |
| 技能系统 | 添加test-assert skill |
| 设置页面 | 添加测试配置项 |
| 主题系统 | 直接使用 |
| 多语言i18n | 直接使用 |

## 测试Skill实现

```typescript
// skills/test-assert/index.ts
export const testAssertSkill = {
  name: 'test-assert',
  description: '测试断言技能',
  
  async assertText(page, expected: string) {
    const content = await page.content();
    return content.includes(expected);
  },
  
  async assertVisible(page, selector: string) {
    const el = await page.$(selector);
    return el && await el.isVisible();
  },
  
  async waitFor(page, selector: string, timeout = 10000) {
    await page.waitForSelector(selector, { timeout });
  }
};
```

## 数据流

```
用户输入自然语言用例
        │
        ▼
解析为AST (steps + assertions)
        │
        ▼
存储到SQLite
        │
        ▼
执行时取出 → BrowserUse.Agent
        │
        ▼
逐步执行 + 截图
        │
        ▼
断言验证
        │
        ▼
生成报告 → SQLite + 文件系统
        │
        ▼
推送到Channel + 通知
```

## 部署

- **开发**: `pnpm dev` (同ClawX)
- **打包**: `pnpm build && pnpm package`
- **安装**: 直接安装.clawx文件

## 优先级

MVP:
1. Fork ClawX
2. BrowserUse集成
3. 用例CRUD
4. 执行 + 报告

后续:
5. 套件管理
6. Channel命令
7. 定时任务
8. 团队协作
9. API集成
10. 性能监控

---

**核心原则**: 先让测试能跑起来，再完善功能。不要过度设计UI，先保证功能可用。

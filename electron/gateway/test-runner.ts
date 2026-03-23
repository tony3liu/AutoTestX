import { Agent, BrowserProfile, BrowserSession } from 'browser-use';
import { ChatOpenAI } from 'browser-use/llm/openai';
import { getProviderService } from '../services/providers/provider-service';
import { logger } from '../utils/logger';
import { getSetting } from '../utils/store';

export class TestRunner {
  private browserSession: BrowserSession;

  constructor() {
    const profile = new BrowserProfile({
      headless: false,
      // Force start maximized to avoid layout truncation
      extra_chromium_args: ['--start-maximized'],
      viewport: null, // Let browser define viewport from maximized state
    });
    this.browserSession = new BrowserSession({ browser_profile: profile });
  }

  async runTest(testCase: any): Promise<any> {
    const startTime = Date.now();
    let status: 'pass' | 'fail' | 'error' = 'error';
    let error: string | undefined = undefined;
    let duration = 0;

    try {
      // Keep guidelines concise — code-level mechanisms handle the rest
      const verificationGuideline = `
[Elements & Navigation Guidelines]
- 【激活状态依赖】：输入文本前按钮可能置灰。**输入后必须重新核实状态**，确认亮起后再点。
- 【精确目标识别】：严禁点击功能冲突的相邻元素（如“齿轮” vs “箭头”）。注意：**“齿轮”或“三横线”代表配置，绝非提交**。
- 【及早判定 & 结束】：断言满足即调用 'done'。

[Strategic Self-Correction & Occlusion Handling]
- 【遮挡与浮层自救 (Escape Mechanism)】：
    1. **识别误点结果**：若操作后弹出了非预期的侧边栏（如“参数配置”）、弹窗或下拉菜单，且该浮层遮挡了你的后续目标，**说明你刚才点错了**。
    2. **逃生策略**：此时第一优先级是**关闭浮层**。通过寻找“关闭/X”按钮、点击浮层外的遮挡区或 Esc 键退出。
    3. **回溯重试**：退出干扰浮层后，重新扫描页面证据，确保视口清晰后再点击正确的目标。
- 【故障深度分析】：如果关键流程死锁，请判定是否存在产品 Bug 或严重布局缺陷（如遮挡），并在结论中明确标注。
`;

      const combinedTask = [
        ...testCase.steps,
        "Please verify the following assertions:",
        ...testCase.assertions.map((a: any) => `- ${a.expected}`),
        verificationGuideline
      ].join('\n');

      // Fetch the API key and model from the provider service
      const providerService = getProviderService();
      let defaultAccountId = await providerService.getDefaultAccountId();
      let apiKey = process.env.OPENAI_API_KEY || '';
      let modelName = testCase.modelId || 'gpt-4o';
      let baseUrl: string | undefined = undefined;

      // If test case has a specific vendor/account, use that instead of default
      const effectiveAccountId = testCase.accountId || defaultAccountId;

      if (effectiveAccountId) {
        const account = await providerService.getAccount(effectiveAccountId);
        const storedKey = await providerService.getLegacyProviderApiKey(effectiveAccountId);
        
        if (storedKey) {
          apiKey = storedKey;
        }
        
        if (account) {
          // Use Case-specific model if set, otherwise use account default model
          modelName = testCase.modelId || account.model || modelName;
          baseUrl = account.baseUrl;
          logger.info(`Using provider account: ${account.label} (${account.vendorId}), model: ${modelName}`);
        }
      } else {
        logger.warn('No default provider account found, falling back to environment variables.');
      }

      if (!apiKey || apiKey === 'dummy_key' || !apiKey.trim()) {
        logger.error('No valid OpenAI API key found in settings or environment.');
      }

      // ===== Optimization: Dedicated Vision Model for Agent =====
      // The user can configure a high-end vision model specifically for the agent
      // to handle complex UI reasoning separately from the test's target model.
      const visionAgentModel = await getSetting('visionAgentModel');
      let agentLlm: ChatOpenAI;

      if (visionAgentModel && visionAgentModel !== modelName) {
        logger.info(`Switching Agent to dedicated vision model: ${visionAgentModel}`);
        agentLlm = await this.getAgentLLM(visionAgentModel, apiKey, baseUrl);
      } else {
        agentLlm = new ChatOpenAI({
          model: modelName,
          apiKey: apiKey,
          baseURL: baseUrl,
        });
      }

      // ---------- Step progress tracking ----------
      let lastActionName = '';
      let sameActionCount = 0;
      const stepLogs: string[] = [];

      // ===== Build ground_truth for Judge =====
      const groundTruth = testCase.assertions
        .map((a: any, i: number) => `${i + 1}. ${a.expected}`)
        .join('\n');

      const agent = new Agent({
        task: combinedTask,
        llm: agentLlm,
        browser_session: this.browserSession,
        use_vision: true,

        // ===== Optimization: Vision & Attributes =====
        vision_detail_level: 'high',
        include_attributes: [
          'title', 'aria-label', 'placeholder', 'class', 'role', 
          'type', 'name', 'id', 'disabled', 'aria-disabled', 'data-testid'
        ],

        // ===== Judge Configuration =====
        use_judge: true,
        ground_truth: groundTruth,
        include_recent_events: true,

        // ===== Optimization 1: Loop detection =====
        loop_detection_enabled: true,
        loop_detection_window: 5,

        // ===== Optimization 2: Planning =====
        enable_planning: true,
        planning_replan_on_stall: 3,

        // ===== Optimization 3: Strict Step-by-Step (As requested) =====
        // Set to 1 to force the agent to re-observe the screen after EVERY single action.
        max_actions_per_step: 1,

        // ===== Optimization 4: Tolerance =====
        max_failures: 10,

        // ===== Optimization 5: Step callback =====
        register_new_step_callback: (summary, output, step) => {
          try {
            const actions = output?.action || [];
            const actionNames = actions.map((a: any) => {
              if (!a) return 'unknown';
              const keys = Object.keys(a);
              return keys.find(k => k !== 'action_name' && k !== 'observation') || 'action';
            });
            const currentAction = actionNames.join('+') || 'wait';
            stepLogs.push(`Step ${step}: ${currentAction}`);
            logger.info(`[TestRunner] Step ${step}: ${currentAction}`);

            if (currentAction === lastActionName) {
              sameActionCount++;
            } else {
              sameActionCount = 0;
              lastActionName = currentAction;
            }
          } catch (e) {
            logger.error(`[TestRunner] Error in step callback: ${e}`);
          }
        },
      });

      // ===== Optimization 6: Dynamic max steps based on task complexity =====
      const stepCount = testCase.steps?.length || 0;
      const assertionCount = testCase.assertions?.length || 0;
      // Base: 25 steps, +3 per test step, +5 per assertion (for navigation + verification)
      const maxSteps = Math.max(25, 25 + stepCount * 3 + assertionCount * 5);
      logger.info(`[TestRunner] Running with maxSteps=${maxSteps} (steps=${stepCount}, assertions=${assertionCount})`);

      const history = await agent.run(maxSteps);
      
      const isSuccessful = history.is_successful();
      const finalResult = history.final_result();
      const agentErrors = history.errors().filter(e => e !== null);
      
      // Get all performed actions for logs
      const actionNames = history.action_names();
      const logs = [
        `Executed ${history.number_of_steps()} steps (max: ${maxSteps}).`,
        ...actionNames.map((name, i) => {
          return `Step ${i + 1}: ${name}`;
        }),
        `Final result: ${finalResult || 'None'}`,
      ];

      const judgement = history.judgement() as any;
      let failureReason = undefined;
      let isValidated = null;
      
      if (judgement) {
        failureReason = judgement.failure_reason || judgement.reasoning || judgement.reason;
        if (judgement.verdict !== undefined) {
          isValidated = judgement.verdict === true;
        }
      }
      
      duration = history.total_duration_seconds() || (Date.now() - startTime) / 1000;
      
      // Determine real status: if judge exists and says false, it's failed regardless of agent claim
      const finalPass = isValidated !== null ? isValidated : isSuccessful;
      status = finalPass ? 'pass' : (agentErrors.length > 0 ? 'error' : 'fail');
      error = agentErrors.length > 0 ? agentErrors.join('; ') : undefined;

      return {
        caseId: testCase.id,
        status,
        duration,
        screenshots: [], // Future: fetch from history.screenshot_paths()
        logs,
        error,
        failureReason,
      };
    } catch (e: any) {
      logger.error(`Error running test case: ${e.message}`);
      return {
        caseId: testCase.id,
        status: 'error',
        duration: (Date.now() - startTime) / 1000,
        screenshots: [],
        logs: [],
        error: e.message,
      };
    }
  }

  /**
   * Intelligently resolve the LLM for the Agent.
   * Priority:
   * 1. Direct credentials (visionAgentKey, visionAgentBaseUrl, visionAgentModel)
   * 2. Dedicated Account (visionAgentAccountId + optional visionAgentModel override)
   * 3. Fallback to default credentials from the test runner
   */
  private async getAgentLLM(fallbackModel: string, fallbackKey: string, fallbackUrl?: string): Promise<ChatOpenAI> {
    try {
      const providerService = getProviderService();
      
      const directKey = await getSetting('visionAgentKey');
      const directUrl = await getSetting('visionAgentBaseUrl');
      const directModel = await getSetting('visionAgentModel');

      // 1. Direct Credentials
      if (directKey && directKey.trim()) {
        logger.info(`Resolved Agent model via direct credentials: ${directModel || fallbackModel}`);
        return new ChatOpenAI({
          model: directModel || fallbackModel,
          apiKey: directKey.trim(),
          baseURL: directUrl || undefined,
        });
      }

      // 2. Dedicated Account
      const agentAccountId = await getSetting('visionAgentAccountId');
      if (agentAccountId) {
        const account = await providerService.getAccount(agentAccountId);
        const apiKey = await providerService.getLegacyProviderApiKey(agentAccountId);
        if (account && apiKey) {
          logger.info(`Resolved Agent model via dedicated account: ${account.label}`);
          return new ChatOpenAI({
            model: directModel || account.model || fallbackModel,
            apiKey,
            baseURL: account.baseUrl,
          });
        }
      }

      // 3. Fallback to existing logic
      logger.info(`Agent using default test credentials: ${directModel || fallbackModel}`);
      return new ChatOpenAI({
        model: directModel || fallbackModel,
        apiKey: fallbackKey,
        baseURL: fallbackUrl,
      });
    } catch (e) {
      logger.error(`Failed to resolve Agent LLM: ${e}`);
      return new ChatOpenAI({
        model: fallbackModel,
        apiKey: fallbackKey,
        baseURL: fallbackUrl,
      });
    }
  }
}

export const testRunner = new TestRunner();

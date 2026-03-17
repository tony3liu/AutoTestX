import { Agent, BrowserProfile, BrowserSession } from 'browser-use';
import { ChatOpenAI } from 'browser-use/llm/openai';
import { getProviderService } from '../services/providers/provider-service';
import { logger } from '../utils/logger';

export class TestRunner {
  private browserSession: BrowserSession;

  constructor() {
    const profile = new BrowserProfile({
      headless: false, // For visual debugging during tests
      viewport: { width: 1280, height: 720 },
    });
    this.browserSession = new BrowserSession({ browser_profile: profile });
  }

  async runTest(testCase: any): Promise<any> {
    const startTime = Date.now();
    let status: 'pass' | 'fail' | 'error' = 'error';
    let error: string | undefined = undefined;
    let duration = 0;

    try {
      const verificationGuideline = `
[Verification Guidelines]
- 优先考虑【语义正确性】和【页面证据】，而非文本的 100% 精确匹配。
- 【视觉识别容错】：由于使用 OCR 视觉识别，中文容易出现字形相似（如“渴/喝”）、读音相似（如“曦/希”）或分词误差。
- 如果识别出的文字在字形、读音或中文语境下高度相似，且根据页面位置能确认是同一个元素，必须判定为【匹配成功】。
- 关注【业务流程】：如果按钮已点击、页面已跳转或核心数据已呈现，不要因为微小的视觉识别偏差而判定失败。
- 对于数量要求（如“前3个”），需严格核对数量。
- 在判定失败前，请结合 DOM 原始文本和视觉截图进行“二次确认”，排除由于 OCR 误读导致的“假阴性”失败。
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

      const llm = new ChatOpenAI({
        model: modelName,
        apiKey: apiKey,
        baseURL: baseUrl,
      });

      const agent = new Agent({
        task: combinedTask,
        llm,
        browser_session: this.browserSession,
        use_vision: true
      });

      // Execute the agent!
      const maxSteps = 15;
      const history = await agent.run(maxSteps);
      
      const isSuccessful = history.is_successful();
      const finalResult = history.final_result();
      const agentErrors = history.errors().filter(e => e !== null);
      
      // Get all performed actions for logs
      const actionNames = history.action_names();
      const logs = [
        `Executed ${history.number_of_steps()} steps.`,
        ...actionNames.map((name, i) => {
          logger.info(`Step ${i + 1}: ${name}`);
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
}

export const testRunner = new TestRunner();

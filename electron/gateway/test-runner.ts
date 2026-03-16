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
      const combinedTask = [
        ...testCase.steps.map((s: any) => s.action),
        "Please verify the following assertions:",
        ...testCase.assertions.map((a: any) => `- ${a.expected}`)
      ].join('\n');

      // Fetch the API key and model from the provider service
      const providerService = getProviderService();
      const defaultAccountId = await providerService.getDefaultAccountId();
      let apiKey = process.env.OPENAI_API_KEY || '';
      let modelName = 'gpt-4o';
      let baseUrl: string | undefined = undefined;

      if (defaultAccountId) {
        const account = await providerService.getAccount(defaultAccountId);
        const storedKey = await providerService.getLegacyProviderApiKey(defaultAccountId);
        
        if (storedKey) {
          apiKey = storedKey;
        }
        
        if (account) {
          modelName = account.model || modelName;
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
      
      duration = history.total_duration_seconds() || (Date.now() - startTime) / 1000;
      status = isSuccessful ? 'pass' : (agentErrors.length > 0 ? 'error' : 'fail');
      error = agentErrors.length > 0 ? agentErrors.join('; ') : undefined;

      return {
        caseId: testCase.id,
        status,
        duration,
        screenshots: [], // Future: fetch from history.screenshot_paths()
        logs,
        error,
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

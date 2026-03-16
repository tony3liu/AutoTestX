import { Agent, BrowserProfile, BrowserSession } from 'browser-use';
import { ChatOpenAI } from 'browser-use/llm/openai';

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
    const combinedTask = [
      ...testCase.steps.map((s: any) => s.action),
      "Please verify the following assertions:",
      ...testCase.assertions.map((a: any) => `- ${a.expected}`)
    ].join('\n');

    // In a real implementation we would fetch the API key/base url from settings
    const llm = new ChatOpenAI({
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
    });

    const agent = new Agent({
      task: combinedTask,
      llm,
      browser_session: this.browserSession,
      use_vision: true
    });

    try {
      // Execute the agent!
      const maxSteps = 15;
      const history = await agent.run(maxSteps);
      
      const isSuccessful = history.is_successful();
      const finalResult = history.final_result();
      const errors = history.errors().filter(e => e !== null);
      
      // Get all performed actions for logs
      const actionNames = history.action_names();
      const logs = [
        `Executed ${history.number_of_steps()} steps.`,
        ...actionNames.map((name, i) => `Step ${i + 1}: ${name}`),
        `Final result: ${finalResult || 'None'}`,
      ];
      
      return {
        caseId: testCase.id,
        status: isSuccessful ? 'pass' : (errors.length > 0 ? 'error' : 'fail'),
        duration: history.total_duration_seconds() || 0,
        screenshots: [], // We could fetch from history.screenshot_paths() but need to handle file reading
        logs: logs,
        error: errors.length > 0 ? errors.join('; ') : undefined,
      };
    } catch (error: any) {
      return {
        caseId: testCase.id,
        status: 'error',
        duration: 0,
        screenshots: [],
        logs: [],
        error: error.message
      };
    }
  }
}

export const testRunner = new TestRunner();

export interface TestCase {
  id: string;
  name: string;
  steps: string[];
  assertions: Assertion[];
  variables: Record<string, string>;
  modelId?: string;
  accountId?: string;
  createdAt?: number;
}

export interface Assertion {
  type: 'text' | 'visible' | 'count' | 'screenshot';
  expected: string;
  timeout?: number;
}

export interface OmitTestResult {
  caseId: string;
  status: 'pass' | 'fail' | 'error';
  duration: number;
  screenshots: string[];
  logs: string[];
  error?: string;
  failureReason?: string;
  reportId?: string;
  createdAt?: number;
  test_case_name?: string;
}

export type TestResult = OmitTestResult;

export interface TestSuite {
  id: string;
  name: string;
  description?: string;
  testCaseIds: string[];
  concurrency: number;
  retryOnFail: number;
  createdAt?: number;
}

export interface TestTask {
  id: string;
  name: string;
  suiteId?: string;
  status: 'running' | 'completed' | 'failed' | 'error';
  totalCount: number;
  passCount: number;
  failCount: number;
  errorCount: number;
  createdAt: number;
  reports?: TestResult[];
}
export interface DashboardStats {
  caseCount: number;
  passRate: number;
  failCount24h: number;
  avgDuration: number;
  recentActivity: { date: string; total: number; pass: number }[];
}

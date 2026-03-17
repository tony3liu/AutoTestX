import { create } from 'zustand';
import { invokeIpc } from '@/lib/api-client';
import type { TestCase, TestSuite, TestResult, TestTask, DashboardStats } from '@/types/test';

interface TestState {
  // Data
  testCases: TestCase[];
  testSuites: TestSuite[];
  testReports: TestResult[];
  testTasks: TestTask[];
  dashboardStats: DashboardStats | null;
  
  // Loading States
  isLoading: boolean;
  isSaving: boolean;
  runningTestCaseId: string | null;
  runningSuiteId: string | null;
  error: string | null;

  // Actions
  fetchTestCases: () => Promise<void>;
  fetchTestReports: () => Promise<void>;
  fetchTestSuites: () => Promise<void>;
  fetchTestTasks: () => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
  
  createTestCase: (testCase: Omit<TestCase, 'createdAt'>) => Promise<TestCase>;
  updateTestCase: (testCase: TestCase) => Promise<TestCase>;
  deleteTestCase: (id: string) => Promise<void>;
  
  createTestSuite: (suite: Omit<TestSuite, 'createdAt'>) => Promise<TestSuite>;
  updateTestSuite: (suite: TestSuite) => Promise<TestSuite>;
  deleteTestSuite: (id: string) => Promise<void>;
  
  runTest: (testCaseId: string) => Promise<TestResult>;
  runSuite: (suiteId: string) => Promise<{ taskId: string }>;
  fetchTaskDetails: (taskId: string) => Promise<TestTask>;
  translateReason: (text: string) => Promise<string>;
  
  updateReportStatus: (reportId: string, status: string) => Promise<void>;
  deleteReport: (reportId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
}

export const useTestStore = create<TestState>((set, get) => ({
  testCases: [],
  testSuites: [],
  testReports: [],
  testTasks: [],
  dashboardStats: null,
  
  isLoading: false,
  isSaving: false,
  runningTestCaseId: null,
  runningSuiteId: null,
  error: null,

  fetchTestCases: async () => {
    try {
      set({ isLoading: true, error: null });
      const cases = await invokeIpc<TestCase[]>('test:listCases');
      set({ testCases: cases, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch test cases', isLoading: false });
    }
  },

  fetchTestReports: async () => {
    try {
      set({ isLoading: true, error: null });
      const reports = await invokeIpc<TestResult[]>('test:listReports');
      set({ testReports: reports, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch test reports', isLoading: false });
    }
  },

  fetchTestSuites: async () => {
    try {
      set({ isLoading: true, error: null });
      const suites = await invokeIpc<TestSuite[]>('test:listSuites');
      set({ testSuites: suites, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch suites', isLoading: false });
    }
  },

  fetchTestTasks: async () => {
    try {
      set({ isLoading: true, error: null });
      const tasks = await invokeIpc<TestTask[]>('test:listTasks');
      set({ testTasks: tasks, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch tasks', isLoading: false });
    }
  },

  fetchDashboardStats: async () => {
    try {
      const stats = await invokeIpc<DashboardStats>('test:getDashboardStats');
      set({ dashboardStats: stats });
    } catch (err: any) {
      console.error('Failed to fetch dashboard stats', err);
    }
  },

  createTestCase: async (testCase) => {
    try {
      set({ isSaving: true, error: null });
      const created = await invokeIpc<TestCase>('test:createCase', testCase);
      set((state) => ({ 
        testCases: [created, ...state.testCases],
        isSaving: false 
      }));
      return created;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create test case', isSaving: false });
      throw err;
    }
  },

  updateTestCase: async (testCase) => {
    try {
      set({ isSaving: true, error: null });
      const updated = await invokeIpc<TestCase>('test:updateCase', testCase);
      set((state) => ({
        testCases: state.testCases.map((c) => (c.id === updated.id ? updated : c)),
        isSaving: false,
      }));
      return updated;
    } catch (err: any) {
      set({ error: err.message || 'Failed to update test case', isSaving: false });
      throw err;
    }
  },

  deleteTestCase: async (id: string) => {
    try {
      set({ isSaving: true, error: null });
      await invokeIpc('test:deleteCase', id);
      set((state) => ({
        testCases: state.testCases.filter((c) => c.id !== id),
        isSaving: false,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete test case', isSaving: false });
      throw err;
    }
  },

  createTestSuite: async (suite) => {
    try {
      set({ isSaving: true, error: null });
      const created = await invokeIpc<TestSuite>('test:createSuite', suite);
      set((state) => ({ 
        testSuites: [created, ...state.testSuites],
        isSaving: false 
      }));
      return created;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create suite', isSaving: false });
      throw err;
    }
  },

  updateTestSuite: async (suite) => {
    try {
      set({ isSaving: true, error: null });
      const updated = await invokeIpc<TestSuite>('test:updateSuite', suite);
      set((state) => ({
        testSuites: state.testSuites.map((s) => (s.id === updated.id ? updated : s)),
        isSaving: false,
      }));
      return updated;
    } catch (err: any) {
      set({ error: err.message || 'Failed to update suite', isSaving: false });
      throw err;
    }
  },

  deleteTestSuite: async (id: string) => {
    try {
      set({ isSaving: true, error: null });
      await invokeIpc('test:deleteSuite', id);
      set((state) => ({
        testSuites: state.testSuites.filter((s) => s.id !== id),
        isSaving: false,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete suite', isSaving: false });
      throw err;
    }
  },

  runTest: async (testCaseId: string) => {
    try {
      set({ runningTestCaseId: testCaseId, error: null });
      const result = await invokeIpc<TestResult>('test:run', testCaseId);
      set((state) => ({
        testReports: [result, ...state.testReports],
        runningTestCaseId: null
      }));
      get().fetchTestTasks(); // Refresh tasks list
      return result;
    } catch (err: any) {
      set({ error: err.message || 'Failed to run test', runningTestCaseId: null });
      throw err;
    }
  },

  runSuite: async (suiteId: string) => {
    try {
      set({ runningSuiteId: suiteId, error: null });
      const result = await invokeIpc<{ taskId: string }>('test:runSuite', suiteId);
      set({ runningSuiteId: null });
      get().fetchTestTasks();
      return result;
    } catch (err: any) {
      set({ error: err.message || 'Failed to run suite', runningSuiteId: null });
      throw err;
    }
  },

  fetchTaskDetails: async (taskId: string) => {
    try {
      const task = await invokeIpc<TestTask>('test:getTaskDetails', taskId);
      return task;
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch task details' });
      throw err;
    }
  },

  translateReason: async (text: string) => {
    return invokeIpc<string>('test:translateReason', text);
  },

  updateReportStatus: async (reportId, status) => {
    await invokeIpc('test:updateReportStatus', { reportId, status });
  },

  deleteReport: async (reportId) => {
    await invokeIpc('test:deleteReport', reportId);
  },

  deleteTask: async (taskId) => {
    await invokeIpc('test:deleteTask', taskId);
    set(state => ({
      testTasks: state.testTasks.filter(t => t.id !== taskId)
    }));
  },
}));

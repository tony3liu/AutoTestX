import { create } from 'zustand';
import { invokeIpc } from '@/lib/api-client';
import type { TestCase, TestSuite, TestResult } from '@/types/test';

interface TestState {
  // Data
  testCases: TestCase[];
  testSuites: TestSuite[];
  testReports: TestResult[];
  
  // Loading States
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  fetchTestCases: () => Promise<void>;
  createTestCase: (testCase: Omit<TestCase, 'createdAt'>) => Promise<TestCase>;
  
  // Future Actions
  fetchTestSuites?: () => Promise<void>;
  createTestSuite?: (suite: Omit<TestSuite, 'createdAt'>) => Promise<TestSuite>;
  runTest?: (testCaseId: string) => Promise<TestResult>;
}

export const useTestStore = create<TestState>((set, get) => ({
  testCases: [],
  testSuites: [],
  testReports: [],
  
  isLoading: false,
  isSaving: false,
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
}));

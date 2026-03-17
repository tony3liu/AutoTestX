import { create } from 'zustand';
import { invokeIpc } from '@/lib/api-client';

export interface TestSchedule {
  id: string;
  name: string;
  testCaseId?: string;
  testSuiteId?: string;
  cronExpr: string;
  enabled: boolean;
  lastRunAt?: number;
  createdAt: number;
}

interface ScheduleState {
  schedules: TestSchedule[];
  isLoading: boolean;
  isSaving: boolean;
  
  fetchSchedules: () => Promise<void>;
  createSchedule: (input: Omit<TestSchedule, 'id' | 'createdAt' | 'enabled'>) => Promise<void>;
  updateSchedule: (id: string, patch: Partial<TestSchedule>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  toggleSchedule: (id: string, enabled: boolean) => Promise<void>;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedules: [],
  isLoading: false,
  isSaving: false,

  fetchSchedules: async () => {
    set({ isLoading: true });
    try {
      const schedules = await invokeIpc<TestSchedule[]>('test:listSchedules');
      set({ schedules });
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  createSchedule: async (input) => {
    set({ isSaving: true });
    try {
      const newSchedule = await invokeIpc<TestSchedule>('test:createSchedule', {
        ...input,
        enabled: true
      });
      set({ schedules: [newSchedule, ...get().schedules] });
    } catch (err) {
      console.error('Failed to create schedule:', err);
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  updateSchedule: async (id, patch) => {
    set({ isSaving: true });
    try {
      const updated = await invokeIpc<TestSchedule>('test:updateSchedule', id, patch);
      set({
        schedules: get().schedules.map(s => s.id === id ? updated : s)
      });
    } catch (err) {
      console.error('Failed to update schedule:', err);
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  deleteSchedule: async (id) => {
    try {
      await invokeIpc('test:deleteSchedule', id);
      set({
        schedules: get().schedules.filter(s => s.id !== id)
      });
    } catch (err) {
      console.error('Failed to delete schedule:', err);
      throw err;
    }
  },

  toggleSchedule: async (id, enabled) => {
    try {
      const updated = await invokeIpc<TestSchedule>('test:updateSchedule', id, { enabled });
      set({
        schedules: get().schedules.map(s => s.id === id ? updated : s)
      });
    } catch (err) {
      console.error('Failed to toggle schedule:', err);
      throw err;
    }
  }
}));

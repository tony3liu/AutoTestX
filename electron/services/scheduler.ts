import cron, { ScheduledTask } from 'node-cron';
import { testDb } from './test-db';
import { logger } from '../utils/logger';
import crypto from 'node:crypto';
import { testJobService } from './test-job';

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

class TestScheduler {
  private activeJobs: Map<string, ScheduledTask> = new Map();

  constructor() {}

  public init() {
    try {
      const schedules = this.listSchedules();
      for (const schedule of schedules) {
        if (schedule.enabled) {
          this.scheduleJob(schedule);
        }
      }
      logger.info(`Initialized test scheduler with ${this.activeJobs.size} active jobs`);
    } catch (err) {
      logger.error('Failed to initialize test scheduler:', err);
    }
  }

  public listSchedules(): TestSchedule[] {
    const stmt = testDb.getDb().prepare('SELECT * FROM test_schedules ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      testCaseId: row.test_case_id,
      testSuiteId: row.test_suite_id,
      cronExpr: row.cron_expr,
      enabled: Boolean(row.enabled),
      lastRunAt: row.last_run_at,
      createdAt: row.created_at
    }));
  }

  public createSchedule(schedule: Omit<TestSchedule, 'createdAt' | 'id'>): TestSchedule {
    const id = crypto.randomUUID();
    const now = Date.now();
    const newSchedule = { ...schedule, id, createdAt: now } as TestSchedule;
    const stmt = testDb.getDb().prepare(`
      INSERT INTO test_schedules (id, name, test_case_id, test_suite_id, cron_expr, enabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      newSchedule.id,
      newSchedule.name,
      newSchedule.testCaseId || null,
      newSchedule.testSuiteId || null,
      newSchedule.cronExpr,
      newSchedule.enabled ? 1 : 0,
      now
    );
    
    if (newSchedule.enabled) {
      this.scheduleJob(newSchedule);
    }
    
    return newSchedule;
  }

  public updateSchedule(id: string, patch: Partial<TestSchedule>) {
    const current = this.getSchedule(id);
    if (!current) throw new Error('Schedule not found');
    
    const updated = { ...current, ...patch };
    
    const stmt = testDb.getDb().prepare(`
      UPDATE test_schedules 
      SET name = ?, test_case_id = ?, test_suite_id = ?, cron_expr = ?, enabled = ?
      WHERE id = ?
    `);
    stmt.run(
      updated.name,
      updated.testCaseId || null,
      updated.testSuiteId || null,
      updated.cronExpr,
      updated.enabled ? 1 : 0,
      id
    );
    
    this.stopJob(id);
    if (updated.enabled) {
      this.scheduleJob(updated);
    }
    
    return updated;
  }

  public deleteSchedule(id: string) {
    this.stopJob(id);
    const stmt = testDb.getDb().prepare('DELETE FROM test_schedules WHERE id = ?');
    stmt.run(id);
  }

  private getSchedule(id: string): TestSchedule | undefined {
    const stmt = testDb.getDb().prepare('SELECT * FROM test_schedules WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      testCaseId: row.test_case_id,
      testSuiteId: row.test_suite_id,
      cronExpr: row.cron_expr,
      enabled: Boolean(row.enabled),
      lastRunAt: row.last_run_at,
      createdAt: row.created_at
    };
  }

  private scheduleJob(schedule: TestSchedule) {
    this.stopJob(schedule.id);
    
    try {
      const task = cron.schedule(schedule.cronExpr, async () => {
        logger.info(`Running scheduled test: ${schedule.name}`);
        
        // Update last run at
        const now = Date.now();
        testDb.getDb().prepare('UPDATE test_schedules SET last_run_at = ? WHERE id = ?').run(now, schedule.id);
        
        try {
          if (schedule.testSuiteId) {
            await testJobService.runSuite(schedule.testSuiteId);
          } else if (schedule.testCaseId) {
            await testJobService.runTestCase(schedule.testCaseId);
          }
        } catch (err) {
          logger.error(`Scheduled test run failed: ${schedule.name}`, err);
        }
      });
      
      this.activeJobs.set(schedule.id, task);
    } catch (err) {
      logger.error(`Failed to schedule job ${schedule.id}:`, err);
    }
  }

  private stopJob(id: string) {
    const task = this.activeJobs.get(id);
    if (task) {
      task.stop();
      this.activeJobs.delete(id);
    }
  }
}

export const testScheduler = new TestScheduler();

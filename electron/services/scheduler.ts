import cron, { ScheduledTask } from 'node-cron';
import { testDb } from './test-db';
import { testRunner } from '../gateway/test-runner';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export interface TestSchedule {
  id: string;
  name: string;
  testCaseId: string;
  cronExpr: string;
  enabled: boolean;
  lastRunAt?: number;
  createdAt: number;
}

class TestScheduler {
  private activeJobs: Map<string, ScheduledTask> = new Map();

  constructor() {
    // Initialized lazily to ensure DB and Runner are ready
  }

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
      cronExpr: row.cron_expr,
      enabled: Boolean(row.enabled),
      lastRunAt: row.last_run_at,
      createdAt: row.created_at
    }));
  }

  public createSchedule(schedule: Omit<TestSchedule, 'createdAt' | 'id'>): TestSchedule {
    const id = crypto.randomUUID();
    const now = Date.now();
    const newSchedule = { ...schedule, id, createdAt: now };
    const stmt = testDb.getDb().prepare(`
      INSERT INTO test_schedules (id, name, test_case_id, cron_expr, enabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      newSchedule.id,
      newSchedule.name,
      newSchedule.testCaseId,
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
      SET name = ?, test_case_id = ?, cron_expr = ?, enabled = ?
      WHERE id = ?
    `);
    stmt.run(
      updated.name,
      updated.testCaseId,
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
        logger.info(`Running scheduled test: ${schedule.name} (case: ${schedule.testCaseId})`);
        
        // Update last run at
        const now = Date.now();
        testDb.getDb().prepare('UPDATE test_schedules SET last_run_at = ? WHERE id = ?').run(now, schedule.id);
        
        // Fetch test case and run
        const caseStmt = testDb.getDb().prepare('SELECT * FROM test_cases WHERE id = ?');
        const row = caseStmt.get(schedule.testCaseId) as any;
        if (row) {
          const testCase = {
            ...row,
            steps: JSON.parse(row.steps || '[]'),
            assertions: JSON.parse(row.assertions || '[]'),
            modelId: row.model_id,
            accountId: row.vendor_id
          };
          
          try {
            const result = await testRunner.runTest(testCase);
            
            // Save result to DB
            const insertStmt = testDb.getDb().prepare(`
              INSERT INTO test_reports (id, case_id, status, error, duration, screenshots, logs, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const reportId = crypto.randomUUID();
            insertStmt.run(
              reportId,
              result.caseId,
              result.status,
              result.error || null,
              result.duration,
              JSON.stringify(result.screenshots || []),
              JSON.stringify(result.logs || []),
              Date.now()
            );
          } catch (runErr) {
            logger.error(`Scheduled test run failed: ${schedule.name}`, runErr);
          }
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

import { testDb } from './test-db';
import { testRunner } from '../gateway/test-runner';
import { logger } from '../utils/logger';
import crypto from 'node:crypto';

export class TestJobService {
  async runTestCase(caseId: string, taskId?: string): Promise<any> {
    const caseStmt = testDb.getDb().prepare('SELECT * FROM test_cases WHERE id = ?');
    const row = caseStmt.get(caseId) as any;
    if (!row) throw new Error(`Test case not found: ${caseId}`);

    const testCase = {
      ...row,
      steps: JSON.parse(row.steps || '[]'),
      assertions: JSON.parse(row.assertions || '[]'),
      modelId: row.model_id,
      accountId: row.vendor_id
    };

    // If no taskId, create a standalone one
    let targetTaskId = taskId;
    if (!targetTaskId) {
      targetTaskId = crypto.randomUUID();
      testDb.getDb().prepare(`
        INSERT INTO test_tasks (id, name, status, total_count, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(targetTaskId, `Run: ${testCase.name}`, 'running', 1, Date.now());
    }

    try {
      const result = await testRunner.runTest(testCase);
      const reportId = crypto.randomUUID();
      const now = Date.now();
      
      testDb.getDb().prepare(`
        INSERT INTO test_reports (id, case_id, task_id, status, error, failure_reason, duration, screenshots, logs, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        reportId, result.caseId, targetTaskId, result.status, result.error || null,
        result.failureReason || null,
        result.duration, JSON.stringify(result.screenshots || []),
        JSON.stringify(result.logs || []), now
      );

      // If standalone task, update it
      if (!taskId) {
        const finalStatus = (result.status === 'pass') ? 'completed' : 'failed';
        testDb.getDb().prepare(`
          UPDATE test_tasks SET status = ?, pass_count = ?, fail_count = ?, error_count = ? WHERE id = ?
        `).run(finalStatus, result.status === 'pass' ? 1 : 0, result.status === 'fail' ? 1 : 0, result.status === 'error' ? 1 : 0, targetTaskId);
      }

      return { ...result, reportId, taskId: targetTaskId, createdAt: now };
    } catch (err: any) {
      if (!taskId) {
        testDb.getDb().prepare('UPDATE test_tasks SET status = ?, error_count = 1 WHERE id = ?').run('error', targetTaskId);
      }
      throw err;
    }
  }

  async runSuite(suiteId: string): Promise<string> {
    const suiteStmt = testDb.getDb().prepare('SELECT * FROM test_suites WHERE id = ?');
    const suiteRow = suiteStmt.get(suiteId) as any;
    if (!suiteRow) throw new Error(`Suite not found: ${suiteId}`);

    const caseIds = JSON.parse(suiteRow.case_ids || '[]') as string[];
    if (caseIds.length === 0) {
      throw new Error(`测试套件 [${suiteRow.name}] 为空 (用例列表为空)。请编辑该套件并勾选要包含的测试用例后重新保存。`);
    }

    const taskId = crypto.randomUUID();
    testDb.getDb().prepare(`
      INSERT INTO test_tasks (id, name, suite_id, status, total_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(taskId, `Suite: ${suiteRow.name}`, suiteId, 'running', caseIds.length, Date.now());

    // Sequential background execution
    (async () => {
      let passed = 0; let failed = 0; let errored = 0;
      for (const caseId of caseIds) {
        try {
          const result = await this.runTestCase(caseId, taskId);
          if (result.status === 'pass') passed++;
          else if (result.status === 'fail') failed++;
          else errored++;
          
          testDb.getDb().prepare(`
            UPDATE test_tasks SET pass_count = ?, fail_count = ?, error_count = ? WHERE id = ?
          `).run(passed, failed, errored, taskId);
        } catch (err) {
          errored++;
          testDb.getDb().prepare(`UPDATE test_tasks SET error_count = ? WHERE id = ?`).run(errored, taskId);
        }
      }
      const finalStatus = (failed + errored) === 0 ? 'completed' : 'failed';
      testDb.getDb().prepare('UPDATE test_tasks SET status = ? WHERE id = ?').run(finalStatus, taskId);
    })().catch(err => logger.error('Suite background run exploded:', err));

    return taskId;
  }
}

export const testJobService = new TestJobService();

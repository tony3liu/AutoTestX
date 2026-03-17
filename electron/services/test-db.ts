import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

class TestDbService {
  private db: Database.Database;

  constructor() {
    const userDataPath = app.getPath('userData');
    const dbDir = path.join(userDataPath, 'autotestx');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    const dbPath = path.join(dbDir, 'autotestx.db');
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS test_cases (
        id TEXT PRIMARY KEY,
        name TEXT,
        steps TEXT,
        assertions TEXT,
        model_id TEXT,
        vendor_id TEXT,
        created_at INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS test_suites (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        case_ids TEXT,
        concurrency INTEGER DEFAULT 1,
        retry_on_fail INTEGER DEFAULT 0,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS test_tasks (
        id TEXT PRIMARY KEY,
        name TEXT,
        suite_id TEXT,
        status TEXT,
        total_count INTEGER DEFAULT 0,
        pass_count INTEGER DEFAULT 0,
        fail_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        created_at INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS test_reports (
        id TEXT PRIMARY KEY,
        case_id TEXT,
        task_id TEXT,
        status TEXT,
        error TEXT,
        duration REAL,
        screenshots TEXT,
        logs TEXT,
        failure_reason TEXT,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS test_schedules (
        id TEXT PRIMARY KEY,
        name TEXT,
        test_case_id TEXT,
        test_suite_id TEXT,
        cron_expr TEXT,
        enabled INTEGER DEFAULT 1,
        last_run_at INTEGER,
        created_at INTEGER
      );
    `);

    // Migration for test_tasks and task_id
    try {
      this.db.prepare('SELECT id FROM test_tasks LIMIT 1').get();
    } catch {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS test_tasks (
          id TEXT PRIMARY KEY,
          name TEXT,
          suite_id TEXT,
          status TEXT,
          total_count INTEGER DEFAULT 0,
          pass_count INTEGER DEFAULT 0,
          fail_count INTEGER DEFAULT 0,
          error_count INTEGER DEFAULT 0,
          created_at INTEGER
        )
      `);
    }

    try {
      this.db.prepare('SELECT task_id FROM test_reports LIMIT 1').get();
    } catch {
      try {
        this.db.exec('ALTER TABLE test_reports ADD COLUMN task_id TEXT');
      } catch (err) {
        console.error('Failed to add task_id to test_reports:', err);
      }
    }

    try {
      this.db.prepare('SELECT test_suite_id FROM test_schedules LIMIT 1').get();
    } catch {
      try {
        this.db.exec('ALTER TABLE test_schedules ADD COLUMN test_suite_id TEXT');
      } catch (err) {
        console.error('Failed to add test_suite_id to test_schedules:', err);
      }
    }

    try {
      this.db.prepare('SELECT description FROM test_suites LIMIT 1').get();
    } catch {
      try {
        this.db.exec('ALTER TABLE test_suites ADD COLUMN description TEXT');
      } catch (err) {
        console.error('Failed to add description to test_suites:', err);
      }
    }
    
    try {
      this.db.prepare('SELECT concurrency FROM test_suites LIMIT 1').get();
    } catch {
      try {
        this.db.exec('ALTER TABLE test_suites ADD COLUMN concurrency INTEGER DEFAULT 1');
        this.db.exec('ALTER TABLE test_suites ADD COLUMN retry_on_fail INTEGER DEFAULT 0');
      } catch (err) {
        console.error('Failed to migrate test_suites for concurrency:', err);
      }
    }
    try {
      this.db.prepare('SELECT failure_reason FROM test_reports LIMIT 1').get();
    } catch {
      try {
        this.db.exec('ALTER TABLE test_reports ADD COLUMN failure_reason TEXT');
      } catch (err) {
        console.error('Failed to add failure_reason to test_reports:', err);
      }
    }

    try {
      this.db.prepare('SELECT model_id FROM test_cases LIMIT 1').get();
    } catch {
      try {
        this.db.exec('ALTER TABLE test_cases ADD COLUMN model_id TEXT');
        this.db.exec('ALTER TABLE test_cases ADD COLUMN vendor_id TEXT');
      } catch (err) {
        console.error('Failed to migrate test_cases table:', err);
      }
    }

    // Quick migration trick for development: check if case_id exists, if not recreate
    try {
      this.db.prepare('SELECT case_id FROM test_reports LIMIT 1').get();
    } catch {
      this.db.exec('DROP TABLE test_reports');
      this.db.exec(`
        CREATE TABLE test_reports (
          id TEXT PRIMARY KEY,
          case_id TEXT,
          status TEXT,
          error TEXT,
          duration REAL,
          screenshots TEXT,
          logs TEXT,
          created_at INTEGER
        );
      `);
    }
  }

  public getDb(): Database.Database {
    return this.db;
  }
}

export const testDb = new TestDbService();

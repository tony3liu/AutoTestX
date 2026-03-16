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
        case_ids TEXT,
        created_at INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS test_reports (
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
    
    // Migration for test_cases model selection
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

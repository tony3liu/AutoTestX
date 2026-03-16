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
        suite_id TEXT,
        results TEXT,
        status TEXT,
        created_at INTEGER
      );
    `);
  }

  public getDb(): Database.Database {
    return this.db;
  }
}

export const testDb = new TestDbService();

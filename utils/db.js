const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'tickets.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id               TEXT PRIMARY KEY,
    number           INTEGER NOT NULL UNIQUE,
    channel_id       TEXT NOT NULL,
    user_id          TEXT NOT NULL,
    username         TEXT NOT NULL,
    subject          TEXT NOT NULL,
    description      TEXT NOT NULL,
    priority         TEXT NOT NULL DEFAULT 'Medium',
    status           TEXT NOT NULL DEFAULT 'open',
    claimed_by       TEXT,
    claimed_at       TEXT,
    opened_at        TEXT NOT NULL,
    closed_at        TEXT,
    closed_by        TEXT,
    close_reason     TEXT,
    close_req_reason TEXT
  )
`);

// One-time migration from tickets.json
const jsonPath = path.join(__dirname, '..', 'data', 'tickets.json');
if (fs.existsSync(jsonPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const insert = db.prepare(`
      INSERT OR IGNORE INTO tickets
        (id, number, channel_id, user_id, username, subject, description,
         priority, status, claimed_by, claimed_at, opened_at, closed_at, closed_by)
      VALUES
        (@id, @number, @channel_id, @user_id, @username, @subject, @description,
         @priority, @status, @claimed_by, @claimed_at, @opened_at, @closed_at, @closed_by)
    `);
    const migrate = db.transaction((tickets) => {
      for (const t of Object.values(tickets)) {
        insert.run({
          id: t.id, number: t.number, channel_id: t.channelId,
          user_id: t.userId, username: t.username,
          subject: t.subject, description: t.description,
          priority: t.priority || 'Medium', status: t.status || 'open',
          claimed_by: t.claimedBy || null, claimed_at: t.claimedAt || null,
          opened_at: t.openedAt, closed_at: t.closedAt || null,
          closed_by: t.closedBy || null,
        });
      }
    });
    migrate(data);
    fs.renameSync(jsonPath, jsonPath + '.migrated');
    console.log('[DB] Migrated tickets.json → SQLite.');
  } catch (err) {
    console.error('[DB] Migration error:', err);
  }
}

module.exports = db;

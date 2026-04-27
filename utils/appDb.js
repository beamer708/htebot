const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'db.sqlite'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    username     TEXT NOT NULL,
    age          TEXT NOT NULL,
    timezone     TEXT NOT NULL,
    reason       TEXT NOT NULL,
    experience   TEXT NOT NULL,
    role         TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    thread_id    TEXT,
    reviewed_by  TEXT,
    reviewed_at  INTEGER,
    submitted_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS suggestions (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    username        TEXT NOT NULL,
    title           TEXT NOT NULL,
    category        TEXT NOT NULL,
    details         TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    thread_id       TEXT,
    approval_msg_id TEXT,
    upvotes         INTEGER DEFAULT 0,
    downvotes       INTEGER DEFAULT 0,
    reviewed_by     TEXT,
    reviewed_at     INTEGER,
    submitted_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS setup_posts (
    channel_id TEXT PRIMARY KEY,
    thread_id  TEXT NOT NULL
  );
`);

function nextAppId() {
  const row = db.prepare('SELECT COUNT(*) as count FROM applications').get();
  return `APP-${String(row.count + 1).padStart(4, '0')}`;
}

function nextSugId() {
  const row = db.prepare('SELECT COUNT(*) as count FROM suggestions').get();
  return `SUG-${String(row.count + 1).padStart(4, '0')}`;
}

module.exports = { db, nextAppId, nextSugId };

/**
 * _db.js  –  shared database helper for Vercel Serverless Functions
 *
 * Uses better-sqlite3 (synchronous API, no callbacks).
 * The DB file lives at the repo root as /database.db.
 * On first boot the customers table is created automatically.
 */
const Database = require('better-sqlite3');
const path = require('path');

// In Vercel the repo root is /var/task; locally it is the project root.
const DB_PATH = path.join(process.cwd(), 'database.db');

let _db;

function getDb() {
  if (_db) return _db;

  _db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  _db.pragma('journal_mode = WAL');

  // Create table if it does not exist
  _db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_details TEXT,
      phone_number     TEXT,
      crop_type        TEXT,
      area_of_crop     TEXT,
      season           TEXT,
      location         TEXT
    )
  `);

  return _db;
}

module.exports = { getDb };

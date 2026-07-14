require('dotenv').config();
const Database = require('better-sqlite3');
const { neon } = require('@neondatabase/serverless');
const path = require('path');

// 1. Initialize PostgreSQL connection via Neon
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Error: DATABASE_URL environment variable is not defined in .env');
  process.exit(1);
}
const sql = neon(databaseUrl);

// 2. Open local SQLite database
const sqliteDbPath = path.resolve(__dirname, 'database.db');
console.log(`Connecting to SQLite database at: ${sqliteDbPath}`);
const sqliteDb = new Database(sqliteDbPath);

async function runMigration() {
  try {
    // 3. Fetch all rows from SQLite customers table
    console.log('Reading data from SQLite...');
    const rows = sqliteDb.prepare('SELECT * FROM customers').all();
    console.log(`Found ${rows.length} rows in SQLite customers table.`);

    if (rows.length === 0) {
      console.log('No data to migrate.');
      return;
    }

    // 4. Insert rows into Neon PostgreSQL
    console.log('Migrating rows to PostgreSQL...');
    for (const row of rows) {
      // Map SQLite columns to PostgreSQL columns:
      // customer_details -> name
      // phone_number     -> phone
      // location         -> location
      // crop_type        -> crop_type
      // season           -> season
      // area_of_crop     -> area_acres
      await sql`
        INSERT INTO customers (id, name, phone, location, crop_type, season, area_acres)
        VALUES (${row.id}, ${row.customer_details}, ${row.phone_number}, ${row.location}, ${row.crop_type}, ${row.season}, ${row.area_of_crop})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    sqliteDb.close();
  }
}

runMigration();

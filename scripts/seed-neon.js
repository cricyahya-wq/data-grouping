require('dotenv').config();
const Database = require('better-sqlite3');
const { neon } = require('@neondatabase/serverless');
const path = require('path');

// 1. Connection string validation
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Error: DATABASE_URL is not defined in your environment/.env file.');
  process.exit(1);
}

// Initialize Neon Client
const sql = neon(databaseUrl);

// 2. Open SQLite Database (located at project root)
const sqlitePath = path.resolve(__dirname, '../database.db');
console.log(`Connecting to local SQLite database at: ${sqlitePath}`);
const sqliteDb = new Database(sqlitePath);

async function migrate() {
  try {
    // 3. Create customers table in PostgreSQL if it doesn't exist
    console.log('Ensuring PostgreSQL customers table exists...');
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        location VARCHAR(255) NOT NULL,
        crop_type VARCHAR(100) NOT NULL,
        season VARCHAR(100) NOT NULL,
        area_acres VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 4. Retrieve SQLite rows
    console.log('Reading rows from SQLite...');
    const rows = sqliteDb.prepare('SELECT * FROM customers').all();
    console.log(`Retrieved ${rows.length} rows from SQLite database.`);

    if (rows.length === 0) {
      console.log('No customer rows found to migrate.');
      return;
    }

    // 5. Batch insert into Neon PostgreSQL
    console.log('Inserting rows into Neon PostgreSQL...');
    let migratedCount = 0;
    for (const row of rows) {
      // Map SQLite properties:
      // customer_details -> name
      // phone_number     -> phone
      // area_of_crop     -> area_acres
      await sql`
        INSERT INTO customers (id, name, phone, location, crop_type, season, area_acres)
        VALUES (${row.id}, ${row.customer_details}, ${row.phone_number}, ${row.location}, ${row.crop_type}, ${row.season}, ${row.area_of_crop})
        ON CONFLICT (id) DO NOTHING
      `;
      migratedCount++;
    }

    // 6. Log success message
    console.log(`Migrated ${migratedCount} customers successfully.`);
  } catch (error) {
    console.error('Migration failed with error:', error);
  } finally {
    sqliteDb.close();
  }
}

migrate();

/**
 * _db.js  –  shared database helper for Vercel Serverless Functions
 *
 * Connects to Neon Serverless PostgreSQL database.
 * The connection string is read from process.env.DATABASE_URL.
 */
const { neon } = require('@neondatabase/serverless');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('Warning: DATABASE_URL environment variable is not defined.');
}

const sql = neon(databaseUrl || '');

module.exports = { sql };

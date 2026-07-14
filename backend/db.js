const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_ADDON_HOST,
  user: process.env.MYSQL_ADDON_USER,
  password: process.env.MYSQL_ADDON_PASSWORD,
  database: process.env.MYSQL_ADDON_DB,
  port: process.env.MYSQL_ADDON_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_details VARCHAR(255) NOT NULL,
        phone_number VARCHAR(50) NOT NULL,
        crop_type VARCHAR(100) NOT NULL,
        area_of_crop VARCHAR(100) NOT NULL,
        season VARCHAR(100) NOT NULL,
        location VARCHAR(255) NOT NULL
      )
    `);
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Database initialization error:', err.message);
  }
}

initializeDatabase();

module.exports = pool;
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_ADDON_HOST || process.env.DB_HOST,
  user: process.env.MYSQL_ADDON_USER || process.env.DB_USER,
  password: process.env.MYSQL_ADDON_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQL_ADDON_DB || process.env.DB_NAME,
  port: process.env.MYSQL_ADDON_PORT || process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Create table and seed if empty
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

    const [rows] = await pool.query('SELECT COUNT(*) AS count FROM customers');
    if (rows[0].count === 0) {
      console.log('Seeding initial database...');
      const seedData = [
        ['John Doe', '555-0100', 'Wheat', '50 acres', 'Kharif', 'Punjab'],
        ['Jane Smith', '555-0101', 'Rice', '120 acres', 'Rabi', 'Haryana'],
        ['Bob Johnson', '555-0102', 'Maize', '30 acres', 'Kharif', 'Punjab'],
        ['Alice Brown', '555-0103', 'Wheat', '45 acres', 'Rabi', 'Uttar Pradesh'],
        ['Charlie Davis', '555-0104', 'Sugarcane', '80 acres', 'Zaid', 'Maharashtra']
      ];
      
      const insertQuery = 'INSERT INTO customers (customer_details, phone_number, crop_type, area_of_crop, season, location) VALUES ?';
      await pool.query(insertQuery, [seedData]);
      console.log('Database seeded successfully.');
    }
  } catch (err) {
    console.error('Database initialization error:', err.message);
  }
}

initializeDatabase();

module.exports = pool;

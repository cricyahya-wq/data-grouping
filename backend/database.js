const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'customers.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Create the customers table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_details TEXT,
            phone_number TEXT,
            crop_type TEXT,
            area_of_crop TEXT,
            season TEXT,
            location TEXT
        )`, (err) => {
            if (err) {
                console.error('Error creating table', err.message);
            } else {
                // Check if we need to seed the database
                db.get("SELECT COUNT(*) AS count FROM customers", (err, row) => {
                    if (row && row.count === 0) {
                        console.log("Seeding initial data...");
                        seedData();
                    }
                });
            }
        });
    }
});

function seedData() {
    const insert = 'INSERT INTO customers (customer_details, phone_number, crop_type, area_of_crop, season, location) VALUES (?,?,?,?,?,?)';
    
    // Sample data to make it easier to test
    const sampleData = [
        ['John Doe', '555-0100', 'Wheat', '50 acres', 'Kharif', 'Punjab'],
        ['Jane Smith', '555-0101', 'Rice', '120 acres', 'Rabi', 'Haryana'],
        ['Bob Johnson', '555-0102', 'Maize', '30 acres', 'Kharif', 'Punjab'],
        ['Alice Brown', '555-0103', 'Wheat', '45 acres', 'Rabi', 'Uttar Pradesh'],
        ['Charlie Davis', '555-0104', 'Sugarcane', '80 acres', 'Zaid', 'Maharashtra']
    ];

    sampleData.forEach((data) => {
        db.run(insert, data);
    });
}

module.exports = db;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Protect all /api routes with Bearer token auth
app.use('/api', authMiddleware);

// Get dashboard stats
app.get('/api/stats', (req, res) => {
    const stats = {};

    db.get('SELECT COUNT(*) AS totalCustomers FROM customers', [], (err, row) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        stats.totalCustomers = row.totalCustomers;

        db.get('SELECT COUNT(DISTINCT crop_type) AS uniqueCrops FROM customers', [], (err, row) => {
            if (err) { res.status(500).json({ error: err.message }); return; }
            stats.uniqueCrops = row.uniqueCrops;

            db.get('SELECT COUNT(DISTINCT location) AS uniqueLocations FROM customers', [], (err, row) => {
                if (err) { res.status(500).json({ error: err.message }); return; }
                stats.uniqueLocations = row.uniqueLocations;

                db.get('SELECT COUNT(DISTINCT season) AS uniqueSeasons FROM customers', [], (err, row) => {
                    if (err) { res.status(500).json({ error: err.message }); return; }
                    stats.uniqueSeasons = row.uniqueSeasons;

                    db.all('SELECT * FROM customers ORDER BY id DESC LIMIT 5', [], (err, rows) => {
                        if (err) { res.status(500).json({ error: err.message }); return; }
                        stats.recentlyAdded = rows;
                        res.json({ data: stats });
                    });
                });
            });
        });
    });
});

// Get all customers
app.get('/api/customers', (req, res) => {
    db.all('SELECT * FROM customers', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

// Add a new customer
app.post('/api/customers', (req, res) => {
    const { customer_details, phone_number, crop_type, area_of_crop, season, location } = req.body;

    if (!customer_details || !phone_number || !crop_type || !area_of_crop || !season || !location) {
        res.status(400).json({ error: 'Please provide all details' });
        return;
    }

    const insert = 'INSERT INTO customers (customer_details, phone_number, crop_type, area_of_crop, season, location) VALUES (?,?,?,?,?,?)';
    const params = [customer_details, phone_number, crop_type, area_of_crop, season, location];

    db.run(insert, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'success', data: { id: this.lastID, ...req.body } });
    });
});

// Group data by a specific field (e.g., crop_type, season, location)
app.get('/api/customers/grouped/:field', (req, res) => {
    const field = req.params.field;

    // Whitelist allowed grouping fields to prevent SQL injection
    const allowedFields = ['crop_type', 'season', 'location'];
    if (!allowedFields.includes(field)) {
        res.status(400).json({ error: 'Invalid grouping field' });
        return;
    }

    const query = `
        SELECT ${field}, COUNT(id) as count 
        FROM customers 
        GROUP BY ${field} 
        ORDER BY count DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

// Delete a customer
app.delete('/api/customers/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM customers WHERE id = ?', id, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'deleted', changes: this.changes });
    });
});

// Edit a customer
app.put('/api/customers/:id', (req, res) => {
    const id = req.params.id;
    const { customer_details, phone_number, crop_type, area_of_crop, season, location } = req.body;

    if (!customer_details || !phone_number || !crop_type || !area_of_crop || !season || !location) {
        res.status(400).json({ error: 'Please provide all details' });
        return;
    }

    const updateQuery = `
        UPDATE customers 
        SET customer_details = ?, phone_number = ?, crop_type = ?, area_of_crop = ?, season = ?, location = ? 
        WHERE id = ?
    `;
    const params = [customer_details, phone_number, crop_type, area_of_crop, season, location, id];

    db.run(updateQuery, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'updated', changes: this.changes });
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

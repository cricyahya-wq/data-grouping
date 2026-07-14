require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();

app.use(cors());
app.use(express.json());

// ── Health check / root route ─────────────────────────────────────
// This prevents "Cannot GET /" on Vercel
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Agron Portal API is running',
        version: '1.0.0',
        endpoints: [
            'GET  /api/stats',
            'GET  /api/customers',
            'POST /api/customers',
            'GET  /api/customers/grouped/:field',
            'PUT  /api/customers/:id',
            'DELETE /api/customers/:id'
        ]
    });
});

// Protect all /api routes with Bearer token auth
app.use('/api', authMiddleware);

// Get dashboard stats
app.get('/api/stats', async (req, res) => {
    try {
        const stats = {};

        const [totalRows] = await db.query('SELECT COUNT(*) AS totalCustomers FROM customers');
        stats.totalCustomers = totalRows[0].totalCustomers;

        const [cropRows] = await db.query('SELECT COUNT(DISTINCT crop_type) AS uniqueCrops FROM customers');
        stats.uniqueCrops = cropRows[0].uniqueCrops;

        const [locRows] = await db.query('SELECT COUNT(DISTINCT location) AS uniqueLocations FROM customers');
        stats.uniqueLocations = locRows[0].uniqueLocations;

        const [seasonRows] = await db.query('SELECT COUNT(DISTINCT season) AS uniqueSeasons FROM customers');
        stats.uniqueSeasons = seasonRows[0].uniqueSeasons;

        const [recentRows] = await db.query('SELECT * FROM customers ORDER BY id DESC LIMIT 5');
        stats.recentlyAdded = recentRows;

        res.json({ data: stats });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all customers
app.get('/api/customers', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM customers');
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a new customer
app.post('/api/customers', async (req, res) => {
    const { customer_details, phone_number, crop_type, area_of_crop, season, location } = req.body;

    if (!customer_details || !phone_number || !crop_type || !area_of_crop || !season || !location) {
        return res.status(400).json({ error: 'Please provide all details' });
    }

    try {
        const insert = 'INSERT INTO customers (customer_details, phone_number, crop_type, area_of_crop, season, location) VALUES (?,?,?,?,?,?)';
        const params = [customer_details, phone_number, crop_type, area_of_crop, season, location];
        const [result] = await db.query(insert, params);
        res.status(201).json({ message: 'success', data: { id: result.insertId, ...req.body } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Group data by a specific field (crop_type, season, location)
app.get('/api/customers/grouped/:field', async (req, res) => {
    const field = req.params.field;
    const allowedFields = ['crop_type', 'season', 'location'];

    if (!allowedFields.includes(field)) {
        return res.status(400).json({ error: 'Invalid grouping field' });
    }

    const query = `
        SELECT \`${field}\`, COUNT(id) AS count 
        FROM customers 
        GROUP BY \`${field}\` 
        ORDER BY count DESC
    `;

    try {
        const [rows] = await db.query(query);
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a customer
app.delete('/api/customers/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const [result] = await db.query('DELETE FROM customers WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json({ message: 'deleted', changes: result.affectedRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Edit a customer
app.put('/api/customers/:id', async (req, res) => {
    const id = req.params.id;
    const { customer_details, phone_number, crop_type, area_of_crop, season, location } = req.body;

    if (!customer_details || !phone_number || !crop_type || !area_of_crop || !season || !location) {
        return res.status(400).json({ error: 'Please provide all details' });
    }

    const updateQuery = `
        UPDATE customers 
        SET customer_details = ?, phone_number = ?, crop_type = ?, area_of_crop = ?, season = ?, location = ? 
        WHERE id = ?
    `;
    const params = [customer_details, phone_number, crop_type, area_of_crop, season, location, id];

    try {
        const [result] = await db.query(updateQuery, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json({ message: 'updated', changes: result.affectedRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// IMPORTANT: Do NOT call app.listen() for Vercel serverless.
// Export the app so Vercel's @vercel/node runtime can invoke it.
module.exports = app;

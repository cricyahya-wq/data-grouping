require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'customers.json');
const UPLOADS_DIR = path.join(__dirname, 'data', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Protect all /api routes with Bearer token auth
app.use('/api', authMiddleware);

const upload = multer({ dest: UPLOADS_DIR });

// ── Helpers ──────────────────────────────────────────────────────────────────

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function normalizeRow(row) {
  // Flexible CSV header mapping
  const get = (...keys) => {
    for (const k of keys) {
      const val = row[k] || row[k.toLowerCase()] || row[k.toUpperCase()];
      if (val !== undefined && val !== '') return String(val).trim();
    }
    return '';
  };
  return {
    id: uuidv4(),
    name: get('name', 'customer_name', 'Customer Name', 'customerName'),
    phone: get('phone', 'phone_number', 'Phone Number', 'phoneNumber', 'mobile'),
    cropType: get('cropType', 'crop_type', 'Crop Type', 'crop'),
    area: get('area', 'area_of_crop', 'Area of Crop', 'areaOfCrop', 'acres'),
    season: get('season', 'Season'),
    location: get('location', 'Location', 'city', 'region'),
    createdAt: new Date().toISOString()
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET all customers
app.get('/api/customers', (req, res) => {
  const data = readData();
  res.json({ success: true, count: data.length, data });
});

// GET grouped customers
app.get('/api/customers/grouped', (req, res) => {
  const data = readData();
  const { by } = req.query; // crop | season | location | area

  const groupBy = (arr, keyFn) => {
    return arr.reduce((acc, item) => {
      const key = keyFn(item) || 'Unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  };

  const areaCategory = (area) => {
    const a = parseFloat(area);
    if (isNaN(a)) return 'Unknown';
    if (a <= 5) return 'Small (≤5 acres)';
    if (a <= 20) return 'Medium (6–20 acres)';
    return 'Large (>20 acres)';
  };

  let groups = {};
  switch (by) {
    case 'crop':
      groups = groupBy(data, r => r.cropType);
      break;
    case 'season':
      groups = groupBy(data, r => r.season);
      break;
    case 'location':
      groups = groupBy(data, r => r.location);
      break;
    case 'area':
      groups = groupBy(data, r => areaCategory(r.area));
      break;
    default:
      // Return all 4 groupings
      groups = {
        byCrop: groupBy(data, r => r.cropType),
        bySeason: groupBy(data, r => r.season),
        byLocation: groupBy(data, r => r.location),
        byArea: groupBy(data, r => areaCategory(r.area))
      };
  }

  res.json({ success: true, totalCustomers: data.length, groups });
});

// GET stats summary
app.get('/api/customers/stats', (req, res) => {
  const data = readData();
  const unique = (key) => [...new Set(data.map(r => r[key]).filter(Boolean))];
  res.json({
    success: true,
    total: data.length,
    uniqueCrops: unique('cropType').length,
    uniqueLocations: unique('location').length,
    uniqueSeasons: unique('season').length,
    crops: unique('cropType'),
    seasons: unique('season'),
    locations: unique('location')
  });
});

// POST add single customer
app.post('/api/customers', (req, res) => {
  const data = readData();
  const customer = normalizeRow(req.body);
  if (!customer.name || !customer.phone) {
    return res.status(400).json({ success: false, message: 'Name and phone are required' });
  }
  data.push(customer);
  writeData(data);
  res.json({ success: true, message: 'Customer added', data: customer });
});

// POST upload CSV
app.post('/api/customers/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const results = [];
  const errors = [];
  let rowIndex = 0;

  const fileContent = fs.readFileSync(req.file.path, 'utf-8');
  const readable = stream.Readable.from(fileContent);

  readable
    .pipe(csv())
    .on('data', (row) => {
      rowIndex++;
      const customer = normalizeRow(row);
      if (!customer.name && !customer.phone) {
        errors.push(`Row ${rowIndex}: missing name and phone`);
      } else {
        results.push(customer);
      }
    })
    .on('end', () => {
      fs.unlinkSync(req.file.path);
      const data = readData();
      data.push(...results);
      writeData(data);
      res.json({
        success: true,
        message: `Imported ${results.length} customers`,
        imported: results.length,
        errors
      });
    })
    .on('error', (err) => {
      res.status(500).json({ success: false, message: 'CSV parse error', error: err.message });
    });
});

// DELETE single customer
app.delete('/api/customers/:id', (req, res) => {
  let data = readData();
  const before = data.length;
  data = data.filter(c => c.id !== req.params.id);
  writeData(data);
  if (data.length < before) {
    res.json({ success: true, message: 'Customer deleted' });
  } else {
    res.status(404).json({ success: false, message: 'Customer not found' });
  }
});

// DELETE all customers
app.delete('/api/customers', (req, res) => {
  writeData([]);
  res.json({ success: true, message: 'All customers cleared' });
});

// Search
app.get('/api/customers/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ success: true, data: readData() });
  const query = q.toLowerCase();
  const data = readData().filter(c =>
    c.name?.toLowerCase().includes(query) ||
    c.cropType?.toLowerCase().includes(query) ||
    c.location?.toLowerCase().includes(query) ||
    c.season?.toLowerCase().includes(query) ||
    c.phone?.includes(query)
  );
  res.json({ success: true, count: data.length, data });
});

app.listen(PORT, () => {
  console.log(`✅ AGRON Customer Server running at http://localhost:${PORT}`);
});

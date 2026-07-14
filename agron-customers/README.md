# AGRON Customer Data Portal

A full-stack customer grouping portal for agricultural data.

## Setup

```bash
npm install
npm start
```

Open: http://localhost:3000

## CSV Import Format

| name | phone | cropType | area | season | location |
|------|-------|----------|------|--------|----------|
| Ali Hassan | 0300-1234567 | Wheat | 15 | Rabi | Lahore |

Season values: Rabi, Kharif, Zaid, Year-Round

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/customers | All customers |
| POST | /api/customers | Add one customer |
| DELETE | /api/customers/:id | Delete one |
| DELETE | /api/customers | Clear all |
| GET | /api/customers/grouped?by=crop|season|location|area | Grouped data |
| GET | /api/customers/stats | Summary stats |
| GET | /api/customers/search?q=query | Search |
| POST | /api/customers/upload | Upload CSV file |

## Data stored in: data/customers.json

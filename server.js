// server.js
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── GET /products ────────────────────────────────────────────────────────────
// Query params:
//   category  — filter by category (optional)
//   cursor    — the created_at of the last item you saw (for next page)
//   limit     — how many items per page (default 20)
//
// HOW CURSOR PAGINATION WORKS:
//   First request:  no cursor  → get the 20 newest products
//   Next  request:  cursor=<created_at of last item> → get 20 products older than that
//   This is STABLE: adding new products at the top doesn't shift what's below

app.get('/products', async (req, res) => {
  try {
    const limit    = Math.min(parseInt(req.query.limit) || 20, 100); // max 100
    const category = req.query.category || null;
    const cursor   = req.query.cursor   || null; // ISO timestamp string

    // We build the query dynamically based on what filters are provided
    const conditions = [];
    const params     = [];

    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (cursor) {
      params.push(cursor);
      // "Give me products created BEFORE the cursor timestamp"
      // This is the key line that makes pagination stable!
      conditions.push(`created_at < $${params.length}`);
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    params.push(limit);

    const query = `
      SELECT id, name, category, price, created_at, updated_at
      FROM products
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length}
    `;

    const result = await pool.query(query, params);
    const rows   = result.rows;

    // The next cursor is the created_at of the LAST item in this page
    // The client sends this back to get the next page
    const nextCursor = rows.length === limit
      ? rows[rows.length - 1].created_at.toISOString()
      : null; // null means no more pages

    res.json({
      data:       rows,
      nextCursor, // send this as ?cursor= in your next request
      count:      rows.length
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// ─── GET /categories ──────────────────────────────────────────────────────────
// Returns the list of all unique categories
app.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT category FROM products ORDER BY category'
    );
    res.json(result.rows.map(r => r.category));
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// seed.js
// Generates 200,000 products in one fast bulk insert

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CATEGORIES = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports', 'Toys', 'Food', 'Beauty'];
const TOTAL = 200000;
const BATCH_SIZE = 5000; // Insert 5000 at a time to avoid memory issues

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPrice() {
  return (Math.random() * 990 + 10).toFixed(2); // price between 10 and 1000
}

// Spread created_at over the last 2 years so products have different timestamps
function randomDate() {
  const now = Date.now();
  const twoYearsAgo = now - 2 * 365 * 24 * 60 * 60 * 1000;
  return new Date(twoYearsAgo + Math.random() * (now - twoYearsAgo));
}

async function seed() {
  console.log('Seeding 200,000 products...');

  for (let batch = 0; batch < TOTAL / BATCH_SIZE; batch++) {
    // Build one big VALUES clause: ($1,$2,$3,...),($4,$5,$6,...) ...
    const values = [];
    const params = [];

    for (let i = 0; i < BATCH_SIZE; i++) {
      const idx = i * 4; // 4 params per row
      values.push(`($${idx+1}, $${idx+2}, $${idx+3}, $${idx+4})`);
      params.push(
        `Product ${batch * BATCH_SIZE + i + 1}`, // name
        randomItem(CATEGORIES),                   // category
        randomPrice(),                            // price
        randomDate()                              // created_at
      );
    }

    await pool.query(
      `INSERT INTO products (name, category, price, created_at)
       VALUES ${values.join(',')}`,
      params
    );

    console.log(`Inserted ${(batch + 1) * BATCH_SIZE} products...`);
  }

  console.log('Done!');
  await pool.end();
}

seed();
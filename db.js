const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
});

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS content (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '🌿',
      description TEXT DEFAULT '',
      price NUMERIC DEFAULT 0,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      contact TEXT DEFAULT '',
      message TEXT DEFAULT '',
      source TEXT DEFAULT 'manual',
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin'
    );
  `);

  const defaultContent = {
    badge: '🌾 Grown with care',
    heading: 'Real food, straight from Bharath Bhoomi.',
    lead: "We work with small farms to grow completely naturally grown food — no shortcuts, no synthetic sprays, just honest produce the way your grandparents remember it.",
    aboutHeading: 'Food grown the way nature intended',
    aboutP1: "Bharath Bhoomi started with a simple frustration: it was getting harder and harder to find food that was actually grown the way food used to be grown. So we set out to change that — partnering directly with farmers who grow completely naturally, without synthetic fertilisers, pesticides, or shortcuts.",
    aboutP2: "Every product we offer is traceable back to the soil it came from. We believe naturally grown food isn't a luxury — it's how things should have stayed all along.",
    tags: ['Naturally grown', 'Farmer-first', 'No shortcuts', 'Soil-friendly'],
    location: 'India',
    email: 'hello@bharathbhoomi.example',
    phone: '+91 00000 00000',
    heroImage: null,
  };
  await pool.query(
    `INSERT INTO content (key, value) VALUES ('site', $1)
     ON CONFLICT (key) DO NOTHING`,
    [JSON.stringify(defaultContent)]
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      address TEXT DEFAULT '',
      pincode TEXT DEFAULT '',
      landmark TEXT DEFAULT '',
      preferred_time TEXT DEFAULT '',
      items JSONB NOT NULL,
      total NUMERIC NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'paid',
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS pincode TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS landmark TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS preferred_time TEXT DEFAULT '';`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_accounts (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_account_id INT REFERENCES customer_accounts(id);`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visits (
      day DATE PRIMARY KEY,
      count INT DEFAULT 0
    );
  `);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM products');
  if (rows[0].n === 0) {
    await pool.query(
      `INSERT INTO products (name, icon, description, price, sort_order) VALUES
       ('Naturally grown grains', '🌾', 'Millets, rice and wheat grown without synthetic inputs, sourced directly from small farms.', 249, 1),
       ('Seasonal produce', '🥬', 'Fruits and vegetables grown in step with the seasons.', 149, 2),
       ('Farm essentials', '🍯', 'Cold-pressed oils, raw honey, and other pantry staples.', 399, 3)`
    );
  }

  // Auto-create/update the admin login from environment variables — no shell access needed.
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminUsername && adminPassword) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      `INSERT INTO admin_users (username, password_hash, role) VALUES ($1,$2,'admin')
       ON CONFLICT (username) DO UPDATE SET password_hash = $2`,
      [adminUsername, hash]
    );
    console.log(`Admin user "${adminUsername}" is ready.`);
  }
}

module.exports = { pool, initSchema };

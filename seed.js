require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, initSchema } = require('./db');

async function seed() {
  await initSchema();
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error('Set ADMIN_PASSWORD in your environment before seeding.');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO admin_users (username, password_hash, role) VALUES ($1,$2,'admin')
     ON CONFLICT (username) DO UPDATE SET password_hash = $2`,
    [username, hash]
  );
  console.log(`Admin user "${username}" is ready.`);
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function createAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.log('Usage: node scripts/create-admin.js <email> <password>');
    process.exit(1);
  }

  try {
    const SQL = await initSqlJs();
    const dbPath = path.join(__dirname, '../data/aifactory.db');

    let db;
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      console.error('Database not found. Please start the server first.');
      process.exit(1);
    }

    const existingUser = db.exec(`SELECT * FROM users WHERE email = '${email}'`);
    if (existingUser.length > 0 && existingUser[0].values.length > 0) {
      console.log(`User ${email} already exists.`);
      db.close();
      process.exit(1);
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const userId = uuidv4();

    db.run(`INSERT INTO users (id, email, password_hash, role, points) VALUES (?, ?, ?, 'admin', 0)`,
      [userId, email, passwordHash]);

    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);

    db.close();

    console.log(`Admin user created successfully!`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`ID: ${userId}`);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();

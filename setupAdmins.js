import db from "./model/db/db.js";
import bcrypt from "bcryptjs";

const run = async () => {
  try {
    console.log("Creating admins table...");
    await db.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(225) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin')),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log("Table created.");

    const { rows } = await db.query("SELECT * FROM admins WHERE email = $1", ["admin@laundryaid.com.ng"]);
    if (rows.length === 0) {
      console.log("Inserting default superadmin...");
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash("admin123", salt);
      await db.query(`
        INSERT INTO admins (name, email, password, role)
        VALUES ('Super Admin', 'admin@laundryaid.com.ng', $1, 'superadmin')
      `, [hashed]);
      console.log("Superadmin created: admin@laundryaid.com.ng / admin123");
    } else {
      console.log("Superadmin already exists.");
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();

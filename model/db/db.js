import dotenv from "dotenv";
dotenv.config(); // ✅ Load environment variables

import { Pool } from "pg";

// ✅ Create and connect the client
const db = new Pool ({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  idleTimeoutMillis: 5000, // close idle clients after 5 seconds
  connectionTimeoutMillis: 10000, // wait 10s before failing
});

// db.connect(); // ✅ You must connect the client!

export default db;


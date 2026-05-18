const mysql = require("mysql2");

// Create connection pool (without promise wrapper)
const poolConfig = process.env.DATABASE_URL || {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "", 
  database: process.env.DB_NAME || "autoland",
  ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(poolConfig);

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("Connected to MySQL database");
  connection.release();
});

// Export the pool with callback support
module.exports = pool;
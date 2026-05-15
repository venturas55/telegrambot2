import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_OPC_HOST,
  user: process.env.DB_OPC_USER,
  password: process.env.DB_OPC_PASS,
  database: process.env.DB_OPC_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

export default pool;
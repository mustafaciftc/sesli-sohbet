const mariadb = require('mariadb');
require('dotenv').config();

const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`❌ Missing environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  connectionLimit: 10,
  acquireTimeout: 10000,
  connectTimeout: 10000,
  idleTimeout: 60000,
  timezone: 'UTC',
  supportBigNumbers: true,
  bigNumberStrings: true,
  multipleStatements: false
});

const query = async (sql, params = []) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(sql, params);
    return Array.isArray(result) ? result : [result];
  } catch (err) {
    const error = new Error('Database query failed');
    error.code = err.code;
    error.sql = sql;
    error.params = params;
    error.details = err.message;
    if (err.code === 'ER_DUP_ENTRY') {
      error.message = 'Duplicate entry detected';
    } else if (err.code === 'ER_NO_REFERENCED_ROW') {
      error.message = 'Foreign key constraint failed';
    }
    console.error('❌ Database Query Error:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

const transaction = async (callback) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    if (conn) await conn.rollback();
    const error = new Error('Transaction failed');
    error.code = err.code;
    error.details = err.message;
    console.error('❌ Transaction Error:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    await conn.query('SELECT 1');
    conn.release();
    console.log('✅ Database connected successfully!');
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('🧩 Check .env file and ensure MariaDB service is running.');
    return false;
  }
};

const closePool = async () => {
  try {
    await pool.end();
    console.log('🟡 Database pool closed');
  } catch (err) {
    console.error('❌ Error closing database pool:', err.message);
  }
};

pool.on('error', (err) => {
  console.error('⚠️ Database pool error:', err.message);
  if (err.fatal) {
    console.log('🔁 Reconnecting to MariaDB...');
    setTimeout(testConnection, 3000);
  }
});

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  closePool
};
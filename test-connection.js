const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database successfully!');
    
    const result = await client.query('SELECT NOW()');
    console.log('Current time from DB:', result.rows[0].now);
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error code:', error.code);
  }
}

testConnection();
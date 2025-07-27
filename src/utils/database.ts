import { Pool } from 'pg';
import { logger } from './logger';

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database pool error', err);
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    logger.error('Error acquiring database client', err.stack);
  } else {
    logger.info('Database connected successfully');
    release();
  }
});

export const db = {
  query: (text: string, params?: any[]) => {
    const start = Date.now();
    return pool.query(text, params).then((res) => {
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: res.rowCount });
      return res;
    });
  },
  
  getClient: () => pool.connect(),
  
  transaction: async <T>(callback: (client: any) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
  
  end: () => pool.end(),
};
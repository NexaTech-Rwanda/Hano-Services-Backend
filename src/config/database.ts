import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Validate database credentials in production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === '') {
    throw new Error(
      'DB_PASSWORD must be set in production environment. ' +
      'Database credentials cannot use default values in production.'
    );
  }
  
  if (!process.env.DB_HOST || process.env.DB_HOST === 'localhost') {
    console.warn(
      'Warning: DB_HOST is set to localhost in production. ' +
      'This is not recommended for production environments.'
    );
  }
}

const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'hanoservices',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(dbConfig);

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Railway-compatible database connection that works with both DATABASE_URL and PG* variables
function getDatabaseConnectionString(): string {
  console.log('🔍 Database connection check:');
  console.log('  - DATABASE_URL set:', !!process.env.DATABASE_URL);
  console.log('  - Available DB env vars:', Object.keys(process.env).filter(k => 
    k.includes('DATABASE') || k.includes('PG') || k.includes('POSTGRES')
  ).join(', '));

  // Try DATABASE_URL first (Replit style)
  if (process.env.DATABASE_URL) {
    console.log('✅ Using DATABASE_URL');
    return process.env.DATABASE_URL;
  }

  // Fallback to individual PG variables (Railway style)
  const { PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE } = process.env;
  
  if (PGHOST && PGPORT && PGUSER && PGPASSWORD && PGDATABASE) {
    const connectionString = `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
    console.log('✅ Built connection string from PG* variables');
    console.log('  - Host:', PGHOST);
    console.log('  - Port:', PGPORT);
    console.log('  - Database:', PGDATABASE);
    console.log('  - User:', PGUSER);
    return connectionString;
  }

  // Neither method available
  console.error('❌ No database connection variables found!');
  console.error('Available environment variables:', Object.keys(process.env).join(', '));
  console.error('');
  console.error('Railway Troubleshooting:');
  console.error('1. Ensure PostgreSQL service is linked to your app');
  console.error('2. Check Variables tab for PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE');
  console.error('3. Or set DATABASE_URL manually');
  
  throw new Error(
    "Database connection failed: Neither DATABASE_URL nor PG* variables are set.",
  );
}

const connectionString = getDatabaseConnectionString();
console.log('✅ Initializing database connection pool...');
export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });
console.log('✅ Database connection pool created successfully');
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Enhanced environment variable checking for Railway deployment
console.log('🔍 Database connection check at module load:');
console.log('  - DATABASE_URL set:', !!process.env.DATABASE_URL);
console.log('  - Available env vars:', Object.keys(process.env).filter(k => 
  k.includes('DATABASE') || k.includes('PG') || k.includes('POSTGRES')
).join(', '));

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set!');
  console.error('Available environment variables:', Object.keys(process.env).join(', '));
  console.error('');
  console.error('Railway Troubleshooting:');
  console.error('1. Go to your Railway project Variables tab');
  console.error('2. Verify DATABASE_URL is set to: ${{Postgres.DATABASE_URL}}');
  console.error('3. Try redeploying from the Deployments tab');
  console.error('4. Check if PostgreSQL service is running');
  
  throw new Error(
    "DATABASE_URL must be set. Railway deployment issue - see logs above for debugging steps.",
  );
}

console.log('✅ DATABASE_URL is set, initializing connection pool...');
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
console.log('✅ Database connection pool created successfully');
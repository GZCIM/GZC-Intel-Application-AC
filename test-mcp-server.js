#!/usr/bin/env node

import { Client } from 'pg';

async function testConnection() {
  const connectionString = 'postgresql://mikael:Ii89rra137+*@gzcdevserver.postgres.database.azure.com:5432/gzc_platform?sslmode=require';
  
  const client = new Client({
    connectionString: connectionString,
  });
  
  try {
    console.log('Testing PostgreSQL connection...');
    await client.connect();
    console.log('✓ Connected successfully!');
    
    // Test a simple query
    const result = await client.query('SELECT version()');
    console.log('✓ Database version:', result.rows[0].version);
    
    // Test listing tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('✓ Tables in public schema:', tablesResult.rows.map(r => r.table_name));
    
    // Test leg schema tables
    const legTablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'leg' 
      ORDER BY table_name
    `);
    console.log('✓ Tables in leg schema:', legTablesResult.rows.map(r => r.table_name));
    
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
  } finally {
    await client.end();
  }
}

testConnection();

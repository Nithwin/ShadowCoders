const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  password: 'shadowcoders',
  host: 'localhost',
  port: 5432,
  database: 'shadowcoders',
});

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    await client.connect();
    console.log('✅ Successfully connected to PostgreSQL!');
    
    const res = await client.query('SELECT NOW()');
    console.log('✅ Query test successful:', res.rows[0]);
    
    await client.end();
    console.log('✅ Connection closed.');
  } catch (err) {
    console.error('❌ Database connection failed:');
    console.error('Error:', err.message);
    console.error('\nPossible issues:');
    console.error('1. PostgreSQL service not running');
    console.error('2. Wrong password (current: "shadowcoders")');
    console.error('3. Database "shadowcoders" does not exist');
    console.error('4. User "postgres" does not exist');
    console.error('\nTo fix:');
    console.error('- Check if PostgreSQL is running: services.msc (look for postgresql)');
    console.error('- Or start it: pg_ctl -D "C:\\Program Files\\PostgreSQL\\<version>\\data" start');
    process.exit(1);
  }
}

testConnection();

const readline = require('readline');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupLocalDatabase() {
  console.log('\n🚀 Local PostgreSQL Setup for ShadowCoders\n');
  console.log('='.repeat(60));
  
  try {
    // Check PostgreSQL version
    const pgVersion = execSync('psql --version', { encoding: 'utf-8' });
    console.log(`✅ PostgreSQL found: ${pgVersion.trim()}`);
  } catch (error) {
    console.log('❌ PostgreSQL not found. Please install PostgreSQL first.');
    process.exit(1);
  }

  console.log('\n📋 Database Configuration\n');
  
  const dbName = await question('Database name [shadowcoders]: ') || 'shadowcoders';
  const dbUser = await question('Database user [postgres]: ') || 'postgres';
  const dbPassword = await question('Database password: ');
  const dbHost = await question('Database host [localhost]: ') || 'localhost';
  const dbPort = await question('Database port [5432]: ') || '5432';

  console.log('\n🔧 Updating .env file...');

  const databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
  const envPath = path.join(__dirname, '..', '.env');
  
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  // Update DATABASE_URL and DIRECT_URL
  const lines = envContent.split('\n');
  let updatedLines = [];
  let foundDatabaseUrl = false;
  let foundDirectUrl = false;

  for (let line of lines) {
    if (line.startsWith('DATABASE_URL=')) {
      updatedLines.push(`DATABASE_URL="${databaseUrl}"`);
      foundDatabaseUrl = true;
    } else if (line.startsWith('DIRECT_URL=')) {
      updatedLines.push(`DIRECT_URL="${databaseUrl}"`);
      foundDirectUrl = true;
    } else {
      updatedLines.push(line);
    }
  }

  if (!foundDatabaseUrl) {
    updatedLines.push(`DATABASE_URL="${databaseUrl}"`);
  }
  if (!foundDirectUrl) {
    updatedLines.push(`DIRECT_URL="${databaseUrl}"`);
  }

  fs.writeFileSync(envPath, updatedLines.join('\n'));
  console.log('✅ .env file updated');

  console.log('\n📦 Creating database...');
  
  const createDbAnswer = await question(`\nCreate database "${dbName}"? (y/n) [y]: `) || 'y';
  
  if (createDbAnswer.toLowerCase() === 'y') {
    try {
      // Try to create database using psql
      const psqlCmd = `psql -U ${dbUser} -h ${dbHost} -p ${dbPort} -c "CREATE DATABASE ${dbName};"`;
      console.log(`\nRunning: ${psqlCmd}`);
      console.log('\n⚠️  You may be prompted for your PostgreSQL password...\n');
      
      execSync(psqlCmd, { 
        stdio: 'inherit',
        env: { ...process.env, PGPASSWORD: dbPassword }
      });
      
      console.log(`\n✅ Database "${dbName}" created successfully!`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`\n✅ Database "${dbName}" already exists, skipping creation.`);
      } else {
        console.log('\n⚠️  Could not create database automatically.');
        console.log('\nPlease create it manually by running:');
        console.log(`  psql -U ${dbUser} -c "CREATE DATABASE ${dbName};"`);
        console.log('\nOr use pgAdmin or SQL Shell to create the database.');
      }
    }
  }

  console.log('\n🔄 Running Prisma migrations...');
  const migrateAnswer = await question('Run migrations now? (y/n) [y]: ') || 'y';
  
  if (migrateAnswer.toLowerCase() === 'y') {
    try {
      console.log('\nRunning: npx prisma migrate dev\n');
      execSync('npx prisma migrate dev', { stdio: 'inherit' });
      console.log('\n✅ Migrations completed successfully!');
    } catch (error) {
      console.log('\n⚠️  Migration failed. You can run it manually later with:');
      console.log('  npx prisma migrate dev');
    }
  }

  console.log('\n✅ Setup complete!');
  console.log('\n📝 Your connection string:');
  console.log(`   ${databaseUrl}`);
  console.log('\n🧪 Test your connection with:');
  console.log('   npm run test:db');
  console.log('\n🚀 Start your server with:');
  console.log('   npm run dev');
  console.log('\n' + '='.repeat(60) + '\n');

  rl.close();
}

setupLocalDatabase().catch(error => {
  console.error('\n❌ Setup failed:', error.message);
  rl.close();
  process.exit(1);
});

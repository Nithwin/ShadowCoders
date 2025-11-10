/**
 * Verification script to check if local code execution is configured and working
 * Run with: npx ts-node verify-local-execution.ts
 */

import { env } from './src/config/env';
import { testCodeWithTestCasesLocally } from './src/lib/local-executor';

async function verifyConfiguration() {
  console.log('🔍 Verifying Configuration...');
  console.log('='.repeat(50));
  
  const provider = env.CODE_EXECUTION_PROVIDER || 'judge0';
  console.log(`📌 Code Execution Provider: ${provider}`);
  
  if (provider === 'local') {
    console.log('✅ Local code execution is ENABLED');
  } else {
    console.log('⚠️  Local code execution is DISABLED (using Judge0)');
    console.log('   To enable local execution, set CODE_EXECUTION_PROVIDER=local in your .env file');
    return false;
  }
  
  return true;
}

async function verifyLocalExecution() {
  console.log('\n🧪 Testing Local Code Execution...');
  console.log('='.repeat(50));
  
  // Simple JavaScript test
  const code = `
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (input) => {
  const [a, b] = input.split(' ').map(Number);
  console.log(a + b);
  rl.close();
});
  `.trim();

  const testCases = [
    { input: '5 10', expectedOutput: '15', timeoutMs: 5000 },
  ];

  try {
    console.log('📝 Test Code:');
    console.log(code);
    console.log('\n📥 Test Input: 5 10');
    console.log('📤 Expected Output: 15');
    
    const result = await testCodeWithTestCasesLocally(code, 'javascript', testCases);
    
    console.log('\n📊 Results:');
    console.log(`   Passed: ${result.passed}/${result.total}`);
    
    result.results.forEach((r, i) => {
      console.log(`\n   Test ${i + 1}:`);
      console.log(`      Input: ${r.input}`);
      console.log(`      Expected: ${r.expectedOutput}`);
      console.log(`      Actual: ${r.actualOutput || 'null'}`);
      console.log(`      Status: ${r.passed ? '✅ PASSED' : '❌ FAILED'}`);
      if (r.error) {
        console.log(`      Error: ${r.error}`);
      }
    });
    
    if (result.passed === result.total) {
      console.log('\n✅ Local code execution is WORKING!');
      return true;
    } else {
      console.log('\n❌ Local code execution test FAILED');
      return false;
    }
  } catch (error: any) {
    console.error('\n❌ Error testing local execution:', error.message);
    console.error('   Stack:', error.stack);
    return false;
  }
}

async function checkInstalledSoftware() {
  console.log('\n🔍 Checking Installed Software...');
  console.log('='.repeat(50));
  
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  const checks = [
    { name: 'Node.js', command: 'node --version', required: true },
    { name: 'Python 3', command: 'python3 --version', required: false },
    { name: 'Java', command: 'javac -version', required: false },
    { name: 'GCC (C++)', command: 'g++ --version', required: false },
  ];

  const results: { [key: string]: boolean } = {};

  for (const check of checks) {
    try {
      const { stdout } = await execAsync(check.command);
      console.log(`✅ ${check.name}: ${stdout.trim()}`);
      results[check.name] = true;
    } catch (error: any) {
      if (check.required) {
        console.log(`❌ ${check.name}: Not installed (REQUIRED)`);
        results[check.name] = false;
      } else {
        console.log(`⚠️  ${check.name}: Not installed (Optional)`);
        results[check.name] = false;
      }
    }
  }

  return results;
}

async function main() {
  console.log('🚀 Local Code Execution Verification');
  console.log('='.repeat(50));
  
  // Check configuration
  const isConfigured = await verifyConfiguration();
  
  if (!isConfigured) {
    console.log('\n⚠️  Please configure CODE_EXECUTION_PROVIDER=local in your .env file');
    process.exit(1);
  }
  
  // Check installed software
  const software = await checkInstalledSoftware();
  
  if (!software['Node.js']) {
    console.log('\n❌ Node.js is required but not installed');
    console.log('   Please install Node.js to use local code execution');
    process.exit(1);
  }
  
  // Test local execution
  const isWorking = await verifyLocalExecution();
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Verification Summary:');
  console.log(`   Configuration: ${isConfigured ? '✅ OK' : '❌ FAILED'}`);
  console.log(`   Node.js: ${software['Node.js'] ? '✅ Installed' : '❌ Not Installed'}`);
  console.log(`   Python 3: ${software['Python 3'] ? '✅ Installed' : '⚠️  Not Installed'}`);
  console.log(`   Java: ${software['Java'] ? '✅ Installed' : '⚠️  Not Installed'}`);
  console.log(`   GCC: ${software['GCC (C++)'] ? '✅ Installed' : '⚠️  Not Installed'}`);
  console.log(`   Local Execution: ${isWorking ? '✅ WORKING' : '❌ FAILED'}`);
  
  if (isConfigured && isWorking) {
    console.log('\n🎉 Local code execution is configured and working!');
    console.log('✅ Your API is using LOCAL code execution instead of Judge0');
    process.exit(0);
  } else {
    console.log('\n⚠️  Local code execution verification failed');
    console.log('   Please check the errors above and fix them');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});


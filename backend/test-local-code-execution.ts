/**
 * Test script to verify local code execution is working
 * Run with: npx ts-node test-local-code-execution.ts
 */

import { testCodeWithTestCasesLocally } from './src/lib/local-executor';

async function testLocalExecution() {
  console.log('Testing local code execution...\n');

  // Test 1: Simple JavaScript addition
  console.log('Test 1: JavaScript - Simple Addition');
  try {
    const result1 = await testCodeWithTestCasesLocally(
      `const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (input) => {
  const [a, b] = input.split(' ').map(Number);
  console.log(a + b);
  rl.close();
});`,
      'javascript',
      [
        { input: '5 3', expectedOutput: '8', timeoutMs: 5000 },
        { input: '10 20', expectedOutput: '30', timeoutMs: 5000 },
      ]
    );
    console.log('Result:', JSON.stringify(result1, null, 2));
    console.log(`Passed: ${result1.passed}/${result1.total}\n`);
  } catch (error: any) {
    console.error('Error:', error.message);
    console.log('\n');
  }

  // Test 2: Simple Python addition
  console.log('Test 2: Python - Simple Addition');
  try {
    const result2 = await testCodeWithTestCasesLocally(
      `a, b = map(int, input().split())
print(a + b)`,
      'python',
      [
        { input: '5 3', expectedOutput: '8', timeoutMs: 5000 },
        { input: '10 20', expectedOutput: '30', timeoutMs: 5000 },
      ]
    );
    console.log('Result:', JSON.stringify(result2, null, 2));
    console.log(`Passed: ${result2.passed}/${result2.total}\n`);
  } catch (error: any) {
    console.error('Error:', error.message);
    console.log('\n');
  }

  // Test 3: JavaScript with error
  console.log('Test 3: JavaScript - Code with Error');
  try {
    const result3 = await testCodeWithTestCasesLocally(
      `console.log(undefinedVariable);`,
      'javascript',
      [
        { input: '', expectedOutput: '', timeoutMs: 5000 },
      ]
    );
    console.log('Result:', JSON.stringify(result3, null, 2));
    console.log(`Passed: ${result3.passed}/${result3.total}\n`);
  } catch (error: any) {
    console.error('Error:', error.message);
    console.log('\n');
  }

  console.log('Testing completed!');
}

// Run the tests
testLocalExecution().catch(console.error);


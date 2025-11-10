/**
 * Test script for local code execution
 * Run with: npx ts-node test-local-executor.ts
 */

import { testCodeWithTestCasesLocally, executeCodeLocally, SUPPORTED_LANGUAGES } from './src/lib/local-executor';

async function testJavaScript() {
  console.log('\n🧪 Testing JavaScript...');
  
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
    { input: '20 30', expectedOutput: '50', timeoutMs: 5000 },
  ];

  try {
    const result = await testCodeWithTestCasesLocally(code, 'javascript', testCases);
    console.log('✅ JavaScript Test Results:');
    console.log(`   Passed: ${result.passed}/${result.total}`);
    result.results.forEach((r, i) => {
      console.log(`   Test ${i + 1}: ${r.passed ? '✅ PASSED' : '❌ FAILED'}`);
      if (!r.passed) {
        console.log(`      Expected: ${r.expectedOutput}`);
        console.log(`      Got: ${r.actualOutput || 'null'}`);
        if (r.error) console.log(`      Error: ${r.error}`);
      }
    });
    return result.passed === result.total;
  } catch (error: any) {
    console.error('❌ JavaScript test failed:', error.message);
    return false;
  }
}

async function testPython() {
  console.log('\n🧪 Testing Python...');
  
  const code = `
a, b = map(int, input().split())
print(a + b)
  `.trim();

  const testCases = [
    { input: '5 10', expectedOutput: '15', timeoutMs: 5000 },
    { input: '20 30', expectedOutput: '50', timeoutMs: 5000 },
  ];

  try {
    const result = await testCodeWithTestCasesLocally(code, 'python', testCases);
    console.log('✅ Python Test Results:');
    console.log(`   Passed: ${result.passed}/${result.total}`);
    result.results.forEach((r, i) => {
      console.log(`   Test ${i + 1}: ${r.passed ? '✅ PASSED' : '❌ FAILED'}`);
      if (!r.passed) {
        console.log(`      Expected: ${r.expectedOutput}`);
        console.log(`      Got: ${r.actualOutput || 'null'}`);
        if (r.error) console.log(`      Error: ${r.error}`);
      }
    });
    return result.passed === result.total;
  } catch (error: any) {
    console.error('❌ Python test failed:', error.message);
    return false;
  }
}

async function testJava() {
  console.log('\n🧪 Testing Java...');
  
  const code = `
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int a = scanner.nextInt();
        int b = scanner.nextInt();
        System.out.println(a + b);
    }
}
  `.trim();

  const testCases = [
    { input: '5 10', expectedOutput: '15', timeoutMs: 10000 },
    { input: '20 30', expectedOutput: '50', timeoutMs: 10000 },
  ];

  try {
    const result = await testCodeWithTestCasesLocally(code, 'java', testCases);
    console.log('✅ Java Test Results:');
    console.log(`   Passed: ${result.passed}/${result.total}`);
    result.results.forEach((r, i) => {
      console.log(`   Test ${i + 1}: ${r.passed ? '✅ PASSED' : '❌ FAILED'}`);
      if (!r.passed) {
        console.log(`      Expected: ${r.expectedOutput}`);
        console.log(`      Got: ${r.actualOutput || 'null'}`);
        if (r.error) console.log(`      Error: ${r.error}`);
      }
    });
    return result.passed === result.total;
  } catch (error: any) {
    console.error('❌ Java test failed:', error.message);
    return false;
  }
}

async function testCpp() {
  console.log('\n🧪 Testing C++...');
  
  const code = `
#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}
  `.trim();

  const testCases = [
    { input: '5 10', expectedOutput: '15', timeoutMs: 10000 },
    { input: '20 30', expectedOutput: '50', timeoutMs: 10000 },
  ];

  try {
    const result = await testCodeWithTestCasesLocally(code, 'cpp', testCases);
    console.log('✅ C++ Test Results:');
    console.log(`   Passed: ${result.passed}/${result.total}`);
    result.results.forEach((r, i) => {
      console.log(`   Test ${i + 1}: ${r.passed ? '✅ PASSED' : '❌ FAILED'}`);
      if (!r.passed) {
        console.log(`      Expected: ${r.expectedOutput}`);
        console.log(`      Got: ${r.actualOutput || 'null'}`);
        if (r.error) console.log(`      Error: ${r.error}`);
      }
    });
    return result.passed === result.total;
  } catch (error: any) {
    console.error('❌ C++ test failed:', error.message);
    return false;
  }
}

async function testSingleExecution() {
  console.log('\n🧪 Testing Single Code Execution...');
  
  const code = 'console.log("Hello, World!");';
  
  try {
    const result = await executeCodeLocally(code, 'javascript', '', 5000);
    console.log('✅ Single Execution Test:');
    console.log(`   Status: ${result.status.description}`);
    console.log(`   Output: ${result.stdout || 'null'}`);
    console.log(`   Error: ${result.stderr || 'none'}`);
    return result.status.id === 3; // Accepted
  } catch (error: any) {
    console.error('❌ Single execution test failed:', error.message);
    return false;
  }
}

async function checkInstalledLanguages() {
  console.log('\n🔍 Checking Installed Languages...');
  
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  const checks = [
    { name: 'Node.js', command: 'node --version' },
    { name: 'Python 3', command: 'python3 --version' },
    { name: 'Java', command: 'javac -version' },
    { name: 'GCC', command: 'g++ --version' },
  ];

  for (const check of checks) {
    try {
      const { stdout } = await execAsync(check.command);
      console.log(`✅ ${check.name}: ${stdout.trim()}`);
    } catch (error: any) {
      console.log(`❌ ${check.name}: Not installed`);
    }
  }
}

async function main() {
  console.log('🚀 Starting Local Code Execution Tests...');
  console.log('=' .repeat(50));

  // Check installed languages
  await checkInstalledLanguages();

  // Test single execution
  const singleTest = await testSingleExecution();

  // Test different languages
  const results: { [key: string]: boolean } = {};

  // Test JavaScript
  try {
    results.javascript = await testJavaScript();
  } catch (error) {
    console.log('⚠️  JavaScript test skipped (Node.js may not be installed)');
    results.javascript = false;
  }

  // Test Python
  try {
    results.python = await testPython();
  } catch (error) {
    console.log('⚠️  Python test skipped (Python 3 may not be installed)');
    results.python = false;
  }

  // Test Java
  try {
    results.java = await testJava();
  } catch (error) {
    console.log('⚠️  Java test skipped (Java may not be installed)');
    results.java = false;
  }

  // Test C++
  try {
    results.cpp = await testCpp();
  } catch (error) {
    console.log('⚠️  C++ test skipped (GCC may not be installed)');
    results.cpp = false;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary:');
  console.log(`   Single Execution: ${singleTest ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   JavaScript: ${results.javascript ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Python: ${results.python ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Java: ${results.java ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   C++: ${results.cpp ? '✅ PASSED' : '❌ FAILED'}`);

  const totalTests = Object.keys(results).length + 1;
  const passedTests = Object.values(results).filter(Boolean).length + (singleTest ? 1 : 0);
  
  console.log(`\n✅ ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Local code execution is working correctly.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please check the error messages above.');
    process.exit(1);
  }
}

main().catch(console.error);


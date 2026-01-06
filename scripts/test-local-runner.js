
const http = require('http');

async function runTest(name, payload) {
  console.log(`\n--- Testing: ${name} ---`);
  try {
    const res = await fetch('http://localhost:3005/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
        console.error(`FAILED: HTTTP ${res.status}`);
        const text = await res.text();
        console.error('Response:', text);
        return;
    }

    const data = await res.json();
    console.log('Result:', JSON.stringify(data, null, 2));

    if (data.error) {
        console.log('⚠️  Execution Error (Expected for invalid code)');
    } else {
        console.log('✅  Success');
    }

  } catch (err) {
    console.error('FAILED: Connection refused or network error', err.message);
  }
}

async function start() {
    // 1. Health Check
    try {
        const h = await fetch('http://localhost:3005/health');
        if (h.ok) console.log('✅ Health Check Passed');
        else console.error('❌ Health Check Failed');
    } catch(e) {
        console.error('❌ Could not connect to local runner. Is it running?');
        process.exit(1);
    }

    // 2. Simple Python test
    await runTest('Basic Python Print', {
        code: 'print("Hello World")',
        language: 'python',
        input: '',
        timeLimit: 1000
    });

    // 3. Simple Java test
    await runTest('Basic Java Print', {
        code: 'public class Main { public static void main(String[] args) { System.out.println("Hello Java"); } }',
        language: 'java',
        input: '',
        timeLimit: 2000
    });

    // 4. Test with Input
    await runTest('Python Input Echo', {
        code: 'import sys; print(sys.stdin.read().strip())',
        language: 'python',
        input: 'Test Input Data',
        timeLimit: 1000
    });

    // 5. Test Error Handling (Syntax Error)
    await runTest('Syntax Error Check', {
        code: 'print("Missing Parenthesis',
        language: 'python',
        input: '',
        timeLimit: 1000
    });
}

start();

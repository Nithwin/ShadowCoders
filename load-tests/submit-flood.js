/**
 * Load Test — Code Submission Flood
 * 
 * Simulates 100 concurrent students submitting code simultaneously.
 * This is the most dangerous scenario for the system.
 * 
 * Prerequisites:
 * - Server running
 * - Valid JWT token for a test student
 * - Valid attempt ID and question ID
 * 
 * Run: node load-tests/submit-flood.js --token="..." --attemptId="..." --questionId="..."
 */

'use strict';

const http = require('http');
const https = require('https');

const API_URL = process.env.API_URL || 'http://localhost:4000';
const CONCURRENT = parseInt(process.env.CONCURRENT || '100');
const TOTAL_SUBMISSIONS = parseInt(process.env.TOTAL || '200');

// Parse command line args
const args = {};
process.argv.slice(2).forEach(arg => {
  const [key, value] = arg.replace('--', '').split('=');
  args[key] = value;
});

const TOKEN = args.token || process.env.TEST_TOKEN || '';
const ATTEMPT_ID = args.attemptId || process.env.TEST_ATTEMPT_ID || 'test-attempt';
const QUESTION_ID = args.questionId || process.env.TEST_QUESTION_ID || 'test-question';

// Sample code programs for different languages
const TEST_PROGRAMS = {
  python: {
    code: 'n = int(input())\nfor i in range(n):\n    print(i)',
    language: 'python',
    customInput: '5',
  },
  cpp: {
    code: '#include <iostream>\nusing namespace std;\nint main() {\n    int n;\n    cin >> n;\n    for(int i=0; i<n; i++) cout << i << endl;\n    return 0;\n}',
    language: 'cpp',
    customInput: '5',
  },
  c: {
    code: '#include <stdio.h>\nint main() {\n    int n;\n    scanf("%d", &n);\n    for(int i=0; i<n; i++) printf("%d\\n", i);\n    return 0;\n}',
    language: 'c',
    customInput: '5',
  },
  java: {
    code: 'import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        for(int i=0; i<n; i++) System.out.println(i);\n    }\n}',
    language: 'java',
    customInput: '5',
  },
};

// ============================================================
// Submission function
// ============================================================
function submitCode(program, index) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = new URL(`${API_URL}/api/execution/run`);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const body = JSON.stringify({
      code: program.code,
      language: program.language,
      input: program.customInput,
    });

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...(TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : {}),
      },
      timeout: 30000,
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          index,
          status: res.statusCode,
          duration,
          success: res.statusCode >= 200 && res.statusCode < 300,
          error: res.statusCode >= 400 ? data.substring(0, 200) : null,
        });
      });
    });

    req.on('error', (err) => {
      const duration = Date.now() - startTime;
      resolve({
        index,
        status: 0,
        duration,
        success: false,
        error: err.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const duration = Date.now() - startTime;
      resolve({
        index,
        status: 0,
        duration,
        success: false,
        error: 'Request timeout',
      });
    });

    req.write(body);
    req.end();
  });
}

// ============================================================
// Batch runner
// ============================================================
async function runBatch(batchSize, programs) {
  const promises = [];
  for (let i = 0; i < batchSize; i++) {
    const langKeys = Object.keys(programs);
    const lang = langKeys[i % langKeys.length];
    promises.push(submitCode(programs[lang], i));
  }
  return Promise.all(promises);
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('============================================');
  console.log('ShadowCoders — Code Submission Flood Test');
  console.log('============================================');
  console.log(`Target:      ${API_URL}`);
  console.log(`Concurrent:  ${CONCURRENT}`);
  console.log(`Total:       ${TOTAL_SUBMISSIONS}`);
  console.log(`Auth Token:  ${TOKEN ? 'provided' : 'none (using /api/execution/run)'}`);
  console.log('============================================\n');

  const allResults = [];
  let submitted = 0;

  const overallStart = Date.now();

  while (submitted < TOTAL_SUBMISSIONS) {
    const batchSize = Math.min(CONCURRENT, TOTAL_SUBMISSIONS - submitted);
    console.log(`Batch: submitting ${batchSize} requests (${submitted}/${TOTAL_SUBMISSIONS} done)...`);

    const results = await runBatch(batchSize, TEST_PROGRAMS);
    allResults.push(...results);
    submitted += batchSize;

    // Small gap between batches
    await new Promise(r => setTimeout(r, 500));
  }

  const overallDuration = Date.now() - overallStart;

  // ============================================================
  // Results Analysis
  // ============================================================
  console.log('\n============================================');
  console.log('RESULTS');
  console.log('============================================');

  const successful = allResults.filter(r => r.success);
  const failed = allResults.filter(r => !r.success);
  const durations = allResults.map(r => r.duration).sort((a, b) => a - b);

  console.log(`Total requests:  ${allResults.length}`);
  console.log(`Successful:      ${successful.length} (${((successful.length/allResults.length)*100).toFixed(1)}%)`);
  console.log(`Failed:          ${failed.length} (${((failed.length/allResults.length)*100).toFixed(1)}%)`);
  console.log(`Total time:      ${(overallDuration/1000).toFixed(1)}s`);
  console.log(`Throughput:      ${(allResults.length / (overallDuration/1000)).toFixed(1)} req/s`);
  console.log('');
  console.log('Latency:');
  console.log(`  Min:   ${durations[0]}ms`);
  console.log(`  Avg:   ${Math.round(durations.reduce((a,b) => a+b, 0) / durations.length)}ms`);
  console.log(`  p50:   ${durations[Math.floor(durations.length * 0.50)]}ms`);
  console.log(`  p90:   ${durations[Math.floor(durations.length * 0.90)]}ms`);
  console.log(`  p99:   ${durations[Math.floor(durations.length * 0.99)]}ms`);
  console.log(`  Max:   ${durations[durations.length - 1]}ms`);

  if (failed.length > 0) {
    console.log('\nError breakdown:');
    const errorCounts = {};
    failed.forEach(r => {
      const key = `${r.status}: ${(r.error || 'unknown').substring(0, 80)}`;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([error, count]) => {
        console.log(`  ${count}x — ${error}`);
      });
  }

  console.log('\n============================================');
  console.log('VERDICT');
  console.log('============================================');

  const successRate = (successful.length / allResults.length) * 100;
  const p99 = durations[Math.floor(durations.length * 0.99)];

  if (successRate >= 95 && p99 < 30000) {
    console.log('✓ PASS — System can handle the submission load');
  } else if (successRate >= 80) {
    console.log('⚠ WARNING — Some failures detected. Check error breakdown.');
  } else {
    console.log('✗ FAIL — Too many failures. System needs optimization.');
  }

  console.log(`\nNOTE: 503 (Server Busy) errors are EXPECTED behavior.`);
  console.log(`They indicate proper backpressure — the queue is protecting the system.`);
  console.log(`Students will see "try again in X seconds" and can retry.\n`);
}

main().catch(console.error);

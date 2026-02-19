/**
 * Load Test — API Stress Test
 * 
 * Tests the Express API under load using autocannon.
 * Simulates 400 concurrent students making API requests.
 * 
 * Install: npm install -g autocannon
 * Run:     node load-tests/autocannon-api.js
 */

'use strict';

const autocannon = require('autocannon');

const API_URL = process.env.API_URL || 'http://localhost:4000';

// ============================================================
// Test 1: Health Check (baseline)
// ============================================================
async function testHealthCheck() {
  console.log('\n=== Test 1: Health Check Baseline ===');
  console.log('Simulates 400 concurrent connections hitting /api/healthz');
  console.log('Expected: <50ms p99 latency, 0% errors\n');

  const result = await autocannon({
    url: `${API_URL}/api/healthz`,
    connections: 400,        // 400 concurrent connections
    duration: 10,            // 10 seconds
    pipelining: 1,           // 1 request per connection
    timeout: 10,             // 10s timeout
  });

  autocannon.printResult(result);
  return result;
}

// ============================================================
// Test 2: Queue Status (light endpoint)
// ============================================================
async function testQueueStatus() {
  console.log('\n=== Test 2: Queue Status Endpoint ===');
  console.log('Simulates students polling queue status\n');

  const result = await autocannon({
    url: `${API_URL}/api/queue/status`,
    connections: 200,
    duration: 10,
    pipelining: 1,
    timeout: 10,
  });

  autocannon.printResult(result);
  return result;
}

// ============================================================
// Test 3: Burst Traffic (1000 req/s)
// ============================================================
async function testBurstTraffic() {
  console.log('\n=== Test 3: Burst Traffic Simulation ===');
  console.log('1000 requests/second burst for 5 seconds\n');

  const result = await autocannon({
    url: `${API_URL}/api/healthz`,
    connections: 100,
    duration: 5,
    pipelining: 10,          // 10 pipelined requests per connection
    timeout: 10,
  });

  autocannon.printResult(result);
  return result;
}

// ============================================================
// Test 4: Sustained Load (5 minutes)
// ============================================================
async function testSustainedLoad() {
  console.log('\n=== Test 4: Sustained Load (5 min) ===');
  console.log('200 concurrent connections for 5 minutes\n');
  console.log('This tests memory leaks and stability under load\n');

  const result = await autocannon({
    url: `${API_URL}/api/healthz`,
    connections: 200,
    duration: 300,           // 5 minutes
    pipelining: 1,
    timeout: 10,
  });

  autocannon.printResult(result);
  return result;
}

// ============================================================
// Run all tests
// ============================================================
async function main() {
  console.log('============================================');
  console.log('ShadowCoders — API Load Test Suite');
  console.log(`Target: ${API_URL}`);
  console.log('============================================');

  const args = process.argv.slice(2);
  const testNum = args[0] ? parseInt(args[0]) : 0;

  if (testNum === 1 || testNum === 0) await testHealthCheck();
  if (testNum === 2 || testNum === 0) await testQueueStatus();
  if (testNum === 3 || testNum === 0) await testBurstTraffic();
  if (testNum === 4) await testSustainedLoad(); // Only on explicit request

  console.log('\n============================================');
  console.log('INTERPRETING RESULTS:');
  console.log('============================================');
  console.log('');
  console.log('SAFE FOR PRODUCTION if:');
  console.log('  ✓ p99 latency < 500ms for health/queue endpoints');
  console.log('  ✓ 0% errors (non-2xx) under normal load');
  console.log('  ✓ < 5% errors under burst');
  console.log('  ✓ Throughput > 500 req/s for lightweight endpoints');
  console.log('  ✓ No memory growth in sustained test');
  console.log('');
  console.log('NEEDS ATTENTION if:');
  console.log('  ✗ p99 latency > 2000ms');
  console.log('  ✗ > 10% errors under normal load');
  console.log('  ✗ Throughput < 100 req/s');
  console.log('  ✗ Server becomes unresponsive');
  console.log('');
}

main().catch(console.error);

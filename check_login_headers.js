const https = require('https');

const data = JSON.stringify({
  email: 'shadowadmin@gmail.com',
  password: 'shadowadmin'
});

const options = {
  hostname: 'api.shadowcoders.app', // Using the production backend
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('--- Sending Request to api.shadowcoders.app ---');
const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log('HEADERS:');
  console.log(JSON.stringify(res.headers, null, 2));
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();

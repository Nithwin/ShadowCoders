const https = require('https');

const data = JSON.stringify({
  email: 'shadowadmin@gmail.com',
  password: 'shadowadmin'
});

const options = {
  hostname: 'api.shadowcoders.app',
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log('--- COOKIES START ---');
  const cookies = res.headers['set-cookie'];
  if (cookies) {
    cookies.forEach(c => console.log(c));
  } else {
    console.log('NO COOKIES FOUND');
  }
  console.log('--- COOKIES END ---');
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();

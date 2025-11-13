#!/usr/bin/env node

/**
 * Script to get the local IP address for LAN access
 * This helps configure the frontend to connect to the backend on the same network
 */

const os = require('os');

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
        const nets = interfaces[name];
        if (nets) {
            for (const net of nets) {
                // Skip internal (loopback) and non-IPv4 addresses
                if (net.family === 'IPv4' && !net.internal) {
                    return net.address;
                }
            }
        }
    }
    
    return null;
}

const localIP = getLocalIP();

if (localIP) {
    console.log('\n' + '='.repeat(60));
    console.log('🌐 Your Local IP Address:');
    console.log('='.repeat(60));
    console.log(`\n📍 IP Address: ${localIP}`);
    console.log(`\n📝 Use this IP to configure your frontend:`);
    console.log(`   NEXT_PUBLIC_API_BASE_URL=http://${localIP}:4000/api`);
    console.log(`\n📱 Share this URL with others on your network:`);
    console.log(`   http://${localIP}:4000`);
    console.log('\n' + '='.repeat(60) + '\n');
} else {
    console.error('❌ Could not find local IP address. Make sure you are connected to a network.');
    process.exit(1);
}


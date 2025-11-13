import { createApp } from "./app";
import { env } from "./config/env";
import os from "os";

const PORT = env.PORT || 4000;

const app = createApp();

// Get local IP address for LAN access
const getLocalIP = (): string | null => {
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
};

// Listen on all network interfaces (0.0.0.0) to allow LAN access
const HOST = '0.0.0.0';
const localIP = getLocalIP();

app.listen(PORT, HOST, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Backend Server Started Successfully!');
    console.log('='.repeat(60));
    console.log(`📍 Local URL:    http://localhost:${PORT}`);
    if (localIP) {
        console.log(`🌐 LAN URL:      http://${localIP}:${PORT}`);
        console.log(`📱 Share this URL with others on your network!`);
    }
    console.log(`🌍 Environment:  ${env.NODE_ENV || 'development'}`);
    console.log(`📊 Health Check: http://localhost:${PORT}/api/healthz`);
    if (localIP) {
        console.log(`📊 Health Check (LAN): http://${localIP}:${PORT}/api/healthz`);
    }
    console.log(`🧪 CORS Test:     http://localhost:${PORT}/api/test-cors`);
    console.log('='.repeat(60) + '\n');
});





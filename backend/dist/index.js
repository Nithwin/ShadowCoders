"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const os_1 = __importDefault(require("os"));
const http_1 = __importDefault(require("http"));
const socket_1 = require("./lib/socket");
const PORT = Number(env_1.env.PORT) || 4000;
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    // In production, you might want to gracefully shutdown
    if (env_1.env.NODE_ENV === 'production') {
        console.error('Application will exit due to uncaught exception');
        process.exit(1);
    }
});
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    // In production, you might want to gracefully shutdown
    if (env_1.env.NODE_ENV === 'production') {
        console.error('Application will exit due to unhandled rejection');
        process.exit(1);
    }
});
// Handle SIGTERM (used by process managers like PM2)
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
    console.log('\nSIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
const app = (0, app_1.createApp)();
// Create HTTP server
const server = http_1.default.createServer(app);
// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please use a different port.`);
        process.exit(1);
    }
    else {
        console.error('❌ Server error:', error);
        process.exit(1);
    }
});
// Initialize Socket.IO
socket_1.examMonitoring.initialize(server);
// Get local IP address for LAN access
const getLocalIP = () => {
    const interfaces = os_1.default.networkInterfaces();
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
server.listen(PORT, HOST, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Backend Server Started Successfully!');
    console.log('='.repeat(60));
    console.log(`📍 Local URL:    http://localhost:${PORT}`);
    if (localIP) {
        console.log(`🌐 LAN URL:      http://${localIP}:${PORT}`);
        console.log(`📱 Share this URL with others on your network!`);
    }
    console.log(`🌍 Environment:  ${env_1.env.NODE_ENV || 'development'}`);
    console.log(`📊 Health Check: http://localhost:${PORT}/api/healthz`);
    if (localIP) {
        console.log(`📊 Health Check (LAN): http://${localIP}:${PORT}/api/healthz`);
    }
    console.log(`🧪 CORS Test:     http://localhost:${PORT}/api/test-cors`);
    console.log(`🔌 Socket.IO:     WebSocket server initialized`);
    console.log('='.repeat(60) + '\n');
});
//# sourceMappingURL=index.js.map
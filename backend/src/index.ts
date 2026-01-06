import { createApp } from "./app";
import { env } from "./config/env";
import os from "os";
import http from "http";
import { examMonitoring } from "./lib/socket";
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { initAutoSubmitCron } from './cron/auto-submit';

const PORT = Number(env.PORT) || 4000;

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    // In production, you might want to gracefully shutdown
    if (env.NODE_ENV === 'production') {
        console.error('Application will exit due to uncaught exception');
        process.exit(1);
    }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    // In production, you might want to gracefully shutdown
    if (env.NODE_ENV === 'production') {
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

// const app = createApp(); // Original line
const app = express(); // Changed from createApp() to express()

// Create HTTP server
// const server = http.createServer(app); // Original line
const server = http.createServer(app); // Kept http.createServer for consistency with original, but variable name changed to 'server' as per original

// Initialize Cron Jobs
initAutoSubmitCron(); // Added cron job initialization

// Middleware
app.use(cors({
  origin: '*', // Allow all for now (dev)
  credentials: true
}));

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please use a different port.`);
        process.exit(1);
    } else {
        console.error('❌ Server error:', error);
        process.exit(1);
    }
});

// Initialize Socket.IO
examMonitoring.initialize(server);

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

server.listen(PORT, HOST, () => {
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
    console.log(`🔌 Socket.IO:     WebSocket server initialized`);
    console.log('='.repeat(60) + '\n');
});





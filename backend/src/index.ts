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
import { closeQueues } from './lib/queue';
import { closeRedis } from './lib/redis';

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

/**
 * Graceful shutdown: close server → close queues → close Redis → exit
 * Gives in-flight requests 10s to finish before force-killing.
 */
async function gracefulShutdown(signal: string) {
    console.log(`\n${signal} received, shutting down gracefully...`);
    
    // 1. Stop accepting new connections
    server.close(async () => {
        console.log('[Shutdown] HTTP server closed');
        
        try {
            // 2. Close BullMQ queues (drain producers)
            await closeQueues();
            console.log('[Shutdown] Queues closed');
            
            // 3. Close Redis connection
            await closeRedis();
            console.log('[Shutdown] Redis closed');
        } catch (err) {
            console.error('[Shutdown] Error during cleanup:', err);
        }
        
        console.log('[Shutdown] Clean exit');
        process.exit(0);
    });
    
    // Force kill after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
        console.error('[Shutdown] Forced exit after 10s timeout');
        process.exit(1);
    }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

const app = createApp();

// Create HTTP server
const server = http.createServer(app);

// Initialize Cron Jobs
initAutoSubmitCron(); // Added cron job initialization

// CORS is handled in createApp() within app.ts
// app.use(cors(...));

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
const io = examMonitoring.initialize(server);

import { meetingHandler } from './socket/meeting.handler';
if (io) {
    meetingHandler(io);
}


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





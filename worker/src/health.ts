import http from 'http';
import { Worker } from 'bullmq';

/**
 * Simple HTTP health check server for worker monitoring.
 * PM2 and external monitors can poll this endpoint.
 */
export function startHealthServer(port: number, worker: Worker) {
  const server = http.createServer(async (req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      try {
        const isRunning = worker.isRunning();
        
        // Get basic stats
        const stats = {
          status: isRunning ? 'healthy' : 'unhealthy',
          worker: {
            running: isRunning,
            pid: process.pid,
            uptime: process.uptime(),
            memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          },
          timestamp: new Date().toISOString(),
        };

        const statusCode = isRunning ? 200 : 503;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', error: (err as Error).message }));
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Health] Health check server listening on :${port}/health`);
  });

  // Don't let the health server keep the process alive
  server.unref();

  return server;
}

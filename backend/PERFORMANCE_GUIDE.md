# Performance Guide for 20 Concurrent Users

## Can Your Laptop Handle 20 Concurrent Exam Takers?

**Short Answer: YES, with proper configuration!** ✅

## System Requirements

### Minimum Recommended Specs:
- **CPU**: 4+ cores (Intel i5 / AMD Ryzen 5 or better)
- **RAM**: 8GB+ (16GB recommended)
- **Storage**: SSD recommended for database
- **Network**: Stable connection (LAN or WiFi)

### Current System Analysis:
- ✅ **Code Execution Queue**: Limits concurrent executions (default: 5)
- ✅ **Database Connection Pooling**: Configured via Prisma
- ✅ **Execution Queue System**: Prevents system overload

## Configuration for 20 Users

### 1. Increase Concurrent Code Executions

Add to your `.env` file:
```env
# Increase concurrent executions (recommended: 8-10 for typical laptops)
MAX_CONCURRENT_EXECUTIONS=8
```

**Guidelines:**
- **4-core CPU**: Set to 6-8
- **6-8 core CPU**: Set to 8-10
- **8+ core CPU**: Set to 10-12

### 2. Database Connection Pool

Update your `DATABASE_URL` in `.env`:
```env
# Add connection_limit parameter
DATABASE_URL=postgresql://user:password@localhost:5432/shadowcoders?connection_limit=20&pool_timeout=10
```

### 3. Node.js Memory Limit (if needed)

If you experience memory issues, increase Node.js heap:
```bash
# In package.json, update start script:
"start": "node --max-old-space-size=4096 dist/index.js"
```

## Performance Expectations

### With Default Settings (5 concurrent):
- **Code Execution**: Students may wait 2-5 seconds when queue is full
- **Database**: Should handle 20 users easily
- **Overall**: Acceptable for small exams

### With Optimized Settings (8 concurrent):
- **Code Execution**: Minimal waiting (1-2 seconds)
- **Database**: Smooth performance
- **Overall**: Good experience for 20 users

## Resource Usage Estimates

### Per User (Active):
- **Memory**: ~50-100MB (browsing) + ~200-500MB (running code)
- **CPU**: Low (browsing) to Medium (code execution)
- **Database Connections**: 1-2 per user

### Total for 20 Users:
- **Memory**: ~2-4GB (browsing) + ~4-10GB (if all run code simultaneously)
- **CPU**: 20-40% average, 60-80% peak (during code execution)
- **Database Connections**: 20-40 connections

## Bottlenecks & Solutions

### 1. Code Execution Queue (Most Critical)
**Problem**: Only 5 concurrent executions by default
**Solution**: Increase `MAX_CONCURRENT_EXECUTIONS` to 8-10

### 2. Database Connections
**Problem**: Too many connections can overwhelm PostgreSQL
**Solution**: Set `connection_limit=20` in DATABASE_URL

### 3. Memory Usage
**Problem**: Multiple code executions consume memory
**Solution**: 
- Monitor memory usage
- Restart server if memory leaks occur
- Consider increasing system RAM

### 4. CPU Usage
**Problem**: Code compilation/execution is CPU-intensive
**Solution**:
- Limit concurrent executions appropriately
- Use SSD for better I/O performance
- Close unnecessary applications

## Monitoring Performance

### Check System Resources:
```bash
# Windows: Task Manager
# Linux/Mac: htop or top
```

### Monitor Queue Status:
The execution queue logs its status:
```
[ExecutionQueue] Starting job job-xxx. Running: 3/8, Queued: 2
```

### Database Connections:
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;
```

## Optimization Tips

1. **Use SSD**: Significantly improves database and code execution performance
2. **Close Unnecessary Apps**: Free up CPU and RAM
3. **Monitor Temperature**: Ensure laptop doesn't throttle due to heat
4. **Network**: Use wired connection if possible (more stable than WiFi)
5. **Database**: Keep PostgreSQL well-maintained (regular VACUUM)

## Testing Before Exam

1. **Load Test**: Have 5-10 test users connect simultaneously
2. **Code Execution Test**: Have multiple users run code at the same time
3. **Monitor Resources**: Watch CPU, RAM, and database connections
4. **Adjust Settings**: Fine-tune `MAX_CONCURRENT_EXECUTIONS` based on results

## Troubleshooting

### If System Becomes Slow:
1. Reduce `MAX_CONCURRENT_EXECUTIONS` to 5-6
2. Check database connection count
3. Restart PostgreSQL if needed
4. Monitor for memory leaks

### If Code Execution Fails:
1. Check queue status in logs
2. Verify SQLite3/compilers are installed
3. Check disk space (temp files)
4. Review timeout settings

## Recommended Settings for 20 Users

```env
# .env file
MAX_CONCURRENT_EXECUTIONS=8
DATABASE_URL=postgresql://user:pass@localhost:5432/shadowcoders?connection_limit=20&pool_timeout=10
```

## Conclusion

**Your laptop CAN handle 20 concurrent users** with:
- ✅ Proper configuration (8 concurrent executions)
- ✅ Adequate hardware (4+ cores, 8GB+ RAM)
- ✅ Good network connection
- ✅ Monitoring and optimization

The system is designed with a queue to prevent overload, so even if all 20 users try to run code simultaneously, they'll be queued and processed safely.


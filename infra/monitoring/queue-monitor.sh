#!/bin/bash
# ============================================================
# Queue Depth Monitor
# ============================================================
# Monitors Redis BullMQ queue depth and alerts if too high.
# Run via cron: */1 * * * * /opt/shadowcoders/infra/monitoring/queue-monitor.sh
#
# Requires: redis-cli

REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"
LOG_FILE="/var/log/pm2/queue-monitor.log"
WARN_THRESHOLD=50
CRITICAL_THRESHOLD=200

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Get BullMQ queue lengths
# BullMQ stores waiting jobs in a sorted set: bull:<queue>:wait
WAITING=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT LLEN "bull:code-execution:wait" 2>/dev/null || echo "0")
ACTIVE=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT LLEN "bull:code-execution:active" 2>/dev/null || echo "0")
DELAYED=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT ZCARD "bull:code-execution:delayed" 2>/dev/null || echo "0")
FAILED=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT ZCARD "bull:code-execution:failed" 2>/dev/null || echo "0")

TOTAL=$((WAITING + ACTIVE))

# Always log current state
echo "[$TIMESTAMP] Queue: waiting=$WAITING active=$ACTIVE delayed=$DELAYED failed=$FAILED total=$TOTAL" >> $LOG_FILE

if [ "$TOTAL" -ge "$CRITICAL_THRESHOLD" ]; then
    echo "[$TIMESTAMP] CRITICAL: Queue depth $TOTAL >= $CRITICAL_THRESHOLD. Workers may be stuck!" >> $LOG_FILE
    
    # Check if workers are running
    WORKER_COUNT=$(pm2 jlist 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    count = sum(1 for p in data if 'worker' in p.get('name','').lower() and p.get('pm2_env',{}).get('status') == 'online')
    print(count)
except:
    print(0)
" 2>/dev/null || echo "?")
    
    echo "[$TIMESTAMP] Active workers: $WORKER_COUNT" >> $LOG_FILE
    
    # Restart workers if they seem stuck
    if [ "$WORKER_COUNT" = "0" ]; then
        echo "[$TIMESTAMP] No workers running! Restarting..." >> $LOG_FILE
        pm2 restart shadowcoders-worker 2>/dev/null
    fi
    
elif [ "$TOTAL" -ge "$WARN_THRESHOLD" ]; then
    echo "[$TIMESTAMP] WARNING: Queue depth $TOTAL >= $WARN_THRESHOLD" >> $LOG_FILE
fi

# Clean up old failed jobs (older than 1 hour)
redis-cli -h $REDIS_HOST -p $REDIS_PORT ZREMRANGEBYSCORE "bull:code-execution:failed" 0 $(($(date +%s) - 3600))000 > /dev/null 2>&1

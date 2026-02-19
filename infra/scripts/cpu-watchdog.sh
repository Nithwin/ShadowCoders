#!/bin/bash
# ============================================================
# CPU Watchdog Script
# ============================================================
# Monitors CPU usage and takes action when threshold exceeded.
# Run via cron: */1 * * * * /opt/shadowcoders/infra/scripts/cpu-watchdog.sh
#
# Actions:
# - Log warning at 80% CPU
# - Kill stale Docker containers at 90%
# - Log critical alert at 95%

THRESHOLD_WARN=80
THRESHOLD_ACTION=90
THRESHOLD_CRITICAL=95
LOG_FILE="/var/log/pm2/cpu-watchdog.log"

# Get CPU usage (average over 3 seconds)
CPU_USAGE=$(top -bn3 | grep "Cpu(s)" | tail -1 | awk '{print 100 - $8}' | cut -d'.' -f1)

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

if [ "$CPU_USAGE" -ge "$THRESHOLD_CRITICAL" ]; then
    echo "[$TIMESTAMP] CRITICAL: CPU at ${CPU_USAGE}%. Killing old Docker containers." >> $LOG_FILE
    
    # Kill Docker containers running longer than 30 seconds
    docker ps --filter "ancestor=shadowcoders-sandbox" --format "{{.ID}} {{.RunningFor}}" | while read id time; do
        if echo "$time" | grep -qE "^[3-9][0-9]s|^[0-9]+m|^[0-9]+h"; then
            echo "[$TIMESTAMP] Killing container $id (running for $time)" >> $LOG_FILE
            docker kill $id 2>/dev/null
        fi
    done
    
elif [ "$CPU_USAGE" -ge "$THRESHOLD_ACTION" ]; then
    echo "[$TIMESTAMP] WARNING: CPU at ${CPU_USAGE}%. Cleaning stale containers." >> $LOG_FILE
    
    # Remove stopped containers
    docker container prune -f >> /dev/null
    
    # Kill containers running > 60 seconds
    docker ps --filter "ancestor=shadowcoders-sandbox" --format "{{.ID}} {{.RunningFor}}" | while read id time; do
        if echo "$time" | grep -qE "^[6-9][0-9]s|^[0-9]+m|^[0-9]+h"; then
            echo "[$TIMESTAMP] Killing stale container $id" >> $LOG_FILE
            docker kill $id 2>/dev/null
        fi
    done
    
elif [ "$CPU_USAGE" -ge "$THRESHOLD_WARN" ]; then
    echo "[$TIMESTAMP] INFO: CPU at ${CPU_USAGE}%. Elevated but OK." >> $LOG_FILE
fi

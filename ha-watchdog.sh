#!/bin/bash

# CMDs
# nano /usr/local/bin/ha-watchdog.sh
# TIP: CTRL + K to empty file fast
# systemctl restart ha_watchdog.service
# journalctl -t ha-watchdog -f

# --- Configuration ---
HA_IP="192.168.50.135:8123"
HA_URL="http://$HA_IP"
VMID="100"
LOG_TAG="ha-watchdog"
MAX_FAILS=20
INTERVAL_SECONDS=15
TIMEOUT_SECONDS=2

# --- State ---
CURRENT_FAILS=0

logger -t "$LOG_TAG" "HA Watchdog started for VM $VMID. Monitoring HA UI at $HA_URL/api/websocket every $INTERVAL_SECONDS seconds."

# --- Daemon Loop ---
while true; do

    # Simulates a UI WebSocket handshake. 
    STATUS=$(curl -s -i -N \
        -H "Upgrade: websocket" \
        -H "Connection: Upgrade" \
        -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
        -H "Sec-WebSocket-Version: 13" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Host: $HA_IP" \
        -H "Origin: $HA_URL" \
        --max-time "$TIMEOUT_SECONDS" \
        "$HA_URL/api/websocket" | grep -c "HTTP/1.1 101")

    if [ "$STATUS" -eq 0 ]; then
        logger -t "$LOG_TAG" "UI WebSocket Handshake failed/timed out. Loop may be hanged."
        
        GUEST_EXEC_RESULT=$(qm guest exec "$VMID" -- ha jobs info 2>/dev/null)

        logger -t "$LOG_TAG" "Supervisor jobs output: $GUEST_EXEC_RESULT"
        
        if [ -z "$GUEST_EXEC_RESULT" ]; then
            ACTIVE_JOBS=1
            logger -t "$LOG_TAG" "Warning: QEMU Guest Agent did not respond. Assuming active jobs to prevent unsafe reboot."
        else
            YAML_CONTENT=$(echo "$GUEST_EXEC_RESULT" | jq -r '.["out-data"]')

            # Extract everything from "jobs:" to the end, and count lines starting with "-"
            # This counts the actual job entries in the YAML list.
            JOB_COUNT=$(echo "$YAML_CONTENT" | sed -n '/^jobs:/,$p' | grep -c "^-")

            if [ "$JOB_COUNT" -eq 0 ]; then
                ACTIVE_JOBS=0
            else
                ACTIVE_JOBS=1
            fi
        fi

        if [ "$ACTIVE_JOBS" -eq 0 ]; then
            ((CURRENT_FAILS++)) 

            if [ "$CURRENT_FAILS" -ge "$MAX_FAILS" ]; then
                logger -t "$LOG_TAG" "HA UI down. No active jobs. Main thread locked. Rebooting VM $VMID."
                qm reboot "$VMID"
                CURRENT_FAILS=0 
            else
                # Optional: Log the incrementing failures during testing
                logger -t "$LOG_TAG" "HA UI check failed. Fail count: $CURRENT_FAILS/$MAX_FAILS."
            fi
        else
            logger -t "$LOG_TAG" "HA UI down, but Supervisor has $ACTIVE_JOBS active job(s). Deferring reboot."
            CURRENT_FAILS=0 
        fi
    else
        if [ "$CURRENT_FAILS" -gt 0 ]; then
            logger -t "$LOG_TAG" "HA UI Responsive. Resetting failure count"
        fi
        CURRENT_FAILS=0
    fi
    
    sleep "$INTERVAL_SECONDS"
done
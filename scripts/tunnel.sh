#!/bin/bash
# SmartCC Live Public Tunnel (Cloudflare Tunnel)
# Usage:
#   ./scripts/tunnel.sh start   - Starts public HTTPS tunnel in background & prints live URL
#   ./scripts/tunnel.sh status  - Shows current tunnel status & live URL
#   ./scripts/tunnel.sh stop    - Stops the public tunnel

PID_FILE="/tmp/smartcc_tunnel.pid"
LOG_FILE="/tmp/smartcc_tunnel.log"
PORT="${WEB_PORT:-5273}"

start() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "Tunnel is already running with PID $(cat "$PID_FILE")."
    status
    exit 0
  fi

  echo "Starting public Cloudflare Tunnel for port $PORT..."
  nohup cloudflared tunnel --http-host-header="localhost:$PORT" --url "http://localhost:$PORT" > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"

  echo "Waiting for live URL..."
  for i in {1..20}; do
    sleep 1
    URL=$(grep -o 'https://[-a-zA-Z0-9]*\.trycloudflare\.com' "$LOG_FILE" | head -n 1)
    if [ -n "$URL" ]; then
      echo ""
      echo "=========================================================="
      echo "  SmartCC is LIVE on the Public Internet!"
      echo "  URL: $URL"
      echo "=========================================================="
      echo "  - All 5 Company Portals: $URL/c/sbi, $URL/c/tatasteel, etc."
      echo "  - Universal Login: xyz@gmail.com / 1234"
      echo "  - Voice AI & Speech: Active over HTTPS"
      echo "=========================================================="
      exit 0
    fi
  done
  echo "Tunnel started. Check logs: $LOG_FILE"
}

status() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    URL=$(grep -o 'https://[-a-zA-Z0-9]*\.trycloudflare\.com' "$LOG_FILE" | head -n 1)
    echo "Tunnel is ACTIVE (PID: $(cat "$PID_FILE"))"
    echo "Live Public URL: ${URL:-pending}"
  else
    echo "Tunnel is NOT running."
  fi
}

stop() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    echo "Stopping tunnel (PID: $PID)..."
    kill "$PID" 2>/dev/null
    rm -f "$PID_FILE"
    echo "Tunnel stopped."
  else
    pkill -f "cloudflared tunnel" 2>/dev/null
    echo "All cloudflared processes stopped."
  fi
}

case "$1" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  status)
    status
    ;;
  *)
    echo "Usage: $0 {start|status|stop}"
    exit 1
    ;;
esac

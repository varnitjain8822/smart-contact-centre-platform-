#!/bin/bash
# SmartCC Live Public Tunnel (Cloudflare Tunnel)
# Manages live HTTPS public tunnels for BOTH:
#   1. Customer Portal (Port 5273) -> Multi-company portals, Voice AI
#   2. Admin & Agent Workspace (Port 3310) -> Chatwoot tickets, inboxes, SLA, reports
#
# Usage:
#   ./scripts/tunnel.sh start   - Starts both public HTTPS tunnels in background & prints live URLs
#   ./scripts/tunnel.sh status  - Shows current status and live URLs for both portals
#   ./scripts/tunnel.sh stop    - Stops all public tunnels cleanly

PID_WEB="/tmp/smartcc_web_tunnel.pid"
LOG_WEB="/tmp/smartcc_web_tunnel.log"
PORT_WEB="${WEB_PORT:-5273}"

PID_ADMIN="/tmp/smartcc_admin_tunnel.pid"
LOG_ADMIN="/tmp/smartcc_admin_tunnel.log"
PORT_ADMIN="${CW_PORT:-3310}"

get_web_url() {
  if [ -f "$LOG_WEB" ]; then
    grep -o 'https://[-a-zA-Z0-9]*\.trycloudflare\.com' "$LOG_WEB" | head -n 1
  fi
}

get_admin_url() {
  if [ -f "$LOG_ADMIN" ]; then
    grep -o 'https://[-a-zA-Z0-9]*\.trycloudflare\.com' "$LOG_ADMIN" | head -n 1
  fi
}

sync_endpoints() {
  local w_url="$1"
  local a_url="$2"
  if [ -n "$w_url" ] && [ -n "$a_url" ]; then
    cat > /tmp/live-endpoints.json << EOF
{"customerPortalUrl":"$w_url","adminPortalUrl":"$a_url"}
EOF
    # Sync into Docker container if running
    if docker ps --format '{{.Names}}' | grep -q 'smartcc-web'; then
      docker cp /tmp/live-endpoints.json smartcc-web-1:/app/dist/live-endpoints.json 2>/dev/null || true
    fi
    if [ -d "web/dist" ]; then
      cp /tmp/live-endpoints.json web/dist/live-endpoints.json 2>/dev/null || true
    fi
  fi
}

start() {
  echo "=========================================================="
  echo "  Starting SmartCC Public Live Deployment (Cloudflare)..."
  echo "=========================================================="

  # 1. Start Customer Portal Tunnel (Port 5273)
  if [ -f "$PID_WEB" ] && kill -0 "$(cat "$PID_WEB")" 2>/dev/null; then
    echo "• Customer Portal tunnel already running (PID: $(cat "$PID_WEB"))."
  else
    echo "• Launching Customer Portal tunnel (port $PORT_WEB)..."
    nohup cloudflared tunnel --http-host-header="localhost:$PORT_WEB" --url "http://localhost:$PORT_WEB" > "$LOG_WEB" 2>&1 &
    echo $! > "$PID_WEB"
  fi

  # 2. Start Admin / Agent Portal Tunnel (Port 3310)
  if [ -f "$PID_ADMIN" ] && kill -0 "$(cat "$PID_ADMIN")" 2>/dev/null; then
    echo "• Admin Portal tunnel already running (PID: $(cat "$PID_ADMIN"))."
  else
    echo "• Launching Admin & Agent Portal tunnel (port $PORT_ADMIN)..."
    nohup cloudflared tunnel --http-host-header="localhost:$PORT_ADMIN" --url "http://localhost:$PORT_ADMIN" > "$LOG_ADMIN" 2>&1 &
    echo $! > "$PID_ADMIN"
  fi

  echo "Waiting for Cloudflare edge routing..."
  WEB_URL=""
  ADMIN_URL=""
  for i in {1..25}; do
    [ -z "$WEB_URL" ] && WEB_URL=$(get_web_url)
    [ -z "$ADMIN_URL" ] && ADMIN_URL=$(get_admin_url)
    if [ -n "$WEB_URL" ] && [ -n "$ADMIN_URL" ]; then
      break
    fi
    sleep 1
  done

  sync_endpoints "$WEB_URL" "$ADMIN_URL"

  echo ""
  echo "=========================================================="
  echo "  🎉 SmartCC PLATFORM IS LIVE ON THE PUBLIC INTERNET!"
  echo "=========================================================="
  echo ""
  echo "  1. 🌐 CUSTOMER PORTALS & VOICE AI:"
  echo "     Public URL : $WEB_URL"
  echo "     - State Bank of India : $WEB_URL/c/sbi"
  echo "     - Tata Steel          : $WEB_URL/c/tatasteel"
  echo "     - Delhi Airport (T3)  : $WEB_URL/c/delhiairport"
  echo "     - Passport Seva       : $WEB_URL/c/passportseva"
  echo "     - Infosys Client Hub  : $WEB_URL/c/infosys"
  echo ""
  echo "  2. 🛡️ ADMIN & AGENT WORKSPACE (CHATWOOT):"
  echo "     Public URL : $ADMIN_URL"
  echo "     Dashboard  : $ADMIN_URL/app/accounts/3/dashboard"
  echo "     - Multi-Company Tickets & AI Routing"
  echo "     - Universal Credentials: xyz@gmail.com / 1234"
  echo "=========================================================="
}

status() {
  WEB_RUNNING=0
  ADMIN_RUNNING=0
  [ -f "$PID_WEB" ] && kill -0 "$(cat "$PID_WEB")" 2>/dev/null && WEB_RUNNING=1
  [ -f "$PID_ADMIN" ] && kill -0 "$(cat "$PID_ADMIN")" 2>/dev/null && ADMIN_RUNNING=1

  echo "=========================================================="
  echo "  SmartCC Live Deployment Status"
  echo "=========================================================="
  if [ "$WEB_RUNNING" -eq 1 ]; then
    echo "• Customer Portal Tunnel : ACTIVE (PID: $(cat "$PID_WEB"))"
    echo "  Live URL               : $(get_web_url)"
  else
    echo "• Customer Portal Tunnel : STOPPED"
  fi

  if [ "$ADMIN_RUNNING" -eq 1 ]; then
    echo "• Admin Portal Tunnel    : ACTIVE (PID: $(cat "$PID_ADMIN"))"
    echo "  Live URL               : $(get_admin_url)"
  else
    echo "• Admin Portal Tunnel    : STOPPED"
  fi
  echo "=========================================================="
}

stop() {
  echo "Stopping SmartCC tunnels..."
  if [ -f "$PID_WEB" ]; then
    kill "$(cat "$PID_WEB")" 2>/dev/null || true
    rm -f "$PID_WEB"
  fi
  if [ -f "$PID_ADMIN" ]; then
    kill "$(cat "$PID_ADMIN")" 2>/dev/null || true
    rm -f "$PID_ADMIN"
  fi
  pkill -f "cloudflared tunnel" 2>/dev/null || true
  rm -f /tmp/smartcc_tunnel.pid
  echo "All public tunnels stopped."
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

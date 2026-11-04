#!/usr/bin/env bash
# Development sandbox only: (re)start Docker, local Supabase and the Next dev server.
set -u
LOG=${LOG_DIR:-/tmp/claude-0/-home-user/ad120f10-aeb1-597b-8382-9533766a5bf1/scratchpad}
cd "$(dirname "$0")/.."
if ! docker ps >/dev/null 2>&1; then
  setsid nohup dockerd > "$LOG/dockerd.log" 2>&1 < /dev/null &
  for i in $(seq 1 30); do docker ps >/dev/null 2>&1 && break; sleep 1; done
fi
SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io npx supabase start -x vector,logflare,supavisor,imgproxy,realtime,edge-runtime >/dev/null 2>&1 || echo "supabase start failed"
if ! curl -s -o /dev/null http://localhost:3000/; then
  setsid nohup npm run dev -- --port 3000 > "$LOG/dev.log" 2>&1 < /dev/null &
  for i in $(seq 1 60); do curl -s -o /dev/null http://localhost:3000/admin/login && break; sleep 2; done
fi
echo "docker: $(docker ps -q | wc -l) containers; dev: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/)"

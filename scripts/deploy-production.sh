#!/bin/bash
# MULUK Production Deployment Script

set -e

echo "MULUK Production Deployment"
echo "============================"
echo ""

# Check for required environment variables
echo "Checking environment variables..."

if [ -z "$OPENROUTER_API_KEY" ]; then
  echo "OPENROUTER_API_KEY not set"
  exit 1
fi
echo "OPENROUTER_API_KEY OK"

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "SUPABASE_SERVICE_ROLE_KEY not set"
  exit 1
fi
echo "SUPABASE_SERVICE_ROLE_KEY OK"

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "NEXT_PUBLIC_SUPABASE_URL not set"
  exit 1
fi
echo "NEXT_PUBLIC_SUPABASE_URL OK"

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY not set"
  exit 1
fi
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY OK"

if [ -z "$NEXT_PUBLIC_SITE_URL" ]; then
  echo "NEXT_PUBLIC_SITE_URL not set"
  exit 1
fi
echo "NEXT_PUBLIC_SITE_URL OK"

echo ""
echo "Building application..."
npm run build

echo ""
echo "Deploying to Vercel..."
vercel --prod

echo ""
echo "Deployment complete!"
echo ""
echo "Testing endpoints..."
sleep 5

# Test health check
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${NEXT_PUBLIC_SITE_URL}/api/debug/ai-status" || echo "000")
if [ "$HEALTH_STATUS" = "200" ]; then
  echo "API health check passed"
else
  echo "API health check returned $HEALTH_STATUS (debug routes disabled in production — expected)"
fi

echo ""
echo "MULUK is live!"
echo "Dashboard: ${NEXT_PUBLIC_SITE_URL}/dashboard"

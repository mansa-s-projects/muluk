#!/bin/bash
# MULUK Local Development Setup

set -e

echo "MULUK Local Setup"
echo "================="
echo ""

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "18" ]; then
  echo "Node.js 18+ required (found $(node -v))"
  exit 1
fi
echo "Node.js $(node -v)"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Check for .env.local
if [ ! -f ".env.local" ]; then
  echo ""
  echo ".env.local not found"
  echo "Copying from .env.example..."
  cp .env.example .env.local
  echo "Please edit .env.local with your API keys"
fi

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your API keys"
echo "2. Run 'npm run dev' to start development"
echo "3. Open http://localhost:3000"

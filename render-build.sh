#!/usr/bin/env bash

# exit on error
set -o errexit

# Install dependencies
npm install

# Ensure the Puppeteer cache directory exists
PUPPETEER_CACHE_DIR="$(pwd)/puppeteer-cache"
mkdir -p "$PUPPETEER_CACHE_DIR"

# Install Chrome for Puppeteer
npx puppeteer browsers install chrome --path "$PUPPETEER_CACHE_DIR"

echo "Chrome installed successfully to $PUPPETEER_CACHE_DIR"

# Build Next.js
npm run build

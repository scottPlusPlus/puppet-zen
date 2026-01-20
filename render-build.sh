#!/usr/bin/env bash

# exit on error
set -o errexit

# Install dependencies
npm install

# Install Chrome for Puppeteer (using default cache location)
npx puppeteer browsers install chrome

echo "Chrome installed successfully"

# Build TypeScript
npm run build

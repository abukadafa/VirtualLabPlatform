#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Production Deployment..."

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please create it based on .env.production.example"
    exit 1
fi

# 1. Build Client
echo "📦 Building Frontend..."
cd client
npm install
npm run build
cd ..

# 2. Start Production Containers
echo "🐳 Starting Docker containers in production mode..."
docker-compose -f docker/docker-compose.prod.yml up -d --build

echo "✅ Deployment Successful!"
echo "The application should now be accessible at your configured domain."
echo "Don't forget to set up SSL with Certbot if you haven't already."

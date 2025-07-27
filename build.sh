#!/bin/bash

echo "🔨 Starting build process..."

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

# Install and build frontend
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

echo "🏗️ Building frontend..."
npm run build

# Move back to root
cd ..

echo "✅ Build completed successfully!"
echo "📁 Frontend build available at: frontend/build"
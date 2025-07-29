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

# Verify build output
echo "🔍 Verifying build output..."
if [ -d "build" ]; then
  echo "✅ Build directory created successfully"
  echo "📁 Contents of build directory:"
  ls -la build/
  echo "📁 Contents of build/static:"
  ls -la build/static/ || echo "⚠️ No static directory found"
else
  echo "❌ Build directory not found!"
fi

# Move back to root
cd ..

echo "✅ Build completed successfully!"
echo "📁 Frontend build available at: frontend/build"
echo "📍 Current directory: $(pwd)"
echo "📁 Frontend build contents:"
ls -la frontend/build/ || echo "⚠️ Frontend build directory not found"
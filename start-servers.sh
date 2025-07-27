#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting EGD/Colonoscopy AI Servers...${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${GREEN}Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo "⚠️  Please edit .env with your AWS and Neon credentials!"
fi

# Start backend server
echo -e "${GREEN}Starting Backend API on port 3000...${NC}"
npm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend server
echo -e "${GREEN}Starting Frontend on port 3001...${NC}"
cd frontend && npm start &
FRONTEND_PID=$!

echo -e "${BLUE}✅ Servers started!${NC}"
echo "Backend API: http://localhost:3000"
echo "Frontend: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all servers"

# Function to handle cleanup
cleanup() {
    echo -e "${BLUE}Stopping servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handler
trap cleanup INT TERM

# Wait for processes
wait
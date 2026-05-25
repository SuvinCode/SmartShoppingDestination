#!/bin/bash

# Docket Application Starter Script
# Launches the Python AI service, C# backend, and React frontend in parallel.

echo "========================================================="
echo "🚀  Docket Grocery savings Optimizer - Starting Services"
echo "========================================================="

# Function to clean up background processes on Ctrl+C
cleanup() {
    echo ""
    echo "🛑  Stopping all Docket services..."
    # Terminate background processes launched by this script shell
    kill $(jobs -p) 2>/dev/null
    echo "✅  All services shut down successfully."
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM to trigger cleanup function
trap cleanup SIGINT SIGTERM

# 1. Start Python AI Service in the background
echo "🐍 Starting Python AI Microservice (Port 8000)..."
echo "   Logs redirected to: ./python-service.log"
cd ai-service
./run.sh > ../python-service.log 2>&1 &
cd ..

# 2. Start C# Backend Web API in the background
echo "💼 Starting C# Backend Web API (Port 5100)..."
echo "   Logs redirected to: ./backend-service.log"
~/.dotnet/dotnet run --project backend/backend.csproj > backend-service.log 2>&1 &

# Wait a brief moment to allow the backend services to boot
sleep 2.5

# 3. Start React Frontend (in the foreground)
echo "🎨 Starting React Frontend (Port 5173)..."
echo "========================================================="
npm --prefix frontend run dev

#!/bin/bash
set -e

echo "=== LaunchPulse Dev Server Init ==="

# Install backend dependencies
cd /app/backend
npm install

# Detect frontend type and install + start
if [ -d "/app/expo" ]; then
    echo "=== Mobile App Mode (Expo) ==="

    # Install Expo dependencies
    cd /app/expo
    npm install --legacy-peer-deps

    # Start backend server (port 3000)
    cd /app/backend
    npm run dev &

    # Wait for backend to initialize
    sleep 2

    # Start Expo web dev server (port 5173)
    cd /app/expo
    npm run dev &

elif [ -d "/app/vitereact" ]; then
    echo "=== Web App Mode (Vite React) ==="

    # Install frontend dependencies
    cd /app/vitereact
    npm install --legacy-peer-deps

    # Start backend server (port 3000)
    cd /app/backend
    npm run dev &

    # Wait for backend to initialize
    sleep 2

    # Start Vite dev server (port 5173)
    cd /app/vitereact
    npm run dev -- --host 0.0.0.0 &

else
    echo "ERROR: No frontend directory found (/app/expo or /app/vitereact)"
    exit 1
fi

echo "=== Dev servers started ==="
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:5173"

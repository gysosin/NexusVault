#!/bin/bash

# Kill background processes on exit
trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT

echo "Starting NexusVault Development Environment..."

# Infrastructure (Postgres & Redis) is managed by ~/code/Infra
# Make sure it's running: cd ~/code/Infra && docker compose up -d

# Start Go Server
echo "Starting Go Server..."
cd server
go run ./cmd/server &
SERVER_PID=$!
cd ..

# Start Client
echo "Starting Client..."
cd client
npm run dev &
CLIENT_PID=$!
cd ..

# Wait for both processes
wait $SERVER_PID $CLIENT_PID

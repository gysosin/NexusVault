#!/bin/bash

# Kill background processes on exit
trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT

echo "Starting NexusVault Development Environment..."

# Start Infrastructure (Postgres & Redis)
echo "Starting Database and Redis..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for DB to be ready (optional check, but good practice)
# sleep 2

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

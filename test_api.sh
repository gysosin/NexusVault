#!/bin/bash

BASE_URL="http://localhost:3000/api"
USERNAME="xyfo"
PASSWORD="Winrarpas@18"
COOKIE_JAR="cookies.txt"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[TEST]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Login
log "Testing Login..."
LOGIN_RESPONSE=$(curl -s -c $COOKIE_JAR -H "Content-Type: application/json" -d "{\"username\":\"$USERNAME\", \"password\":\"$PASSWORD\"}" $BASE_URL/auth/login)

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    log "Login Successful. Token: ${TOKEN:0:10}..."
else
    error "Login Failed: $LOGIN_RESPONSE"
    # Try registering if login fails
    log "Attempting Register..."
    REGISTER_RESPONSE=$(curl -s -H "Content-Type: application/json" -d "{\"username\":\"$USERNAME\", \"password\":\"$PASSWORD\"}" $BASE_URL/auth/register)
    log "Register Response: $REGISTER_RESPONSE"
    
    # Retry Login
    LOGIN_RESPONSE=$(curl -s -c $COOKIE_JAR -H "Content-Type: application/json" -d "{\"username\":\"$USERNAME\", \"password\":\"$PASSWORD\"}" $BASE_URL/auth/login)
    if echo "$LOGIN_RESPONSE" | grep -q "token"; then
        TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        log "Login Successful after Register. Token: ${TOKEN:0:10}..."
    else
        error "Login Failed again. Exiting."
        exit 1
    fi
fi

AUTH_HEADER="Authorization: Bearer $TOKEN"

# 2. Get Me
log "Testing Get Me..."
curl -s -H "$AUTH_HEADER" $BASE_URL/auth/me | grep "username" && log "Get Me Passed" || error "Get Me Failed"

# 3. Get Connections
log "Testing Get Connections..."
curl -s -H "$AUTH_HEADER" $BASE_URL/connections/ | grep "\[" && log "Get Connections Passed" || error "Get Connections Failed"

# 4. Create Connection
log "Testing Create Connection..."
CONN_DATA='{"name":"TestConn","host":"127.0.0.1","port":22,"username":"test","type":"ssh"}'
CONN_RES=$(curl -s -H "$AUTH_HEADER" -H "Content-Type: application/json" -d "$CONN_DATA" $BASE_URL/connections/)
echo "$CONN_RES" | grep "id" && log "Create Connection Passed" || error "Create Connection Failed: $CONN_RES"
CONN_ID=$(echo "$CONN_RES" | grep -o '"id":[^,]*' | cut -d':' -f2 | tr -d '}')

# 5. Update Connection
if [ ! -z "$CONN_ID" ]; then
    log "Testing Update Connection ($CONN_ID)..."
    UPDATE_DATA='{"name":"TestConnUpdated","host":"127.0.0.1","port":22,"username":"test","type":"ssh"}'
    curl -X PUT -s -H "$AUTH_HEADER" -H "Content-Type: application/json" -d "$UPDATE_DATA" $BASE_URL/connections/$CONN_ID | grep "TestConnUpdated" && log "Update Connection Passed" || error "Update Connection Failed"
fi

# 6. Get Active Sessions
log "Testing Get Active Sessions..."
curl -s -H "$AUTH_HEADER" $BASE_URL/sessions/active | grep "\[" && log "Get Active Sessions Passed" || error "Get Active Sessions Failed"

# 7. Get Session History
log "Testing Get Session History..."
curl -s -H "$AUTH_HEADER" $BASE_URL/sessions/history | grep "\[" && log "Get Session History Passed" || error "Get Session History Failed"

# 8. Admin Stats (Check if admin)
log "Testing Admin Stats..."
STATS_RES=$(curl -s -H "$AUTH_HEADER" $BASE_URL/admin/stats)
if echo "$STATS_RES" | grep -q "error"; then
    log "Admin Stats Failed (Expected if not admin): $STATS_RES"
else
    log "Admin Stats Passed"
fi

# 9. Delete Connection (Cleanup)
if [ ! -z "$CONN_ID" ]; then
    log "Testing Delete Connection ($CONN_ID)..."
    curl -X DELETE -s -H "$AUTH_HEADER" $BASE_URL/connections/$CONN_ID && log "Delete Connection Passed" || error "Delete Connection Failed"
fi

log "Testing Complete."

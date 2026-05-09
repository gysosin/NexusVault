package api

import (
	"context"
	"errors"
	"net"
	"net/http"
	"strconv"
	"time"

	"go-server/internal/connection"
	"go-server/internal/db"
	"go-server/internal/models"
	"go-server/internal/utils"

	"github.com/gin-gonic/gin"
)

const connectionDatabaseTimeout = 3 * time.Second
const connectionProbeTimeout = 2 * time.Second

type CreateConnectionRequest struct {
	Name     string `json:"name" binding:"required"`
	Host     string `json:"host" binding:"required"`
	Port     int    `json:"port"`
	Username string `json:"username" binding:"required"`
	Password string `json:"password"`
	Type     string `json:"type"`
}

type UpdateConnectionRequest struct {
	Name     string `json:"name"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
	Type     string `json:"type"`
}

type UpdateConnectionFavoriteRequest struct {
	IsFavorite *bool `json:"isFavorite" binding:"required"`
}

type ConnectionHealthResponse struct {
	ConnectionID int       `json:"connectionId"`
	Status       string    `json:"status"`
	LatencyMs    int64     `json:"latencyMs"`
	CheckedAt    time.Time `json:"checkedAt"`
	Error        string    `json:"error,omitempty"`
}

func GetConnections(c *gin.Context) {
	userID, _ := c.Get("userId")
	ctx, cancel := context.WithTimeout(c.Request.Context(), connectionDatabaseTimeout)
	defer cancel()

	var connections []models.Connection
	query := `SELECT id, user_id, name, host, port, username, type, is_favorite, created_at, (password IS NOT NULL AND password != '') as has_password FROM connections WHERE user_id = $1 ORDER BY is_favorite DESC, created_at DESC`
	err := db.DB.SelectContext(ctx, &connections, query, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch connections"})
		return
	}

	// Ensure empty slice instead of null in JSON
	if connections == nil {
		connections = []models.Connection{}
	}

	c.JSON(http.StatusOK, connections)
}

func CreateConnection(c *gin.Context) {
	userID, _ := c.Get("userId")
	ctx, cancel := context.WithTimeout(c.Request.Context(), connectionDatabaseTimeout)
	defer cancel()

	var req CreateConnectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fields, err := connection.NormalizeSaved(req.Name, req.Host, req.Port, req.Username, req.Type)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var encryptedPassword string
	if req.Password != "" {
		var err error
		encryptedPassword, err = utils.EncryptCredential(req.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt password"})
			return
		}
	}

	var conn models.Connection
	query := `INSERT INTO connections (user_id, name, host, port, username, password, type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, user_id, name, host, port, username, type, is_favorite, created_at, (password IS NOT NULL AND password != '') as has_password`
	err = db.DB.QueryRowxContext(ctx, query, userID, fields.Name, fields.Host, fields.Port, fields.Username, encryptedPassword, fields.Type).StructScan(&conn)

	if err != nil {
		utils.Log("Error creating connection", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create connection"})
		return
	}

	c.JSON(http.StatusCreated, conn)
}

func UpdateConnection(c *gin.Context) {
	userID, _ := c.Get("userId")
	ctx, cancel := context.WithTimeout(c.Request.Context(), connectionDatabaseTimeout)
	defer cancel()

	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	var req UpdateConnectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check ownership
	var existing models.Connection
	err = db.DB.GetContext(ctx, &existing, "SELECT * FROM connections WHERE id = $1 AND user_id = $2", id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Connection not found"})
		return
	}

	// Prepare update
	// We only update fields that are provided (if using PATCH logic), but usually PUT updates all.
	// Here we assume partial update logic or full update.
	// Let's assume fields are provided. If empty, we might keep old value?
	// But `ShouldBindJSON` with struct will have zero values if missing.
	// For simplicity, let's update all fields if provided.
	// But if password is empty, we keep the old one.

	name := req.Name
	if name == "" {
		name = existing.Name
	}
	host := req.Host
	if host == "" {
		host = existing.Host
	}
	port := req.Port
	if port == 0 {
		port = existing.Port
	}
	username := req.Username
	if username == "" {
		username = existing.Username
	}
	connType := req.Type
	if connType == "" {
		connType = existing.Type
	}

	fields, err := connection.NormalizeSaved(name, host, port, username, connType)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	password := existing.Password
	if req.Password != "" {
		encrypted, err := utils.EncryptCredential(req.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt password"})
			return
		}
		password = encrypted
	}

	var updated models.Connection
	query := `UPDATE connections SET name = $1, host = $2, port = $3, username = $4, password = $5, type = $6 WHERE id = $7 AND user_id = $8 RETURNING id, user_id, name, host, port, username, type, is_favorite, created_at, (password IS NOT NULL AND password != '') as has_password`
	err = db.DB.QueryRowxContext(ctx, query, fields.Name, fields.Host, fields.Port, fields.Username, password, fields.Type, id, userID).StructScan(&updated)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update connection"})
		return
	}

	c.JSON(http.StatusOK, updated)
}

func DeleteConnection(c *gin.Context) {
	userID, _ := c.Get("userId")
	ctx, cancel := context.WithTimeout(c.Request.Context(), connectionDatabaseTimeout)
	defer cancel()

	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	result, err := db.DB.ExecContext(ctx, "DELETE FROM connections WHERE id = $1 AND user_id = $2", id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete connection"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Connection not found"})
		return
	}

	c.Status(http.StatusNoContent)
}

func UpdateConnectionFavorite(c *gin.Context) {
	userID, _ := c.Get("userId")
	ctx, cancel := context.WithTimeout(c.Request.Context(), connectionDatabaseTimeout)
	defer cancel()

	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	var req UpdateConnectionFavoriteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var updated models.Connection
	query := `UPDATE connections SET is_favorite = $1 WHERE id = $2 AND user_id = $3 RETURNING id, user_id, name, host, port, username, type, is_favorite, created_at, (password IS NOT NULL AND password != '') as has_password`
	err = db.DB.QueryRowxContext(ctx, query, *req.IsFavorite, id, userID).StructScan(&updated)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Connection not found"})
		return
	}

	c.JSON(http.StatusOK, updated)
}

func CheckConnectionHealth(c *gin.Context) {
	userID, _ := c.Get("userId")
	dbCtx, cancel := context.WithTimeout(c.Request.Context(), connectionDatabaseTimeout)
	defer cancel()

	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	var conn models.Connection
	err = db.DB.GetContext(dbCtx, &conn, "SELECT id, user_id, name, host, port, username, type, is_favorite, created_at, (password IS NOT NULL AND password != '') as has_password FROM connections WHERE id = $1 AND user_id = $2", id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Connection not found"})
		return
	}

	probeCtx, probeCancel := context.WithTimeout(c.Request.Context(), connectionProbeTimeout)
	defer probeCancel()

	response := probeConnection(probeCtx, conn)
	c.JSON(http.StatusOK, response)
}

func probeConnection(ctx context.Context, conn models.Connection) ConnectionHealthResponse {
	startedAt := time.Now()
	response := ConnectionHealthResponse{
		ConnectionID: conn.ID,
		Status:       "unreachable",
		CheckedAt:    startedAt.UTC(),
	}

	if conn.Port <= 0 || conn.Port > 65535 {
		response.Error = "Connection port is invalid"
		return response
	}

	address := net.JoinHostPort(conn.Host, strconv.Itoa(conn.Port))
	var dialer net.Dialer
	tcpConn, err := dialer.DialContext(ctx, "tcp", address)
	response.LatencyMs = time.Since(startedAt).Milliseconds()
	if err != nil {
		response.Error = friendlyProbeError(err)
		return response
	}
	defer tcpConn.Close()

	response.Status = "reachable"
	return response
}

func friendlyProbeError(err error) string {
	if errors.Is(err, context.DeadlineExceeded) {
		return "Connection check timed out"
	}

	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		return "Connection check timed out"
	}

	return "Host is not reachable on the configured port"
}

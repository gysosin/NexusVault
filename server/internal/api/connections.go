package api

import (
	"net/http"
	"strconv"

	"go-server/internal/db"
	"go-server/internal/models"
	"go-server/internal/utils"

	"github.com/gin-gonic/gin"
)

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

func GetConnections(c *gin.Context) {
	userID, _ := c.Get("userId")

	var connections []models.Connection
	query := `SELECT id, user_id, name, host, port, username, type, created_at, (password IS NOT NULL AND password != '') as has_password FROM connections WHERE user_id = $1 ORDER BY created_at DESC`
	err := db.DB.Select(&connections, query, userID)
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
	var req CreateConnectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Default port
	if req.Port == 0 {
		if req.Type == "rdp" {
			req.Port = 3389
		} else {
			req.Port = 22
		}
	}

	if req.Type == "" {
		req.Type = "ssh"
	}

	var encryptedPassword string
	if req.Password != "" {
		var err error
		encryptedPassword, err = utils.Encrypt(req.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt password"})
			return
		}
	}

	var conn models.Connection
	query := `INSERT INTO connections (user_id, name, host, port, username, password, type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, user_id, name, host, port, username, type, created_at, (password IS NOT NULL AND password != '') as has_password`
	err := db.DB.QueryRowx(query, userID, req.Name, req.Host, req.Port, req.Username, encryptedPassword, req.Type).StructScan(&conn)

	if err != nil {
		utils.Log("Error creating connection", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create connection"})
		return
	}

	c.JSON(http.StatusCreated, conn)
}

func UpdateConnection(c *gin.Context) {
	userID, _ := c.Get("userId")
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
	err = db.DB.Get(&existing, "SELECT * FROM connections WHERE id = $1 AND user_id = $2", id, userID)
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

	password := existing.Password
	if req.Password != "" {
		encrypted, err := utils.Encrypt(req.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt password"})
			return
		}
		password = encrypted
	}

	var updated models.Connection
	query := `UPDATE connections SET name = $1, host = $2, port = $3, username = $4, password = $5, type = $6 WHERE id = $7 AND user_id = $8 RETURNING id, user_id, name, host, port, username, type, created_at, (password IS NOT NULL AND password != '') as has_password`
	err = db.DB.QueryRowx(query, name, host, port, username, password, connType, id, userID).StructScan(&updated)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update connection"})
		return
	}

	c.JSON(http.StatusOK, updated)
}

func DeleteConnection(c *gin.Context) {
	userID, _ := c.Get("userId")
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	result, err := db.DB.Exec("DELETE FROM connections WHERE id = $1 AND user_id = $2", id, userID)
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

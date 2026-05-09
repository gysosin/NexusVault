package api

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go-server/internal/db"
	"go-server/internal/models"
	"go-server/internal/service"
)

const sessionDatabaseTimeout = 3 * time.Second
const defaultSessionHistoryLimit = 50
const maxSessionHistoryLimit = 50

func GetActiveSessions(c *gin.Context) {
	userID, _ := c.Get("userId")
	userIDInt := userID.(int)

	sessions := service.GetSessionsForUser(userIDInt)

	type ActiveSessionResponse struct {
		ID           string `json:"id"`
		Host         string `json:"host"`
		Username     string `json:"username"`
		Port         int    `json:"port"`
		ConnectionID *int   `json:"connectionId"`
		Protocol     string `json:"protocol"`
		Attached     bool   `json:"attached"`
		CreatedAt    string `json:"createdAt"`    // ISO string
		LastActivity string `json:"lastActivity"` // ISO string
	}

	var response []ActiveSessionResponse
	for _, s := range sessions {
		attached := false
		s.SocketsMutex.Lock()
		if len(s.Sockets) > 0 {
			attached = true
		}
		s.SocketsMutex.Unlock()

		response = append(response, ActiveSessionResponse{
			ID:           s.ID,
			Host:         s.Host,
			Username:     s.Username,
			Port:         s.Port,
			ConnectionID: s.ConnectionID,
			Protocol:     string(s.Type),
			Attached:     attached,
			CreatedAt:    s.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
			LastActivity: s.LastActivity.Format("2006-01-02T15:04:05.000Z"),
		})
	}

	// Sort by LastActivity desc
	sort.Slice(response, func(i, j int) bool {
		return response[i].LastActivity > response[j].LastActivity
	})

	c.JSON(http.StatusOK, response)
}

func GetSessionHistory(c *gin.Context) {
	userID, _ := c.Get("userId")
	connectionID := c.Query("connectionId")
	limit, err := parseSessionHistoryLimit(c.Query("limit"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session history limit"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), sessionDatabaseTimeout)
	defer cancel()

	var history []models.SessionHistory
	query := `SELECT id, session_id, host, username, start_time, end_time, status FROM session_histories WHERE user_id = $1`
	args := []interface{}{userID}

	if connectionID != "" {
		parsedConnectionID, err := strconv.Atoi(connectionID)
		if err != nil || parsedConnectionID <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
			return
		}

		query += ` AND connection_id = $2`
		args = append(args, parsedConnectionID)
	}

	args = append(args, limit)
	query += fmt.Sprintf(` ORDER BY start_time DESC LIMIT $%d`, len(args))

	err = db.DB.SelectContext(ctx, &history, query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch session history"})
		return
	}

	if history == nil {
		history = []models.SessionHistory{}
	}

	c.JSON(http.StatusOK, history)
}

func parseSessionHistoryLimit(raw string) (int, error) {
	if raw == "" {
		return defaultSessionHistoryLimit, nil
	}

	limit, err := strconv.Atoi(raw)
	if err != nil || limit <= 0 {
		return 0, fmt.Errorf("limit must be a positive integer")
	}
	if limit > maxSessionHistoryLimit {
		return maxSessionHistoryLimit, nil
	}
	return limit, nil
}

func GetSessionDetails(c *gin.Context) {
	userID, _ := c.Get("userId")
	sessionID := c.Param("sessionId")
	ctx, cancel := context.WithTimeout(c.Request.Context(), sessionDatabaseTimeout)
	defer cancel()

	var history models.SessionHistory
	query := `SELECT * FROM session_histories WHERE session_id = $1 AND user_id = $2`
	err := db.DB.GetContext(ctx, &history, query, sessionID, userID)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session history not found"})
		return
	}

	c.JSON(http.StatusOK, history)
}

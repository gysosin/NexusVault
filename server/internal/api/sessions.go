package api

import (
	"net/http"
	"sort"

	"github.com/gin-gonic/gin"
	"go-server/internal/db"
	"go-server/internal/models"
	"go-server/internal/service"
)

func GetActiveSessions(c *gin.Context) {
	userID, _ := c.Get("userId")
	userIDInt := userID.(int)

	sessions := service.GetSessionsForUser(userIDInt)
	
	type ActiveSessionResponse struct {
		ID           string      `json:"id"`
		Host         string      `json:"host"`
		Username     string      `json:"username"`
		Port         int         `json:"port"`
		ConnectionID *int        `json:"connectionId"`
		Protocol     string      `json:"protocol"`
		Attached     bool        `json:"attached"`
		CreatedAt    string      `json:"createdAt"` // ISO string
		LastActivity string      `json:"lastActivity"` // ISO string
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

	var history []models.SessionHistory
	query := `SELECT id, session_id, host, username, start_time, end_time, status FROM session_histories WHERE user_id = $1`
	args := []interface{}{userID}

	if connectionID != "" {
		query += ` AND connection_id = $2`
		args = append(args, connectionID)
	}

	query += ` ORDER BY start_time DESC LIMIT 50`

	err := db.DB.Select(&history, query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch session history"})
		return
	}

	if history == nil {
		history = []models.SessionHistory{}
	}

	c.JSON(http.StatusOK, history)
}

func GetSessionDetails(c *gin.Context) {
	userID, _ := c.Get("userId")
	sessionID := c.Param("sessionId")

	var history models.SessionHistory
	query := `SELECT * FROM session_histories WHERE session_id = $1 AND user_id = $2`
	err := db.DB.Get(&history, query, sessionID, userID)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session history not found"})
		return
	}

	c.JSON(http.StatusOK, history)
}
